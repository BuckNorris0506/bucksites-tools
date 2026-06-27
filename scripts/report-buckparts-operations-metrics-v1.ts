#!/usr/bin/env node
/**
 * BuckParts Operations Metrics v1 — read-only operating system measurement.
 *
 *   npm run buckparts:operations-metrics
 *   npm run buckparts:operations-metrics -- --record-snapshot
 */

import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  BUCKPARTS_OPERATIONS_METRICS_CONTRACT_V1,
  refreshOperationsMetricsV1,
} from "./lib/buckparts-operations-metrics-v1";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const recordSnapshot = process.argv.includes("--record-snapshot");

const { report, history_rel_path } = refreshOperationsMetricsV1({
  rootDir,
  recordSnapshot,
  trigger_source: recordSnapshot
    ? "npm run buckparts:operations-metrics -- --record-snapshot"
    : "npm run buckparts:operations-metrics",
});

if (history_rel_path) {
  process.stderr.write(`Appended snapshot to ${history_rel_path} (metrics history only; no product mutation).\n`);
}

process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);

if (report.contract !== BUCKPARTS_OPERATIONS_METRICS_CONTRACT_V1) {
  process.exit(2);
}
