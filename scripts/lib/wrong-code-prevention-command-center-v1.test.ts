import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
  buildWrongCodePreventionCommandCenterLaneUnknownV1,
  buildWrongCodePreventionCommandCenterLaneV1,
  WRONG_CODE_PREVENTION_CC_JQ_PATH_V1,
  WRONG_CODE_PREVENTION_CC_LANE_CONTRACT_V1,
} from "./wrong-code-prevention-command-center-v1";
import {
  WRONG_CODE_PREVENTION_ARTIFACT_REL_V1,
  WRONG_CODE_PREVENTION_CONTRACT_V1,
} from "./wrong-code-prevention-v1";

const FIXED_NOW = () => new Date("2026-06-26T18:00:00.000Z");

test("unknown lane denies HyperAgent write authority", () => {
  const lane = buildWrongCodePreventionCommandCenterLaneUnknownV1({
    generated_at: FIXED_NOW().toISOString(),
    artifact_load_status: "missing",
    detail: "fixture",
  });
  assert.equal(lane.contract, WRONG_CODE_PREVENTION_CC_LANE_CONTRACT_V1);
  assert.equal(lane.read_only, true);
  assert.equal(lane.hyperagent_write_authorized, false);
  assert.equal(lane.auto_commit_authorized, false);
  assert.equal(lane.auto_push_authorized, false);
  assert.equal(lane.overall_status, "UNKNOWN");
  assert.equal(lane.recommended_jq_path, WRONG_CODE_PREVENTION_CC_JQ_PATH_V1);
});

test("command center lane loads committed artifact", () => {
  const root = mkdtempSync(path.join(tmpdir(), "wcp-cc-"));
  const abs = path.join(root, WRONG_CODE_PREVENTION_ARTIFACT_REL_V1);
  mkdirSync(path.dirname(abs), { recursive: true });
  writeFileSync(
    abs,
    `${JSON.stringify(
      {
        contract: WRONG_CODE_PREVENTION_CONTRACT_V1,
        read_only: true,
        generated_at: "2026-06-26T17:30:00.000Z",
        git_head_hint: "abc123",
        overall_status: "PASS",
        stale_direct_buyable_count: 0,
        dangerous_db_only_slug_count: 0,
        handoff_head_drift_commits: 0,
        sql_plan_safety_status: "PASS",
        deprecated_slug_reference_count: 0,
        checks: [],
        blockers: [],
        warnings: [],
        recommended_next_action: "Continue read-only steering.",
      },
      null,
      2,
    )}\n`,
    "utf8",
  );

  const lane = buildWrongCodePreventionCommandCenterLaneV1({ rootDir: root, now: FIXED_NOW });
  assert.equal(lane.artifact_load_status, "loaded");
  assert.equal(lane.overall_status, "PASS");
  assert.equal(lane.hyperagent_write_authorized, false);
  assert.equal(lane.checks.length, 0);
});

test("command center lane missing artifact falls back UNKNOWN", () => {
  const root = mkdtempSync(path.join(tmpdir(), "wcp-cc-missing-"));
  const lane = buildWrongCodePreventionCommandCenterLaneV1({ rootDir: root, now: FIXED_NOW });
  assert.equal(lane.artifact_load_status, "missing");
  assert.equal(lane.overall_status, "UNKNOWN");
  assert.equal(lane.stale_direct_buyable_count, "UNKNOWN");
});
