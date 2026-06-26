#!/usr/bin/env node
/**
 * Read-only manufacturer safe-link rescue runner — deterministic execution plans from CC director lane.
 *
 *   npm run buckparts:manufacturer-safe-link-rescue-runner
 */

import { fileURLToPath } from "node:url";
import path from "node:path";

import {
  buildManufacturerSafeLinkRescueRunnerV1,
  MANUFACTURER_SAFE_LINK_RESCUE_RUNNER_CONTRACT_V1,
  writeManufacturerSafeLinkRescueRunnerArtifactsV1,
} from "./lib/manufacturer-safe-link-rescue-runner-v1";
import {
  EXECUTION_LEDGER_TRIGGER_MANUFACTURER_RESCUE_RUNNER_V1,
  refreshBuckpartsExecutionLedgerV1,
} from "./lib/buckparts-execution-ledger-v1";

const REPO_ROOT = path.resolve(path.join(path.dirname(fileURLToPath(import.meta.url)), ".."));

function main(): void {
  const report = buildManufacturerSafeLinkRescueRunnerV1({ rootDir: REPO_ROOT });
  const written = writeManufacturerSafeLinkRescueRunnerArtifactsV1({
    rootDir: REPO_ROOT,
    report,
  });

  process.stderr.write(
    `Wrote ${written.jsonRelPath} and ${written.mdRelPath} (read-only; no mutation authorized).\n`,
  );

  const ledger = refreshBuckpartsExecutionLedgerV1({
    rootDir: REPO_ROOT,
    trigger_source: EXECUTION_LEDGER_TRIGGER_MANUFACTURER_RESCUE_RUNNER_V1,
  });
  process.stderr.write(`Refreshed ${ledger.jsonRelPath} (execution ledger; read-only index).\n`);

  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);

  if (report.contract !== MANUFACTURER_SAFE_LINK_RESCUE_RUNNER_CONTRACT_V1) {
    process.exit(2);
  }
}

main();
