import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  isRefrigeratorWaterLifecycleClosedV1,
  resolveDemandToCoverageNextLaneAfterFridgeCloseoutSteeringOverrideV1,
  shouldSuppressFridgeApplyPlanMicroLaneSteeringV1,
} from "./refrigerator-water-closed-lifecycle-command-center-steering-v1";
import { resolveFridgeBuyerPathBatchApplyPlanApprovedPlanningSteeringOverrideV1 } from "./fridge-buyer-path-batch-apply-plan-approval-steering-v1";
import { DEMAND_TO_COVERAGE_NEXT_LANE_REPORT_NAME_V1 } from "./demand-to-coverage-next-lane-v1";

const closedLifecycleTable = {
  current_wedge_states: [
    { wedge: "refrigerator_water" as const, lifecycle_state: "closed" as const },
    { wedge: "air_purifier" as const, lifecycle_state: "closed" as const },
  ],
};

const provenDemandLane = {
  contract: DEMAND_TO_COVERAGE_NEXT_LANE_REPORT_NAME_V1,
  read_only: true as const,
  data_mutation: false as const,
  runtime_status: "PROVEN" as const,
  source_status: "PROVEN" as const,
  recommendation_status: "START_NEW_DEMAND_SELECTED_BATCH" as const,
  recommended_wedge: "air_purifier" as const,
  recommended_next_action:
    "Start read-only air_purifier demand-selected batch planning; mutation unauthorized.",
  next_wedge: "air_purifier" as const,
  next_batch_candidate: "air_purifier_demand_selected_batch_candidate" as const,
  next_lane: "air_purifier_demand_selected_batch_owner_review_v1" as const,
};

describe("refrigerator-water-closed-lifecycle-command-center-steering-v1", () => {
  test("isRefrigeratorWaterLifecycleClosedV1 is true when wedge lifecycle_state is closed", () => {
    assert.equal(isRefrigeratorWaterLifecycleClosedV1(closedLifecycleTable), true);
    assert.equal(
      isRefrigeratorWaterLifecycleClosedV1({
        current_wedge_states: [
          { wedge: "refrigerator_water", lifecycle_state: "parity_verified" },
        ],
      }),
      false,
    );
  });

  test("shouldSuppressFridgeApplyPlanMicroLaneSteeringV1 when lifecycle closed or intake PROVEN_CLOSED", () => {
    assert.equal(
      shouldSuppressFridgeApplyPlanMicroLaneSteeringV1({
        lifecycleTable: closedLifecycleTable,
      }),
      true,
    );
    assert.equal(
      shouldSuppressFridgeApplyPlanMicroLaneSteeringV1({
        lifecycleTable: { current_wedge_states: [] },
        batchRunRegistryIntake: { fridge_run_registry_status: "PROVEN_CLOSED" },
      }),
      true,
    );
  });

  test("resolveDemandToCoverageNextLaneAfterFridgeCloseoutSteeringOverrideV1 returns air_purifier demand lane", () => {
    const override = resolveDemandToCoverageNextLaneAfterFridgeCloseoutSteeringOverrideV1({
      demandLane: provenDemandLane,
      lifecycleTable: closedLifecycleTable,
      brainStopTheLine: false,
    });
    assert.ok(override);
    assert.match(override.next_best_action, /^DEMAND-TO-COVERAGE \[START_NEW_DEMAND_SELECTED_BATCH\]:/);
    assert.match(override.next_best_action, /refrigerator_water batch lifecycle is closed/i);
    assert.match(override.next_best_action, /air_purifier/i);
    assert.match(override.next_best_action, /mutation unauthorized/i);
    assert.match(override.next_best_action, /apply-plan approval\/proposal\/readiness steering is suppressed/i);
    assert.match(override.next_best_action, /all_product_safe_buyer_path_census_v1/i);
    assert.ok(
      override.mutation_block_reasons.every((r) => !/authorized=true/i.test(r)),
    );
    assert.ok(override.mutation_block_reasons.includes("refrigerator_water_lifecycle_state=closed"));
  });

  test("returns null when demand lane is not PROVEN START_NEW_DEMAND_SELECTED_BATCH", () => {
    assert.equal(
      resolveDemandToCoverageNextLaneAfterFridgeCloseoutSteeringOverrideV1({
        demandLane: { ...provenDemandLane, runtime_status: "UNKNOWN" },
        lifecycleTable: closedLifecycleTable,
        brainStopTheLine: false,
      }),
      null,
    );
    assert.equal(
      resolveDemandToCoverageNextLaneAfterFridgeCloseoutSteeringOverrideV1({
        demandLane: { ...provenDemandLane, recommendation_status: "RECOMMEND_REOPEN" },
        lifecycleTable: closedLifecycleTable,
        brainStopTheLine: false,
      }),
      null,
    );
  });

  test("approved apply-plan planning steering is null when refrigerator_water lifecycle is closed", () => {
    const override = resolveFridgeBuyerPathBatchApplyPlanApprovedPlanningSteeringOverrideV1({
      refrigeratorWaterLifecycleClosed: true,
      approvalLane: {
        approval_status: "owner_approved_for_next_planning_only",
        planned_change_count: 14,
        apply_mutation_authorized: false,
        csv_apply_authorized: false,
        retailer_links_mutation_authorized: false,
        supabase_mutation_authorized: false,
        public_ui_mutation_authorized: false,
        buy_link_mutation_authorized: false,
        evidence_write_authorized: false,
        netlify_api_authorized: false,
        recommended_next_action: "stale",
      },
      brainStopTheLine: false,
    });
    assert.equal(override, null);
  });
});
