#!/usr/bin/env node
/**
 * Read-only manufacturer browser proof execution factory.
 *
 *   npm run buckparts:manufacturer-browser-proof-execution-factory
 */

import { fileURLToPath } from "node:url";
import path from "node:path";

import {
  EXECUTION_LEDGER_TRIGGER_MANUFACTURER_BROWSER_PROOF_EXECUTION_FACTORY_V1,
  refreshBuckpartsExecutionLedgerV1,
} from "./lib/buckparts-execution-ledger-v1";
import {
  buildManufacturerBrowserProofExecutionFactoryV1,
  MANUFACTURER_BROWSER_PROOF_EXECUTION_FACTORY_CONTRACT_V1,
  writeManufacturerBrowserProofExecutionFactoryArtifactsV1,
} from "./lib/manufacturer-browser-proof-execution-factory-v1";

const REPO_ROOT = path.resolve(path.join(path.dirname(fileURLToPath(import.meta.url)), ".."));

function main(): void {
  const report = buildManufacturerBrowserProofExecutionFactoryV1({ rootDir: REPO_ROOT });
  const written = writeManufacturerBrowserProofExecutionFactoryArtifactsV1({
    rootDir: REPO_ROOT,
    report,
  });

  process.stderr.write(
    `Wrote ${written.factoryJsonRelPath} and ${written.factoryMdRelPath} (read-only execution packets; intake_complete=${String(report.intake_complete)}).\n`,
  );
  process.stderr.write(
    `Prepared ${String(report.manufacturer_execution_batch_count)} manufacturer execution manifest(s), ${String(report.ge_normalization_packets.length)} GE normalization packet(s) (auto_pass_forbidden=true).\n`,
  );

  const ledger = refreshBuckpartsExecutionLedgerV1({
    rootDir: REPO_ROOT,
    trigger_source: EXECUTION_LEDGER_TRIGGER_MANUFACTURER_BROWSER_PROOF_EXECUTION_FACTORY_V1,
  });
  process.stderr.write(`Refreshed ${ledger.jsonRelPath} (execution ledger; read-only index).\n`);

  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);

  if (report.contract !== MANUFACTURER_BROWSER_PROOF_EXECUTION_FACTORY_CONTRACT_V1) {
    process.exit(2);
  }
}

main();
