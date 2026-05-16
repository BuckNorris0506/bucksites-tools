import assert from "node:assert/strict";
import test from "node:test";

import {
  FOUNDER_DECISION_REGISTRY_CONTRACT_V1,
  isCodexOutputReviewRegistryRowV1,
  validateFounderDecisionRegistryRowV1,
} from "./founder-decision-registry-v1";
import {
  buildFounderDecisionRegistryReadModelV1,
  formatFounderDecisionRegistryReadModelDigestMarkdownV1,
  FOUNDER_DECISION_REGISTRY_READ_MODEL_CONTRACT_V1,
  type FounderDecisionRegistryReadModelFileInputV1,
} from "./founder-decision-registry-read-model-v1";

const ref = "2026-05-10T12:00:00.000Z";
const gen = "2026-05-10T12:00:00.000Z";

function validRowDoc(rows: unknown[]): { contract: string; read_only: boolean; data_mutation: boolean; rows: unknown[] } {
  return {
    contract: FOUNDER_DECISION_REGISTRY_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    rows,
  };
}

test("no file inputs yields valid zero-row read model with UNKNOWN filesystem fact", () => {
  const m = buildFounderDecisionRegistryReadModelV1([], { generated_at: gen, reference_time_iso: ref });
  assert.equal(m.contract, FOUNDER_DECISION_REGISTRY_READ_MODEL_CONTRACT_V1);
  assert.equal(m.read_only, true);
  assert.equal(m.data_mutation, false);
  assert.equal(m.total_documents, 0);
  assert.equal(m.total_rows, 0);
  assert.equal(m.valid_rows, 0);
  assert.equal(m.invalid_rows, 0);
  assert.equal(m.active_mutation_approvals, 0);
  assert.equal(m.codex_output_review_decision_rows, 0);
  assert.equal(m.approved_readonly_findings_count, 0);
  assert.equal(m.rejected_findings_count, 0);
  assert.equal(m.request_followup_readonly_count, 0);
  assert.equal(m.deferred_review_count, 0);
  assert.equal(m.codex_output_review_digest_match.kind, "NO_DIGEST_CODEX_REVIEW_CONTEXT");
  assert.ok(m.unknown_facts.some((u) => /UNKNOWN.*owner-decisions/i.test(u)));
});

test("valid document rows are counted and classified", () => {
  const doc = validRowDoc([
    {
      decision_id: "d1",
      source_queue_row_id: "q1",
      source_decision_packet_id: "decision_packet_v1:q1",
      decided_at: "2026-05-01T00:00:00.000Z",
      decision_status: "approved",
      owner_note: "OK for read-only agents only.",
      allowed_next_scope: "read_only_agent",
      evidence_required_before_mutation: false,
      prohibited_actions_still_apply: ["No Supabase."],
    },
    {
      decision_id: "d2",
      source_queue_row_id: "q2",
      source_decision_packet_id: "decision_packet_v1:q2",
      decided_at: "2026-05-02T00:00:00.000Z",
      decision_status: "deferred",
      owner_note: "Partner portal.",
      allowed_next_scope: "human_external",
      evidence_required_before_mutation: false,
      prohibited_actions_still_apply: ["No affiliate URL edits."],
    },
  ]);
  const files: FounderDecisionRegistryReadModelFileInputV1[] = [{ source: "data/owner-decisions/a.json", parsed: doc }];
  const m = buildFounderDecisionRegistryReadModelV1(files, { generated_at: gen, reference_time_iso: ref });
  assert.equal(m.total_documents, 1);
  assert.equal(m.total_rows, 2);
  assert.equal(m.valid_rows, 2);
  assert.equal(m.invalid_rows, 0);
  assert.equal(m.read_only_agent_rows, 1);
  assert.equal(m.human_external_rows, 1);
  assert.equal(m.active_mutation_approvals, 0);
  assert.equal(m.latest_decisions[0]!.decision_id, "d2");
});

test("invalid rows in salvage path are reported without throwing", () => {
  const badEnvelope = {
    contract: "wrong",
    read_only: true,
    data_mutation: false,
    rows: [
      {
        decision_id: "ok",
        source_queue_row_id: "q",
        source_decision_packet_id: "decision_packet_v1:q",
        decided_at: "2026-05-01T00:00:00.000Z",
        decision_status: "approved",
        owner_note: "x",
        allowed_next_scope: "none",
        evidence_required_before_mutation: false,
        prohibited_actions_still_apply: ["p"],
      },
      { decision_id: "bad" },
    ],
  };
  const m = buildFounderDecisionRegistryReadModelV1(
    [{ source: "data/owner-decisions/mixed.json", parsed: badEnvelope }],
    { generated_at: gen, reference_time_iso: ref },
  );
  assert.equal(m.total_rows, 2);
  assert.equal(m.valid_rows, 1);
  assert.equal(m.invalid_rows, 1);
  assert.equal(m.invalid_row_details.length, 1);
  assert.equal(m.invalid_row_details[0]!.row_index, 1);
});

test("expired time gates increment expired_or_review_due_rows, not active mutation approvals", () => {
  const doc = validRowDoc([
    {
      decision_id: "exp",
      source_queue_row_id: "q",
      source_decision_packet_id: "decision_packet_v1:q",
      decided_at: "2026-05-01T00:00:00.000Z",
      decision_status: "approved",
      owner_note: "Was approved; window closed.",
      allowed_next_scope: "owner_mutation_approved",
      evidence_required_before_mutation: true,
      expires_at: "2026-05-09T00:00:00.000Z",
      prohibited_actions_still_apply: ["p"],
    },
  ]);
  const m = buildFounderDecisionRegistryReadModelV1([{ source: "x.json", parsed: doc }], {
    generated_at: gen,
    reference_time_iso: "2026-05-10T00:00:00.000Z",
  });
  assert.equal(m.active_mutation_approvals, 0);
  assert.equal(m.expired_or_review_due_rows, 1);
});

test("active mutation approvals counted when time gates allow", () => {
  const doc = validRowDoc([
    {
      decision_id: "act",
      source_queue_row_id: "q",
      source_decision_packet_id: "decision_packet_v1:q",
      decided_at: "2026-05-09T00:00:00.000Z",
      decision_status: "approved",
      owner_note: "Explicit narrow mutating window documented.",
      allowed_next_scope: "owner_mutation_approved",
      evidence_required_before_mutation: true,
      expires_at: "2026-05-20T00:00:00.000Z",
      prohibited_actions_still_apply: ["p"],
    },
  ]);
  const m = buildFounderDecisionRegistryReadModelV1([{ source: "x.json", parsed: doc }], {
    generated_at: gen,
    reference_time_iso: "2026-05-10T00:00:00.000Z",
  });
  assert.equal(m.active_mutation_approvals, 1);
  assert.equal(m.expired_or_review_due_rows, 0);
});

test("digest markdown states counts are not consumed by automation", () => {
  const m = buildFounderDecisionRegistryReadModelV1([], { generated_at: gen, reference_time_iso: ref });
  const md = formatFounderDecisionRegistryReadModelDigestMarkdownV1(m);
  assert.match(md, /not consumed by automation/i);
  assert.match(md, /does \*\*not\*\* instruct agents/i);
});

test("JSON parse error input increments documents without row slots", () => {
  const m = buildFounderDecisionRegistryReadModelV1(
    [{ source: "data/owner-decisions/broken.json", parseError: "Unexpected token" }],
    { generated_at: gen, reference_time_iso: ref },
  );
  assert.equal(m.total_documents, 1);
  assert.equal(m.total_rows, 0);
  assert.ok(m.proven_facts.some((f) => /failed JSON\.parse/i.test(f)));
});

test("codex_output_review_context_v1 rows are counted and digest match surfaces latest for queue", () => {
  const codexApprove = {
    decision_id: "d-approve",
    source_queue_row_id: "queue-amazon-agent",
    source_decision_packet_id: "codex_output_review_packet_v1:queue-amazon-agent",
    decided_at: "2026-05-16T08:00:00.000Z",
    decision_status: "approved",
    owner_note: "OK read-only.",
    allowed_next_scope: "read_only_agent",
    evidence_required_before_mutation: false,
    prohibited_actions_still_apply: ["p"],
    codex_output_review_context_v1: {
      review_packet_contract: "codex_output_review_packet_v1",
      founder_option_id: "approve_readonly_findings",
    },
  };
  const codexFollowUp = {
    decision_id: "d-follow",
    source_queue_row_id: "queue-amazon-agent",
    source_decision_packet_id: "codex_output_review_packet_v1:queue-amazon-agent",
    decided_at: "2026-05-16T09:00:00.000Z",
    decision_status: "needs_more_evidence",
    owner_note: "Another pass.",
    allowed_next_scope: "read_only_agent",
    evidence_required_before_mutation: false,
    prohibited_actions_still_apply: ["p"],
    codex_output_review_context_v1: {
      review_packet_contract: "codex_output_review_packet_v1",
      founder_option_id: "request_followup_readonly",
    },
  };
  const doc = validRowDoc([codexApprove, codexFollowUp]);
  const files: FounderDecisionRegistryReadModelFileInputV1[] = [{ source: "data/owner-decisions/codex.json", parsed: doc }];
  const m = buildFounderDecisionRegistryReadModelV1(files, {
    generated_at: gen,
    reference_time_iso: ref,
    codex_output_review_digest_match: { source_queue_row_id: "queue-amazon-agent" },
  });
  assert.equal(m.codex_output_review_decision_rows, 2);
  assert.equal(m.approved_readonly_findings_count, 1);
  assert.equal(m.request_followup_readonly_count, 1);
  assert.equal(m.rejected_findings_count, 0);
  assert.equal(m.deferred_review_count, 0);
  assert.equal(m.codex_output_review_digest_match.kind, "MATCHED");
  if (m.codex_output_review_digest_match.kind === "MATCHED") {
    assert.equal(m.codex_output_review_digest_match.codex_output_review_founder_option_id, "request_followup_readonly");
    assert.equal(m.codex_output_review_digest_match.decision_id, "d-follow");
  }
  const rows = doc.rows as unknown[];
  const v0 = validateFounderDecisionRegistryRowV1(rows[0]);
  assert.equal(v0.ok, true);
  if (v0.ok) assert.ok(isCodexOutputReviewRegistryRowV1(v0.row));
  const md = formatFounderDecisionRegistryReadModelDigestMarkdownV1(m);
  assert.match(md, /Latest matching row/);
  assert.match(md, /request_followup_readonly/);
  assert.match(md, /read visibility\*\* of owner judgment/i);
});
