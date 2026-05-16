/**
 * Founder Execution Packet v1 — read-only copy/paste prompts for agent-safe queue rows only.
 * PROVEN: emits packets only when queue row matches status agent_safe + recommended_actor agent + mutation_authority read_only.
 */

import type { FounderActionQueueRowV1 } from "./founder-action-queue-v1";

export const FOUNDER_EXECUTION_PACKET_CONTRACT_V1 = "founder_execution_packet_v1" as const;

export type FounderExecutionPacketKindV1 = "agent_read_only_delegate_v1";

export type FounderExecutionPacketContextV1 = {
  /** ISO or human timestamp for provenance lines in prompts. */
  generated_at?: string;
  /** Where the builder was invoked (e.g. buckparts-founder-digest, owner_dashboard). */
  source?: string;
};

export type FounderExecutionPacketSkippedRowV1 = {
  source_queue_row_id: string;
  reason: string;
};

export type FounderExecutionPacketV1 = {
  id: string;
  source_queue_row_id: string;
  title: string;
  recommended_actor: "agent";
  mutation_authority: "read_only";
  status: "agent_safe";
  packet_kind: FounderExecutionPacketKindV1;
  copy_paste_prompt: string;
  validation_command: string;
  acceptance_criteria: string[];
  prohibited_actions: string[];
  evidence_basis: string;
};

export type FounderExecutionPacketsResultV1 = {
  contract: typeof FOUNDER_EXECUTION_PACKET_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  packets: FounderExecutionPacketV1[];
  skipped_rows: FounderExecutionPacketSkippedRowV1[];
};

const DEFAULT_VALIDATION = ["npm run lint", "npm run build", "npm run buckparts:operator-proof"].join("\n");

function rowEligibleForPacket(row: FounderActionQueueRowV1): boolean {
  return row.status === "agent_safe" && row.recommended_actor === "agent" && row.mutation_authority === "read_only";
}

function skipReasonForRow(row: FounderActionQueueRowV1): string {
  const parts: string[] = [];
  if (row.status !== "agent_safe") {
    parts.push(`status is "${row.status}" (founder_execution_packet_v1 requires agent_safe)`);
  }
  if (row.recommended_actor !== "agent") {
    parts.push(`recommended_actor is "${row.recommended_actor}" (requires agent)`);
  }
  if (row.mutation_authority !== "read_only") {
    parts.push(`mutation_authority is "${row.mutation_authority}" (requires read_only)`);
  }
  return parts.length > 0 ? parts.join("; ") : "Row did not satisfy packet eligibility (unexpected).";
}

function defaultProhibitedActions(): string[] {
  return [
    "Do not write to Supabase or run SQL that mutates database state.",
    "Do not mutate retailer_links or other retailer catalog/link artifacts except pure read-only inspection.",
    "Do not create, delete, or overwrite evidence JSON under data/evidence (or parallel evidence paths) unless the founder explicitly expands scope outside this packet.",
    "Do not change affiliate program URLs, tracking parameters, or affiliate application state in-repo.",
    "Do not run mutating npm scripts (e.g. inserts, apply, mutate flags) unless the founder explicitly instructs otherwise.",
  ];
}

function defaultAcceptanceCriteria(): string[] {
  return [
    "After read-only agent inspection: **`npm run lint`** exits 0 from repo root when run **outside** Codex read-only sandbox (Runner Step, local terminal, or CI — writable `.next` / tooling caches).",
    "After read-only agent inspection: **`npm run build`** exits 0 from repo root when run **outside** Codex read-only sandbox (same surfaces as above).",
    "After read-only agent inspection: **`npm run buckparts:operator-proof`** exits 0 from repo root when run **outside** Codex read-only sandbox (repo-owned read-only proof bundle per `package.json`).",
    "All substantive read-only inspection stays within the queue row `next_action` scope and posture described in this packet.",
  ];
}

function buildCopyPastePrompt(args: {
  row: FounderActionQueueRowV1;
  context?: FounderExecutionPacketContextV1;
  acceptance_criteria: string[];
  prohibited_actions: string[];
  validation_command: string;
}): string {
  const { row, context, acceptance_criteria, prohibited_actions, validation_command } = args;
  const when = context?.generated_at?.trim() || "UNKNOWN";
  const src = context?.source?.trim() || "UNKNOWN";

  const allowed = [
    "Read and search the repository with editor/agent tools.",
    "Run **read-only** report or inspection flows that do **not** require writable `.next/*` caches, npm/tsx temp IPC, or other paths blocked in a read-only sandbox.",
    "Summarize findings in structured text: what you inspected, what you conclude at read-only scope, what remains owner-only.",
  ];

  const acLines = acceptance_criteria.map((c, i) => `${i + 1}. ${c}`).join("\n");
  const prohibLines = prohibited_actions.map((c, i) => `${i + 1}. ${c}`).join("\n");
  const allowedLines = allowed.map((c, i) => `${i + 1}. ${c}`).join("\n");

  return [
    "## OBJECTIVE",
    "Execute read-only engineering work aligned with the Founder Action Queue row below. Do not broaden scope beyond explicit guidance.",
    "",
    "## TRUTH CONTRACT",
    "- PROVEN: This prompt was produced by founder_execution_packet_v1 in the BuckParts repo (planning layer only; no I/O from the packet builder itself).",
    `- PROVEN: Packet source label: ${src}; digest/dashboard generated_at context (if any): ${when}.`,
    "- PROVEN: **`npm run lint`**, **`npm run build`**, and **`npm run buckparts:operator-proof`** are **repo-owned validation** — run on a normal writable checkout (Runner Step `npm run buckparts:runner-step`, local shell, or GitHub Actions), **not** inside Codex read-only sandbox.",
    "- INFERRED: Your local toolchain versions and network reachability match CI unless you verify otherwise.",
    "- UNKNOWN: Whether additional read-only `npm run buckparts:*` scripts beyond those listed under external validation are required; add only when next_action clearly implies them.",
    "",
    "## QUEUE ROW (AUTHORITATIVE FOR THIS TASK)",
    `- Title: ${row.title}`,
    `- evidence_basis: ${row.evidence_basis}`,
    `- next_action: ${row.next_action}`,
    "",
    "## ALLOWED ACTIONS (READ-ONLY AGENT / CODEX SANDBOX)",
    allowedLines,
    "",
    "## DO NOT RUN INSIDE CODEX READ-ONLY SANDBOX",
    "Do **not** run **`npm run lint`**, **`npm run build`**, or **`npm run buckparts:operator-proof`** inside a read-only Codex (or equivalent) sandbox for this packet. Those flows require writable `.next/cache`, `.next/trace`, npm/tsx temp IPC, and related host paths; failures there are **environment/sandbox artifacts**, not proof that the repo is invalid.",
    "",
    "## PROHIBITED ACTIONS",
    "The queue row does NOT grant permission to mutate DB, retailer_links, affiliate URLs, or evidence files. Unless the founder explicitly overrides in chat, treat the following as hard stops:",
    prohibLines,
    "",
    "## REQUIRED OUTPUT FORMAT",
    "1. Scope recap (one short paragraph tied to the queue row).",
    "2. Read-only inspection performed (paths, scripts, or searches — **not** lint/build/operator-proof inside sandbox).",
    "3. Explicit list: **which external validation commands** the operator should run outside Codex (`npm run lint`, `npm run build`, `npm run buckparts:operator-proof`, and any Runner Step bundle you recommend).",
    "4. If you attempted any command that requires writes and it failed with EPERM / `.next/*` / temp IPC errors, label that as **sandbox limitation** — do not treat it as repo-wide validation failure.",
    "5. Owner escalation list (empty if none): items that require founder decision or non-read-only work.",
    "",
    "## EXTERNAL REPO VALIDATION BUNDLE (RUNNER / LOCAL CI / FOUNDER TERMINAL — NOT CODEX SANDBOX)",
    "The commands below are **acceptance criteria** for the real checkout after read-only agent work. Execute them **outside** this read-only sandbox (e.g. `npm run buckparts:runner-step` from `scripts/buckparts-runner-step.ts`, or the same commands in CI).",
    "",
    validation_command,
    "",
    "## ACCEPTANCE CRITERIA (EXTERNAL VALIDATION — NOT CODEX SANDBOX INSTRUCTIONS)",
    acLines,
    "",
    "## CLOSING",
    "If any step would require writes to Supabase, retailer_links, affiliate state, or evidence files, STOP and ask the founder — this packet does not authorize those mutations.",
  ].join("\n");
}

export function buildFounderExecutionPacketsV1(
  rows: FounderActionQueueRowV1[],
  context?: FounderExecutionPacketContextV1,
): FounderExecutionPacketsResultV1 {
  const packets: FounderExecutionPacketV1[] = [];
  const skipped_rows: FounderExecutionPacketSkippedRowV1[] = [];

  for (const row of rows) {
    if (rowEligibleForPacket(row)) {
      const acceptance_criteria = defaultAcceptanceCriteria();
      const prohibited_actions = defaultProhibitedActions();
      const validation_command = DEFAULT_VALIDATION;
      const copy_paste_prompt = buildCopyPastePrompt({
        row,
        context,
        acceptance_criteria,
        prohibited_actions,
        validation_command,
      });
      packets.push({
        id: `execution_packet_v1:${row.id}`,
        source_queue_row_id: row.id,
        title: row.title,
        recommended_actor: "agent",
        mutation_authority: "read_only",
        status: "agent_safe",
        packet_kind: "agent_read_only_delegate_v1",
        copy_paste_prompt,
        validation_command,
        acceptance_criteria,
        prohibited_actions,
        evidence_basis: row.evidence_basis,
      });
    } else {
      skipped_rows.push({ source_queue_row_id: row.id, reason: skipReasonForRow(row) });
    }
  }

  return {
    contract: FOUNDER_EXECUTION_PACKET_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    packets,
    skipped_rows,
  };
}

/** Markdown fragment for founder digest: titles, actors, fenced prompts only. */
export function formatFounderExecutionPacketsForDigest(model: FounderExecutionPacketsResultV1): string {
  if (model.packets.length === 0) {
    return "**PROVEN:** No agent-safe execution packets were produced from this digest's Founder Action Queue (no rows with status `agent_safe`, `recommended_actor` `agent`, and `mutation_authority` `read_only`).\n";
  }
  const lines: string[] = [
    `**PROVEN:** ${model.packets.length} packet(s) from contract \`${model.contract}\` (read_only=${String(model.read_only)}, data_mutation=${String(model.data_mutation)}).`,
    `**PROVEN:** ${model.skipped_rows.length} queue row(s) did not qualify for auto-generated prompts.`,
    "",
  ];
  for (const p of model.packets) {
    lines.push(`### ${p.title}`, `**Actor:** \`${p.recommended_actor}\` · **Queue row id:** \`${p.source_queue_row_id}\``, "");
    lines.push("```text");
    lines.push(p.copy_paste_prompt.trimEnd());
    lines.push("```");
    lines.push("");
  }
  return `${lines.join("\n")}\n`;
}
