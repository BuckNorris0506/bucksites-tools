#!/usr/bin/env node
/**
 * Read-only Manufacturer Rescue throughput analytics KPI dashboard.
 *
 *   npm run buckparts:manufacturer-rescue-throughput-analytics
 */

import { fileURLToPath } from "node:url";
import path from "node:path";

import {
  EXECUTION_LEDGER_TRIGGER_MANUFACTURER_RESCUE_THROUGHPUT_ANALYTICS_V1,
  refreshBuckpartsExecutionLedgerV1,
} from "./lib/buckparts-execution-ledger-v1";
import {
  buildManufacturerRescueThroughputAnalyticsV1,
  MANUFACTURER_RESCUE_THROUGHPUT_ANALYTICS_CONTRACT_V1,
  writeManufacturerRescueThroughputAnalyticsArtifactsV1,
} from "./lib/manufacturer-rescue-throughput-analytics-v1";

const REPO_ROOT = path.resolve(path.join(path.dirname(fileURLToPath(import.meta.url)), ".."));

function main(): void {
  const report = buildManufacturerRescueThroughputAnalyticsV1({ rootDir: REPO_ROOT });
  const written = writeManufacturerRescueThroughputAnalyticsArtifactsV1({
    rootDir: REPO_ROOT,
    report,
  });

  process.stderr.write(
    `Wrote ${written.jsonRelPath} and ${written.mdRelPath} (read-only KPI dashboard; intake_complete=${String(report.intake_complete)}).\n`,
  );
  process.stderr.write(
    `Funnel: ${String(report.funnel_metrics.rescue_candidate_count)} candidates; furthest stage ${report.funnel_metrics.furthest_stage_reached}; top recommendation: ${report.recommended_highest_leverage_improvement.recommendation}\n`,
  );

  const ledger = refreshBuckpartsExecutionLedgerV1({
    rootDir: REPO_ROOT,
    trigger_source: EXECUTION_LEDGER_TRIGGER_MANUFACTURER_RESCUE_THROUGHPUT_ANALYTICS_V1,
  });
  process.stderr.write(`Refreshed ${ledger.jsonRelPath} (execution ledger; read-only index).\n`);

  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);

  if (report.contract !== MANUFACTURER_RESCUE_THROUGHPUT_ANALYTICS_CONTRACT_V1) {
    process.exit(2);
  }
}

main();
