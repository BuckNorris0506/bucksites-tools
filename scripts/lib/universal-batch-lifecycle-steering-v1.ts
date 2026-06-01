/**
 * Command Center steering — universal batch lifecycle truth table drives owner-facing
 * next_best_action for refrigerator_water / air_purifier batch lifecycle gaps.
 * Read-only; no mutation authorization.
 */

import type { UniversalBatchLifecycleApplyReadinessReportV1 } from "./universal-batch-lifecycle-apply-readiness-v1";
import { UNIVERSAL_BATCH_LIFECYCLE_APPLY_READINESS_SOURCE_COMMAND_V1 } from "./universal-batch-lifecycle-apply-readiness-v1";
import type { UniversalBatchLifecycleApplyExecutionPlanReportV1 } from "./universal-batch-lifecycle-apply-execution-plan-v1";
import { UNIVERSAL_BATCH_LIFECYCLE_APPLY_EXECUTION_PLAN_SOURCE_COMMAND_V1 } from "./universal-batch-lifecycle-apply-execution-plan-v1";
import type { UniversalBatchLifecycleMutationAuthorizationReviewReportV1 } from "./universal-batch-lifecycle-mutation-authorization-review-v1";
import { UNIVERSAL_BATCH_LIFECYCLE_MUTATION_AUTHORIZATION_REVIEW_SOURCE_COMMAND_V1 } from "./universal-batch-lifecycle-mutation-authorization-review-v1";
import {
  UNIVERSAL_BATCH_LIFECYCLE_GUARDED_CSV_APPLY_EXECUTOR_SOURCE_COMMAND_V1,
  UNIVERSAL_BATCH_LIFECYCLE_GUARDED_CSV_APPLY_EXECUTOR_WRITE_SOURCE_COMMAND_V1,
} from "./universal-batch-lifecycle-guarded-csv-apply-executor-v1";
import type { UniversalBatchLifecycleTruthTableV1 } from "./universal-batch-lifecycle-truth-table-v1";

export const UNIVERSAL_BATCH_LIFECYCLE_APPLY_READINESS_UNKNOWN_STEERING_STATUS_V1 =
  "APPLY_READINESS_UNKNOWN" as const;

export const UNIVERSAL_BATCH_LIFECYCLE_APPLY_READINESS_READY_STEERING_STATUS_V1 =
  "APPLY_READINESS_READY" as const;

export const UNIVERSAL_BATCH_LIFECYCLE_MUTATION_AUTHORIZED_FOR_GUARDED_APPLY_STEERING_STATUS_V1 =
  "MUTATION_AUTHORIZED_FOR_GUARDED_APPLY" as const;

export const UNIVERSAL_BATCH_LIFECYCLE_APPLIED_PARITY_PROVEN_STEERING_STATUS_V1 =
  "APPLIED_PARITY_PROVEN" as const;

export const UNIVERSAL_BATCH_LIFECYCLE_GUARDED_CSV_APPLY_WRITE_MODE_NOT_INVOKED_REASON_V1 =
  "universal_batch_lifecycle_guarded_csv_apply_executor_v1:write_mode_not_invoked" as const;

/** @deprecated Use UNIVERSAL_BATCH_LIFECYCLE_GUARDED_CSV_APPLY_WRITE_MODE_NOT_INVOKED_REASON_V1 */
export const UNIVERSAL_BATCH_LIFECYCLE_GUARDED_CSV_APPLY_WRITE_MODE_NOT_IMPLEMENTED_REASON_V1 =
  UNIVERSAL_BATCH_LIFECYCLE_GUARDED_CSV_APPLY_WRITE_MODE_NOT_INVOKED_REASON_V1;

function isMutationAuthorizedForGuardedCsvApplyV1(
  review?: Pick<
    UniversalBatchLifecycleMutationAuthorizationReviewReportV1,
    "mutation_authorization_review_status" | "mutation_authorized" | "csv_apply_authorized"
  > | null,
): boolean {
  return (
    review?.mutation_authorization_review_status === "MUTATION_AUTHORIZED_FOR_GUARDED_APPLY" &&
    review.mutation_authorized === true &&
    review.csv_apply_authorized === true
  );
}

function isAppliedParityProvenV1(
  review?: Pick<
    UniversalBatchLifecycleMutationAuthorizationReviewReportV1,
    "mutation_authorization_review_status"
  > | null,
): boolean {
  return review?.mutation_authorization_review_status === "APPLIED_PARITY_PROVEN";
}

/** @deprecated Use UNIVERSAL_BATCH_LIFECYCLE_APPLY_READINESS_SOURCE_COMMAND_V1 instead. */
export const UNIVERSAL_BATCH_LIFECYCLE_NO_APPLY_READINESS_COMMAND_V1 =
  "UNKNOWN: no dedicated post-approval apply-readiness command resolves apply_readiness_unknown" as const;

export type UniversalBatchLifecycleSteeringOverrideV1 = {
  next_best_action: string;
  why_this_action: string;
  next_move_command: string;
  lifecycle_state: UniversalBatchLifecycleTruthTableV1["current_wedge_states"][number]["lifecycle_state"];
  one_true_next_state: UniversalBatchLifecycleTruthTableV1["one_true_next_state_for_refrigerator_water"];
  wedge: "refrigerator_water";
  planned_change_count: number;
  demoted_steering_layers: string[];
  mutation_block_reasons: string[];
};

export function buildLifecycleOwnedMutatingBlockReasonsV1(args: {
  lifecycleTable: Pick<
    UniversalBatchLifecycleTruthTableV1,
    "inherited_lifecycle_mutation_policy" | "unknowns_blocking_mutation" | "one_true_next_state_for_refrigerator_water"
  >;
  mutationAuthorizationReview?: Pick<
    UniversalBatchLifecycleMutationAuthorizationReviewReportV1,
    | "mutation_authorization_review_status"
    | "review_blockers"
    | "apply_executor_ready"
    | "mutation_authorized"
    | "csv_apply_authorized"
  > | null;
}): string[] {
  const oneTrueNextState = args.lifecycleTable.one_true_next_state_for_refrigerator_water;
  const reasons = [
    "universal_batch_lifecycle_truth_table_v1:mutation_authorized=false",
    `universal_batch_lifecycle_truth_table_v1:one_true_next_state=${oneTrueNextState}`,
    "inherited_lifecycle_mutation_policy.mutation_allowed=false",
    "inherited_lifecycle_mutation_policy.csv_apply_authorized=false",
    "inherited_lifecycle_mutation_policy.retailer_links_mutation_authorized=false",
    "inherited_lifecycle_mutation_policy.supabase_mutation_authorized=false",
    "inherited_lifecycle_mutation_policy.public_ui_mutation_authorized=false",
    "inherited_lifecycle_mutation_policy.buy_link_mutation_authorized=false",
    "inherited_lifecycle_mutation_policy.evidence_write_authorized=false",
    "inherited_lifecycle_mutation_policy.netlify_api_authorized=false",
    ...args.lifecycleTable.unknowns_blocking_mutation.map((reason) => `unknowns_blocking_mutation:${reason}`),
  ];

  const mutationAuthReview = args.mutationAuthorizationReview;
  const appliedParityProven = isAppliedParityProvenV1(mutationAuthReview);
  if (isMutationAuthorizedForGuardedCsvApplyV1(mutationAuthReview)) {
    reasons.push(UNIVERSAL_BATCH_LIFECYCLE_GUARDED_CSV_APPLY_WRITE_MODE_NOT_INVOKED_REASON_V1);
    reasons.push("mutation_authorization_review_v1:guarded_csv_apply_not_invoked");
  } else if (appliedParityProven) {
    reasons.push("mutation_authorization_review_v1:APPLIED_PARITY_PROVEN");
  } else {
    if (mutationAuthReview?.mutation_authorization_review_status === "BLOCKED") {
      for (const blocker of mutationAuthReview.review_blockers) {
        reasons.push(`mutation_authorization_review_v1:${blocker}`);
      }
    }
    if (mutationAuthReview?.apply_executor_ready === false) {
      reasons.push("mutation_authorization_review_v1:apply_executor_ready=false");
    }
    if (mutationAuthReview?.mutation_authorized === false) {
      reasons.push("mutation_authorization_review_v1:mutation_authorized=false");
    }
  }

  return reasons;
}

export function refrigeratorWaterHasApplyReadinessUnknownLifecycleGapV1(
  lifecycleTable: Pick<
    UniversalBatchLifecycleTruthTableV1,
    "current_wedge_states" | "one_true_next_state_for_refrigerator_water"
  >,
): boolean {
  const fridge = lifecycleTable.current_wedge_states.find((row) => row.wedge === "refrigerator_water");
  if (!fridge) return false;
  if (
    fridge.lifecycle_state === "apply_plan_owner_approved" &&
    fridge.alternate_lifecycle_states.includes("apply_readiness_unknown")
  ) {
    return true;
  }
  return lifecycleTable.one_true_next_state_for_refrigerator_water === "apply_readiness_unknown";
}

export function refrigeratorWaterShouldSteerUniversalBatchLifecycleV1(
  lifecycleTable: Pick<
    UniversalBatchLifecycleTruthTableV1,
    "current_wedge_states" | "one_true_next_state_for_refrigerator_water"
  >,
): boolean {
  const fridge = lifecycleTable.current_wedge_states.find((row) => row.wedge === "refrigerator_water");
  if (!fridge) return false;
  if (fridge.lifecycle_state === "apply_readiness_ready" || fridge.lifecycle_state === "parity_verified") return true;
  return refrigeratorWaterHasApplyReadinessUnknownLifecycleGapV1(lifecycleTable);
}

export function shouldApplyUniversalBatchLifecycleSteeringV1(args: {
  lifecycleOverride: UniversalBatchLifecycleSteeringOverrideV1 | null;
  /** @deprecated Micro-lane steering may still be computed for fallback diagnostics; lifecycle wins when override exists. */
  demotableMicroLaneSteeringActive?: boolean;
}): boolean {
  return args.lifecycleOverride != null;
}

export function resolveUniversalBatchLifecycleSteeringOverrideV1(args: {
  lifecycleTable: Pick<
    UniversalBatchLifecycleTruthTableV1,
    | "current_wedge_states"
    | "one_true_next_state_for_refrigerator_water"
    | "inherited_lifecycle_mutation_policy"
    | "mutation_authorized"
    | "unknowns_blocking_mutation"
  >;
  planned_change_count: number;
  brainStopTheLine: boolean;
  applyReadiness?: Pick<
    UniversalBatchLifecycleApplyReadinessReportV1,
    "apply_readiness_status" | "apply_readiness_blockers" | "source_command"
  > | null;
  applyExecutionPlan?: Pick<
    UniversalBatchLifecycleApplyExecutionPlanReportV1,
    "execution_plan_status" | "source_command" | "planned_change_count"
  > | null;
  mutationAuthorizationReview?: Pick<
    UniversalBatchLifecycleMutationAuthorizationReviewReportV1,
    | "mutation_authorization_review_status"
    | "source_command"
    | "review_blockers"
    | "apply_executor_ready"
    | "mutation_authorized"
    | "csv_apply_authorized"
  > | null;
}): UniversalBatchLifecycleSteeringOverrideV1 | null {
  if (args.brainStopTheLine) return null;
  if (args.lifecycleTable.mutation_authorized !== false) return null;
  if (args.lifecycleTable.inherited_lifecycle_mutation_policy.mutation_allowed !== false) return null;
  if (!refrigeratorWaterShouldSteerUniversalBatchLifecycleV1(args.lifecycleTable)) return null;

  const fridge = args.lifecycleTable.current_wedge_states.find((row) => row.wedge === "refrigerator_water");
  if (!fridge) return null;
  if (
    !fridge.proven_mapping_sources.some((source) =>
      source.includes("approval_status=owner_approved_for_next_planning_only"),
    )
  ) {
    return null;
  }

  const count = args.planned_change_count;
  const executionPlanReady =
    args.applyExecutionPlan?.execution_plan_status === "READY_FOR_MUTATION_AUTH_REVIEW";
  const mutationAuthReviewBlocked =
    args.mutationAuthorizationReview?.mutation_authorization_review_status === "BLOCKED";
  const appliedParityProven = isAppliedParityProvenV1(args.mutationAuthorizationReview);
  const mutationAuthorizedForGuardedApply = isMutationAuthorizedForGuardedCsvApplyV1(
    args.mutationAuthorizationReview,
  );
  const applyExecutorReady = args.mutationAuthorizationReview?.apply_executor_ready === true;
  const next_move_command = appliedParityProven
    ? "node --import tsx scripts/report-buckparts-command-center.ts"
    : mutationAuthReviewBlocked
    ? UNIVERSAL_BATCH_LIFECYCLE_MUTATION_AUTHORIZATION_REVIEW_SOURCE_COMMAND_V1
    : mutationAuthorizedForGuardedApply
      ? UNIVERSAL_BATCH_LIFECYCLE_GUARDED_CSV_APPLY_EXECUTOR_SOURCE_COMMAND_V1
      : executionPlanReady
        ? UNIVERSAL_BATCH_LIFECYCLE_APPLY_EXECUTION_PLAN_SOURCE_COMMAND_V1
        : UNIVERSAL_BATCH_LIFECYCLE_APPLY_READINESS_SOURCE_COMMAND_V1;
  const isProven =
    appliedParityProven ||
    args.lifecycleTable.one_true_next_state_for_refrigerator_water === "apply_readiness_ready" ||
    args.applyReadiness?.apply_readiness_status === "PROVEN";

  const mutation_block_reasons = buildLifecycleOwnedMutatingBlockReasonsV1({
    lifecycleTable: args.lifecycleTable,
    mutationAuthorizationReview: args.mutationAuthorizationReview,
  });

  if (isProven) {
    const steeringStatus = appliedParityProven
      ? UNIVERSAL_BATCH_LIFECYCLE_APPLIED_PARITY_PROVEN_STEERING_STATUS_V1
      : mutationAuthorizedForGuardedApply
      ? UNIVERSAL_BATCH_LIFECYCLE_MUTATION_AUTHORIZED_FOR_GUARDED_APPLY_STEERING_STATUS_V1
      : UNIVERSAL_BATCH_LIFECYCLE_APPLY_READINESS_READY_STEERING_STATUS_V1;
    return {
      next_best_action:
        appliedParityProven
          ? `LIFECYCLE [${steeringStatus}]: refrigerator_water guarded CSV apply is already applied for ${String(count)} apply-plan changes with after_row parity proven. Do not run write mode again; proceed with read-only post-apply validation and closeout.`
          : `LIFECYCLE [${steeringStatus}]: ` +
            `refrigerator_water apply-readiness is PROVEN for ${String(count)} apply-plan changes.` +
            (executionPlanReady
          ? " Read-only execution plan is READY_FOR_MUTATION_AUTH_REVIEW."
          : "") +
        (mutationAuthorizedForGuardedApply
          ? ` Explicit owner_mutation_approved row is active for this execution plan. Guarded CSV write mode is available via ${UNIVERSAL_BATCH_LIFECYCLE_GUARDED_CSV_APPLY_EXECUTOR_WRITE_SOURCE_COMMAND_V1} but has not been invoked. Run read-only ${UNIVERSAL_BATCH_LIFECYCLE_GUARDED_CSV_APPLY_EXECUTOR_SOURCE_COMMAND_V1} DRY_RUN verification first. No CSV mutation applied.`
          : mutationAuthReviewBlocked
            ? " Explicit mutation authorization review is still BLOCKED."
            : applyExecutorReady
              ? " Guarded CSV apply executor is DRY_RUN_READY; owner mutation approval still required."
              : " Mutation unauthorized; no apply executor exists."),
      why_this_action: fridge.mapping_summary,
      next_move_command,
      lifecycle_state: fridge.lifecycle_state,
      one_true_next_state: args.lifecycleTable.one_true_next_state_for_refrigerator_water,
      wedge: "refrigerator_water",
      planned_change_count: count,
      demoted_steering_layers: [
        "fridge_buyer_path_batch_apply_plan_approval_steering_v1:approved_planning",
        "fridge_buyer_path_batch_apply_plan_approval_steering_v1:awaiting_owner_approval",
        "fridge_buyer_path_batch_apply_plan_steering_v1",
        "batch_run_registry_intake_steering_v1",
        "batch_production_operating_dispatch_v1",
      ],
      mutation_block_reasons,
    };
  }

  const blockerCount = args.applyReadiness?.apply_readiness_blockers.length ?? 0;
  const blockerHint =
    blockerCount > 0 ? ` Discovery report lists ${String(blockerCount)} blockers.` : "";

  return {
    next_best_action:
      `LIFECYCLE [${UNIVERSAL_BATCH_LIFECYCLE_APPLY_READINESS_UNKNOWN_STEERING_STATUS_V1}]: ` +
      `refrigerator_water has owner-approved planning for ${String(count)} apply-plan changes, but apply readiness is not proven.` +
      blockerHint +
      " Run read-only apply-readiness discovery. Mutation unauthorized.",
    why_this_action: fridge.mapping_summary,
    next_move_command,
    lifecycle_state: fridge.lifecycle_state,
    one_true_next_state: args.lifecycleTable.one_true_next_state_for_refrigerator_water,
    wedge: "refrigerator_water",
    planned_change_count: count,
    demoted_steering_layers: [
      "fridge_buyer_path_batch_apply_plan_approval_steering_v1:approved_planning",
      "fridge_buyer_path_batch_apply_plan_approval_steering_v1:awaiting_owner_approval",
      "fridge_buyer_path_batch_apply_plan_steering_v1",
      "batch_run_registry_intake_steering_v1",
      "batch_production_operating_dispatch_v1",
    ],
    mutation_block_reasons,
  };
}
