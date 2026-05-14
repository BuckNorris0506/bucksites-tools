/**
 * Pure types + builders for BuckParts Runner Step v1 (read-only, repo-owned validation).
 * Does not spawn processes — CLI owns subprocess execution.
 */

import type { FounderExecutionPacketV1 } from "../../src/lib/owner-dashboard/founder-execution-packet-v1";
import type { NextExecutionPacketSnapshotV1 } from "./buckparts-next-execution-packet";

export const BUCKPARTS_RUNNER_STEP_CONTRACT_V1 = "buckparts_runner_step_v1" as const;

/** npm script names only — CLI must spawn `npm run <name>` and nothing else for validation. */
export const RUNNER_STEP_ALLOWED_NPM_SCRIPTS_V1 = ["lint", "build", "buckparts:operator-proof"] as const;

export type RunnerStepAllowedNpmScriptV1 = (typeof RUNNER_STEP_ALLOWED_NPM_SCRIPTS_V1)[number];

export type RunnerStepLayerTruthV1 = {
  layer_3_repo_owned_execution: "PROVEN";
  layer_3_external_agent_execution: "UNKNOWN";
  layer_4_output_capture: "PROVEN_FOR_REPO_COMMANDS_ONLY";
  layer_5_validation_interpretation: "PARTIAL";
  layer_6_founder_only_approval: "NOT_PROVEN";
};

export const RUNNER_STEP_LAYER_TRUTH_V1: RunnerStepLayerTruthV1 = {
  layer_3_repo_owned_execution: "PROVEN",
  layer_3_external_agent_execution: "UNKNOWN",
  layer_4_output_capture: "PROVEN_FOR_REPO_COMMANDS_ONLY",
  layer_5_validation_interpretation: "PARTIAL",
  layer_6_founder_only_approval: "NOT_PROVEN",
};

/** Same substance as Founder Execution Packet defaults — confirmed by Runner step, not re-negotiated here. */
export const RUNNER_STEP_PROHIBITED_ACTIONS_CONFIRMED_V1: readonly string[] = [
  "Do not write to Supabase or run SQL that mutates database state.",
  "Do not mutate retailer_links or other retailer catalog/link artifacts except pure read-only inspection.",
  "Do not create, delete, or overwrite evidence JSON under data/evidence (or parallel evidence paths) unless the founder explicitly expands scope outside this packet.",
  "Do not change affiliate program URLs, tracking parameters, or affiliate application state in-repo.",
  "Do not run mutating npm scripts (e.g. inserts, apply, mutate flags) unless the founder explicitly instructs otherwise.",
];

export type RunnerStepOverallStatusV1 = "PASS" | "FAIL" | "BLOCKED" | "NO_PACKET";

export type RunnerStepCommandStatusV1 = "PASS" | "FAIL" | "SKIPPED";

export type RunnerStepCommandRecordV1 = {
  command: string;
  exit_code: number | null;
  status: RunnerStepCommandStatusV1;
  stdout_tail: string;
  stderr_tail: string;
};

export type RunnerStepSelectedPacketSummaryV1 = {
  id: string;
  title: string;
  source_queue_row_id: string;
};

export type BuckpartsRunnerStepOutputV1 = {
  contract: typeof BUCKPARTS_RUNNER_STEP_CONTRACT_V1;
  generated_at: string;
  read_only: true;
  data_mutation: false;
  layer_truth: RunnerStepLayerTruthV1;
  selected_packet: RunnerStepSelectedPacketSummaryV1 | null;
  commands: RunnerStepCommandRecordV1[];
  overall_status: RunnerStepOverallStatusV1;
  next_human_action: string;
  next_runner_action: string;
  prohibited_actions_confirmed: readonly string[];
  /** PROVEN context lines only — not a substitute for `npm run buckparts:next-execution-packet`. */
  runner_notes: string[];
};

export function isRunnerStepAllowedNpmScriptV1(name: string): name is RunnerStepAllowedNpmScriptV1 {
  return (RUNNER_STEP_ALLOWED_NPM_SCRIPTS_V1 as readonly string[]).includes(name);
}

/** PROVEN: rejects any script not in the v1 allowlist (no mutating / arbitrary npm targets). */
export function assertRunnerStepAllowedNpmScriptV1(name: string): asserts name is RunnerStepAllowedNpmScriptV1 {
  if (!isRunnerStepAllowedNpmScriptV1(name)) {
    throw new Error(
      `PROVEN violation: Runner Step v1 only allows npm scripts ${RUNNER_STEP_ALLOWED_NPM_SCRIPTS_V1.map((s) => JSON.stringify(s)).join(", ")}; got ${JSON.stringify(name)}`,
    );
  }
}

export function npmRunCommandDisplayV1(script: RunnerStepAllowedNpmScriptV1): string {
  return `npm run ${script}`;
}

export function tailTextV1(text: string, maxChars: number): string {
  const t = text.replace(/\r\n/g, "\n").trimEnd();
  if (t.length <= maxChars) {
    return t;
  }
  return t.slice(-maxChars);
}

export function commandRecordFromSpawnV1(args: {
  script: RunnerStepAllowedNpmScriptV1;
  exit_code: number | null;
  stdout: string;
  stderr: string;
  tailChars: number;
}): RunnerStepCommandRecordV1 {
  const command = npmRunCommandDisplayV1(args.script);
  const ok = args.exit_code === 0;
  return {
    command,
    exit_code: args.exit_code,
    status: ok ? "PASS" : "FAIL",
    stdout_tail: tailTextV1(args.stdout, args.tailChars),
    stderr_tail: tailTextV1(args.stderr, args.tailChars),
  };
}

export function skippedCommandRecordV1(displayCommand: string, reason: string): RunnerStepCommandRecordV1 {
  return {
    command: displayCommand,
    exit_code: null,
    status: "SKIPPED",
    stdout_tail: "",
    stderr_tail: tailTextV1(reason, 2000),
  };
}

export function summarizePacketForRunnerStepV1(packet: FounderExecutionPacketV1 | null): RunnerStepSelectedPacketSummaryV1 | null {
  if (!packet) {
    return null;
  }
  return {
    id: packet.id,
    title: packet.title,
    source_queue_row_id: packet.source_queue_row_id,
  };
}

function allCommandsPass(commands: RunnerStepCommandRecordV1[]): boolean {
  return commands.every((c) => c.status === "PASS");
}

function anyCommandFail(commands: RunnerStepCommandRecordV1[]): boolean {
  return commands.some((c) => c.status === "FAIL");
}

export function deriveOverallStatusV1(args: {
  command_center_ok: boolean;
  has_packet: boolean;
  commands: RunnerStepCommandRecordV1[];
}): RunnerStepOverallStatusV1 {
  if (!args.command_center_ok) {
    return "BLOCKED";
  }
  if (anyCommandFail(args.commands)) {
    return "FAIL";
  }
  if (!args.has_packet) {
    return "NO_PACKET";
  }
  if (allCommandsPass(args.commands)) {
    return "PASS";
  }
  return "FAIL";
}

export function buildNextHumanActionV1(args: {
  overall_status: RunnerStepOverallStatusV1;
  command_center_ok: boolean;
  has_packet: boolean;
}): string {
  if (!args.command_center_ok) {
    return "PROVEN: Repair Command Center — run `npm run buckparts:command-center` from repo root, fix reported issues, then re-run `npm run buckparts:runner-step`.";
  }
  if (args.overall_status === "FAIL") {
    return "PROVEN: Inspect failing command stderr/stdout_tail in this JSON; fix repo or environment; re-run `npm run buckparts:runner-step`.";
  }
  if (args.overall_status === "NO_PACKET") {
    return "PROVEN: No agent-safe read-only packet is available — address Founder Action Queue (owner-needed rows) or wait until a row becomes agent_safe + agent + read_only; optional: `npm run buckparts:next-execution-packet -- --list`.";
  }
  if (args.overall_status === "PASS") {
    return "INFERRED: Review validation results and packet scope; approve any follow-on work outside read-only posture.";
  }
  return "UNKNOWN";
}

export function buildNextRunnerActionV1(args: {
  overall_status: RunnerStepOverallStatusV1;
  command_center_ok: boolean;
}): string {
  if (!args.command_center_ok || args.overall_status === "BLOCKED") {
    return "PROVEN: Re-run after command_center_ok is true (same CLI).";
  }
  if (args.overall_status === "FAIL") {
    return "PROVEN: Re-run after validation commands pass locally.";
  }
  if (args.overall_status === "NO_PACKET") {
    return "PROVEN: Re-run after a Founder Execution Packet exists (queue eligibility unchanged).";
  }
  if (args.overall_status === "PASS") {
    return "INFERRED: Optionally re-run to refresh JSON after repo changes; no autonomous loop in v1.";
  }
  return "UNKNOWN";
}

/**
 * Assembles the JSON payload. `commands` must already reflect spawn results or SKIPPED rows.
 * PROVEN: `prohibited_actions_confirmed` uses packet list when present, else shared defaults.
 */
export function buildBuckpartsRunnerStepOutputV1(args: {
  generated_at: string;
  snapshot: NextExecutionPacketSnapshotV1;
  commands: RunnerStepCommandRecordV1[];
  runner_notes?: string[];
}): BuckpartsRunnerStepOutputV1 {
  const has_packet = args.snapshot.next_packet !== null;
  const overall_status = deriveOverallStatusV1({
    command_center_ok: args.snapshot.command_center_ok,
    has_packet,
    commands: args.commands,
  });
  const prohibited = args.snapshot.next_packet?.prohibited_actions?.length
    ? args.snapshot.next_packet.prohibited_actions
    : [...RUNNER_STEP_PROHIBITED_ACTIONS_CONFIRMED_V1];
  const notes = args.runner_notes ?? [];
  if (!args.snapshot.command_center_ok) {
    notes.push("PROVEN: command_center_ok=false — validation commands were not executed (BLOCKED).");
  } else if (!has_packet) {
    notes.push(
      "PROVEN: No next_packet — validation still ran to prove repo-owned subprocess capture (read-only allowlist only).",
    );
  } else {
    notes.push(
      "PROVEN: Validation bundle is hardcoded to lint/build/buckparts:operator-proof only — packet.validation_command is not executed by Runner Step v1 (safety).",
    );
  }
  return {
    contract: BUCKPARTS_RUNNER_STEP_CONTRACT_V1,
    generated_at: args.generated_at,
    read_only: true,
    data_mutation: false,
    layer_truth: RUNNER_STEP_LAYER_TRUTH_V1,
    selected_packet: summarizePacketForRunnerStepV1(args.snapshot.next_packet),
    commands: args.commands,
    overall_status,
    next_human_action: buildNextHumanActionV1({
      overall_status,
      command_center_ok: args.snapshot.command_center_ok,
      has_packet,
    }),
    next_runner_action: buildNextRunnerActionV1({ overall_status, command_center_ok: args.snapshot.command_center_ok }),
    prohibited_actions_confirmed: prohibited,
    runner_notes: notes,
  };
}
