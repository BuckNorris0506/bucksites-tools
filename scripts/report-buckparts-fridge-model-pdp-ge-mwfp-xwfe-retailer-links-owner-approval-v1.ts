#!/usr/bin/env node
/**
 * Founder approval draft for GE MWFP/XWFE retailer_links CSV updates (no apply).
 *
 *   npm run buckparts:fridge-model-pdp-ge-mwfp-xwfe-retailer-links-owner-approval
 *   npm run buckparts:fridge-model-pdp-ge-mwfp-xwfe-retailer-links-owner-approval -- --write-artifacts
 */

import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildBuckpartsFridgeModelPdpGeMwfpXwfeRetailerLinksOwnerApprovalV1,
  writeBuckpartsFridgeModelPdpGeMwfpXwfeRetailerLinksOwnerApprovalArtifactsV1,
} from "./lib/buckparts-fridge-model-pdp-ge-mwfp-xwfe-retailer-links-owner-approval-v1";

const REPO_ROOT = path.resolve(path.join(path.dirname(fileURLToPath(import.meta.url)), ".."));

function main(): void {
  const writeArtifacts = process.argv.includes("--write-artifacts");
  const doc = buildBuckpartsFridgeModelPdpGeMwfpXwfeRetailerLinksOwnerApprovalV1({
    rootDir: REPO_ROOT,
  });

  if (writeArtifacts) {
    const written = writeBuckpartsFridgeModelPdpGeMwfpXwfeRetailerLinksOwnerApprovalArtifactsV1({
      rootDir: REPO_ROOT,
      doc,
    });
    const row = doc.rows[0]!;
    process.stderr.write(
      `Wrote ${written.json_rel_path} and ${written.md_rel_path} (decision_id=${row.decision_id}; apply_authorized=false; updates=2; xwf_promotion=false).\n`,
    );
  }

  process.stdout.write(`${JSON.stringify(doc, null, 2)}\n`);
}

try {
  main();
} catch (err) {
  process.stderr.write(`${err instanceof Error ? err.stack ?? err.message : String(err)}\n`);
  process.exitCode = 1;
}
