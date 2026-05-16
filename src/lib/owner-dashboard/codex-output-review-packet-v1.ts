/**
 * Codex Output Review Packet v1 — owner-only judgment surface over Codex Packet Proof + optional final message text.
 * PROVEN: pure builder (no I/O). Does not authorize mutation, widen Runner Step, or prove Layer 6 complete.
 */

import { FOUNDER_DECISION_REGISTRY_DIGEST_HINT_V1 } from "./founder-decision-registry-v1";
import type { CodexPacketProofReadModelV1 } from "./codex-packet-proof-read-model-v1";
import { RUNNER_EXPECTED_DEFAULT_PROHIBITED_ACTION_LINES_V1 } from "../../../scripts/lib/buckparts-runner-safety-contract-v1";

export const CODEX_OUTPUT_REVIEW_PACKET_CONTRACT_V1 = "codex_output_review_packet_v1" as const;

export const CODEX_OUTPUT_REVIEW_DIGEST_HINT_V1 =
  "**PROVEN:** Markdown below is from `codex_output_review_packet_v1` (owner judgment surface only). **NOT PROVEN:** Layer 6 complete, mutation authority, or Runner automation — approving findings here does **not** authorize writes.";

export const CODEX_OUTPUT_REVIEW_OWNER_DASHBOARD_LINE_V1 =
  "Codex output review is UNKNOWN on this dashboard until an artifact path is wired; digest may surface review when FOUNDER_DIGEST_CODEX_PACKET_PROOF_JSON_PATH is set and optional final-message file is readable. This handler does not read temp Codex paths.";

/** Plain-text excerpt cap for digest/registry visibility (full message remains on disk when applicable). */
export const CODEX_OUTPUT_REVIEW_EXCERPT_MAX_CHARS_V1 = 1200;

export type CodexOutputReviewStatusV1 =
  | "READY_FOR_FOUNDER_REVIEW"
  | "BLOCKED_MISSING_CODEX_OUTPUT"
  | "INVALID_CODEX_PROOF";

export type CodexOutputReviewFounderOptionV1 = {
  id: "approve_readonly_findings" | "reject_findings" | "request_followup_readonly" | "defer_review";
  label: string;
  description: string;
};

export const CODEX_OUTPUT_REVIEW_FOUNDER_OPTIONS_V1: readonly CodexOutputReviewFounderOptionV1[] = [
  {
    id: "approve_readonly_findings",
    label: "Approve read-only findings",
    description:
      "Accept Codex’s structured read-only conclusions for this packet scope only — still **not** mutation authority.",
  },
  {
    id: "reject_findings",
    label: "Reject findings",
    description: "Do not rely on this Codex output; queue follow-up human or agent review with clearer constraints.",
  },
  {
    id: "request_followup_readonly",
    label: "Request follow-up (read-only)",
    description: "Ask for another bounded read-only Codex pass with tightened acceptance criteria (no scope creep).",
  },
  {
    id: "defer_review",
    label: "Defer review",
    description: "Park judgment until more Command Center / Runner / evidence context exists.",
  },
];

export const CODEX_OUTPUT_REVIEW_EXTRA_PROHIBITED_LINES_V1 = [
  "Selecting any founder option above does **not** grant authority for Supabase writes, retailer_links mutations, evidence JSON writes, affiliate URL changes, mutating npm scripts, or git commits.",
  "This packet is **not** `automation_input` for Runner Step, queues, Execution Packets, or mutation gates.",
] as const;

export const CODEX_OUTPUT_REVIEW_REGISTRY_NEXT_STEP_V1 =
  "PROVEN: Record approve / reject / defer / follow-up intent under Founder Decision Registry v1 (`docs/BuckParts-FOUNDER-DECISION-REGISTRY.md`, optional `data/owner-decisions/*.json`). **UNKNOWN:** Automation consuming registry rows remains out of scope until explicitly evidenced elsewhere.";

export type CodexOutputReviewPacketV1 = {
  contract: typeof CODEX_OUTPUT_REVIEW_PACKET_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  automation_input: false;
  founder_judgment_required: true;
  layer_6_founder_only_approval: "NOT_PROVEN";
  generated_at: string;
  source_packet_id: string | null;
  source_queue_row_id: string | null;
  source_packet_title: string | null;
  codex_final_message_present: boolean;
  codex_final_message_excerpt: string | null;
  /** Path digest tried for final message when proof was PASS (may be machine-local temp). */
  final_message_attempted_path: string | null;
  /** Set when filesystem read failed in digest file mode. */
  final_message_load_error: string | null;
  review_status: CodexOutputReviewStatusV1;
  founder_options: readonly CodexOutputReviewFounderOptionV1[];
  prohibited_actions_still_apply: readonly string[];
  recommended_registry_next_step: string;
};

export type CodexFinalMessageInputV1 = {
  /** Resolved or raw path the digest attempted when in file mode; null if not applicable. */
  attempted_path: string | null;
  /** Final message body when supplied or successfully read. */
  text: string | null;
  /** Non-null when caller attempted filesystem read and failed. */
  load_error: string | null;
};

export function trimCodexFinalMessageExcerptV1(text: string, maxChars: number = CODEX_OUTPUT_REVIEW_EXCERPT_MAX_CHARS_V1): string {
  const t = text.trim();
  if (t.length <= maxChars) return t;
  return `${t.slice(0, maxChars)}…`;
}

function buildProhibitedActionsCombinedV1(): readonly string[] {
  return [...RUNNER_EXPECTED_DEFAULT_PROHIBITED_ACTION_LINES_V1, ...CODEX_OUTPUT_REVIEW_EXTRA_PROHIBITED_LINES_V1];
}

/**
 * Builds an owner review packet from a proof read model + optional Codex final message payload (caller loads file).
 */
export function buildCodexOutputReviewPacketV1(args: {
  proof: CodexPacketProofReadModelV1;
  generated_at: string;
  codex_final_message?: CodexFinalMessageInputV1 | null;
}): CodexOutputReviewPacketV1 {
  const generated_at = args.generated_at;
  const proof = args.proof;
  const snap = proof.source_snapshot;
  const srcId = snap?.source_packet_id ?? null;
  const srcRow = snap?.source_queue_row_id ?? null;
  const srcTitle = snap?.source_packet_title ?? null;

  const msgIn = args.codex_final_message ?? {
    attempted_path: null,
    text: null,
    load_error: null,
  };

  let review_status: CodexOutputReviewStatusV1 = "INVALID_CODEX_PROOF";
  let codex_final_message_present = false;
  let codex_final_message_excerpt: string | null = null;

  if (!proof.valid || snap?.overall_status !== "PASS" || !proof.codex_packet_execution_proven) {
    review_status = "INVALID_CODEX_PROOF";
  } else {
    const trimmed = msgIn.text?.trim() ?? "";
    if (msgIn.load_error) {
      review_status = "BLOCKED_MISSING_CODEX_OUTPUT";
    } else if (trimmed.length === 0) {
      review_status = "BLOCKED_MISSING_CODEX_OUTPUT";
    } else {
      review_status = "READY_FOR_FOUNDER_REVIEW";
      codex_final_message_present = true;
      codex_final_message_excerpt = trimCodexFinalMessageExcerptV1(trimmed);
    }
  }

  return {
    contract: CODEX_OUTPUT_REVIEW_PACKET_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    automation_input: false,
    founder_judgment_required: true,
    layer_6_founder_only_approval: "NOT_PROVEN",
    generated_at,
    source_packet_id: srcId,
    source_queue_row_id: srcRow,
    source_packet_title: srcTitle,
    codex_final_message_present,
    codex_final_message_excerpt,
    final_message_attempted_path: msgIn.attempted_path,
    final_message_load_error: msgIn.load_error,
    review_status,
    founder_options: CODEX_OUTPUT_REVIEW_FOUNDER_OPTIONS_V1,
    prohibited_actions_still_apply: buildProhibitedActionsCombinedV1(),
    recommended_registry_next_step: CODEX_OUTPUT_REVIEW_REGISTRY_NEXT_STEP_V1,
  };
}

export function formatCodexOutputReviewPacketDigestMarkdownV1(packet: CodexOutputReviewPacketV1): string {
  const opts = packet.founder_options
    .map((o) => `- **${o.label}** (\`${o.id}\`): ${o.description}`)
    .join("\n");

  const excerptBlock =
    packet.codex_final_message_excerpt && packet.codex_final_message_excerpt.length > 0
      ? ["", "**Codex final message excerpt (trimmed):**", "```", packet.codex_final_message_excerpt, "```", ""]
      : ["", "**Codex final message excerpt:** *(none — blocked or invalid proof)*", ""];

  const prohib = packet.prohibited_actions_still_apply.map((p) => `- ${p}`).join("\n");

  const lines = [
    `**PROVEN:** Contract \`${packet.contract}\` · \`review_status\`=\`${packet.review_status}\` · read_only=\`true\` · automation_input=\`false\` · founder_judgment_required=\`true\`.`,
    `**PROVEN:** \`layer_6_founder_only_approval\` remains **NOT_PROVEN** — this packet does **not** complete Layer 6 or prove closed-loop autonomy.`,
    "",
    "**Source execution packet:**",
    `- source_packet_id: \`${packet.source_packet_id ?? "null"}\``,
    `- source_queue_row_id: \`${packet.source_queue_row_id ?? "null"}\``,
    `- source_packet_title: ${packet.source_packet_title ?? "*null*"}`,
    `- codex_final_message_present: \`${String(packet.codex_final_message_present)}\``,
    `- final_message_attempted_path: ${packet.final_message_attempted_path ? `\`${packet.final_message_attempted_path}\`` : "*null*"}`,
    ...(packet.final_message_load_error
      ? [`- **BLOCKED:** final message load error — \`${packet.final_message_load_error}\``]
      : []),
    "",
    "**What Jared should do (pick one conceptual lane — record in registry):**",
    opts,
    ...excerptBlock,
    "**Prohibited posture (still applies):**",
    prohib,
    "",
    "**Recommended registry next step:**",
    packet.recommended_registry_next_step,
    "",
    FOUNDER_DECISION_REGISTRY_DIGEST_HINT_V1,
    "",
  ];

  return `${lines.join("\n")}\n`;
}
