import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { resolveFridgeBuyerPathBatchApplyPlanSteeringOverrideV1 } from "./fridge-buyer-path-batch-apply-plan-steering-v1";
import type { FridgeBuyerPathBatchApplyPlanProposalCommandCenterLaneV1 } from "./fridge-buyer-path-batch-apply-plan-proposal-command-center-v1";

function laneFixture(
  overrides: Partial<FridgeBuyerPathBatchApplyPlanProposalCommandCenterLaneV1> = {},
): Pick<
  FridgeBuyerPathBatchApplyPlanProposalCommandCenterLaneV1,
  | "plan_status"
  | "owner_review_status"
  | "planned_change_count"
  | "plan_artifact_rel_path"
  | "recommended_next_action"
  | "missing_affiliate_tag_count"
  | "duplicate_destination_group_count"
  | "apply_mutation_authorized"
  | "csv_apply_authorized"
  | "retailer_links_mutation_authorized"
  | "supabase_mutation_authorized"
  | "public_ui_mutation_authorized"
  | "buy_link_mutation_authorized"
  | "evidence_write_authorized"
  | "netlify_api_authorized"
> {
  return {
    plan_status: "READY_FOR_OWNER_REVIEW",
    owner_review_status: "OWNER_REVIEW_READY",
    planned_change_count: 14,
    plan_artifact_rel_path:
      "data/fridge/batch-production/apply-plans/fridge-buyer-path-batch-apply-plan-v1-0fec4a7b623a.json",
    recommended_next_action: "Owner review only.",
    missing_affiliate_tag_count: 0,
    duplicate_destination_group_count: 0,
    apply_mutation_authorized: false,
    csv_apply_authorized: false,
    retailer_links_mutation_authorized: false,
    supabase_mutation_authorized: false,
    public_ui_mutation_authorized: false,
    buy_link_mutation_authorized: false,
    evidence_write_authorized: false,
    netlify_api_authorized: false,
    ...overrides,
  };
}

describe("fridge buyer-path batch apply-plan steering", () => {
  test("resolveFridgeBuyerPathBatchApplyPlanSteeringOverrideV1 surfaces OWNER_REVIEW_READY NBA", () => {
    const override = resolveFridgeBuyerPathBatchApplyPlanSteeringOverrideV1({
      applyPlanLane: laneFixture(),
      brainStopTheLine: false,
    });
    assert.ok(override);
    assert.ok(override!.next_best_action.startsWith("BATCH APPLY-PLAN [OWNER_REVIEW_READY]:"));
    assert.match(override!.next_best_action, /refrigerator_water apply-plan proposal is ready for owner review/i);
    assert.match(override!.next_best_action, /14 planned changes/i);
    assert.match(override!.next_best_action, /mutation unauthorized/i);
    assert.equal(
      override!.next_move_command,
      "npm run buckparts:fridge-buyer-path-batch-apply-plan-proposal",
    );
    assert.equal(override!.next_best_action.includes("apply-plan discovery"), false);
  });

  test("resolveFridgeBuyerPathBatchApplyPlanSteeringOverrideV1 surfaces monetization/link risks", () => {
    const override = resolveFridgeBuyerPathBatchApplyPlanSteeringOverrideV1({
      applyPlanLane: laneFixture({
        owner_review_status: "OWNER_REVIEW_BLOCKED",
        missing_affiliate_tag_count: 8,
        duplicate_destination_group_count: 2,
      }),
      brainStopTheLine: false,
    });
    assert.ok(override);
    assert.ok(override!.next_best_action.startsWith("BATCH APPLY-PLAN [OWNER_REVIEW_RISK]:"));
    assert.match(override!.next_best_action, /8 missing tag=buckparts20-20 row\(s\)/i);
    assert.match(override!.next_best_action, /2 duplicate proposed_destination_url group\(s\)/i);
    assert.match(override!.next_best_action, /before any owner approval/i);
  });

  test("returns null when plan_status is BLOCKED", () => {
    const override = resolveFridgeBuyerPathBatchApplyPlanSteeringOverrideV1({
      applyPlanLane: laneFixture({ plan_status: "BLOCKED", planned_change_count: 0 }),
      brainStopTheLine: false,
    });
    assert.equal(override, null);
  });

  test("returns null on brain stop-the-line", () => {
    const override = resolveFridgeBuyerPathBatchApplyPlanSteeringOverrideV1({
      applyPlanLane: laneFixture(),
      brainStopTheLine: true,
    });
    assert.equal(override, null);
  });
});
