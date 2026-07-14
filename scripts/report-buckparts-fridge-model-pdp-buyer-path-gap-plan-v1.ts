#!/usr/bin/env node
/**
 * Read-only fridge model PDP buyer-path gap plan (9 SAFE_BUYER_PATH_FAIL slugs).
 *
 *   npm run buckparts:fridge-model-pdp-buyer-path-gap-plan
 *   npm run buckparts:fridge-model-pdp-buyer-path-gap-plan -- --write-artifacts
 */

import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildBuckpartsFridgeModelPdpBuyerPathGapPlanV1,
  writeBuckpartsFridgeModelPdpBuyerPathGapPlanArtifactsV1,
} from "./lib/buckparts-fridge-model-pdp-buyer-path-gap-plan-v1";

const REPO_ROOT = path.resolve(path.join(path.dirname(fileURLToPath(import.meta.url)), ".."));

function main(): void {
  const writeArtifacts = process.argv.includes("--write-artifacts");
  const report = buildBuckpartsFridgeModelPdpBuyerPathGapPlanV1({
    rootDir: REPO_ROOT,
  });

  if (writeArtifacts) {
    const written = writeBuckpartsFridgeModelPdpBuyerPathGapPlanArtifactsV1({
      rootDir: REPO_ROOT,
      report,
    });
    process.stderr.write(
      `Wrote ${written.json_rel_path} and ${written.md_rel_path} (read-only; CLOSABLE=${String(report.summary.CLOSABLE_WITH_EXISTING_EVIDENCE)}; RESEARCH=${String(report.summary.NEEDS_EXTERNAL_RESEARCH)}; REMAIN_NO_BUY=${String(report.summary.REMAIN_NO_BUY)}).\n`,
    );
  }

  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

try {
  main();
} catch (err) {
  process.stderr.write(`${err instanceof Error ? err.stack ?? err.message : String(err)}\n`);
  process.exitCode = 1;
}
