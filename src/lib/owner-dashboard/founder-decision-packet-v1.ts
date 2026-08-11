/**
 * Founder Decision Packet v1 — read-only structured owner decisions for queue rows that are not agent-safe execution candidates.
 * PROVEN: does not invoke agents, npm, or external tools; pure builder from Founder Action Queue rows (+ optional Runner Step status).
 * PROVEN: Row-class shaping uses stable queue row ids emitted by `founder-action-queue-v1.ts` where applicable.
 */

import type { FounderActionQueueRowV1 } from "./founder-action-queue-v1";
import { FOUNDER_DECISION_REGISTRY_PACKET_FOOTER_V1 } from "./founder-decision-registry-v1";
import {
  appendPrecedentClauseToDraftV1,
  precedentClassForFounderQueueRowV1,
  type ClosedOarPrecedentSubstrateV1,
} from "./precedent-clause-drafting-v1";
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
  /**
   * Existing closed OARs for Precedent Clause drafting only.
   * Pass loaded registry rows (may be `[]`). Omit/undefined ⇒ clause reports UNKNOWN (does not invent zero).
   */
  closed_oar_rows?: readonly ClosedOarPrecedentSubstrateV1[] | null;
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

/** PROVEN: aligns with ids from `buildFounderActionQueueRowsUnsorted` in `founder-action-queue-v1.ts`. */
type DecisionRowClassV1 =
  | "human_browser"
  | "affiliate_readiness"
  | "mutating_gate"
  | "next_best_action"
  | "next_owner_synthesis"
  | "live_site_deploy"
  | "unknown_human_review"
  | "generic";

function resolveDecisionRowClassV1(row: FounderActionQueueRowV1): DecisionRowClassV1 {
  switch (row.id) {
    case "queue-human-browser":
      return "human_browser";
    case "queue-affiliate":
      return "affiliate_readiness";
    case "queue-mutating-gate":
      return "mutating_gate";
    case "queue-next-best":
      return "next_best_action";
    case "queue-owner-v2":
      return "next_owner_synthesis";
    case "queue-live-site":
      return "live_site_deploy";
    case "queue-unknown-human":
      return "unknown_human_review";
    default:
      return "generic";
  }
}

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

type ShapedDecisionFieldsV1 = {
  decision_needed: string;
  why_jared: string;
  options: FounderDecisionPacketOptionV1[];
  recommended_next_prompt_or_command: string;
};

function shapeHumanBrowserRowV1(row: FounderActionQueueRowV1): ShapedDecisionFieldsV1 {
  return {
    decision_needed:
      "Obtain human-browser evidence for Amazon PDP / buyability claims (exact OEM tokens) before treating rescue work as verified.",
    why_jared:
      "**PROVEN:** `human_browser_required_tokens` are present on Command Center v2 — **UNKNOWN** whether PDP price, stock, or seller state matches reality without a human browser session. **INFERRED:** An IDE agent cannot substitute for disciplined exact-token PDP verification you perform in a real browser; do not treat agent narrative as Amazon ground truth.",
    options: [
      {
        id: "browser_exact_tokens",
        label:
          "You (or a trusted human) open Amazon PDPs using the exact OEM tokens from this row; screenshot or note buyability outcome — no agent-only “PDP verified” claim.",
      },
      {
        id: "document_defer_tokens",
        label:
          "Record which tokens are verified vs deferred in your tracker; keep repo work read-only until human evidence exists.",
      },
      {
        id: "read_only_repo_audit",
        label:
          "Allow read-only repo work only (`npm run lint`, `npm run build`, `npm run buckparts:operator-proof`) — no mutating scripts or affiliate URL edits tied to this cohort.",
      },
      {
        id: "defer_rescue",
        label: "Explicitly defer this Amazon rescue cohort until human-browser time is scheduled.",
      },
    ],
    recommended_next_prompt_or_command: [
      "Human browser · exact-token discipline (owner-only)",
      "",
      "1) Open Amazon in your browser (not headless automation) for each OEM token listed in `next_action` below — paste/search the exact token string; do not substitute similar SKUs.",
      "2) Capture what a human can see (buy box, seller, ship date) in your notes — agents must not assert PDP truth without that evidence.",
      "3) If any token is inconclusive, mark it deferred; do not ask an agent to “confirm buyability” as fact.",
      "",
      `Queue row id: \`${row.id}\` · next_action:\n${row.next_action}`,
    ].join("\n"),
  };
}

function shapeAffiliateReadinessRowV1(row: FounderActionQueueRowV1): ShapedDecisionFieldsV1 {
  return {
    decision_needed:
      "Decide affiliate-program readiness using external accounts and policy — not in-repo submission automation.",
    why_jared:
      "**PROVEN:** Affiliate programs and portals live outside this repository. **INFERRED:** No `buckparts:*` script here submits applications, credentials, or approvals on external affiliate sites. **UNKNOWN:** Partner-specific portal steps until you open them in a browser.",
    options: [
      {
        id: "external_portal_owner",
        label:
          "Complete or defer required steps in the affiliate vendor’s own portal (logged-in founder/external account) — repo automation does not submit applications.",
      },
      {
        id: "read_only_tracker_only",
        label:
          "If you maintain a read-only status tracker or internal markdown checklist in-repo, update that only — no affiliate URL or tracking-parameter mutations unless explicitly in scope elsewhere.",
      },
      {
        id: "defer_program",
        label: "Defer affiliate expansion until readiness lane is green in Command Center.",
      },
      {
        id: "narrow_readonly_comms",
        label: "Narrow scope to read-only marketing copy review in-repo (no program enrollment changes).",
      },
    ],
    recommended_next_prompt_or_command: [
      "Affiliate readiness (founder / external-account work)",
      "",
      "1) Read `next_action` for this row — it summarizes Command Center `affiliate_readiness` guidance.",
      "2) Perform any enrollment, tax, or banking steps in the **external** affiliate console; do not ask the repo to “apply” on your behalf.",
      "3) Optional: update a **read-only** internal tracker file if you keep one; do not change live affiliate URLs or tracking parameters in-repo unless that is an explicitly separate, owner-approved change set.",
      "",
      `Queue row id: \`${row.id}\` · next_action:\n${row.next_action}`,
    ].join("\n"),
  };
}

function shapeMutatingGateRowV1(row: FounderActionQueueRowV1): ShapedDecisionFieldsV1 {
  return {
    decision_needed:
      "Resolve mutating execution gates — no mutating Runner Step work and no mutating agent scripts proceed until you clear or accept this posture.",
    why_jared:
      "**PROVEN:** Command Center `execution_guidance.mutating_blocked` (and/or this row’s `mutating_blocked` authority) is active. **INFERRED:** Running mutating `npm` targets, deploy hooks, or DB-adjacent scripts risks violating the same gates this row describes.",
    options: [
      {
        id: "clear_gate_document",
        label:
          "List which mutating gates must clear (from Command Center `mutating_block_reasons` / this row’s `next_action`), then track resolution outside autonomous agent loops.",
      },
      {
        id: "read_only_until_cleared",
        label:
          "Freeze mutating work: allow only read-only validation (`npm run lint`, `npm run build`, `npm run buckparts:operator-proof`) until gates are explicitly cleared.",
      },
      {
        id: "owner_explicit_override",
        label:
          "If you intentionally accept risk, document an explicit owner decision before any mutating script — still no closed-loop autonomy.",
      },
      {
        id: "defer_mutating_scope",
        label: "Defer mutating scope until Command Center shows mutating_blocked=false.",
      },
    ],
    recommended_next_prompt_or_command: [
      "Mutating gate / blocker (owner decision before mutating work)",
      "",
      "1) Open Command Center JSON and read `execution_guidance.mutating_block_reasons` alongside this row’s `next_action`.",
      "2) Do **not** run mutating npm scripts, retailer writes, or Supabase mutations until you have an explicit owner plan for each listed reason.",
      "3) Runner Step allowlist remains lint/build/operator-proof only — it does not clear mutating policy gates by itself.",
      "",
      `Queue row id: \`${row.id}\` · next_action:\n${row.next_action}`,
    ].join("\n"),
  };
}

function shapeNextBestActionRowV1(row: FounderActionQueueRowV1): ShapedDecisionFieldsV1 {
  return {
    decision_needed:
      "Approve or adjust Command Center **strategic direction** (`next_best_action`) — this is owner judgment, not an agent execution order.",
    why_jared:
      "**PROVEN:** `next_best_action` is synthesized Command Center text (read-only in this packet). **INFERRED:** Treating it as autonomous agent work would blur “owner approves direction” vs “agent executes inside read-only packets.” **UNKNOWN:** Whether every sub-bullet is still correct until you re-read the full Command Center report.",
    options: [
      {
        id: "own_direction_commit",
        label:
          "You edit or endorse the strategic direction implied by `next_best_action` in your notes/PR description — agents may only help with read-only execution packets when emitted separately.",
      },
      {
        id: "narrow_scope",
        label:
          "Narrow what “next best” means for this week (explicitly de-scope mutating follow-ons) before sharing with anyone else.",
      },
      {
        id: "defer_strategy",
        label: "Defer strategic commitment until owner review time; keep repo changes read-only meanwhile.",
      },
      {
        id: "reread_command_center",
        label: "Re-run or re-open `buckparts:command-center` locally after material repo changes — still owner-led interpretation.",
      },
    ],
    recommended_next_prompt_or_command: [
      "Command Center · next_best_action (direction vs execution)",
      "",
      "1) Read the full `next_best_action` text below — it does **not** grant mutation authority or closed-loop autonomy.",
      "2) Decide what you endorse as founder direction; communicate any narrowed scope to humans explicitly.",
      "3) Only after separate `founder_execution_packet_v1` rows exist should read-only agent work align with those packets — this row is not that packet.",
      "",
      `Queue row id: \`${row.id}\` · next_action:\n${row.next_action}`,
    ].join("\n"),
  };
}

function shapeNextOwnerSynthesisRowV1(row: FounderActionQueueRowV1): ShapedDecisionFieldsV1 {
  return {
    decision_needed:
      "Resolve the synthesized **owner next step** from Command Center v2 — prioritization and tradeoffs, not autonomous execution.",
    why_jared:
      "**PROVEN:** Source is `command_center_v2.next_owner_action`. **INFERRED:** This row often competes with other lanes (Amazon rescue, affiliate, deploy) — only you can rank tradeoffs. **UNKNOWN:** Calendar or business constraints outside the repo.",
    options: [
      {
        id: "prioritize_owner_step",
        label:
          "Choose whether this synthesized owner step is still #1; if yes, schedule human time; if no, document deprioritization.",
      },
      {
        id: "split_readonly_vs_mutating",
        label:
          "Split the implied work into read-only vs mutating buckets — mutating buckets stay blocked until gates and explicit owner approval align.",
      },
      {
        id: "handoff_context_only",
        label:
          "Paste summarized context to another human collaborator — still no claim that agents or CI closed the loop.",
      },
      {
        id: "defer_owner_step",
        label: "Defer this owner step with a dated note; keep automation read-only until you revisit.",
      },
    ],
    recommended_next_prompt_or_command: [
      "Owner · synthesized Command Center next step",
      "",
      "1) Re-read `next_action` — it mirrors `command_center_v2.next_owner_action` at digest time.",
      "2) Decide accept / defer / delegate-to-human (not to autonomous external agents as execution owners).",
      "3) Do not treat this synthesis as permission for mutating scripts; pair with mutating gate row if those gates are active.",
      "",
      `Queue row id: \`${row.id}\` · next_action:\n${row.next_action}`,
    ].join("\n"),
  };
}

function shapeLiveSiteDeployRowV1(row: FounderActionQueueRowV1): ShapedDecisionFieldsV1 {
  return {
    decision_needed:
      "Triage live-site / deploy monitor signals before trusting monetization or rescue expansion on top of a broken lane.",
    why_jared:
      "**PROVEN:** Evidence basis references Command Center deploy lane `live_site_monitor`. **INFERRED:** Route-level failures or non-OK runtime often imply smoke or deploy drift. **UNKNOWN:** Root cause until you inspect deploy logs or dashboards outside this digest.",
    options: [
      {
        id: "inspect_deploy_console",
        label:
          "Inspect deploy / hosting console and recent commits for this environment — human-led triage, not agent-autonomous deploy fixes.",
      },
      {
        id: "rerun_smoke_human",
        label:
          "Re-run or spot-check allowlisted routes in a browser; correlate with `next_action` route/runtime hints.",
      },
      {
        id: "freeze_monetization",
        label: "Freeze monetization expansion until monitor returns OK for the lanes you care about.",
      },
      {
        id: "read_only_repo_diag",
        label: "Allow read-only repo diagnostics only until live lane is understood.",
      },
    ],
    recommended_next_prompt_or_command: [
      "Live site / deploy monitor (owner triage)",
      "",
      "1) Use `next_action` below plus Command Center deploy JSON for correlation.",
      "2) Do not instruct agents to silently change production routing or DNS — those remain owner/platform actions.",
      "",
      `Queue row id: \`${row.id}\` · next_action:\n${row.next_action}`,
    ].join("\n"),
  };
}

function shapeUnknownHumanReviewRowV1(row: FounderActionQueueRowV1): ShapedDecisionFieldsV1 {
  return {
    decision_needed:
      "Break down the unknown / human-review cohort — classify what needs browser vs owner policy vs engineering read-only.",
    why_jared:
      "**PROVEN:** Command Center `unknown_or_human_review` triggered this row. **INFERRED:** Mixed “UNKNOWN” items often need human classification before agents touch them. **UNKNOWN:** Full cohort size beyond this row’s truncated `next_action`.",
    options: [
      {
        id: "classify_cohort",
        label:
          "Create a short owner table: item → human-browser required vs policy vs read-only engineering — no autonomous agent triage as final authority.",
      },
      {
        id: "human_browser_subcohort",
        label:
          "Carve out tokens/items that require human browser verification first (same discipline as the human-browser row).",
      },
      {
        id: "policy_only",
        label: "Mark items as owner-policy-only (no repo mutation) until decisions exist.",
      },
      {
        id: "readonly_eng_later",
        label: "Schedule read-only engineering review after classification — still not mutating automation.",
      },
    ],
    recommended_next_prompt_or_command: [
      "Unknown / human-review cohort",
      "",
      "1) Read `next_action` and Command Center `unknown_or_human_review` together.",
      "2) Split UNKNOWNs into actionable buckets; do not ask Cursor/Codex/OpenAI to autonomously close the loop on production truth.",
      "",
      `Queue row id: \`${row.id}\` · next_action:\n${row.next_action}`,
    ].join("\n"),
  };
}

function shapeGenericRowV1(row: FounderActionQueueRowV1): ShapedDecisionFieldsV1 {
  const blocked = row.status === "blocked";
  const waiting = row.status === "waiting";
  const decision_needed = blocked
    ? `Unblock or re-scope (owner judgment): ${row.title}`
    : waiting
      ? `Decide dependency / sequencing: ${row.title}`
      : `Owner decision: ${row.title}`;
  const options: FounderDecisionPacketOptionV1[] = [];
  if (blocked || row.mutation_authority === "mutating_blocked") {
    options.push({
      id: "unblock_or_scope",
      label:
        "Document what blocks progress (gates, missing approvals, external dependency) before expanding agent or mutating work.",
    });
  }
  options.push(
    {
      id: "ack_scope_notes",
      label: "Acknowledge scope in notes or PR description; choose explicit approve / reject / defer — no silent autonomy.",
    },
    {
      id: "readonly_validation_bundle",
      label:
        "If code changed, run read-only validation only: `npm run lint`, `npm run build`, `npm run buckparts:operator-proof` from repo root.",
    },
    {
      id: "defer_digest",
      label: "Defer until next Command Center snapshot or weekly digest; re-read queue then.",
    },
  );
  return {
    decision_needed,
    why_jared: `**PROVEN:** Queue status \`${row.status}\`, actor \`${row.recommended_actor}\`, mutation posture \`${row.mutation_authority}\`. **INFERRED:** This row did not match a tighter built-in class — treat \`next_action\` as the authoritative free-text cue.`,
    options: options.slice(0, 4),
    recommended_next_prompt_or_command: [
      "Generic owner decision row",
      "",
      "1) Re-read this row in Owner dashboard or Command Center JSON.",
      "2) Record an explicit owner decision; do not imply closed-loop autonomy or external agent execution ownership.",
      "3) Keep mutating work off the table until posture and gates explicitly allow it.",
      "",
      `Queue row id: \`${row.id}\` · next_action:\n${row.next_action}`,
    ].join("\n"),
  };
}

function shapeDecisionFieldsForRowV1(
  row: FounderActionQueueRowV1,
  rowClass: DecisionRowClassV1,
): ShapedDecisionFieldsV1 {
  switch (rowClass) {
    case "human_browser":
      return shapeHumanBrowserRowV1(row);
    case "affiliate_readiness":
      return shapeAffiliateReadinessRowV1(row);
    case "mutating_gate":
      return shapeMutatingGateRowV1(row);
    case "next_best_action":
      return shapeNextBestActionRowV1(row);
    case "next_owner_synthesis":
      return shapeNextOwnerSynthesisRowV1(row);
    case "live_site_deploy":
      return shapeLiveSiteDeployRowV1(row);
    case "unknown_human_review":
      return shapeUnknownHumanReviewRowV1(row);
    default:
      return shapeGenericRowV1(row);
  }
}

function mergeWhyWithRunnerV1(
  shapedWhy: string,
  runner: FounderDecisionPacketRunnerHintV1 | null | undefined,
): string {
  if (!runner || runner.overall_status !== "NO_PACKET") {
    return shapedWhy;
  }
  if (shapedWhy.includes("NO_PACKET")) {
    return shapedWhy;
  }
  return `${shapedWhy} **PROVEN:** Runner Step v1 reported \`overall_status=NO_PACKET\` (no agent-safe execution packet selected) — owner decisions are the structured next step for non-delegated queue rows.`;
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
      const rowClass = resolveDecisionRowClassV1(row);
      const shaped = shapeDecisionFieldsForRowV1(row, rowClass);
      const why_jared = mergeWhyWithRunnerV1(shaped.why_jared, runner);
      const recommendedBase = [
        shaped.recommended_next_prompt_or_command.trimEnd(),
        "",
        "---",
        FOUNDER_DECISION_REGISTRY_PACKET_FOOTER_V1,
      ].join("\n");
      const withPrecedent = appendPrecedentClauseToDraftV1({
        draft_body: recommendedBase,
        decision_class: precedentClassForFounderQueueRowV1(row.id),
        closed_oar_rows: context?.closed_oar_rows,
        current: { draft_status: "open" },
      });
      decision_packets.push({
        id: `decision_packet_v1:${row.id}`,
        source_queue_row_id: row.id,
        title: row.title,
        decision_needed: shaped.decision_needed,
        why_jared,
        evidence_basis: row.evidence_basis,
        blocked_until_decided: blockedUntilDecided(row),
        options: shaped.options,
        recommended_next_prompt_or_command: withPrecedent.draft_body,
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
