/**
 * CI helper: read Runner Step v1 JSON, append concise markdown to `GITHUB_STEP_SUMMARY`.
 * Uses the same import path pattern as other `scripts/*.ts` CLIs (avoids stdin + deep `.ts` URL imports).
 *
 * Usage: `node --import tsx scripts/buckparts-runner-step-append-github-step-summary.ts [jsonPath]`
 * Default jsonPath: `buckparts-runner-step.json` or `RUNNER_STEP_JSON_PATH`.
 */

import { appendFileSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { formatConciseRunnerStepGithubStepSummaryMarkdownV1 } from "./lib/buckparts-runner-step-summary-v1";
import type { BuckpartsRunnerStepOutputV1 } from "./lib/buckparts-runner-step-v1";

export function appendRunnerStepGithubStepSummaryFromJsonFile(args: {
  jsonPath: string;
  summaryPath: string | undefined;
  cwd: string;
}): { appended: boolean; reason: string } {
  const summaryPath = args.summaryPath?.trim();
  if (!summaryPath) {
    return { appended: false, reason: "GITHUB_STEP_SUMMARY unset" };
  }
  const rel = args.jsonPath.trim() || "buckparts-runner-step.json";
  const abs = path.isAbsolute(rel) ? rel : path.resolve(args.cwd, rel);
  const raw = readFileSync(abs, "utf8");
  const parsed = JSON.parse(raw) as BuckpartsRunnerStepOutputV1;
  appendFileSync(summaryPath, formatConciseRunnerStepGithubStepSummaryMarkdownV1(parsed));
  return { appended: true, reason: "ok" };
}

function main(): void {
  const jsonPath =
    process.argv[2]?.trim() || process.env.RUNNER_STEP_JSON_PATH?.trim() || "buckparts-runner-step.json";
  const r = appendRunnerStepGithubStepSummaryFromJsonFile({
    jsonPath,
    summaryPath: process.env.GITHUB_STEP_SUMMARY,
    cwd: process.cwd(),
  });
  if (!r.appended) {
    process.stderr.write(`${r.reason}; skipping append (exit 0).\n`);
  }
  process.exit(0);
}

const THIS_FILE = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === THIS_FILE) {
  main();
}
