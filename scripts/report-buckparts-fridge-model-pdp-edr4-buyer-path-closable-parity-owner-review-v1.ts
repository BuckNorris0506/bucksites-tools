#!/usr/bin/env node
/**
 * Read-only EDR4 buyer-path closable parity owner-review (2 models → edr4rxd1).
 *
 *   npm run buckparts:fridge-model-pdp-edr4-buyer-path-closable-parity-owner-review -- --write-artifacts
 */

import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildEdr4BuyerPathClosableParityOwnerReviewV1,
  writeEdr4BuyerPathClosableParityOwnerReviewArtifactsV1,
} from "./lib/buckparts-fridge-model-pdp-edr4-buyer-path-closable-parity-owner-review-v1";

const REPO_ROOT = path.resolve(path.join(path.dirname(fileURLToPath(import.meta.url)), ".."));

function main(): void {
  const writeArtifacts = process.argv.includes("--write-artifacts");
  const report = buildEdr4BuyerPathClosableParityOwnerReviewV1({ rootDir: REPO_ROOT });

  if (writeArtifacts) {
    const written = writeEdr4BuyerPathClosableParityOwnerReviewArtifactsV1({
      rootDir: REPO_ROOT,
      report,
    });
    process.stderr.write(
      `Wrote ${written.json_rel_path} and ${written.md_rel_path} (read-only; apply_authorized=false).\n`,
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
