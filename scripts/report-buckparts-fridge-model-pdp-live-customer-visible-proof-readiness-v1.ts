#!/usr/bin/env node
/**
 * Read-only live / customer-visible proof readiness for 21 SAFE_BUYER_PATH_PASS fridge PDPs.
 *
 *   npm run buckparts:fridge-model-pdp-live-customer-visible-proof-readiness
 *   npm run buckparts:fridge-model-pdp-live-customer-visible-proof-readiness -- --write-artifacts
 */

import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildBuckpartsFridgeModelPdpLiveCustomerVisibleProofReadinessV1,
  writeBuckpartsFridgeModelPdpLiveCustomerVisibleProofReadinessArtifactsV1,
} from "./lib/buckparts-fridge-model-pdp-live-customer-visible-proof-readiness-v1";

const REPO_ROOT = path.resolve(path.join(path.dirname(fileURLToPath(import.meta.url)), ".."));

function main(): void {
  const writeArtifacts = process.argv.includes("--write-artifacts");
  const report = buildBuckpartsFridgeModelPdpLiveCustomerVisibleProofReadinessV1({
    rootDir: REPO_ROOT,
  });

  if (writeArtifacts) {
    const written = writeBuckpartsFridgeModelPdpLiveCustomerVisibleProofReadinessArtifactsV1({
      rootDir: REPO_ROOT,
      report,
    });
    process.stderr.write(
      `Wrote ${written.json_rel_path} and ${written.md_rel_path} (read-only; PASS=${String(report.summary.SAFE_BUYER_PATH_PASS_scoped)}; live_html_unknown=${String(report.summary.live_html_unknown_count)}; ready_future=${String(report.summary.ready_for_future_live_proof_pass_count)}).\n`,
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
