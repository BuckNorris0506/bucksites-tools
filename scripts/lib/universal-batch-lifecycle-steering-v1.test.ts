import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { resolveFridgeBuyerPathBatchApplyPlanApprovedPlanningSteeringOverrideV1 } from "./fridge-buyer-path-batch-apply-plan-approval-steering-v1";
import { resolveFridgeBuyerPathBatchApplyPlanSteeringOverrideV1 } from "./fridge-buyer-path-batch-apply-plan-steering-v1";
import { resolveBatchRunRegistryIntakeSteeringOverrideV1 } from "./batch-run-registry-intake-steering-v1";
import { buildUniversalBatchLifecycleTruthTableV1 } from "./universal-batch-lifecycle-truth-table-v1";
import {
  buildLifecycleOwnedMutatingBlockReasonsV1,
  refrigeratorWaterHasApplyReadinessUnknownLifecycleGapV1,
  resolveUniversalBatchLifecycleSteeringOverrideV1,
  shouldApplyUniversalBatchLifecycleSteeringV1,
  UNIVERSAL_BATCH_LIFECYCLE_APPLY_READINESS_UNKNOWN_STEERING_STATUS_V1,
  UNIVERSAL_BATCH_LIFECYCLE_APPLY_READINESS_READY_STEERING_STATUS_V1,
} from "./universal-batch-lifecycle-steering-v1";
import { UNIVERSAL_BATCH_LIFECYCLE_APPLY_EXECUTION_PLAN_SOURCE_COMMAND_V1 } from "./universal-batch-lifecycle-apply-execution-plan-v1";
import { UNIVERSAL_BATCH_LIFECYCLE_APPLY_READINESS_SOURCE_COMMAND_V1 } from "./universal-batch-lifecycle-apply-readiness-v1";
import { UNIVERSAL_BATCH_LIFECYCLE_MUTATION_AUTHORIZATION_REVIEW_SOURCE_COMMAND_V1 } from "./universal-batch-lifecycle-mutation-authorization-review-v1";
import { UNIVERSAL_BATCH_LIFECYCLE_GUARDED_CSV_APPLY_EXECUTOR_SOURCE_COMMAND_V1 } from "./universal-batch-lifecycle-guarded-csv-apply-executor-v1";
import {
  UNIVERSAL_BATCH_LIFECYCLE_GUARDED_CSV_APPLY_WRITE_MODE_NOT_IMPLEMENTED_REASON_V1,
  UNIVERSAL_BATCH_LIFECYCLE_MUTATION_AUTHORIZED_FOR_GUARDED_APPLY_STEERING_STATUS_V1,
} from "./universal-batch-lifecycle-steering-v1";

function lifecycleTableFixture() {
  return buildUniversalBatchLifecycleTruthTableV1({
    now: () => new Date("2026-05-28T00:00:00.000Z"),
    efficiency_truth_table: {
      consolidation_candidates: [],
      keep_as_truth_fields: [],
      remove_or_demote_candidates: [],
      unknown_facts: [],
      duplicate_steering_count: 3,
    },
    batch_run_registry_intake: {
      ap_run_registry_status: "PROVEN_CLOSED",
      ap_run_registry_rel_path:
        "data/air-purifier/batch-production/run-registry/ap-batch-v2-proven-run-v1.json",
      fridge_run_registry_status: "PROVEN_PLANNING_RUN_REGISTRY",
      fridge_approval_status: "owner_approved_for_next_planning_only",
      fridge_proposed_batch_id: "fridge-buyer-path-batch-v1-0fec4a7b623a",
      wedges: [
        {
          wedge: "air_purifier",
          run_registry_rel_path:
            "data/air-purifier/batch-production/run-registry/ap-batch-v2-proven-run-v1.json",
          run_registry_status: "PROVEN_CLOSED",
          closeout_complete: true,
          run_id: "ap-batch-v2-proven-run-v1",
        },
        {
          wedge: "refrigerator_water",
          run_registry_rel_path:
            "data/fridge/batch-production/run-registry/fridge-buyer-path-batch-run-v1-0fec4a7b623a.json",
          run_registry_status: "PROVEN_PLANNING_RUN_REGISTRY",
          closeout_complete: false,
          run_id: "fridge-buyer-path-batch-v1-0fec4a7b623a",
        },
      ],
    },
    fridge_apply_plan_proposal: {
      plan_status: "READY_FOR_OWNER_REVIEW",
      owner_review_status: "OWNER_REVIEW_READY",
      planned_change_count: 14,
    },
    fridge_apply_plan_approval: {
      approval_status: "owner_approved_for_next_planning_only",
      plan_status: "READY_FOR_OWNER_REVIEW",
      owner_review_status: "OWNER_REVIEW_READY",
      planned_change_count: 14,
    },
    buckpartsScriptNames: ["buckparts:fridge-buyer-path-batch-apply-plan-approval"],
  });
}

describe("universal batch lifecycle steering v1", () => {
  test("steers APPLY_READINESS_UNKNOWN for apply_plan_owner_approved with alternate apply_readiness_unknown", () => {
    const lifecycleTable = lifecycleTableFixture();
    const override = resolveUniversalBatchLifecycleSteeringOverrideV1({
      lifecycleTable,
      planned_change_count: 14,
      brainStopTheLine: false,
    });
    assert.ok(override);
    assert.ok(
      override!.next_best_action.startsWith(
        `LIFECYCLE [${UNIVERSAL_BATCH_LIFECYCLE_APPLY_READINESS_UNKNOWN_STEERING_STATUS_V1}]:`,
      ),
    );
    assert.match(override!.next_best_action, /owner-approved planning for 14 apply-plan changes/i);
    assert.match(override!.next_best_action, /apply readiness is not proven/i);
    assert.match(override!.next_best_action, /Mutation unauthorized/i);
    assert.equal(override!.next_move_command, UNIVERSAL_BATCH_LIFECYCLE_APPLY_READINESS_SOURCE_COMMAND_V1);
    assert.doesNotMatch(override!.next_move_command, /UNKNOWN:/);
    assert.doesNotMatch(override!.next_move_command, /batch-apply-plan-approval/);
    assert.ok(
      override!.mutation_block_reasons.some((reason) =>
        reason.includes("inherited_lifecycle_mutation_policy.mutation_allowed=false"),
      ),
    );
  });

  test("lifecycle steering beats apply-plan approved-planning micro-lane steering", () => {
    const lifecycleTable = lifecycleTableFixture();
    const lifecycleOverride = resolveUniversalBatchLifecycleSteeringOverrideV1({
      lifecycleTable,
      planned_change_count: 14,
      brainStopTheLine: false,
    });
    const microOverride = resolveFridgeBuyerPathBatchApplyPlanApprovedPlanningSteeringOverrideV1({
      approvalLane: {
        approval_status: "owner_approved_for_next_planning_only",
        plan_status: "READY_FOR_OWNER_REVIEW",
        owner_review_status: "OWNER_REVIEW_READY",
        planned_change_count: 14,
        source_apply_plan_artifact_rel_path:
          "data/fridge/batch-production/apply-plans/fridge-buyer-path-batch-apply-plan-v1-0fec4a7b623a.json",
        recommended_next_action: "Review.",
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
    assert.ok(lifecycleOverride);
    assert.ok(microOverride);
    assert.ok(lifecycleOverride!.next_best_action.startsWith("LIFECYCLE ["));
    assert.ok(microOverride!.next_best_action.startsWith("BATCH APPLY-PLAN ["));
    assert.notEqual(lifecycleOverride!.next_move_command, microOverride!.next_move_command);
  });

  test("lifecycle steering beats apply-plan proposal and run-registry micro-lane steering", () => {
    const lifecycleTable = lifecycleTableFixture();
    const lifecycleOverride = resolveUniversalBatchLifecycleSteeringOverrideV1({
      lifecycleTable,
      planned_change_count: 14,
      brainStopTheLine: false,
    });
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
    const registryOverride = resolveBatchRunRegistryIntakeSteeringOverrideV1({
      intake: {
        wedges: [
          {
            wedge: "refrigerator_water",
            run_registry_rel_path:
              "data/fridge/batch-production/run-registry/fridge-buyer-path-batch-run-v1-0fec4a7b623a.json",
            run_registry_status: "PROVEN_PLANNING_RUN_REGISTRY",
            closeout_complete: false,
            run_id: "fridge-buyer-path-batch-v1-0fec4a7b623a",
          },
        ],
        mutation_authorized: false,
        recommended_next_action: "Continue intake.",
        ap_run_registry_status: "PROVEN_CLOSED",
      },
      dispatch: {
        dispatch_status: "CLOSED_BATCH",
        selected_subsystem: "batch_production_operating_checklist_v1",
        exact_command: "npm run buckparts:batch-production-operating-checklist",
      } as never,
      brainStopTheLine: false,
    });
    assert.ok(lifecycleOverride);
    assert.ok(proposalOverride);
    assert.ok(registryOverride);
    assert.ok(lifecycleOverride!.next_best_action.startsWith("LIFECYCLE ["));
  });

  test("steers APPLY_READINESS_READY when lifecycle table reports apply_readiness_ready", () => {
    const lifecycleTable = buildUniversalBatchLifecycleTruthTableV1({
      now: () => new Date("2026-05-28T00:00:00.000Z"),
      efficiency_truth_table: {
        consolidation_candidates: [],
        keep_as_truth_fields: [],
        remove_or_demote_candidates: [],
        unknown_facts: [],
        duplicate_steering_count: 3,
      },
      batch_run_registry_intake: {
        ap_run_registry_status: "PROVEN_CLOSED",
        fridge_run_registry_status: "PROVEN_PLANNING_RUN_REGISTRY",
        wedges: [
          {
            wedge: "refrigerator_water",
            run_registry_status: "PROVEN_PLANNING_RUN_REGISTRY",
          },
        ],
      } as never,
      fridge_apply_plan_approval: {
        approval_status: "owner_approved_for_next_planning_only",
      },
      apply_readiness: {
        apply_readiness_status: "PROVEN",
        apply_readiness_blockers: [],
        source_command: UNIVERSAL_BATCH_LIFECYCLE_APPLY_READINESS_SOURCE_COMMAND_V1,
      },
      buckpartsScriptNames: ["buckparts:universal-batch-lifecycle-apply-readiness"],
    });
    const override = resolveUniversalBatchLifecycleSteeringOverrideV1({
      lifecycleTable,
      planned_change_count: 14,
      brainStopTheLine: false,
      applyReadiness: {
        apply_readiness_status: "PROVEN",
        apply_readiness_blockers: [],
        source_command: UNIVERSAL_BATCH_LIFECYCLE_APPLY_READINESS_SOURCE_COMMAND_V1,
      },
      applyExecutionPlan: {
        execution_plan_status: "READY_FOR_MUTATION_AUTH_REVIEW",
        source_command: UNIVERSAL_BATCH_LIFECYCLE_APPLY_EXECUTION_PLAN_SOURCE_COMMAND_V1,
        planned_change_count: 14,
      },
    });
    assert.ok(override);
    assert.ok(
      override!.next_best_action.startsWith(
        `LIFECYCLE [${UNIVERSAL_BATCH_LIFECYCLE_APPLY_READINESS_READY_STEERING_STATUS_V1}]:`,
      ),
    );
    assert.match(override!.next_best_action, /execution plan is READY_FOR_MUTATION_AUTH_REVIEW/i);
    assert.equal(override!.next_move_command, UNIVERSAL_BATCH_LIFECYCLE_APPLY_EXECUTION_PLAN_SOURCE_COMMAND_V1);
  });

  test("steers mutation-authorization review command when execution plan ready but authorization review blocked", () => {
    const lifecycleTable = lifecycleTableFixture();
    const override = resolveUniversalBatchLifecycleSteeringOverrideV1({
      lifecycleTable,
      planned_change_count: 14,
      brainStopTheLine: false,
      applyReadiness: {
        apply_readiness_status: "PROVEN",
        apply_readiness_blockers: [],
        source_command: UNIVERSAL_BATCH_LIFECYCLE_APPLY_READINESS_SOURCE_COMMAND_V1,
      },
      applyExecutionPlan: {
        execution_plan_status: "READY_FOR_MUTATION_AUTH_REVIEW",
        source_command: UNIVERSAL_BATCH_LIFECYCLE_APPLY_EXECUTION_PLAN_SOURCE_COMMAND_V1,
        planned_change_count: 14,
      },
      mutationAuthorizationReview: {
        mutation_authorization_review_status: "BLOCKED",
        source_command: UNIVERSAL_BATCH_LIFECYCLE_MUTATION_AUTHORIZATION_REVIEW_SOURCE_COMMAND_V1,
        review_blockers: [
          "missing_active_owner_mutation_approval: source_decision_packet_id=universal_batch_lifecycle_mutation_authorization_review_v1:data/fridge/batch-production/apply-execution-plans/fridge-buyer-path-batch-apply-execution-plan-v1-0fec4a7b623a.json",
        ],
        apply_executor_ready: false,
        mutation_authorized: false,
      },
    });
    assert.ok(override);
    assert.equal(
      override!.next_move_command,
      UNIVERSAL_BATCH_LIFECYCLE_MUTATION_AUTHORIZATION_REVIEW_SOURCE_COMMAND_V1,
    );
    assert.match(override!.next_best_action, /authorization review is still BLOCKED/i);
    assert.ok(
      override!.mutation_block_reasons.some((reason) =>
        reason.startsWith("mutation_authorization_review_v1:missing_active_owner_mutation_approval:"),
      ),
    );
    assert.ok(
      override!.mutation_block_reasons.includes("mutation_authorization_review_v1:apply_executor_ready=false"),
    );
    assert.doesNotMatch(
      override!.mutation_block_reasons.join("\n"),
      /fridge_buyer_path_batch_apply_plan/,
    );
  });

  test("steers guarded CSV apply executor DRY_RUN when mutation authorization is granted", () => {
    const lifecycleTable = lifecycleTableFixture();
    const override = resolveUniversalBatchLifecycleSteeringOverrideV1({
      lifecycleTable,
      planned_change_count: 14,
      brainStopTheLine: false,
      applyReadiness: {
        apply_readiness_status: "PROVEN",
        apply_readiness_blockers: [],
        source_command: UNIVERSAL_BATCH_LIFECYCLE_APPLY_READINESS_SOURCE_COMMAND_V1,
      },
      applyExecutionPlan: {
        execution_plan_status: "READY_FOR_MUTATION_AUTH_REVIEW",
        source_command: UNIVERSAL_BATCH_LIFECYCLE_APPLY_EXECUTION_PLAN_SOURCE_COMMAND_V1,
        planned_change_count: 14,
      },
      mutationAuthorizationReview: {
        mutation_authorization_review_status: "MUTATION_AUTHORIZED_FOR_GUARDED_APPLY",
        source_command: UNIVERSAL_BATCH_LIFECYCLE_MUTATION_AUTHORIZATION_REVIEW_SOURCE_COMMAND_V1,
        review_blockers: [],
        apply_executor_ready: true,
        mutation_authorized: true,
        csv_apply_authorized: true,
      },
    });
    assert.ok(override);
    assert.equal(
      override!.next_move_command,
      UNIVERSAL_BATCH_LIFECYCLE_GUARDED_CSV_APPLY_EXECUTOR_SOURCE_COMMAND_V1,
    );
    assert.ok(
      override!.next_best_action.startsWith(
        `LIFECYCLE [${UNIVERSAL_BATCH_LIFECYCLE_MUTATION_AUTHORIZED_FOR_GUARDED_APPLY_STEERING_STATUS_V1}]:`,
      ),
    );
    assert.doesNotMatch(override!.next_best_action, /owner mutation approval still required/i);
    assert.match(override!.next_best_action, /owner_mutation_approved row is active/i);
    assert.match(override!.next_best_action, /No CSV mutation applied/i);
    assert.ok(
      override!.mutation_block_reasons.includes(
        UNIVERSAL_BATCH_LIFECYCLE_GUARDED_CSV_APPLY_WRITE_MODE_NOT_IMPLEMENTED_REASON_V1,
      ),
    );
    assert.ok(
      !override!.mutation_block_reasons.some((reason) =>
        reason.startsWith("mutation_authorization_review_v1:missing_active_owner_mutation_approval:"),
      ),
    );
  });

  test("buildLifecycleOwnedMutatingBlockReasonsV1 excludes micro-lane mutation reasons", () => {
    const lifecycleTable = lifecycleTableFixture();
    const reasons = buildLifecycleOwnedMutatingBlockReasonsV1({
      lifecycleTable,
      mutationAuthorizationReview: {
        mutation_authorization_review_status: "BLOCKED",
        review_blockers: ["missing_active_owner_mutation_approval: source_decision_packet_id=test"],
        apply_executor_ready: false,
        mutation_authorized: false,
      },
    });
    assert.ok(
      reasons.some((reason) =>
        reason.startsWith("universal_batch_lifecycle_truth_table_v1:mutation_authorized=false"),
      ),
    );
    assert.ok(
      reasons.some((reason) =>
        reason.startsWith("mutation_authorization_review_v1:missing_active_owner_mutation_approval:"),
      ),
    );
    assert.ok(reasons.includes("mutation_authorization_review_v1:apply_executor_ready=false"));
    assert.doesNotMatch(reasons.join("\n"), /fridge_buyer_path_batch_apply_plan/);
  });

  test("returns null on brain stop-the-line", () => {
    const override = resolveUniversalBatchLifecycleSteeringOverrideV1({
      lifecycleTable: lifecycleTableFixture(),
      planned_change_count: 14,
      brainStopTheLine: true,
    });
    assert.equal(override, null);
  });

  test("shouldApplyUniversalBatchLifecycleSteeringV1 when lifecycle override exists", () => {
    const lifecycleTable = lifecycleTableFixture();
    const lifecycleOverride = resolveUniversalBatchLifecycleSteeringOverrideV1({
      lifecycleTable,
      planned_change_count: 14,
      brainStopTheLine: false,
    });
    assert.equal(
      shouldApplyUniversalBatchLifecycleSteeringV1({
        lifecycleOverride: null,
      }),
      false,
    );
    assert.equal(
      shouldApplyUniversalBatchLifecycleSteeringV1({
        lifecycleOverride,
      }),
      true,
    );
    assert.equal(
      shouldApplyUniversalBatchLifecycleSteeringV1({
        lifecycleOverride,
        demotableMicroLaneSteeringActive: false,
      }),
      true,
    );
  });
});
