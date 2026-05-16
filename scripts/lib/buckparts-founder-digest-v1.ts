/**
 * Weekly founder digest markdown — pure formatter (no I/O).
 * Populated from `buildBuckpartsCommandCenterReport` + local build status (repo truth at call site).
 */

import { FOUNDER_DECISION_REGISTRY_DIGEST_HINT_V1 } from "../../src/lib/owner-dashboard/founder-decision-registry-v1";
import { FAILURE_PATTERN_REGISTRY_DIGEST_HINT_V1 } from "../../src/lib/owner-dashboard/failure-pattern-registry-v1";
import { CODEX_PACKET_PROOF_DIGEST_HINT_V1 } from "../../src/lib/owner-dashboard/codex-packet-proof-read-model-v1";
import { CODEX_OUTPUT_REVIEW_DIGEST_HINT_V1 } from "../../src/lib/owner-dashboard/codex-output-review-packet-v1";
import { LAYER_SIX_READINESS_DIGEST_HINT_V1 } from "../../src/lib/owner-dashboard/layer-six-readiness-summary-v1";

export type FounderDigestBuildV1 = {
  /** PROVEN: whether `npm run build` was executed inside the digest script. */
  ran: boolean;
  /** PROVEN: exit success when `ran`; if not ran, ok is UNKNOWN unless delegated. */
  ok: boolean | "UNKNOWN";
  /**
   * PROVEN: digest skipped in-process build because CI already ran `npm run build`
   * (`FOUNDER_DIGEST_SKIP_BUILD=1`).
   */
  delegated_to_prior_ci_step?: boolean;
};

export type FounderDigestCommandCenterSliceV1 = {
  report_name: string;
  generated_at: string;
  system_health_status: string;
  next_best_action: string;
  next_owner_action: string;
  next_move_mode: string;
  mutating_blocked: boolean;
  mutating_block_reasons: string[];
  deploy_lane_status: string;
  live_site_runtime_status: string;
  route_health_one_liner: string;
  amazon_rescue_next_agent_action: string;
  known_unknowns_sample: string[];
};

export type FounderDigestInputV1 = {
  generated_at: string;
  build: FounderDigestBuildV1;
  command_center: FounderDigestCommandCenterSliceV1;
  compare_note: string;
  /** Optional Founder Action Queue table (markdown fragment, read-only v1). */
  founder_action_queue_digest_markdown?: string;
  /** Optional Founder Decision Packets (markdown; owner-only v1; after Action Queue, before Execution Packets when queue is present). */
  founder_decision_packets_digest_markdown?: string;
  /** Optional Founder Decision Registry read model (markdown; `data/owner-decisions/*.json` scan; counts only — not consumed by automation). */
  founder_decision_registry_read_model_digest_markdown?: string;
  /** Optional Failure Pattern Registry read model (markdown; seeded rows in `failure-pattern-registry-v1.ts`; informational only). */
  failure_pattern_registry_digest_markdown?: string;
  /** Optional Layer 6 Readiness Summary (markdown; derived from Failure Pattern Registry read model; informational only). */
  layer_six_readiness_digest_markdown?: string;
  /** Optional Codex Packet Proof body (markdown fragment from `codex_packet_proof_read_model_v1`; heading/hint added by formatter below). */
  codex_packet_proof_digest_markdown?: string;
  /** Optional Codex Output Review Packet body (`codex_output_review_packet_v1`; digest reads final message file when proof is PASS — never invokes Codex). */
  codex_output_review_digest_markdown?: string;
  /** Optional Founder Execution Packets fragment (markdown; follows Decision Packets when queue fragment is present). */
  founder_execution_packets_digest_markdown?: string;
  /** Optional Runner Step markdown: modeled-only, or live JSON summary when `FOUNDER_DIGEST_RUNNER_STEP_JSON_PATH` is set (`scripts/buckparts-founder-digest.ts`). */
  runner_step_digest_markdown?: string;
};

export function buildFounderDigestMarkdownV1(input: FounderDigestInputV1): string {
  const b = input.build;
  let buildLine: string;
  if (b.delegated_to_prior_ci_step) {
    buildLine =
      "**PROVEN:** `npm run build` was executed in the preceding CI job step; this digest skipped a duplicate build (`FOUNDER_DIGEST_SKIP_BUILD=1`).";
  } else if (!b.ran) {
    buildLine =
      "**INFERRED:** `npm run build` was not executed inside the digest script (unexpected unless `FOUNDER_DIGEST_SKIP_BUILD=1` is set without a prior build).";
  } else if (b.ok === true) {
    buildLine = "**PROVEN:** `npm run build` exited 0 in this digest run.";
  } else {
    buildLine = "**PROVEN:** `npm run build` failed (non-zero exit) in this digest run.";
  }

  const cc = input.command_center;
  const smokeLine =
    cc.live_site_runtime_status !== "UNKNOWN" || cc.route_health_one_liner !== "UNKNOWN"
      ? `**Live / deploy lane:** deploy status \`${cc.deploy_lane_status}\`; monitor \`runtime_status\`=\`${cc.live_site_runtime_status}\`; routes: ${cc.route_health_one_liner}`
      : "**UNKNOWN:** Live-site monitor not available on Command Center deploy lane (no `live_site_monitor` or incomplete).";

  const agentLine =
    cc.amazon_rescue_next_agent_action.trim().length > 0
      ? `**Agent lane (Amazon rescue next_agent_action):** ${cc.amazon_rescue_next_agent_action}`
      : "**UNKNOWN:** Amazon rescue `next_agent_action` empty or missing on parsed Command Center v2.";

  const ignoreLines = [
    "- **INFERRED:** De-prioritize net-new Amazon PDP rescue work this week unless `next_best_action` still names it; operating priority is founder copy/paste reduction (per digest charter).",
    "- **PROVEN (from Command Center slice):** `known_unknowns` sample —",
    ...cc.known_unknowns_sample.slice(0, 5).map((u) => `  - ${u}`),
    ...(cc.known_unknowns_sample.length === 0 ? ["  - *(none sampled)*"] : []),
  ];

  const lines = [
    "# BuckParts Founder Digest",
    `Generated: ${input.generated_at}`,
    "",
    "## Is the repo / build healthy?",
    buildLine,
    "",
    "## Is live smoke OK?",
    smokeLine,
    "",
    "## Command Center next action",
    `**next_best_action:** ${cc.next_best_action}`,
    "",
    ...(input.founder_action_queue_digest_markdown
      ? [
          "## Founder Action Queue (read-only v1)",
          "Same Command Center snapshot as this digest (no extra I/O). Short labels: **needs_owner** = your decision; **agent_safe** = read-only agent work only; **waiting** / **blocked** = dependencies or gates; **do_not_touch** = do not expand mutating automation this week.",
          "",
          input.founder_action_queue_digest_markdown.trimEnd(),
          "",
          ...(input.founder_decision_packets_digest_markdown !== undefined
            ? [
                "## Founder Decision Packets (owner-only v1)",
                "**PROVEN:** Markdown below is from `founder_decision_packet_v1` (read-only builder). **Owner decisions only** — not agent execution prompts and not a grant of mutation authority.",
                FOUNDER_DECISION_REGISTRY_DIGEST_HINT_V1,
                "",
                input.founder_decision_packets_digest_markdown.trimEnd(),
                "",
              ]
            : []),
          ...(input.founder_decision_registry_read_model_digest_markdown !== undefined
            ? [
                "## Founder Decision Registry (read model v1)",
                "**PROVEN:** Markdown below is from `founder_decision_registry_read_model_v1` (filesystem scan of `data/owner-decisions/*.json` only). Counts are informational — **not** consumed by Runner, queues, or packets.",
                "",
                input.founder_decision_registry_read_model_digest_markdown.trimEnd(),
                "",
              ]
            : []),
          ...(input.founder_execution_packets_digest_markdown !== undefined
            ? [
                "## Founder Execution Packets (read-only v1)",
                "**PROVEN:** Markdown below is from `founder_execution_packet_v1` using the same Founder Action Queue rows (pure builder; no Supabase, retailer_links, evidence, or affiliate mutations).",
                "",
                input.founder_execution_packets_digest_markdown.trimEnd(),
                "",
              ]
            : []),
        ]
      : []),
    ...(input.runner_step_digest_markdown
      ? ["", input.runner_step_digest_markdown.trimEnd(), ""]
      : []),
    ...(input.failure_pattern_registry_digest_markdown
      ? [
          "## Failure Pattern Registry (read-only v1)",
          "**PROVEN:** Markdown below is from `failure_pattern_registry_read_model_v1` (seeded catalog in `src/lib/owner-dashboard/failure-pattern-registry-v1.ts`). **PROVEN:** Same truth contract as `docs/BuckParts-FAILURE-PATTERN-REGISTRY.md` — counts and rows are informational only; **not** consumed by Runner, Action Queue, Decision Packets, Execution Packets, or mutation gates.",
          FAILURE_PATTERN_REGISTRY_DIGEST_HINT_V1,
          "",
          input.failure_pattern_registry_digest_markdown.trimEnd(),
          "",
        ]
      : []),
    ...(input.layer_six_readiness_digest_markdown
      ? [
          "## Layer 6 Readiness Summary (informational v1)",
          LAYER_SIX_READINESS_DIGEST_HINT_V1,
          "",
          input.layer_six_readiness_digest_markdown.trimEnd(),
          "",
        ]
      : []),
    ...(input.codex_packet_proof_digest_markdown
      ? [
          "## Codex Packet Proof (informational v1)",
          CODEX_PACKET_PROOF_DIGEST_HINT_V1,
          "",
          input.codex_packet_proof_digest_markdown.trimEnd(),
          "",
        ]
      : []),
    ...(input.codex_output_review_digest_markdown
      ? [
          "## Codex Output Review Packet (owner-only v1)",
          CODEX_OUTPUT_REVIEW_DIGEST_HINT_V1,
          "",
          "**PROVEN:** Jared may conceptually approve read-only findings, reject them, request another read-only Codex pass, or defer — record intent in Founder Decision Registry v1 when applicable.",
          "**NOT PROVEN:** Layer 6 completion, mutation authority, Runner automation input, or closed-loop autonomy.",
          "**PROVEN:** PASS proof + readable final message evidences Codex **transport/capture** for digest — **`codex_task_outcome_status`** in the fragment separates validation/task success from capture (read-only sandboxes often block `.next/*`, temp IPC / `tsx`, or toolchain caches).",
          "",
          input.codex_output_review_digest_markdown.trimEnd(),
          "",
        ]
      : []),
    "## What requires Jared specifically?",
    `**command_center_v2.next_owner_action:** ${cc.next_owner_action}`,
    "",
    "## What can an agent do without Jared?",
    agentLine,
    `**execution_guidance.next_move_mode:** \`${cc.next_move_mode}\`; **mutating_blocked:** \`${String(cc.mutating_blocked)}\`.`,
    ...(cc.mutating_block_reasons.length > 0
      ? ["", "**Mutating block reasons (Command Center):**", ...cc.mutating_block_reasons.slice(0, 6).map((r) => `- ${r}`)]
      : []),
    "",
    "## What should be ignored this week?",
    ...ignoreLines,
    "",
    "## What changed since the prior run?",
    input.compare_note,
    "",
    "## Notification",
    "**UNKNOWN:** This repo contains no Slack, email, PagerDuty, or GitHub-issue notification wiring for digest or Daily Operator workflows; only GitHub Actions run UI + optional `GITHUB_STEP_SUMMARY` / artifacts apply unless org-level notifications are configured outside the repo.",
    "",
    "---",
    `Source report: \`${cc.report_name}\` @ ${cc.generated_at}; system_health: \`${cc.system_health_status}\`.`,
  ];

  return `${lines.join("\n")}\n`;
}

export function sliceCommandCenterForFounderDigest(
  cc: Record<string, unknown> & {
    report_name?: string;
    generated_at?: string;
    system_health_summary?: { status?: string };
    next_best_action?: string;
    known_unknowns?: string[];
    execution_guidance?: {
      next_move_mode?: string;
      mutating_blocked?: boolean;
      mutating_block_reasons?: string[];
    };
    command_center_v2?: Record<string, unknown>;
  },
): FounderDigestCommandCenterSliceV1 {
  const v2 = cc.command_center_v2;
  const nextOwner =
    v2 && typeof v2 === "object" && typeof (v2 as { next_owner_action?: string }).next_owner_action === "string"
      ? (v2 as { next_owner_action: string }).next_owner_action
      : "UNKNOWN";
  const deploy = v2 && typeof v2 === "object" ? (v2 as { deploy_live_site_status?: Record<string, unknown> }).deploy_live_site_status : undefined;
  const deployStatus =
    deploy && typeof deploy === "object" && typeof deploy.status === "string" ? deploy.status : "UNKNOWN";
  const mon =
    deploy && typeof deploy === "object" ? (deploy as { live_site_monitor?: Record<string, unknown> | null }).live_site_monitor : null;
  const liveRt =
    mon && typeof mon === "object" && typeof (mon as { runtime_status?: string }).runtime_status === "string"
      ? (mon as { runtime_status: string }).runtime_status
      : "UNKNOWN";
  const routes =
    mon && typeof mon === "object" && Array.isArray((mon as { routes?: unknown[] }).routes)
      ? `${(mon as { routes: { ok?: boolean }[] }).routes.filter((r) => r.ok).length}/${(mon as { routes: unknown[] }).routes.length} OK`
      : "UNKNOWN";
  const amazon = v2 && typeof v2 === "object" ? (v2 as { amazon_rescue?: Record<string, unknown> }).amazon_rescue : undefined;
  const nextAgent =
    amazon && typeof amazon === "object" && typeof (amazon as { next_agent_action?: string }).next_agent_action === "string"
      ? (amazon as { next_agent_action: string }).next_agent_action
      : "";

  const eg = cc.execution_guidance;
  const nextMove = eg && typeof eg === "object" && typeof (eg as { next_move_mode?: string }).next_move_mode === "string" ? (eg as { next_move_mode: string }).next_move_mode : "UNKNOWN";
  const mutBlocked = Boolean(eg && typeof eg === "object" && (eg as { mutating_blocked?: boolean }).mutating_blocked);
  const mutReasons =
    eg && typeof eg === "object" && Array.isArray((eg as { mutating_block_reasons?: string[] }).mutating_block_reasons)
      ? ((eg as { mutating_block_reasons: string[] }).mutating_block_reasons ?? []).filter((s) => typeof s === "string")
      : [];

  const ku = Array.isArray(cc.known_unknowns) ? cc.known_unknowns.filter((s): s is string => typeof s === "string") : [];

  return {
    report_name: typeof cc.report_name === "string" ? cc.report_name : "UNKNOWN",
    generated_at: typeof cc.generated_at === "string" ? cc.generated_at : "UNKNOWN",
    system_health_status:
      cc.system_health_summary && typeof cc.system_health_summary === "object"
        ? String((cc.system_health_summary as { status?: string }).status ?? "UNKNOWN")
        : "UNKNOWN",
    next_best_action: typeof cc.next_best_action === "string" ? cc.next_best_action : "UNKNOWN",
    next_owner_action: nextOwner,
    next_move_mode: nextMove,
    mutating_blocked: mutBlocked,
    mutating_block_reasons: mutReasons,
    deploy_lane_status: deployStatus,
    live_site_runtime_status: liveRt,
    route_health_one_liner: routes,
    amazon_rescue_next_agent_action: nextAgent,
    known_unknowns_sample: ku.slice(0, 8),
  };
}
