/**
 * Read-only detection of learned-failure single_filter_family WARN ambiguity.
 * Does not mutate catalog data.
 */

import {
  getLearnedFailurePerSlugGuardRowV1,
  isLearnedFailureGuardsAuditDataAvailableV1,
  resetLearnedFailureGuardsAuditLoaderCacheForTestsV1,
  setLearnedFailureGuardsAuditUnavailableForTestsV1,
  type LearnedFailureSingleFilterFamilyGuardV1,
} from "@/lib/fridge/learned-failure-guards-audit-v1-loader";

export const SINGLE_FILTER_FAMILY_AMBIGUITY_DETAIL_V1 =
  "Multiple mapped filter slugs without proven single-family proof" as const;

export function resetSingleFilterFamilyAmbiguityGuardIndexCacheForTestsV1(): void {
  resetLearnedFailureGuardsAuditLoaderCacheForTestsV1();
}

export { setLearnedFailureGuardsAuditUnavailableForTestsV1 };

export function isSingleFilterFamilyAmbiguityGuardV1(
  singleFilterFamily: LearnedFailureSingleFilterFamilyGuardV1 | undefined,
): boolean {
  if (!singleFilterFamily) return false;
  return (
    singleFilterFamily.verdict === "WARN" &&
    singleFilterFamily.detail.includes(SINGLE_FILTER_FAMILY_AMBIGUITY_DETAIL_V1)
  );
}

export function isFridgeModelSingleFilterFamilyAmbiguousV1(args: {
  fridgeModelSlug: string;
  rootDir?: string;
}): boolean {
  void args.rootDir;
  if (!isLearnedFailureGuardsAuditDataAvailableV1()) {
    return true;
  }
  const row = getLearnedFailurePerSlugGuardRowV1(args.fridgeModelSlug);
  if (!row) return false;
  return isSingleFilterFamilyAmbiguityGuardV1(row.single_filter_family);
}
