/**
 * Runner Safety Contract v1 — tests only (allowlist, CLI source, founder packet defaults).
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { buildFounderExecutionPacketsV1 } from "../src/lib/owner-dashboard/founder-execution-packet-v1";
import type { FounderActionQueueRowV1 } from "../src/lib/owner-dashboard/founder-action-queue-v1";
import {
  BUCKPARTS_RUNNER_SAFETY_CONTRACT_V1,
  RUNNER_EXECUTION_NPM_SCRIPT_ALLOWLIST_V1,
  RUNNER_EXPECTED_DEFAULT_PROHIBITED_ACTION_LINES_V1,
} from "./lib/buckparts-runner-safety-contract-v1";
import { RUNNER_STEP_ALLOWED_NPM_SCRIPTS_V1 } from "./lib/buckparts-runner-step-v1";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const agentSafeRow = (): FounderActionQueueRowV1 => ({
  id: "queue-amazon-agent",
  title: "Amazon rescue · read-only agent work",
  status: "agent_safe",
  owner_burden: "medium",
  recommended_actor: "agent",
  mutation_authority: "read_only",
  evidence_basis: "fixture",
  next_action: "Read-only audit.",
});

test("Runner Safety Contract id is stable", () => {
  assert.equal(BUCKPARTS_RUNNER_SAFETY_CONTRACT_V1, "buckparts_runner_safety_contract_v1");
});

test("PROVEN: Runner Step allowlist is exactly lint, build, buckparts:operator-proof (snapshot)", () => {
  const expected = ["lint", "build", "buckparts:operator-proof"] as const;
  assert.deepStrictEqual([...RUNNER_EXECUTION_NPM_SCRIPT_ALLOWLIST_V1], [...expected]);
  assert.deepStrictEqual([...RUNNER_STEP_ALLOWED_NPM_SCRIPTS_V1], [...expected]);
});

test("PROVEN: scripts/buckparts-runner-step.ts has no validation_command identifier (no arbitrary spawn from packet field)", () => {
  const cliPath = path.join(__dirname, "buckparts-runner-step.ts");
  const src = readFileSync(cliPath, "utf8");
  assert.doesNotMatch(src, /\bvalidation_command\b/, "CLI must not branch on validation_command for subprocess args");
  assert.match(src, /RUNNER_STEP_ALLOWED_NPM_SCRIPTS_V1|RUNNER_EXECUTION_NPM_SCRIPT_ALLOWLIST_V1/);
});

test("PROVEN: Founder Execution Packet default prohibited_actions match safety contract lines", () => {
  const m = buildFounderExecutionPacketsV1([agentSafeRow()], { source: "safety_contract_test" });
  assert.equal(m.packets.length, 1);
  assert.deepStrictEqual(m.packets[0]!.prohibited_actions, [...RUNNER_EXPECTED_DEFAULT_PROHIBITED_ACTION_LINES_V1]);
});

test("PROVEN: default prohibitions name Supabase, retailer_links, evidence, affiliate, mutating npm", () => {
  const joined = RUNNER_EXPECTED_DEFAULT_PROHIBITED_ACTION_LINES_V1.join("\n");
  assert.match(joined, /Supabase/i);
  assert.match(joined, /retailer_links/);
  assert.match(joined, /data\/evidence/);
  assert.match(joined, /affiliate/i);
  assert.match(joined, /mutating npm/i);
});
