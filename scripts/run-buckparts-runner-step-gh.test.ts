import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";

import { BUCKPARTS_RUNNER_STEP_CONTRACT_V1 } from "./lib/buckparts-runner-step-v1";
import {
  buildRunnerStepGhSummaryV1,
  BUCKPARTS_RUNNER_STEP_GH_ARTIFACT_FILENAME,
  defaultBuckpartsRunnerStepGhDeps,
  maxStableWorkflowRunDatabaseId,
  newestRunIdStrictlyAbove,
  parseArtifactRunnerStepJson,
  parseGhRunListRows,
  parseGhRunViewJson,
  resolveArtifactJsonPath,
  runBuckpartsRunnerStepGhMain,
  type BuckpartsRunnerStepGhDeps,
  type BuckpartsRunnerStepOutputV1,
  type SpawnGhSyncResult,
} from "./run-buckparts-runner-step-gh";

const MINIMAL_ARTIFACT_JSON = (): string =>
  JSON.stringify({
    contract: BUCKPARTS_RUNNER_STEP_CONTRACT_V1,
    generated_at: "2026-05-01T00:00:00.000Z",
    read_only: true,
    data_mutation: false,
    layer_truth: {
      layer_3_repo_owned_execution: "PROVEN",
      layer_3_external_agent_execution: "UNKNOWN",
      layer_4_output_capture: "PROVEN_FOR_REPO_COMMANDS_ONLY",
      layer_5_validation_interpretation: "PARTIAL",
      layer_6_founder_only_approval: "NOT_PROVEN",
    },
    selected_packet: null,
    commands: [{ command: "npm run lint", exit_code: 0, status: "PASS", stdout_tail: "", stderr_tail: "" }],
    overall_status: "NO_PACKET",
    next_human_action: "n",
    next_runner_action: "r",
    prohibited_actions_confirmed: [],
    runner_notes: [],
  } satisfies BuckpartsRunnerStepOutputV1);

test("parseGhRunListRows rejects non-array stdout", () => {
  assert.throws(() => parseGhRunListRows("{}"));
});

test("maxStableWorkflowRunDatabaseId and newestRunIdStrictlyAbove", () => {
  const rows = parseGhRunListRows(
    JSON.stringify([
      { databaseId: 10, status: "completed", headBranch: "main" },
      { databaseId: 9, status: "completed", headBranch: "main" },
    ]),
  );
  assert.equal(maxStableWorkflowRunDatabaseId(rows), 10);
  assert.equal(newestRunIdStrictlyAbove(rows, 9), 10);
  assert.equal(newestRunIdStrictlyAbove(rows, 10), null);
});

test("parseGhRunViewJson", () => {
  assert.deepStrictEqual(parseGhRunViewJson('{"conclusion":"success","status":"completed"}'), {
    conclusion: "success",
    status: "completed",
  });
});

test("resolveArtifactJsonPath prefers flat then nested", () => {
  const join = path.join.bind(path);
  const existsSync = ((p: string) => false) as BuckpartsRunnerStepGhDeps["existsSync"];
  const deps = {
    ...defaultBuckpartsRunnerStepGhDeps,
    existsSync(p: string): boolean {
      return p === join("/fake", BUCKPARTS_RUNNER_STEP_GH_ARTIFACT_FILENAME);
    },
  };
  assert.equal(resolveArtifactJsonPath(deps, "/fake"), join("/fake", BUCKPARTS_RUNNER_STEP_GH_ARTIFACT_FILENAME));
});

test("parseArtifactRunnerStepJson rejects wrong contract", () => {
  assert.throws(() =>
    parseArtifactRunnerStepJson(
      JSON.stringify({
        contract: "wrong",
        layer_truth: {
          layer_3_repo_owned_execution: "PROVEN",
          layer_3_external_agent_execution: "UNKNOWN",
          layer_4_output_capture: "PROVEN_FOR_REPO_COMMANDS_ONLY",
          layer_5_validation_interpretation: "PARTIAL",
          layer_6_founder_only_approval: "NOT_PROVEN",
        },
        commands: [],
      }),
    ),
  );
});

test("buildRunnerStepGhSummaryV1 echoes NOT_PROVEN for layer 6", () => {
  const runner = JSON.parse(MINIMAL_ARTIFACT_JSON()) as BuckpartsRunnerStepOutputV1;
  const s = buildRunnerStepGhSummaryV1({
    runner,
    workflowRunId: 42,
    workflowConclusion: "success",
    artifactPath: "/tmp/x/buckparts-runner-step.json",
  });
  assert.equal(s.layer_6_founder_only_approval, "NOT_PROVEN");
  assert.equal(s.runner_overall_status, "NO_PACKET");
  assert.equal(s.command_count, 1);
  assert.equal(s.contract, BUCKPARTS_RUNNER_STEP_CONTRACT_V1);
});

test("happy path mocks spawn — no GitHub network", async () => {
  const TMP = "/tmp/mock-buckparts-runner-step-gh-test/";
  const NESTED = path.join(TMP, "buckparts-runner-step", BUCKPARTS_RUNNER_STEP_GH_ARTIFACT_FILENAME);
  let call = 0;
  const listBefore = `[{"databaseId":100,"status":"completed","headBranch":"main"}]`;
  const listAfterPoll = `[{"databaseId":101,"status":"queued","headBranch":"main"},{"databaseId":100,"status":"completed","headBranch":"main"}]`;
  const queue: SpawnGhSyncResult[] = [
    { status: 0, stdout: "gh 2.x", stderr: "" },
    { status: 0, stdout: "logged", stderr: "" },
    { status: 0, stdout: listBefore, stderr: "" },
    { status: 0, stdout: "", stderr: "" },
    { status: 0, stdout: listAfterPoll, stderr: "" },
    { status: 0, stdout: "", stderr: "" },
    { status: 0, stdout: '{"conclusion":"success","status":"completed"}', stderr: "" },
    { status: 0, stdout: "", stderr: "" },
  ];
  const deps: BuckpartsRunnerStepGhDeps = {
    spawnSyncGh: () => queue[call++],
    mkdtempSync: () => TMP,
    existsSync: (p) => path.normalize(p) === path.normalize(path.join(TMP, "buckparts-runner-step", BUCKPARTS_RUNNER_STEP_GH_ARTIFACT_FILENAME)),
    readFileSync: () => MINIMAL_ARTIFACT_JSON(),
    join: path.join,
    tmpdir: () => TMP,
  };
  const r = await runBuckpartsRunnerStepGhMain(deps);
  assert.equal(r.exitCode, 0);
  const summary = JSON.parse(r.summaryJsonText) as Record<string, unknown>;
  assert.equal(summary.workflow_run_id, 101);
  assert.equal(summary.workflow_conclusion, "success");
  assert.equal(summary.layer_6_founder_only_approval, "NOT_PROVEN");
  assert.equal(summary.runner_overall_status, "NO_PACKET");
});

test("missing gh exits 127", async () => {
  const deps: BuckpartsRunnerStepGhDeps = {
    spawnSyncGh: () => ({ status: 127, stdout: "", stderr: "not found" }),
    mkdtempSync: () => "",
    existsSync: () => false,
    readFileSync: () => "",
    join: path.join,
    tmpdir: () => "/tmp",
  };
  const r = await runBuckpartsRunnerStepGhMain(deps);
  assert.equal(r.exitCode, 127);
});

test("gh run watch failure uses non-zero exit", async () => {
  const list = `[{"databaseId":5,"status":"completed","headBranch":"main"}]`;
  const after = `[{"databaseId":6,"status":"completed","headBranch":"main"},{"databaseId":5,"status":"completed","headBranch":"main"}]`;
  const seq: SpawnGhSyncResult[] = [
    { status: 0, stdout: "", stderr: "" },
    { status: 0, stdout: "", stderr: "" },
    { status: 0, stdout: list, stderr: "" },
    { status: 0, stdout: "", stderr: "" },
    { status: 0, stdout: after, stderr: "" },
    { status: 1, stdout: "", stderr: "failure" },
  ];
  let i = 0;
  const deps: BuckpartsRunnerStepGhDeps = {
    spawnSyncGh: () => seq[i++]!,
    mkdtempSync: () => "/tmp/x",
    existsSync: () => false,
    readFileSync: () => "",
    join: path.join,
    tmpdir: () => "/tmp",
  };
  const r = await runBuckpartsRunnerStepGhMain(deps);
  assert.ok(r.exitCode !== 0);
});
