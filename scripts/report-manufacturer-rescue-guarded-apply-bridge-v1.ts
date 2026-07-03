#!/usr/bin/env node
/**
 * Manufacturer Rescue Guarded Apply Bridge v1 — dry-run by default.
 *
 *   npm run buckparts:manufacturer-rescue-guarded-apply-bridge
 *   npm run buckparts:manufacturer-rescue-guarded-apply-bridge -- --slug edr3rxd1
 *   npm run buckparts:manufacturer-rescue-guarded-apply-bridge -- --slug edr3rxd1 --write-csv
 */

import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  MANUFACTURER_RESCUE_GUARDED_APPLY_BRIDGE_CONTRACT_V1,
  parseManufacturerRescueGuardedApplyBridgeCliArgsV1,
  runManufacturerRescueGuardedApplyBridgeV1,
} from "./lib/manufacturer-rescue-guarded-apply-bridge-v1";

const REPO_ROOT = path.resolve(path.join(path.dirname(fileURLToPath(import.meta.url)), ".."));

function main(): void {
  const { writeCsv, targetSlug } = parseManufacturerRescueGuardedApplyBridgeCliArgsV1(
    process.argv.slice(2),
  );
  const report = runManufacturerRescueGuardedApplyBridgeV1({
    rootDir: REPO_ROOT,
    writeCsv,
    targetSlug,
  });

  process.stderr.write(
    `${report.bridge_status}: ready_slug=${String(report.ready_slug)} write_csv_applied=${String(report.write_csv_applied)} blockers=${String(report.blockers.length)}\n`,
  );
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);

  if (report.contract !== MANUFACTURER_RESCUE_GUARDED_APPLY_BRIDGE_CONTRACT_V1) {
    process.exitCode = 2;
    return;
  }
  if (report.bridge_status === "BLOCKED") {
    process.exitCode = 1;
  }
}

main();
