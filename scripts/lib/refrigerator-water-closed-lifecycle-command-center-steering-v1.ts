/**
 * Command Center steering when refrigerator_water batch lifecycle is closed on disk.
 * Demotes stale fridge apply-plan micro-lanes; prefers demand_to_coverage_next_lane_v1 when proven.
 * Read-only; no mutation authorization.
 */

import type { BatchRunRegistryIntakeReportV1 } from "./batch-run-registry-intake-v1";
import type { DemandToCoverageNextLaneReportV1 } from "./demand-to-coverage-next-lane-v1";
import { DEMAND_TO_COVERAGE_NEXT_LANE_REPORT_NAME_V1 } from "./demand-to-coverage-next-lane-v1";
import type { UniversalBatchLifecycleTruthTableV1 } from "./universal-batch-lifecycle-truth-table-v1";

export const REFRIGERATOR_WATER_CLOSED_LIFECYCLE_STEERING_STATUS_V1 = "FRIDGE_BATCH_CLOSED" as const;

export const DEMAND_TO_COVERAGE_AFTER_FRIDGE_CLOSEOUT_STEERING_STATUS_V1 =
  "START_NEW_DEMAND_SELECTED_BATCH" as const;

export const DEMAND_TO_COVERAGE_NEXT_LANE_SOURCE_COMMAND_V1 =
  "npx tsx scripts/report-buckparts-demand-to-coverage-next-lane.ts" as const;

export type DemandToCoverageAfterFridgeCloseoutSteeringOverrideV1 = {
  next_best_action: string;
  why_this_action: string;
  next_move_command: string;
  demoted_steering_layers: string[];
  mutation_block_reasons: string[];
};

export function isRefrigeratorWaterLifecycleClosedV1(
  lifecycleTable: Pick<UniversalBatchLifecycleTruthTableV1, "current_wedge_states">,
): boolean {
  const fridge = lifecycleTable.current_wedge_states.find((row) => row.wedge === "refrigerator_water");
  return fridge?.lifecycle_state === "closed";
}

export function isFridgeRunRegistryProvenClosedV1(
  intake: Pick<BatchRunRegistryIntakeReportV1, "fridge_run_registry_status">,
): boolean {
  return intake.fridge_run_registry_status === "PROVEN_CLOSED";
}

export function shouldSuppressFridgeApplyPlanMicroLaneSteeringV1(args: {
  lifecycleTable: Pick<UniversalBatchLifecycleTruthTableV1, "current_wedge_states">;
  batchRunRegistryIntake?: Pick<BatchRunRegistryIntakeReportV1, "fridge_run_registry_status"> | null;
}): boolean {
  return (
    isRefrigeratorWaterLifecycleClosedV1(args.lifecycleTable) ||
    (args.batchRunRegistryIntake != null &&
      isFridgeRunRegistryProvenClosedV1(args.batchRunRegistryIntake))
  );
}

export function resolveDemandToCoverageNextLaneAfterFridgeCloseoutSteeringOverrideV1(args: {
  demandLane: Pick<
    DemandToCoverageNextLaneReportV1,
    | "contract"
    | "read_only"
    | "data_mutation"
    | "runtime_status"
    | "source_status"
    | "recommendation_status"
    | "recommended_wedge"
    | "recommended_next_action"
    | "next_wedge"
    | "next_batch_candidate"
    | "next_lane"
  >;
  lifecycleTable: Pick<UniversalBatchLifecycleTruthTableV1, "current_wedge_states">;
  brainStopTheLine: boolean;
}): DemandToCoverageAfterFridgeCloseoutSteeringOverrideV1 | null {
  if (args.brainStopTheLine) return null;
  if (!isRefrigeratorWaterLifecycleClosedV1(args.lifecycleTable)) return null;
  if (args.demandLane.read_only !== true || args.demandLane.data_mutation !== false) return null;
  if (args.demandLane.runtime_status !== "PROVEN") return null;
  if (args.demandLane.recommendation_status !== "START_NEW_DEMAND_SELECTED_BATCH") return null;

  const wedge = args.demandLane.recommended_wedge;
  const batchCandidate = args.demandLane.next_batch_candidate ?? "UNKNOWN";
  const nextLane = args.demandLane.next_lane ?? "UNKNOWN";

  return {
    next_best_action:
      `DEMAND-TO-COVERAGE [${DEMAND_TO_COVERAGE_AFTER_FRIDGE_CLOSEOUT_STEERING_STATUS_V1}]: ` +
      `refrigerator_water batch lifecycle is closed on disk (run-registry closeout_complete=true). ` +
      `Next read-only expansion work is demand-selected ${String(wedge)} buyer-path batch planning` +
      (batchCandidate !== "UNKNOWN" ? ` (candidate ${batchCandidate})` : "") +
      (nextLane !== "UNKNOWN" ? ` via ${nextLane}` : "") +
      ". Mutation unauthorized. Stale refrigerator_water apply-plan approval/proposal/readiness steering is suppressed. " +
      "all_product_safe_buyer_path_census_v1 / Amazon-first rescue queue remain backlog only — not the top active batch lifecycle action.",
    why_this_action: args.demandLane.recommended_next_action,
    next_move_command: DEMAND_TO_COVERAGE_NEXT_LANE_SOURCE_COMMAND_V1,
    demoted_steering_layers: [
      "fridge_buyer_path_batch_apply_plan_approval_steering_v1:approved_planning",
      "fridge_buyer_path_batch_apply_plan_approval_steering_v1:awaiting_owner_approval",
      "fridge_buyer_path_batch_apply_plan_steering_v1",
      "batch_run_registry_intake_steering_v1:active_planning",
      "universal_batch_lifecycle_steering_v1:parity_verified",
      "batch_production_operating_dispatch_v1:closed_batch",
    ],
    mutation_block_reasons: [
      "refrigerator_water_lifecycle_state=closed",
      `${DEMAND_TO_COVERAGE_NEXT_LANE_REPORT_NAME_V1}:read_only=true`,
      `${DEMAND_TO_COVERAGE_NEXT_LANE_REPORT_NAME_V1}:data_mutation=false`,
      `${DEMAND_TO_COVERAGE_NEXT_LANE_REPORT_NAME_V1}:runtime_status=PROVEN`,
      `${DEMAND_TO_COVERAGE_NEXT_LANE_REPORT_NAME_V1}:recommendation_status=START_NEW_DEMAND_SELECTED_BATCH`,
      "demand_selected_batch:batch_start_authorized=false",
      "demand_selected_batch:csv_apply_authorized=false",
      "demand_selected_batch:supabase_mutation_authorized=false",
      "demand_selected_batch:evidence_write_authorized=false",
      "demand_selected_batch:netlify_api_authorized=false",
      "demand_selected_batch:public_ui_mutation_authorized=false",
    ],
  };
}
