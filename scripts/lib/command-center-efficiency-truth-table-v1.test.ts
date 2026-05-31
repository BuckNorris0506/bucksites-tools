import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  buildCommandCenterEfficiencyTruthTableV1,
  COMMAND_CENTER_EFFICIENCY_TRUTH_TABLE_CONTRACT_V1,
  FRIDGE_BUYER_PATH_MICRO_LANE_KEYS_V1,
} from "./command-center-efficiency-truth-table-v1";

function mutationFalseLane(overrides: Record<string, unknown> = {}) {
  return {
    read_only: true,
    data_mutation: false,
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

function fridgeLaneFixtures() {
  const lanes: Record<string, Record<string, unknown>> = {};
  for (const key of FRIDGE_BUYER_PATH_MICRO_LANE_KEYS_V1) {
    lanes[key] = mutationFalseLane(
      key.includes("approval")
        ? { owner_approval_required: true }
        : key.includes("proposal")
          ? { owner_approval_required: true, plan_status: "READY_FOR_OWNER_REVIEW" }
          : {},
    );
  }
  lanes.fridge_buyer_path_batch_apply_plan_approval_v1 = mutationFalseLane({
    owner_approval_required: true,
    approval_status: "owner_approved_for_next_planning_only",
    plan_status: "READY_FOR_OWNER_REVIEW",
    owner_review_status: "OWNER_REVIEW_READY",
    planned_change_count: 14,
  });
  return lanes;
}

describe("command_center_efficiency_truth_table_v1", () => {
  test("lane is read-only with data_mutation and mutation_authorized false", () => {
    const table = buildCommandCenterEfficiencyTruthTableV1({
      now: () => new Date("2026-05-28T00:00:00.000Z"),
      lanes: fridgeLaneFixtures(),
    });
    assert.equal(table.contract, COMMAND_CENTER_EFFICIENCY_TRUTH_TABLE_CONTRACT_V1);
    assert.equal(table.read_only, true);
    assert.equal(table.data_mutation, false);
    assert.equal(table.mutation_authorized, false);
  });

  test("detects fridge buyer-path chain as consolidation candidate", () => {
    const table = buildCommandCenterEfficiencyTruthTableV1({
      now: () => new Date("2026-05-28T00:00:00.000Z"),
      lanes: fridgeLaneFixtures(),
    });
    const fridgeCandidate = table.consolidation_candidates.find(
      (candidate) => candidate.pattern_id === "fridge_buyer_path_micro_lane_chain",
    );
    assert.ok(fridgeCandidate);
    assert.equal(fridgeCandidate!.classification, "micro_lane_collapse");
    assert.ok(fridgeCandidate!.affected_lanes.length >= 5);
    assert.ok(
      fridgeCandidate!.affected_lanes.some((lane) =>
        lane.includes("fridge_buyer_path_batch_apply_plan_approval_v1"),
      ),
    );
  });

  test("detects repeated mutation-block flags and read-only approval repetition", () => {
    const table = buildCommandCenterEfficiencyTruthTableV1({
      now: () => new Date("2026-05-28T00:00:00.000Z"),
      lanes: fridgeLaneFixtures(),
    });
    assert.ok(table.repeated_gate_count >= 5);
    const mutationCandidate = table.consolidation_candidates.find(
      (candidate) => candidate.pattern_id === "repeated_mutation_false_flags",
    );
    assert.ok(mutationCandidate);
    const approvalCandidate = table.consolidation_candidates.find(
      (candidate) => candidate.pattern_id === "repeated_owner_approval_planning_only_gates",
    );
    assert.ok(approvalCandidate);
    assert.ok(table.duplicate_steering_count >= 2);
  });

  test("detects UNKNOWN post-approval apply-readiness command gap", () => {
    const table = buildCommandCenterEfficiencyTruthTableV1({
      now: () => new Date("2026-05-28T00:00:00.000Z"),
      lanes: fridgeLaneFixtures(),
      buckpartsScriptNames: ["buckparts:fridge-buyer-path-batch-apply-plan-approval"],
    });
    const unknownCandidate = table.consolidation_candidates.find(
      (candidate) => candidate.pattern_id === "unknown_post_approval_apply_readiness_command",
    );
    assert.ok(unknownCandidate);
    assert.equal(unknownCandidate!.classification, "unknown_next_command");
    assert.ok(
      table.unknown_facts.some((fact) => fact.includes("UNKNOWN: No dedicated post-approval apply-readiness")),
    );
  });

  test("recommended_next_action is diagnostic and does not imply mutation", () => {
    const table = buildCommandCenterEfficiencyTruthTableV1({
      now: () => new Date("2026-05-28T00:00:00.000Z"),
      lanes: fridgeLaneFixtures(),
    });
    assert.match(table.recommended_next_action, /^EFFICIENCY AUDIT \[/);
    assert.match(table.recommended_next_action, /Diagnostic only/i);
    assert.match(table.recommended_next_action, /authorize mutation|mutation unauthorized/i);
  });
});
