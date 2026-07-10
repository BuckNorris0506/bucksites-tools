#!/usr/bin/env node
/**
 * Read-only GSWF wrong-part repair apply-plan owner review — stdout JSON; optional draft writes.
 *
 *   npm run buckparts:gswf-wrong-part-repair-apply-plan-owner-review
 *   npm run buckparts:gswf-wrong-part-repair-apply-plan-owner-review -- --write-artifacts
 */

import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildGswfWrongPartRepairApplyPlanOwnerReviewV1,
  writeGswfWrongPartRepairApplyPlanOwnerReviewArtifactsV1,
} from "./lib/gswf-wrong-part-repair-apply-plan-owner-review-v1";

const REPO_ROOT = path.resolve(path.join(path.dirname(fileURLToPath(import.meta.url)), ".."));

function main(): void {
  const writeArtifacts = process.argv.includes("--write-artifacts");
  const plan = buildGswfWrongPartRepairApplyPlanOwnerReviewV1({ rootDir: REPO_ROOT });

  if (writeArtifacts) {
    const written = writeGswfWrongPartRepairApplyPlanOwnerReviewArtifactsV1({
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
