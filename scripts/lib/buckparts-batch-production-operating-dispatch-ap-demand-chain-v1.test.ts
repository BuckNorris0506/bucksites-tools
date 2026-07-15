import assert from "node:assert/strict";
import test from "node:test";

import { AIR_PURIFIER_DEMAND_SELECTED_BATCH_OWNER_REVIEW_EXACT_COMMAND_V1 } from "./air-purifier-demand-selected-batch-owner-review-v1";
import { AP_DEMAND_SELECTED_BATCH_CLOSEOUT_READINESS_PROOF_EXACT_COMMAND_V1 } from "./ap-demand-selected-batch-closeout-readiness-proof-v1";
import {
  buildBatchProductionOperatingDispatchV1,
  type BatchProductionOperatingDispatchV1,
} from "./buckparts-batch-production-operating-dispatch-v1";
import type { BatchProductionOperatingChecklistV1 } from "./buckparts-batch-production-operating-checklist-v1";
import { BATCH_PRODUCTION_DEMAND_TO_COVERAGE_NEXT_LANE_COMMAND_V1 } from "./buckparts-batch-production-operating-checklist-v1";

function growthChecklistFixture(
  overrides: Partial<BatchProductionOperatingChecklistV1> = {},
): BatchProductionOperatingChecklistV1 {
  const stages = [
    {
      stage_id: "supabase_parity_applied" as const,
      status: "complete" as const,
      blocker_reasons: [] as string[],
      proof_paths: [] as string[],
      owner_action_required: false,
      next_exact_command: "x",
    },
    {
      stage_id: "production_runtime_smoke_complete" as const,
      status: "complete" as const,
      blocker_reasons: [] as string[],
      proof_paths: [] as string[],
      owner_action_required: false,
      next_exact_command: "x",
    },
    {
      stage_id: "closeout_complete" as const,
      status: "complete" as const,
      blocker_reasons: [] as string[],
      proof_paths: [] as string[],
      owner_action_required: false,
      next_exact_command: "x",
    },
  ];
  return {
    contract: "batch_production_operating_checklist_v1",
    read_only: true,
    data_mutation: false,
    generated_at: "2026-07-15T00:00:00.000Z",
    runtime_status: "OK",
    active_run_id: "ap-fixture-run",
    runs: [
      {
        run_id: "ap-fixture-run",
        wedge: "air_purifier",
        stages: stages as BatchProductionOperatingChecklistV1["stages"],
      },
    ],
    stages: stages as BatchProductionOperatingChecklistV1["stages"],
    operating_decision: {
      current_stage: null,
      blocking_reasons: [],
      owner_action_required: false,
      next_owner_action: "growth",
      next_exact_command: BATCH_PRODUCTION_DEMAND_TO_COVERAGE_NEXT_LANE_COMMAND_V1,
      proof_required_before_next_stage: "x",
    },
    expansion_readiness: {
      ready_to_add_products_or_wedges: true,
      blockers: [],
    },
    spent_plan_closeout: {
      classification: "SPENT_CLOSED_SUCCESS",
      reasons: [],
    },
    setbacks: { fired: [] },
    ...overrides,
  } as BatchProductionOperatingChecklistV1;
}

test("demand selection chains to AP demand-selected owner-review when open batch is PROVEN but evidence incomplete", () => {
  const dispatch = buildBatchProductionOperatingDispatchV1(growthChecklistFixture(), {
    ap_demand_selected_batch_owner_review: {
      read_only: true,
      data_mutation: false,
      csv_apply_authorized: false,
      supabase_mutation_authorized: false,
      source_recommendation_status: "START_NEW_DEMAND_SELECTED_BATCH",
      recommended_wedge: "air_purifier",
      open_batch_proof_v1: {
        open_batch_existence: "PROVEN",
        batch_closeout: "NOT_PROVEN",
        apply_readiness: "NOT_PROVEN",
      },
      evidence_completeness_v1: { status: "INCOMPLETE" },
      batch_run_registry: { stage: "evidence_collection_planned" },
    },
  });

  assert.equal(dispatch.selected_subsystem, "air_purifier_demand_selected_batch_owner_review");
  assert.equal(dispatch.dispatch_status, "READY");
  assert.equal(dispatch.command_surface, "terminal");
  assert.equal(dispatch.mutation_allowed, false);
  assert.equal(dispatch.exact_command, AIR_PURIFIER_DEMAND_SELECTED_BATCH_OWNER_REVIEW_EXACT_COMMAND_V1);
  assert.match(dispatch.why_this_is_next, /owner-review/i);
  assert.match(dispatch.proof_required_before_execution, /Hard-stop/i);
});

test("complete evidence chains to closeout/readiness proof instead of discovery/owner-review", () => {
  const dispatch = buildBatchProductionOperatingDispatchV1(growthChecklistFixture(), {
    ap_demand_selected_batch_owner_review: {
      read_only: true,
      data_mutation: false,
      csv_apply_authorized: false,
      supabase_mutation_authorized: false,
      source_recommendation_status: "START_NEW_DEMAND_SELECTED_BATCH",
      recommended_wedge: "air_purifier",
      open_batch_proof_v1: {
        open_batch_existence: "PROVEN",
        batch_closeout: "NOT_PROVEN",
        apply_readiness: "NOT_PROVEN",
      },
      evidence_completeness_v1: { status: "COMPLETE" },
      batch_run_registry: { stage: "read_only_evidence_collection_complete" },
    },
  });

  assert.equal(
    dispatch.selected_subsystem,
    "air_purifier_demand_selected_batch_closeout_readiness_proof",
  );
  assert.equal(dispatch.command_surface, "terminal");
  assert.equal(dispatch.mutation_allowed, false);
  assert.equal(dispatch.exact_command, AP_DEMAND_SELECTED_BATCH_CLOSEOUT_READINESS_PROOF_EXACT_COMMAND_V1);
  assert.match(dispatch.why_this_is_next, /closeout\/apply-readiness proof/i);
  assert.match(dispatch.why_this_is_next, /not HyperAgent discovery again/i);
});

test("without open-batch proof, growth path keeps demand_to_coverage terminal command", () => {
  const dispatch: BatchProductionOperatingDispatchV1 = buildBatchProductionOperatingDispatchV1(
    growthChecklistFixture(),
    {
      ap_demand_selected_batch_owner_review: {
        read_only: true,
        data_mutation: false,
        csv_apply_authorized: false,
        supabase_mutation_authorized: false,
        source_recommendation_status: "START_NEW_DEMAND_SELECTED_BATCH",
        recommended_wedge: "air_purifier",
        open_batch_proof_v1: {
          open_batch_existence: "NOT_PROVEN",
          batch_closeout: "NOT_PROVEN",
          apply_readiness: "NOT_PROVEN",
        },
      },
    },
  );

  assert.equal(dispatch.selected_subsystem, "demand_to_coverage_next_lane");
  assert.equal(dispatch.command_surface, "terminal");
  assert.equal(dispatch.exact_command, BATCH_PRODUCTION_DEMAND_TO_COVERAGE_NEXT_LANE_COMMAND_V1);
});
