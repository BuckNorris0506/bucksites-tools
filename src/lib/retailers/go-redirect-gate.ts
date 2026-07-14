import { NextResponse } from "next/server";

import {
  buyLinkGateFailureKind,
  staleBrowserTruthShadowClassification,
  type BuyLinkGateLinkV1,
  type StaleBrowserTruthShadowClassification,
} from "@/lib/retailers/launch-buy-links";
import {
  isLiveBuyerPathLinkPermittedV1,
  type LiveGoPathContextV1,
} from "@/lib/retailers/live-buyer-path-go-decision-v1";

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

export type GoRedirectGateLinkV1 = BuyLinkGateLinkV1;

/**
 * Final redirect gate for `/go/*`: must be http(s), must pass the same
 * buyer-path rules as CTAs via central decision precedence, including fresh
 * browser-truth recency.
 */
export function isAffiliateUrlSafeForGoRedirect(
  retailerKey: string | null | undefined,
  affiliateUrl: string,
  classification?: string | null,
  browserTruthBuyableSubtype?: string | null,
  browserTruthCheckedAt?: string | null,
  browserTruthNotes?: string | null,
  context?: LiveGoPathContextV1,
  options?: { now?: Date },
): boolean {
  const u = affiliateUrl?.trim() ?? "";
  if (!u) return false;
  if (!isHttpOrHttpsUrl(u)) return false;
  return isLiveBuyerPathLinkPermittedV1({
    link: {
      retailer_key: retailerKey,
      affiliate_url: u,
      browser_truth_classification: classification,
      browser_truth_buyable_subtype: browserTruthBuyableSubtype,
      browser_truth_checked_at: browserTruthCheckedAt,
      browser_truth_notes: browserTruthNotes,
    },
    context,
    now: options?.now,
  });
}

/**
 * Diagnostics: reports stale browser-truth recency for rows that still pass live gates.
 * Enforcement is in `buyLinkGateFailureKind` — shadow does not gate redirects.
 */
export function staleBrowserTruthShadowForGoRedirect(
  retailerKey: string | null | undefined,
  affiliateUrl: string,
  classification?: string,
  browserTruthBuyableSubtype?: string | null,
  browserTruthCheckedAt?: string | null,
  options?: Parameters<typeof staleBrowserTruthShadowClassification>[1],
): StaleBrowserTruthShadowClassification | null {
  return staleBrowserTruthShadowClassification(
    {
      retailer_key: retailerKey,
      affiliate_url: affiliateUrl?.trim() ?? "",
      browser_truth_classification: classification,
      browser_truth_buyable_subtype: browserTruthBuyableSubtype,
      browser_truth_checked_at: browserTruthCheckedAt,
    },
    options,
  );
}

/** Successful `/go` outbound: browser redirect + exact URL for logging/analytics. */
export type GoAffiliateRedirectResult = {
  response: NextResponse;
  /** Same string as `Location` on `response` (after safety gate + Amazon affiliate tagging when applicable). */
  outboundUrl: string;
};

export type NextResponseRedirectAffiliateIfSafeOptionsV1 = {
  now?: Date;
  context?: LiveGoPathContextV1;
  status?: number;
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
  browserTruthBuyableSubtype?: string | null,
  browserTruthCheckedAt?: string | null,
  browserTruthNotes?: string | null,
  options?: NextResponseRedirectAffiliateIfSafeOptionsV1,
): GoAffiliateRedirectResult | null {
  const gated = affiliateUrl?.trim() ?? "";
  const status = options?.status ?? 302;
  if (
    !isAffiliateUrlSafeForGoRedirect(
      retailerKey,
      gated,
      classification,
      browserTruthBuyableSubtype,
      browserTruthCheckedAt,
      browserTruthNotes,
      options?.context,
      { now: options?.now },
    )
  ) {
    return null;
  }
  const outboundUrl = applyAmazonAffiliateRedirectUrl(gated);
  return {
    response: NextResponse.redirect(outboundUrl, status),
    outboundUrl,
  };
}

/** Expose gate failure kind for tests asserting CTA/`/go` alignment. */
export function buyLinkGateFailureKindForGoLink(
  link: GoRedirectGateLinkV1,
  options?: { now?: Date; maxAgeMs?: number },
): ReturnType<typeof buyLinkGateFailureKind> {
  return buyLinkGateFailureKind(link, options);
}
