#!/usr/bin/env node
/**
 * Read-only fridge model PDP rendered truth proof pack (backend-closed 39).
 *
 *   npm run buckparts:fridge-model-pdp-rendered-truth-proof-pack
 *   npm run buckparts:fridge-model-pdp-rendered-truth-proof-pack -- --write-artifacts
 */

import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildBuckpartsFridgeModelPdpRenderedTruthProofPackV1,
  writeBuckpartsFridgeModelPdpRenderedTruthProofArtifactsV1,
} from "./lib/buckparts-fridge-model-pdp-rendered-truth-proof-pack-v1";

const REPO_ROOT = path.resolve(path.join(path.dirname(fileURLToPath(import.meta.url)), ".."));

async function main(): Promise<void> {
  const writeArtifacts = process.argv.includes("--write-artifacts");
  const report = await buildBuckpartsFridgeModelPdpRenderedTruthProofPackV1({
    rootDir: REPO_ROOT,
  });

  if (writeArtifacts) {
    const written = writeBuckpartsFridgeModelPdpRenderedTruthProofArtifactsV1({
      rootDir: REPO_ROOT,
      report,
    });
    process.stderr.write(
      `Wrote ${written.json_rel_path} and ${written.md_rel_path} (read-only; MATCH=${String(report.summary.MATCH)}; MISMATCH=${String(report.summary.MISMATCH)}; UNKNOWN_RENDER=${String(report.summary.UNKNOWN_RENDER)}; frontend_safe_promoted=${String(report.summary.frontend_safe_promoted_count)}).\n`,
    );
  }

  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

main().catch((err) => {
  process.stderr.write(`${err instanceof Error ? err.stack ?? err.message : String(err)}\n`);
  process.exitCode = 1;
});
