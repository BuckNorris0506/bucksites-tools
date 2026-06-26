#!/usr/bin/env node
/**
 * Read-only manufacturer browser proof factory — batched capture planning at scale.
 *
 *   npm run buckparts:manufacturer-browser-proof-factory
 */

import { fileURLToPath } from "node:url";
import path from "node:path";

import {
  buildManufacturerBrowserProofFactoryV1,
  MANUFACTURER_BROWSER_PROOF_FACTORY_CONTRACT_V1,
  writeManufacturerBrowserProofFactoryArtifactsV1,
} from "./lib/manufacturer-browser-proof-factory-v1";
import {
  EXECUTION_LEDGER_TRIGGER_MANUFACTURER_BROWSER_PROOF_FACTORY_V1,
  refreshBuckpartsExecutionLedgerV1,
} from "./lib/buckparts-execution-ledger-v1";

const REPO_ROOT = path.resolve(path.join(path.dirname(fileURLToPath(import.meta.url)), ".."));

function main(): void {
  const { report, normalization_drafts } = buildManufacturerBrowserProofFactoryV1({
    rootDir: REPO_ROOT,
  });
  const written = writeManufacturerBrowserProofFactoryArtifactsV1({
    rootDir: REPO_ROOT,
    report,
    normalization_drafts,
  });

  process.stderr.write(
    `Wrote ${written.factoryJsonRelPath}, ${written.captureQueueMdRelPath}, ${written.ownerWorkPacketMdRelPath}, ${String(written.captureBatchRelPaths.length)} capture batch(es), ${String(written.normalizationDraftRelPaths.length)} normalization draft(s) (read-only; no mutation authorized).\n`,
  );

  const ledger = refreshBuckpartsExecutionLedgerV1({
    rootDir: REPO_ROOT,
    trigger_source: EXECUTION_LEDGER_TRIGGER_MANUFACTURER_BROWSER_PROOF_FACTORY_V1,
  });
  process.stderr.write(`Refreshed ${ledger.jsonRelPath} (execution ledger; read-only index).\n`);

  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);

  if (report.contract !== MANUFACTURER_BROWSER_PROOF_FACTORY_CONTRACT_V1) {
    process.exit(2);
  }
}

main();
