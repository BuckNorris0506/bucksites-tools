/**
 * Air purifier `/air-purifier/go` source-page attribution (phase 1).
 * Query params on buy hrefs → validated → `click_events.page_type` + `page_slug`.
 */
export const AP_GO_ATTRIBUTION_PAGE_TYPES = [
  "air_purifier_model",
  "air_purifier_filter",
] as const;

export type ApGoAttributionPageType = (typeof AP_GO_ATTRIBUTION_PAGE_TYPES)[number];

export type ApGoAttributionV1 = {
  page_type: ApGoAttributionPageType;
  page_slug: string;
};

export const AP_GO_PAGE_SLUG_MAX_LEN = 128;
export const AP_GO_PAGE_SLUG_RE = /^[a-z0-9-]+$/;

export function isValidApGoPageSlug(slug: string): boolean {
  if (!slug || slug.length > AP_GO_PAGE_SLUG_MAX_LEN) return false;
  if (slug.includes("://") || slug.includes("/")) return false;
  return AP_GO_PAGE_SLUG_RE.test(slug);
}

export function parseApGoAttributionFromSearchParams(
  params: URLSearchParams,
): ApGoAttributionV1 | null {
  const pageType = params.get("page_type")?.trim();
  const pageSlug = params.get("page_slug")?.trim();
  if (!pageType || !pageSlug) return null;
  if (!(AP_GO_ATTRIBUTION_PAGE_TYPES as readonly string[]).includes(pageType)) return null;
  if (!isValidApGoPageSlug(pageSlug)) return null;
  return { page_type: pageType as ApGoAttributionPageType, page_slug: pageSlug };
}

export function buildApGoAttributionQueryString(attribution: ApGoAttributionV1): string {
  return new URLSearchParams({
    page_type: attribution.page_type,
    page_slug: attribution.page_slug,
  }).toString();
}

export function appendApGoAttributionToGoHref(
  goHrefWithoutQuery: string,
  attribution?: ApGoAttributionV1 | null,
): string {
  if (!attribution) return goHrefWithoutQuery;
  const qs = buildApGoAttributionQueryString(attribution);
  return qs ? `${goHrefWithoutQuery}?${qs}` : goHrefWithoutQuery;
}

export function apGoAttributionClickEventKeys(
  attribution: ApGoAttributionV1 | null,
): Record<string, string> {
  if (!attribution) return {};
  return {
    page_type: attribution.page_type,
    page_slug: attribution.page_slug,
  };
}

export function buildAirPurifierModelGoAttribution(modelSlug: string): ApGoAttributionV1 | null {
  if (!isValidApGoPageSlug(modelSlug)) return null;
  return { page_type: "air_purifier_model", page_slug: modelSlug };
}

export function buildAirPurifierFilterGoAttribution(filterSlug: string): ApGoAttributionV1 | null {
  if (!isValidApGoPageSlug(filterSlug)) return null;
  return { page_type: "air_purifier_filter", page_slug: filterSlug };
}
