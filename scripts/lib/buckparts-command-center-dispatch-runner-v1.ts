import { exec as execCb } from "node:child_process";
import { promisify } from "node:util";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import path from "node:path";

import { buildBuckpartsCommandCenterReport } from "../report-buckparts-command-center";

const execAsync = promisify(execCb);

export const COMMAND_CENTER_DISPATCH_RUN_REPORT_NAME_V1 = "buckparts_command_center_dispatch_run_v1" as const;

export const COMMAND_CENTER_DISPATCH_RUNS_DIR_REL_V1 = "data/command-center/dispatch-runs" as const;

export type CommandCenterDispatchRunnerExecutionStatusV1 = "EXECUTED" | "REFUSED" | "FAILED";

export type BuckpartsCommandCenterDispatchRunV1 = {
  report_name: typeof COMMAND_CENTER_DISPATCH_RUN_REPORT_NAME_V1;
  generated_at: string;
  source_commit: string | "UNKNOWN";
  dispatch_status_before: string;
  selected_subsystem: string;
  exact_command: string;
  execution_allowed: boolean;
  execution_status: CommandCenterDispatchRunnerExecutionStatusV1;
  stdout_excerpt: string;
  stderr_excerpt: string;
  parsed_json_summary: unknown | null;
  blocked_reasons: string[];
  next_expected_state: string;
  read_only: true;
  data_mutation: false;
};

export type DispatchRunnerDepsV1 = {
  rootDir: string;
  now?: () => Date;
  reportBuilder?: () => Promise<Awaited<ReturnType<typeof buildBuckpartsCommandCenterReport>>>;
  exec?: (cmd: string, cwd: string) => Promise<{ stdout: string; stderr: string; exitCode: number }>;
  readText?: (absPath: string) => string;
  writeText?: (absPath: string, contents: string) => void;
  mkdirp?: (absDir: string) => void;
  exists?: (absPath: string) => boolean;
};

export type DispatchRunnerResultV1 = {
  artifact_abs_path: string;
  artifact: BuckpartsCommandCenterDispatchRunV1;
};

const ALLOWLIST_EXACT_COMMANDS_V1 = [
  "npx tsx scripts/apply-air-purifier-supabase-parity-v1.ts --plan data/air-purifier/batch-production/apply-plans-batch-v2/ap-apply-plan-batch-v2.json",
  "npx tsx scripts/report-buckparts-command-center.ts",
  "npm run lint",
  "npm run build",
] as const;

function defaultExec(cmd: string, cwd: string): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  return execAsync(cmd, { cwd, maxBuffer: 10 * 1024 * 1024 }).then(
    ({ stdout, stderr }) => ({ stdout: String(stdout ?? ""), stderr: String(stderr ?? ""), exitCode: 0 }),
    (err: any) => ({
      stdout: String(err?.stdout ?? ""),
      stderr: String(err?.stderr ?? err?.message ?? "UNKNOWN"),
      exitCode: typeof err?.code === "number" ? err.code : 1,
    }),
  );
}

function defaultReadText(absPath: string): string {
  return readFileSync(absPath, "utf8");
}

function defaultWriteText(absPath: string, contents: string): void {
  writeFileSync(absPath, contents, "utf8");
}

function defaultMkdirp(absDir: string): void {
  mkdirSync(absDir, { recursive: true });
}

function defaultExists(absPath: string): boolean {
  return existsSync(absPath);
}

function looksDangerousExactCommandV1(exact: string): string[] {
  const needles = [
    "--apply",
    "git commit",
    "git push",
    "supabase db",
    "psql",
    "curl -X POST",
    "curl -X PATCH",
    "curl -X DELETE",
    "retailer_links.csv",
    "data/air-purifier/retailer_links.csv",
  ];
  return needles.filter((n) => exact.includes(n));
}

function excerpt(text: string, limit = 1800): string {
  const trimmed = (text ?? "").trim();
  if (trimmed.length <= limit) return trimmed;
  return trimmed.slice(0, limit) + "\n…(truncated)";
}

function safeParseJson(stdout: string): unknown | null {
  const t = (stdout ?? "").trim();
  if (!t) return null;
  if (!t.startsWith("{") && !t.startsWith("[")) return null;
  try {
    return JSON.parse(t) as unknown;
  } catch {
    return null;
  }
}

function resolveSourceCommitReadOnly(rootDir: string, readText: (p: string) => string): string | "UNKNOWN" {
  try {
    const head = readText(path.join(rootDir, ".git", "HEAD")).trim();
    if (head.startsWith("ref:")) {
      const ref = head.replace(/^ref:\s+/, "");
      const refPath = path.join(rootDir, ".git", ...ref.split("/"));
      const sha = readText(refPath).trim();
      return sha || "UNKNOWN";
    }
    return head || "UNKNOWN";
  } catch {
    return "UNKNOWN";
  }
}

export async function runBuckpartsCommandCenterDispatchRunnerV1(
  deps: DispatchRunnerDepsV1,
): Promise<DispatchRunnerResultV1> {
  const now = deps.now ?? (() => new Date());
  const exec = deps.exec ?? defaultExec;
  const readText = deps.readText ?? defaultReadText;
  const writeText = deps.writeText ?? defaultWriteText;
  const mkdirp = deps.mkdirp ?? defaultMkdirp;
  const exists = deps.exists ?? defaultExists;

  const report = deps.reportBuilder
    ? await deps.reportBuilder()
    : await buildBuckpartsCommandCenterReport({ rootDir: deps.rootDir });
  const blocked_reasons: string[] = [];

  if (report.read_only !== true || report.data_mutation !== false) {
    blocked_reasons.push("Command Center report must be read_only=true and data_mutation=false.");
  }

  const v2 = report.command_center_v2;
  const dispatch = v2.batch_production_operating_dispatch_v1;
  if (!dispatch) {
    blocked_reasons.push("Missing command_center_v2.batch_production_operating_dispatch_v1.");
  }

  const exact_command = dispatch?.exact_command ?? "";
  const dangerNeedles = looksDangerousExactCommandV1(exact_command);
  if (dangerNeedles.length > 0) {
    blocked_reasons.push(`Refused: exact_command contains forbidden patterns: ${dangerNeedles.join(", ")}`);
  }

  const allowlisted = (ALLOWLIST_EXACT_COMMANDS_V1 as readonly string[]).includes(exact_command);
  if (!allowlisted) {
    blocked_reasons.push("Refused: exact_command is not allowlisted for v1.");
  }

  if (dispatch?.command_surface !== "terminal" && dispatch?.command_surface !== "none") {
    blocked_reasons.push("Refused: command_surface must be terminal|none in v1.");
  }

  if (dispatch?.mutation_allowed !== false) {
    blocked_reasons.push("Refused: dispatch.mutation_allowed must be false in v1.");
  }

  if (dispatch?.dispatch_status !== "READY") {
    blocked_reasons.push(`Refused: dispatch_status must be READY in v1 (got ${dispatch?.dispatch_status ?? "UNKNOWN"}).`);
  }

  const source_commit = resolveSourceCommitReadOnly(deps.rootDir, readText);
  const generated_at = now().toISOString();

  const dirAbs = path.join(deps.rootDir, COMMAND_CENTER_DISPATCH_RUNS_DIR_REL_V1);
  if (!exists(dirAbs)) mkdirp(dirAbs);
  const fileBase = `dispatch-run-${generated_at.replaceAll(":", "").replaceAll(".", "")}.json`;
  const artifact_abs_path = path.join(dirAbs, fileBase);

  let execution_status: CommandCenterDispatchRunnerExecutionStatusV1 = "REFUSED";
  let execution_allowed = blocked_reasons.length === 0;
  let stdout = "";
  let stderr = "";
  let parsed_json_summary: unknown | null = null;

  if (execution_allowed && dispatch?.command_surface === "terminal") {
    const result = await exec(exact_command, deps.rootDir);
    stdout = result.stdout;
    stderr = result.stderr;
    parsed_json_summary = safeParseJson(stdout);
    execution_status = result.exitCode === 0 ? "EXECUTED" : "FAILED";
    if (execution_status === "FAILED") {
      blocked_reasons.push(`Command exit_code=${String(result.exitCode)}`);
    }
  }

  const next_expected_state =
    execution_status === "EXECUTED"
      ? dispatch?.success_transition ?? "Re-run Command Center; dispatch should transition."
      : dispatch?.failure_transition ?? "Dispatch remains blocked; do not broaden execution scope.";

  const artifact: BuckpartsCommandCenterDispatchRunV1 = {
    report_name: COMMAND_CENTER_DISPATCH_RUN_REPORT_NAME_V1,
    generated_at,
    source_commit,
    dispatch_status_before: dispatch?.dispatch_status ?? "UNKNOWN",
    selected_subsystem: dispatch?.selected_subsystem ?? "none",
    exact_command,
    execution_allowed,
    execution_status,
    stdout_excerpt: excerpt(stdout),
    stderr_excerpt: excerpt(stderr),
    parsed_json_summary,
    blocked_reasons,
    next_expected_state,
    read_only: true,
    data_mutation: false,
  };

  writeText(artifact_abs_path, JSON.stringify(artifact, null, 2) + "\n");
  return { artifact_abs_path, artifact };
}

