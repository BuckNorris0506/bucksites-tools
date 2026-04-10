/**
 * Web-search rows were used as inventory placeholders; they are not retailer checkout links.
 * Filter them from buy UI and block `/go/*` redirects so launch stays truth-first.
 *
 * We also block bare Google/Bing `/search` URLs even if `retailer_key` were mis-set on import.
 */
export const SEARCH_PLACEHOLDER_RETAILER_KEYS = new Set([
  "google-search",
  "bing-search",
]);

export function isSearchPlaceholderRetailerKey(
  retailerKey: string | null | undefined,
): boolean {
  const k = retailerKey?.trim().toLowerCase();
  if (!k) return false;
  return SEARCH_PLACEHOLDER_RETAILER_KEYS.has(k);
}

/** True when the URL is a generic web search, not a retailer checkout/deep link. */
export function isSearchEngineDiscoveryUrl(url: string): boolean {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./i, "").toLowerCase();
    const path = u.pathname.toLowerCase();
    if (!path.startsWith("/search")) return false;
    if (host === "google.com" || host.endsWith(".google.com")) return true;
    if (host === "bing.com") return true;
    return false;
  } catch {
    return false;
  }
}

/** A row must never be a launch buy CTA or `/go` target when this is true. */
export function isSearchPlaceholderBuyLink(
  retailerKey: string | null | undefined,
  affiliateUrl: string,
): boolean {
  return (
    isSearchPlaceholderRetailerKey(retailerKey) ||
    isSearchEngineDiscoveryUrl(affiliateUrl)
  );
}

/** Strips search-placeholder rows before rendering buy CTAs. */
export function filterRealBuyRetailerLinks<
  T extends { retailer_key?: string | null; affiliate_url: string },
>(links: T[]): T[] {
  return links.filter((l) => !isSearchPlaceholderBuyLink(l.retailer_key, l.affiliate_url));
}
