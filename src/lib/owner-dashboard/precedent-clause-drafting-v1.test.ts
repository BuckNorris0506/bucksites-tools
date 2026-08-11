import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";

import {
  PRECEDENT_CLAUSE_DRAFTING_CONTRACT_V1,
  appendPrecedentClauseToDraftV1,
  buildPrecedentClauseDraftingV1,
  loadClosedOarPrecedentSubstratesV1,
  oarMatchesPrecedentClassV1,
  precedentClassForFounderQueueRowV1,
  precedentClassForOwnerDecisionRequestV1,
  type ClosedOarPrecedentSubstrateV1,
} from "./precedent-clause-drafting-v1";
import { buildFounderDecisionPacketsV1 } from "./founder-decision-packet-v1";
import type { FounderActionQueueRowV1 } from "./founder-action-queue-v1";
import { buildOwnerDecisionRequestFromRunnerHaltV1 } from "./owner-decision-queue-v1";

const sampleClosed: ClosedOarPrecedentSubstrateV1 = {
  decision_id: "decision-codex-followup",
  decision_status: "needs_more_evidence",
  decided_at: "2026-05-16T14:26:25.000Z",
  source_queue_row_id: "queue-amazon-agent",
  source_decision_packet_id: "codex_output_review_packet_v1:queue-amazon-agent",
  source_path: "data/owner-decisions/example.json",
};

test("authority locks and contract are fail-closed non-steering", () => {
  const clause = buildPrecedentClauseDraftingV1({
    decision_class: "queue-amazon-agent",
    closed_oar_rows: [],
  });
  assert.equal(clause.contract, PRECEDENT_CLAUSE_DRAFTING_CONTRACT_V1);
  assert.equal(clause.read_only, true);
  assert.equal(clause.data_mutation, false);
  assert.equal(clause.mutation_authorized, false);
  assert.equal(clause.steering_authority, false);
  assert.equal(clause.nba_authority, false);
  assert.equal(clause.dispatch_authority, false);
  assert.equal(clause.daily_operator_authority, false);
  assert.equal(clause.command_center_authority, false);
  assert.equal(clause.behavior_change, false);
  assert.equal(clause.weights_changed, "NONE");
});

test("zero closures render exact NONE template — does not invent history", () => {
  const clause = buildPrecedentClauseDraftingV1({
    decision_class: "queue-never-seen",
    closed_oar_rows: [sampleClosed],
  });
  assert.equal(clause.closed_precedent_count, 0);
  assert.equal(
    clause.precedent_clause,
    [
      "Closed precedents: NONE (zero closures)",
      "Weights changed: NONE",
      "Difference: FIRST CLOSED DECISION OF THIS CLASS",
    ].join("\n"),
  );
});

test("missing substrate does not invent zero closures", () => {
  const clause = buildPrecedentClauseDraftingV1({
    decision_class: "queue-amazon-agent",
  });
  assert.match(clause.precedent_clause, /UNKNOWN \(closed OAR substrate not supplied to draft\)/);
  assert.match(clause.precedent_clause, /Weights changed since:\nNONE/);
  assert.ok(clause.unknown_facts.length > 0);
});

test("closed precedents of matching class are listed; weights stay NONE", () => {
  const clause = buildPrecedentClauseDraftingV1({
    decision_class: "queue-amazon-agent",
    closed_oar_rows: [sampleClosed],
    current: { recommended_option: "approve_readonly_findings", draft_status: "open" },
  });
  assert.equal(clause.closed_precedent_count, 1);
  assert.match(clause.precedent_clause, /^Closed precedents of this class:/m);
  assert.match(clause.precedent_clause, /decision_id=decision-codex-followup/);
  assert.match(clause.precedent_clause, /Weights changed since:\nNONE/);
  assert.match(clause.precedent_clause, /This differs because:/);
  assert.match(clause.precedent_clause, /current draft is open/);
  assert.doesNotMatch(clause.precedent_clause, /because the founder felt/i);
});

test("class match accepts queue id, packet id, and packet prefix", () => {
  assert.equal(
    oarMatchesPrecedentClassV1(sampleClosed, precedentClassForFounderQueueRowV1("queue-amazon-agent")),
    true,
  );
  assert.equal(oarMatchesPrecedentClassV1(sampleClosed, "codex_output_review_packet_v1"), true);
  assert.equal(
    oarMatchesPrecedentClassV1(sampleClosed, "codex_output_review_packet_v1:queue-amazon-agent"),
    true,
  );
  assert.equal(oarMatchesPrecedentClassV1(sampleClosed, "other-class"), false);
});

test("appendPrecedentClauseToDraftV1 appends drafting block without changing authority fields", () => {
  const appended = appendPrecedentClauseToDraftV1({
    draft_body: "Recommend owner review.",
    decision_class: "queue-never-seen",
    closed_oar_rows: [],
  });
  assert.match(appended.draft_body, /^Recommend owner review\./);
  assert.match(appended.draft_body, /Precedent Clause \(read-only drafting discipline\)/);
  assert.match(appended.draft_body, /FIRST CLOSED DECISION OF THIS CLASS/);
  assert.equal(appended.clause.nba_authority, false);
});

test("founder decision packets append Precedent Clause when OARs supplied", () => {
  const row: FounderActionQueueRowV1 = {
    id: "queue-amazon-agent",
    title: "Amazon agent review",
    status: "needs_owner",
    owner_burden: "high",
    recommended_actor: "founder",
    mutation_authority: "owner_approval_required",
    evidence_basis: "fixture",
    next_action: "Review Codex output.",
  };
  const withMatch = buildFounderDecisionPacketsV1([row], {
    source: "test",
    closed_oar_rows: [sampleClosed],
  });
  assert.match(
    withMatch.decision_packets[0]!.recommended_next_prompt_or_command,
    /Closed precedents of this class:/,
  );
  assert.match(
    withMatch.decision_packets[0]!.recommended_next_prompt_or_command,
    /decision_id=decision-codex-followup/,
  );

  const withoutSubstrate = buildFounderDecisionPacketsV1([row], { source: "test" });
  assert.match(
    withoutSubstrate.decision_packets[0]!.recommended_next_prompt_or_command,
    /UNKNOWN \(closed OAR substrate not supplied to draft\)/,
  );
});

test("ODR builder embeds precedent_clause; status/recommended_option unchanged", () => {
  const req = buildOwnerDecisionRequestFromRunnerHaltV1({
    missionId: "production_mission_v1",
    runId: "run-1",
    stepId: "guarded_apply_primary",
    stepProvenance: "test",
    haltReason: "FOUNDER_APPROVAL_REQUIRED",
    haltDetail: "dry-run ready",
    parsedJson: null,
    closed_oar_rows: [],
  });
  assert.equal(req.recommended_option, "approve_owner_mutation");
  assert.equal(req.status, "PENDING_OWNER_DECISION");
  assert.ok(req.precedent_clause);
  assert.match(req.precedent_clause!, /FIRST CLOSED DECISION OF THIS CLASS/);
  assert.equal(
    precedentClassForOwnerDecisionRequestV1(req.decision_type).startsWith("owner_decision_request_v1:"),
    true,
  );
});

test("loadClosedOarPrecedentSubstratesV1 reads existing registry OARs only", () => {
  const root = mkdtempSync(path.join(tmpdir(), "bp-precedent-"));
  mkdirSync(path.join(root, "data/owner-decisions"), { recursive: true });
  writeFileSync(
    path.join(root, "data/owner-decisions/closed-oar.json"),
    JSON.stringify({
      contract: "founder_decision_registry_v1",
      read_only: true,
      data_mutation: false,
      rows: [
        {
          decision_id: "decision-load-1",
          source_queue_row_id: "queue-load",
          source_decision_packet_id: "decision_packet_v1:queue-load",
          decided_at: "2026-08-01T00:00:00.000Z",
          decision_status: "approved",
          owner_note: "Approved for planning.",
          allowed_next_scope: "read_only_agent",
          evidence_required_before_mutation: false,
          prohibited_actions_still_apply: ["Do not mutate production."],
        },
      ],
    }),
  );
  const loaded = loadClosedOarPrecedentSubstratesV1(root);
  assert.equal(loaded.length, 1);
  assert.equal(loaded[0]?.decision_id, "decision-load-1");
});
