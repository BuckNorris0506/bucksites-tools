/**
 * Dispatch read-only Runner Step CI via GitHub CLI, download artifact to temp disk, summarize JSON stdout.
 *
 * Requires: `gh` installed and authenticated (no GitHub Actions browser UI needed after login).
 *
 * Writes only under OS temp dirs — never modifies this repo checkout.
 *
 *   npm run buckparts:runner-step:gh
 */

import { spawnSync as nodeSpawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  BUCKPARTS_RUNNER_STEP_CONTRACT_V1,
  type BuckpartsRunnerStepOutputV1,
} from "./lib/buckparts-runner-step-v1";

/** PROVEN: must match `.github/workflows/buckparts-runner-step.yml` `name:` */
export const BUCKPARTS_RUNNER_STEP_GH_WORKFLOW_NAME = "BuckParts Runner Step" as const;

/** PROVEN: must match upload-artifact `name:` */
export const BUCKPARTS_RUNNER_STEP_GH_ARTIFACT_NAME = "buckparts-runner-step" as const;

/** PROVEN: Runner Step artifact json filename produced in CI step */
export const BUCKPARTS_RUNNER_STEP_GH_ARTIFACT_FILENAME = "buckparts-runner-step.json" as const;

export const DEFAULT_REF = "main" as const;

export type SpawnGhSyncResult = {
  status: number | null;
  stdout: string;
  stderr: string;
};

/** Injectable for tests — never hits real `gh`. */
export type BuckpartsRunnerStepGhDeps = {
  spawnSyncGh: (
    argv: readonly string[],
    cwd?: string,
  ) => SpawnGhSyncResult;
  mkdtempSync: typeof mkdtempSync;
  existsSync: typeof existsSync;
  readFileSync: typeof readFileSync;
  tmpdir: typeof tmpdir;
  join: typeof path.join;
};

function defaultSpawnSyncGh(argv: readonly string[], cwd?: string): SpawnGhSyncResult {
  const r = nodeSpawnSync("gh", [...argv], {
    encoding: "utf8",
    ...(cwd ? { cwd } : {}),
  });
  return {
    status: r.status,
    stdout: typeof r.stdout === "string" ? r.stdout : String(r.stdout ?? ""),
    stderr: typeof r.stderr === "string" ? r.stderr : String(r.stderr ?? ""),
  };
}

export const defaultBuckpartsRunnerStepGhDeps: BuckpartsRunnerStepGhDeps = {
  spawnSyncGh: defaultSpawnSyncGh,
  mkdtempSync,
  existsSync,
  readFileSync,
  join: path.join,
  tmpdir,
};

export type GhRunListRow = {
  databaseId: number;
  status: string;
  headBranch?: string;
};

/** PROVEN: `gh run list --json …` parses to this shape when valid. */
export function parseGhRunListRows(stdout: string): GhRunListRow[] {
  const t = stdout.trim();
  if (t === "") return [];
  const parsed = JSON.parse(t) as unknown;
  if (!Array.isArray(parsed)) {
    throw new Error("PROVEN: gh run list --json stdout was not an array.");
  }
  return parsed.filter((row): row is GhRunListRow => {
    if (!row || typeof row !== "object") return false;
    const db = (row as { databaseId?: unknown }).databaseId;
    const st = (row as { status?: unknown }).status;
    return typeof db === "number" && typeof st === "string";
  });
}

/** PROVEN: max databaseId for branch main rows (exclusive floor for detecting new dispatch). */
export function maxStableWorkflowRunDatabaseId(rows: GhRunListRow[]): number {
  const mainRows = rows.filter((r) => r.headBranch == null || r.headBranch === "main");
  if (mainRows.length === 0) return 0;
  return Math.max(...mainRows.map((r) => r.databaseId));
}

export function newestRunIdStrictlyAbove(rows: GhRunListRow[], minExclusiveId: number): number | null {
  const mainRows = rows.filter((r) => r.headBranch == null || r.headBranch === "main");
  const above = mainRows.filter((r) => r.databaseId > minExclusiveId);
  if (above.length === 0) return null;
  return Math.max(...above.map((r) => r.databaseId));
}

export type GhRunViewConclusion = {
  conclusion: string;
  status: string;
};

export function parseGhRunViewJson(stdout: string): GhRunViewConclusion {
  const parsed = JSON.parse(stdout) as Record<string, unknown>;
  const conclusion = parsed.conclusion;
  const status = parsed.status;
  if (typeof conclusion !== "string" || typeof status !== "string") {
    throw new Error("PROVEN: gh run view --json missing conclusion/status strings.");
  }
  return { conclusion, status };
}

export type RunnerStepGhSummaryV1 = {
  contract: string;
  workflow_run_id: number;
  workflow_conclusion: string;
  artifact_path: string;
  runner_overall_status: string;
  selected_packet: BuckpartsRunnerStepOutputV1["selected_packet"];
  layer_3_external_agent_execution: string;
  layer_4_output_capture: string;
  layer_6_founder_only_approval: string;
  command_count: number;
};

function assertBucketRunnerStep(parsed: BuckpartsRunnerStepOutputV1): BuckpartsRunnerStepOutputV1 {
  if (parsed.contract !== BUCKPARTS_RUNNER_STEP_CONTRACT_V1) {
    throw new Error(`PROVEN: artifact JSON contract mismatch; expected "${BUCKPARTS_RUNNER_STEP_CONTRACT_V1}".`);
  }
  if (!parsed.layer_truth) throw new Error("PROVEN: artifact missing layer_truth.");
  if (!Array.isArray(parsed.commands)) throw new Error("PROVEN: artifact missing commands array.");
  return parsed;
}

export function parseArtifactRunnerStepJson(raw: string): BuckpartsRunnerStepOutputV1 {
  const parsed = JSON.parse(raw) as BuckpartsRunnerStepOutputV1;
  return assertBucketRunnerStep(parsed);
}

/** PROVEN: downloaded artifact nests under `{artifact-name}/` for GitHub Actions upload-artifact v4+. */
export function resolveArtifactJsonPath(deps: Pick<BuckpartsRunnerStepGhDeps, "join" | "existsSync">, downloadDir: string): string {
  const direct = deps.join(downloadDir, BUCKPARTS_RUNNER_STEP_GH_ARTIFACT_FILENAME);
  const nested = deps.join(
    downloadDir,
    BUCKPARTS_RUNNER_STEP_GH_ARTIFACT_NAME,
    BUCKPARTS_RUNNER_STEP_GH_ARTIFACT_FILENAME,
  );
  if (deps.existsSync(direct)) return direct;
  if (deps.existsSync(nested)) return nested;
  throw new Error(
    `PROVEN: could not locate ${BUCKPARTS_RUNNER_STEP_GH_ARTIFACT_FILENAME} under ${downloadDir} (tried flat + nested artifact folder).`,
  );
}

export function buildRunnerStepGhSummaryV1(args: {
  runner: BuckpartsRunnerStepOutputV1;
  workflowRunId: number;
  workflowConclusion: string | null | undefined;
  artifactPath: string;
}): RunnerStepGhSummaryV1 {
  const { runner, workflowRunId, workflowConclusion, artifactPath } = args;
  return {
    contract: runner.contract,
    workflow_run_id: workflowRunId,
    workflow_conclusion: workflowConclusion ?? "UNKNOWN",
    artifact_path: artifactPath,
    runner_overall_status: runner.overall_status,
    selected_packet: runner.selected_packet ?? null,
    layer_3_external_agent_execution: runner.layer_truth.layer_3_external_agent_execution,
    layer_4_output_capture: runner.layer_truth.layer_4_output_capture,
    layer_6_founder_only_approval: runner.layer_truth.layer_6_founder_only_approval,
    command_count: runner.commands.length,
  };
}

const POLL_INTERVAL_MS = 3000;
const POLL_MAX_ITERATIONS = 300;

function ghSuccess(r: SpawnGhSyncResult): boolean {
  return r.status === 0;
}

/** PROVEN full loop — callers supply injectable deps (tests mock spawn). */
export async function runBuckpartsRunnerStepGhMain(deps: BuckpartsRunnerStepGhDeps): Promise<{
  exitCode: number;
  summaryJsonText: string;
  stderrDetails: string;
}> {
  const errLines: string[] = [];

  const runListArgs = (): readonly string[] =>
    [
      "run",
      "list",
      "--workflow",
      BUCKPARTS_RUNNER_STEP_GH_WORKFLOW_NAME,
      "--branch",
      DEFAULT_REF,
      "--json",
      "databaseId,status,headBranch",
      "--limit",
      "60",
    ] as const;

  const gv = deps.spawnSyncGh(["version"]);
  if (!ghSuccess(gv)) {
    return {
      exitCode: 127,
      summaryJsonText: "",
      stderrDetails:
        gv.stderr.trim() ||
        gv.stdout.trim() ||
        "UNKNOWN: gh not available or gh version failed; install GitHub CLI and ensure it is on PATH.",
    };
  }

  const auth = deps.spawnSyncGh(["auth", "status"]);
  if (!ghSuccess(auth)) {
    errLines.push("PROVEN: gh auth status failed.", auth.stderr.trim() || auth.stdout.trim());
    return { exitCode: 1, summaryJsonText: "", stderrDetails: errLines.join("\n") };
  }

  let listBefore = deps.spawnSyncGh(runListArgs());
  if (!ghSuccess(listBefore)) {
    errLines.push("PROVEN: gh run list failed before dispatch.", listBefore.stderr.trim(), listBefore.stdout.trim());
    return { exitCode: 1, summaryJsonText: "", stderrDetails: errLines.join("\n") };
  }

  let maxBefore: number;
  try {
    maxBefore = maxStableWorkflowRunDatabaseId(parseGhRunListRows(listBefore.stdout));
  } catch (e) {
    errLines.push(String(e instanceof Error ? e.message : e));
    return { exitCode: 1, summaryJsonText: "", stderrDetails: errLines.join("\n") };
  }

  const trigger = deps.spawnSyncGh(["workflow", "run", BUCKPARTS_RUNNER_STEP_GH_WORKFLOW_NAME, "--ref", DEFAULT_REF]);
  if (!ghSuccess(trigger)) {
    errLines.push(
      "PROVEN: gh workflow run dispatch failed.",
      trigger.stderr.trim() || trigger.stdout.trim(),
    );
    return { exitCode: 1, summaryJsonText: "", stderrDetails: errLines.join("\n") };
  }

  let runId: number | null = null;
  for (let i = 0; i < POLL_MAX_ITERATIONS; i++) {
    const poll = deps.spawnSyncGh(runListArgs());
    if (!ghSuccess(poll)) {
      errLines.push("PROVEN: gh run list polling failed.", poll.stderr.trim(), poll.stdout.trim());
      return { exitCode: 1, summaryJsonText: "", stderrDetails: errLines.join("\n") };
    }
    try {
      const parsed = parseGhRunListRows(poll.stdout);
      runId = newestRunIdStrictlyAbove(parsed, maxBefore);
    } catch (e) {
      errLines.push(String(e instanceof Error ? e.message : e));
      return { exitCode: 1, summaryJsonText: "", stderrDetails: errLines.join("\n") };
    }
    if (runId !== null) break;
    await new Promise<void>((resolve) => {
      void setTimeout(resolve, POLL_INTERVAL_MS);
    });
  }

  if (runId === null) {
    errLines.push(
      `INFERRED: no workflow run detected with databaseId > ${maxBefore} on branch "${DEFAULT_REF}" within poll window.`,
    );
    return { exitCode: 1, summaryJsonText: "", stderrDetails: errLines.join("\n") };
  }

  const watch = deps.spawnSyncGh(["run", "watch", String(runId), "--exit-status"]);
  if (!ghSuccess(watch)) {
    errLines.push(
      `PROVEN: gh run watch ${runId} failed (workflow did not conclude successfully per gh).`,
      watch.stderr.trim() || watch.stdout.trim(),
    );
    return {
      exitCode: watch.status ?? 1,
      summaryJsonText: "",
      stderrDetails: errLines.join("\n"),
    };
  }

  const viewJson = deps.spawnSyncGh(["run", "view", String(runId), "--json", "conclusion,status"]);
  let conclusionParsed: GhRunViewConclusion | null = null;
  if (ghSuccess(viewJson)) {
    try {
      conclusionParsed = parseGhRunViewJson(viewJson.stdout);
    } catch {
      conclusionParsed = null;
    }
  }

  let downloadDir: string;
  try {
    downloadDir = deps.mkdtempSync(deps.join(deps.tmpdir(), "buckparts-runner-step-gh-"));
  } catch (e) {
    errLines.push(String(e instanceof Error ? e.message : e));
    return { exitCode: 1, summaryJsonText: "", stderrDetails: errLines.join("\n") };
  }

  const download = deps.spawnSyncGh([
    "run",
    "download",
    String(runId),
    "--name",
    BUCKPARTS_RUNNER_STEP_GH_ARTIFACT_NAME,
    "--dir",
    downloadDir,
  ]);
  if (!ghSuccess(download)) {
    errLines.push(
      "PROVEN: gh run download failed.",
      download.stderr.trim() || download.stdout.trim(),
      `artifact_name=${BUCKPARTS_RUNNER_STEP_GH_ARTIFACT_NAME}`,
    );
    return { exitCode: 1, summaryJsonText: "", stderrDetails: errLines.join("\n") };
  }

  let jsonPath: string;
  try {
    jsonPath = resolveArtifactJsonPath(deps, downloadDir);
  } catch (e) {
    errLines.push(String(e instanceof Error ? e.message : e));
    return { exitCode: 1, summaryJsonText: "", stderrDetails: errLines.join("\n") };
  }

  let runner: BuckpartsRunnerStepOutputV1;
  try {
    runner = parseArtifactRunnerStepJson(deps.readFileSync(jsonPath, "utf8"));
  } catch (e) {
    errLines.push(String(e instanceof Error ? e.message : e));
    return { exitCode: 1, summaryJsonText: "", stderrDetails: errLines.join("\n") };
  }

  const summary = buildRunnerStepGhSummaryV1({
    runner,
    workflowRunId: runId,
    workflowConclusion: conclusionParsed?.conclusion ?? null,
    artifactPath: jsonPath,
  });

  return {
    exitCode: 0,
    summaryJsonText: `${JSON.stringify(summary, null, 2)}\n`,
    stderrDetails: "",
  };
}

async function cliMain(): Promise<void> {
  const { exitCode, summaryJsonText, stderrDetails } = await runBuckpartsRunnerStepGhMain(defaultBuckpartsRunnerStepGhDeps);
  if (stderrDetails.trim()) {
    process.stderr.write(`${stderrDetails}\n`);
  }
  if (summaryJsonText) {
    process.stdout.write(summaryJsonText);
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
