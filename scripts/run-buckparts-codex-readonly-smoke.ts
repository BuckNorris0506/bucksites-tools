/**
 * Read-only Codex external-agent smoke: `codex exec --sandbox read-only --json` + post-run git check.
 *
 * **PROVEN in repo:** wrapper + temp JSONL/final-message capture + summary contract.
 * **NOT PROVEN:** Layer 6 founder approval, closed-loop Runner, or mutation authority.
 *
 *   npm run buckparts:codex-readonly-smoke
 *
 * Requires: `codex` CLI installed and `codex login status` succeeding on the host.
 */

import { spawnSync as nodeSpawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const BUCKPARTS_CODEX_READONLY_SMOKE_CONTRACT_V1 = "buckparts_codex_readonly_smoke_v1" as const;

/** PROVEN: bounded prompt — package.json inspection only; no file mutations requested. */
export const BUCKPARTS_CODEX_READONLY_SMOKE_PROMPT_V1 =
  "BuckParts read-only smoke: Inspect package.json only (read factual fields such as name/version/scripts). Do not modify, create, delete, rename, or stage any repository files. Respond with a short plain-text confirmation only.";

export type SpawnSyncResult = {
  status: number | null;
  stdout: string;
  stderr: string;
};

export type BuckpartsCodexReadonlySmokeDeps = {
  spawnSync: (
    command: string,
    args: readonly string[],
    options?: { cwd?: string; encoding?: "utf8" },
  ) => SpawnSyncResult;
  mkdtempSync: typeof mkdtempSync;
  join: typeof path.join;
  tmpdir: typeof tmpdir;
  readFileSync: typeof readFileSync;
  writeFileSync: typeof writeFileSync;
  cwd: () => string;
};

function defaultSpawnSync(
  command: string,
  args: readonly string[],
  options?: { cwd?: string; encoding?: "utf8" },
): SpawnSyncResult {
  const r = nodeSpawnSync(command, [...args], {
    encoding: "utf8",
    ...(options?.cwd ? { cwd: options.cwd } : {}),
  });
  return {
    status: r.status,
    stdout: typeof r.stdout === "string" ? r.stdout : String(r.stdout ?? ""),
    stderr: typeof r.stderr === "string" ? r.stderr : String(r.stderr ?? ""),
  };
}

export const defaultBuckpartsCodexReadonlySmokeDeps: BuckpartsCodexReadonlySmokeDeps = {
  spawnSync: defaultSpawnSync,
  mkdtempSync,
  join: path.join,
  tmpdir,
  readFileSync,
  writeFileSync,
  cwd: () => process.cwd(),
};

export type BuckpartsCodexReadonlySmokeSummaryV1 = {
  contract: typeof BUCKPARTS_CODEX_READONLY_SMOKE_CONTRACT_V1;
  external_agent: "codex";
  external_agent_execution: "PROVEN_FOR_READ_ONLY_SMOKE";
  output_capture: "PROVEN_FOR_CODEX_JSONL_AND_FINAL_MESSAGE";
  sandbox: "read-only";
  final_message_path: string;
  jsonl_path: string;
  event_count: number;
  first_event: string | null;
  last_event: string | null;
  git_status_clean: boolean;
  layer_6_founder_only_approval: "NOT_PROVEN";
};

/** PROVEN: each non-empty line is JSON with string `.type` (Codex `--json` JSONL stream). */
export function summarizeCodexExecJsonlStdout(stdout: string): {
  event_count: number;
  first_event: string | null;
  last_event: string | null;
} {
  const lines = stdout
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  const types: string[] = [];
  for (const line of lines) {
    let o: unknown;
    try {
      o = JSON.parse(line) as unknown;
    } catch {
      continue;
    }
    if (!o || typeof o !== "object" || Array.isArray(o)) continue;
    const t = (o as { type?: unknown }).type;
    if (typeof t === "string" && t.length > 0) types.push(t);
  }
  if (types.length === 0) {
    return { event_count: 0, first_event: null, last_event: null };
  }
  return {
    event_count: types.length,
    first_event: types[0] ?? null,
    last_event: types[types.length - 1] ?? null,
  };
}

export function isGitStatusShortClean(stdout: string): boolean {
  return stdout.trim().length === 0;
}

export function buildCodexReadonlySmokeSummaryV1(args: {
  finalMessagePath: string;
  jsonlPath: string;
  eventCount: number;
  firstEvent: string | null;
  lastEvent: string | null;
  gitClean: boolean;
}): BuckpartsCodexReadonlySmokeSummaryV1 {
  return {
    contract: BUCKPARTS_CODEX_READONLY_SMOKE_CONTRACT_V1,
    external_agent: "codex",
    external_agent_execution: "PROVEN_FOR_READ_ONLY_SMOKE",
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

export function runBuckpartsCodexReadonlySmokeMain(
  deps: BuckpartsCodexReadonlySmokeDeps,
  options?: { repoRoot?: string },
): { exitCode: number; stdout: string; stderr: string } {
  const repoRoot = path.resolve(options?.repoRoot ?? deps.cwd());
  const err: string[] = [];

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
    tmpDir = deps.mkdtempSync(deps.join(deps.tmpdir(), "buckparts-codex-readonly-smoke-"));
  } catch (e) {
    err.push(String(e instanceof Error ? e.message : e));
    return { exitCode: 1, stdout: "", stderr: err.join("\n") };
  }

  const finalMessagePath = deps.join(tmpDir, "final-message.txt");
  const jsonlPath = deps.join(tmpDir, "events.jsonl");

  const execArgs = [
    "exec",
    "--cd",
    repoRoot,
    "--sandbox",
    "read-only",
    "--json",
    "-o",
    finalMessagePath,
    BUCKPARTS_CODEX_READONLY_SMOKE_PROMPT_V1,
  ] as const;

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
      "PROVEN: working tree not clean after codex smoke (git status --short non-empty).",
      gs.stdout.trim(),
    );
    return { exitCode: 1, stdout: "", stderr: err.join("\n") };
  }

  const summary = buildCodexReadonlySmokeSummaryV1({
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

function cliMain(): void {
  const { exitCode, stdout, stderr } = runBuckpartsCodexReadonlySmokeMain(defaultBuckpartsCodexReadonlySmokeDeps);
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
  cliMain();
}
