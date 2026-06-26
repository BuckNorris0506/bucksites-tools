#!/usr/bin/env node
/**
 * Read-only manufacturer browser proof refresh orchestrator.
 *
 *   npm run buckparts:manufacturer-browser-proof-refresh-orchestrator
 */

import { fileURLToPath } from "node:url";
import path from "node:path";

import {
  buildManufacturerBrowserProofRefreshOrchestratorV1,
  MANUFACTURER_BROWSER_PROOF_REFRESH_ORCHESTRATOR_CONTRACT_V1,
  writeManufacturerBrowserProofRefreshOrchestratorArtifactsV1,
} from "./lib/manufacturer-browser-proof-refresh-orchestrator-v1";
import {
  EXECUTION_LEDGER_TRIGGER_MANUFACTURER_BROWSER_PROOF_REFRESH_ORCHESTRATOR_V1,
  refreshBuckpartsExecutionLedgerV1,
} from "./lib/buckparts-execution-ledger-v1";

const REPO_ROOT = path.resolve(path.join(path.dirname(fileURLToPath(import.meta.url)), ".."));

function main(): void {
  const report = buildManufacturerBrowserProofRefreshOrchestratorV1({ rootDir: REPO_ROOT });
  const written = writeManufacturerBrowserProofRefreshOrchestratorArtifactsV1({
    rootDir: REPO_ROOT,
    report,
  });

  process.stderr.write(
    `Wrote ${written.orchestratorJsonRelPath}, ${written.orchestratorMdRelPath}, and ${String(written.refreshBatchRelPaths.length)} manufacturer refresh batch(es) (read-only; no mutation authorized).\n`,
  );
  process.stderr.write(
    `Scheduled ${String(report.scheduled_slug_count)} slug(s) across ${String(report.manufacturer_refresh_batch_count)} manufacturer batch(es).\n`,
  );

  const ledger = refreshBuckpartsExecutionLedgerV1({
    rootDir: REPO_ROOT,
    trigger_source: EXECUTION_LEDGER_TRIGGER_MANUFACTURER_BROWSER_PROOF_REFRESH_ORCHESTRATOR_V1,
  });
  process.stderr.write(`Refreshed ${ledger.jsonRelPath} (execution ledger; read-only index).\n`);

  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);

  if (report.contract !== MANUFACTURER_BROWSER_PROOF_REFRESH_ORCHESTRATOR_CONTRACT_V1) {
    process.exit(2);
  }
}

main();
