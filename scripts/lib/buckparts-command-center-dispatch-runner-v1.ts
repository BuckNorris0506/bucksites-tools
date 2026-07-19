import { exec as execCb } from "node:child_process";
import { promisify } from "node:util";
import { readFileSync, writeFileSync, mkdirSync, existsSync, renameSync } from "node:fs";
import path from "node:path";

import { buildBuckpartsCommandCenterReport } from "../report-buckparts-command-center";
import { refreshBuckpartsExecutionLedgerV1 } from "./buckparts-execution-ledger-v1";
import { resolveArtifactProvenanceV1, type ArtifactProvenanceV1 } from "./buckparts-artifact-provenance-v1";
import {
  atomicWriteJsonV1,
  buildDispatchRunIdV1,
  dispatchResumeCommandV1,
  extractDispatchRunIdMaterialV1,
  findPriorDispatchArtifactByRunIdV1,
  isAmbiguousExecutionLifecycleV1,
  isValidDispatchRunIdV1,
  ordinaryInvocationMustRefuseLifecycleV1,
  resumeStageForLifecycleV1,
  shouldSkipSubprocessForPriorRunV1,
  validateResumeRecordBindingV1,
  type DispatchRunIdMaterialV1,
  type DispatchRunLifecycleV1,
} from "./buckparts-command-center-dispatch-recovery-v1";
import {
  ALLOWLIST_EXACT_COMMANDS_V1,
  NO_ARTIFACT_ALLOWLIST_EXACT_COMMANDS_V1,
  NO_ARTIFACT_ALLOWLIST_EXCLUSION_REASONS_V1,
  lookupDispatchAllowlistEntryV1,
  validateCanonicalAllowlistEqualityV1,
} from "./buckparts-command-center-dispatch-allowlist-v1";

const execAsync = promisify(execCb);

export const COMMAND_CENTER_DISPATCH_RUN_REPORT_NAME_V1 = "buckparts_command_center_dispatch_run_v1" as const;
export const COMMAND_CENTER_DISPATCH_RUNS_DIR_REL_V1 = "data/command-center/dispatch-runs" as const;

export {
  ALLOWLIST_EXACT_COMMANDS_V1,
  NO_ARTIFACT_ALLOWLIST_EXACT_COMMANDS_V1,
  NO_ARTIFACT_ALLOWLIST_EXCLUSION_REASONS_V1,
};

export type CommandCenterDispatchRunnerExecutionStatusV1 =
  | "EXECUTED"
  | "REFUSED"
  | "FAILED"
  | "ALREADY_EXECUTED";

export type BuckpartsCommandCenterDispatchRunV1 = {
  report_name: typeof COMMAND_CENTER_DISPATCH_RUN_REPORT_NAME_V1;
  generated_at: string;
  source_commit: string | "UNKNOWN" | null;
  provenance_status: ArtifactProvenanceV1["provenance_status"];
  worktree_clean: boolean | null;
  run_id: string;
  attempt_count: number;
  dispatch_status_before: string;
  selected_subsystem: string;
  exact_command: string;
  steering_override_source: string;
  owner_review_required: string;
  mutation_allowed: string;
  mutation_posture_classification: string;
  command_kind: string;
  artifact_write_behavior: string;
  no_artifact_allowed: string;
  canonical_decision_snapshot: Record<string, unknown> | null;
  execution_allowed: boolean;
  execution_status: CommandCenterDispatchRunnerExecutionStatusV1;
  execution_lifecycle: DispatchRunLifecycleV1;
  stdout_excerpt: string;
  stderr_excerpt: string;
  parsed_json_summary: unknown | null;
  blocked_reasons: string[];
  next_expected_state: string;
  subprocess_exit_code: number | null;
  artifact_write_error: string | null;
  ledger_refresh_error: string | null;
  resume_command: string;
  resume_from_stage: string;
  read_only: true;
  data_mutation: false;
};

export type DispatchRunnerDepsV1 = {
  rootDir: string;
  dispatchRunsDirRel?: string;
  noArtifact?: boolean;
  resumeRunId?: string;
  now?: () => Date;
  reportBuilder?: () => Promise<Awaited<ReturnType<typeof buildBuckpartsCommandCenterReport>>>;
  exec?: (cmd: string, cwd: string) => Promise<{ stdout: string; stderr: string; exitCode: number }>;
  readText?: (absPath: string) => string;
  writeText?: (absPath: string, contents: string) => void;
  rename?: (from: string, to: string) => void;
  mkdirp?: (absDir: string) => void;
  exists?: (absPath: string) => boolean;
  provenanceResolver?: () => ArtifactProvenanceV1;
  refreshExecutionLedger?: (args: {
    execution_status: CommandCenterDispatchRunnerExecutionStatusV1;
    execution_lifecycle: DispatchRunLifecycleV1;
    artifact_abs_path: string;
  }) => void;
};

export type DispatchRunnerResultV1 = {
  artifact_abs_path: string | null;
  artifact: BuckpartsCommandCenterDispatchRunV1;
  no_artifact: boolean;
};

type DispatchPickV1 = {
  dispatch_status: string;
  exact_command: string;
  command_surface: string;
  mutation_allowed: boolean;
  selected_subsystem: string;
  steering_override_source: string;
  command_executable: boolean;
  owner_review_required?: boolean;
  command_kind?: string;
  artifact_write_behavior?: string;
  no_artifact_allowed?: boolean;
  success_transition?: string;
  failure_transition?: string;
};

export function pickCommandCenterDispatchForRunnerV1(v2: {
  canonical_final_operating_decision_v1?: {
    command_executable?: boolean;
    exact_command?: string;
    selected_subsystem?: string;
    dispatch_status?: string;
    steering_override_source?: string;
    owner_review_required?: boolean;
    command_kind?: string;
    artifact_write_behavior?: string;
    no_artifact_allowed?: boolean;
    mutation_posture?: { mutation_allowed?: boolean };
    blockers?: string[];
  };
  batch_production_operating_dispatch_v1?: {
    dispatch_status: string;
    exact_command: string;
    command_surface: string;
    mutation_allowed: boolean;
    selected_subsystem: string;
    success_transition?: string;
    failure_transition?: string;
  } | null;
}): DispatchPickV1 | null {
  const canon = v2.canonical_final_operating_decision_v1;
  if (canon) {
    const status = String(canon.dispatch_status ?? "UNKNOWN");
    return {
      dispatch_status: status,
      exact_command: String(canon.exact_command ?? ""),
      command_surface: "terminal",
      mutation_allowed: canon.mutation_posture?.mutation_allowed === true,
      selected_subsystem: canon.selected_subsystem ?? "canonical_final_operating_decision",
      steering_override_source: canon.steering_override_source ?? "unknown",
      command_executable: canon.command_executable === true && status === "READY",
      owner_review_required: canon.owner_review_required === true,
      command_kind: canon.command_kind,
      artifact_write_behavior: canon.artifact_write_behavior,
      no_artifact_allowed: canon.no_artifact_allowed,
    };
  }
  const batch = v2.batch_production_operating_dispatch_v1;
  if (!batch) return null;
  const meta = lookupDispatchAllowlistEntryV1(batch.exact_command);
  return {
    ...batch,
    steering_override_source: "batch_dispatch",
    command_executable: batch.dispatch_status === "READY",
    owner_review_required: meta?.owner_review_required ?? false,
    command_kind: meta?.command_kind,
    artifact_write_behavior: meta?.artifact_write_behavior,
    no_artifact_allowed: meta?.no_artifact_allowed,
  };
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

function excerpt(text: string, limit = 1800): string {
  const trimmed = (text ?? "").trim();
  if (trimmed.length <= limit) return trimmed;
  return trimmed.slice(0, limit) + "\n…(truncated)";
}

function safeParseJson(stdout: string): unknown | null {
  const t = (stdout ?? "").trim();
  if (!t || (!t.startsWith("{") && !t.startsWith("["))) return null;
  try {
    return JSON.parse(t) as unknown;
  } catch {
    return null;
  }
}

function looksDangerousExactCommandV1(exact: string): string[] {
  return [
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
  ].filter((n) => exact.includes(n));
}

function toExecutionStatus(life: DispatchRunLifecycleV1): CommandCenterDispatchRunnerExecutionStatusV1 {
  if (life === "EXECUTED" || life === "EXECUTED_LEDGER_PENDING") return "EXECUTED";
  if (life === "ALREADY_EXECUTED") return "ALREADY_EXECUTED";
  if (
    life === "FAILED" ||
    life === "EXECUTED_ARTIFACT_PENDING" ||
    life === "EXECUTION_IN_PROGRESS" ||
    life === "EXECUTION_OUTCOME_UNKNOWN"
  ) {
    return "FAILED";
  }
  return "REFUSED";
}

function nextExpectedStateForLifecycleV1(args: {
  life: DispatchRunLifecycleV1;
  run_id: string;
  success_transition?: string;
  failure_transition?: string;
}): string {
  switch (args.life) {
    case "EXECUTED":
    case "ALREADY_EXECUTED":
      return args.success_transition ?? "Re-run Command Center; dispatch should transition.";
    case "EXECUTED_LEDGER_PENDING":
      return `Resume ledger refresh: ${dispatchResumeCommandV1(args.run_id)}`;
    case "EXECUTED_ARTIFACT_PENDING":
      return `Resume artifact write: ${dispatchResumeCommandV1(args.run_id)}`;
    case "READY_TO_EXECUTE":
    case "FAILED":
      return `Explicit resume required: ${dispatchResumeCommandV1(args.run_id)}`;
    case "EXECUTION_IN_PROGRESS":
    case "EXECUTION_OUTCOME_UNKNOWN":
      return `Reconcile uncertain execution (no auto-rerun): ${dispatchResumeCommandV1(args.run_id)}`;
    default:
      return args.failure_transition ?? "Dispatch remains blocked; do not broaden execution scope.";
  }
}

export async function runBuckpartsCommandCenterDispatchRunnerV1(
  deps: DispatchRunnerDepsV1,
): Promise<DispatchRunnerResultV1> {
  const now = deps.now ?? (() => new Date());
  const exec = deps.exec ?? defaultExec;
  const readText = deps.readText ?? ((p) => readFileSync(p, "utf8"));
  const writeText = deps.writeText ?? ((p, c) => writeFileSync(p, c, "utf8"));
  const rename = deps.rename ?? renameSync;
  const mkdirp = deps.mkdirp ?? ((d) => mkdirSync(d, { recursive: true }));
  const exists = deps.exists ?? existsSync;
  const noArtifact = deps.noArtifact === true;
  const explicitResume = Boolean(deps.resumeRunId);

  if (deps.resumeRunId && noArtifact) {
    throw new Error(
      "Refused: --resume-run-id cannot combine with --no-artifact (no read-only resume mutation mode).",
    );
  }
  if (deps.resumeRunId && !isValidDispatchRunIdV1(deps.resumeRunId)) {
    throw new Error(`Refused: malformed --resume-run-id (expected 32 hex chars): ${deps.resumeRunId}`);
  }

  const report = deps.reportBuilder
    ? await deps.reportBuilder()
    : await buildBuckpartsCommandCenterReport({ rootDir: deps.rootDir });

  const blocked_reasons: string[] = [];
  if (report.read_only !== true || report.data_mutation !== false) {
    blocked_reasons.push("Command Center report must be read_only=true and data_mutation=false.");
  }

  // Provenance first — before any persistent resume mutation.
  const provenance =
    deps.provenanceResolver?.() ?? resolveArtifactProvenanceV1({ rootDir: deps.rootDir });
  const persistentBound = provenance.provenance_status === "BOUND_TO_SOURCE_COMMIT";

  if (!noArtifact && !persistentBound) {
    blocked_reasons.push(
      `Refused: dirty_or_unknown_provenance (status=${provenance.provenance_status}) — no journal, no ledger, no subprocess.`,
    );
  }

  const v2 = report.command_center_v2 as Record<string, unknown>;
  const canonRaw = v2.canonical_final_operating_decision_v1 as Record<string, unknown> | undefined;
  const dispatch = pickCommandCenterDispatchForRunnerV1(
    v2 as Parameters<typeof pickCommandCenterDispatchForRunnerV1>[0],
  );

  if (canonRaw && canonRaw.command_executable !== true) {
    blocked_reasons.push(
      "canonical_final_operating_decision_v1.command_executable=false — refuse (no lane substitution).",
    );
    for (const b of (canonRaw.blockers as string[] | undefined) ?? []) {
      if (!blocked_reasons.includes(b)) blocked_reasons.push(b);
    }
  }
  if (!dispatch) {
    blocked_reasons.push(
      "Missing dispatch binding from canonical_final_operating_decision_v1 (or legacy batch dispatch).",
    );
  }

  const exact_command = dispatch?.exact_command ?? "";
  const selected_subsystem = dispatch?.selected_subsystem ?? "none";
  const steering_override_source = dispatch?.steering_override_source ?? "unknown";
  const dispatch_status = dispatch?.dispatch_status ?? "UNKNOWN";
  const meta = exact_command ? lookupDispatchAllowlistEntryV1(exact_command) : null;

  if (dispatch && dispatch_status !== "READY") {
    blocked_reasons.push(
      `Refused: canonical dispatch_status must be READY for execution (got ${dispatch_status}).`,
    );
  }
  if (dispatch && dispatch.command_executable !== true) {
    blocked_reasons.push("Refused: command_executable=false — runner will not execute.");
  }

  const dangerNeedles = looksDangerousExactCommandV1(exact_command);
  if (dangerNeedles.length > 0) {
    blocked_reasons.push(`Refused: exact_command contains forbidden patterns: ${dangerNeedles.join(", ")}`);
  }

  // Exact allowlist equality — do not overwrite malformed canonical fields with safe defaults.
  if (exact_command && !meta) {
    blocked_reasons.push("Refused: exact_command is not allowlisted for v1.");
  } else if (exact_command && meta && canonRaw) {
    const posture = canonRaw.mutation_posture as { mutation_allowed?: unknown } | undefined;
    const compare = validateCanonicalAllowlistEqualityV1({
      exact_command,
      selected_subsystem: String(canonRaw.selected_subsystem ?? ""),
      owner_review_required:
        typeof canonRaw.owner_review_required === "boolean"
          ? canonRaw.owner_review_required
          : // missing boolean is a mismatch (compare against inverted allowlist value)
            !meta.owner_review_required,
      mutation_allowed:
        typeof posture?.mutation_allowed === "boolean"
          ? posture.mutation_allowed
          : !meta.mutation_posture.mutation_allowed,
      command_kind: String(canonRaw.command_kind ?? ""),
      artifact_write_behavior: String(canonRaw.artifact_write_behavior ?? ""),
      no_artifact_allowed:
        typeof canonRaw.no_artifact_allowed === "boolean"
          ? canonRaw.no_artifact_allowed
          : !meta.no_artifact_allowed,
    });
    if (!compare.ok) {
      for (const b of compare.blockers) blocked_reasons.push(b);
    }
  } else if (exact_command && meta && !canonRaw) {
    // Legacy batch-only path: require pick fields match allowlist metadata exactly.
    const compare = validateCanonicalAllowlistEqualityV1({
      exact_command,
      selected_subsystem,
      owner_review_required: dispatch?.owner_review_required === true,
      mutation_allowed: dispatch?.mutation_allowed === true,
      command_kind: String(dispatch?.command_kind ?? ""),
      artifact_write_behavior: String(dispatch?.artifact_write_behavior ?? ""),
      no_artifact_allowed: dispatch?.no_artifact_allowed === true,
    });
    if (!compare.ok) {
      for (const b of compare.blockers) blocked_reasons.push(b);
    }
  }

  if (meta?.owner_review_required === true) {
    blocked_reasons.push(
      "Refused: allowlist metadata owner_review_required=true (fail closed; subprocess forbidden).",
    );
  }
  if (noArtifact && meta && !meta.no_artifact_allowed) {
    const why =
      NO_ARTIFACT_ALLOWLIST_EXCLUSION_REASONS_V1[exact_command] ??
      "command not proven stdout-only for --no-artifact";
    blocked_reasons.push(`Refused: --no-artifact forbids this allowlisted command (${why}).`);
  }
  if (dispatch && dispatch.command_surface !== "terminal" && dispatch.command_surface !== "none") {
    blocked_reasons.push("Refused: command_surface must be terminal|none in v1.");
  }
  if (dispatch && dispatch.mutation_allowed !== false) {
    blocked_reasons.push("Refused: dispatch.mutation_allowed must be false in v1.");
  }
  if (meta && meta.mutation_posture.mutation_allowed !== false) {
    blocked_reasons.push("Refused: allowlist mutation_posture.mutation_allowed must be false.");
  }

  const generated_at = now().toISOString();

  // Expected run ID from actual canonical safety posture (never hardcode mutation_allowed=false).
  const runIdSourceCommit =
    persistentBound && provenance.source_commit ? String(provenance.source_commit) : "UNKNOWN";
  const runIdMaterial: DispatchRunIdMaterialV1 = extractDispatchRunIdMaterialV1({
    source_commit: runIdSourceCommit,
    canonRaw: canonRaw ?? null,
    // Pass-through without coercing missing/invalid safety booleans to false.
    batch: dispatch
      ? ({
          selected_subsystem,
          exact_command,
          steering_override_source,
          dispatch_status,
          ...(dispatch.owner_review_required !== undefined
            ? { owner_review_required: dispatch.owner_review_required }
            : {}),
          ...(dispatch.mutation_allowed !== undefined
            ? { mutation_allowed: dispatch.mutation_allowed }
            : {}),
          ...(dispatch.command_kind !== undefined ? { command_kind: dispatch.command_kind } : {}),
          ...(dispatch.artifact_write_behavior !== undefined
            ? { artifact_write_behavior: dispatch.artifact_write_behavior }
            : {}),
          ...(dispatch.no_artifact_allowed !== undefined
            ? { no_artifact_allowed: dispatch.no_artifact_allowed }
            : {}),
        } as Record<string, unknown>)
      : null,
  });
  const expected_run_id = buildDispatchRunIdV1(runIdMaterial);
  // resumeRunId must never replace expected_run_id.
  const run_id = expected_run_id;
  const source_commit = runIdMaterial.source_commit;
  const owner_review_required = runIdMaterial.owner_review_required;
  const mutation_allowed = runIdMaterial.mutation_allowed;
  const mutation_posture_classification = runIdMaterial.mutation_posture_classification;
  const command_kind = runIdMaterial.command_kind;
  const artifact_write_behavior = runIdMaterial.artifact_write_behavior;
  const no_artifact_allowed = runIdMaterial.no_artifact_allowed;

  if (deps.resumeRunId && deps.resumeRunId !== expected_run_id) {
    blocked_reasons.push(
      `resume_run_id_mismatch: provided=${deps.resumeRunId} expected=${expected_run_id}`,
    );
  }

  const dispatchRunsDirRel = deps.dispatchRunsDirRel ?? COMMAND_CENTER_DISPATCH_RUNS_DIR_REL_V1;
  const dirAbs = path.isAbsolute(dispatchRunsDirRel)
    ? dispatchRunsDirRel
    : path.join(deps.rootDir, dispatchRunsDirRel);
  const artifact_abs_path = noArtifact ? null : path.join(dirAbs, `dispatch-run-${run_id}.json`);

  const refuseNoMutation = (
    life: DispatchRunLifecycleV1,
    next: string,
  ): DispatchRunnerResultV1 => {
    const record: BuckpartsCommandCenterDispatchRunV1 = {
      report_name: COMMAND_CENTER_DISPATCH_RUN_REPORT_NAME_V1,
      generated_at,
      source_commit: source_commit ?? "UNKNOWN",
      provenance_status: provenance.provenance_status,
      worktree_clean: provenance.worktree_clean,
      run_id,
      attempt_count: 0,
      dispatch_status_before: dispatch_status,
      selected_subsystem: runIdMaterial.selected_subsystem || selected_subsystem,
      exact_command: runIdMaterial.exact_command || exact_command,
      steering_override_source: runIdMaterial.steering_override_source || steering_override_source,
      owner_review_required,
      mutation_allowed,
      mutation_posture_classification,
      command_kind,
      artifact_write_behavior,
      no_artifact_allowed,
      canonical_decision_snapshot: canonRaw
        ? {
            exact_command: canonRaw.exact_command ?? null,
            selected_subsystem: canonRaw.selected_subsystem ?? null,
            dispatch_status: canonRaw.dispatch_status ?? null,
            owner_review_required: canonRaw.owner_review_required ?? null,
            mutation_posture: canonRaw.mutation_posture ?? null,
            command_kind: canonRaw.command_kind ?? null,
            artifact_write_behavior: canonRaw.artifact_write_behavior ?? null,
            no_artifact_allowed: canonRaw.no_artifact_allowed ?? null,
          }
        : null,
      execution_allowed: false,
      execution_status: "REFUSED",
      execution_lifecycle: life,
      stdout_excerpt: "",
      stderr_excerpt: "",
      parsed_json_summary: null,
      blocked_reasons: [...blocked_reasons],
      next_expected_state: next,
      subprocess_exit_code: null,
      artifact_write_error: null,
      ledger_refresh_error: null,
      resume_command: dispatchResumeCommandV1(run_id),
      resume_from_stage: "gates",
      read_only: true,
      data_mutation: false,
    };
    return { artifact_abs_path: null, artifact: record, no_artifact: noArtifact };
  };

  // Resume ID mismatch: fail closed before journal / ledger / subprocess.
  if (deps.resumeRunId && deps.resumeRunId !== expected_run_id) {
    return refuseNoMutation(
      "REFUSED",
      `Provide matching --resume-run-id=${expected_run_id} for current canonical decision.`,
    );
  }

  // Dirty/UNKNOWN persistent: refuse with zero reads-for-mutation, zero writes.
  if (!noArtifact && !persistentBound) {
    return refuseNoMutation(
      "REFUSED",
      "Fix provenance (clean bound worktree) before dispatch.",
    );
  }

  const priorLookup =
    !noArtifact
      ? findPriorDispatchArtifactByRunIdV1({
          dirAbs,
          run_id,
          readText,
          exists,
        })
      : null;

  if (deps.resumeRunId && !priorLookup) {
    throw new Error(`Refused: missing durable dispatch record for --resume-run-id=${deps.resumeRunId}`);
  }

  if (
    priorLookup &&
    (priorLookup.status === "parse_failed" || priorLookup.status === "structurally_invalid")
  ) {
    blocked_reasons.push(priorLookup.discovery_blocker);
    return refuseNoMutation(
      "REFUSED",
      "Durable dispatch record at canonical path is unreadable or structurally invalid; refuse mutation.",
    );
  }

  const prior =
    priorLookup && priorLookup.status === "found"
      ? { abs_path: priorLookup.abs_path, parsed: priorLookup.parsed, raw: priorLookup.raw }
      : null;

  if (prior) {
    const binding = validateResumeRecordBindingV1({
      expected_run_id,
      expected: runIdMaterial,
      stored: prior.parsed,
    });
    if (!binding.ok) {
      for (const b of binding.blockers) blocked_reasons.push(b);
      return refuseNoMutation(
        "REFUSED",
        "Stored dispatch record does not match current canonical decision; refuse resume mutation.",
      );
    }
  }

  let attempt_count =
    prior && typeof prior.parsed.attempt_count === "number" ? prior.parsed.attempt_count : 0;
  let execution_lifecycle: DispatchRunLifecycleV1 = "REFUSED";
  let stdout = "";
  let stderr = "";
  let parsed_json_summary: unknown | null = null;
  let subprocess_exit_code: number | null = null;
  let artifact_write_error: string | null = null;
  let ledger_refresh_error: string | null = null;
  let ledgerRefreshCalls = 0;
  let writeCalls = 0;

  const trackedWriteText = (abs: string, contents: string) => {
    writeCalls += 1;
    writeText(abs, contents);
  };

  const doLedgerRefresh = (artifactAbs: string, life: DispatchRunLifecycleV1) => {
    if (ledgerRefreshCalls > 0) return;
    const refresh =
      deps.refreshExecutionLedger ??
      (() => {
        refreshBuckpartsExecutionLedgerV1({
          rootDir: deps.rootDir,
          trigger_source: "npm run buckparts:command-center:run-dispatch",
          now,
        });
      });
    refresh({
      execution_status: "EXECUTED",
      execution_lifecycle: life,
      artifact_abs_path: artifactAbs,
    });
    ledgerRefreshCalls += 1;
  };

  const persist = (record: BuckpartsCommandCenterDispatchRunV1) => {
    if (noArtifact || !artifact_abs_path) return;
    atomicWriteJsonV1({
      absPath: artifact_abs_path,
      value: record,
      writeText: trackedWriteText,
      rename,
    });
  };

  const buildRecord = (
    life: DispatchRunLifecycleV1,
    extra?: Partial<BuckpartsCommandCenterDispatchRunV1>,
  ): BuckpartsCommandCenterDispatchRunV1 => {
    const status = toExecutionStatus(life);
    const reasons = [...blocked_reasons, ...(extra?.blocked_reasons ?? [])].filter(
      (v, i, a) => a.indexOf(v) === i,
    );
    const base: BuckpartsCommandCenterDispatchRunV1 = {
      report_name: COMMAND_CENTER_DISPATCH_RUN_REPORT_NAME_V1,
      generated_at,
      source_commit: source_commit ?? "UNKNOWN",
      provenance_status: provenance.provenance_status,
      worktree_clean: provenance.worktree_clean,
      run_id,
      attempt_count,
      dispatch_status_before: runIdMaterial.dispatch_status || dispatch_status,
      selected_subsystem: runIdMaterial.selected_subsystem || selected_subsystem,
      exact_command: runIdMaterial.exact_command || exact_command,
      steering_override_source:
        runIdMaterial.steering_override_source || steering_override_source,
      owner_review_required,
      mutation_allowed,
      mutation_posture_classification,
      command_kind,
      artifact_write_behavior,
      no_artifact_allowed,
      canonical_decision_snapshot: canonRaw
        ? {
            next_best_action: canonRaw.next_best_action ?? null,
            steering_override_source: canonRaw.steering_override_source ?? null,
            exact_command: canonRaw.exact_command ?? null,
            dispatch_status: canonRaw.dispatch_status ?? null,
            command_executable: canonRaw.command_executable ?? null,
            owner_review_required: canonRaw.owner_review_required ?? null,
            selected_subsystem: canonRaw.selected_subsystem ?? null,
            command_kind: canonRaw.command_kind ?? null,
            artifact_write_behavior: canonRaw.artifact_write_behavior ?? null,
            no_artifact_allowed: canonRaw.no_artifact_allowed ?? null,
            mutation_posture: canonRaw.mutation_posture ?? null,
          }
        : null,
      execution_allowed:
        reasons.length === 0 &&
        life !== "ALREADY_EXECUTED" &&
        life !== "REFUSED" &&
        life !== "EXECUTED" &&
        life !== "EXECUTION_IN_PROGRESS" &&
        life !== "EXECUTION_OUTCOME_UNKNOWN" &&
        dispatch_status === "READY",
      execution_status: status,
      execution_lifecycle: life,
      stdout_excerpt: excerpt(stdout),
      stderr_excerpt: excerpt(stderr),
      parsed_json_summary,
      blocked_reasons: reasons,
      next_expected_state: nextExpectedStateForLifecycleV1({
        life,
        run_id,
        success_transition: dispatch?.success_transition,
        failure_transition: dispatch?.failure_transition,
      }),
      subprocess_exit_code,
      artifact_write_error,
      ledger_refresh_error,
      resume_command: dispatchResumeCommandV1(run_id),
      resume_from_stage: resumeStageForLifecycleV1(life),
      read_only: true,
      data_mutation: false,
    };
    if (!extra) return base;
    return {
      ...base,
      ...extra,
      execution_lifecycle: life,
      execution_status: status,
      blocked_reasons: reasons,
    };
  };

  const gatesOk =
    blocked_reasons.length === 0 &&
    dispatch?.command_surface === "terminal" &&
    dispatch_status === "READY" &&
    dispatch.command_executable === true;

  // --- Prior durable state handling ---
  if (prior) {
    const priorLife = String(prior.parsed.execution_lifecycle ?? "") as DispatchRunLifecycleV1;
    stdout = String(prior.parsed.stdout_excerpt ?? "");
    stderr = String(prior.parsed.stderr_excerpt ?? "");
    parsed_json_summary = prior.parsed.parsed_json_summary ?? null;
    subprocess_exit_code =
      typeof prior.parsed.subprocess_exit_code === "number" ? prior.parsed.subprocess_exit_code : null;
    attempt_count = typeof prior.parsed.attempt_count === "number" ? prior.parsed.attempt_count : 0;

    // Ambiguous / uncertain — never auto-rerun; explicit resume also fails closed.
    if (isAmbiguousExecutionLifecycleV1(priorLife)) {
      blocked_reasons.push(
        `uncertain_execution_requires_reconciliation: lifecycle=${priorLife} (subprocess_calls must remain prior; no auto-rerun)`,
      );
      const record = buildRecord(priorLife as DispatchRunLifecycleV1);
      record.execution_allowed = false;
      // Preserve durable record byte-for-byte (no write).
      return { artifact_abs_path, artifact: record, no_artifact: false };
    }

    // Ordinary invocation must refuse FAILED / READY_TO_EXECUTE.
    if (!explicitResume && ordinaryInvocationMustRefuseLifecycleV1(priorLife)) {
      blocked_reasons.push(
        `explicit_resume_required: durable lifecycle=${priorLife}; use --resume-run-id=${run_id}`,
      );
      const record = buildRecord("REFUSED");
      record.execution_allowed = false;
      return { artifact_abs_path, artifact: record, no_artifact: false };
    }

    // Resume skip-subprocess stages (pending artifact/ledger / terminal).
    if (shouldSkipSubprocessForPriorRunV1(prior.parsed)) {
      if (priorLife === "EXECUTED_ARTIFACT_PENDING") {
        try {
          const usingDefault = deps.dispatchRunsDirRel == null;
          if (usingDefault) {
            try {
              doLedgerRefresh(prior.abs_path, "EXECUTED");
            } catch (err) {
              ledger_refresh_error = err instanceof Error ? err.message : String(err);
              const pending = buildRecord("EXECUTED_LEDGER_PENDING");
              pending.execution_allowed = false;
              pending.blocked_reasons = pending.blocked_reasons.filter(
                (b) => !b.startsWith("idempotent_skip:"),
              );
              persist(pending);
              return { artifact_abs_path, artifact: pending, no_artifact: false };
            }
          }
          const done = buildRecord("EXECUTED");
          done.execution_allowed = false;
          done.blocked_reasons = done.blocked_reasons.filter(
            (b) =>
              !b.startsWith("idempotent_skip:") &&
              !b.startsWith("artifact_write_failed:") &&
              !b.startsWith("explicit_resume_required"),
          );
          persist(done);
          return { artifact_abs_path, artifact: done, no_artifact: false };
        } catch (err) {
          artifact_write_error = err instanceof Error ? err.message : String(err);
          const record = buildRecord("EXECUTED_ARTIFACT_PENDING", {
            blocked_reasons: [`artifact_write_failed: ${artifact_write_error}`],
          });
          record.execution_allowed = false;
          return { artifact_abs_path, artifact: record, no_artifact: false };
        }
      }

      if (priorLife === "EXECUTED_LEDGER_PENDING") {
        try {
          doLedgerRefresh(prior.abs_path, "EXECUTED_LEDGER_PENDING");
          const done = buildRecord("EXECUTED");
          done.execution_allowed = false;
          done.execution_status = "EXECUTED";
          done.blocked_reasons = done.blocked_reasons.filter(
            (b) =>
              !b.startsWith("idempotent_skip:") &&
              !b.includes("ledger") &&
              !b.startsWith("explicit_resume_required"),
          );
          persist(done);
          return { artifact_abs_path, artifact: done, no_artifact: false };
        } catch (err) {
          ledger_refresh_error = err instanceof Error ? err.message : String(err);
          const pending = buildRecord("EXECUTED_LEDGER_PENDING");
          pending.execution_allowed = false;
          persist(pending);
          return { artifact_abs_path, artifact: pending, no_artifact: false };
        }
      }

      // EXECUTED / ALREADY_EXECUTED — idempotent no-op (no write required to preserve bytes).
      const record = buildRecord("ALREADY_EXECUTED");
      record.execution_allowed = false;
      record.blocked_reasons = [
        `idempotent_skip: run_id=${run_id} already terminal (${priorLife})`,
      ];
      return { artifact_abs_path, artifact: record, no_artifact: false };
    }

    // Explicit resume of FAILED or READY_TO_EXECUTE → may re-enter subprocess path below.
    if (
      explicitResume &&
      (priorLife === "FAILED" || priorLife === "READY_TO_EXECUTE") &&
      gatesOk
    ) {
      // fall through to execution sequence
    } else if (explicitResume && (priorLife === "FAILED" || priorLife === "READY_TO_EXECUTE")) {
      const record = buildRecord("REFUSED");
      return { artifact_abs_path, artifact: record, no_artifact: false };
    }
  }

  if (!gatesOk) {
    const record = buildRecord("REFUSED");
    const malformedCanonical = blocked_reasons.some((b) =>
      b.startsWith("canonical_allowlist_mismatch:"),
    );
    let outPath: string | null = null;
    // Malformed canonical decisions may have an expected run_id but must not create a journal.
    if (!noArtifact && artifact_abs_path && persistentBound && !malformedCanonical) {
      outPath = artifact_abs_path;
      if (!prior) {
        try {
          if (!exists(dirAbs)) mkdirp(dirAbs);
          persist(record);
        } catch (err) {
          artifact_write_error = err instanceof Error ? err.message : String(err);
        }
      }
    }
    return {
      artifact_abs_path: outPath,
      artifact: { ...record, artifact_write_error },
      no_artifact: noArtifact,
    };
  }

  // --- Fresh / explicit-resume subprocess path ---
  if (!noArtifact && artifact_abs_path) {
    if (!exists(dirAbs)) mkdirp(dirAbs);
    attempt_count += 1;
    try {
      persist(buildRecord("READY_TO_EXECUTE"));
      persist(buildRecord("EXECUTION_IN_PROGRESS"));
    } catch (err) {
      artifact_write_error = err instanceof Error ? err.message : String(err);
      blocked_reasons.push(`journal_write_failed_before_subprocess: ${artifact_write_error}`);
      return { artifact_abs_path, artifact: buildRecord("REFUSED"), no_artifact: false };
    }
  } else {
    attempt_count += 1;
  }

  const result = await exec(exact_command, deps.rootDir);
  stdout = result.stdout;
  stderr = result.stderr;
  subprocess_exit_code = result.exitCode;
  parsed_json_summary = safeParseJson(stdout);

  if (result.exitCode !== 0) {
    execution_lifecycle = "FAILED";
    blocked_reasons.push(`Command exit_code=${String(result.exitCode)}`);
    const record = buildRecord("FAILED");
    if (!noArtifact && artifact_abs_path) {
      try {
        persist(record);
      } catch (err) {
        artifact_write_error = err instanceof Error ? err.message : String(err);
      }
    }
    return {
      artifact_abs_path: noArtifact ? null : artifact_abs_path,
      artifact: { ...record, artifact_write_error },
      no_artifact: noArtifact,
    };
  }

  if (noArtifact) {
    return {
      artifact_abs_path: null,
      artifact: buildRecord("EXECUTED"),
      no_artifact: true,
    };
  }

  // Persist success evidence as EXECUTED_ARTIFACT_PENDING.
  try {
    persist(buildRecord("EXECUTED_ARTIFACT_PENDING"));
  } catch (err) {
    artifact_write_error = err instanceof Error ? err.message : String(err);
    // Durable state remains EXECUTION_IN_PROGRESS (not READY_TO_EXECUTE).
    const uncertain = buildRecord("EXECUTION_OUTCOME_UNKNOWN", {
      blocked_reasons: [
        `success_persistence_failed: ${artifact_write_error}`,
        "uncertain_execution_requires_reconciliation",
      ],
    });
    uncertain.execution_allowed = false;
    // Best-effort: leave IN_PROGRESS on disk if we cannot write OUTCOME_UNKNOWN.
    try {
      persist(buildRecord("EXECUTION_IN_PROGRESS", {
        blocked_reasons: [
          `success_persistence_failed: ${artifact_write_error}`,
          "uncertain_execution_requires_reconciliation",
        ],
      }));
    } catch {
      /* disk still has EXECUTION_IN_PROGRESS from pre-exec */
    }
    return { artifact_abs_path, artifact: uncertain, no_artifact: false };
  }

  // Finalize + ledger once.
  try {
    const usingDefault = deps.dispatchRunsDirRel == null;
    if (usingDefault && artifact_abs_path) {
      try {
        doLedgerRefresh(artifact_abs_path, "EXECUTED");
      } catch (err) {
        ledger_refresh_error = err instanceof Error ? err.message : String(err);
        const pendingLedger = buildRecord("EXECUTED_LEDGER_PENDING");
        pendingLedger.execution_allowed = false;
        persist(pendingLedger);
        return { artifact_abs_path, artifact: pendingLedger, no_artifact: false };
      }
    }
    const finalRecord = buildRecord("EXECUTED");
    finalRecord.execution_allowed = false;
    persist(finalRecord);
    return { artifact_abs_path, artifact: finalRecord, no_artifact: false };
  } catch (err) {
    artifact_write_error = err instanceof Error ? err.message : String(err);
    const record = buildRecord("EXECUTED_ARTIFACT_PENDING", {
      blocked_reasons: [`artifact_write_failed: ${artifact_write_error}`],
    });
    record.execution_allowed = false;
    return { artifact_abs_path, artifact: record, no_artifact: false };
  }
}
