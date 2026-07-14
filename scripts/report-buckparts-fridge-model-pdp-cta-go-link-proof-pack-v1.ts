#!/usr/bin/env node
/**
 * Read-only fridge model PDP CTA / go-link proof pack (28 MATCH promoted slugs).
 *
 *   npm run buckparts:fridge-model-pdp-cta-go-link-proof-pack
 *   npm run buckparts:fridge-model-pdp-cta-go-link-proof-pack -- --write-artifacts
 */

import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildBuckpartsFridgeModelPdpCtaGoLinkProofPackV1,
  writeBuckpartsFridgeModelPdpCtaGoLinkProofArtifactsV1,
} from "./lib/buckparts-fridge-model-pdp-cta-go-link-proof-pack-v1";

const REPO_ROOT = path.resolve(path.join(path.dirname(fileURLToPath(import.meta.url)), ".."));

async function main(): Promise<void> {
  const writeArtifacts = process.argv.includes("--write-artifacts");
  const report = await buildBuckpartsFridgeModelPdpCtaGoLinkProofPackV1({
    rootDir: REPO_ROOT,
  });

  if (writeArtifacts) {
    const written = writeBuckpartsFridgeModelPdpCtaGoLinkProofArtifactsV1({
      rootDir: REPO_ROOT,
      report,
    });
    process.stderr.write(
      `Wrote ${written.json_rel_path} and ${written.md_rel_path} (read-only; PASS=${String(report.summary.SAFE_BUYER_PATH_PASS)}; FAIL=${String(report.summary.SAFE_BUYER_PATH_FAIL)}; UNKNOWN=${String(report.summary.SAFE_BUYER_PATH_UNKNOWN)}).\n`,
    );
  }

  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

main().catch((err) => {
  process.stderr.write(`${err instanceof Error ? err.stack ?? err.message : String(err)}\n`);
  process.exitCode = 1;
});
