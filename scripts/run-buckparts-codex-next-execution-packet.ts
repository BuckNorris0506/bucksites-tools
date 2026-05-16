/**
 * Read-only Codex wrapper for the **current** Founder Execution Packet from `buildNextExecutionPacketSnapshotV1`.
 *
 * **PROVEN in repo:** packet snapshot builder + bounded Codex exec + JSONL/final-message capture + clean-git gate.
 * **NOT PROVEN:** Layer 6 founder approval, mutation safety beyond read-only sandbox + prompt, closed-loop Runner.
 *
 *   npm run buckparts:codex-next-execution-packet
 */

import path from "node:path";
import { fileURLToPath } from "node:url";

import type { FounderExecutionPacketV1 } from "../src/lib/owner-dashboard/founder-execution-packet-v1";
import {
  buildNextExecutionPacketSnapshotV1,
  type NextExecutionPacketSnapshotV1,
} from "./lib/buckparts-next-execution-packet";
import {
  defaultBuckpartsCodexReadonlySmokeDeps,
  type BuckpartsCodexReadonlySmokeDeps,
  isGitStatusShortClean,
  summarizeCodexExecJsonlStdout,
} from "./run-buckparts-codex-readonly-smoke.ts";

export const BUCKPARTS_CODEX_NEXT_EXECUTION_PACKET_CONTRACT_V1 = "buckparts_codex_next_execution_packet_v1" as const;

export type BuckpartsCodexNextExecutionPacketDeps = BuckpartsCodexReadonlySmokeDeps & {
  buildSnapshot: (repoRoot: string) => Promise<NextExecutionPacketSnapshotV1>;
};

export type BuckpartsCodexNextExecutionPacketSummaryV1 = {
  contract: typeof BUCKPARTS_CODEX_NEXT_EXECUTION_PACKET_CONTRACT_V1;
  overall_status: "PASS" | "NO_PACKET" | "FAIL";
  source_packet_id: string | null;
  source_queue_row_id: string | null;
  source_packet_title: string | null;
  codex_executed: boolean;
  external_agent: "codex";
  external_agent_execution: "PROVEN_FOR_READ_ONLY_EXECUTION_PACKET" | "NOT_RUN";
  output_capture: "PROVEN_FOR_CODEX_JSONL_AND_FINAL_MESSAGE" | "NOT_RUN";
  sandbox: "read-only" | null;
  final_message_path: string | null;
  jsonl_path: string | null;
  event_count: number | null;
  first_event: string | null;
  last_event: string | null;
  git_status_clean: boolean | null;
  layer_6_founder_only_approval: "NOT_PROVEN";
};

export function buildCodexNextExecutionPacketWrapperPrefixV1(): string {
  return [
    "## CODEX EXECUTION WRAPPER (READ-ONLY — buckparts_codex_next_execution_packet_v1)",
    "",
    "Hard constraints for this Codex session (the Founder Execution Packet `copy_paste_prompt` follows):",
    "- Do not edit, create, delete, rename, or stage any repository files.",
    "- Do not write to Supabase or run SQL that mutates database state.",
    "- Do not mutate retailer_links or other retailer catalog/link artifacts except pure read-only inspection.",
    "- Do not create, delete, or overwrite evidence JSON under data/evidence (or parallel evidence paths).",
    "- Do not change affiliate program URLs, tracking parameters, or affiliate application state in-repo.",
    "- Do not create git commits.",
    "- Return structured findings only: what you checked, pass/fail, what remains owner-only.",
    "",
    "---",
    "",
  ].join("\n");
}

/** Full Codex instruction string = wrapper + packet `copy_paste_prompt` only (repo-built text). */
export function buildCodexPromptForNextExecutionPacketV1(packet: FounderExecutionPacketV1): string {
  return `${buildCodexNextExecutionPacketWrapperPrefixV1()}${packet.copy_paste_prompt}`;
}

export function buildNoPacketSummaryV1(): BuckpartsCodexNextExecutionPacketSummaryV1 {
  return {
    contract: BUCKPARTS_CODEX_NEXT_EXECUTION_PACKET_CONTRACT_V1,
    overall_status: "NO_PACKET",
    source_packet_id: null,
    source_queue_row_id: null,
    source_packet_title: null,
    codex_executed: false,
    external_agent: "codex",
    external_agent_execution: "NOT_RUN",
    output_capture: "NOT_RUN",
    sandbox: null,
    final_message_path: null,
    jsonl_path: null,
    event_count: null,
    first_event: null,
    last_event: null,
    git_status_clean: null,
    layer_6_founder_only_approval: "NOT_PROVEN",
  };
}

export function buildPassSummaryV1(args: {
  packet: FounderExecutionPacketV1;
  finalMessagePath: string;
  jsonlPath: string;
  eventCount: number;
  firstEvent: string | null;
  lastEvent: string | null;
  gitClean: boolean;
}): BuckpartsCodexNextExecutionPacketSummaryV1 {
  return {
    contract: BUCKPARTS_CODEX_NEXT_EXECUTION_PACKET_CONTRACT_V1,
    overall_status: "PASS",
    source_packet_id: args.packet.id,
    source_queue_row_id: args.packet.source_queue_row_id,
    source_packet_title: args.packet.title,
    codex_executed: true,
    external_agent: "codex",
    external_agent_execution: "PROVEN_FOR_READ_ONLY_EXECUTION_PACKET",
    output_capture: "PROVEN_FOR_CODEX_JSONL_AND_FINAL_MESSAGE",
    sandbox: "read-only",
    final_message_path: args.finalMessagePath,
    jsonl_path: args.jsonlPath,
    event_count: args.eventCount,
    first_event: args.firstEvent,
    last_event: args.lastEvent,
    git_status_clean: args.gitClean,
    layer_6_founder_only_approval: "NOT_PROVEN",
  };
}

export async function runBuckpartsCodexNextExecutionPacketMain(
  deps: BuckpartsCodexNextExecutionPacketDeps,
  options?: { repoRoot?: string },
): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  const repoRoot = path.resolve(options?.repoRoot ?? deps.cwd());
  const err: string[] = [];

  let snapshot: NextExecutionPacketSnapshotV1;
  try {
    snapshot = await deps.buildSnapshot(repoRoot);
  } catch (e) {
    err.push(
      "PROVEN: buildNextExecutionPacketSnapshotV1 threw.",
      String(e instanceof Error ? e.message : e),
    );
    return { exitCode: 1, stdout: "", stderr: err.join("\n") };
  }

  if (!snapshot.command_center_ok) {
    err.push(
      "PROVEN: Command Center report build failed; refusing Codex execution. Re-run locally with `npm run buckparts:command-center` for details.",
    );
    return { exitCode: 1, stdout: "", stderr: err.join("\n") };
  }

  if (!snapshot.next_packet) {
    const summary = buildNoPacketSummaryV1();
    return {
      exitCode: 0,
      stdout: `${JSON.stringify(summary, null, 2)}\n`,
      stderr: "",
    };
  }

  const packet = snapshot.next_packet;

  const v = deps.spawnSync("codex", ["--version"]);
  if (v.status !== 0) {
    err.push(
      v.stderr.trim() || v.stdout.trim() || "PROVEN: codex --version failed; install Codex CLI and ensure it is on PATH.",
    );
    return { exitCode: 127, stdout: "", stderr: err.join("\n") };
  }

  const auth = deps.spawnSync("codex", ["login", "status"]);
  if (auth.status !== 0) {
    err.push("PROVEN: codex login status failed.", auth.stderr.trim() || auth.stdout.trim());
    return { exitCode: 1, stdout: "", stderr: err.join("\n") };
  }

  let tmpDir: string;
  try {
    tmpDir = deps.mkdtempSync(deps.join(deps.tmpdir(), "buckparts-codex-next-execution-packet-"));
  } catch (e) {
    err.push(String(e instanceof Error ? e.message : e));
    return { exitCode: 1, stdout: "", stderr: err.join("\n") };
  }

  const finalMessagePath = deps.join(tmpDir, "final-message.txt");
  const jsonlPath = deps.join(tmpDir, "events.jsonl");
  const codexPrompt = buildCodexPromptForNextExecutionPacketV1(packet);

  const execArgs = ["exec", "--cd", repoRoot, "--sandbox", "read-only", "--json", "-o", finalMessagePath, codexPrompt];
  const ex = deps.spawnSync("codex", execArgs, { cwd: repoRoot });
  if (ex.status !== 0) {
    err.push("PROVEN: codex exec failed.", ex.stderr.trim() || ex.stdout.trim());
    return { exitCode: 1, stdout: "", stderr: err.join("\n") };
  }

  const jsonlRaw = ex.stdout;
  if (jsonlRaw.trim().length === 0) {
    err.push("PROVEN: codex exec --json produced empty JSONL stdout (expected non-empty JSONL stream).");
    return { exitCode: 1, stdout: "", stderr: err.join("\n") };
  }

  try {
    deps.writeFileSync(jsonlPath, jsonlRaw, "utf8");
  } catch (e) {
    err.push(String(e instanceof Error ? e.message : e));
    return { exitCode: 1, stdout: "", stderr: err.join("\n") };
  }

  let finalText: string;
  try {
    finalText = deps.readFileSync(finalMessagePath, "utf8");
  } catch (e) {
    err.push(
      `PROVEN: final message file missing or unreadable at ${finalMessagePath}:`,
      String(e instanceof Error ? e.message : e),
    );
    return { exitCode: 1, stdout: "", stderr: err.join("\n") };
  }

  if (finalText.trim().length === 0) {
    err.push("PROVEN: final message file (-o) is empty.");
    return { exitCode: 1, stdout: "", stderr: err.join("\n") };
  }

  let writtenJsonl: string;
  try {
    writtenJsonl = deps.readFileSync(jsonlPath, "utf8");
  } catch (e) {
    err.push(String(e instanceof Error ? e.message : e));
    return { exitCode: 1, stdout: "", stderr: err.join("\n") };
  }

  if (writtenJsonl.trim().length === 0) {
    err.push("PROVEN: JSONL capture file is empty after write.");
    return { exitCode: 1, stdout: "", stderr: err.join("\n") };
  }

  const { event_count, first_event, last_event } = summarizeCodexExecJsonlStdout(writtenJsonl);
  if (event_count === 0) {
    err.push("PROVEN: JSONL stream had no parseable `.type` fields (unexpected for codex exec --json).");
    return { exitCode: 1, stdout: "", stderr: err.join("\n") };
  }

  const gs = deps.spawnSync("git", ["status", "--short"], { cwd: repoRoot });
  if (gs.status !== 0) {
    err.push("PROVEN: git status --short failed.", gs.stderr.trim() || gs.stdout.trim());
    return { exitCode: 1, stdout: "", stderr: err.join("\n") };
  }

  const gitClean = isGitStatusShortClean(gs.stdout);
  if (!gitClean) {
    err.push(
      "PROVEN: working tree not clean after Codex execution (git status --short non-empty).",
      gs.stdout.trim(),
    );
    return { exitCode: 1, stdout: "", stderr: err.join("\n") };
  }

  const summary = buildPassSummaryV1({
    packet,
    finalMessagePath,
    jsonlPath,
    eventCount: event_count,
    firstEvent: first_event,
    lastEvent: last_event,
    gitClean,
  });

  return {
    exitCode: 0,
    stdout: `${JSON.stringify(summary, null, 2)}\n`,
    stderr: "",
  };
}

export const defaultBuckpartsCodexNextExecutionPacketDeps: BuckpartsCodexNextExecutionPacketDeps = {
  ...defaultBuckpartsCodexReadonlySmokeDeps,
  buildSnapshot: buildNextExecutionPacketSnapshotV1,
};

async function cliMain(): Promise<void> {
  const { exitCode, stdout, stderr } = await runBuckpartsCodexNextExecutionPacketMain(
    defaultBuckpartsCodexNextExecutionPacketDeps,
  );
  if (stderr.trim()) {
    process.stderr.write(`${stderr}\n`);
  }
  if (stdout) {
    process.stdout.write(stdout);
  }
  process.exit(exitCode);
}

const THIS_FILE = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === THIS_FILE) {
  cliMain().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
