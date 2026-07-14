#!/usr/bin/env node
/**
 * Read-only buyer-path research packet (6 NEEDS_EXTERNAL_RESEARCH GE slugs).
 *
 *   npm run buckparts:fridge-model-pdp-buyer-path-research-packet
 *   npm run buckparts:fridge-model-pdp-buyer-path-research-packet -- --write-artifacts
 */

import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildBuckpartsFridgeModelPdpBuyerPathResearchPacketV1,
  writeBuckpartsFridgeModelPdpBuyerPathResearchPacketArtifactsV1,
} from "./lib/buckparts-fridge-model-pdp-buyer-path-research-packet-v1";

const REPO_ROOT = path.resolve(path.join(path.dirname(fileURLToPath(import.meta.url)), ".."));

function main(): void {
  const writeArtifacts = process.argv.includes("--write-artifacts");
  const report = buildBuckpartsFridgeModelPdpBuyerPathResearchPacketV1({
    rootDir: REPO_ROOT,
  });

  if (writeArtifacts) {
    const written = writeBuckpartsFridgeModelPdpBuyerPathResearchPacketArtifactsV1({
      rootDir: REPO_ROOT,
      report,
    });
    process.stderr.write(
      `Wrote ${written.json_rel_path} and ${written.md_rel_path} (read-only; OWNER_BROWSER=${String(report.summary.NEEDS_OWNER_BROWSER_PROOF)}; RESEARCH=${String(report.summary.NEEDS_EXTERNAL_RESEARCH)}; REMAIN_NO_BUY=${String(report.summary.REMAIN_NO_BUY)}).\n`,
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
