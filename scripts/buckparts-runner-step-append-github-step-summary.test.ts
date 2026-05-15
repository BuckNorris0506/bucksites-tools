/**
 * Contract: CI workflows must call `scripts/buckparts-runner-step-append-github-step-summary.ts`
 * so formatter imports use file-based resolution (not stdin heredocs).
 */

import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import * as summaryModule from "./lib/buckparts-runner-step-summary-v1";
import type { BuckpartsRunnerStepOutputV1 } from "./lib/buckparts-runner-step-v1";
import { appendRunnerStepGithubStepSummaryFromJsonFile } from "./buckparts-runner-step-append-github-step-summary";

test("summary module exports formatConciseRunnerStepGithubStepSummaryMarkdownV1 (named export contract)", () => {
  assert.equal(typeof summaryModule.formatConciseRunnerStepGithubStepSummaryMarkdownV1, "function");
  assert.ok("formatConciseRunnerStepGithubStepSummaryMarkdownV1" in summaryModule);
});

test("appendRunnerStepGithubStepSummaryFromJsonFile writes formatter output to summary path", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "runner-append-"));
  const jsonPath = path.join(dir, "buckparts-runner-step.json");
  const summaryPath = path.join(dir, "step-summary.md");
  const out: BuckpartsRunnerStepOutputV1 = {
    contract: "buckparts_runner_step_v1",
    generated_at: "t",
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
    overall_status: "PASS",
    next_human_action: "h",
    next_runner_action: "r",
    prohibited_actions_confirmed: [],
    runner_notes: [],
  };
  writeFileSync(jsonPath, JSON.stringify(out), "utf8");
  const r = appendRunnerStepGithubStepSummaryFromJsonFile({
    jsonPath,
    summaryPath,
    cwd: dir,
  });
  assert.equal(r.appended, true);
  const written = readFileSync(summaryPath, "utf8");
  assert.match(written, /## BuckParts Runner Step v1 \(CI\)/);
  assert.match(written, /`overall_status` = `PASS`/);
});

test("append script source imports formatter from ./lib (not ./scripts/lib URL)", () => {
  const src = readFileSync(
    path.resolve(process.cwd(), "scripts/buckparts-runner-step-append-github-step-summary.ts"),
    "utf8",
  );
  assert.match(src, /formatConciseRunnerStepGithubStepSummaryMarkdownV1/);
  assert.match(src, /from "\.\/lib\/buckparts-runner-step-summary-v1"/);
  assert.doesNotMatch(src, /from "\.\/scripts\/lib\/buckparts-runner-step-summary-v1\.ts"/);
});
