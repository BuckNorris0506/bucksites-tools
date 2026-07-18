import { exec as execCb } from "node:child_process";
import { promisify } from "node:util";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import path from "node:path";

import { buildBuckpartsCommandCenterReport } from "../report-buckparts-command-center";
import { refreshBuckpartsExecutionLedgerV1 } from "./buckparts-execution-ledger-v1";

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
  /** Override dispatch-run output directory (absolute or relative to rootDir). Tests must use a temp dir. */
  dispatchRunsDirRel?: string;
  /**
   * When true: execute allowlisted read-only command (if READY) but write no dispatch-run artifact
   * and do not refresh the execution ledger. Stdout still carries the full result JSON.
   */
  noArtifact?: boolean;
  now?: () => Date;
  reportBuilder?: () => Promise<Awaited<ReturnType<typeof buildBuckpartsCommandCenterReport>>>;
  exec?: (cmd: string, cwd: string) => Promise<{ stdout: string; stderr: string; exitCode: number }>;
  readText?: (absPath: string) => string;
  writeText?: (absPath: string, contents: string) => void;
  mkdirp?: (absDir: string) => void;
  exists?: (absPath: string) => boolean;
  /**
   * After writing a dispatch-run artifact, optionally refresh the execution ledger so EXECUTED
   * runs are intake'd. Tests should omit this (or no-op) when using a temp dispatch-runs dir.
   */
  refreshExecutionLedger?: (args: {
    execution_status: CommandCenterDispatchRunnerExecutionStatusV1;
    artifact_abs_path: string;
  }) => void;
};

export type DispatchRunnerResultV1 = {
  artifact_abs_path: string | null;
  artifact: BuckpartsCommandCenterDispatchRunV1;
  no_artifact: boolean;
};

const ALLOWLIST_EXACT_COMMANDS_V1 = [
  "npx tsx scripts/apply-air-purifier-supabase-parity-v1.ts --plan data/air-purifier/batch-production/apply-plans-batch-v2/ap-apply-plan-batch-v2.json",
  "npx tsx scripts/report-buckparts-command-center.ts",
  "npx tsx scripts/report-buckparts-demand-to-coverage-next-lane.ts",
  "npx tsx scripts/report-air-purifier-demand-selected-batch-owner-review-v1.ts",
  "npx tsx scripts/report-air-purifier-demand-selected-batch-closeout-readiness-proof-v1.ts",
  "npx tsx scripts/report-ap-batch-v3-run-instantiation-v1.ts",
  "npm run buckparts:fridge-model-pdp-ge-mwfp-xwfe-retailer-links-supabase-sync-owner-review -- --write-artifacts",
  "npm run lint",
  "npm run build",
] as const;

/**
 * Commands proven stdout-only under default argv (no --write / --write-artifacts / build caches).
 * Used exclusively when deps.noArtifact === true.
 */
export const NO_ARTIFACT_ALLOWLIST_EXACT_COMMANDS_V1 = [
  "npx tsx scripts/report-buckparts-demand-to-coverage-next-lane.ts",
  "npx tsx scripts/report-air-purifier-demand-selected-batch-owner-review-v1.ts",
  "npx tsx scripts/report-air-purifier-demand-selected-batch-closeout-readiness-proof-v1.ts",
] as const;

export const NO_ARTIFACT_ALLOWLIST_EXCLUSION_REASONS_V1: Record<string, string> = {
  "npx tsx scripts/apply-air-purifier-supabase-parity-v1.ts --plan data/air-purifier/batch-production/apply-plans-batch-v2/ap-apply-plan-batch-v2.json":
    "parity apply lane may write when authorized; excluded from --no-artifact",
  "npx tsx scripts/report-buckparts-command-center.ts":
    "Command Center build is heavy and historically refreshed ledger; excluded from --no-artifact",
  "npx tsx scripts/report-ap-batch-v3-run-instantiation-v1.ts":
    "batch instantiation supports --write packet/registry writes; excluded from --no-artifact",
  "npm run buckparts:fridge-model-pdp-ge-mwfp-xwfe-retailer-links-supabase-sync-owner-review -- --write-artifacts":
    "command contains --write-artifacts; excluded from --no-artifact",
  "npm run lint": "lint may write eslint/next cache under ignored paths; excluded from --no-artifact",
  "npm run build": "build writes .next and other generated artifacts; excluded from --no-artifact",
};

type DispatchPickV1 = {
  dispatch_status: string;
  exact_command: string;
  command_surface: string;
  mutation_allowed: boolean;
  selected_subsystem: string;
  success_transition?: string;
  failure_transition?: string;
};

/**
 * Prefer GE MWFP/XWFE spine READY exact_command (read-only owner-review) over batch AP dispatch.
 * Hard-stop remains: mutation_allowed must be false; allowlist + danger needles still apply.
 */
export function pickCommandCenterDispatchForRunnerV1(v2: {
  fridge_truth_spine_v1?: {
    ge_mwfp_xwfe_retailer_links_supabase_sync?: {
      dispatch_status?: string;
      exact_command?: string;
      command_surface?: string;
      mutation_allowed?: boolean;
      selected_subsystem?: string;
      success_transition?: string;
      failure_transition?: string;
      supabase_write_authorized?: boolean;
    };
  };
  batch_production_operating_dispatch_v1?: DispatchPickV1 | null;
}): DispatchPickV1 | null {
  const ge = v2.fridge_truth_spine_v1?.ge_mwfp_xwfe_retailer_links_supabase_sync;
  if (
    ge?.dispatch_status === "READY" &&
    typeof ge.exact_command === "string" &&
    ge.exact_command.length > 0 &&
    ge.mutation_allowed === false &&
    ge.supabase_write_authorized === false &&
    (ge.command_surface === "terminal" || ge.command_surface === "none")
  ) {
    return {
      dispatch_status: ge.dispatch_status,
      exact_command: ge.exact_command,
      command_surface: ge.command_surface,
      mutation_allowed: false,
      selected_subsystem:
        ge.selected_subsystem ?? "ge_mwfp_xwfe_retailer_links_supabase_sync_owner_review",
      success_transition: ge.success_transition,
      failure_transition: ge.failure_transition,
    };
  }
  return v2.batch_production_operating_dispatch_v1 ?? null;
}

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
    : await buildBuckpartsCommandCenterReport({
        rootDir: deps.rootDir,
        // Dispatch must never refresh the ledger as a side effect of building CC.
        // Explicit ledger refresh remains post-EXECUTED only when !noArtifact.
      });
  const blocked_reasons: string[] = [];

  if (report.read_only !== true || report.data_mutation !== false) {
    blocked_reasons.push("Command Center report must be read_only=true and data_mutation=false.");
  }

  const v2 = report.command_center_v2;
  const dispatch = pickCommandCenterDispatchForRunnerV1(v2);
  if (!dispatch) {
    blocked_reasons.push(
      "Missing executable dispatch (fridge_truth_spine GE sync READY or batch_production_operating_dispatch_v1).",
    );
  }

  const exact_command = dispatch?.exact_command ?? "";
  const dangerNeedles = looksDangerousExactCommandV1(exact_command);
  if (dangerNeedles.length > 0) {
    blocked_reasons.push(`Refused: exact_command contains forbidden patterns: ${dangerNeedles.join(", ")}`);
  }

  const noArtifact = deps.noArtifact === true;
  const allowlisted = (ALLOWLIST_EXACT_COMMANDS_V1 as readonly string[]).includes(exact_command);
  if (!allowlisted) {
    blocked_reasons.push("Refused: exact_command is not allowlisted for v1.");
  }
  if (noArtifact && allowlisted) {
    const noArtOk = (NO_ARTIFACT_ALLOWLIST_EXACT_COMMANDS_V1 as readonly string[]).includes(
      exact_command,
    );
    if (!noArtOk) {
      const why =
        NO_ARTIFACT_ALLOWLIST_EXCLUSION_REASONS_V1[exact_command] ??
        "command not proven stdout-only for --no-artifact";
      blocked_reasons.push(`Refused: --no-artifact forbids this allowlisted command (${why}).`);
    }
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

  const dispatchRunsDirRel = deps.dispatchRunsDirRel ?? COMMAND_CENTER_DISPATCH_RUNS_DIR_REL_V1;
  const dirAbs = path.isAbsolute(dispatchRunsDirRel)
    ? dispatchRunsDirRel
    : path.join(deps.rootDir, dispatchRunsDirRel);
  const fileBase = `dispatch-run-${generated_at.replaceAll(":", "").replaceAll(".", "")}.json`;
  const artifact_abs_path = noArtifact ? null : path.join(dirAbs, fileBase);

  if (!noArtifact) {
    if (!exists(dirAbs)) mkdirp(dirAbs);
  }

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

  if (!noArtifact && artifact_abs_path) {
    writeText(artifact_abs_path, JSON.stringify(artifact, null, 2) + "\n");

    // Ledger intakes only EXECUTED dispatch-run JSONs under the default dispatch-runs path.
    // Skip when tests write into a temp dir (override present) or --no-artifact.
    const usingDefaultDispatchRunsDir = deps.dispatchRunsDirRel == null;
    if (usingDefaultDispatchRunsDir) {
      const refresh =
        deps.refreshExecutionLedger ??
        ((args: {
          execution_status: CommandCenterDispatchRunnerExecutionStatusV1;
          artifact_abs_path: string;
        }) => {
          if (args.execution_status !== "EXECUTED") return;
          refreshBuckpartsExecutionLedgerV1({
            rootDir: deps.rootDir,
            trigger_source: "npm run buckparts:command-center:run-dispatch",
            now,
          });
        });
      refresh({ execution_status, artifact_abs_path });
    }
  }

  return { artifact_abs_path, artifact, no_artifact: noArtifact };
}

