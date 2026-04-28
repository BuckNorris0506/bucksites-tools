export const PAGE_STATES = {
  INDEXABLE_BUY_READY: "INDEXABLE_BUY_READY",
  INDEXABLE_BUY_SUPPRESSED_TRUST: "INDEXABLE_BUY_SUPPRESSED_TRUST",
  INDEXABLE_INFO_ONLY: "INDEXABLE_INFO_ONLY",
  SITEMAP_EXCLUDED_DEMAND: "SITEMAP_EXCLUDED_DEMAND",
  SITEMAP_EXCLUDED_LOW_SIGNAL: "SITEMAP_EXCLUDED_LOW_SIGNAL",
  UNKNOWN: "UNKNOWN",
} as const;

export type PageState = (typeof PAGE_STATES)[keyof typeof PAGE_STATES];

export type PageStateInput = {
  isIndexable: boolean | null | undefined;
  validCtaCount: number | null;
  buyerPathState?: "show_buy" | "suppress_buy" | string | null;
  hasDemandSignal?: boolean | null;
};

export function classifyPageState(input: PageStateInput): PageState {
  if (input.isIndexable == null) {
    return PAGE_STATES.UNKNOWN;
  }

  if (input.isIndexable) {
    if (input.validCtaCount != null && input.validCtaCount > 0) {
      return PAGE_STATES.INDEXABLE_BUY_READY;
    }
    if (input.buyerPathState === "suppress_buy") {
      return PAGE_STATES.INDEXABLE_BUY_SUPPRESSED_TRUST;
    }
    return PAGE_STATES.INDEXABLE_INFO_ONLY;
  }

  if (input.hasDemandSignal === true) {
    return PAGE_STATES.SITEMAP_EXCLUDED_DEMAND;
  }

  if (input.isIndexable === false) {
    return PAGE_STATES.SITEMAP_EXCLUDED_LOW_SIGNAL;
  }

  return PAGE_STATES.UNKNOWN;
}
