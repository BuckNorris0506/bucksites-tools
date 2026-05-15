/**
 * Pure Runner Step visibility for founder digest + dashboard (no subprocess, no mutations).
 */

import type { FounderExecutionPacketV1 } from "../../src/lib/owner-dashboard/founder-execution-packet-v1";
import type { BuckpartsRunnerStepOutputV1, RunnerStepLayerTruthV1 } from "./buckparts-runner-step-v1";
import {
  RUNNER_STEP_ALLOWED_NPM_SCRIPTS_V1,
  RUNNER_STEP_LAYER_TRUTH_V1,
  npmRunCommandDisplayV1,
} from "./buckparts-runner-step-v1";
import { RUNNER_EXPECTED_DEFAULT_PROHIBITED_ACTION_LINES_V1 } from "./buckparts-runner-safety-contract-v1";

export const BUCKPARTS_RUNNER_STEP_VISIBILITY_CONTRACT_V1 = "buckparts_runner_step_visibility_v1" as const;

export type RunnerStepVisibilitySurfaceV1 = "founder_digest" | "owner_dashboard";

/**
 * Modeled visibility when `npm run buckparts:runner-step` was **not** executed on this surface.
 * **PROVEN:** `live_runner_step_json` is always `UNKNOWN` here (no CLI JSON in this request).
 */
export type RunnerStepVisibilityModelV1 = {
  contract: typeof BUCKPARTS_RUNNER_STEP_VISIBILITY_CONTRACT_V1;
  surface: RunnerStepVisibilitySurfaceV1;
  live_runner_step_json: "UNKNOWN";
  command_center_ok: boolean;
  modeled_next_packet_id: string | null;
  modeled_next_packet_title: string | null;
  planned_validation_commands: readonly string[];
  layer_truth: RunnerStepLayerTruthV1;
  prohibited_actions_count: number;
  external_agent_execution: "UNKNOWN";
  next_human_action_hint: string;
  next_runner_action_hint: string;
};

export function buildRunnerStepVisibilityModeledV1(args: {
  surface: RunnerStepVisibilitySurfaceV1;
  command_center_ok: boolean;
  nextPacket: FounderExecutionPacketV1 | null;
}): RunnerStepVisibilityModelV1 {
  const planned = RUNNER_STEP_ALLOWED_NPM_SCRIPTS_V1.map((s) => npmRunCommandDisplayV1(s));
  const paCount = args.nextPacket?.prohibited_actions.length ?? 0;
  return {
    contract: BUCKPARTS_RUNNER_STEP_VISIBILITY_CONTRACT_V1,
    surface: args.surface,
    live_runner_step_json: "UNKNOWN",
    command_center_ok: args.command_center_ok,
    modeled_next_packet_id: args.nextPacket?.id ?? null,
    modeled_next_packet_title: args.nextPacket?.title ?? null,
    planned_validation_commands: planned,
    layer_truth: RUNNER_STEP_LAYER_TRUTH_V1,
    prohibited_actions_count: paCount,
    external_agent_execution: "UNKNOWN",
    next_human_action_hint:
      "PROVEN: For structured PASS/FAIL JSON from repo-owned validation, run `npm run buckparts:runner-step` at repo root (allowlist: lint, build, buckparts:operator-proof only).",
    next_runner_action_hint:
      "INFERRED: Re-run that command after code changes or when investigating validation regressions.",
  };
}

function layerTruthLines(lt: RunnerStepLayerTruthV1): string[] {
  return [
    `- **Layer 3 (repo-owned subprocess):** \`${lt.layer_3_repo_owned_execution}\` only after \`npm run buckparts:runner-step\` runs — **UNKNOWN** on this surface.`,
    `- **Layer 3 (external Cursor/Codex/OpenAI):** \`${lt.layer_3_external_agent_execution}\`.`,
    `- **Layer 4 (output capture):** \`${lt.layer_4_output_capture}\` for those repo commands when the CLI runs — **UNKNOWN** here.`,
    `- **Layer 5 (validation interpretation):** \`${lt.layer_5_validation_interpretation}\`.`,
    `- **Layer 6 (founder-only approval):** \`${lt.layer_6_founder_only_approval}\`.`,
  ];
}

/** Layer truth bullets when rendering a captured Runner Step JSON (not the modeled-only digest path). */
function layerTruthLinesFromLiveCliJsonV1(lt: RunnerStepLayerTruthV1): string[] {
  return [
    `- **Layer 3 (repo-owned subprocess):** \`${lt.layer_3_repo_owned_execution}\` for allowlisted commands in this JSON.`,
    `- **Layer 3 (external Cursor/Codex/OpenAI):** \`${lt.layer_3_external_agent_execution}\`.`,
    `- **Layer 4 (output capture):** \`${lt.layer_4_output_capture}\` for those repo commands in this run.`,
    `- **Layer 5 (validation interpretation):** \`${lt.layer_5_validation_interpretation}\`.`,
    `- **Layer 6 (founder-only approval):** \`${lt.layer_6_founder_only_approval}\`.`,
  ];
}

/**
 * Concise job-summary markdown for CI (matches the legacy Runner Step workflow inline copy).
 * **PROVEN:** `scripts/buckparts-runner-step-append-github-step-summary.ts` imports this named export;
 * GitHub workflows must call that script — not stdin heredocs — so Node/tsx resolves this module from disk.
 * Pure: caller reads JSON and passes `output`.
 */
export function formatConciseRunnerStepGithubStepSummaryMarkdownV1(output: BuckpartsRunnerStepOutputV1): string {
  const lines = [
    "## BuckParts Runner Step v1 (CI)",
    "",
    `**PROVEN:** \`overall_status\` = \`${output.overall_status}\` (from \`buckparts-runner-step.json\` produced by \`node --import tsx scripts/buckparts-runner-step.ts\`).`,
    "**UNKNOWN:** Cursor / Codex / OpenAI autonomous execution is **not** part of this workflow; only repo-owned npm allowlist commands run inside the Runner Step script.",
    "",
  ];
  if (output.selected_packet && output.selected_packet.title) {
    lines.push(
      `**Selected packet:** ${output.selected_packet.title} (\`${output.selected_packet.id}\`).`,
      "",
    );
  } else {
    lines.push("**Selected packet:** *(none)*", "");
  }
  lines.push("**Layer truth (from JSON):**", "");
  const lt = output.layer_truth || {};
  for (const [k, v] of Object.entries(lt)) {
    lines.push(`- \`${k}\`: \`${String(v)}\``);
  }
  lines.push("", "**Command statuses:**", "");
  for (const c of output.commands || []) {
    lines.push(`- \`${c.command}\`: **${c.status}** (exit ${JSON.stringify(c.exit_code)})`);
  }
  lines.push("");
  return `${lines.join("\n")}\n`;
}

/** Concise markdown for founder digest (no HTML). */
export function formatRunnerStepDigestSectionMarkdownV1(model: RunnerStepVisibilityModelV1): string {
  const packetLine =
    model.modeled_next_packet_id && model.modeled_next_packet_title
      ? `**Modeled next packet (from same queue as digest):** \`${model.modeled_next_packet_title}\` · id \`${model.modeled_next_packet_id}\`.`
      : "**PROVEN:** No agent-safe execution packet modeled from this digest's queue (same eligibility as Founder Execution Packets section).";
  const ccLine = model.command_center_ok
    ? "**PROVEN:** Command Center snapshot for this digest succeeded."
    : "**PROVEN:** Command Center snapshot failed for this digest — queue/packet modeling may be fallback-only.";
  const cmdLine = `**Planned repo validation commands (allowlist only, not run in digest):** ${model.planned_validation_commands.join(", ")}.`;
  const prohibLine =
    model.modeled_next_packet_id && model.modeled_next_packet_title
      ? `**PROVEN:** This packet carries \`${String(model.prohibited_actions_count)}\` \`prohibited_actions\` lines (Supabase / retailer_links / evidence / affiliate / mutating npm posture).`
      : `**INFERRED:** No modeled packet in this digest — default prohibition lines (${String(RUNNER_EXPECTED_DEFAULT_PROHIBITED_ACTION_LINES_V1.length)}) apply once a packet is emitted (\`founder_execution_packet_v1\`).`;

  const lines = [
    "## Runner Step (read-only v1)",
    "",
    "**PROVEN:** This digest run did **not** execute `npm run buckparts:runner-step` (avoids duplicate lint/build/operator-proof and keeps digest latency bounded).",
    "**PROVEN:** Live Runner Step JSON for this exact moment is **UNKNOWN** on this surface — run the CLI locally or inspect CI logs where it is invoked.",
    "**PROVEN:** Repo-owned validation **when the CLI runs** is allowlisted to `lint`, `build`, and `buckparts:operator-proof` only (`scripts/lib/buckparts-runner-safety-contract-v1.ts`).",
    "**UNKNOWN:** Cursor / Codex / OpenAI end-to-end execution of the packet is **not** integrated in-repo; human paste and judgment still apply.",
    "",
    ccLine,
    packetLine,
    cmdLine,
    prohibLine,
    "",
    "**Layer truth (design contract — not a live CLI result here):**",
    ...layerTruthLines(model.layer_truth),
    "",
    `**Next human action:** ${model.next_human_action_hint}`,
    `**Next runner action:** ${model.next_runner_action_hint}`,
    "",
  ];
  return `${lines.join("\n")}\n`;
}

/** Human-readable summary lines from a real CLI JSON object (e.g. pasted logs). Pure formatter. */
export function formatRunnerStepCliResultMarkdownV1(output: BuckpartsRunnerStepOutputV1): string {
  const pkt =
    output.selected_packet === null
      ? "**selected_packet:** none."
      : `**selected_packet:** \`${output.selected_packet.title}\` (\`${output.selected_packet.id}\`).`;
  const cmds = output.commands
    .map((c) => `- \`${c.command}\` → ${c.status} (exit ${String(c.exit_code)})`)
    .join("\n");
  const lt = layerTruthLinesFromLiveCliJsonV1(output.layer_truth).join("\n");
  return [
    "## Runner Step (read-only v1 · live JSON)",
    "",
    `**PROVEN:** \`overall_status\`=\`${output.overall_status}\` from Runner Step v1 JSON (\`contract\`=\`${output.contract}\`; same entrypoint as \`npm run buckparts:runner-step\` → \`tsx scripts/buckparts-runner-step.ts\`).`,
    "**PROVEN:** Repo-owned subprocess validation above applies only to the three allowlisted commands — not arbitrary packet text.",
    "**UNKNOWN:** External IDE/agent execution remains outside this JSON.",
    "",
    pkt,
    "",
    "**Command statuses:**",
    cmds,
    "",
    "**Layer truth (from CLI JSON):**",
    lt,
    "",
    `**next_human_action:** ${output.next_human_action}`,
    `**next_runner_action:** ${output.next_runner_action}`,
    "",
    `**prohibited_actions_confirmed:** ${String(output.prohibited_actions_confirmed.length)} line(s).`,
    "",
  ].join("\n");
}
