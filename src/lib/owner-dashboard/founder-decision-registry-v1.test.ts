import assert from "node:assert/strict";
import test from "node:test";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import {
  FOUNDER_DECISION_REGISTRY_CONTRACT_V1,
  founderRegistryRowGrantsMutatingRepoAuthority,
  isFounderRegistryRowActiveMutationApproval,
  isFridgeBuyerPathBatchApprovalRegistryRowV1,
  validateFounderDecisionRegistryDocumentV1,
  validateFounderDecisionRegistryRowV1,
  type FounderDecisionRegistryRowV1,
} from "./founder-decision-registry-v1";

function minimalValidRow(
  overrides: Partial<FounderDecisionRegistryRowV1> = {},
): FounderDecisionRegistryRowV1 {
  return {
    decision_id: "decision-test-1",
    source_queue_row_id: "queue-owner-test",
    source_decision_packet_id: "decision_packet_v1:queue-owner-test",
    decided_at: "2026-05-08T12:00:00.000Z",
    decision_status: "deferred",
    owner_note: "Deferring until next week.",
    allowed_next_scope: "none",
    evidence_required_before_mutation: false,
    prohibited_actions_still_apply: ["Do not mutate production."],
    ...overrides,
  };
}

test("valid registry row parses", () => {
  const row = minimalValidRow();
  const v = validateFounderDecisionRegistryRowV1(row);
  assert.equal(v.ok, true);
  if (v.ok) assert.equal(v.row.decision_id, "decision-test-1");
});

test("invalid decision_status fails", () => {
  const v = validateFounderDecisionRegistryRowV1({ ...minimalValidRow(), decision_status: "bogus" } as unknown);
  assert.equal(v.ok, false);
  if (!v.ok) assert.ok(v.errors.some((e) => e.includes("decision_status")));
});

test("invalid allowed_next_scope fails", () => {
  const v = validateFounderDecisionRegistryRowV1({ ...minimalValidRow(), allowed_next_scope: "full_autonomy" } as unknown);
  assert.equal(v.ok, false);
  if (!v.ok) assert.ok(v.errors.some((e) => e.includes("allowed_next_scope")));
});

test("owner_mutation_approved requires non-empty owner_note", () => {
  const v = validateFounderDecisionRegistryRowV1(
    minimalValidRow({
      allowed_next_scope: "owner_mutation_approved",
      decision_status: "approved",
      owner_note: "   ",
      evidence_required_before_mutation: true,
    }),
  );
  assert.equal(v.ok, false);
  if (!v.ok) assert.ok(v.errors.some((e) => e.includes("owner_note")));
});

test("owner_mutation_approved requires evidence_required_before_mutation === true", () => {
  const v = validateFounderDecisionRegistryRowV1(
    minimalValidRow({
      allowed_next_scope: "owner_mutation_approved",
      decision_status: "approved",
      owner_note: "Approved PDP evidence attached in manual tracker.",
      evidence_required_before_mutation: false,
    }),
  );
  assert.equal(v.ok, false);
  if (!v.ok) assert.ok(v.errors.some((e) => e.includes("evidence_required_before_mutation")));
});

test("read_only_agent does not grant mutating repo authority", () => {
  const row = minimalValidRow({
    decision_status: "approved",
    allowed_next_scope: "read_only_agent",
    owner_note: "Agent may use execution packets only.",
    evidence_required_before_mutation: false,
  });
  assert.equal(founderRegistryRowGrantsMutatingRepoAuthority(row, "2026-05-10T00:00:00.000Z"), false);
  assert.equal(isFounderRegistryRowActiveMutationApproval(row, "2026-05-10T00:00:00.000Z"), false);
});

test("deferred + none is intentionally inactive for guarded apply mutation gates", () => {
  const row = minimalValidRow();
  assert.equal(row.decision_status, "deferred");
  assert.equal(row.allowed_next_scope, "none");
  assert.equal(isFounderRegistryRowActiveMutationApproval(row, "2026-06-27T20:00:00.000Z"), false);
  assert.equal(founderRegistryRowGrantsMutatingRepoAuthority(row, "2026-06-27T20:00:00.000Z"), false);
});

test("approved + owner_mutation_approved is active for guarded apply when time bounds allow", () => {
  const row = minimalValidRow({
    decision_status: "approved",
    allowed_next_scope: "owner_mutation_approved",
    owner_note: "Approve single-slug guarded CSV apply.",
    evidence_required_before_mutation: true,
  });
  assert.equal(isFounderRegistryRowActiveMutationApproval(row, "2026-06-27T20:00:00.000Z"), true);
  assert.equal(founderRegistryRowGrantsMutatingRepoAuthority(row, "2026-06-27T20:00:00.000Z"), true);
});

test("expired expires_at is not active mutation approval", () => {
  const row = minimalValidRow({
    decision_status: "approved",
    allowed_next_scope: "owner_mutation_approved",
    owner_note: "One-off mutating window documented in PR 123.",
    evidence_required_before_mutation: true,
    expires_at: "2026-05-09T00:00:00.000Z",
  });
  assert.equal(isFounderRegistryRowActiveMutationApproval(row, "2026-05-09T12:00:00.000Z"), false);
  assert.equal(isFounderRegistryRowActiveMutationApproval(row, "2026-05-08T12:00:00.000Z"), true);
});

test("past review_after is not active mutation approval", () => {
  const row = minimalValidRow({
    decision_status: "approved",
    allowed_next_scope: "owner_mutation_approved",
    owner_note: "Re-check PDP after partner reply.",
    evidence_required_before_mutation: true,
    review_after: "2026-05-10T00:00:00.000Z",
  });
  assert.equal(isFounderRegistryRowActiveMutationApproval(row, "2026-05-10T00:00:00.000Z"), false);
  assert.equal(isFounderRegistryRowActiveMutationApproval(row, "2026-05-09T23:59:59.000Z"), true);
});

test("valid registry document parses", () => {
  const doc = {
    contract: FOUNDER_DECISION_REGISTRY_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    rows: [minimalValidRow()],
  };
  const v = validateFounderDecisionRegistryDocumentV1(doc);
  assert.equal(v.ok, true);
  if (v.ok) assert.equal(v.doc.rows.length, 1);
});

test("registry document rejects wrong contract id", () => {
  const v = validateFounderDecisionRegistryDocumentV1({
    contract: "wrong_contract",
    read_only: true,
    data_mutation: false,
    rows: [],
  });
  assert.equal(v.ok, false);
  if (!v.ok) assert.ok(v.errors.some((e) => e.includes("contract")));
});

const codexApproveRow = (): unknown => ({
  decision_id: "decision-codex-approve-1",
  source_queue_row_id: "queue-amazon-agent",
  source_decision_packet_id: "codex_output_review_packet_v1:queue-amazon-agent",
  decided_at: "2026-05-16T10:00:00.000Z",
  decision_status: "approved",
  owner_note: "Accept read-only Codex findings for this queue row only.",
  allowed_next_scope: "read_only_agent",
  evidence_required_before_mutation: false,
  prohibited_actions_still_apply: ["Do not write to Supabase."],
  codex_output_review_context_v1: {
    review_packet_contract: "codex_output_review_packet_v1",
    founder_option_id: "approve_readonly_findings",
  },
});

test("codex_output_review_context_v1 approve_readonly_findings row validates", () => {
  const v = validateFounderDecisionRegistryRowV1(codexApproveRow());
  assert.equal(v.ok, true);
  if (v.ok) {
    assert.ok(v.row.codex_output_review_context_v1);
    assert.equal(v.row.codex_output_review_context_v1!.founder_option_id, "approve_readonly_findings");
    assert.equal(founderRegistryRowGrantsMutatingRepoAuthority(v.row, "2026-05-20T00:00:00.000Z"), false);
  }
});

test("codex approve_readonly_findings rejects owner_mutation_approved scope", () => {
  const raw = {
    ...(codexApproveRow() as Record<string, unknown>),
    allowed_next_scope: "owner_mutation_approved",
    evidence_required_before_mutation: true,
    owner_note: "Narrow mutation window documented outside this Codex packet.",
  };
  const v = validateFounderDecisionRegistryRowV1(raw);
  assert.equal(v.ok, false);
  if (!v.ok) assert.ok(v.errors.some((e) => /approve_readonly_findings requires/i.test(e)));
});

test("codex_output_review_context_v1 requires matching source_decision_packet_id", () => {
  const raw = {
    ...(codexApproveRow() as Record<string, unknown>),
    source_decision_packet_id: "decision_packet_v1:queue-amazon-agent",
  };
  const v = validateFounderDecisionRegistryRowV1(raw);
  assert.equal(v.ok, false);
  if (!v.ok) assert.ok(v.errors.some((e) => /codex_output_review_packet_v1:queue-amazon-agent/.test(e)));
});

test("batch_production_owner_review_context approve_for_next_planning_only validates read_only_agent only", () => {
  const v = validateFounderDecisionRegistryRowV1({
    decision_id: "decision-batch-1",
    source_queue_row_id: "queue-non-amazon-pdp-agent",
    source_decision_packet_id: "batch_owner_review_packet_v1:da97-08006b",
    decided_at: "2026-05-17T12:00:00.000Z",
    decision_status: "approved",
    owner_note: "Planning only.",
    allowed_next_scope: "read_only_agent",
    evidence_required_before_mutation: false,
    prohibited_actions_still_apply: ["Do not mutate production."],
    batch_production_owner_review_context_v1: {
      review_packet_contract: "batch_owner_screenshot_draft_packet_v1",
      founder_option_id: "approve_for_next_planning_only",
      batch_row_id: "da97-08006b",
      token: "DA97-08006B",
    },
  });
  assert.equal(v.ok, true);
  if (v.ok) {
    assert.equal(founderRegistryRowGrantsMutatingRepoAuthority(v.row, "2026-05-20T00:00:00.000Z"), false);
  }
});

test("batch approve_for_next_planning_only rejects owner_mutation_approved scope", () => {
  const v = validateFounderDecisionRegistryRowV1({
    decision_id: "decision-batch-bad",
    source_queue_row_id: "queue-non-amazon-pdp-agent",
    source_decision_packet_id: "batch_owner_review_packet_v1:da97-08006b",
    decided_at: "2026-05-17T12:00:00.000Z",
    decision_status: "approved",
    owner_note: "Bad scope.",
    allowed_next_scope: "owner_mutation_approved",
    evidence_required_before_mutation: true,
    prohibited_actions_still_apply: ["p"],
    batch_production_owner_review_context_v1: {
      review_packet_contract: "batch_owner_screenshot_draft_packet_v1",
      founder_option_id: "approve_for_next_planning_only",
      batch_row_id: "da97-08006b",
      token: "DA97-08006B",
    },
  });
  assert.equal(v.ok, false);
  if (!v.ok) assert.ok(v.errors.some((e) => /approve_for_next_planning_only requires/i.test(e)));
});

test("request_followup_readonly codex row requires needs_more_evidence + read_only_agent", () => {
  const v = validateFounderDecisionRegistryRowV1({
    decision_id: "d2",
    source_queue_row_id: "queue-amazon-agent",
    source_decision_packet_id: "codex_output_review_packet_v1:queue-amazon-agent",
    decided_at: "2026-05-16T11:00:00.000Z",
    decision_status: "needs_more_evidence",
    owner_note: "Run another bounded read-only Codex pass.",
    allowed_next_scope: "read_only_agent",
    evidence_required_before_mutation: false,
    prohibited_actions_still_apply: ["p"],
    codex_output_review_context_v1: {
      review_packet_contract: "codex_output_review_packet_v1",
      founder_option_id: "request_followup_readonly",
    },
  });
  assert.equal(v.ok, true);
});

test("fridge buyer-path apply-plan approval context requires read_only_agent for planning approve", () => {
  const v = validateFounderDecisionRegistryRowV1({
    ...minimalValidRow(),
    decision_status: "approved",
    allowed_next_scope: "read_only_agent",
    source_decision_packet_id:
      "fridge_buyer_path_batch_apply_plan_approval_v1:data/fridge/batch-production/apply-plans/fridge-buyer-path-batch-apply-plan-v1-test.json",
    fridge_buyer_path_batch_apply_plan_approval_context_v1: {
      review_packet_contract: "fridge_buyer_path_batch_apply_plan_approval_v1",
      founder_option_id: "approve_for_next_planning_only",
      source_apply_plan_artifact_rel_path:
        "data/fridge/batch-production/apply-plans/fridge-buyer-path-batch-apply-plan-v1-test.json",
      planned_change_count: 14,
    },
  });
  assert.equal(v.ok, true);
  if (v.ok) {
    assert.equal(v.row.allowed_next_scope, "read_only_agent");
    assert.notEqual(v.row.allowed_next_scope, "owner_mutation_approved");
  }
});

test("fridge buyer-path batch approval context requires read_only_agent for planning approve", () => {
  const v = validateFounderDecisionRegistryRowV1({
    ...minimalValidRow(),
    decision_status: "approved",
    allowed_next_scope: "read_only_agent",
    source_decision_packet_id:
      "fridge_buyer_path_batch_approval_v1:fridge-buyer-path-batch-proposal-v1-test",
    fridge_buyer_path_batch_approval_context_v1: {
      review_packet_contract: "fridge_buyer_path_batch_approval_v1",
      founder_option_id: "approve_for_next_planning_only",
      proposed_batch_id: "fridge-buyer-path-batch-proposal-v1-test",
    },
  });
  assert.equal(v.ok, true);
  if (v.ok) {
    assert.equal(v.row.allowed_next_scope, "read_only_agent");
    assert.notEqual(v.row.allowed_next_scope, "owner_mutation_approved");
  }
});

test("fridge buyer-path batch approval owner-decisions artifact validates as registry document", () => {
  const artifactPath = path.join(
    process.cwd(),
    "data/owner-decisions/fridge-buyer-path-batch-approval-v1.json",
  );
  const embedded = {
    contract: FOUNDER_DECISION_REGISTRY_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    rows: [
      {
        decision_id: "decision-2026-05-31-fridge-buyer-path-batch-fridge-buyer-path-batch-proposal-v1-0fec4a7b623a",
        source_queue_row_id: "queue-fridge-buyer-path-batch-proposal-v1",
        source_decision_packet_id:
          "fridge_buyer_path_batch_approval_v1:fridge-buyer-path-batch-proposal-v1-0fec4a7b623a",
        decided_at: "2026-05-31T06:33:19.430Z",
        decision_status: "approved",
        owner_note: "Planning-only approval.",
        allowed_next_scope: "read_only_agent",
        evidence_required_before_mutation: false,
        prohibited_actions_still_apply: ["No Supabase."],
        fridge_buyer_path_batch_approval_context_v1: {
          review_packet_contract: "fridge_buyer_path_batch_approval_v1",
          founder_option_id: "approve_for_next_planning_only",
          proposed_batch_id: "fridge-buyer-path-batch-proposal-v1-0fec4a7b623a",
        },
      },
    ],
  };
  const parsed = existsSync(artifactPath)
    ? (JSON.parse(readFileSync(artifactPath, "utf8")) as unknown)
    : embedded;
  const v = validateFounderDecisionRegistryDocumentV1(parsed);
  assert.equal(v.ok, true);
  if (!v.ok) return;
  assert.equal(v.doc.rows.length, 1);
  const row = v.doc.rows[0]!;
  assert.ok(isFridgeBuyerPathBatchApprovalRegistryRowV1(row));
  assert.equal(
    row.source_decision_packet_id,
    "fridge_buyer_path_batch_approval_v1:fridge-buyer-path-batch-proposal-v1-0fec4a7b623a",
  );
  assert.equal(row.allowed_next_scope, "read_only_agent");
  assert.equal(isFounderRegistryRowActiveMutationApproval(row, "2026-05-31T12:00:00.000Z"), false);
  assert.equal(founderRegistryRowGrantsMutatingRepoAuthority(row, "2026-05-31T12:00:00.000Z"), false);
});
