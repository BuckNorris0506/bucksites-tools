/**
 * Web-search rows were used as inventory placeholders; they are not retailer checkout links.
 * Filter them from buy UI and block `/go/*` redirects so launch stays truth-first.
 *
 * We also block generic **search-engine discovery** URLs (SERP / link-wrapper / DuckDuckGo HTML
 * search) on major search hosts — even if `retailer_key` were mis-set — using host + path shapes
 * aligned with `SEARCH_ENGINE_HOST_SUFFIXES` in `scripts/buckparts-approved-links-v1.ts`.
 *
 * OEM catalog slots (`oem-catalog`, `oem-parts-catalog`) may point at manufacturer **site search**
 * endpoints (path/query shapes from committed CSVs and audit reports — not domain-specific lists).
 * Those are treated as placeholders when URL structure matches catalog/search discovery patterns.
 */

/** Mirrors `SEARCH_ENGINE_HOST_SUFFIXES` in `scripts/buckparts-approved-links-v1.ts` (buy-path). */
const SEARCH_ENGINE_HOST_SUFFIXES = [
  "google.com",
  "google.co.uk",
  "bing.com",
  "duckduckgo.com",
  "yahoo.com",
  "yandex.com",
  "baidu.com",
] as const;

export const SEARCH_PLACEHOLDER_RETAILER_KEYS = new Set([
  "google-search",
  "bing-search",
]);

/** OEM / manufacturer catalog rows that commonly carry site-search fallbacks (repo CSV keys). */
const OEM_CATALOG_SLOT_KEYS = new Set(["oem-catalog", "oem-parts-catalog"]);

/**
 * Canonical key for repo-known broken/indirect URLs so eligibility cannot drift on
 * harmless serialization differences (http vs https, path case, trailing slash, hash,
 * tracking query params).
 */
export function normalizeUrlForKnownTruthLookup(url: string): string {
  try {
    const u = new URL(url.trim());
    u.hash = "";
    if (u.protocol === "http:") {
      u.protocol = "https:";
    }
    u.hostname = u.hostname.toLowerCase();
    let path = u.pathname.replace(/\/+$/, "");
    if (path === "") path = "/";
    path = path.toLowerCase();
    u.pathname = path;
    u.search = "";
    return u.href;
  } catch {
    return url.trim();
  }
}

/**
 * Repo-proven indirect/info destinations that must not drive primary buy CTAs or `/go`.
 * Keep this list narrow until broader stricter-standard verification is complete.
 */
const KNOWN_INDIRECT_DISCOVERY_URLS = new Set(
  [
    "https://www.solventum.com/en-us/home/v/v000075117/",
    "https://www.kinetico.com/en-us/for-home/water-filtration/",
  ].map(normalizeUrlForKnownTruthLookup),
);

/** Repo-proven broken destinations that must not drive primary buy CTAs or `/go`. */
const KNOWN_BROKEN_URLS = new Set(
  ["https://www.geapplianceparts.com/store/parts/spec/MWF"].map(normalizeUrlForKnownTruthLookup),
);

function stripLeadingWww(hostname: string): string {
  let h = hostname.toLowerCase();
  while (h.startsWith("www.")) h = h.slice(4);
  return h;
}

function hostLooksLikeSearchEngine(hostname: string): boolean {
  const h = stripLeadingWww(hostname);
  if (h === "google.com" || h.startsWith("google.")) return true;
  for (const suf of SEARCH_ENGINE_HOST_SUFFIXES) {
    if (h === suf || h.endsWith(`.${suf}`)) return true;
  }
  return false;
}

export function isSearchPlaceholderRetailerKey(
  retailerKey: string | null | undefined,
): boolean {
  const k = retailerKey?.trim().toLowerCase();
  if (!k) return false;
  return SEARCH_PLACEHOLDER_RETAILER_KEYS.has(k);
}

export function isOemCatalogSlotKey(retailerKey: string | null | undefined): boolean {
  const k = retailerKey?.trim().toLowerCase();
  return !!k && OEM_CATALOG_SLOT_KEYS.has(k);
}

export function isExplicitBuyableClassification(
  classification: string | null | undefined,
): boolean {
  return classification?.trim() === "direct_buyable";
}

function getSearchParamCaseInsensitive(u: URL, name: string): string | null {
  const n = name.toLowerCase();
  for (const [k, v] of Array.from(u.searchParams.entries())) {
    if (k.toLowerCase() === n) return v;
  }
  return null;
}

function hasSearchIntentQuery(u: URL): boolean {
  const keys = [
    "q",
    "query",
    "searchterm",
    "searchkeyword",
    "keywords",
    /** 3M and some OEMs use `Ntt=` on manufacturer `/search/` paths (e.g. AP810 site search). */
    "ntt",
  ];
  return keys.some((k) => {
    const v = getSearchParamCaseInsensitive(u, k);
    return v != null && String(v).trim().length > 0;
  });
}

/** `/search` and `/search/...` only — avoids `/search-console`, `/searchads`, etc. */
function isSerpStylePath(pathLower: string): boolean {
  return pathLower === "/search" || pathLower.startsWith("/search/");
}

/**
 * Manufacturer / parts-vendor **catalog search** URLs (path + query shapes seen in
 * `data/air-purifier/retailer_links.csv` and `reports/buckparts-retailer-link-audit-*.csv`).
 * Host-agnostic; does not classify normal PDP/category paths.
 */
export function isManufacturerSiteSearchUrl(url: string): boolean {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return false;
  }
  const path = u.pathname.toLowerCase();

  if (path.includes("/catalogsearch/")) return true;

  if (path.includes("search.jsp")) {
    return hasSearchIntentQuery(u);
  }

  if (path.includes("catalog.jsp")) {
    const sk = getSearchParamCaseInsensitive(u, "searchkeyword");
    return sk != null && String(sk).trim().length > 0;
  }

  /**
   * Austin Air uses site-wide `?s=` WordPress search URLs for replacement filters.
   * These are discovery/search pages, not direct buy PDPs.
   */
  if (stripLeadingWww(u.hostname).endsWith("austinair.com")) {
    const search = getSearchParamCaseInsensitive(u, "s");
    if ((path === "/" || path === "") && search != null && String(search).trim().length > 0) {
      return true;
    }
  }

  const onSearchPath =
    path === "/search" ||
    path.endsWith("/search") ||
    path.includes("/search/");
  if (onSearchPath && hasSearchIntentQuery(u)) return true;

  return false;
}

/** True when the URL is a generic web-search / SERP entry, not a retailer checkout/deep link. */
export function isSearchEngineDiscoveryUrl(url: string): boolean {
  try {
    const u = new URL(url);
    if (!hostLooksLikeSearchEngine(u.hostname)) return false;
    const path = u.pathname.toLowerCase();

    if (isSerpStylePath(path)) return true;

    const h = stripLeadingWww(u.hostname);

    if ((h === "google.com" || h.startsWith("google.")) && path === "/url") {
      const q = getSearchParamCaseInsensitive(u, "q");
      const urlParam = getSearchParamCaseInsensitive(u, "url");
      return (
        (q != null && q.trim() !== "") ||
        (urlParam != null && urlParam.trim() !== "")
      );
    }

    if (h === "duckduckgo.com" || h.endsWith(".duckduckgo.com")) {
      if (path === "/html" || path.startsWith("/html/")) {
        const q = getSearchParamCaseInsensitive(u, "q");
        return q != null && String(q).trim() !== "";
      }
      if (path === "/" || path === "") {
        const q = getSearchParamCaseInsensitive(u, "q");
        return q != null && String(q).trim() !== "";
      }
    }

    return false;
  } catch {
    return false;
  }
}

export function isKnownIndirectDiscoveryUrl(url: string): boolean {
  return KNOWN_INDIRECT_DISCOVERY_URLS.has(normalizeUrlForKnownTruthLookup(url));
}

export function isKnownBrokenUrl(url: string): boolean {
  return KNOWN_BROKEN_URLS.has(normalizeUrlForKnownTruthLookup(url));
}

/** A row must never be a launch buy CTA or `/go` target when this is true. */
export function isSearchPlaceholderBuyLink(
  retailerKey: string | null | undefined,
  affiliateUrl: string,
): boolean {
  return (
    isSearchPlaceholderRetailerKey(retailerKey) ||
    isSearchEngineDiscoveryUrl(affiliateUrl) ||
    (isOemCatalogSlotKey(retailerKey) && isManufacturerSiteSearchUrl(affiliateUrl))
  );
}

export type BuyLinkGateFailureKind =
  | "search_placeholder"
  | "indirect_discovery"
  | "broken_destination"
  | "missing_browser_truth"
  | "unsafe_browser_truth";

/** Why a row is excluded from live buy CTAs / `/go` (single source of truth with `filterRealBuyRetailerLinks`). */
export function buyLinkGateFailureKind<
  T extends {
    retailer_key?: string | null;
    affiliate_url: string;
    browser_truth_classification?: string | null;
  },
>(link: T): BuyLinkGateFailureKind | null {
  if (isSearchPlaceholderBuyLink(link.retailer_key, link.affiliate_url)) {
    return "search_placeholder";
  }
  if (isKnownIndirectDiscoveryUrl(link.affiliate_url)) {
    return "indirect_discovery";
  }
  if (isKnownBrokenUrl(link.affiliate_url)) {
    return "broken_destination";
  }
  const classification = link.browser_truth_classification?.trim();
  if (!classification) return "missing_browser_truth";
  if (!isExplicitBuyableClassification(classification)) {
    return "unsafe_browser_truth";
  }
  return null;
}

export type BuyPathGateSuppressionSummary = {
  hadSearchPlaceholderRows: boolean;
  hadIndirectDiscoveryRows: boolean;
  hadBrokenDestinationRows: boolean;
  hadMissingBrowserTruthRows: boolean;
  hadUnsafeBrowserTruthRows: boolean;
};

/** Summarizes raw inventory rows that fail the same gate as `filterRealBuyRetailerLinks` (for trust copy only). */
export function summarizeBuyPathGateSuppression<
  T extends {
    retailer_key?: string | null;
    affiliate_url: string;
    browser_truth_classification?: string | null;
  },
>(raw: T[]): BuyPathGateSuppressionSummary {
  let hadSearchPlaceholderRows = false;
  let hadIndirectDiscoveryRows = false;
  let hadBrokenDestinationRows = false;
  let hadMissingBrowserTruthRows = false;
  let hadUnsafeBrowserTruthRows = false;
  for (const link of raw) {
    const k = buyLinkGateFailureKind(link);
    if (k === "search_placeholder") hadSearchPlaceholderRows = true;
    else if (k === "indirect_discovery") hadIndirectDiscoveryRows = true;
    else if (k === "broken_destination") hadBrokenDestinationRows = true;
    else if (k === "missing_browser_truth") hadMissingBrowserTruthRows = true;
    else if (k === "unsafe_browser_truth") hadUnsafeBrowserTruthRows = true;
  }
  return {
    hadSearchPlaceholderRows,
    hadIndirectDiscoveryRows,
    hadBrokenDestinationRows,
    hadMissingBrowserTruthRows,
    hadUnsafeBrowserTruthRows,
  };
}

/** Strips search-placeholder rows and browser-truth-unproven rows before rendering buy CTAs. */
export function filterRealBuyRetailerLinks<
  T extends {
    retailer_key?: string | null;
    affiliate_url: string;
    browser_truth_classification?: string | null;
  },
>(links: T[]): T[] {
  return links.filter((l) => buyLinkGateFailureKind(l) === null);
}

type WinnerSelectableBuyLink = {
  id: string;
  affiliate_url: string;
  retailer_name?: string | null;
  browser_truth_checked_at?: string | null;
  retailer_key?: string | null;
  browser_truth_classification?: string | null;
};

/** Optional context from the money-page PDP (never per-filter slug special cases in the sorter). */
export type BuyPathSortContext = {
  /**
   * When true, a verified Amazon row may outrank other retailers that tie on URL specificity
   * and browser-truth recency. When false (compatible-style PDP), Amazon never receives that boost.
   */
  exactOemCatalogPart: boolean;
  /** Canonical OEM part token for this PDP (e.g. `MWF`, `HRF-R1`) to avoid cross-pack winner drift. */
  expectedOemPartNumber?: string | null;
};

/**
 * Heuristic from published filter metadata: certified-alternate / aftermarket-style PDPs should
 * not get Amazon primary promotion over other verified storefront links.
 */
export function isCompatibleReplacementFilterPdp(
  slug: string,
  name: string | null | undefined,
): boolean {
  const s = slug.trim().toLowerCase();
  if (/^lt\d+pc$/i.test(s)) return true;
  const n = (name ?? "").toLowerCase();
  if (/\b(certified alternate|alternate listing)\b/.test(n)) return true;
  if (/\b(aftermarket|non-oem|non oem)\b/.test(n)) return true;
  return false;
}

export function buyPathSortContextForFilter(
  slug: string,
  name: string | null | undefined,
  oemPartNumber?: string | null,
): BuyPathSortContext {
  return {
    exactOemCatalogPart: !isCompatibleReplacementFilterPdp(slug, name),
    expectedOemPartNumber: oemPartNumber ?? null,
  };
}

function isAmazonRetailerKey(key: string | null | undefined): boolean {
  return key?.trim().toLowerCase() === "amazon";
}

/** Extra sort key: 1 when Amazon may be preferred as primary CTA for an exact-OEM PDP. */
function amazonExactOemPrimaryBoost(
  link: WinnerSelectableBuyLink,
  sortContext: BuyPathSortContext | undefined,
): number {
  if (!sortContext?.exactOemCatalogPart) return 0;
  if (!isAmazonRetailerKey(link.retailer_key)) return 0;
  if (!isExplicitBuyableClassification(link.browser_truth_classification)) return 0;
  return 1;
}

function buyPathSpecificityScore(url: string): number {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return -1000;
  }

  const path = u.pathname.toLowerCase();
  const segments = path.split("/").filter(Boolean);
  let score = 0;

  // Deeper URLs are generally closer to a specific product destination.
  score += Math.min(segments.length, 6);

  // Product/PDP-like tokens suggest an exact buyable target.
  if (/(^|\/)(dp|gp\/product|product|products|parts|spec|sku|item|itm)(\/|$)/.test(path)) {
    score += 4;
  }

  // Search-like URLs are less exact, even if they somehow pass classification gates.
  const query = u.searchParams;
  const searchish = ["q", "query", "search", "searchterm", "searchkeyword", "keywords", "ntt"];
  if (searchish.some((k) => (query.get(k) ?? "").trim().length > 0)) {
    score -= 5;
  }

  return score;
}

function checkedAtUnixMs(value: string | null | undefined): number {
  if (!value) return Number.NEGATIVE_INFINITY;
  const t = Date.parse(value);
  return Number.isNaN(t) ? Number.NEGATIVE_INFINITY : t;
}

/**
 * Deterministic winner arbitration for Phase 1 corrected standard.
 * Precedence:
 * 1) When {@link BuyPathSortContext.exactOemCatalogPart} is true, prefer verified Amazon
 *    (`retailer_key` amazon + `direct_buyable`) before URL-shape arbitration.
 * 2) Highest verified destination specificity from affiliate URL shape.
 * 3) Most recently checked browser-truth timestamp.
 * 4) Stable lexical tie-breaks (retailer_name, then id).
 *
 * Callers pass {@link BuyPathSortContext} from PDP metadata (e.g. `buyPathSortContextForFilter`);
 * omitting it skips Amazon promotion (legacy ordering).
 */
export function sortBestVerifiedBuyLinks<T extends WinnerSelectableBuyLink>(
  links: T[],
  sortContext?: BuyPathSortContext,
): T[] {
  return [...links].sort((a, b) => {
    const scoreA = buyPathSpecificityScore(a.affiliate_url);
    const scoreB = buyPathSpecificityScore(b.affiliate_url);

    // Policy: exact-OEM pages prefer verified Amazon over other direct-buyable rows.
    const boostA = amazonExactOemPrimaryBoost(a, sortContext);
    const boostB = amazonExactOemPrimaryBoost(b, sortContext);
    if (boostA !== boostB) {
      return boostB - boostA;
    }

    const specificityDelta =
      scoreB - scoreA;
    if (specificityDelta !== 0) return specificityDelta;

    const checkedAtA = checkedAtUnixMs(a.browser_truth_checked_at);
    const checkedAtB = checkedAtUnixMs(b.browser_truth_checked_at);
    if (checkedAtA !== checkedAtB) {
      return checkedAtB > checkedAtA ? 1 : -1;
    }

    const nameDelta = (a.retailer_name ?? "").localeCompare(b.retailer_name ?? "");
    if (nameDelta !== 0) return nameDelta;

    return a.id.localeCompare(b.id);
  });
}

export function selectBestVerifiedBuyLink<T extends WinnerSelectableBuyLink>(
  links: T[],
  sortContext?: BuyPathSortContext,
): T | null {
  return sortBestVerifiedBuyLinks(links, sortContext)[0] ?? null;
}
