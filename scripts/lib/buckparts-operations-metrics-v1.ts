/**
 * BuckParts Operations Metrics v1 — read-only measurement of the operating system.
 * Indexes runner runs, agent dispatches, owner decision queue, and census snapshots.
 * Does not add orchestration, automation, or product mutation.
 */

import { createHash } from "node:crypto";
import { appendFileSync, existsSync, mkdirSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";

import {
  BUCKPARTS_RUNNER_CONTRACT_V1,
  BUCKPARTS_RUNNER_CHECKPOINTS_DIR_REL_V1,
  BUCKPARTS_RUNNER_MISSIONS_V1,
  BUCKPARTS_RUNNER_RUNS_DIR_REL_V1,
  type BuckpartsRunnerCheckpointV1,
  type BuckpartsRunnerMissionIdV1,
  type BuckpartsRunnerReportV1,
  type RunnerStepResultV1,
} from "./buckparts-runner-v1";
import {
  BUCKPARTS_AGENT_RESULT_CONTRACT_V1,
  listAgentDispatchManifestsV1,
  loadAgentResultV1,
  type BuckpartsAgentDispatchManifestV1,
} from "./buckparts-agent-contract-v1";
import {
  buildAllProductSafeBuyerPathCensusV1,
  type AllProductSafeBuyerPathCensusV1,
} from "./all-product-safe-buyer-path-census-v1";
import {
  buildOwnerDecisionQueueProjectionV1,
  listOwnerDecisionRequestArtifactPathsV1,
  loadOwnerDecisionRequestV1,
  type OwnerDecisionRequestV1,
} from "../../src/lib/owner-dashboard/owner-decision-queue-v1";

export const BUCKPARTS_OPERATIONS_METRICS_CONTRACT_V1 =
  "buckparts_operations_metrics_v1" as const;

export const BUCKPARTS_OPERATIONS_METRICS_HISTORY_REL_V1 =
  "data/command-center/operations-metrics/history-v1.jsonl" as const;

export const BUCKPARTS_OPERATIONS_METRICS_CC_JQ_PATH_V1 =
  ".command_center_v2.operations_metrics_v1" as const;

export const BUCKPARTS_OPERATIONS_METRICS_SOURCE_COMMAND_V1 =
  "npm run buckparts:operations-metrics" as const;

export type OperationsMetricsMissionRunV1 = {
  run_id: string;
  mission_id: BuckpartsRunnerMissionIdV1 | string;
  artifact_rel_path: string;
  generated_at: string;
  overall_status: BuckpartsRunnerReportV1["overall_status"];
  resumed_from_checkpoint: boolean;
  mission_duration_ms: number;
  analysis_duration_ms: number;
  validation_duration_ms: number;
  dispatch_wall_duration_ms: number | null;
  agent_dispatch_step_count: number;
  agent_validation_pass_count: number;
  retry_count: number;
  timeout_count: number;
  owner_decision_count: number;
  owner_wait_time_ms: number | null;
  founder_effort_units: number;
  safe_buyer_path_proven_at_run: number | "UNKNOWN";
  safe_buyer_path_proven_delta: number | "UNKNOWN";
  validation_steps_passed: number;
  validation_steps_failed: number;
  validation_steps_skipped: number;
};

export type OperationsMetricsDispatchSummaryV1 = {
  manifest_id: string;
  run_id: string;
  mission_id: string;
  step_id: string;
  status: BuckpartsAgentDispatchManifestV1["status"];
  attempt_number: number;
  max_attempts: number;
  dispatch_duration_ms: number | null;
  validation_pass: boolean | null;
  timed_out: boolean;
};

export type OperationsMetricsTrendPointV1 = {
  recorded_at: string;
  snapshot_id: string;
  safe_buyer_path_proven_count: number;
  queue_pending_count: number;
  queue_stale_count: number;
  mission_run_count: number;
  agent_success_rate: number | "UNKNOWN";
  validation_pass_rate: number | "UNKNOWN";
  mean_mission_duration_ms: number | "UNKNOWN";
  total_retry_count: number;
  total_timeout_count: number;
};

export type OperationsMetricsTrendReportV1 = {
  snapshot_count: number;
  first_snapshot_at: string | null;
  last_snapshot_at: string | null;
  safe_buyer_path_proven_delta_since_first: number | "UNKNOWN";
  queue_depth_series: { recorded_at: string; pending_count: number; stale_count: number }[];
  points: OperationsMetricsTrendPointV1[];
  throughput_hypothesis: {
    foundation_v2_measurement_mode: true;
    agent_success_rate_latest: number | "UNKNOWN";
    agent_success_rate_prior: number | "UNKNOWN";
    validation_pass_rate_latest: number | "UNKNOWN";
    proven_delta_since_first_snapshot: number | "UNKNOWN";
    interpretation: string;
  };
};

export type OperationsMetricsAggregateV1 = {
  mission_run_count: number;
  agent_dispatch_count: number;
  agent_success_rate: number | "UNKNOWN";
  validation_pass_rate: number | "UNKNOWN";
  total_retry_count: number;
  total_timeout_count: number;
  total_owner_decision_count: number;
  mean_mission_duration_ms: number | "UNKNOWN";
  mean_validation_duration_ms: number | "UNKNOWN";
  mean_dispatch_duration_ms: number | "UNKNOWN";
  mean_owner_wait_time_ms: number | "UNKNOWN";
  mean_founder_effort_units: number | "UNKNOWN";
  safe_buyer_path_proven_count_current: number | "UNKNOWN";
};

export type OperationsMetricsSnapshotV1 = {
  contract: "buckparts_operations_metrics_snapshot_v1";
  snapshot_id: string;
  recorded_at: string;
  trigger_source: string;
  aggregate: OperationsMetricsAggregateV1;
  queue_pending_count: number;
  queue_stale_count: number;
  trend_fingerprint: string;
};

export type OperationsMetricsReportV1 = {
  contract: typeof BUCKPARTS_OPERATIONS_METRICS_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  mutation_authorized: false;
  recommended_jq_path: typeof BUCKPARTS_OPERATIONS_METRICS_CC_JQ_PATH_V1;
  source_command: typeof BUCKPARTS_OPERATIONS_METRICS_SOURCE_COMMAND_V1;
  generated_at: string;
  aggregate: OperationsMetricsAggregateV1;
  mission_runs: OperationsMetricsMissionRunV1[];
  dispatch_summaries: OperationsMetricsDispatchSummaryV1[];
  trend: OperationsMetricsTrendReportV1;
  source_paths_read: string[];
  recommended_next_action: string;
  proven_facts: string[];
  unknown_facts: string[];
};

const VALIDATION_STEP_IDS = new Set([
  "validation_lint",
  "validation_build",
  "validation_tests",
  "deploy_classifier",
  "security_gate",
]);

function isRunnerReport(raw: unknown): raw is BuckpartsRunnerReportV1 {
  return (
    typeof raw === "object" &&
    raw !== null &&
    (raw as BuckpartsRunnerReportV1).contract === BUCKPARTS_RUNNER_CONTRACT_V1
  );
}

export function listRunnerReportArtifactsV1(rootDir: string): BuckpartsRunnerReportV1[] {
  const dir = path.join(rootDir, BUCKPARTS_RUNNER_RUNS_DIR_REL_V1);
  if (!existsSync(dir)) {
    return [];
  }
  const reports: BuckpartsRunnerReportV1[] = [];
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".json"))) {
    try {
      const raw = JSON.parse(readFileSync(path.join(dir, file), "utf8")) as unknown;
      if (isRunnerReport(raw)) {
        reports.push({
          ...raw,
          artifact_rel_path: raw.artifact_rel_path ?? `${BUCKPARTS_RUNNER_RUNS_DIR_REL_V1}/${file}`,
        });
      }
    } catch {
      // skip invalid artifacts
    }
  }
  return reports.sort((a, b) => b.generated_at.localeCompare(a.generated_at));
}

function loadCheckpointV1(
  rootDir: string,
  runId: string,
): BuckpartsRunnerCheckpointV1 | null {
  const abs = path.join(rootDir, BUCKPARTS_RUNNER_CHECKPOINTS_DIR_REL_V1, `${runId}.json`);
  if (!existsSync(abs)) {
    return null;
  }
  try {
    return JSON.parse(readFileSync(abs, "utf8")) as BuckpartsRunnerCheckpointV1;
  } catch {
    return null;
  }
}

function stepPhaseForMission(
  missionId: string,
  stepId: string,
): "analysis" | "validation" | "unknown" {
  if (VALIDATION_STEP_IDS.has(stepId)) {
    return "validation";
  }
  if (missionId in BUCKPARTS_RUNNER_MISSIONS_V1) {
    const mission = BUCKPARTS_RUNNER_MISSIONS_V1[missionId as BuckpartsRunnerMissionIdV1];
    const step = mission.steps.find((s) => s.step_id === stepId);
    if (step) {
      return step.phase;
    }
  }
  return "unknown";
}

function missionDurationsV1(
  report: BuckpartsRunnerReportV1,
  checkpoint: BuckpartsRunnerCheckpointV1 | null,
): {
  mission_duration_ms: number;
  analysis_duration_ms: number;
  validation_duration_ms: number;
} {
  let analysis = 0;
  let validation = 0;
  for (const step of report.steps) {
    const phase = stepPhaseForMission(report.mission_id, step.step_id);
    if (phase === "validation") {
      validation += step.duration_ms;
    } else if (phase === "analysis") {
      analysis += step.duration_ms;
    }
  }
  const stepSum = analysis + validation;
  if (checkpoint?.started_at && report.generated_at) {
    const wall = Date.parse(report.generated_at) - Date.parse(checkpoint.started_at);
    if (Number.isFinite(wall) && wall >= stepSum) {
      return {
        mission_duration_ms: wall,
        analysis_duration_ms: analysis,
        validation_duration_ms: validation,
      };
    }
  }
  return {
    mission_duration_ms: stepSum,
    analysis_duration_ms: analysis,
    validation_duration_ms: validation,
  };
}

function extractProvenCountFromStep(step: RunnerStepResultV1): number | null {
  const summary = step.parsed_json_summary;
  if (!summary || typeof summary !== "object") {
    return null;
  }
  const counts = (summary as Record<string, unknown>).classification_counts;
  if (counts && typeof counts === "object") {
    const proven = (counts as Record<string, unknown>).SAFE_BUYER_PATH_PROVEN;
    if (typeof proven === "number") {
      return proven;
    }
  }
  return null;
}

function loadOwnerRequestsForRun(
  rootDir: string,
  runId: string,
  now: () => Date,
): { requests: OwnerDecisionRequestV1[]; waitMs: number | null; effort: number } {
  const paths = listOwnerDecisionRequestArtifactPathsV1(rootDir);
  const linked: OwnerDecisionRequestV1[] = [];
  for (const rel of paths) {
    const req = loadOwnerDecisionRequestV1(rootDir, rel);
    if (req?.runner_halt_context?.run_id === runId) {
      linked.push(req);
    }
  }
  if (linked.length === 0) {
    return { requests: [], waitMs: null, effort: 0 };
  }
  let totalWait = 0;
  let resolved = 0;
  for (const req of linked) {
    const created = Date.parse(req.created_at);
    const updated = Date.parse(req.updated_at);
    if (req.status === "PENDING_OWNER_DECISION") {
      totalWait += now().getTime() - created;
      resolved += 1;
    } else if (Number.isFinite(created) && Number.isFinite(updated) && updated >= created) {
      totalWait += updated - created;
      resolved += 1;
    }
  }
  const effort =
    linked.length +
    linked.filter((r) => r.status === "PENDING_OWNER_DECISION").length +
    linked.filter((r) => r.status === "APPROVED").length;
  return {
    requests: linked,
    waitMs: resolved > 0 ? Math.round(totalWait / resolved) : null,
    effort,
  };
}

function buildDispatchSummariesV1(
  rootDir: string,
  manifests: BuckpartsAgentDispatchManifestV1[],
): OperationsMetricsDispatchSummaryV1[] {
  return manifests.map((manifest) => {
    const result = loadAgentResultV1(rootDir, manifest.result_artifact_rel_path);
    let dispatchDuration: number | null = null;
    let validationPass: boolean | null = null;
    if (result?.contract === BUCKPARTS_AGENT_RESULT_CONTRACT_V1) {
      const start = Date.parse(manifest.created_at);
      const end = Date.parse(result.submitted_at);
      if (Number.isFinite(start) && Number.isFinite(end) && end >= start) {
        dispatchDuration = end - start;
      }
      validationPass = manifest.status === "VALIDATION_PASS";
    }
    return {
      manifest_id: manifest.manifest_id,
      run_id: manifest.run_id,
      mission_id: manifest.mission_id,
      step_id: manifest.step_id,
      status: manifest.status,
      attempt_number: manifest.retry_policy.attempt_number,
      max_attempts: manifest.retry_policy.max_attempts,
      dispatch_duration_ms: dispatchDuration,
      validation_pass: validationPass,
      timed_out: manifest.status === "TIMED_OUT",
    };
  });
}

function buildMissionRunMetricsV1(args: {
  rootDir: string;
  report: BuckpartsRunnerReportV1;
  manifests: BuckpartsAgentDispatchManifestV1[];
  now: () => Date;
}): OperationsMetricsMissionRunV1 {
  const checkpoint = loadCheckpointV1(args.rootDir, args.report.run_id);
  const durations = missionDurationsV1(args.report, checkpoint);
  const runManifests = args.manifests.filter((m) => m.run_id === args.report.run_id);

  let dispatchWall: number | null = null;
  const dispatchDurations = runManifests
    .map((m) => {
      const result = loadAgentResultV1(args.rootDir, m.result_artifact_rel_path);
      if (!result) {
        return null;
      }
      const start = Date.parse(m.created_at);
      const end = Date.parse(result.submitted_at);
      if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) {
        return null;
      }
      return end - start;
    })
    .filter((v): v is number => v !== null);
  if (dispatchDurations.length > 0) {
    dispatchWall = Math.round(
      dispatchDurations.reduce((a, b) => a + b, 0) / dispatchDurations.length,
    );
  }

  const agentPass = args.report.steps.filter((s) => s.agent_validation_pass === true).length;
  const retryCount = runManifests.reduce(
    (acc, m) => acc + Math.max(0, m.retry_policy.attempt_number - 1),
    0,
  );
  const timeoutCount = runManifests.filter((m) => m.status === "TIMED_OUT").length;

  const owner = loadOwnerRequestsForRun(args.rootDir, args.report.run_id, args.now);

  let validationPassed = 0;
  let validationFailed = 0;
  let validationSkipped = 0;
  for (const step of args.report.steps) {
    if (stepPhaseForMission(args.report.mission_id, step.step_id) !== "validation") {
      continue;
    }
    if (step.status === "PASS") validationPassed += 1;
    else if (step.status === "FAIL") validationFailed += 1;
    else if (step.status === "SKIPPED") validationSkipped += 1;
  }

  const censusStep = args.report.steps.find((s) => s.step_id === "safe_buyer_path_census");
  const provenAtRun = censusStep ? extractProvenCountFromStep(censusStep) : null;

  return {
    run_id: args.report.run_id,
    mission_id: args.report.mission_id,
    artifact_rel_path: args.report.artifact_rel_path,
    generated_at: args.report.generated_at,
    overall_status: args.report.overall_status,
    resumed_from_checkpoint: args.report.resumed_from_checkpoint,
    ...durations,
    dispatch_wall_duration_ms: dispatchWall,
    agent_dispatch_step_count: args.report.steps.filter((s) => s.kind === "agent_dispatch").length,
    agent_validation_pass_count: agentPass,
    retry_count: retryCount,
    timeout_count: timeoutCount,
    owner_decision_count: owner.requests.length,
    owner_wait_time_ms: owner.waitMs,
    founder_effort_units: owner.effort,
    safe_buyer_path_proven_at_run: provenAtRun ?? "UNKNOWN",
    safe_buyer_path_proven_delta: "UNKNOWN",
    validation_steps_passed: validationPassed,
    validation_steps_failed: validationFailed,
    validation_steps_skipped: validationSkipped,
  };
}

function loadCensusProvenCountV1(rootDir: string): number | "UNKNOWN" {
  try {
    const census: AllProductSafeBuyerPathCensusV1 = buildAllProductSafeBuyerPathCensusV1({
      rootDir,
      fileExists: existsSync,
      readText: (p) => readFileSync(p, "utf8"),
    });
    if (census.contract === "all_product_safe_buyer_path_census_v1") {
      return census.classification_counts.SAFE_BUYER_PATH_PROVEN ?? 0;
    }
  } catch {
    // census unavailable
  }
  return "UNKNOWN";
}

function computeRates(args: {
  missionRuns: OperationsMetricsMissionRunV1[];
  dispatchSummaries: OperationsMetricsDispatchSummaryV1[];
}): Pick<
  OperationsMetricsAggregateV1,
  "agent_success_rate" | "validation_pass_rate" | "mean_mission_duration_ms" | "mean_validation_duration_ms" | "mean_dispatch_duration_ms" | "mean_owner_wait_time_ms" | "mean_founder_effort_units"
> {
  const completedDispatches = args.dispatchSummaries.filter(
    (d) => d.validation_pass !== null,
  );
  const agentSuccess =
    completedDispatches.length === 0
      ? ("UNKNOWN" as const)
      : completedDispatches.filter((d) => d.validation_pass === true).length /
        completedDispatches.length;

  let valPass = 0;
  let valFail = 0;
  for (const run of args.missionRuns) {
    valPass += run.validation_steps_passed;
    valFail += run.validation_steps_failed;
  }
  const validationPassRate =
    valPass + valFail === 0 ? ("UNKNOWN" as const) : valPass / (valPass + valFail);

  const mean = (values: number[]): number | "UNKNOWN" =>
    values.length === 0 ? "UNKNOWN" : Math.round(values.reduce((a, b) => a + b, 0) / values.length);

  return {
    agent_success_rate: typeof agentSuccess === "number" ? Math.round(agentSuccess * 1000) / 1000 : agentSuccess,
    validation_pass_rate:
      typeof validationPassRate === "number"
        ? Math.round(validationPassRate * 1000) / 1000
        : validationPassRate,
    mean_mission_duration_ms: mean(args.missionRuns.map((r) => r.mission_duration_ms)),
    mean_validation_duration_ms: mean(args.missionRuns.map((r) => r.validation_duration_ms)),
    mean_dispatch_duration_ms: mean(
      args.dispatchSummaries
        .map((d) => d.dispatch_duration_ms)
        .filter((v): v is number => v !== null),
    ),
    mean_owner_wait_time_ms: mean(
      args.missionRuns
        .map((r) => r.owner_wait_time_ms)
        .filter((v): v is number => v !== null),
    ),
    mean_founder_effort_units: mean(args.missionRuns.map((r) => r.founder_effort_units)),
  };
}

export function loadOperationsMetricsHistoryV1(rootDir: string): OperationsMetricsSnapshotV1[] {
  const abs = path.join(rootDir, BUCKPARTS_OPERATIONS_METRICS_HISTORY_REL_V1);
  if (!existsSync(abs)) {
    return [];
  }
  const lines = readFileSync(abs, "utf8").split("\n").filter((l) => l.trim().length > 0);
  const snapshots: OperationsMetricsSnapshotV1[] = [];
  for (const line of lines) {
    try {
      const parsed = JSON.parse(line) as OperationsMetricsSnapshotV1;
      if (parsed.contract === "buckparts_operations_metrics_snapshot_v1") {
        snapshots.push(parsed);
      }
    } catch {
      // skip bad lines
    }
  }
  return snapshots;
}

export function appendOperationsMetricsSnapshotV1(args: {
  rootDir: string;
  report: OperationsMetricsReportV1;
  trigger_source: string;
  queue_pending_count: number;
  queue_stale_count: number;
  now?: () => Date;
}): string {
  const now = args.now ?? (() => new Date());
  const recordedAt = now().toISOString();
  const snapshot: OperationsMetricsSnapshotV1 = {
    contract: "buckparts_operations_metrics_snapshot_v1",
    snapshot_id: createHash("sha256")
      .update(`${recordedAt}:${args.trigger_source}`)
      .digest("hex")
      .slice(0, 12),
    recorded_at: recordedAt,
    trigger_source: args.trigger_source,
    aggregate: args.report.aggregate,
    queue_pending_count: args.queue_pending_count,
    queue_stale_count: args.queue_stale_count,
    trend_fingerprint: createHash("sha256")
      .update(JSON.stringify(args.report.aggregate))
      .digest("hex")
      .slice(0, 12),
  };
  const rel = BUCKPARTS_OPERATIONS_METRICS_HISTORY_REL_V1;
  const abs = path.join(args.rootDir, rel);
  mkdirSync(path.dirname(abs), { recursive: true });
  appendFileSync(abs, `${JSON.stringify(snapshot)}\n`, "utf8");
  return rel;
}

function buildTrendReportV1(args: {
  history: OperationsMetricsSnapshotV1[];
  currentAggregate: OperationsMetricsAggregateV1;
  queuePending: number;
  queueStale: number;
  missionRunCount: number;
  now: () => Date;
}): OperationsMetricsTrendReportV1 {
  const points: OperationsMetricsTrendPointV1[] = args.history.map((s) => ({
    recorded_at: s.recorded_at,
    snapshot_id: s.snapshot_id,
    safe_buyer_path_proven_count:
      s.aggregate.safe_buyer_path_proven_count_current === "UNKNOWN"
        ? 0
        : s.aggregate.safe_buyer_path_proven_count_current,
    queue_pending_count: s.queue_pending_count,
    queue_stale_count: s.queue_stale_count,
    mission_run_count: s.aggregate.mission_run_count,
    agent_success_rate: s.aggregate.agent_success_rate,
    validation_pass_rate: s.aggregate.validation_pass_rate,
    mean_mission_duration_ms: s.aggregate.mean_mission_duration_ms,
    total_retry_count: s.aggregate.total_retry_count,
    total_timeout_count: s.aggregate.total_timeout_count,
  }));

  const first = args.history[0] ?? null;
  const last = args.history.at(-1) ?? null;
  const prior = args.history.length >= 2 ? args.history.at(-2)! : null;

  let provenDelta: number | "UNKNOWN" = "UNKNOWN";
  if (first && last) {
    const a = first.aggregate.safe_buyer_path_proven_count_current;
    const b = last.aggregate.safe_buyer_path_proven_count_current;
    if (typeof a === "number" && typeof b === "number") {
      provenDelta = b - a;
    }
  }

  const latestAgent = args.currentAggregate.agent_success_rate;
  const priorAgent = prior?.aggregate.agent_success_rate ?? "UNKNOWN";

  let interpretation =
    "PROVEN: Measurement mode — record snapshots over time with `npm run buckparts:operations-metrics -- --record-snapshot` to prove Foundation v2 throughput trends.";
  if (args.history.length >= 2 && typeof provenDelta === "number") {
    interpretation = `PROVEN: ${String(args.history.length)} snapshot(s) on disk — SAFE_BUYER_PATH_PROVEN delta since first snapshot: ${provenDelta >= 0 ? "+" : ""}${String(provenDelta)}. Compare agent_success_rate latest=${String(latestAgent)} vs prior=${String(priorAgent)} before adding new foundation capabilities.`;
  }

  return {
    snapshot_count: args.history.length,
    first_snapshot_at: first?.recorded_at ?? null,
    last_snapshot_at: last?.recorded_at ?? null,
    safe_buyer_path_proven_delta_since_first: provenDelta,
    queue_depth_series: points.map((p) => ({
      recorded_at: p.recorded_at,
      pending_count: p.queue_pending_count,
      stale_count: p.queue_stale_count,
    })),
    points,
    throughput_hypothesis: {
      foundation_v2_measurement_mode: true,
      agent_success_rate_latest: latestAgent,
      agent_success_rate_prior: priorAgent,
      validation_pass_rate_latest: args.currentAggregate.validation_pass_rate,
      proven_delta_since_first_snapshot: provenDelta,
      interpretation,
    },
  };
}

export function buildOperationsMetricsReportV1(args: {
  rootDir: string;
  now?: () => Date;
}): OperationsMetricsReportV1 {
  const now = args.now ?? (() => new Date());
  const runnerReports = listRunnerReportArtifactsV1(args.rootDir);
  const manifests = listAgentDispatchManifestsV1(args.rootDir);
  const dispatchSummaries = buildDispatchSummariesV1(args.rootDir, manifests);

  const missionRuns = runnerReports.map((report) =>
    buildMissionRunMetricsV1({
      rootDir: args.rootDir,
      report,
      manifests,
      now,
    }),
  );

  // Attribute proven delta between consecutive runs when census captured in artifact
  const byTime = missionRuns.slice().sort((a, b) => a.generated_at.localeCompare(b.generated_at));
  for (let i = 1; i < byTime.length; i += 1) {
    const prev = byTime[i - 1]!;
    const cur = byTime[i]!;
    if (
      typeof prev.safe_buyer_path_proven_at_run === "number" &&
      typeof cur.safe_buyer_path_proven_at_run === "number"
    ) {
      cur.safe_buyer_path_proven_delta = cur.safe_buyer_path_proven_at_run - prev.safe_buyer_path_proven_at_run;
    }
  }

  const rates = computeRates({ missionRuns, dispatchSummaries });
  const provenCurrent = loadCensusProvenCountV1(args.rootDir);
  const queue = buildOwnerDecisionQueueProjectionV1({ rootDir: args.rootDir, now });

  const aggregate: OperationsMetricsAggregateV1 = {
    mission_run_count: missionRuns.length,
    agent_dispatch_count: dispatchSummaries.length,
    total_retry_count: missionRuns.reduce((a, r) => a + r.retry_count, 0),
    total_timeout_count: missionRuns.reduce((a, r) => a + r.timeout_count, 0),
    total_owner_decision_count: missionRuns.reduce((a, r) => a + r.owner_decision_count, 0),
    safe_buyer_path_proven_count_current: provenCurrent,
    ...rates,
  };

  const history = loadOperationsMetricsHistoryV1(args.rootDir);
  const trend = buildTrendReportV1({
    history,
    currentAggregate: aggregate,
    queuePending: queue.pending_count,
    queueStale: queue.stale_count,
    missionRunCount: missionRuns.length,
    now,
  });

  const sourcePaths = [
    BUCKPARTS_RUNNER_RUNS_DIR_REL_V1,
    BUCKPARTS_RUNNER_CHECKPOINTS_DIR_REL_V1,
    "data/command-center/agent-dispatch/",
    "data/owner-decisions/queue/",
    BUCKPARTS_OPERATIONS_METRICS_HISTORY_REL_V1,
  ];

  const unknown_facts: string[] = [];
  if (missionRuns.length === 0) {
    unknown_facts.push("UNKNOWN: No runner mission artifacts — mission duration and validation metrics unavailable.");
  }
  if (dispatchSummaries.length === 0) {
    unknown_facts.push("UNKNOWN: No agent dispatch manifests — dispatch duration and agent success rate unavailable.");
  }
  if (history.length === 0) {
    unknown_facts.push(
      "UNKNOWN: No metrics history snapshots — queue depth over time and proven delta trends require --record-snapshot over multiple runs.",
    );
  }
  if (provenCurrent === "UNKNOWN") {
    unknown_facts.push("UNKNOWN: Census proven count unavailable at report time.");
  }

  let recommended = "PROVEN: Operations metrics v1 is read-only — record snapshots periodically to build throughput trends.";
  if (queue.pending_count > 0) {
    recommended = `PROVEN: ${String(queue.pending_count)} pending owner decision(s) — founder wait time is included in mission metrics; resolve queue to reduce founder_effort_units.`;
  } else if (typeof aggregate.agent_success_rate === "number" && aggregate.agent_success_rate < 1) {
    recommended = "PROVEN: Agent success rate below 1.0 — inspect dispatch_summaries validation_pass failures before expanding foundation scope.";
  }

  return {
    contract: BUCKPARTS_OPERATIONS_METRICS_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    recommended_jq_path: BUCKPARTS_OPERATIONS_METRICS_CC_JQ_PATH_V1,
    source_command: BUCKPARTS_OPERATIONS_METRICS_SOURCE_COMMAND_V1,
    generated_at: now().toISOString(),
    aggregate,
    mission_runs: missionRuns,
    dispatch_summaries: dispatchSummaries,
    trend,
    source_paths_read: sourcePaths,
    recommended_next_action: recommended,
    proven_facts: [
      "PROVEN: Operations metrics v1 measures the operating system only — no orchestration or automation added.",
      `PROVEN: Indexed ${String(missionRuns.length)} runner run(s), ${String(dispatchSummaries.length)} dispatch manifest(s), queue pending=${String(queue.pending_count)}.`,
      "PROVEN: Product truth (CSV/Supabase) is never mutated by this contract.",
    ],
    unknown_facts,
  };
}

export function refreshOperationsMetricsV1(args: {
  rootDir: string;
  recordSnapshot?: boolean;
  trigger_source?: string;
  now?: () => Date;
}): { report: OperationsMetricsReportV1; history_rel_path: string | null } {
  const report = buildOperationsMetricsReportV1(args);
  let historyRel: string | null = null;
  if (args.recordSnapshot) {
    const queue = buildOwnerDecisionQueueProjectionV1({ rootDir: args.rootDir, now: args.now });
    historyRel = appendOperationsMetricsSnapshotV1({
      rootDir: args.rootDir,
      report,
      trigger_source: args.trigger_source ?? BUCKPARTS_OPERATIONS_METRICS_SOURCE_COMMAND_V1,
      queue_pending_count: queue.pending_count,
      queue_stale_count: queue.stale_count,
      now: args.now,
    });
  }
  return { report, history_rel_path: historyRel };
}
