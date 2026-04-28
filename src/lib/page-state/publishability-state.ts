import { PAGE_STATES, type PageState } from "@/lib/page-state/page-state";

export const PUBLISHABILITY_STATES = {
  PUBLISHABLE_BUY_READY: "PUBLISHABLE_BUY_READY",
  PUBLISHABLE_TRUST_GATED: "PUBLISHABLE_TRUST_GATED",
  PUBLISHABLE_INFO_READY: "PUBLISHABLE_INFO_READY",
  NOINDEX_LOW_SIGNAL: "NOINDEX_LOW_SIGNAL",
  NOINDEX_DEMAND_HOLD: "NOINDEX_DEMAND_HOLD",
  NEEDS_IMPROVEMENT: "NEEDS_IMPROVEMENT",
  BLOCKED_OR_RETIRED: "BLOCKED_OR_RETIRED",
  UNKNOWN: "UNKNOWN",
} as const;

export type PublishabilityState =
  (typeof PUBLISHABILITY_STATES)[keyof typeof PUBLISHABILITY_STATES];

export type PublishabilityInput = {
  pageState: PageState | null | undefined;
  isInfoPage?: boolean | null;
  hasQualityIssue?: boolean | null;
  isBlockedOrRetired?: boolean | null;
};

export function classifyPublishabilityState(
  input: PublishabilityInput,
): PublishabilityState {
  if (input.isBlockedOrRetired === true) {
    return PUBLISHABILITY_STATES.BLOCKED_OR_RETIRED;
  }

  if (input.pageState == null) {
    return PUBLISHABILITY_STATES.UNKNOWN;
  }

  if (input.hasQualityIssue === true) {
    return PUBLISHABILITY_STATES.NEEDS_IMPROVEMENT;
  }

  if (input.pageState === PAGE_STATES.INDEXABLE_BUY_READY) {
    return PUBLISHABILITY_STATES.PUBLISHABLE_BUY_READY;
  }

  if (input.pageState === PAGE_STATES.INDEXABLE_BUY_SUPPRESSED_TRUST) {
    return PUBLISHABILITY_STATES.PUBLISHABLE_TRUST_GATED;
  }

  if (input.pageState === PAGE_STATES.INDEXABLE_INFO_ONLY) {
    if (input.isInfoPage !== false) {
      return PUBLISHABILITY_STATES.PUBLISHABLE_INFO_READY;
    }
    return PUBLISHABILITY_STATES.NEEDS_IMPROVEMENT;
  }

  if (input.pageState === PAGE_STATES.SITEMAP_EXCLUDED_DEMAND) {
    return PUBLISHABILITY_STATES.NOINDEX_DEMAND_HOLD;
  }

  if (input.pageState === PAGE_STATES.SITEMAP_EXCLUDED_LOW_SIGNAL) {
    return PUBLISHABILITY_STATES.NOINDEX_LOW_SIGNAL;
  }

  if (input.pageState === PAGE_STATES.UNKNOWN) {
    return PUBLISHABILITY_STATES.UNKNOWN;
  }

  return PUBLISHABILITY_STATES.UNKNOWN;
}
