import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import test from "node:test";

import { buildFridgeGuardedBatchCloseoutLearningCommandCenterLaneV1 } from "./fridge-guarded-batch-closeout-learning-command-center-v1";
import { buildFridgeGuardedBatchLifecycleRuleProposalCommandCenterLaneV1 } from "./fridge-guarded-batch-lifecycle-rule-proposal-command-center-v1";
import {
  buildFridgeGuardedBatchLifecycleRulePromotionPlanCommandCenterLaneV1,
  FRIDGE_GUARDED_BATCH_LIFECYCLE_RULE_PROMOTION_PLAN_CC_JQ_PATH_V1,
} from "./fridge-guarded-batch-lifecycle-rule-promotion-plan-command-center-v1";

const REPO_ROOT = process.cwd();
const PACKET_REL_PATH =
  "data/fridge/batch-production/closeout/fridge-buyer-path-batch-closeout-learning-packet-v1-0fec4a7b623a.json";

test("fridge guarded lifecycle rule promotion plan derives three inactive candidates from pushed proposed rules", () => {
  const learningLane = buildFridgeGuardedBatchCloseoutLearningCommandCenterLaneV1({
    rootDir: REPO_ROOT,
    fileExists: existsSync,
    readDir: readdirSync,
    readTextFile: (abs) => readFileSync(abs, "utf8"),
  });
  const proposalLane = buildFridgeGuardedBatchLifecycleRuleProposalCommandCenterLaneV1(learningLane);
  const lane = buildFridgeGuardedBatchLifecycleRulePromotionPlanCommandCenterLaneV1(proposalLane);

  assert.equal(lane.contract, "fridge_guarded_batch_lifecycle_rule_promotion_plan_command_center_v1");
  assert.equal(lane.read_only, true);
  assert.equal(lane.data_mutation, false);
  assert.equal(lane.recommended_jq_path, FRIDGE_GUARDED_BATCH_LIFECYCLE_RULE_PROMOTION_PLAN_CC_JQ_PATH_V1);
  assert.equal(lane.owner_approval_required, true);
  assert.equal(lane.promotion_authorized, false);
  assert.equal(lane.active_rule_write_authorized, false);
  assert.equal(lane.source_proposed_rule_count, 3);
  assert.equal(lane.promotion_candidate_count, 3);
  assert.deepEqual(
    lane.promotion_candidates.map((candidate) => candidate.rule_id),
    [
      "go_first_hop_redirect_smoke_only",
      "applied_parity_proven_is_closeout_state",
      "block_repeat_guarded_csv_write_after_parity",
    ],
  );
  assert.ok(lane.blockers.includes("missing_owner_rule_promotion_approval"));
  assert.ok(lane.blockers.includes("active_rule_registry_not_created"));
  assert.ok(lane.blockers.includes("enforcement_not_wired"));
  for (const candidate of lane.promotion_candidates) {
    assert.equal(candidate.source_packet_path, PACKET_REL_PATH);
    assert.equal(candidate.batch_digest, "0fec4a7b623a");
    assert.equal(candidate.proposed_active_state, true);
    assert.equal(candidate.owner_approval_required, true);
    assert.equal(candidate.promotion_authorized, false);
    assert.equal(candidate.active, false);
    assert.equal(candidate.write_authorized, false);
    assert.notEqual(candidate.rule_text.trim(), "");
    assert.notEqual(candidate.evidence_basis.trim(), "");
  }
});

test("fridge guarded lifecycle rule promotion plan degrades safely when proposed rules are missing", () => {
  const lane = buildFridgeGuardedBatchLifecycleRulePromotionPlanCommandCenterLaneV1(null);

  assert.equal(lane.lane_status, "UNKNOWN");
  assert.equal(lane.read_only, true);
  assert.equal(lane.data_mutation, false);
  assert.equal(lane.source_proposed_rule_count, 0);
  assert.equal(lane.promotion_candidate_count, 0);
  assert.equal(lane.owner_approval_required, true);
  assert.equal(lane.promotion_authorized, false);
  assert.equal(lane.active_rule_write_authorized, false);
  assert.deepEqual(lane.promotion_candidates, []);
  assert.ok(lane.blockers.includes("missing_owner_rule_promotion_approval"));
  assert.ok(lane.blockers.includes("active_rule_registry_not_created"));
  assert.ok(lane.blockers.includes("enforcement_not_wired"));
  assert.ok(lane.blockers.includes("source_lifecycle_rule_proposal_lane_missing"));
  assert.match(lane.next_agent_action, /do not create active rules/i);
});
