import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
  BUCKPARTS_RUNNER_CONTRACT_V1,
  BUCKPARTS_RUNNER_MISSIONS_V1,
  buildResumeCommandV1,
  commandDisplayV1,
  evaluateStepHaltV1,
  exitCodeForRunnerReportV1,
  getBuckpartsRunnerMissionV1,
  listBuckpartsRunnerMissionIdsV1,
  runBuckpartsRunnerV1,
  validateMissionDefinitionV1,
  validateRunnerStepCommandV1,
  type RunnerSpawnFnV1,
} from "./buckparts-runner-v1";

test("all mission definitions validate", () => {
  for (const id of listBuckpartsRunnerMissionIdsV1()) {
    const mission = getBuckpartsRunnerMissionV1(id)!;
    const errors = validateMissionDefinitionV1(mission);
    assert.equal(errors.length, 0, `${id}: ${errors.join("; ")}`);
  }
});

test("rejects forbidden mutation argv patterns", () => {
  const step = BUCKPARTS_RUNNER_MISSIONS_V1.coverage_sprint_v1.steps[0]!;
  const bad = {
    ...step,
    command: ["node", "--import", "tsx", "scripts/report-x.ts", "--write-csv"],
  };
  const errors = validateRunnerStepCommandV1(bad);
  assert.ok(errors.some((e) => e.includes("--write-csv")));
});

test("evaluateStepHaltV1 halts on supabase csv parity gap", () => {
  const step = BUCKPARTS_RUNNER_MISSIONS_V1.coverage_sprint_v1.steps.find(
    (s) => s.step_id === "fridge_supabase_csv_diff",
  )!;
  const halt = evaluateStepHaltV1({
    step,
    parsed_json: {
      mutation_authorized: false,
      supabase_has_win_csv_missing_count: 4,
    },
    exit_code: 0,
  });
  assert.equal(halt.halt, true);
  assert.equal(halt.reason, "FOUNDER_APPROVAL_REQUIRED");
});

test("evaluateStepHaltV1 halts on readiness gate blocked executor", () => {
  const step = BUCKPARTS_RUNNER_MISSIONS_V1.coverage_sprint_v1.steps.find(
    (s) => s.step_id === "lifecycle_guarded_apply_dry_run",
  )!;
  const halt = evaluateStepHaltV1({
    step,
    parsed_json: {
      mutation_authorized: false,
      apply_executor_ready: false,
      executor_status: "BLOCKED",
      owner_approval_required: true,
    },
    exit_code: 0,
  });
  assert.equal(halt.halt, true);
  assert.equal(halt.reason, "MUTATION_GATE_BLOCKED");
});

test("runBuckpartsRunnerV1 continues validation after analysis halt", () => {
  let spawnCalls = 0;
  const spawnFn: RunnerSpawnFnV1 = (command) => {
    spawnCalls += 1;
    const display = commandDisplayV1(command);
    if (display.includes("fridge-supabase-vs-csv")) {
      return {
        exit_code: 0,
        stdout: JSON.stringify({
          mutation_authorized: false,
          supabase_has_win_csv_missing_count: 2,
        }),
        stderr: "",
      };
    }
    if (display.includes("lint") || display.includes("build")) {
      return { exit_code: 0, stdout: "ok", stderr: "" };
    }
    if (display.includes("--test")) {
      return { exit_code: 0, stdout: "", stderr: "" };
    }
    if (display.includes("deploy-classifier") || display.includes("security-gate")) {
      return {
        exit_code: 0,
        stdout: JSON.stringify({ aggregate_classification: "DEPLOY_OPTIONAL" }),
        stderr: "",
      };
    }
    return {
      exit_code: 0,
      stdout: JSON.stringify({ runtime_status: "PROVEN" }),
      stderr: "",
    };
  };

  const rootDir = mkdtempSync(path.join(tmpdir(), "runner-v1-test-"));
  try {
    const report = runBuckpartsRunnerV1({
      rootDir,
      missionId: "coverage_sprint_v1",
      runId: "test-run-coverage-halt",
      spawnFn,
      writeArtifacts: false,
      now: () => new Date("2026-06-27T12:00:00.000Z"),
    });

    assert.equal(report.contract, BUCKPARTS_RUNNER_CONTRACT_V1);
    assert.equal(report.overall_status, "HALTED_APPROVAL_REQUIRED");
    assert.ok(spawnCalls >= 6);
    assert.equal(report.validation_summary.lint_pass, true);
    assert.equal(report.validation_summary.build_pass, true);
    assert.equal(exitCodeForRunnerReportV1(report), 0);
  } finally {
    rmSync(rootDir, { recursive: true, force: true });
  }
});

test("resume command format", () => {
  assert.match(
    buildResumeCommandV1("coverage_sprint_v1", "abc-123"),
    /--mission coverage_sprint_v1 --resume abc-123/,
  );
});

test("evidence sprint halts at external agent dispatch pending result", () => {
  const spawnFn: RunnerSpawnFnV1 = () => ({
    exit_code: 0,
    stdout: JSON.stringify({ runtime_status: "PROVEN" }),
    stderr: "",
  });

  const rootDir = mkdtempSync(path.join(tmpdir(), "runner-evidence-dispatch-"));
  try {
    const inputRel =
      "data/air-purifier/batch-production/run-registry/ap-demand-selected-batch-run-v1-2026-06-23.json";
    mkdirSync(path.dirname(path.join(rootDir, inputRel)), { recursive: true });
    writeFileSync(path.join(rootDir, inputRel), "{}\n", "utf8");

    const report = runBuckpartsRunnerV1({
      rootDir,
      missionId: "evidence_sprint_v1",
      runId: "test-evidence-dispatch-halt",
      spawnFn,
      writeArtifacts: true,
      now: () => new Date("2026-06-27T12:00:00.000Z"),
    });

    assert.equal(report.overall_status, "HALTED_EXTERNAL_AGENT");
    assert.equal(report.halt_step_id, "external_agent_dispatch");
  } finally {
    rmSync(rootDir, { recursive: true, force: true });
  }
});

test("failed validation step yields FAILED overall status", () => {
  const spawnFn: RunnerSpawnFnV1 = (command) => {
    const display = commandDisplayV1(command);
    if (display.includes("lint")) {
      return { exit_code: 1, stdout: "", stderr: "lint failed" };
    }
    return { exit_code: 0, stdout: "{}", stderr: "" };
  };

  const report = runBuckpartsRunnerV1({
    rootDir: process.cwd(),
    missionId: "safe_link_sprint_v1",
    runId: "test-fail-lint",
    spawnFn,
    writeArtifacts: false,
  });

  assert.equal(report.overall_status, "FAILED");
  assert.equal(exitCodeForRunnerReportV1(report), 1);
});
