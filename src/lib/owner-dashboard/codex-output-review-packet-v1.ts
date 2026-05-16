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
  "Codex output review is UNKNOWN on this dashboard until an artifact path is wired; digest may score transport vs task outcome (`codex_task_outcome_status`) when FOUNDER_DIGEST_CODEX_PACKET_PROOF_JSON_PATH and final-message files are readable. This handler does not read temp Codex paths.";

/** Plain-text excerpt cap for digest/registry visibility (full message remains on disk when applicable). */
export const CODEX_OUTPUT_REVIEW_EXCERPT_MAX_CHARS_V1 = 1200;

/** Heuristic classifier over Codex final-message prose — transport/capture proof is separate from task outcome proof. */
export type CodexTaskOutcomeStatusV1 =
  | "TASK_SUCCESS_PROVEN"
  | "TASK_PARTIAL_OR_FAILED"
  | "TASK_OUTCOME_UNKNOWN";

export type CodexFinalMessageOutcomeClassificationV1 = {
  codex_task_outcome_status: CodexTaskOutcomeStatusV1;
  codex_reported_validation_failures: string[];
  codex_reported_successes: string[];
  codex_environment_limitations: string[];
};

function dedupeStable(lines: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const l of lines) {
    if (seen.has(l)) continue;
    seen.add(l);
    out.push(l);
  }
  return out;
}

/**
 * PROVEN: pure heuristic — distinguishes captured narrative hints from proven validation success.
 * INFERRED: phrase lists are intentionally narrow; false positives/negatives remain possible (see TASK_OUTCOME_UNKNOWN).
 */
export function classifyCodexFinalMessageOutcomeV1(finalMessageText: string): CodexFinalMessageOutcomeClassificationV1 {
  const raw = finalMessageText.trim();
  if (raw.length === 0) {
    return {
      codex_task_outcome_status: "TASK_OUTCOME_UNKNOWN",
      codex_reported_validation_failures: [],
      codex_reported_successes: [],
      codex_environment_limitations: [],
    };
  }

  const lower = raw.toLowerCase();
  const failures: string[] = [];
  const envLimits: string[] = [];

  const fail = (msg: string): void => {
    failures.push(msg);
  };
  const env = (msg: string): void => {
    envLimits.push(msg);
  };

  if (/\bexited\s+1\b/i.test(raw)) fail("Exit/failure wording: `exited 1`.");
  if (lower.includes("eperm")) {
    fail("EPERM reported in final message (often sandbox/temp IPC — not proof of product logic failure).");
    env("EPERM — often temp IPC or sandbox permission denial (e.g. `tsx` under read-only).");
  }
  if (lower.includes(".next/cache")) {
    fail("`.next/cache` mentioned (lint/Next cache — typically blocked in read-only sandbox; validate outside Codex).");
    env("`.next/cache` not writable — typical read-only sandbox constraint (ESLint/Next cache).");
  }
  if (lower.includes(".next/trace")) {
    fail("`.next/trace` mentioned (Next trace — typically blocked in read-only sandbox; validate outside Codex).");
    env("`.next/trace` not writable — typical read-only sandbox constraint (Next tracing).");
  }
  if (lower.includes("tsx") && lower.includes("temp") && lower.includes("ipc")) {
    fail("tsx temp IPC reported (often EPERM under read-only — delegate validation to Runner/local CI).");
    env("tsx temp IPC — npm/tsx subprocess may require writable temp; run validation outside read-only sandbox.");
  }
  if (lower.includes("xcrun")) {
    fail("`xcrun` mentioned.");
    env("`xcrun` tooling may require writable temp caches (e.g. under `/tmp`).");
  }
  if (lower.includes("write block")) {
    fail("`write block` mentioned.");
    env("Write-block wording — read-only filesystem posture.");
  }
  if (lower.includes("permission")) {
    fail("`permission` mentioned.");
    env("Permission wording — may indicate sandbox or OS filesystem constraints.");
  }
  if (lower.includes("could not")) fail("`could not` mentioned.");
  if (/\bfailed\b/i.test(raw) && !/\bnot\s+failed\b/i.test(raw)) {
    fail("`failed` mentioned (simple negation `not failed` excluded).");
  }

  const failuresDedup = dedupeStable(failures);
  const envDedup = dedupeStable(envLimits);

  if (failuresDedup.length > 0) {
    return {
      codex_task_outcome_status: "TASK_PARTIAL_OR_FAILED",
      codex_reported_validation_failures: failuresDedup,
      codex_reported_successes: [],
      codex_environment_limitations: envDedup,
    };
  }

  let successKinds = 0;
  const successes: string[] = [];
  if (/\bexited\s+0\b/i.test(raw)) {
    successKinds += 1;
    successes.push("`exited 0` mentioned.");
  }
  if (/\bPASS\b/.test(raw)) {
    successKinds += 1;
    successes.push("`PASS` token present.");
  }
  if (/RESULT:\s*OK/i.test(raw)) {
    successKinds += 1;
    successes.push("`RESULT: OK` present.");
  }
  if (/no\s+repo\s+files/i.test(lower)) {
    successKinds += 1;
    successes.push("`no repo files` style signal.");
  }
  if (/\bno\s+[^\n]+\s+changed\b/i.test(raw)) {
    successKinds += 1;
    successes.push("`no … changed` style signal.");
  }

  const provenOk = successKinds >= 2;

  return {
    codex_task_outcome_status: provenOk ? "TASK_SUCCESS_PROVEN" : "TASK_OUTCOME_UNKNOWN",
    codex_reported_validation_failures: [],
    codex_reported_successes: successes,
    codex_environment_limitations: [],
  };
}

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
  "PROVEN: Record approve / reject / defer / follow-up intent under Founder Decision Registry v1 (`docs/BuckParts-FOUNDER-DECISION-REGISTRY.md`, optional `data/owner-decisions/*.json`) using optional `codex_output_review_context_v1` + `source_decision_packet_id` = `codex_output_review_packet_v1:${source_queue_row_id}` so digest read-model correlation can surface owner judgment — **still** not automation input, not mutation authority, not Layer 6 complete. **NOT PROVEN:** Any in-repo consumer executes the next step from registry rows alone.";

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
  /** Heuristic over full final message — independent of proof PASS transport/capture. */
  codex_task_outcome_status: CodexTaskOutcomeStatusV1;
  codex_reported_validation_failures: readonly string[];
  codex_reported_successes: readonly string[];
  codex_environment_limitations: readonly string[];
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

  const unknownOutcome = (): CodexFinalMessageOutcomeClassificationV1 => ({
    codex_task_outcome_status: "TASK_OUTCOME_UNKNOWN",
    codex_reported_validation_failures: [],
    codex_reported_successes: [],
    codex_environment_limitations: [],
  });

  let review_status: CodexOutputReviewStatusV1 = "INVALID_CODEX_PROOF";
  let codex_final_message_present = false;
  let codex_final_message_excerpt: string | null = null;
  let outcomeClassification = unknownOutcome();

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
      outcomeClassification = classifyCodexFinalMessageOutcomeV1(trimmed);
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
    codex_task_outcome_status: outcomeClassification.codex_task_outcome_status,
    codex_reported_validation_failures: outcomeClassification.codex_reported_validation_failures,
    codex_reported_successes: outcomeClassification.codex_reported_successes,
    codex_environment_limitations: outcomeClassification.codex_environment_limitations,
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

  const outcomeDigestLines: string[] =
    packet.review_status === "READY_FOR_FOUNDER_REVIEW"
      ? (() => {
          const lines: string[] = [
            "**Transport vs task validation:** PROVEN when proof JSON is PASS + final message readable — Codex ran and prose was captured. **NOT PROVEN:** Every packet validation command succeeded.",
            `**Codex task outcome:** \`${packet.codex_task_outcome_status}\``,
          ];

          if (packet.codex_reported_validation_failures.length > 0) {
            lines.push(
              "",
              "**Detected validation / failure signals (heuristic):**",
              ...packet.codex_reported_validation_failures.map((f) => `- ${f}`),
            );
          }
          if (packet.codex_environment_limitations.length > 0) {
            lines.push(
              "",
              "**Detected environment / sandbox limitations (heuristic):**",
              ...packet.codex_environment_limitations.map((e) => `- ${e}`),
            );
          }
          if (packet.codex_task_outcome_status === "TASK_SUCCESS_PROVEN" && packet.codex_reported_successes.length > 0) {
            lines.push(
              "",
              "**Supporting success markers (heuristic):**",
              ...packet.codex_reported_successes.map((s) => `- ${s}`),
            );
          }
          if (packet.codex_task_outcome_status === "TASK_PARTIAL_OR_FAILED") {
            lines.push(
              "",
              "**Founder caution:** Do **not** approve read-only findings blindly — classifier reports **TASK_PARTIAL_OR_FAILED**. Prefer **`request_followup_readonly`** before **`approve_readonly_findings`** until validation is green outside read-only sandbox restrictions.",
            );
          }
          if (packet.codex_task_outcome_status === "TASK_OUTCOME_UNKNOWN") {
            lines.push(
              "",
              "**UNKNOWN task outcome:** Insufficient paired success markers for `TASK_SUCCESS_PROVEN` — treat packet validation as **unproven** from this prose alone.",
            );
          }
          if (packet.codex_task_outcome_status === "TASK_SUCCESS_PROVEN") {
            lines.push(
              "",
              "**INFERRED:** Multiple explicit success markers were present — still re-verify on a non-sandbox machine; heuristics can miss negated context.",
            );
          }
          return lines;
        })()
      : [
          "**Codex task outcome classifier:** heuristic runs only when `review_status` is READY_FOR_FOUNDER_REVIEW with readable final-message text.",
          `**Codex task outcome (not classified):** \`${packet.codex_task_outcome_status}\``,
        ];

  const lines = [
    `**PROVEN:** Contract \`${packet.contract}\` · \`review_status\`=\`${packet.review_status}\` · read_only=\`true\` · automation_input=\`false\` · founder_judgment_required=\`true\`.`,
    `**PROVEN:** \`layer_6_founder_only_approval\` remains **NOT_PROVEN** — this packet does **not** complete Layer 6 or prove closed-loop autonomy.`,
    "",
    ...outcomeDigestLines,
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
