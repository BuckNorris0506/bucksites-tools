/**
 * Founder Decision Packet v1 — read-only structured owner decisions for queue rows that are not agent-safe execution candidates.
 * PROVEN: does not invoke agents, npm, or external tools; pure builder from Founder Action Queue rows (+ optional Runner Step status).
 */

import type { FounderActionQueueRowV1 } from "./founder-action-queue-v1";
import {
  RUNNER_EXPECTED_DEFAULT_PROHIBITED_ACTION_LINES_V1,
} from "../../../scripts/lib/buckparts-runner-safety-contract-v1";

export const FOUNDER_DECISION_PACKET_CONTRACT_V1 = "founder_decision_packet_v1" as const;

export type FounderDecisionPacketRunnerHintV1 = {
  /** From `buckparts_runner_step_v1.overall_status` when available (e.g. digest CI). */
  overall_status: string;
};

export type FounderDecisionPacketContextV1 = {
  generated_at?: string;
  source?: string;
  /** When Runner Step JSON was produced in the same pipeline (optional). */
  runner?: FounderDecisionPacketRunnerHintV1 | null;
};

export type FounderDecisionPacketOptionV1 = {
  id: string;
  label: string;
};

export type FounderDecisionPacketV1 = {
  id: string;
  source_queue_row_id: string;
  title: string;
  decision_needed: string;
  why_jared: string;
  evidence_basis: string;
  blocked_until_decided: boolean;
  options: FounderDecisionPacketOptionV1[];
  recommended_next_prompt_or_command: string;
  prohibited_actions: readonly string[];
};

export type FounderDecisionPacketSkippedRowV1 = {
  source_queue_row_id: string;
  reason: string;
};

export type FounderDecisionPacketsResultV1 = {
  contract: typeof FOUNDER_DECISION_PACKET_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  decision_packets: FounderDecisionPacketV1[];
  skipped_rows: FounderDecisionPacketSkippedRowV1[];
};

function defaultProhibitedActions(): readonly string[] {
  return [
    ...RUNNER_EXPECTED_DEFAULT_PROHIBITED_ACTION_LINES_V1,
    "This decision packet does not authorize agents to mutate production data or bypass queue mutation posture.",
  ];
}

function rowEligibleForDecisionPacket(row: FounderActionQueueRowV1): boolean {
  if (row.status === "agent_safe") {
    return false;
  }
  if (row.status === "do_not_touch") {
    return row.recommended_actor === "founder";
  }
  if (row.status !== "needs_owner" && row.status !== "blocked" && row.status !== "waiting") {
    return false;
  }
  if (row.recommended_actor === "system") {
    return false;
  }
  if (row.recommended_actor === "founder" || row.recommended_actor === "external") {
    return true;
  }
  if (row.recommended_actor === "agent") {
    return row.mutation_authority === "owner_approval_required" || row.mutation_authority === "mutating_blocked";
  }
  return false;
}

function skipReasonForRow(row: FounderActionQueueRowV1): string {
  if (row.status === "agent_safe") {
    return 'status is "agent_safe" (use founder_execution_packet_v1 for agent read-only prompts)';
  }
  if (row.status === "do_not_touch" && row.recommended_actor !== "founder") {
    return "do_not_touch scope guard without founder actor — no owner decision packet (by policy)";
  }
  if (row.recommended_actor === "system") {
    return "recommended_actor is system (automation posture only)";
  }
  if (row.recommended_actor === "agent" && row.mutation_authority === "read_only") {
    return "agent + read_only waiting/queue row — not an owner decision packet (monitor or execution packet lane)";
  }
  return "Row did not satisfy founder_decision_packet_v1 eligibility (unexpected).";
}

function blockedUntilDecided(row: FounderActionQueueRowV1): boolean {
  if (row.status === "blocked") return true;
  if (row.mutation_authority === "mutating_blocked") return true;
  if (row.status === "waiting" && row.mutation_authority !== "read_only") return true;
  return false;
}

function buildOptions(row: FounderActionQueueRowV1): FounderDecisionPacketOptionV1[] {
  const base: FounderDecisionPacketOptionV1[] = [
    { id: "ack_read", label: "Acknowledge scope, capture decision in notes/PR (no mutating scripts)." },
    { id: "delegate_readonly", label: "Delegate read-only investigation only (lint/build/operator-proof) — no DB or affiliate changes." },
    { id: "defer", label: "Defer until Command Center / gates change; re-run digest after." },
  ];
  if (row.status === "blocked" || row.mutation_authority === "mutating_blocked") {
    base.unshift({
      id: "unblock_first",
      label: "Resolve mutating gates / owner approvals first, then re-open agent coordination for this row.",
    });
  }
  return base.slice(0, 4);
}

function buildWhyJared(row: FounderActionQueueRowV1, runner: FounderDecisionPacketRunnerHintV1 | null | undefined): string {
  const parts: string[] = [
    `Queue status \`${row.status}\` with actor \`${row.recommended_actor}\` and mutation posture \`${row.mutation_authority}\` requires human judgment before any agent expands scope.`,
  ];
  if (runner?.overall_status === "NO_PACKET") {
    parts.push(
      "**PROVEN:** Runner Step v1 reported `overall_status=NO_PACKET` (no agent-safe execution packet selected) — owner decisions are the structured next step for non-delegated queue rows.",
    );
  }
  return parts.join(" ");
}

function buildDecisionNeeded(row: FounderActionQueueRowV1): string {
  if (row.status === "blocked") {
    return `Unblock or re-scope: ${row.title}`;
  }
  if (row.status === "waiting") {
    return `Decide dependency / sequencing: ${row.title}`;
  }
  return `Owner decision: ${row.title}`;
}

function buildRecommendedPrompt(row: FounderActionQueueRowV1): string {
  return [
    "Re-read this queue row in the Owner dashboard or Command Center JSON, then either:",
    "1) Record an explicit owner decision (approve / reject / defer) outside mutating automation, or",
    "2) Run read-only validation only: `npm run lint`, `npm run build`, `npm run buckparts:operator-proof` from repo root after any code change.",
    "",
    `Queue row id: \`${row.id}\` · next_action (authoritative text): ${row.next_action}`,
  ].join("\n");
}

export function buildFounderDecisionPacketsV1(
  rows: FounderActionQueueRowV1[],
  context?: FounderDecisionPacketContextV1,
): FounderDecisionPacketsResultV1 {
  const decision_packets: FounderDecisionPacketV1[] = [];
  const skipped_rows: FounderDecisionPacketSkippedRowV1[] = [];
  const runner = context?.runner ?? null;

  for (const row of rows) {
    if (rowEligibleForDecisionPacket(row)) {
      const prohibited_actions = defaultProhibitedActions();
      decision_packets.push({
        id: `decision_packet_v1:${row.id}`,
        source_queue_row_id: row.id,
        title: row.title,
        decision_needed: buildDecisionNeeded(row),
        why_jared: buildWhyJared(row, runner),
        evidence_basis: row.evidence_basis,
        blocked_until_decided: blockedUntilDecided(row),
        options: buildOptions(row),
        recommended_next_prompt_or_command: buildRecommendedPrompt(row),
        prohibited_actions,
      });
    } else {
      skipped_rows.push({ source_queue_row_id: row.id, reason: skipReasonForRow(row) });
    }
  }

  return {
    contract: FOUNDER_DECISION_PACKET_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    decision_packets,
    skipped_rows,
  };
}

/** Markdown fragment for founder digest: top N decision packets only (concise). */
export function formatFounderDecisionPacketsForDigestTopNV1(
  model: FounderDecisionPacketsResultV1,
  maxPackets: number,
): string {
  const n = Math.max(0, Math.min(maxPackets, model.decision_packets.length));
  const lines: string[] = [
    `**PROVEN:** Contract \`${model.contract}\` · read_only=\`${String(model.read_only)}\` · data_mutation=\`${String(model.data_mutation)}\`.`,
    "**PROVEN:** These are **owner-only** structured decisions — they do **not** grant agent mutation authority or replace `founder_execution_packet_v1` (agent-safe read-only prompts).",
    `**PROVEN:** Showing top ${n} of ${model.decision_packets.length} decision packet(s); ${model.skipped_rows.length} queue row(s) did not qualify.`,
    "",
  ];
  if (n === 0) {
    lines.push(
      "**PROVEN:** No owner decision packets for this snapshot (no `needs_owner` / `blocked` / `waiting` rows that met founder|external actor rules, or only `agent_safe` / scope-guard rows present).",
      "",
    );
    return `${lines.join("\n")}\n`;
  }
  for (const p of model.decision_packets.slice(0, n)) {
    lines.push(`### ${p.title}`, `**Queue row:** \`${p.source_queue_row_id}\` · **Blocked until decided:** \`${String(p.blocked_until_decided)}\``, "");
    lines.push(`**Decision needed:** ${p.decision_needed}`, "");
    lines.push(`**Why Jared:** ${p.why_jared}`, "");
    lines.push("**Options (pick one posture — not automatic execution):**");
    for (const o of p.options) {
      lines.push(`- \`${o.id}\`: ${o.label}`);
    }
    lines.push("", "**Recommended next prompt / command:**", "```text", p.recommended_next_prompt_or_command.trimEnd(), "```", "");
    lines.push("**Prohibited (still applies):**", ...p.prohibited_actions.slice(0, 4).map((x) => `- ${x}`), "");
  }
  return `${lines.join("\n")}\n`;
}
