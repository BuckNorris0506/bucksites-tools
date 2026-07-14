#!/usr/bin/env node
/**
 * Read-only owner browser proof collection packet (6 GE FAIL models / 3 filters).
 *
 *   npm run buckparts:fridge-model-pdp-owner-browser-proof-collection-packet
 *   npm run buckparts:fridge-model-pdp-owner-browser-proof-collection-packet -- --write-artifacts
 */

import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildBuckpartsFridgeModelPdpOwnerBrowserProofCollectionPacketV1,
  writeBuckpartsFridgeModelPdpOwnerBrowserProofCollectionArtifactsV1,
} from "./lib/buckparts-fridge-model-pdp-owner-browser-proof-collection-packet-v1";

const REPO_ROOT = path.resolve(path.join(path.dirname(fileURLToPath(import.meta.url)), ".."));

function main(): void {
  const writeArtifacts = process.argv.includes("--write-artifacts");
  const report = buildBuckpartsFridgeModelPdpOwnerBrowserProofCollectionPacketV1({
    rootDir: REPO_ROOT,
  });

  if (writeArtifacts) {
    const written = writeBuckpartsFridgeModelPdpOwnerBrowserProofCollectionArtifactsV1({
      rootDir: REPO_ROOT,
      report,
    });
    process.stderr.write(
      `Wrote ${written.json_rel_path} and ${written.md_rel_path} (read-only; filters=${String(report.summary.filters_ready_for_owner_browser)}; slugs=${String(report.summary.slugs_in_scope)}; repo_proven_pdp=${String(report.summary.filters_with_repo_proven_official_pdp)}; need_owner_verify=${String(report.summary.filters_with_candidate_needing_owner_verification)}).\n`,
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
