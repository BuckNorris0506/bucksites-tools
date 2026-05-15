import assert from "node:assert/strict";
import test from "node:test";

import { buildFounderDigestMarkdownV1 } from "../../../scripts/lib/buckparts-founder-digest-v1";
import type { FounderActionQueueRowV1 } from "./founder-action-queue-v1";
import {
  FOUNDER_DECISION_PACKET_CONTRACT_V1,
  buildFounderDecisionPacketsV1,
  formatFounderDecisionPacketsForDigestTopNV1,
} from "./founder-decision-packet-v1";
import { buildFounderExecutionPacketsV1, formatFounderExecutionPacketsForDigest } from "./founder-execution-packet-v1";

const needsOwnerFounder: FounderActionQueueRowV1 = {
  id: "queue-owner-test",
  title: "Owner ledger review",
  status: "needs_owner",
  owner_burden: "high",
  recommended_actor: "founder",
  mutation_authority: "owner_approval_required",
  evidence_basis: "fixture",
  next_action: "Approve or reject the proposed ledger change.",
};

const blockedMutating: FounderActionQueueRowV1 = {
  id: "queue-blocked-test",
  title: "Mutating gate",
  status: "blocked",
  owner_burden: "high",
  recommended_actor: "founder",
  mutation_authority: "mutating_blocked",
  evidence_basis: "fixture",
  next_action: "Clear mutating gates before agents run scripts.",
};

const agentSafe: FounderActionQueueRowV1 = {
  id: "queue-agent-safe",
  title: "Read-only agent task",
  status: "agent_safe",
  owner_burden: "low",
  recommended_actor: "agent",
  mutation_authority: "read_only",
  evidence_basis: "fixture",
  next_action: "Run lint.",
};

test("buildFounderDecisionPacketsV1 contract and read-only flags", () => {
  const m = buildFounderDecisionPacketsV1([], { source: "test" });
  assert.equal(m.contract, FOUNDER_DECISION_PACKET_CONTRACT_V1);
  assert.equal(m.read_only, true);
  assert.equal(m.data_mutation, false);
});

test("needs_owner + founder row becomes a decision packet", () => {
  const m = buildFounderDecisionPacketsV1([needsOwnerFounder], { source: "test", runner: null });
  assert.equal(m.decision_packets.length, 1);
  assert.equal(m.decision_packets[0]!.source_queue_row_id, "queue-owner-test");
  assert.match(m.decision_packets[0]!.why_jared, /requires human judgment/);
  assert.equal(m.decision_packets[0]!.blocked_until_decided, false);
});

test("blocked + mutating_blocked row becomes decision packet with blocked_until_decided", () => {
  const m = buildFounderDecisionPacketsV1([blockedMutating], { source: "test" });
  assert.equal(m.decision_packets.length, 1);
  assert.equal(m.decision_packets[0]!.blocked_until_decided, true);
  assert.match(m.decision_packets[0]!.decision_needed, /Unblock/);
});

test("agent_safe row does not become a decision packet", () => {
  const m = buildFounderDecisionPacketsV1([agentSafe, needsOwnerFounder], { source: "test" });
  assert.equal(m.decision_packets.length, 1);
  assert.equal(m.decision_packets[0]!.source_queue_row_id, "queue-owner-test");
  const skip = m.skipped_rows.find((s) => s.source_queue_row_id === "queue-agent-safe");
  assert.ok(skip?.reason.includes("agent_safe"));
});

test("NO_PACKET runner hint is woven into why_jared when provided", () => {
  const m = buildFounderDecisionPacketsV1([needsOwnerFounder], {
    source: "test",
    runner: { overall_status: "NO_PACKET" },
  });
  assert.match(m.decision_packets[0]!.why_jared, /NO_PACKET/);
});

test("digest includes Founder Decision Packets section between queue and execution packets", () => {
  const rows = [needsOwnerFounder, agentSafe];
  const decision = buildFounderDecisionPacketsV1(rows, { runner: { overall_status: "NO_PACKET" } });
  const execution = buildFounderExecutionPacketsV1(rows, { source: "digest_shape_test" });
  const md = buildFounderDigestMarkdownV1({
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
    founder_action_queue_digest_markdown: "|q|",
    founder_decision_packets_digest_markdown: formatFounderDecisionPacketsForDigestTopNV1(decision, 3),
    founder_execution_packets_digest_markdown: formatFounderExecutionPacketsForDigest(execution),
  });
  const idxQueue = md.indexOf("## Founder Action Queue (read-only v1)");
  const idxDecision = md.indexOf("## Founder Decision Packets (owner-only v1)");
  const idxExec = md.indexOf("## Founder Execution Packets (read-only v1)");
  assert.ok(idxQueue >= 0 && idxDecision > idxQueue && idxExec > idxDecision);
  assert.match(md, /owner-only v1/);
  assert.match(md, /grant agent mutation authority/i);
});

test("decision packet wording does not grant mutation authority", () => {
  const m = buildFounderDecisionPacketsV1([needsOwnerFounder], { source: "test" });
  const prohib = m.decision_packets[0]!.prohibited_actions.join("\n");
  assert.match(prohib, /does not authorize agents/i);
  assert.match(prohib, /Supabase/i);
});

test("do_not_touch + system row is skipped", () => {
  const row: FounderActionQueueRowV1 = {
    id: "queue-dnt",
    title: "Scope guard",
    status: "do_not_touch",
    owner_burden: "low",
    recommended_actor: "system",
    mutation_authority: "mutating_blocked",
    evidence_basis: "fixture",
    next_action: "Do not expand.",
  };
  const m = buildFounderDecisionPacketsV1([row], { source: "test" });
  assert.equal(m.decision_packets.length, 0);
  assert.ok(m.skipped_rows.some((s) => s.reason.includes("do_not_touch")));
});

test("waiting + agent + read_only row is skipped for decision packets", () => {
  const row: FounderActionQueueRowV1 = {
    id: "queue-wait-agent-ro",
    title: "Wait read-only",
    status: "waiting",
    owner_burden: "low",
    recommended_actor: "agent",
    mutation_authority: "read_only",
    evidence_basis: "fixture",
    next_action: "Later",
  };
  const m = buildFounderDecisionPacketsV1([row], { source: "test" });
  assert.equal(m.decision_packets.length, 0);
  assert.ok(m.skipped_rows[0]?.reason.includes("read_only"));
});
