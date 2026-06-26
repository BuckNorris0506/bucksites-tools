#!/usr/bin/env node
/**
 * Read-only manufacturer safe-link rescue readiness gate — promotion contract before Runner.
 *
 *   npm run buckparts:manufacturer-safe-link-rescue-readiness-gate
 */

import { fileURLToPath } from "node:url";
import path from "node:path";

import {
  buildManufacturerSafeLinkRescueReadinessGateV1,
  MANUFACTURER_SAFE_LINK_RESCUE_READINESS_GATE_CONTRACT_V1,
  writeManufacturerSafeLinkRescueReadinessGateArtifactsV1,
} from "./lib/manufacturer-safe-link-rescue-readiness-gate-v1";

const REPO_ROOT = path.resolve(path.join(path.dirname(fileURLToPath(import.meta.url)), ".."));

function main(): void {
  const report = buildManufacturerSafeLinkRescueReadinessGateV1({ rootDir: REPO_ROOT });
  const written = writeManufacturerSafeLinkRescueReadinessGateArtifactsV1({
    rootDir: REPO_ROOT,
    report,
  });

  process.stderr.write(
    `Wrote ${written.jsonRelPath} and ${written.mdRelPath} (read-only; no mutation authorized).\n`,
  );

  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);

  if (report.contract !== MANUFACTURER_SAFE_LINK_RESCUE_READINESS_GATE_CONTRACT_V1) {
    process.exit(2);
  }
}

main();
