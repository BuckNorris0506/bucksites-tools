/**
 * Fridge `/go` source-page attribution for Decision-Capture model PDPs.
 *
 * Query params on buy hrefs → validated → click_events.page_type + page_slug.
 * Does not invent filter→model joins. Filter-page hops without these params
 * keep the existing refrigerator_filter / filter_slug logging.
 */

import { isValidApGoPageSlug } from "./ap-go-attribution-v1";

export const FRIDGE_GO_MODEL_PAGE_TYPE_V1 = "fridge_model" as const;

export type FridgeGoModelAttributionV1 = {
  page_type: typeof FRIDGE_GO_MODEL_PAGE_TYPE_V1;
  page_slug: string;
};

export function parseFridgeGoModelAttributionFromSearchParams(
  params: URLSearchParams,
): FridgeGoModelAttributionV1 | null {
  const pageType = params.get("page_type")?.trim();
  const pageSlug = params.get("page_slug")?.trim();
  if (pageType !== FRIDGE_GO_MODEL_PAGE_TYPE_V1 || !pageSlug) return null;
  if (!isValidApGoPageSlug(pageSlug)) return null;
  return { page_type: FRIDGE_GO_MODEL_PAGE_TYPE_V1, page_slug: pageSlug };
}

export function fridgeGoModelAttributionClickEventKeys(
  attribution: FridgeGoModelAttributionV1 | null,
): Record<string, string> {
  if (!attribution) return {};
  return {
    page_type: attribution.page_type,
    page_slug: attribution.page_slug,
  };
}

export function buildFridgeModelGoAttribution(modelSlug: string): FridgeGoModelAttributionV1 | null {
  const slug = modelSlug.trim().toLowerCase();
  if (!isValidApGoPageSlug(slug)) return null;
  return { page_type: FRIDGE_GO_MODEL_PAGE_TYPE_V1, page_slug: slug };
}
