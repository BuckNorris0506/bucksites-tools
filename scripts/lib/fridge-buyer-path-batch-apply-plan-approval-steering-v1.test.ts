import assert from "node:assert/strict";
import { describe, test } from "node:test";

import type { FridgeBuyerPathBatchApplyPlanApprovalCommandCenterLaneV1 } from "./fridge-buyer-path-batch-apply-plan-approval-command-center-v1";
import type { FridgeBuyerPathBatchApplyPlanProposalCommandCenterLaneV1 } from "./fridge-buyer-path-batch-apply-plan-proposal-command-center-v1";
import {
  FRIDGE_BUYER_PATH_BATCH_APPLY_PLAN_APPROVAL_STEERING_STATUS_V1,
  resolveFridgeBuyerPathBatchApplyPlanApprovalSteeringOverrideV1,
} from "./fridge-buyer-path-batch-apply-plan-approval-steering-v1";
import { resolveFridgeBuyerPathBatchApplyPlanSteeringOverrideV1 } from "./fridge-buyer-path-batch-apply-plan-steering-v1";

function approvalLaneFixture(
  overrides: Partial<FridgeBuyerPathBatchApplyPlanApprovalCommandCenterLaneV1> = {},
): Parameters<
  typeof resolveFridgeBuyerPathBatchApplyPlanApprovalSteeringOverrideV1
>[0]["approvalLane"] {
  return {
    approval_status: "awaiting_owner_approval",
    plan_status: "READY_FOR_OWNER_REVIEW",
    owner_review_status: "OWNER_REVIEW_READY",
    planned_change_count: 14,
    source_apply_plan_artifact_rel_path:
      "data/fridge/batch-production/apply-plans/fridge-buyer-path-batch-apply-plan-v1-0fec4a7b623a.json",
    recommended_next_action: "Review checklist.",
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

function proposalLaneFixture(
  overrides: Partial<FridgeBuyerPathBatchApplyPlanProposalCommandCenterLaneV1> = {},
): Parameters<
  typeof resolveFridgeBuyerPathBatchApplyPlanApprovalSteeringOverrideV1
>[0]["applyPlanProposalLane"] {
  return {
    plan_status: "READY_FOR_OWNER_REVIEW",
    owner_review_status: "OWNER_REVIEW_READY",
    apply_mutation_authorized: false,
    csv_apply_authorized: false,
    ...overrides,
  };
}

describe("fridge buyer-path apply-plan approval steering", () => {
  test("awaiting_owner_approval beats apply-plan proposal OWNER_REVIEW_READY steering", () => {
    const approvalOverride = resolveFridgeBuyerPathBatchApplyPlanApprovalSteeringOverrideV1({
      approvalLane: approvalLaneFixture(),
      applyPlanProposalLane: proposalLaneFixture(),
      brainStopTheLine: false,
    });
    assert.ok(approvalOverride);
    assert.ok(
      approvalOverride!.next_best_action.startsWith(
        `BATCH APPLY-PLAN [${FRIDGE_BUYER_PATH_BATCH_APPLY_PLAN_APPROVAL_STEERING_STATUS_V1}]:`,
      ),
    );
    assert.match(approvalOverride!.next_best_action, /requires owner approval/i);
    assert.match(approvalOverride!.next_best_action, /does not authorize applying planned_changes/i);
    assert.match(approvalOverride!.next_best_action, /mutation unauthorized/i);
    assert.equal(
      approvalOverride!.next_move_command,
      "npm run buckparts:fridge-buyer-path-batch-apply-plan-approval",
    );
    assert.ok(
      approvalOverride!.mutation_block_reasons.some((reason) =>
        reason.includes("planning_read_only_not_apply_ready"),
      ),
    );

    const proposalOverride = resolveFridgeBuyerPathBatchApplyPlanSteeringOverrideV1({
      applyPlanLane: {
        plan_status: "READY_FOR_OWNER_REVIEW",
        owner_review_status: "OWNER_REVIEW_READY",
        planned_change_count: 14,
        plan_artifact_rel_path:
          "data/fridge/batch-production/apply-plans/fridge-buyer-path-batch-apply-plan-v1-0fec4a7b623a.json",
        recommended_next_action: "Review plan.",
        missing_affiliate_tag_count: 0,
        duplicate_destination_group_count: 2,
        duplicate_destination_group_review_status: "ACCEPTABLE_SHARED_DESTINATION_PROVEN",
        apply_mutation_authorized: false,
        csv_apply_authorized: false,
        retailer_links_mutation_authorized: false,
        supabase_mutation_authorized: false,
        public_ui_mutation_authorized: false,
        buy_link_mutation_authorized: false,
        evidence_write_authorized: false,
        netlify_api_authorized: false,
      },
      brainStopTheLine: false,
    });
    assert.ok(proposalOverride);
    assert.notEqual(approvalOverride!.next_move_command, proposalOverride!.next_move_command);
  });

  test("returns null when approval is not awaiting_owner_approval", () => {
    const override = resolveFridgeBuyerPathBatchApplyPlanApprovalSteeringOverrideV1({
      approvalLane: approvalLaneFixture({ approval_status: "owner_approved_for_next_planning_only" }),
      applyPlanProposalLane: proposalLaneFixture(),
      brainStopTheLine: false,
    });
    assert.equal(override, null);
  });

  test("returns null on brain stop-the-line", () => {
    const override = resolveFridgeBuyerPathBatchApplyPlanApprovalSteeringOverrideV1({
      approvalLane: approvalLaneFixture(),
      applyPlanProposalLane: proposalLaneFixture(),
      brainStopTheLine: true,
    });
    assert.equal(override, null);
  });
});
