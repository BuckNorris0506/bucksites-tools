#!/usr/bin/env node
/**
 * Read-only GSWF family reconciliation owner review packet — stdout JSON; optional draft writes.
 *
 *   npm run buckparts:gswf-family-reconciliation-owner-review
 *   npm run buckparts:gswf-family-reconciliation-owner-review -- --write-artifacts
 */

import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildGswfFamilyReconciliationOwnerReviewV1,
  writeGswfFamilyReconciliationOwnerReviewArtifactsV1,
} from "./lib/gswf-family-reconciliation-owner-review-v1";

const REPO_ROOT = path.resolve(path.join(path.dirname(fileURLToPath(import.meta.url)), ".."));

function main(): void {
  const writeArtifacts = process.argv.includes("--write-artifacts");
  const packet = buildGswfFamilyReconciliationOwnerReviewV1({ rootDir: REPO_ROOT });

  if (writeArtifacts) {
    const written = writeGswfFamilyReconciliationOwnerReviewArtifactsV1({
      rootDir: REPO_ROOT,
      packet,
    });
    process.stderr.write(
      `Wrote ${written.json_rel_path} and ${written.md_rel_path} (read-only draft artifacts; no mutation authorized).\n`,
    );
  }

  process.stdout.write(`${JSON.stringify(packet, null, 2)}\n`);
}

main();
