import { NextResponse } from "next/server";

import { buyLinkGateFailureKind } from "@/lib/retailers/launch-buy-links";

/** Amazon Associates store ID applied at `/go` redirect time only (not stored on rows). */
export const AMAZON_AFFILIATE_TAG = "buckparts20-20";

/**
 * True for `amazon.com` and subdomains (`www.amazon.com`, `smile.amazon.com`, …).
 * Does not match other TLDs (`amazon.co.uk`, `amazon.com.mx`).
 */
export function isAmazonComHost(hostname: string): boolean {
  const h = hostname.trim().toLowerCase();
  return h === "amazon.com" || h.endsWith(".amazon.com");
}

/**
 * If the URL targets Amazon US with a `/dp/{ASIN}` path (ASIN = 10 alphanumerics), rewrite to
 * `https://www.amazon.com/dp/{ASIN}` (uppercase ASIN), preserving query params, then ensure
 * `tag=AMAZON_AFFILIATE_TAG`. Other Amazon US URLs get the tag only (path/host unchanged).
 * Idempotent: overwrites an existing `tag` param so it is never duplicated.
 */
export function applyAmazonAffiliateRedirectUrl(rawUrl: string): string {
  const trimmed = rawUrl.trim();
  let u: URL;
  try {
    u = new URL(trimmed);
  } catch {
    return trimmed;
  }

  if (!isAmazonComHost(u.hostname)) {
    return trimmed;
  }

  const dpAsin = u.pathname.match(/\/dp\/([A-Z0-9]{10})/i);
  let out: URL;
  if (dpAsin) {
    const asin = dpAsin[1].toUpperCase();
    out = new URL(`https://www.amazon.com/dp/${asin}`);
    u.searchParams.forEach((value, key) => {
      out.searchParams.set(key, value);
    });
    out.hash = u.hash;
  } else {
    out = new URL(u.href);
  }

  out.searchParams.set("tag", AMAZON_AFFILIATE_TAG);
  return out.toString();
}

/**
 * Protocol gate for outbound `/go/*` redirects (blocks `javascript:`, etc.).
 */
export function isHttpOrHttpsUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}

/**
 * Final redirect gate for `/go/*`: must be http(s), must pass the same
 * buyer-path placeholder rules as CTAs, and must have browser-truth
 * evidence that marks it safe for live use.
 */
export function isAffiliateUrlSafeForGoRedirect(
  retailerKey: string | null | undefined,
  affiliateUrl: string,
  classification?: string,
): boolean {
  const u = affiliateUrl?.trim() ?? "";
  if (!u) return false;
  if (!isHttpOrHttpsUrl(u)) return false;
  return (
    buyLinkGateFailureKind({
      retailer_key: retailerKey,
      affiliate_url: u,
      browser_truth_classification: classification,
    }) === null
  );
}

/** Successful `/go` outbound: browser redirect + exact URL for logging/analytics. */
export type GoAffiliateRedirectResult = {
  response: NextResponse;
  /** Same string as `Location` on `response` (after safety gate + Amazon affiliate tagging when applicable). */
  outboundUrl: string;
};

/**
 * Builds the outbound `/go` retailer redirect only when `affiliateUrl` passes the
 * shared gate. Amazon US links get `tag=buckparts20-20` (and `/dp/{ASIN}` canonicalization)
 * here — not in stored rows. `outboundUrl` matches `Location` exactly.
 */
export function nextResponseRedirectAffiliateIfSafe(
  retailerKey: string | null | undefined,
  affiliateUrl: string,
  classification?: string,
  status = 302,
): GoAffiliateRedirectResult | null {
  const gated = affiliateUrl?.trim() ?? "";
  if (!isAffiliateUrlSafeForGoRedirect(retailerKey, gated, classification)) {
    return null;
  }
  const outboundUrl = applyAmazonAffiliateRedirectUrl(gated);
  return {
    response: NextResponse.redirect(outboundUrl, status),
    outboundUrl,
  };
}
