import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const REPO_ROOT = process.cwd();
const PACKET_REL_PATH =
  "data/fridge/batch-production/closeout/fridge-buyer-path-batch-closeout-learning-packet-v1-0fec4a7b623a.json";
const EXPECTED_SLUGS = [
  "4396710",
  "4396841",
  "46-9002",
  "8171413",
  "da29-00019a",
  "da97-15217d",
  "edr1rxd1",
  "edr2rxd1",
  "lt1000p",
  "lt1000pc",
  "lt600p",
  "lt700p",
  "lt800p",
  "mdj64844601",
];
const EXPECTED_COMMITS = ["9b3f138", "a3ad8f4", "c753e0f", "ffee57a", "06d2902"];
const GO_FIRST_HOP_LEARNING_NOTE =
  "Retailer redirect smoke must validate BuckParts first-hop redirect only. Do not follow Amazon with curl -L; Amazon may return bot-dependent 500s unrelated to BuckParts.";

function loadPacket(): Record<string, any> {
  return JSON.parse(readFileSync(path.join(REPO_ROOT, PACKET_REL_PATH), "utf8"));
}

test("refrigerator_water closeout learning packet is read-only and identifies the exact batch", () => {
  const packet = loadPacket();
  assert.equal(packet.contract, "fridge_buyer_path_batch_closeout_learning_packet_v1");
  assert.equal(packet.read_only, true);
  assert.equal(packet.data_mutation, false);
  assert.equal(packet.batch_digest, "0fec4a7b623a");
  assert.equal(packet.batch_id, "fridge-buyer-path-batch-proposal-v1-0fec4a7b623a");
  assert.equal(packet.run_id, "fridge-buyer-path-batch-run-v1-0fec4a7b623a");
  assert.equal(packet.target_file, "data/retailer_links.csv");
});

test("refrigerator_water closeout learning packet keeps all mutation and deploy lanes closed", () => {
  const packet = loadPacket();
  assert.equal(packet.supabase_mutation_authorized, false);
  assert.equal(packet.evidence_write_authorized, false);
  assert.equal(packet.public_ui_mutation_authorized, false);
  assert.equal(packet.netlify_api_authorized, false);
  assert.equal(packet.deploy_authorized, false);
  assert.equal(packet.next_recommended_lifecycle.closeout_registry_mutation_authorized_here, false);
  assert.equal(packet.learning_feed_recommendation.learning_outcomes_write_authorized_here, false);
});

test("refrigerator_water closeout learning packet records the 14 applied slugs and involved commits", () => {
  const packet = loadPacket();
  assert.deepEqual(packet.applied_slugs, EXPECTED_SLUGS);
  assert.equal(packet.post_apply_parity.row_patch_count, 14);
  assert.deepEqual(
    packet.commits_involved.map((entry: { commit: string }) => entry.commit),
    EXPECTED_COMMITS,
  );
});

test("refrigerator_water closeout learning packet records post-apply parity and repeat-write lockout", () => {
  const packet = loadPacket();
  assert.equal(packet.post_apply_parity.status, "APPLIED_PARITY_PROVEN");
  assert.equal(packet.post_apply_parity.lifecycle_state, "parity_verified");
  assert.equal(packet.post_apply_parity.target_rows_match_after_row, true);
  assert.equal(packet.post_apply_parity.non_target_rows_unchanged, true);
  assert.equal(packet.repeat_write_lockout.status, "PROVEN");
  assert.equal(packet.repeat_write_lockout.write_mode_available, false);
  assert.equal(packet.repeat_write_lockout.csv_apply_authorized, false);
  assert.equal(packet.repeat_write_lockout.repeat_write_blocked, true);
});

test("refrigerator_water closeout learning packet captures first-hop /go lesson and learning lane candidate", () => {
  const packet = loadPacket();
  assert.equal(packet.go_first_hop_smoke_lesson.learning_note, GO_FIRST_HOP_LEARNING_NOTE);
  assert.match(packet.go_first_hop_smoke_lesson.false_failure_root_cause, /Amazon bot-dependent 500s/);
  assert.equal(packet.live_page_smoke_result_summary.final_retailer_status_used_for_pass_fail, false);
  assert.equal(packet.learning_feed_recommendation.should_feed_future_learning_outcomes, true);
  assert.equal(packet.learning_feed_recommendation.command_center_learning_lane_candidate, true);
});
