import assert from "node:assert/strict";
import test from "node:test";

import {
  FAILURE_PATTERN_REGISTRY_READ_MODEL_CONTRACT_V1,
  buildFailurePatternRegistryReadModelFromSeededV1,
  buildFailurePatternRegistryReadModelV1,
} from "./failure-pattern-registry-v1";
import { buildFounderDigestMarkdownV1 } from "../../../scripts/lib/buckparts-founder-digest-v1";
import {
  LAYER_SIX_READINESS_OWNER_DASHBOARD_LINE_V1,
  LAYER_SIX_READINESS_SUMMARY_CONTRACT_V1,
  buildLayerSixReadinessSummaryV1,
  formatLayerSixReadinessDigestMarkdownV1,
} from "./layer-six-readiness-summary-v1";
import {
  BUCKPARTS_CODEX_NEXT_EXECUTION_PACKET_JSON_CONTRACT_V1,
  buildCodexPacketProofReadModelV1,
} from "./codex-packet-proof-read-model-v1";
import { buildCodexOutputReviewPacketV1 } from "./codex-output-review-packet-v1";

const minimalRow = {
  failure_id: "fixture_row",
  title: "Fixture",
  status: "observed" as const,
  first_seen_context: "PROVEN: test.",
  last_seen_at: "2026-05-08T12:00:00.000Z",
  observed_examples: ["PROVEN: ex"],
  root_cause: "PROVEN: cause",
  correct_pattern: "PROVEN: fix",
  guardrail_paths: [] as string[],
  proof_status: "UNKNOWN" as const,
  remaining_risk: "UNKNOWN: risk.",
};

function registryWithRows(rows: unknown[]) {
  return buildFailurePatternRegistryReadModelV1(rows, { generated_at: "t" });
}

test("unguarded patterns block readiness", () => {
  const fp = registryWithRows([{ ...minimalRow, failure_id: "unguarded_a", status: "observed" }]);
  assert.equal(fp.unguarded_count, 1);
  const s = buildLayerSixReadinessSummaryV1(fp, { generated_at: "t" });
  assert.equal(s.readiness_status, "blocked");
  assert.ok(s.reasons.some((r) => /unguarded_count=1/.test(r)));
  assert.ok(s.required_before_layer_6.some((r) => /unguarded/i.test(r)));
});

test("recurring patterns require review when unguarded is zero", () => {
  const fp = registryWithRows([
    {
      ...minimalRow,
      failure_id: "recurring_a",
      status: "recurring",
      proof_status: "PROVEN",
      guardrail_paths: ["docs/x.md"],
    },
  ]);
  assert.equal(fp.recurring_count, 1);
  const s = buildLayerSixReadinessSummaryV1(fp, { generated_at: "t" });
  assert.equal(s.readiness_status, "needs_review");
  assert.ok(s.reasons.some((r) => /recurring_count=1/.test(r)));
});

test("unknown_guardrail without recurring yields needs_review", () => {
  const fp = registryWithRows([
    {
      ...minimalRow,
      failure_id: "unknown_g",
      status: "guarded",
      proof_status: "UNKNOWN",
      guardrail_paths: ["docs/y.md"],
    },
  ]);
  assert.equal(fp.unknown_guardrail_count, 1);
  const s = buildLayerSixReadinessSummaryV1(fp, { generated_at: "t" });
  assert.equal(s.readiness_status, "needs_review");
});

test("all guarded seeded patterns produce informational_ready but do not claim Layer 6 proven", () => {
  const fp = buildFailurePatternRegistryReadModelFromSeededV1("t");
  assert.equal(fp.unguarded_count, 0);
  assert.equal(fp.recurring_count, 0);
  assert.equal(fp.unknown_guardrail_count, 0);
  const s = buildLayerSixReadinessSummaryV1(fp, {
    generated_at: "t",
    runner: {
      overall_status: "NO_PACKET",
      layer_truth: {
        layer_3_external_agent_execution: "UNKNOWN",
        layer_4_output_capture: "PROVEN_FOR_REPO_COMMANDS_ONLY",
        layer_6_founder_only_approval: "NOT_PROVEN",
      },
    },
  });
  assert.equal(s.readiness_status, "informational_ready");
  assert.ok(s.reasons.some((r) => /NOT_PROVEN/.test(r)));
  assert.ok(s.required_before_layer_6.some((r) => /NOT_PROVEN/.test(r)));
  const md = formatLayerSixReadinessDigestMarkdownV1(s);
  assert.match(md, /informational_ready/);
  assert.match(md, /Layer 6 remains \*\*NOT_PROVEN\*\*/);
  assert.doesNotMatch(md, /Layer 6 is PROVEN/i);
  assert.match(md, /does not authorize Cursor\/Codex\/OpenAI integration/i);
});

test("explicit null Codex packet proof adds UNKNOWN digest-env line", () => {
  const fp = buildFailurePatternRegistryReadModelFromSeededV1("t");
  const s = buildLayerSixReadinessSummaryV1(fp, { generated_at: "t", codex_packet_proof: null });
  assert.ok(s.unknown_facts.some((f) => /FOUNDER_DIGEST_CODEX_PACKET_PROOF_JSON_PATH/.test(f)));
});

test("dashboard-style summary defaults codex_output_review_surface_v1 UNKNOWN", () => {
  const fp = buildFailurePatternRegistryReadModelFromSeededV1("t");
  const s = buildLayerSixReadinessSummaryV1(fp, { generated_at: "t" });
  assert.equal(s.codex_output_review_surface_v1, "UNKNOWN");
});

test("digest READY codex_output_review yields PROVEN_PRESENT surface without proving Layer 6", () => {
  const fp = buildFailurePatternRegistryReadModelFromSeededV1("t");
  const proof = buildCodexPacketProofReadModelV1(
    {
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
      final_message_path: "/tmp/a/f.txt",
      jsonl_path: "/tmp/a/e.jsonl",
      event_count: 2,
      first_event: "thread.started",
      last_event: "turn.completed",
      git_status_clean: true,
      layer_6_founder_only_approval: "NOT_PROVEN",
    },
    { generated_at: "t" },
  );
  const review = buildCodexOutputReviewPacketV1({
    proof,
    generated_at: "t",
    codex_final_message: { attempted_path: "/tmp/a/f.txt", text: "ok", load_error: null },
  });
  const s = buildLayerSixReadinessSummaryV1(fp, {
    generated_at: "t",
    codex_packet_proof: proof,
    codex_output_review_packet: review,
  });
  assert.equal(s.codex_output_review_surface_v1, "PROVEN_PRESENT");
  assert.ok(s.proven_facts.some((f) => /codex_output_review_packet_v1/.test(f)));
  const md = formatLayerSixReadinessDigestMarkdownV1(s);
  assert.match(md, /codex_output_review_surface_v1: `PROVEN_PRESENT`/);
  assert.match(md, /Layer 6 remains \*\*NOT_PROVEN\*\*/);
});

test("blocked codex_output_review yields NOT_PRESENT_OR_BLOCKED surface", () => {
  const fp = buildFailurePatternRegistryReadModelFromSeededV1("t");
  const proof = buildCodexPacketProofReadModelV1(
    {
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
      final_message_path: "/tmp/a/f.txt",
      jsonl_path: "/tmp/a/e.jsonl",
      event_count: 2,
      first_event: "thread.started",
      last_event: "turn.completed",
      git_status_clean: true,
      layer_6_founder_only_approval: "NOT_PROVEN",
    },
    { generated_at: "t" },
  );
  const review = buildCodexOutputReviewPacketV1({
    proof,
    generated_at: "t",
    codex_final_message: { attempted_path: "/tmp/a/f.txt", text: "", load_error: null },
  });
  assert.equal(review.review_status, "BLOCKED_MISSING_CODEX_OUTPUT");
  const s = buildLayerSixReadinessSummaryV1(fp, {
    generated_at: "t",
    codex_output_review_packet: review,
  });
  assert.equal(s.codex_output_review_surface_v1, "NOT_PRESENT_OR_BLOCKED");
  assert.ok(s.unknown_facts.some((f) => /NOT_PRESENT_OR_BLOCKED/.test(f)));
});

test("valid Codex PASS proof adds proven fact without claiming Layer 6", () => {
  const fp = buildFailurePatternRegistryReadModelFromSeededV1("t");
  const proof = buildCodexPacketProofReadModelV1(
    {
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
      final_message_path: "/tmp/a/f.txt",
      jsonl_path: "/tmp/a/e.jsonl",
      event_count: 2,
      first_event: "thread.started",
      last_event: "turn.completed",
      git_status_clean: true,
      layer_6_founder_only_approval: "NOT_PROVEN",
    },
    { generated_at: "t" },
  );
  assert.equal(proof.valid, true);
  const s = buildLayerSixReadinessSummaryV1(fp, { generated_at: "t", codex_packet_proof: proof });
  assert.ok(s.proven_facts.some((f) => /codex_packet_proof_read_model_v1/.test(f)));
  assert.ok(s.proven_facts.some((f) => /NOT PROVEN.*Layer 6 founder/i.test(f)));
  const md = formatLayerSixReadinessDigestMarkdownV1(s);
  assert.match(md, /Layer 6 remains \*\*NOT_PROVEN\*\*/);
});

test("digest section wording is informational only and does not alter automation", () => {
  const fp = buildFailurePatternRegistryReadModelFromSeededV1("t");
  const summaryMd = formatLayerSixReadinessDigestMarkdownV1(
    buildLayerSixReadinessSummaryV1(fp, { generated_at: "t" }),
  );
  const digestMd = buildFounderDigestMarkdownV1({
    generated_at: "t",
    build: { ran: true, ok: true },
    command_center: {
      report_name: "r",
      generated_at: "t",
      system_health_status: "OK",
      next_best_action: "x",
      next_owner_action: "y",
      next_move_mode: "READ_ONLY",
      mutating_blocked: false,
      mutating_block_reasons: [],
      deploy_lane_status: "OK",
      live_site_runtime_status: "OK",
      route_health_one_liner: "1/1 OK",
      amazon_rescue_next_agent_action: "",
      known_unknowns_sample: [],
    },
    compare_note: "n",
    layer_six_readiness_digest_markdown: summaryMd,
  });
  assert.match(digestMd, /## Layer 6 Readiness Summary \(informational v1\)/);
  assert.ok(digestMd.includes("failure_pattern_registry_read_model_v1"));
  assert.ok(digestMd.includes("Layer 6 (`layer_6_founder_only_approval`) remains **NOT_PROVEN**"));
  assert.ok(digestMd.includes("FOUNDER_DIGEST_CODEX_PACKET_PROOF_JSON_PATH"));
  assert.ok(digestMd.includes("codex_output_review_packet_v1"));
  assert.match(digestMd, /does \*\*not\*\* expand Runner autonomy/i);
  assert.match(digestMd, /automation_input/);
  assert.match(digestMd, new RegExp(LAYER_SIX_READINESS_SUMMARY_CONTRACT_V1));
});

test("dashboard line does not claim Cursor/Codex/OpenAI integration", () => {
  assert.match(LAYER_SIX_READINESS_OWNER_DASHBOARD_LINE_V1, /does not integrate Cursor, Codex, or OpenAI/i);
  assert.doesNotMatch(LAYER_SIX_READINESS_OWNER_DASHBOARD_LINE_V1, /wired to Cursor/i);
  assert.doesNotMatch(LAYER_SIX_READINESS_OWNER_DASHBOARD_LINE_V1, /automation consumes/i);
});

test("contract and flags on summary object", () => {
  const s = buildLayerSixReadinessSummaryV1(buildFailurePatternRegistryReadModelFromSeededV1("t"), {
    generated_at: "t",
  });
  assert.equal(s.contract, LAYER_SIX_READINESS_SUMMARY_CONTRACT_V1);
  assert.equal(s.codex_output_review_surface_v1, "UNKNOWN");
  assert.equal(s.read_only, true);
  assert.equal(s.data_mutation, false);
  assert.equal(s.automation_input, false);
  assert.equal(s.failure_pattern_registry.guarded_count, 3);
  assert.match(
    s.proven_facts.join(" "),
    new RegExp(FAILURE_PATTERN_REGISTRY_READ_MODEL_CONTRACT_V1),
  );
});
