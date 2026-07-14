#!/usr/bin/env node
/**
 * Read-only live HTML proof for 21 SAFE_BUYER_PATH_PASS fridge model PDPs.
 *
 *   npm run buckparts:fridge-model-pdp-live-html-proof
 *   npm run buckparts:fridge-model-pdp-live-html-proof -- --write-artifacts
 */

import path from "node:path";
import { fileURLToPath } from "node:url";

import { loadEnv } from "./lib/load-env";
import {
  buildBuckpartsFridgeModelPdpLiveHtmlProofPackV1,
  writeBuckpartsFridgeModelPdpLiveHtmlProofArtifactsV1,
} from "./lib/buckparts-fridge-model-pdp-live-html-proof-pack-v1";

const REPO_ROOT = path.resolve(path.join(path.dirname(fileURLToPath(import.meta.url)), ".."));

async function main(): Promise<void> {
  loadEnv(REPO_ROOT);
  const writeArtifacts = process.argv.includes("--write-artifacts");
  const report = await buildBuckpartsFridgeModelPdpLiveHtmlProofPackV1({
    rootDir: REPO_ROOT,
  });

  if (writeArtifacts) {
    const written = writeBuckpartsFridgeModelPdpLiveHtmlProofArtifactsV1({
      rootDir: REPO_ROOT,
      report,
    });
    process.stderr.write(
      `Wrote ${written.json_rel_path} and ${written.md_rel_path} (read-only; PASS=${String(report.summary.LIVE_PROOF_PASS)}; FAIL=${String(report.summary.LIVE_PROOF_FAIL)}; UNKNOWN=${String(report.summary.LIVE_PROOF_UNKNOWN)}; conversion_claimed=false).\n`,
    );
  }

  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

main().catch((err) => {
  process.stderr.write(`${err instanceof Error ? err.stack ?? err.message : String(err)}\n`);
  process.exitCode = 1;
});
