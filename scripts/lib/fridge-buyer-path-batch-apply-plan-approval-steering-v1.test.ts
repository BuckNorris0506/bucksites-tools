import assert from "node:assert/strict";
import { describe, test } from "node:test";

import type { FridgeBuyerPathBatchApplyPlanApprovalCommandCenterLaneV1 } from "./fridge-buyer-path-batch-apply-plan-approval-command-center-v1";
import type { FridgeBuyerPathBatchApplyPlanProposalCommandCenterLaneV1 } from "./fridge-buyer-path-batch-apply-plan-proposal-command-center-v1";
import {
  FRIDGE_BUYER_PATH_BATCH_APPLY_PLAN_APPROVAL_STEERING_STATUS_V1,
  FRIDGE_BUYER_PATH_BATCH_APPLY_PLAN_APPROVED_PLANNING_STEERING_STATUS_V1,
  resolveFridgeBuyerPathBatchApplyPlanApprovalSteeringOverrideV1,
  resolveFridgeBuyerPathBatchApplyPlanApprovedPlanningSteeringOverrideV1,
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

function proposalSteeringLaneFixture() {
  return {
    plan_status: "READY_FOR_OWNER_REVIEW" as const,
    owner_review_status: "OWNER_REVIEW_READY" as const,
    planned_change_count: 14,
    plan_artifact_rel_path:
      "data/fridge/batch-production/apply-plans/fridge-buyer-path-batch-apply-plan-v1-0fec4a7b623a.json",
    recommended_next_action: "Review plan.",
    missing_affiliate_tag_count: 0,
    duplicate_destination_group_count: 2,
    duplicate_destination_group_review_status: "ACCEPTABLE_SHARED_DESTINATION_PROVEN" as const,
    apply_mutation_authorized: false as const,
    csv_apply_authorized: false as const,
    retailer_links_mutation_authorized: false as const,
    supabase_mutation_authorized: false as const,
    public_ui_mutation_authorized: false as const,
    buy_link_mutation_authorized: false as const,
    evidence_write_authorized: false as const,
    netlify_api_authorized: false as const,
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
    assert.equal(
      approvalOverride!.next_move_command,
      "npm run buckparts:fridge-buyer-path-batch-apply-plan-approval",
    );

    const proposalOverride = resolveFridgeBuyerPathBatchApplyPlanSteeringOverrideV1({
      applyPlanLane: proposalSteeringLaneFixture(),
      brainStopTheLine: false,
    });
    assert.ok(proposalOverride);
    assert.notEqual(approvalOverride!.next_move_command, proposalOverride!.next_move_command);
  });

  test("owner_approved_for_next_planning_only beats apply-plan proposal OWNER_REVIEW_READY steering", () => {
    const approvedOverride = resolveFridgeBuyerPathBatchApplyPlanApprovedPlanningSteeringOverrideV1({
      approvalLane: approvalLaneFixture({ approval_status: "owner_approved_for_next_planning_only" }),
      brainStopTheLine: false,
    });
    assert.ok(approvedOverride);
    assert.ok(
      approvedOverride!.next_best_action.startsWith(
        `BATCH APPLY-PLAN [${FRIDGE_BUYER_PATH_BATCH_APPLY_PLAN_APPROVED_PLANNING_STEERING_STATUS_V1}]:`,
      ),
    );
    assert.match(approvedOverride!.next_best_action, /approval is recorded for 14 planned changes/i);
    assert.match(approvedOverride!.next_best_action, /apply-readiness discovery/i);
    assert.doesNotMatch(approvedOverride!.next_best_action, /OWNER_REVIEW_READY/i);
    assert.match(approvedOverride!.next_best_action, /UNKNOWN: No dedicated post-approval apply-readiness npm command exists/i);
    assert.equal(
      approvedOverride!.next_move_command,
      "npm run buckparts:fridge-buyer-path-batch-apply-plan-approval",
    );
    assert.ok(
      approvedOverride!.mutation_block_reasons.some((reason) =>
        reason.includes("UNKNOWN:no_dedicated_post_approval_apply_readiness_command"),
      ),
    );

    const proposalOverride = resolveFridgeBuyerPathBatchApplyPlanSteeringOverrideV1({
      applyPlanLane: proposalSteeringLaneFixture(),
      brainStopTheLine: false,
    });
    assert.ok(proposalOverride);
    assert.notEqual(approvedOverride!.next_move_command, proposalOverride!.next_move_command);
    assert.ok(proposalOverride!.next_best_action.includes("OWNER_REVIEW_READY"));
  });

  test("awaiting steering returns null when approval is owner_approved_for_next_planning_only", () => {
    const override = resolveFridgeBuyerPathBatchApplyPlanApprovalSteeringOverrideV1({
      approvalLane: approvalLaneFixture({ approval_status: "owner_approved_for_next_planning_only" }),
      applyPlanProposalLane: proposalLaneFixture(),
      brainStopTheLine: false,
    });
    assert.equal(override, null);
  });

  test("approved planning steering keeps all mutation flags false", () => {
    const override = resolveFridgeBuyerPathBatchApplyPlanApprovedPlanningSteeringOverrideV1({
      approvalLane: approvalLaneFixture({ approval_status: "owner_approved_for_next_planning_only" }),
      brainStopTheLine: false,
    });
    assert.ok(override);
    assert.ok(
      override!.mutation_block_reasons.every(
        (reason) => !reason.includes("owner_mutation_approved") && !reason.includes("apply_mutation_authorized=true"),
      ),
    );
    assert.ok(
      override!.mutation_block_reasons.some((reason) =>
        reason.includes("apply_mutation_authorized=false"),
      ),
    );
  });

  test("returns null on brain stop-the-line", () => {
    const awaitingOverride = resolveFridgeBuyerPathBatchApplyPlanApprovalSteeringOverrideV1({
      approvalLane: approvalLaneFixture(),
      applyPlanProposalLane: proposalLaneFixture(),
      brainStopTheLine: true,
    });
    const approvedOverride = resolveFridgeBuyerPathBatchApplyPlanApprovedPlanningSteeringOverrideV1({
      approvalLane: approvalLaneFixture({ approval_status: "owner_approved_for_next_planning_only" }),
      brainStopTheLine: true,
    });
    assert.equal(awaitingOverride, null);
    assert.equal(approvedOverride, null);
  });
});
