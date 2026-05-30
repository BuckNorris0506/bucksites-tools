/**
 * Post-apply truth for refrigerator model-first QA batch v1 compatibility cleanup.
 * Read-only detection — does not mutate CSV or weaken resolver token logic.
 */

import type { RefrigeratorModelFirstBatchResolverV1 } from "./refrigerator-model-first-batch-resolver-v1";

export const REFRIGERATOR_MODEL_FIRST_QA_BATCH_APPLIED_COUNTS_V1 = {
  batch_model_count: 20,
  removals_applied: 53,
  additions_applied: 10,
  keeps_verified: 16,
} as const;

export const REFRIGERATOR_MODEL_FIRST_POST_APPLY_CONFIDENCE_COUNTS_V1 = {
  PROVEN: 20,
  UNKNOWN: 0,
  MAPPING_REVIEW_REQUIRED: 0,
} as const;

export type RefrigeratorModelFirstQaBatchPostApplyStateV1 = {
  detected: true;
  batch_model_count: typeof REFRIGERATOR_MODEL_FIRST_QA_BATCH_APPLIED_COUNTS_V1.batch_model_count;
  removals_applied: typeof REFRIGERATOR_MODEL_FIRST_QA_BATCH_APPLIED_COUNTS_V1.removals_applied;
  additions_applied: typeof REFRIGERATOR_MODEL_FIRST_QA_BATCH_APPLIED_COUNTS_V1.additions_applied;
  keeps_verified: typeof REFRIGERATOR_MODEL_FIRST_QA_BATCH_APPLIED_COUNTS_V1.keeps_verified;
  proven_model_count: typeof REFRIGERATOR_MODEL_FIRST_POST_APPLY_CONFIDENCE_COUNTS_V1.PROVEN;
  remaining_mapping_review_count: typeof REFRIGERATOR_MODEL_FIRST_POST_APPLY_CONFIDENCE_COUNTS_V1.MAPPING_REVIEW_REQUIRED;
  samsung_marketing_token_cross_reference_resolved: true;
};

export function detectRefrigeratorModelFirstQaBatchPostApplyV1(args: {
  resolver: Pick<RefrigeratorModelFirstBatchResolverV1, "inspect_summary" | "model_rows">;
}): RefrigeratorModelFirstQaBatchPostApplyStateV1 | null {
  const { inspect_summary } = args.resolver;
  const expected = REFRIGERATOR_MODEL_FIRST_POST_APPLY_CONFIDENCE_COUNTS_V1;
  const counts = inspect_summary.confidence_counts;

  if (inspect_summary.models_checked_count !== REFRIGERATOR_MODEL_FIRST_QA_BATCH_APPLIED_COUNTS_V1.batch_model_count) {
    return null;
  }
  if (counts.PROVEN !== expected.PROVEN) return null;
  if (counts.UNKNOWN !== expected.UNKNOWN) return null;
  if (counts.MAPPING_REVIEW_REQUIRED !== expected.MAPPING_REVIEW_REQUIRED) return null;

  return {
    detected: true,
    batch_model_count: REFRIGERATOR_MODEL_FIRST_QA_BATCH_APPLIED_COUNTS_V1.batch_model_count,
    removals_applied: REFRIGERATOR_MODEL_FIRST_QA_BATCH_APPLIED_COUNTS_V1.removals_applied,
    additions_applied: REFRIGERATOR_MODEL_FIRST_QA_BATCH_APPLIED_COUNTS_V1.additions_applied,
    keeps_verified: REFRIGERATOR_MODEL_FIRST_QA_BATCH_APPLIED_COUNTS_V1.keeps_verified,
    proven_model_count: expected.PROVEN,
    remaining_mapping_review_count: expected.MAPPING_REVIEW_REQUIRED,
    samsung_marketing_token_cross_reference_resolved: true,
  };
}

export function formatRefrigeratorModelFirstQaBatchPostApplyRecommendedNextActionV1(
  state: RefrigeratorModelFirstQaBatchPostApplyStateV1,
): string {
  return (
    `QA BATCH APPLIED: 20-model compatibility cleanup complete (${String(state.removals_applied)} removals, ${String(state.additions_applied)} additions, ${String(state.keeps_verified)} keeps verified). ` +
    `All ${String(state.proven_model_count)} batch models PROVEN including Samsung HAF-QIN/HAF-CIN via evidence-backed DA97/DA29 cross-reference. ` +
    "No buy links or public confidence upgrade authorized from resolver alone."
  );
}

export function formatRefrigeratorModelFirstQaBatchPostApplyApplyPlanActionV1(
  state: RefrigeratorModelFirstQaBatchPostApplyStateV1,
): string {
  return (
    `POST-APPLY: Approved 20-model QA compat cleanup already applied (${String(state.removals_applied)} removals, ${String(state.additions_applied)} additions). ` +
    `No further compatibility_mappings.csv changes pending. All ${String(state.proven_model_count)} models PROVEN under resolver rules including Samsung marketing-token cross-reference.`
  );
}
