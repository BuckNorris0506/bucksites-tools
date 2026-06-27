import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
  BUCKPARTS_AGENT_DISPATCH_MANIFEST_CONTRACT_V1,
  BUCKPARTS_AGENT_RESULT_CONTRACT_V1,
  buildManifestIdV1,
  writeAgentDispatchManifestV1,
} from "./buckparts-agent-contract-v1";
import {
  PRODUCTION_MISSION_DISPATCH_INPUT_ARTIFACTS_V1,
} from "./buckparts-production-mission-constants-v1";
import {
  BUCKPARTS_PRODUCTION_MISSION_PLAN_CONTRACT_V1,
  browserProofResultRelPathV1,
  buildProductionMissionPlanSyncV1,
  finalizeProductionMissionRunV1,
  resolveProductionMissionTargetV1,
} from "./buckparts-production-mission-v1";
import { buildProductionMissionCommandCenterLaneV1 } from "./buckparts-production-mission-command-center-v1";
import {
  BUCKPARTS_RUNNER_CONTRACT_V1,
  BUCKPARTS_RUNNER_MISSIONS_V1,
  runBuckpartsRunnerV1,
  validateMissionDefinitionV1,
  type RunnerSpawnFnV1,
} from "./buckparts-runner-v1";

test("production_mission_v1 mission definition validates", () => {
  const errors = validateMissionDefinitionV1(BUCKPARTS_RUNNER_MISSIONS_V1.production_mission_v1);
  assert.equal(errors.length, 0, errors.join("; "));
  assert.equal(
    BUCKPARTS_RUNNER_MISSIONS_V1.production_mission_v1.steps.find((s) => s.step_id === "external_agent_dispatch")
      ?.kind,
    "agent_dispatch",
  );
});

test("resolveProductionMissionTargetV1 prefers slug with browser proof result", () => {
  const rootDir = mkdtempSync(path.join(tmpdir(), "prod-mission-target-"));
  try {
    const proofRel = browserProofResultRelPathV1("edr4rxd1");
    mkdirSync(path.dirname(path.join(rootDir, proofRel)), { recursive: true });
    writeFileSync(path.join(rootDir, proofRel), "{}\n", "utf8");

    const target = resolveProductionMissionTargetV1({
      rootDir,
      sprint: {
        winning_batch: {
          rank: 1,
          batch_id: "fridge_safe_link_first4_deblocked",
          batch_label: "test",
          target_slugs: ["4396508", "edr4rxd1"],
          slug_count: 2,
          expected_safe_buyer_path_proven_delta: 2,
          executability: "EXECUTABLE_AFTER_APPROVAL",
          infrastructure_reused: [],
          founder_approval_required: true,
          dry_run_commands: [],
          write_commands: [],
          blockers: [],
          customer_impact: "test",
        },
      } as import("./coverage-production-sprint-v2").CoverageProductionSprintV2ReportV1,
    });

    assert.equal(target.primary_apply_slug, "edr4rxd1");
    assert.ok(target.expected_agent_output_artifact_rel_paths.includes(proofRel));
  } finally {
    rmSync(rootDir, { recursive: true, force: true });
  }
});

test("buildProductionMissionPlanSyncV1 emits plan contract", () => {
  const rootDir = process.cwd();
  const plan = buildProductionMissionPlanSyncV1({ rootDir });
  assert.equal(plan.contract, BUCKPARTS_PRODUCTION_MISSION_PLAN_CONTRACT_V1);
  assert.equal(plan.runner_mission_id, "production_mission_v1");
  assert.ok(plan.target.primary_apply_slug.length > 0);
  assert.ok(plan.target.dispatch_input_artifact_rel_paths.length >= 2);
});

test("finalizeProductionMissionRunV1 writes lifecycle and metrics history", () => {
  const rootDir = mkdtempSync(path.join(tmpdir(), "prod-mission-finalize-"));
  const now = () => new Date("2026-06-27T12:00:00.000Z");
  try {
    for (const rel of PRODUCTION_MISSION_DISPATCH_INPUT_ARTIFACTS_V1) {
      mkdirSync(path.dirname(path.join(rootDir, rel)), { recursive: true });
      writeFileSync(path.join(rootDir, rel), "{}\n", "utf8");
    }

    const runnerReport = {
      contract: BUCKPARTS_RUNNER_CONTRACT_V1,
      read_only: true as const,
      data_mutation: false as const,
      mutation_authorized: false as const,
      recommended_jq_path: ".command_center_v2.buckparts_runner_v1" as const,
      source_command: "npm run buckparts:runner" as const,
      generated_at: now().toISOString(),
      run_id: "prod-mission-test-run",
      mission_id: "production_mission_v1" as const,
      mission_title: "Production Mission",
      resumed_from_checkpoint: false,
      overall_status: "HALTED_APPROVAL_REQUIRED" as const,
      layer_truth: {},
      steps: [
        {
          step_id: "external_agent_dispatch",
          title: "dispatch",
          kind: "agent_dispatch" as const,
          status: "PASS" as const,
          exit_code: 0,
          duration_ms: 1,
          command_display: "",
          stdout_excerpt: "",
          stderr_excerpt: "",
          parsed_json_summary: null,
          halt_reason: null,
          halt_detail: null,
          agent_dispatch_manifest_rel_path:
            "data/command-center/agent-dispatch/manifests/prod-mission-test-run/external_agent_dispatch.json",
        },
        {
          step_id: "guarded_apply_primary",
          title: "guarded apply",
          kind: "tsx_report" as const,
          status: "HALTED" as const,
          exit_code: 0,
          duration_ms: 1,
          command_display: "",
          stdout_excerpt: "",
          stderr_excerpt: "",
          parsed_json_summary: { mutation_authorized: false },
          halt_reason: "FOUNDER_APPROVAL_REQUIRED" as const,
          halt_detail: "blocked",
        },
      ],
      completed_step_ids: [],
      pending_step_ids: [],
      halt_reason: "FOUNDER_APPROVAL_REQUIRED" as const,
      halt_step_id: "guarded_apply_primary",
      halt_detail: null,
      owner_decision_request_id: null,
      owner_decision_request_artifact_path: null,
      validation_summary: {
        lint_pass: true,
        build_pass: true,
        tests_pass: true,
        deploy_classifier_ran: true,
        security_gate_ran: true,
      },
      artifact_rel_path: "data/command-center/runner-runs/test.json",
      checkpoint_rel_path: "data/command-center/runner-checkpoints/test.json",
      recommended_next_action: "test",
      resume_command: null,
      proven_facts: [],
      inferred_facts: [],
      unknown_facts: [],
    };

    const manifestId = buildManifestIdV1({
      runId: "prod-mission-test-run",
      stepId: "external_agent_dispatch",
      attemptNumber: 1,
    });
    writeAgentDispatchManifestV1(rootDir, {
      contract: BUCKPARTS_AGENT_DISPATCH_MANIFEST_CONTRACT_V1,
      manifest_id: manifestId,
      dispatch_id: "dispatch-test",
      run_id: "prod-mission-test-run",
      mission_id: "production_mission_v1",
      step_id: "external_agent_dispatch",
      created_at: now().toISOString(),
      updated_at: now().toISOString(),
      status: "VALIDATION_PASS",
      template_id: "read_only_evidence_collection_v1",
      execution_surface: "EXTERNAL_OPERATOR",
      objective_class: "READ_ONLY_EVIDENCE_COLLECTION",
      objective_summary: "test",
      input_artifact_rel_paths: [...PRODUCTION_MISSION_DISPATCH_INPUT_ARTIFACTS_V1],
      result_artifact_rel_path: `data/command-center/agent-dispatch/results/${manifestId}.json`,
      expected_result_contract: BUCKPARTS_AGENT_RESULT_CONTRACT_V1,
      validation_contract: "buckparts_agent_result_validation_v1",
      timeout_at: "2026-06-28T12:00:00.000Z",
      retry_policy: {
        max_attempts: 3,
        attempt_number: 1,
        retry_after_validation_fail: true,
        retry_after_timeout: true,
      },
      ownership_boundaries: {
        runner_may_write: [],
        external_operator_may_write: [],
        founder_required_for: [],
        runner_must_not: [],
      },
      prohibited_actions: [],
      read_only: true,
      data_mutation: false,
      mutation_authorized: false,
      proven_facts: [],
      unknown_facts: [],
    });

    const proofRel = browserProofResultRelPathV1("edr4rxd1");
    mkdirSync(path.dirname(path.join(rootDir, proofRel)), { recursive: true });
    writeFileSync(path.join(rootDir, proofRel), "{}\n", "utf8");
    mkdirSync(path.dirname(path.join(rootDir, `data/command-center/agent-dispatch/results/${manifestId}.json`)), {
      recursive: true,
    });
    writeFileSync(
      path.join(rootDir, `data/command-center/agent-dispatch/results/${manifestId}.json`),
      `${JSON.stringify({
        contract: BUCKPARTS_AGENT_RESULT_CONTRACT_V1,
        manifest_id: manifestId,
        dispatch_id: "dispatch-test",
        result_id: "r1",
        submitted_at: now().toISOString(),
        submitted_by_surface: "EXTERNAL_OPERATOR",
        completion_status: "COMPLETE",
        validation_status: "PENDING",
        output_artifact_rel_paths: [proofRel],
        structured_summary: {},
        proven_facts: [],
        unknown_facts: [],
        mutation_authorized: false,
        truth_closure_claimed: false,
        csv_apply_authorized: false,
        evidence_write_authorized: false,
      })}\n`,
      "utf8",
    );

    const first4Rel =
      "data/fridge/batch-production/drafts/fridge-safe-link-rescue-first4-apply-review-v1.json";
    writeFileSync(
      path.join(rootDir, first4Rel),
      `${JSON.stringify({
        rows: [{ slug: "edr4rxd1", owner_apply_review_ready: true, asin: "B00UB38V2A" }],
      })}\n`,
      "utf8",
    );

    const result = finalizeProductionMissionRunV1({
      rootDir,
      runnerReport: runnerReport as import("./buckparts-runner-v1").BuckpartsRunnerReportV1,
      now,
    });

    assert.ok(result.lifecycle_rel_path.includes("production-missions"));
    assert.ok(existsSync(path.join(rootDir, result.lifecycle_rel_path)));
    const lifecycle = JSON.parse(
      readFileSync(path.join(rootDir, result.lifecycle_rel_path), "utf8"),
    ) as { lifecycle_complete: boolean; phases: { phase_id: string }[] };
    assert.ok(lifecycle.phases.some((p) => p.phase_id === "guarded_apply_primary"));
    assert.ok(result.metrics_history_rel_path);
  } finally {
    rmSync(rootDir, { recursive: true, force: true });
  }
});

test("production mission runner halts at agent dispatch without result", () => {
  const rootDir = mkdtempSync(path.join(tmpdir(), "prod-mission-runner-"));
  const spawnFn: RunnerSpawnFnV1 = (command) => {
    const display = command.join(" ");
    if (display.includes("lint") || display.includes("build")) {
      return { exit_code: 0, stdout: "ok", stderr: "" };
    }
    if (display.includes("--test")) {
      return { exit_code: 0, stdout: "", stderr: "" };
    }
    if (display.includes("deploy-classifier") || display.includes("security-gate")) {
      return {
        exit_code: 0,
        stdout: JSON.stringify({ aggregate_classification: "NO_DEPLOY_NEEDED" }),
        stderr: "",
      };
    }
    return {
      exit_code: 0,
      stdout: JSON.stringify({
        contract: "coverage_production_sprint_v2_v1",
        winning_batch: { batch_id: "test", target_slugs: ["edr4rxd1"] },
        classification_counts: { SAFE_BUYER_PATH_PROVEN: 48 },
        mutation_authorized: false,
      }),
      stderr: "",
    };
  };

  try {
    for (const rel of PRODUCTION_MISSION_DISPATCH_INPUT_ARTIFACTS_V1) {
      mkdirSync(path.dirname(path.join(rootDir, rel)), { recursive: true });
      writeFileSync(path.join(rootDir, rel), "{}\n", "utf8");
    }

    const report = runBuckpartsRunnerV1({
      rootDir,
      missionId: "production_mission_v1",
      runId: "prod-mission-halt-test",
      spawnFn,
      writeArtifacts: true,
      now: () => new Date("2026-06-27T12:00:00.000Z"),
    });

    assert.equal(report.mission_id, "production_mission_v1");
    assert.equal(report.overall_status, "HALTED_EXTERNAL_AGENT");
    assert.ok(report.production_mission_lifecycle_artifact_path);
    assert.equal(report.operations_metrics_snapshot_recorded, true);
  } finally {
    rmSync(rootDir, { recursive: true, force: true });
  }
});

test("production mission command center lane smoke", () => {
  const lane = buildProductionMissionCommandCenterLaneV1({ rootDir: process.cwd() });
  assert.equal(lane.contract, "production_mission_v1");
  assert.equal(lane.read_only, true);
});
