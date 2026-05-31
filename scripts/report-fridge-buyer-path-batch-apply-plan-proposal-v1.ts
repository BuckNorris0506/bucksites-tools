/**
 * Fridge buyer-path batch apply-plan proposal — stdout JSON by default; explicit write only with --plan-out.
 *
 *   npm run buckparts:fridge-buyer-path-batch-apply-plan-proposal
 *   npm run buckparts:fridge-buyer-path-batch-apply-plan-proposal -- --plan-out data/fridge/batch-production/apply-plans/fridge-buyer-path-batch-apply-plan-v1-0fec4a7b623a.json
 */

import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  assertFridgeApplyPlanOutPathAllowedV1,
  buildFridgeApplyPlanArtifactRelPathV1,
  buildFridgeBuyerPathBatchApplyPlanProposalV1,
} from "./lib/fridge-buyer-path-batch-apply-plan-proposal-v1";

const REPO_ROOT = path.resolve(path.join(path.dirname(fileURLToPath(import.meta.url)), ".."));

function readArgValue(argv: string[], flag: string): string | null {
  const idx = argv.indexOf(flag);
  if (idx < 0) return null;
  return argv[idx + 1] ?? null;
}

function planDocumentForArtifactWrite(
  report: ReturnType<typeof buildFridgeBuyerPathBatchApplyPlanProposalV1>,
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

  const report = buildFridgeBuyerPathBatchApplyPlanProposalV1({
    rootDir: REPO_ROOT,
    now,
  });

  if (planOut) {
    assertFridgeApplyPlanOutPathAllowedV1(planOut, REPO_ROOT);
    const expectedRel = buildFridgeApplyPlanArtifactRelPathV1(report.proposed_batch_id);
    const expectedAbs = path.resolve(REPO_ROOT, expectedRel);
    const abs = path.resolve(planOut);
    if (abs !== expectedAbs) {
      process.stderr.write(
        `--plan-out must match expected path ${expectedRel} (got ${path.relative(REPO_ROOT, abs)})\n`,
      );
      process.exitCode = 1;
      return;
    }
    if (report.plan_status !== "READY_FOR_OWNER_REVIEW") {
      process.stderr.write(
        `plan_status is ${report.plan_status}; cannot write apply-plan artifact while blocked\n`,
      );
      process.exitCode = 1;
      return;
    }
    mkdirSync(path.dirname(abs), { recursive: true });
    writeFileSync(abs, `${JSON.stringify(planDocumentForArtifactWrite(report), null, 2)}\n`, "utf8");
    process.stdout.write(
      `${JSON.stringify({ ...report, plan_written: true, plan_out: expectedRel }, null, 2)}\n`,
    );
    return;
  }

  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

main();
