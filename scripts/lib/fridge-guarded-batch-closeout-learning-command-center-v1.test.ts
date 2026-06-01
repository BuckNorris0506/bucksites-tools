import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, readdirSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
  buildFridgeGuardedBatchCloseoutLearningCommandCenterLaneV1,
  FRIDGE_GUARDED_BATCH_CLOSEOUT_LEARNING_CC_JQ_PATH_V1,
  FRIDGE_GUARDED_BATCH_CLOSEOUT_LEARNING_DIR_REL_V1,
} from "./fridge-guarded-batch-closeout-learning-command-center-v1";

const REPO_ROOT = process.cwd();
const PACKET_REL_PATH =
  "data/fridge/batch-production/closeout/fridge-buyer-path-batch-closeout-learning-packet-v1-0fec4a7b623a.json";

test("fridge guarded closeout learning lane reads pushed packet and remains read-only", () => {
  const lane = buildFridgeGuardedBatchCloseoutLearningCommandCenterLaneV1({
    rootDir: REPO_ROOT,
    fileExists: existsSync,
    readDir: readdirSync,
    readTextFile: (abs) => readFileSync(abs, "utf8"),
  });

  assert.equal(lane.contract, "fridge_guarded_batch_closeout_learning_command_center_v1");
  assert.equal(lane.read_only, true);
  assert.equal(lane.data_mutation, false);
  assert.equal(lane.recommended_jq_path, FRIDGE_GUARDED_BATCH_CLOSEOUT_LEARNING_CC_JQ_PATH_V1);
  assert.equal(lane.packet_count, 1);
  assert.equal(lane.latest_packet_path, PACKET_REL_PATH);
  assert.equal(lane.latest_batch_digest, "0fec4a7b623a");
  assert.equal(lane.latest_post_apply_status, "APPLIED_PARITY_PROVEN");
  assert.equal(lane.latest_lifecycle_state, "parity_verified");
  assert.equal(lane.latest_repeat_write_lockout_status, "PROVEN");
  assert.equal(lane.latest_learning_lane_candidate, true);
  assert.equal(lane.latest_recommended_next_lifecycle_state, "closed");
  assert.ok(lane.captured_lessons.some((lesson) => lesson.includes("first-hop redirect only")));
  assert.ok(lane.next_agent_action.includes("do not create learning_outcomes rows"));
});

test("fridge guarded closeout learning lane safely reports EMPTY when directory is missing", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "fridge-closeout-missing-"));
  const lane = buildFridgeGuardedBatchCloseoutLearningCommandCenterLaneV1({
    rootDir: dir,
    fileExists: existsSync,
    readDir: readdirSync,
    readTextFile: (abs) => readFileSync(abs, "utf8"),
  });

  assert.equal(lane.lane_status, "EMPTY");
  assert.equal(lane.packet_count, 0);
  assert.equal(lane.latest_batch_digest, null);
  assert.equal(lane.read_only, true);
  assert.equal(lane.data_mutation, false);
  assert.ok(lane.unknown_facts.includes("closeout_packet_directory_missing"));
});

test("fridge guarded closeout learning lane safely reports UNKNOWN when packets are invalid", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "fridge-closeout-invalid-"));
  const closeoutDir = path.join(dir, ...FRIDGE_GUARDED_BATCH_CLOSEOUT_LEARNING_DIR_REL_V1.split("/"));
  mkdirSync(closeoutDir, { recursive: true });
  writeFileSync(path.join(closeoutDir, "bad.json"), JSON.stringify({ contract: "wrong" }), "utf8");

  const lane = buildFridgeGuardedBatchCloseoutLearningCommandCenterLaneV1({
    rootDir: dir,
    fileExists: existsSync,
    readDir: readdirSync,
    readTextFile: (abs) => readFileSync(abs, "utf8"),
  });

  assert.equal(lane.lane_status, "UNKNOWN");
  assert.equal(lane.packet_count, 0);
  assert.ok(lane.blockers.some((blocker) => blocker.startsWith("unexpected_packet_contract:")));
  assert.equal(lane.read_only, true);
  assert.equal(lane.data_mutation, false);
});
