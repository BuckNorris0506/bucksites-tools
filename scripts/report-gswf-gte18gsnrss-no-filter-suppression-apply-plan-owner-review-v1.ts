#!/usr/bin/env node
/**
 * Read-only ge-gte18gsnrss no-filter suppression apply-plan owner review.
 *
 *   npm run buckparts:gswf-gte18gsnrss-no-filter-suppression-apply-plan-owner-review
 *   npm run buckparts:gswf-gte18gsnrss-no-filter-suppression-apply-plan-owner-review -- --write-artifacts
 */

import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildGswfGte18gsnrssNoFilterSuppressionApplyPlanOwnerReviewV1,
  writeGswfGte18gsnrssNoFilterSuppressionApplyPlanArtifactsV1,
} from "./lib/gswf-gte18gsnrss-no-filter-suppression-apply-plan-owner-review-v1";

const REPO_ROOT = path.resolve(path.join(path.dirname(fileURLToPath(import.meta.url)), ".."));

function main(): void {
  const writeArtifacts = process.argv.includes("--write-artifacts");
  const plan = buildGswfGte18gsnrssNoFilterSuppressionApplyPlanOwnerReviewV1({ rootDir: REPO_ROOT });

  if (writeArtifacts) {
    const written = writeGswfGte18gsnrssNoFilterSuppressionApplyPlanArtifactsV1({
      rootDir: REPO_ROOT,
      plan,
    });
    process.stderr.write(
      `Wrote ${written.json_rel_path} and ${written.md_rel_path} (read-only draft artifacts; no mutation authorized).\n`,
    );
  }

  process.stdout.write(`${JSON.stringify(plan, null, 2)}\n`);
}

main();
