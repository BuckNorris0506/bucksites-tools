import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import test from "node:test";

import { buildFridgeGuardedBatchCloseoutLearningCommandCenterLaneV1 } from "./fridge-guarded-batch-closeout-learning-command-center-v1";
import {
  buildFridgeGuardedBatchLifecycleRuleProposalCommandCenterLaneV1,
  FRIDGE_GUARDED_BATCH_LIFECYCLE_RULE_PROPOSAL_CC_JQ_PATH_V1,
} from "./fridge-guarded-batch-lifecycle-rule-proposal-command-center-v1";

const REPO_ROOT = process.cwd();
const PACKET_REL_PATH =
  "data/fridge/batch-production/closeout/fridge-buyer-path-batch-closeout-learning-packet-v1-0fec4a7b623a.json";

test("fridge guarded lifecycle rule proposal derives three inactive rules from pushed candidates", () => {
  const learningLane = buildFridgeGuardedBatchCloseoutLearningCommandCenterLaneV1({
    rootDir: REPO_ROOT,
    fileExists: existsSync,
    readDir: readdirSync,
    readTextFile: (abs) => readFileSync(abs, "utf8"),
  });
  const lane = buildFridgeGuardedBatchLifecycleRuleProposalCommandCenterLaneV1(learningLane);

  assert.equal(lane.contract, "fridge_guarded_batch_lifecycle_rule_proposal_command_center_v1");
  assert.equal(lane.read_only, true);
  assert.equal(lane.data_mutation, false);
  assert.equal(lane.recommended_jq_path, FRIDGE_GUARDED_BATCH_LIFECYCLE_RULE_PROPOSAL_CC_JQ_PATH_V1);
  assert.equal(lane.source_candidate_count, 3);
  assert.equal(lane.proposed_rule_count, 3);
  assert.deepEqual(
    lane.proposed_rules.map((rule) => rule.rule_id),
    [
      "go_first_hop_redirect_smoke_only",
      "applied_parity_proven_is_closeout_state",
      "block_repeat_guarded_csv_write_after_parity",
    ],
  );
  assert.deepEqual(
    lane.proposed_rules.map((rule) => rule.enforcement_target),
    [
      "go_redirect_smoke",
      "universal_batch_lifecycle_truth_table",
      "guarded_csv_apply_executor",
    ],
  );
  for (const rule of lane.proposed_rules) {
    assert.equal(rule.source_packet_path, PACKET_REL_PATH);
    assert.equal(rule.batch_digest, "0fec4a7b623a");
    assert.equal(rule.owner_approval_required, true);
    assert.equal(rule.active, false);
    assert.equal(rule.write_authorized, false);
    assert.notEqual(rule.rule_text.trim(), "");
    assert.notEqual(rule.evidence_basis.trim(), "");
  }
});

test("fridge guarded lifecycle rule proposal degrades safely when source candidates are missing", () => {
  const lane = buildFridgeGuardedBatchLifecycleRuleProposalCommandCenterLaneV1(null);

  assert.equal(lane.lane_status, "UNKNOWN");
  assert.equal(lane.read_only, true);
  assert.equal(lane.data_mutation, false);
  assert.equal(lane.source_candidate_count, 0);
  assert.equal(lane.proposed_rule_count, 0);
  assert.deepEqual(lane.proposed_rules, []);
  assert.ok(lane.blockers.includes("source_closeout_learning_lane_missing"));
  assert.match(lane.next_agent_action, /do not apply rules/i);
});
