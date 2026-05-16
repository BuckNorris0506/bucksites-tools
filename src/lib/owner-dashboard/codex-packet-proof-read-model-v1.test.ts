import assert from "node:assert/strict";
import test from "node:test";

import {
  BUCKPARTS_CODEX_NEXT_EXECUTION_PACKET_JSON_CONTRACT_V1,
  CODEX_PACKET_PROOF_READ_MODEL_CONTRACT_V1,
  buildCodexPacketProofReadModelParseFailedV1,
  buildCodexPacketProofReadModelV1,
  formatCodexPacketProofDigestMarkdownV1,
} from "./codex-packet-proof-read-model-v1";

const validPassFixture = {
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
  final_message_path: "/tmp/buckparts-codex-next-execution-packet-abc/final-message.txt",
  jsonl_path: "/tmp/buckparts-codex-next-execution-packet-abc/events.jsonl",
  event_count: 45,
  first_event: "thread.started",
  last_event: "turn.completed",
  git_status_clean: true,
  layer_6_founder_only_approval: "NOT_PROVEN",
};

test("PASS fixture yields valid read model with proof flags", () => {
  const m = buildCodexPacketProofReadModelV1(validPassFixture, { generated_at: "t" });
  assert.equal(m.contract, CODEX_PACKET_PROOF_READ_MODEL_CONTRACT_V1);
  assert.equal(m.valid, true);
  assert.equal(m.read_only, true);
  assert.equal(m.automation_input, false);
  assert.equal(m.codex_packet_execution_proven, true);
  assert.equal(m.output_capture_proven, true);
  assert.equal(m.git_clean_after_codex, true);
  assert.equal(m.layer_6_founder_only_approval, "NOT_PROVEN");
  assert.equal(m.source_snapshot?.overall_status, "PASS");
});

test("NO_PACKET fixture valid with proof flags false", () => {
  const src = {
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
  };
  const m = buildCodexPacketProofReadModelV1(src, { generated_at: "t" });
  assert.equal(m.valid, true);
  assert.equal(m.codex_packet_execution_proven, false);
});

test("wrong contract invalid", () => {
  const m = buildCodexPacketProofReadModelV1({ ...validPassFixture, contract: "wrong" }, { generated_at: "t" });
  assert.equal(m.valid, false);
  assert.ok(m.invalid_reasons.some((r) => /Expected contract/.test(r)));
});

test("layer_6 not NOT_PROVEN invalid", () => {
  const m = buildCodexPacketProofReadModelV1({ ...validPassFixture, layer_6_founder_only_approval: "APPROVED" }, {
    generated_at: "t",
  });
  assert.equal(m.valid, false);
});

test("PASS missing event_count invalid", () => {
  const o = { ...validPassFixture };
  delete (o as Record<string, unknown>).event_count;
  const m = buildCodexPacketProofReadModelV1(o, { generated_at: "t" });
  assert.equal(m.valid, false);
  assert.ok(m.invalid_reasons.some((r) => /event_count/.test(r)));
});

test("PASS missing capture paths invalid", () => {
  const m = buildCodexPacketProofReadModelV1(
    { ...validPassFixture, final_message_path: "", jsonl_path: " " },
    { generated_at: "t" },
  );
  assert.equal(m.valid, false);
});

test("PASS dirty git invalid", () => {
  const m = buildCodexPacketProofReadModelV1({ ...validPassFixture, git_status_clean: false }, { generated_at: "t" });
  assert.equal(m.valid, false);
});

test("parse failure helper yields invalid model", () => {
  const m = buildCodexPacketProofReadModelParseFailedV1("t", "boom");
  assert.equal(m.valid, false);
  assert.equal(m.layer_6_founder_only_approval, "NOT_PROVEN");
});

test("digest markdown mentions informational limits", () => {
  const m = buildCodexPacketProofReadModelV1(validPassFixture, { generated_at: "t" });
  const md = formatCodexPacketProofDigestMarkdownV1(m, { env_path: "/tmp/x.json" });
  assert.ok(md.includes("founder-only approval"));
  assert.ok(md.includes("FOUNDER_DIGEST_CODEX_PACKET_PROOF_JSON_PATH"));
});
