#!/usr/bin/env node
/**
 * Read-only founder-gated GE closable MWFP/XWFE apply-plan owner review.
 *
 *   npm run buckparts:fridge-model-pdp-ge-closable-mwfp-xwfe-apply-plan-owner-review
 *   npm run buckparts:fridge-model-pdp-ge-closable-mwfp-xwfe-apply-plan-owner-review -- --write-artifacts
 */

import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildBuckpartsFridgeModelPdpGeClosableApplyPlanOwnerReviewV1,
  writeBuckpartsFridgeModelPdpGeClosableApplyPlanArtifactsV1,
} from "./lib/buckparts-fridge-model-pdp-ge-closable-mwfp-xwfe-apply-plan-owner-review-v1";

const REPO_ROOT = path.resolve(path.join(path.dirname(fileURLToPath(import.meta.url)), ".."));

function main(): void {
  const writeArtifacts = process.argv.includes("--write-artifacts");
  const report = buildBuckpartsFridgeModelPdpGeClosableApplyPlanOwnerReviewV1({
    rootDir: REPO_ROOT,
  });

  if (writeArtifacts) {
    const written = writeBuckpartsFridgeModelPdpGeClosableApplyPlanArtifactsV1({
      rootDir: REPO_ROOT,
      report,
    });
    process.stderr.write(
      `Wrote ${written.json_rel_path} and ${written.md_rel_path} (read-only; plan_status=${report.plan_status}; planned_rows=${String(report.summary.planned_model_filter_rows)}; unique_deltas=${String(report.summary.unique_retailer_links_deltas)}; pages_claimed_closed=false).\n`,
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
