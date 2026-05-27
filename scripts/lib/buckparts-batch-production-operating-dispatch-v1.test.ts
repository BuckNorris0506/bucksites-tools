import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  BATCH_PRODUCTION_CHECKLIST_STAGE_IDS_V1,
  BATCH_PRODUCTION_PARITY_DRY_RUN_COMMAND_V1,
  buildBatchProductionOperatingChecklistV1,
} from "./buckparts-batch-production-operating-checklist-v1";
import {
  AP_BATCH_V3_PACKETS_DIR_REL_V1,
  AP_BATCH_V3_REGISTRY_REL_V1,
  AP_BATCH_V3_RUN_INSTANTIATION_COMMAND_V1,
  buildApBatchV3RunInstantiationV1Report,
} from "./ap-batch-v3-run-instantiation-v1";
import { buildDemandToCoverageNextLaneV1Report } from "./demand-to-coverage-next-lane-v1";
import {
  BATCH_PRODUCTION_OPERATING_DISPATCH_CONTRACT_V1,
  buildBatchProductionOperatingDispatchV1,
  resolveBatchProductionDispatchDirectorOverrideV1,
} from "./buckparts-batch-production-operating-dispatch-v1";

const REPO_ROOT = process.cwd();

test("dispatch is derived from checklist operating_decision and stages", () => {
  const checklist = buildBatchProductionOperatingChecklistV1({ rootDir: REPO_ROOT });
  const dispatch = buildBatchProductionOperatingDispatchV1(checklist);
  assert.equal(dispatch.contract, BATCH_PRODUCTION_OPERATING_DISPATCH_CONTRACT_V1);
  assert.equal(dispatch.read_only, true);
  assert.equal(dispatch.data_mutation, false);
  assert.equal(dispatch.derived_from_checklist_contract, checklist.contract);
  assert.equal(dispatch.current_stage_id, checklist.operating_decision.current_stage);
  assert.equal(dispatch.mutation_allowed, false);
  assert.equal(dispatch.exact_command.length > 0, true);
});

test("parity UNKNOWN uses READY read-only proof dispatch and blocks expansion", () => {
  const checklist = buildBatchProductionOperatingChecklistV1({
    rootDir: REPO_ROOT,
    ingest_dispatch_run_parity_proof: false,
  });
  const parityStage = checklist.stages.find((s) => s.stage_id === "supabase_parity_applied");
  assert.equal(parityStage?.status, "unknown");
  assert.equal(checklist.operating_decision.current_stage, "supabase_parity_applied");

  const dispatch = buildBatchProductionOperatingDispatchV1(checklist);
  assert.equal(dispatch.selected_subsystem, "supabase_parity_apply_proof");
  assert.equal(dispatch.dispatch_status, "READY");
  assert.equal(dispatch.command_surface, "terminal");
  assert.equal(dispatch.mutation_allowed, false);
  assert.equal(dispatch.exact_command, BATCH_PRODUCTION_PARITY_DRY_RUN_COMMAND_V1);
  assert.equal(dispatch.exact_command.includes("--apply"), false);
  assert.equal(dispatch.expansion_blocked, true);
  assert.ok(dispatch.forbidden_mutations.includes("add_products_or_wedges"));
});

test("runtime smoke incomplete blocks expansion when parity is complete", () => {
  const checklist = buildBatchProductionOperatingChecklistV1({ rootDir: REPO_ROOT });
  const stages = checklist.stages.map((s) => {
    if (s.stage_id === "supabase_parity_applied") {
      return { ...s, status: "complete" as const, blocker_reasons: [] };
    }
    if (s.stage_id === "production_runtime_smoke_complete") {
      return { ...s, status: "unknown" as const };
    }
    return s;
  });
  const synthetic = {
    ...checklist,
    stages,
    runs: checklist.runs.map((r) => ({ ...r, stages })),
    operating_decision: {
      ...checklist.operating_decision,
      current_stage: "production_runtime_smoke_complete" as const,
    },
    runtime_status: "ATTENTION" as const,
  };
  const dispatch = buildBatchProductionOperatingDispatchV1(synthetic);
  assert.equal(dispatch.selected_subsystem, "production_runtime_smoke_proof");
  assert.equal(dispatch.expansion_blocked, true);
  assert.ok(dispatch.forbidden_mutations.includes("open_new_batch_lane"));
});

test("dispatch director override surfaces BATCH DISPATCH next action when blocked", () => {
  const checklist = buildBatchProductionOperatingChecklistV1({
    rootDir: REPO_ROOT,
    ingest_dispatch_run_parity_proof: false,
  });
  const dispatch = buildBatchProductionOperatingDispatchV1(checklist);
  const override = resolveBatchProductionDispatchDirectorOverrideV1({
    dispatch,
    brainStopTheLine: false,
  });
  assert.ok(override);
  assert.ok(override.next_best_action.startsWith("BATCH DISPATCH ["));
  assert.equal(override.next_move_command, dispatch.exact_command);
});

test("dispatch moves to ap-batch-v3 run instantiation when closed batch proof is complete", async () => {
  const demand = await buildDemandToCoverageNextLaneV1Report({ rootDir: REPO_ROOT });
  const checklist = buildBatchProductionOperatingChecklistV1({ rootDir: REPO_ROOT });
  assert.equal(checklist.spent_plan_closeout.classification, "SPENT_CLOSED_SUCCESS");
  const instantiation = await buildApBatchV3RunInstantiationV1Report({
    rootDir: REPO_ROOT,
    demandToCoverageNextLane: demand,
    checklist,
  });
  const dispatch = buildBatchProductionOperatingDispatchV1(checklist, {
    ap_batch_v3_run_instantiation: instantiation,
  });
  assert.equal(dispatch.selected_subsystem, "ap_batch_v3_run_instantiation");
  assert.equal(dispatch.dispatch_status, "READY");
  assert.equal(dispatch.exact_command, AP_BATCH_V3_RUN_INSTANTIATION_COMMAND_V1);
  assert.equal(dispatch.expansion_blocked, false);
  assert.equal(dispatch.current_stage_id, null);
});

test("ap-batch-v3 dispatch expected_artifact_paths match on-disk layout", async () => {
  const demand = await buildDemandToCoverageNextLaneV1Report({ rootDir: REPO_ROOT });
  const checklist = buildBatchProductionOperatingChecklistV1({ rootDir: REPO_ROOT });
  const instantiation = await buildApBatchV3RunInstantiationV1Report({
    rootDir: REPO_ROOT,
    demandToCoverageNextLane: demand,
    checklist,
  });
  const dispatch = buildBatchProductionOperatingDispatchV1(checklist, {
    ap_batch_v3_run_instantiation: instantiation,
  });
  assert.deepEqual(dispatch.expected_artifact_paths, [
    AP_BATCH_V3_REGISTRY_REL_V1,
    AP_BATCH_V3_PACKETS_DIR_REL_V1,
  ]);
  assert.ok(existsSync(path.join(REPO_ROOT, AP_BATCH_V3_REGISTRY_REL_V1)));
  assert.ok(existsSync(path.join(REPO_ROOT, AP_BATCH_V3_PACKETS_DIR_REL_V1)));
});

test("dispatch builder does not mutate product CSV", () => {
  const before = readFileSync(`${REPO_ROOT}/data/air-purifier/retailer_links.csv`, "utf8");
  buildBatchProductionOperatingDispatchV1(
    buildBatchProductionOperatingChecklistV1({ rootDir: REPO_ROOT }),
  );
  const after = readFileSync(`${REPO_ROOT}/data/air-purifier/retailer_links.csv`, "utf8");
  assert.equal(before, after);
});

test("dispatch stage ids align with checklist stage order", () => {
  const checklist = buildBatchProductionOperatingChecklistV1({ rootDir: REPO_ROOT });
  const dispatch = buildBatchProductionOperatingDispatchV1(checklist);
  if (dispatch.current_stage_id) {
    const idx = BATCH_PRODUCTION_CHECKLIST_STAGE_IDS_V1.indexOf(dispatch.current_stage_id);
    assert.ok(idx >= 0);
    if (dispatch.next_stage_id) {
      assert.equal(
        BATCH_PRODUCTION_CHECKLIST_STAGE_IDS_V1[idx + 1],
        dispatch.next_stage_id,
      );
    }
  }
});
