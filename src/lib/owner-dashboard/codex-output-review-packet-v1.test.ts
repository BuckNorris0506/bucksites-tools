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
  classifyCodexFinalMessageOutcomeV1,
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

/** Fixture synthesized from live Codex final-message excerpt (transport/capture succeeded; validation partial under read-only sandbox). */
const LIVE_CODEX_FINAL_MESSAGE_TASK_PARTIAL_FIXTURE_V1 = `
npm run buckparts:amazon-first-blocked-queue exited 0.

npm run buckparts:precheck via npm failed due tsx temp IPC EPERM.

direct node --import tsx scripts/report-amazon-refrigerator-token-precheck.ts exited 0.

npm run lint failed due read-only .next/cache/eslint write block.

npm run build failed due read-only .next/trace write block.

npm run buckparts:operator-proof failed due tsx temp IPC EPERM.

git status --short failed because xcrun tried to create temp cache under /tmp.
`.trim();

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
  assert.equal(p.codex_task_outcome_status, "TASK_OUTCOME_UNKNOWN");
  assert.deepEqual(
    p.founder_options.map((o) => o.id),
    CODEX_OUTPUT_REVIEW_FOUNDER_OPTIONS_V1.map((o) => o.id),
  );
});

test("live-style fixture classifies TASK_PARTIAL_OR_FAILED with sandbox limitation hints", () => {
  const o = classifyCodexFinalMessageOutcomeV1(LIVE_CODEX_FINAL_MESSAGE_TASK_PARTIAL_FIXTURE_V1);
  assert.equal(o.codex_task_outcome_status, "TASK_PARTIAL_OR_FAILED");
  assert.ok(o.codex_reported_validation_failures.length >= 3);
  assert.ok(o.codex_environment_limitations.length >= 2);
  assert.equal(o.codex_reported_successes.length, 0);

  const proof = proofRead("t");
  const p = buildCodexOutputReviewPacketV1({
    proof,
    generated_at: "t",
    codex_final_message: {
      attempted_path: "/tmp/final.txt",
      text: LIVE_CODEX_FINAL_MESSAGE_TASK_PARTIAL_FIXTURE_V1,
      load_error: null,
    },
  });
  assert.equal(p.codex_task_outcome_status, "TASK_PARTIAL_OR_FAILED");
  const md = formatCodexOutputReviewPacketDigestMarkdownV1(p);
  assert.match(md, /\*\*Codex task outcome:\*\* `TASK_PARTIAL_OR_FAILED`/);
  assert.match(md, /request_followup_readonly/);
  assert.match(md, /\.next\/cache/);
});

test("TASK_SUCCESS_PROVEN requires multiple distinct success markers without failures", () => {
  const text = "npm run lint exited 0.\nRESULT: OK\n";
  assert.equal(classifyCodexFinalMessageOutcomeV1(text).codex_task_outcome_status, "TASK_SUCCESS_PROVEN");
});

test("single exited 0 alone stays TASK_OUTCOME_UNKNOWN", () => {
  assert.equal(classifyCodexFinalMessageOutcomeV1("Only one npm run foo exited 0.").codex_task_outcome_status, "TASK_OUTCOME_UNKNOWN");
});

test("exited 1 forces TASK_PARTIAL_OR_FAILED even with successes", () => {
  const text = "npm run lint exited 0.\nRESULT: OK\nSomething exited 1.\n";
  assert.equal(classifyCodexFinalMessageOutcomeV1(text).codex_task_outcome_status, "TASK_PARTIAL_OR_FAILED");
});

test("'not failed' does not trigger generic failed signal alone", () => {
  assert.equal(classifyCodexFinalMessageOutcomeV1("Everything not failed yet.").codex_task_outcome_status, "TASK_OUTCOME_UNKNOWN");
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
  assert.equal(p.codex_task_outcome_status, "TASK_OUTCOME_UNKNOWN");
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
  assert.match(md, /\*\*Codex task outcome:\*\* `TASK_OUTCOME_UNKNOWN`/);
  assert.match(md, /Founder Decision Registry/i);
});
