/**
 * Command Center steering — universal batch lifecycle truth table drives owner-facing
 * next_best_action for refrigerator_water / air_purifier batch lifecycle gaps.
 * Read-only; no mutation authorization.
 */

import type { UniversalBatchLifecycleTruthTableV1 } from "./universal-batch-lifecycle-truth-table-v1";

export const UNIVERSAL_BATCH_LIFECYCLE_APPLY_READINESS_UNKNOWN_STEERING_STATUS_V1 =
  "APPLY_READINESS_UNKNOWN" as const;

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

function hasDedicatedPostApprovalApplyReadinessScript(scriptNames: readonly string[]): boolean {
  return scriptNames.some((name) =>
    /apply-readiness|post-approval-apply|batch-apply-readiness/i.test(name),
  );
}

function lifecycleMutationBlockReasonsV1(
  lifecycleTable: Pick<
    UniversalBatchLifecycleTruthTableV1,
    "inherited_lifecycle_mutation_policy" | "unknowns_blocking_mutation"
  >,
  extraReasons: string[] = [],
): string[] {
  return [
    "universal_batch_lifecycle_truth_table_v1:mutation_authorized=false",
    "universal_batch_lifecycle_truth_table_v1:lifecycle_state=apply_plan_owner_approved",
    "universal_batch_lifecycle_truth_table_v1:one_true_next_state=apply_readiness_unknown",
    "inherited_lifecycle_mutation_policy.mutation_allowed=false",
    "inherited_lifecycle_mutation_policy.csv_apply_authorized=false",
    "inherited_lifecycle_mutation_policy.retailer_links_mutation_authorized=false",
    "inherited_lifecycle_mutation_policy.supabase_mutation_authorized=false",
    "inherited_lifecycle_mutation_policy.public_ui_mutation_authorized=false",
    "inherited_lifecycle_mutation_policy.buy_link_mutation_authorized=false",
    "inherited_lifecycle_mutation_policy.evidence_write_authorized=false",
    "inherited_lifecycle_mutation_policy.netlify_api_authorized=false",
    ...lifecycleTable.unknowns_blocking_mutation.map((reason) => `unknowns_blocking_mutation:${reason}`),
    ...extraReasons,
  ];
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

export function shouldApplyUniversalBatchLifecycleSteeringV1(args: {
  lifecycleOverride: UniversalBatchLifecycleSteeringOverrideV1 | null;
  demotableMicroLaneSteeringActive: boolean;
}): boolean {
  return args.lifecycleOverride != null && args.demotableMicroLaneSteeringActive;
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
  buckpartsScriptNames?: readonly string[];
}): UniversalBatchLifecycleSteeringOverrideV1 | null {
  if (args.brainStopTheLine) return null;
  if (args.lifecycleTable.mutation_authorized !== false) return null;
  if (args.lifecycleTable.inherited_lifecycle_mutation_policy.mutation_allowed !== false) return null;
  if (!refrigeratorWaterHasApplyReadinessUnknownLifecycleGapV1(args.lifecycleTable)) return null;

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
  const scriptNames = args.buckpartsScriptNames ?? [];
  const next_move_command = hasDedicatedPostApprovalApplyReadinessScript(scriptNames)
    ? "UNKNOWN: dedicated apply-readiness npm script exists but does not resolve apply_readiness_unknown in this repo state"
    : UNIVERSAL_BATCH_LIFECYCLE_NO_APPLY_READINESS_COMMAND_V1;

  return {
    next_best_action:
      `LIFECYCLE [${UNIVERSAL_BATCH_LIFECYCLE_APPLY_READINESS_UNKNOWN_STEERING_STATUS_V1}]: ` +
      `refrigerator_water has owner-approved planning for ${String(count)} apply-plan changes, but apply readiness is not proven. ` +
      "Next step is to prove the missing read-only apply-readiness facts or explicitly mark the batch blocked. " +
      "Mutation unauthorized.",
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
    mutation_block_reasons: lifecycleMutationBlockReasonsV1(args.lifecycleTable, [
      "lifecycle_steering:demoted_micro_lane_owner_steps",
    ]),
  };
}
