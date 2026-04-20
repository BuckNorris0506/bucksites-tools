import { NextResponse } from "next/server";

import { buyLinkGateFailureKind } from "@/lib/retailers/launch-buy-links";

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
  /** Same string as `Location` on `response` (trimmed canonical affiliate URL). */
  outboundUrl: string;
};

/**
 * Builds the outbound `/go` retailer redirect only when `affiliateUrl` passes the
 * shared gate. `outboundUrl` matches `Location` exactly.
 */
export function nextResponseRedirectAffiliateIfSafe(
  retailerKey: string | null | undefined,
  affiliateUrl: string,
  classification?: string,
  status = 302,
): GoAffiliateRedirectResult | null {
  const outboundUrl = affiliateUrl?.trim() ?? "";
  if (!isAffiliateUrlSafeForGoRedirect(retailerKey, outboundUrl, classification)) {
    return null;
  }
  return {
    response: NextResponse.redirect(outboundUrl, status),
    outboundUrl,
  };
}
