import assert from "node:assert/strict";
import test from "node:test";

import {
  FOUNDER_DECISION_REGISTRY_CONTRACT_V1,
  founderRegistryRowGrantsMutatingRepoAuthority,
  isFounderRegistryRowActiveMutationApproval,
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
