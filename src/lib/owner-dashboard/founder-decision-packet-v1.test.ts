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
  assert.match(m.decision_packets[0]!.why_jared, /PROVEN:.*Queue status/);
  assert.equal(m.decision_packets[0]!.blocked_until_decided, false);
});

test("blocked + mutating_blocked row becomes decision packet with blocked_until_decided", () => {
  const row: FounderActionQueueRowV1 = {
    id: "queue-mutating-gate",
    title: "Mutating scripts · gate active",
    status: "blocked",
    owner_burden: "high",
    recommended_actor: "founder",
    mutation_authority: "mutating_blocked",
    evidence_basis: "Command Center execution_guidance.mutating_blocked + mutating_block_reasons",
    next_action: "Gate A · Gate B",
  };
  const m = buildFounderDecisionPacketsV1([row], { source: "test" });
  assert.equal(m.decision_packets.length, 1);
  assert.equal(m.decision_packets[0]!.blocked_until_decided, true);
  assert.match(m.decision_packets[0]!.decision_needed, /mutating execution gates/i);
  assert.match(m.decision_packets[0]!.recommended_next_prompt_or_command, /Runner Step allowlist/i);
  assert.ok(m.decision_packets[0]!.options.some((o) => o.id === "read_only_until_cleared"));
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

test("queue-human-browser row gets exact-token / human-browser-specific shaping", () => {
  const row: FounderActionQueueRowV1 = {
    id: "queue-human-browser",
    title: "Amazon PDP · human browser",
    status: "needs_owner",
    owner_burden: "high",
    recommended_actor: "founder",
    mutation_authority: "owner_approval_required",
    evidence_basis: "command_center_v2.human_browser_required_tokens",
    next_action: "Verify OEM token ABC-123 on Amazon PDP.",
  };
  const m = buildFounderDecisionPacketsV1([row], { source: "test" });
  const p = m.decision_packets[0]!;
  assert.match(p.decision_needed, /human-browser|exact OEM|exact-token/i);
  assert.match(p.why_jared, /human_browser_required_tokens|IDE agent cannot|exact-token/i);
  assert.ok(p.options.some((o) => o.id === "browser_exact_tokens"));
  assert.match(p.recommended_next_prompt_or_command, /exact token|exact OEM|exact-token/i);
  assert.match(p.recommended_next_prompt_or_command, /agents must not assert PDP truth|do not ask an agent/i);
});

test("queue-affiliate row stresses external-account work, not in-repo application submission", () => {
  const row: FounderActionQueueRowV1 = {
    id: "queue-affiliate",
    title: "Affiliate readiness",
    status: "needs_owner",
    owner_burden: "high",
    recommended_actor: "external",
    mutation_authority: "owner_approval_required",
    evidence_basis: "command_center_v2.affiliate_readiness",
    next_action: "Complete partner tax profile.",
  };
  const m = buildFounderDecisionPacketsV1([row], { source: "test" });
  const p = m.decision_packets[0]!;
  assert.match(p.why_jared, /outside this repository|external affiliate|submits applications|submits.*credentials/i);
  assert.ok(p.options.some((o) => o.id === "external_portal_owner"));
  assert.ok(p.options.some((o) => o.id === "read_only_tracker_only"));
  assert.match(p.recommended_next_prompt_or_command, /external.*affiliate|read-only.*tracker/i);
});

test("queue-next-best row separates owner direction from agent execution (no mutation authority)", () => {
  const row: FounderActionQueueRowV1 = {
    id: "queue-next-best",
    title: "Strategic next best",
    status: "needs_owner",
    owner_burden: "high",
    recommended_actor: "founder",
    mutation_authority: "owner_approval_required",
    evidence_basis: "command_center_v2.next_best_action",
    next_action: "Ship read-only polish then revisit monetization.",
  };
  const m = buildFounderDecisionPacketsV1([row], { source: "test" });
  const p = m.decision_packets[0]!;
  assert.match(p.decision_needed, /strategic direction|owner judgment|not an agent execution order/i);
  assert.match(p.recommended_next_prompt_or_command, /does \*\*not\*\* grant mutation authority|founder_execution_packet_v1/i);
  const prohib = p.prohibited_actions.join("\n");
  assert.match(prohib, /does not authorize agents/i);
});

test("generic queue row (non-stable id) still produces fallback owner packet", () => {
  const m = buildFounderDecisionPacketsV1([needsOwnerFounder], { source: "test" });
  const p = m.decision_packets[0]!;
  assert.match(p.recommended_next_prompt_or_command, /Generic owner decision row/i);
  assert.match(p.why_jared, /authoritative free-text cue/i);
  assert.ok(p.options.some((o) => o.id === "ack_scope_notes"));
});
