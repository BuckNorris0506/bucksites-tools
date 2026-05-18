import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  BATCH_NON_AMAZON_PDP_OWNER_APPROVAL_REGISTRY_RELATIVE_V1,
  buildBatchProductionOwnerDecisionsLaneV1,
} from "./batch-production-owner-decisions-lane-v1";

const REPO_ROOT = process.cwd();

test("batch lane loads committed registry with 3 approved read_only_agent rows", () => {
  const lane = buildBatchProductionOwnerDecisionsLaneV1({ rootDir: REPO_ROOT });
  assert.equal(lane.contract, "batch_production_owner_decisions_lane_v1");
  assert.equal(lane.runtime_status, "OK");
  assert.equal(lane.approved_for_planning_count, 3);
  assert.equal(lane.primary_source_registry_file, BATCH_NON_AMAZON_PDP_OWNER_APPROVAL_REGISTRY_RELATIVE_V1);
  assert.equal(lane.mutation_authority, false);
  assert.equal(lane.may_mutate, false);
  assert.equal(lane.may_write_production_evidence, false);
  assert.equal(lane.automation_input, false);
  assert.equal(lane.layer_6_founder_only_production_mutation_approval, "NOT_PROVEN");
  assert.equal(lane.production_evidence_commit, "NOT_PROVEN");
  assert.equal(lane.batch_size_20_status, "BLOCKED");
  assert.ok(lane.approved_rows.every((r) => r.allowed_next_scope === "read_only_agent"));
  assert.deepEqual(
    lane.approved_rows.map((r) => r.row_id).sort(),
    ["da97-08006b", "da97-15217d", "rpwfe"],
  );
});

test("batch lane documents excluded rows from HQ handoff when present", () => {
  const lane = buildBatchProductionOwnerDecisionsLaneV1({ rootDir: REPO_ROOT });
  if (!readFileSync(path.join(REPO_ROOT, "docs/BuckParts-HQ-HANDOFF.md"), "utf8").includes("da29-00012b")) {
    assert.equal(lane.excluded_not_owner_review_ready_row_ids, "UNKNOWN");
    return;
  }
  assert.equal(lane.source_row_count, 5);
  assert.deepEqual(lane.excluded_not_owner_review_ready_row_ids, ["da29-00012b", "adq75795101"]);
});
