import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
  BUCKPARTS_AGENT_DISPATCH_MANIFEST_CONTRACT_V1,
  BUCKPARTS_AGENT_RESULT_CONTRACT_V1,
  buildAgentContractProjectionV1,
  buildAgentDispatchManifestV1,
  executeAgentDispatchStepV1,
  validateAgentDispatchStepConfigV1,
  validateAgentResultAgainstManifestV1,
  writeAgentDispatchManifestV1,
  type AgentDispatchStepConfigV1,
} from "./buckparts-agent-contract-v1";
import { buildAgentContractCommandCenterLaneV1 } from "./buckparts-agent-contract-command-center-v1";
import {
  BUCKPARTS_RUNNER_MISSIONS_V1,
  runBuckpartsRunnerV1,
  validateMissionDefinitionV1,
  type RunnerSpawnFnV1,
} from "./buckparts-runner-v1";

const BASE_CONFIG: AgentDispatchStepConfigV1 = {
  template_id: "read_only_evidence_collection_v1",
  input_artifact_rel_paths: ["data/air-purifier/batch-production/run-registry/ap-demand-selected-batch-run-v1-2026-06-23.json"],
  objective_summary: "Collect read-only evidence for demand-selected batch.",
};

test("validateAgentDispatchStepConfigV1 rejects vendor tokens in objective", () => {
  const errors = validateAgentDispatchStepConfigV1({
    ...BASE_CONFIG,
    objective_summary: "Run HyperAgent discovery for batch.",
  });
  assert.ok(errors.some((e) => e.includes("vendor token")));
});

test("buildAgentDispatchManifestV1 emits dispatch manifest contract", () => {
  const manifest = buildAgentDispatchManifestV1({
    runId: "run-1",
    missionId: "evidence_sprint_v1",
    stepId: "external_agent_dispatch",
    config: BASE_CONFIG,
    attemptNumber: 1,
    now: () => new Date("2026-06-27T12:00:00.000Z"),
  });
  assert.equal(manifest.contract, BUCKPARTS_AGENT_DISPATCH_MANIFEST_CONTRACT_V1);
  assert.equal(manifest.mutation_authorized, false);
  assert.equal(manifest.retry_policy.max_attempts, 3);
  assert.ok(manifest.result_artifact_rel_path.startsWith("data/command-center/agent-dispatch/results/"));
});

test("executeAgentDispatchStepV1 halts when result artifact missing", () => {
  const rootDir = mkdtempSync(path.join(tmpdir(), "agent-contract-halt-"));
  try {
    const inputRel = BASE_CONFIG.input_artifact_rel_paths[0]!;
    mkdirSync(path.dirname(path.join(rootDir, inputRel)), { recursive: true });
    writeFileSync(path.join(rootDir, inputRel), "{}\n", "utf8");

    const outcome = executeAgentDispatchStepV1({
      rootDir,
      runId: "run-halt",
      missionId: "evidence_sprint_v1",
      stepId: "external_agent_dispatch",
      stepTitle: "External agent dispatch",
      config: BASE_CONFIG,
      writeArtifacts: true,
      now: () => new Date("2026-06-27T12:00:00.000Z"),
    });

    assert.equal(outcome.runner_status, "HALTED");
    assert.equal(outcome.halt_reason, "EXTERNAL_AGENT_REQUIRED");
    assert.ok(existsSync(path.join(rootDir, outcome.manifest_rel_path)));
  } finally {
    rmSync(rootDir, { recursive: true, force: true });
  }
});

test("executeAgentDispatchStepV1 passes when valid result artifact present", () => {
  const rootDir = mkdtempSync(path.join(tmpdir(), "agent-contract-pass-"));
  const now = () => new Date("2026-06-27T12:00:00.000Z");
  try {
    const inputRel = BASE_CONFIG.input_artifact_rel_paths[0]!;
    const inputAbs = path.join(rootDir, inputRel);
    mkdirSync(path.dirname(inputAbs), { recursive: true });
    writeFileSync(inputAbs, "{}\n", "utf8");

    const outputRel = "data/tmp/agent-contract-test-output.json";
    mkdirSync(path.dirname(path.join(rootDir, outputRel)), { recursive: true });
    writeFileSync(path.join(rootDir, outputRel), "{}\n", "utf8");

    const manifest = buildAgentDispatchManifestV1({
      runId: "run-pass",
      missionId: "evidence_sprint_v1",
      stepId: "external_agent_dispatch",
      config: BASE_CONFIG,
      attemptNumber: 1,
      now,
    });
    writeAgentDispatchManifestV1(rootDir, manifest);

    mkdirSync(path.dirname(path.join(rootDir, manifest.result_artifact_rel_path)), {
      recursive: true,
    });
    const result = {
      contract: BUCKPARTS_AGENT_RESULT_CONTRACT_V1,
      manifest_id: manifest.manifest_id,
      dispatch_id: manifest.dispatch_id,
      result_id: "result-1",
      submitted_at: now().toISOString(),
      submitted_by_surface: "EXTERNAL_OPERATOR",
      completion_status: "COMPLETE",
      validation_status: "PENDING",
      output_artifact_rel_paths: [outputRel],
      structured_summary: { note: "read-only evidence collected" },
      proven_facts: ["PROVEN: Evidence files written read-only."],
      unknown_facts: [],
      mutation_authorized: false,
      truth_closure_claimed: false,
      csv_apply_authorized: false,
      evidence_write_authorized: false,
    };
    writeFileSync(
      path.join(rootDir, manifest.result_artifact_rel_path),
      `${JSON.stringify(result, null, 2)}\n`,
      "utf8",
    );

    const outcome = executeAgentDispatchStepV1({
      rootDir,
      runId: "run-pass",
      missionId: "evidence_sprint_v1",
      stepId: "external_agent_dispatch",
      stepTitle: "External agent dispatch",
      config: BASE_CONFIG,
      writeArtifacts: true,
      now,
    });

    assert.equal(outcome.runner_status, "PASS");
    assert.equal(outcome.validation?.validation_pass, true);
  } finally {
    rmSync(rootDir, { recursive: true, force: true });
  }
});

test("validateAgentResultAgainstManifestV1 rejects mutation_authorized true", () => {
  const now = () => new Date("2026-06-27T12:00:00.000Z");
  const manifest = buildAgentDispatchManifestV1({
    runId: "run-fail",
    missionId: "evidence_sprint_v1",
    stepId: "external_agent_dispatch",
    config: BASE_CONFIG,
    attemptNumber: 1,
    now,
  });
  const validation = validateAgentResultAgainstManifestV1({
    manifest,
    result: {
      contract: BUCKPARTS_AGENT_RESULT_CONTRACT_V1,
      manifest_id: manifest.manifest_id,
      dispatch_id: manifest.dispatch_id,
      result_id: "bad",
      submitted_at: now().toISOString(),
      submitted_by_surface: "EXTERNAL_OPERATOR",
      completion_status: "COMPLETE",
      validation_status: "PENDING",
      output_artifact_rel_paths: [],
      structured_summary: {},
      proven_facts: [],
      unknown_facts: [],
      mutation_authorized: true,
      truth_closure_claimed: false,
    } as unknown as import("./buckparts-agent-contract-v1").BuckpartsAgentResultV1,
    rootDir: process.cwd(),
    now,
  });
  assert.equal(validation.validation_pass, false);
  assert.ok(validation.validation_errors.some((e) => e.includes("mutation_authorized")));
});

test("evidence sprint mission validates with agent_dispatch step", () => {
  const errors = validateMissionDefinitionV1(BUCKPARTS_RUNNER_MISSIONS_V1.evidence_sprint_v1);
  assert.equal(errors.length, 0);
  const dispatchStep = BUCKPARTS_RUNNER_MISSIONS_V1.evidence_sprint_v1.steps.find(
    (s) => s.step_id === "external_agent_dispatch",
  );
  assert.equal(dispatchStep?.kind, "agent_dispatch");
});

test("evidence sprint halts at external agent dispatch pending result", () => {
  const spawnFn: RunnerSpawnFnV1 = () => ({
    exit_code: 0,
    stdout: JSON.stringify({ runtime_status: "PROVEN" }),
    stderr: "",
  });

  const rootDir = mkdtempSync(path.join(tmpdir(), "runner-evidence-dispatch-"));
  try {
    const inputRel = BASE_CONFIG.input_artifact_rel_paths[0]!;
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
    assert.ok(report.steps.some((s) => s.agent_dispatch_manifest_rel_path));
  } finally {
    rmSync(rootDir, { recursive: true, force: true });
  }
});

test("agent contract command center lane smoke", () => {
  const lane = buildAgentContractCommandCenterLaneV1({ rootDir: process.cwd() });
  assert.equal(lane.contract, "agent_contract_v1");
  assert.equal(lane.read_only, true);
  assert.equal(lane.mutation_authorized, false);
});

test("buildAgentContractProjectionV1 reads manifests from disk", () => {
  const rootDir = mkdtempSync(path.join(tmpdir(), "agent-contract-proj-"));
  const now = () => new Date("2026-06-27T12:00:00.000Z");
  try {
    const manifest = buildAgentDispatchManifestV1({
      runId: "run-proj",
      missionId: "evidence_sprint_v1",
      stepId: "external_agent_dispatch",
      config: BASE_CONFIG,
      attemptNumber: 1,
      now,
    });
    manifest.status = "RESULT_PENDING";
    writeAgentDispatchManifestV1(rootDir, manifest);

    const projection = buildAgentContractProjectionV1({ rootDir, now });
    assert.equal(projection.manifest_count, 1);
    assert.equal(projection.pending_result_count, 1);
  } finally {
    rmSync(rootDir, { recursive: true, force: true });
  }
});

test("timeout triggers retry manifest when attempts remain", () => {
  const rootDir = mkdtempSync(path.join(tmpdir(), "agent-contract-timeout-"));
  try {
    const inputRel = BASE_CONFIG.input_artifact_rel_paths[0]!;
    mkdirSync(path.dirname(path.join(rootDir, inputRel)), { recursive: true });
    writeFileSync(path.join(rootDir, inputRel), "{}\n", "utf8");

    const shortTimeoutConfig: AgentDispatchStepConfigV1 = {
      ...BASE_CONFIG,
      timeout_ms: 1,
      max_attempts: 2,
    };

    const manifest = buildAgentDispatchManifestV1({
      runId: "run-timeout",
      missionId: "evidence_sprint_v1",
      stepId: "external_agent_dispatch",
      config: shortTimeoutConfig,
      attemptNumber: 1,
      now: () => new Date("2026-06-27T10:00:00.000Z"),
    });
    manifest.status = "RESULT_PENDING";
    writeAgentDispatchManifestV1(rootDir, manifest);

    const outcome = executeAgentDispatchStepV1({
      rootDir,
      runId: "run-timeout",
      missionId: "evidence_sprint_v1",
      stepId: "external_agent_dispatch",
      stepTitle: "External agent dispatch",
      config: shortTimeoutConfig,
      writeArtifacts: true,
      now: () => new Date("2026-06-27T12:00:00.000Z"),
    });

    assert.equal(outcome.runner_status, "HALTED");
    assert.equal(outcome.manifest.retry_policy.attempt_number, 2);
    const onDisk = readFileSync(path.join(rootDir, outcome.manifest_rel_path), "utf8");
    assert.ok(onDisk.includes('"attempt_number": 2'));
  } finally {
    rmSync(rootDir, { recursive: true, force: true });
  }
});
