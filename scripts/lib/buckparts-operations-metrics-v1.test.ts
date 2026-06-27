import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
  BUCKPARTS_OPERATIONS_METRICS_CONTRACT_V1,
  BUCKPARTS_OPERATIONS_METRICS_HISTORY_REL_V1,
  appendOperationsMetricsSnapshotV1,
  buildOperationsMetricsReportV1,
  listRunnerReportArtifactsV1,
  loadOperationsMetricsHistoryV1,
  refreshOperationsMetricsV1,
} from "./buckparts-operations-metrics-v1";
import { buildOperationsMetricsCommandCenterLaneV1 } from "./buckparts-operations-metrics-command-center-v1";
import { BUCKPARTS_RUNNER_RUNS_DIR_REL_V1 } from "./buckparts-runner-v1";

function writeRunnerArtifact(rootDir: string, report: Record<string, unknown>): string {
  const rel = `${BUCKPARTS_RUNNER_RUNS_DIR_REL_V1}/buckparts-runner-${String(report.mission_id)}-${String(report.run_id)}.json`;
  const abs = path.join(rootDir, rel);
  mkdirSync(path.dirname(abs), { recursive: true });
  writeFileSync(abs, `${JSON.stringify({ ...report, artifact_rel_path: rel }, null, 2)}\n`, "utf8");
  return rel;
}

test("listRunnerReportArtifactsV1 reads buckparts_runner_v1 artifacts", () => {
  const rootDir = mkdtempSync(path.join(tmpdir(), "ops-metrics-list-"));
  try {
    writeRunnerArtifact(rootDir, {
      contract: "buckparts_runner_v1",
      run_id: "run-a",
      mission_id: "coverage_sprint_v1",
      generated_at: "2026-06-27T10:00:00.000Z",
      overall_status: "COMPLETE",
      resumed_from_checkpoint: false,
      steps: [],
    });
    const reports = listRunnerReportArtifactsV1(rootDir);
    assert.equal(reports.length, 1);
    assert.equal(reports[0]!.run_id, "run-a");
  } finally {
    rmSync(rootDir, { recursive: true, force: true });
  }
});

test("buildOperationsMetricsReportV1 computes mission and validation duration", () => {
  const rootDir = mkdtempSync(path.join(tmpdir(), "ops-metrics-dur-"));
  const now = () => new Date("2026-06-27T12:00:00.000Z");
  try {
    writeRunnerArtifact(rootDir, {
      contract: "buckparts_runner_v1",
      run_id: "run-dur",
      mission_id: "coverage_sprint_v1",
      mission_title: "Coverage Sprint",
      generated_at: "2026-06-27T11:00:00.000Z",
      overall_status: "COMPLETE",
      resumed_from_checkpoint: false,
      steps: [
        {
          step_id: "safe_buyer_path_census",
          kind: "tsx_report",
          status: "PASS",
          duration_ms: 5000,
          parsed_json_summary: {
            classification_counts: { SAFE_BUYER_PATH_PROVEN: 48 },
          },
        },
        {
          step_id: "validation_lint",
          kind: "npm_run",
          status: "PASS",
          duration_ms: 2000,
        },
        {
          step_id: "validation_build",
          kind: "npm_run",
          status: "PASS",
          duration_ms: 3000,
        },
      ],
    });

    const report = buildOperationsMetricsReportV1({ rootDir, now });
    assert.equal(report.contract, BUCKPARTS_OPERATIONS_METRICS_CONTRACT_V1);
    assert.equal(report.read_only, true);
    assert.equal(report.mutation_authorized, false);
    assert.equal(report.mission_runs.length, 1);
    const run = report.mission_runs[0]!;
    assert.equal(run.mission_duration_ms, 10000);
    assert.equal(run.validation_duration_ms, 5000);
    assert.equal(run.safe_buyer_path_proven_at_run, 48);
    assert.equal(run.validation_steps_passed, 2);
    assert.equal(report.aggregate.mission_run_count, 1);
  } finally {
    rmSync(rootDir, { recursive: true, force: true });
  }
});

test("appendOperationsMetricsSnapshotV1 records history for trend reporting", () => {
  const rootDir = mkdtempSync(path.join(tmpdir(), "ops-metrics-hist-"));
  const now = () => new Date("2026-06-27T12:00:00.000Z");
  try {
    const report = buildOperationsMetricsReportV1({ rootDir, now });
    appendOperationsMetricsSnapshotV1({
      rootDir,
      report,
      trigger_source: "test",
      queue_pending_count: 0,
      queue_stale_count: 0,
      now,
    });
    const history = loadOperationsMetricsHistoryV1(rootDir);
    assert.equal(history.length, 1);
    assert.equal(history[0]!.contract, "buckparts_operations_metrics_snapshot_v1");
    assert.ok(existsSync(path.join(rootDir, BUCKPARTS_OPERATIONS_METRICS_HISTORY_REL_V1)));

    const report2 = buildOperationsMetricsReportV1({ rootDir, now });
    assert.equal(report2.trend.snapshot_count, 1);
    assert.equal(report2.trend.first_snapshot_at, "2026-06-27T12:00:00.000Z");
  } finally {
    rmSync(rootDir, { recursive: true, force: true });
  }
});

test("refreshOperationsMetricsV1 --record-snapshot appends history line", () => {
  const rootDir = mkdtempSync(path.join(tmpdir(), "ops-metrics-refresh-"));
  try {
    const { report, history_rel_path } = refreshOperationsMetricsV1({
      rootDir,
      recordSnapshot: true,
      trigger_source: "test-record",
    });
    assert.equal(report.contract, BUCKPARTS_OPERATIONS_METRICS_CONTRACT_V1);
    assert.equal(history_rel_path, BUCKPARTS_OPERATIONS_METRICS_HISTORY_REL_V1);
    const content = readFileSync(path.join(rootDir, BUCKPARTS_OPERATIONS_METRICS_HISTORY_REL_V1), "utf8");
    assert.ok(content.includes("buckparts_operations_metrics_snapshot_v1"));
  } finally {
    rmSync(rootDir, { recursive: true, force: true });
  }
});

test("operations metrics command center lane smoke", () => {
  const lane = buildOperationsMetricsCommandCenterLaneV1({ rootDir: process.cwd() });
  assert.equal(lane.contract, "operations_metrics_v1");
  assert.equal(lane.read_only, true);
  assert.ok(lane.trend.throughput_hypothesis.foundation_v2_measurement_mode);
});

test("proven delta between mission runs when census captured", () => {
  const rootDir = mkdtempSync(path.join(tmpdir(), "ops-metrics-delta-"));
  try {
    writeRunnerArtifact(rootDir, {
      contract: "buckparts_runner_v1",
      run_id: "run-1",
      mission_id: "coverage_sprint_v1",
      generated_at: "2026-06-27T09:00:00.000Z",
      overall_status: "COMPLETE",
      resumed_from_checkpoint: false,
      steps: [
        {
          step_id: "safe_buyer_path_census",
          kind: "tsx_report",
          status: "PASS",
          duration_ms: 100,
          parsed_json_summary: { classification_counts: { SAFE_BUYER_PATH_PROVEN: 47 } },
        },
      ],
    });
    writeRunnerArtifact(rootDir, {
      contract: "buckparts_runner_v1",
      run_id: "run-2",
      mission_id: "coverage_sprint_v1",
      generated_at: "2026-06-27T10:00:00.000Z",
      overall_status: "COMPLETE",
      resumed_from_checkpoint: false,
      steps: [
        {
          step_id: "safe_buyer_path_census",
          kind: "tsx_report",
          status: "PASS",
          duration_ms: 100,
          parsed_json_summary: { classification_counts: { SAFE_BUYER_PATH_PROVEN: 48 } },
        },
      ],
    });

    const report = buildOperationsMetricsReportV1({ rootDir });
    const run2 = report.mission_runs.find((r) => r.run_id === "run-2");
    assert.equal(run2?.safe_buyer_path_proven_delta, 1);
  } finally {
    rmSync(rootDir, { recursive: true, force: true });
  }
});
