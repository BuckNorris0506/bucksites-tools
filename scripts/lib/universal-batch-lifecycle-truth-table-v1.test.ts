import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, test } from "node:test";

import {
  buildUniversalBatchLifecycleTruthTableV1,
  REDUNDANT_FRIDGE_MICRO_LANES_TO_FOLD_V1,
  UNIVERSAL_BATCH_LIFECYCLE_STATE_DEFS_V1,
  UNIVERSAL_BATCH_LIFECYCLE_TRUTH_TABLE_CONTRACT_V1,
} from "./universal-batch-lifecycle-truth-table-v1";

function baseEfficiencyInput() {
  return {
    consolidation_candidates: [],
    keep_as_truth_fields: ["approval_status", "plan_status"],
    remove_or_demote_candidates: ["Repeated mutation=false flag blocks on every batch sub-lane"],
    unknown_facts: [
      "UNKNOWN: package.json has no buckparts:* post-approval apply-readiness command.",
    ],
    duplicate_steering_count: 3,
  };
}

function fridgeApprovedFixtures() {
  return {
    efficiency_truth_table: baseEfficiencyInput(),
    batch_run_registry_intake: {
      ap_run_registry_status: "PROVEN_CLOSED" as const,
      ap_run_registry_rel_path:
        "data/air-purifier/batch-production/run-registry/ap-batch-v2-proven-run-v1.json",
      fridge_run_registry_status: "PROVEN_PLANNING_RUN_REGISTRY" as const,
      fridge_approval_status: "owner_approved_for_next_planning_only" as const,
      fridge_proposed_batch_id: "fridge-buyer-path-batch-v1-0fec4a7b623a",
      wedges: [
        {
          wedge: "air_purifier" as const,
          run_registry_rel_path:
            "data/air-purifier/batch-production/run-registry/ap-batch-v2-proven-run-v1.json",
          run_registry_status: "PROVEN_CLOSED" as const,
          closeout_complete: true,
          run_id: "ap-batch-v2-proven-run-v1",
        },
        {
          wedge: "refrigerator_water" as const,
          run_registry_rel_path:
            "data/fridge/batch-production/run-registry/fridge-buyer-path-batch-run-v1-0fec4a7b623a.json",
          run_registry_status: "PROVEN_PLANNING_RUN_REGISTRY" as const,
          closeout_complete: false,
          run_id: "fridge-buyer-path-batch-v1-0fec4a7b623a",
        },
      ],
    },
    fridge_apply_plan_proposal: {
      plan_status: "READY_FOR_OWNER_REVIEW",
      owner_review_status: "OWNER_REVIEW_READY",
      plan_artifact_rel_path:
        "data/fridge/batch-production/apply-plans/fridge-buyer-path-batch-apply-plan-v1-0fec4a7b623a.json",
      planned_change_count: 14,
    },
    fridge_apply_plan_approval: {
      approval_status: "owner_approved_for_next_planning_only",
      plan_status: "READY_FOR_OWNER_REVIEW",
      owner_review_status: "OWNER_REVIEW_READY",
      source_apply_plan_artifact_rel_path:
        "data/fridge/batch-production/apply-plans/fridge-buyer-path-batch-apply-plan-v1-0fec4a7b623a.json",
      planned_change_count: 14,
    },
    command_center_steering: {
      next_best_action: "BATCH APPLY-PLAN [APPROVED_FOR_PLANNING]: ...",
      next_move_command: "npm run buckparts:fridge-buyer-path-batch-apply-plan-approval",
    },
    buckpartsScriptNames: ["buckparts:fridge-buyer-path-batch-apply-plan-approval"],
  };
}

describe("universal_batch_lifecycle_truth_table_v1", () => {
  test("lane is read-only and mutation_authorized false", () => {
    const table = buildUniversalBatchLifecycleTruthTableV1({
      now: () => new Date("2026-05-28T00:00:00.000Z"),
      ...fridgeApprovedFixtures(),
    });
    assert.equal(table.contract, UNIVERSAL_BATCH_LIFECYCLE_TRUTH_TABLE_CONTRACT_V1);
    assert.equal(table.read_only, true);
    assert.equal(table.data_mutation, false);
    assert.equal(table.mutation_authorized, false);
    assert.equal(table.inherited_lifecycle_mutation_policy.mutation_allowed, false);
  });

  test("defines all 12 required lifecycle states", () => {
    assert.equal(UNIVERSAL_BATCH_LIFECYCLE_STATE_DEFS_V1.length, 12);
    assert.ok(
      UNIVERSAL_BATCH_LIFECYCLE_STATE_DEFS_V1.every(
        (state) =>
          state.purpose.length > 0 &&
          typeof state.mutation_allowed === "boolean" &&
          typeof state.owner_required === "boolean" &&
          typeof state.evidence_required === "boolean",
      ),
    );
  });

  test("refrigerator_water maps to apply_plan_owner_approved with apply_readiness_unknown gap when readiness not proven", () => {
    const table = buildUniversalBatchLifecycleTruthTableV1({
      now: () => new Date("2026-05-28T00:00:00.000Z"),
      ...fridgeApprovedFixtures(),
      apply_readiness: {
        apply_readiness_status: "BLOCKED",
        apply_readiness_blockers: ["amazon_affiliate_tags_present: missing tags"],
        source_command: "npm run buckparts:universal-batch-lifecycle-apply-readiness",
      },
      buckpartsScriptNames: [
        "buckparts:fridge-buyer-path-batch-apply-plan-approval",
        "buckparts:universal-batch-lifecycle-apply-readiness",
      ],
    });
    const fridge = table.current_wedge_states.find((row) => row.wedge === "refrigerator_water");
    assert.ok(fridge);
    assert.equal(fridge!.lifecycle_state, "apply_plan_owner_approved");
    assert.ok(fridge!.alternate_lifecycle_states.includes("apply_readiness_unknown"));
    assert.equal(fridge!.mutation_allowed, false);
    assert.equal(table.one_true_next_state_for_refrigerator_water, "apply_readiness_unknown");
    assert.equal(
      table.one_true_next_command_for_refrigerator_water,
      "npm run buckparts:universal-batch-lifecycle-apply-readiness",
    );
    assert.ok(
      table.unknowns_blocking_mutation.some((item) => item.includes("apply_readiness")),
    );
  });

  test("refrigerator_water maps to apply_readiness_ready when discovery is PROVEN", () => {
    const table = buildUniversalBatchLifecycleTruthTableV1({
      now: () => new Date("2026-05-28T00:00:00.000Z"),
      ...fridgeApprovedFixtures(),
      apply_readiness: {
        apply_readiness_status: "PROVEN",
        apply_readiness_blockers: [],
        source_command: "npm run buckparts:universal-batch-lifecycle-apply-readiness",
      },
      buckpartsScriptNames: ["buckparts:universal-batch-lifecycle-apply-readiness"],
    });
    const fridge = table.current_wedge_states.find((row) => row.wedge === "refrigerator_water");
    assert.ok(fridge);
    assert.equal(fridge!.lifecycle_state, "apply_readiness_ready");
    assert.equal(table.one_true_next_state_for_refrigerator_water, "apply_readiness_ready");
  });

  test("air_purifier maps to closed from proven closed run registry", () => {
    const table = buildUniversalBatchLifecycleTruthTableV1({
      now: () => new Date("2026-05-28T00:00:00.000Z"),
      ...fridgeApprovedFixtures(),
    });
    const ap = table.current_wedge_states.find((row) => row.wedge === "air_purifier");
    assert.ok(ap);
    assert.equal(ap!.lifecycle_state, "closed");
    assert.equal(ap!.mutation_allowed, false);
  });

  test("lists fridge micro-lanes under redundant_lanes_to_fold", () => {
    const table = buildUniversalBatchLifecycleTruthTableV1({
      now: () => new Date("2026-05-28T00:00:00.000Z"),
      ...fridgeApprovedFixtures(),
    });
    for (const lane of REDUNDANT_FRIDGE_MICRO_LANES_TO_FOLD_V1) {
      assert.ok(table.redundant_lanes_to_fold.includes(lane));
    }
    assert.ok(
      table.redundant_lanes_to_fold.includes("command_center_v2.fridge_buyer_path_batch_apply_plan_approval_v1"),
    );
  });

  test("collapses repeated mutation flags into inherited lifecycle policy", () => {
    const table = buildUniversalBatchLifecycleTruthTableV1({
      now: () => new Date("2026-05-28T00:00:00.000Z"),
      ...fridgeApprovedFixtures(),
    });
    assert.equal(table.inherited_lifecycle_mutation_policy.mutation_allowed, false);
    assert.equal(table.inherited_lifecycle_mutation_policy.csv_apply_authorized, false);
    assert.equal(table.inherited_lifecycle_mutation_policy.evidence_write_authorized, false);
    assert.ok(
      table.lanes_to_keep_as_fields.includes("inherited_lifecycle_mutation_policy.mutation_allowed"),
    );
    assert.ok(
      table.owner_steps_to_remove_or_demote.some((step) => step.includes("batch-apply-plan-proposal")),
    );
  });

  test("lib has no forbidden imports or write patterns", () => {
    const source = readFileSync(
      new URL("./universal-batch-lifecycle-truth-table-v1.ts", import.meta.url),
      "utf8",
    );
    const importLines = source
      .split("\n")
      .filter((line) => line.startsWith("import ") || line.includes('from "'));
    const importBlock = importLines.join("\n");
    assert.doesNotMatch(importBlock, /node:fs/);
    assert.doesNotMatch(importBlock, /supabase/i);
    assert.doesNotMatch(importBlock, /netlify/i);
    assert.doesNotMatch(source, /writeFileSync|writeFile\(|createWriteStream/);
    assert.doesNotMatch(source, /insertLearningOutcome/);
  });
});
