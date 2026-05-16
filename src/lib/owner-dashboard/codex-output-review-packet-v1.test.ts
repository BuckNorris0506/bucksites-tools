import assert from "node:assert/strict";
import test from "node:test";

import {
  BUCKPARTS_CODEX_NEXT_EXECUTION_PACKET_JSON_CONTRACT_V1,
  buildCodexPacketProofReadModelV1,
} from "./codex-packet-proof-read-model-v1";
import { RUNNER_EXPECTED_DEFAULT_PROHIBITED_ACTION_LINES_V1 } from "../../../scripts/lib/buckparts-runner-safety-contract-v1";
import {
  CODEX_OUTPUT_REVIEW_EXTRA_PROHIBITED_LINES_V1,
  CODEX_OUTPUT_REVIEW_FOUNDER_OPTIONS_V1,
  CODEX_OUTPUT_REVIEW_PACKET_CONTRACT_V1,
  buildCodexOutputReviewPacketV1,
  formatCodexOutputReviewPacketDigestMarkdownV1,
  trimCodexFinalMessageExcerptV1,
  CODEX_OUTPUT_REVIEW_EXCERPT_MAX_CHARS_V1,
} from "./codex-output-review-packet-v1";

const passProofFixture = {
  contract: BUCKPARTS_CODEX_NEXT_EXECUTION_PACKET_JSON_CONTRACT_V1,
  overall_status: "PASS",
  source_packet_id: "execution_packet_v1:queue-amazon-agent",
  source_queue_row_id: "queue-amazon-agent",
  source_packet_title: "Amazon rescue · read-only agent work",
  codex_executed: true,
  external_agent: "codex",
  external_agent_execution: "PROVEN_FOR_READ_ONLY_EXECUTION_PACKET",
  output_capture: "PROVEN_FOR_CODEX_JSONL_AND_FINAL_MESSAGE",
  sandbox: "read-only",
  final_message_path: "/tmp/x/f.txt",
  jsonl_path: "/tmp/x/e.jsonl",
  event_count: 3,
  first_event: "thread.started",
  last_event: "turn.completed",
  git_status_clean: true,
  layer_6_founder_only_approval: "NOT_PROVEN",
};

function proofRead(generated_at: string, fixture: unknown = passProofFixture) {
  return buildCodexPacketProofReadModelV1(fixture, { generated_at });
}

test("READY_FOR_FOUNDER_REVIEW when PASS proof and non-empty final message", () => {
  const proof = proofRead("t");
  assert.equal(proof.valid, true);
  const p = buildCodexOutputReviewPacketV1({
    proof,
    generated_at: "t",
    codex_final_message: {
      attempted_path: "/tmp/read.txt",
      text: "Ship-shape summary.",
      load_error: null,
    },
  });
  assert.equal(p.contract, CODEX_OUTPUT_REVIEW_PACKET_CONTRACT_V1);
  assert.equal(p.read_only, true);
  assert.equal(p.data_mutation, false);
  assert.equal(p.automation_input, false);
  assert.equal(p.founder_judgment_required, true);
  assert.equal(p.layer_6_founder_only_approval, "NOT_PROVEN");
  assert.equal(p.review_status, "READY_FOR_FOUNDER_REVIEW");
  assert.equal(p.codex_final_message_present, true);
  assert.equal(p.codex_final_message_excerpt, "Ship-shape summary.");
  assert.deepEqual(
    p.founder_options.map((o) => o.id),
    CODEX_OUTPUT_REVIEW_FOUNDER_OPTIONS_V1.map((o) => o.id),
  );
});

test("BLOCKED_MISSING_CODEX_OUTPUT when PASS proof but empty message without load_error", () => {
  const proof = proofRead("t");
  const p = buildCodexOutputReviewPacketV1({
    proof,
    generated_at: "t",
    codex_final_message: { attempted_path: "/tmp/a", text: "   ", load_error: null },
  });
  assert.equal(p.review_status, "BLOCKED_MISSING_CODEX_OUTPUT");
  assert.equal(p.codex_final_message_present, false);
});

test("BLOCKED_MISSING_CODEX_OUTPUT when filesystem load_error set", () => {
  const proof = proofRead("t");
  const p = buildCodexOutputReviewPacketV1({
    proof,
    generated_at: "t",
    codex_final_message: {
      attempted_path: "/tmp/missing",
      text: null,
      load_error: "ENOENT",
    },
  });
  assert.equal(p.review_status, "BLOCKED_MISSING_CODEX_OUTPUT");
  assert.match(String(p.final_message_load_error ?? ""), /ENOENT/);
});

test("INVALID_CODEX_PROOF when proof model invalid", () => {
  const proof = proofRead("t", { ...passProofFixture, contract: "wrong" });
  assert.equal(proof.valid, false);
  const p = buildCodexOutputReviewPacketV1({
    proof,
    generated_at: "t",
    codex_final_message: { attempted_path: null, text: "ignored", load_error: null },
  });
  assert.equal(p.review_status, "INVALID_CODEX_PROOF");
});

test("INVALID_CODEX_PROOF when NO_PACKET valid proof", () => {
  const proof = proofRead("t", {
    contract: BUCKPARTS_CODEX_NEXT_EXECUTION_PACKET_JSON_CONTRACT_V1,
    overall_status: "NO_PACKET",
    source_packet_id: null,
    source_queue_row_id: null,
    source_packet_title: null,
    codex_executed: false,
    external_agent: "codex",
    external_agent_execution: "NOT_RUN",
    output_capture: "NOT_RUN",
    sandbox: null,
    final_message_path: null,
    jsonl_path: null,
    event_count: null,
    first_event: null,
    last_event: null,
    git_status_clean: null,
    layer_6_founder_only_approval: "NOT_PROVEN",
  });
  assert.equal(proof.valid, true);
  const p = buildCodexOutputReviewPacketV1({
    proof,
    generated_at: "t",
    codex_final_message: { attempted_path: null, text: "x", load_error: null },
  });
  assert.equal(p.review_status, "INVALID_CODEX_PROOF");
});

test("prohibited_actions merges Runner defaults plus extra posture lines", () => {
  const proof = proofRead("t");
  const p = buildCodexOutputReviewPacketV1({
    proof,
    generated_at: "t",
    codex_final_message: { attempted_path: null, text: "ok", load_error: null },
  });
  assert.ok(p.prohibited_actions_still_apply.length >= RUNNER_EXPECTED_DEFAULT_PROHIBITED_ACTION_LINES_V1.length);
  for (const line of RUNNER_EXPECTED_DEFAULT_PROHIBITED_ACTION_LINES_V1) {
    assert.ok(p.prohibited_actions_still_apply.includes(line));
  }
  for (const line of CODEX_OUTPUT_REVIEW_EXTRA_PROHIBITED_LINES_V1) {
    assert.ok(p.prohibited_actions_still_apply.includes(line));
  }
});

test("trimCodexFinalMessageExcerptV1 truncates past max", () => {
  const body = "a".repeat(CODEX_OUTPUT_REVIEW_EXCERPT_MAX_CHARS_V1 + 50);
  const ex = trimCodexFinalMessageExcerptV1(body);
  assert.equal(ex.length, CODEX_OUTPUT_REVIEW_EXCERPT_MAX_CHARS_V1 + 1);
  assert.ok(ex.endsWith("…"));
});

test("digest markdown references approve lanes and registry hint", () => {
  const proof = proofRead("t");
  const p = buildCodexOutputReviewPacketV1({
    proof,
    generated_at: "t",
    codex_final_message: { attempted_path: "/t", text: "Done.", load_error: null },
  });
  const md = formatCodexOutputReviewPacketDigestMarkdownV1(p);
  assert.match(md, /approve_readonly_findings/);
  assert.match(md, /defer_review/);
  assert.match(md, /NOT_PROVEN/);
  assert.match(md, /Founder Decision Registry/i);
});
