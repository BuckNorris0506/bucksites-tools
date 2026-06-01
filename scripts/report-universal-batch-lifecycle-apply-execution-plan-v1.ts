/**
 * Universal batch lifecycle apply execution plan — stdout JSON by default (read-only).
 *
 *   npm run buckparts:universal-batch-lifecycle-apply-execution-plan
 *   npm run buckparts:universal-batch-lifecycle-apply-execution-plan -- --plan-out data/fridge/batch-production/apply-execution-plans/fridge-buyer-path-batch-apply-execution-plan-v1-0fec4a7b623a.json
 */

import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { buildUniversalBatchLifecycleApplyReadinessV1 } from "./lib/universal-batch-lifecycle-apply-readiness-v1";
import {
  assertUniversalBatchLifecycleApplyExecutionPlanOutPathAllowedV1,
  buildUniversalBatchLifecycleApplyExecutionPlanV1,
} from "./lib/universal-batch-lifecycle-apply-execution-plan-v1";

const REPO_ROOT = path.resolve(path.join(path.dirname(fileURLToPath(import.meta.url)), ".."));

function readArgValue(argv: string[], flag: string): string | null {
  const idx = argv.indexOf(flag);
  if (idx < 0) return null;
  return argv[idx + 1] ?? null;
}

function planDocumentForArtifactWrite(
  report: ReturnType<typeof buildUniversalBatchLifecycleApplyExecutionPlanV1>,
): Record<string, unknown> {
  const {
    recommended_next_action: _recommended,
    proven_facts: _proven,
    unknown_facts: _unknown,
    ...doc
  } = report;
  return doc;
}

function main(): void {
  const argv = process.argv.slice(2);
  const planOut = readArgValue(argv, "--plan-out");
  const now = () => new Date();

  const applyReadiness = buildUniversalBatchLifecycleApplyReadinessV1({
    rootDir: REPO_ROOT,
    now,
  });

  const report = buildUniversalBatchLifecycleApplyExecutionPlanV1({
    rootDir: REPO_ROOT,
    now,
    applyReadiness,
  });

  if (planOut) {
    assertUniversalBatchLifecycleApplyExecutionPlanOutPathAllowedV1(planOut, REPO_ROOT);
    if (report.execution_plan_status !== "READY_FOR_MUTATION_AUTH_REVIEW") {
      process.stderr.write(
        `execution_plan_status is ${report.execution_plan_status}; cannot write execution-plan artifact while blocked\n`,
      );
      process.exitCode = 1;
      return;
    }
    const abs = path.resolve(REPO_ROOT, planOut);
    mkdirSync(path.dirname(abs), { recursive: true });
    writeFileSync(abs, `${JSON.stringify(planDocumentForArtifactWrite(report), null, 2)}\n`, "utf8");
    process.stdout.write(
      `${JSON.stringify({ ...report, plan_written: true, plan_out: path.relative(REPO_ROOT, abs).split(path.sep).join("/") }, null, 2)}\n`,
    );
    return;
  }

  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

main();
