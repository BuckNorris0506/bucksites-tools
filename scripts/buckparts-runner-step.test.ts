import assert from "node:assert/strict";
import test from "node:test";

import type { NextExecutionPacketSnapshotV1 } from "./lib/buckparts-next-execution-packet";
import { RUNNER_EXECUTION_NPM_SCRIPT_ALLOWLIST_V1 } from "./lib/buckparts-runner-safety-contract-v1";
import { FOUNDER_EXECUTION_PACKET_CONTRACT_V1 } from "../src/lib/owner-dashboard/founder-execution-packet-v1";
import { FOUNDER_ACTION_QUEUE_CONTRACT_V1 } from "../src/lib/owner-dashboard/founder-action-queue-v1";
import {
  BUCKPARTS_RUNNER_STEP_CONTRACT_V1,
  RUNNER_STEP_ALLOWED_NPM_SCRIPTS_V1,
  RUNNER_STEP_LAYER_TRUTH_V1,
  assertRunnerStepAllowedNpmScriptV1,
  buildBuckpartsRunnerStepOutputV1,
  commandRecordFromSpawnV1,
  deriveOverallStatusV1,
  isRunnerStepAllowedNpmScriptV1,
  npmRunCommandDisplayV1,
  skippedCommandRecordV1,
  tailTextV1,
} from "./lib/buckparts-runner-step-v1";

function minimalSnapshot(overrides: Partial<NextExecutionPacketSnapshotV1>): NextExecutionPacketSnapshotV1 {
  const base: NextExecutionPacketSnapshotV1 = {
    command_center_ok: true,
    generated_at: "2026-01-01T00:00:00.000Z",
    source: "buckparts-next-execution-packet",
    queue: {
      contract: FOUNDER_ACTION_QUEUE_CONTRACT_V1,
      rows: [],
    },
    execution: {
      contract: FOUNDER_EXECUTION_PACKET_CONTRACT_V1,
      read_only: true,
      data_mutation: false,
      packets: [],
      skipped_rows: [],
    },
    next_packet: null,
    first_needs_owner_title: null,
  };
  return { ...base, ...overrides };
}

test("Runner Step output shape (PASS with mock packet)", () => {
  const snapshot = minimalSnapshot({
    next_packet: {
      id: "pkt_test",
      source_queue_row_id: "row_test",
      title: "Test packet",
      recommended_actor: "agent",
      mutation_authority: "read_only",
      status: "agent_safe",
      packet_kind: "agent_read_only_delegate_v1",
      copy_paste_prompt: "(omitted in test)",
      validation_command: "npm run lint",
      acceptance_criteria: [],
      prohibited_actions: ["Do not mutate DB."],
      evidence_basis: "test",
    },
  });
  const commands = RUNNER_STEP_ALLOWED_NPM_SCRIPTS_V1.map((script) =>
    commandRecordFromSpawnV1({
      script,
      exit_code: 0,
      stdout: "ok\n",
      stderr: "",
      tailChars: 100,
    }),
  );
  const out = buildBuckpartsRunnerStepOutputV1({
    generated_at: "2026-01-02T00:00:00.000Z",
    snapshot,
    commands,
  });
  assert.equal(out.contract, BUCKPARTS_RUNNER_STEP_CONTRACT_V1);
  assert.equal(out.read_only, true);
  assert.equal(out.data_mutation, false);
  assert.deepEqual(out.layer_truth, RUNNER_STEP_LAYER_TRUTH_V1);
  assert.equal(out.selected_packet?.id, "pkt_test");
  assert.equal(out.commands.length, 3);
  assert.equal(out.overall_status, "PASS");
  assert.match(out.next_human_action, /PROVEN|INFERRED/);
  assert.ok(Array.isArray(out.prohibited_actions_confirmed));
  assert.equal(out.prohibited_actions_confirmed[0], "Do not mutate DB.");
});

test("no mutating npm script names allowed", () => {
  assert.equal(isRunnerStepAllowedNpmScriptV1("lint"), true);
  assert.equal(isRunnerStepAllowedNpmScriptV1("build"), true);
  assert.equal(isRunnerStepAllowedNpmScriptV1("buckparts:operator-proof"), true);
  assert.equal(isRunnerStepAllowedNpmScriptV1("seed:import"), false);
  assert.equal(isRunnerStepAllowedNpmScriptV1("buckparts:learning-outcomes-approved-insert:mutate"), false);
  assert.throws(() => assertRunnerStepAllowedNpmScriptV1("mutate:all"), /PROVEN violation/);
});

test("command result formatting / tails", () => {
  const long = `${"a".repeat(100)}END`;
  assert.equal(tailTextV1(long, 10), long.slice(-10));
  const rec = commandRecordFromSpawnV1({
    script: "lint",
    exit_code: 1,
    stdout: "x".repeat(20),
    stderr: "err",
    tailChars: 5,
  });
  assert.equal(rec.status, "FAIL");
  assert.equal(rec.exit_code, 1);
  assert.equal(rec.command, "npm run lint");
});

test("no packet + all commands PASS => NO_PACKET", () => {
  const snapshot = minimalSnapshot({ next_packet: null });
  const commands = RUNNER_STEP_ALLOWED_NPM_SCRIPTS_V1.map((script) =>
    commandRecordFromSpawnV1({ script, exit_code: 0, stdout: "", stderr: "", tailChars: 50 }),
  );
  const out = buildBuckpartsRunnerStepOutputV1({ generated_at: "t", snapshot, commands });
  assert.equal(out.overall_status, "NO_PACKET");
  assert.equal(out.selected_packet, null);
});

test("command_center_ok false => BLOCKED and skipped commands", () => {
  const snapshot = minimalSnapshot({ command_center_ok: false, next_packet: null });
  const commands = RUNNER_STEP_ALLOWED_NPM_SCRIPTS_V1.map((script) =>
    skippedCommandRecordV1(npmRunCommandDisplayV1(script), "skipped"),
  );
  const out = buildBuckpartsRunnerStepOutputV1({ generated_at: "t", snapshot, commands });
  assert.equal(out.overall_status, "BLOCKED");
  assert.ok(out.commands.every((c) => c.status === "SKIPPED"));
});

test("deriveOverallStatusV1: FAIL when any command fails", () => {
  const cmds = [
    commandRecordFromSpawnV1({
      script: "lint",
      exit_code: 1,
      stdout: "",
      stderr: "e",
      tailChars: 10,
    }),
    commandRecordFromSpawnV1({ script: "build", exit_code: 0, stdout: "", stderr: "", tailChars: 10 }),
    commandRecordFromSpawnV1({
      script: "buckparts:operator-proof",
      exit_code: 0,
      stdout: "",
      stderr: "",
      tailChars: 10,
    }),
  ];
  assert.equal(
    deriveOverallStatusV1({ command_center_ok: true, has_packet: false, commands: cmds }),
    "FAIL",
  );
});

test("Runner safety: allowlist matches safety contract module (single source of truth)", () => {
  assert.deepStrictEqual(
    [...RUNNER_STEP_ALLOWED_NPM_SCRIPTS_V1],
    [...RUNNER_EXECUTION_NPM_SCRIPT_ALLOWLIST_V1],
  );
});

test("deriveOverallStatusV1: has_packet true with all PASS => PASS", () => {
  const cmds = RUNNER_STEP_ALLOWED_NPM_SCRIPTS_V1.map((script) =>
    commandRecordFromSpawnV1({ script, exit_code: 0, stdout: "", stderr: "", tailChars: 10 }),
  );
  assert.equal(deriveOverallStatusV1({ command_center_ok: true, has_packet: true, commands: cmds }), "PASS");
});