import assert from "node:assert/strict";
import test from "node:test";

import {
  RUNNER_EXPECTED_DEFAULT_PROHIBITED_ACTION_LINES_V1,
} from "../../../scripts/lib/buckparts-runner-safety-contract-v1";
import type { FounderActionQueueRowV1 } from "./founder-action-queue-v1";
import {
  FOUNDER_EXECUTION_PACKET_CONTRACT_V1,
  buildFounderExecutionPacketsV1,
  formatFounderExecutionPacketsForDigest,
} from "./founder-execution-packet-v1";

const agentSafeRow = (overrides?: Partial<FounderActionQueueRowV1>): FounderActionQueueRowV1 => ({
  id: "queue-amazon-agent",
  title: "Amazon rescue · read-only agent work",
  status: "agent_safe",
  owner_burden: "medium",
  recommended_actor: "agent",
  mutation_authority: "read_only",
  evidence_basis: "Command Center v2.amazon_rescue.next_agent_action (fixture)",
  next_action: "Run read-only queue audit for cohort X.",
  ...overrides,
});

test("buildFounderExecutionPacketsV1 contract and read-only flags are PROVEN", () => {
  const m = buildFounderExecutionPacketsV1([], { source: "test", generated_at: "t" });
  assert.equal(m.contract, FOUNDER_EXECUTION_PACKET_CONTRACT_V1);
  assert.equal(m.read_only, true);
  assert.equal(m.data_mutation, false);
});

test("only agent_safe + agent + read_only rows become packets; others are skipped with reasons", () => {
  const rows: FounderActionQueueRowV1[] = [
    agentSafeRow(),
    {
      id: "queue-owner",
      title: "Owner step",
      status: "needs_owner",
      owner_burden: "high",
      recommended_actor: "founder",
      mutation_authority: "owner_approval_required",
      evidence_basis: "v2",
      next_action: "Decide",
    },
    {
      id: "queue-wait",
      title: "Waiting",
      status: "waiting",
      owner_burden: "low",
      recommended_actor: "agent",
      mutation_authority: "owner_approval_required",
      evidence_basis: "v2",
      next_action: "Coordinate",
    },
    {
      id: "queue-bad-actor",
      title: "Wrong actor",
      status: "agent_safe",
      owner_burden: "low",
      recommended_actor: "system",
      mutation_authority: "read_only",
      evidence_basis: "x",
      next_action: "y",
    },
  ];
  const m = buildFounderExecutionPacketsV1(rows, { source: "test" });
  assert.equal(m.packets.length, 1);
  assert.equal(m.packets[0]!.source_queue_row_id, "queue-amazon-agent");
  assert.equal(m.skipped_rows.length, 3);
  const ownerSkip = m.skipped_rows.find((s) => s.source_queue_row_id === "queue-owner");
  assert.ok(ownerSkip?.reason.includes("agent_safe"));
  const waitSkip = m.skipped_rows.find((s) => s.source_queue_row_id === "queue-wait");
  assert.ok(waitSkip?.reason.includes("agent_safe"));
  const actorSkip = m.skipped_rows.find((s) => s.source_queue_row_id === "queue-bad-actor");
  assert.ok(actorSkip?.reason.includes("agent"));
});

test("copy_paste_prompt distinguishes sandbox inspection from external Runner/CI validation", () => {
  const m = buildFounderExecutionPacketsV1([agentSafeRow()], { source: "unit_test", generated_at: "2026-01-01" });
  const p = m.packets[0]!;
  assert.match(p.copy_paste_prompt, /## OBJECTIVE/);
  assert.match(p.copy_paste_prompt, /## TRUTH CONTRACT/);
  assert.match(p.copy_paste_prompt, /PROVEN:/);
  assert.match(p.copy_paste_prompt, /Amazon rescue · read-only agent work/);
  assert.match(p.copy_paste_prompt, /Command Center v2\.amazon_rescue/);
  assert.match(p.copy_paste_prompt, /Run read-only queue audit/);
  assert.match(p.copy_paste_prompt, /## DO NOT RUN INSIDE CODEX READ-ONLY SANDBOX/);
  assert.match(p.copy_paste_prompt, /Do \*\*not\*\* run \*\*`npm run lint`\*\*, \*\*`npm run build`\*\*, or \*\*`npm run buckparts:operator-proof`\*\* inside a read-only Codex/);
  assert.match(p.copy_paste_prompt, /## EXTERNAL REPO VALIDATION BUNDLE/);
  assert.match(p.copy_paste_prompt, /NOT CODEX SANDBOX/);
  assert.match(p.copy_paste_prompt, /## ACCEPTANCE CRITERIA \(EXTERNAL VALIDATION/);
  assert.match(p.copy_paste_prompt, /After read-only agent inspection/);
  assert.doesNotMatch(p.copy_paste_prompt, /Run the validation commands listed below/i);
  assert.doesNotMatch(p.copy_paste_prompt, /## VALIDATION COMMANDS \(repo root\)/);
  assert.match(p.copy_paste_prompt, /npm run lint/);
  assert.match(p.copy_paste_prompt, /npm run build/);
  assert.match(p.copy_paste_prompt, /npm run buckparts:operator-proof/);
  assert.match(p.copy_paste_prompt, /buckparts:runner-step/);
  assert.match(p.copy_paste_prompt, /Supabase/);
  assert.match(p.copy_paste_prompt, /retailer_links/);
  assert.ok(p.validation_command.includes("npm run lint"));
  assert.ok(p.validation_command.includes("npm run build"));
  assert.ok(p.validation_command.includes("npm run buckparts:operator-proof"));
  assert.ok(p.acceptance_criteria.length >= 3);
  assert.ok(p.prohibited_actions.length >= 3);
});

test("Runner safety: default prohibited_actions match safety contract snapshot (drift guard)", () => {
  const m = buildFounderExecutionPacketsV1([agentSafeRow()], { source: "drift_guard" });
  assert.deepStrictEqual(m.packets[0]!.prohibited_actions, [...RUNNER_EXPECTED_DEFAULT_PROHIBITED_ACTION_LINES_V1]);
});

test("Runner safety: prohibited_actions name Supabase, retailer_links, evidence path, affiliate, mutating npm", () => {
  const m = buildFounderExecutionPacketsV1([agentSafeRow()], { source: "safety_substrings" });
  const pa = m.packets[0]!.prohibited_actions.join("\n");
  assert.match(pa, /Supabase/i);
  assert.match(pa, /retailer_links/);
  assert.match(pa, /evidence JSON/i);
  assert.match(pa, /affiliate/i);
  assert.match(pa, /mutating npm/i);
});

test("mutating_blocked-style queue row (owner_approval_required mutation) never yields a packet", () => {
  const m = buildFounderExecutionPacketsV1(
    [
      agentSafeRow({
        mutation_authority: "owner_approval_required",
        recommended_actor: "agent",
        status: "agent_safe",
      }),
    ],
    {},
  );
  assert.equal(m.packets.length, 0);
  assert.equal(m.skipped_rows.length, 1);
  assert.match(m.skipped_rows[0]!.reason, /read_only/);
});

test("formatFounderExecutionPacketsForDigest uses fenced blocks and empty state PROVEN line", () => {
  const emptyMd = formatFounderExecutionPacketsForDigest(buildFounderExecutionPacketsV1([]));
  assert.match(emptyMd, /No agent-safe execution packets/);
  const withPacket = formatFounderExecutionPacketsForDigest(buildFounderExecutionPacketsV1([agentSafeRow()]));
  assert.match(withPacket, /```text/);
  assert.match(withPacket, /## OBJECTIVE/);
});
