#!/usr/bin/env node
/**
 * Read-only owner browser proof RESULT packet (MWFP/XWFE PASS; XWF superseded).
 *
 *   npm run buckparts:fridge-model-pdp-owner-browser-proof-result-packet
 *   npm run buckparts:fridge-model-pdp-owner-browser-proof-result-packet -- --write-artifacts
 */

import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildBuckpartsFridgeModelPdpOwnerBrowserProofResultPacketV1,
  writeBuckpartsFridgeModelPdpOwnerBrowserProofResultArtifactsV1,
} from "./lib/buckparts-fridge-model-pdp-owner-browser-proof-result-packet-v1";

const REPO_ROOT = path.resolve(path.join(path.dirname(fileURLToPath(import.meta.url)), ".."));

function main(): void {
  const writeArtifacts = process.argv.includes("--write-artifacts");
  const report = buildBuckpartsFridgeModelPdpOwnerBrowserProofResultPacketV1({
    rootDir: REPO_ROOT,
  });

  if (writeArtifacts) {
    const written = writeBuckpartsFridgeModelPdpOwnerBrowserProofResultArtifactsV1({
      rootDir: REPO_ROOT,
      report,
    });
    process.stderr.write(
      `Wrote ${written.json_rel_path} and ${written.md_rel_path} (read-only; OWNER_BROWSER_PASS=${String(report.summary.OWNER_BROWSER_PASS)}; SUPERSEDED=${String(report.summary.SUPERSEDED_TO_XWFE_PROVEN)}; closable=${String(report.summary.potentially_closable_slugs)}; blocked_xwf=${String(report.summary.blocked_by_xwf_supersession_slugs)}).\n`,
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
