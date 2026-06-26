#!/usr/bin/env node
/**
 * Read-only BuckParts execution ledger — completed operational work from committed artifacts.
 *
 *   npm run buckparts:execution-ledger
 */

import { fileURLToPath } from "node:url";
import path from "node:path";

import {
  BUCKPARTS_EXECUTION_LEDGER_CONTRACT_V1,
  buildBuckpartsExecutionLedgerReportV1,
  writeBuckpartsExecutionLedgerArtifactsV1,
} from "./lib/buckparts-execution-ledger-v1";

const REPO_ROOT = path.resolve(path.join(path.dirname(fileURLToPath(import.meta.url)), ".."));

function main(): void {
  const report = buildBuckpartsExecutionLedgerReportV1({ rootDir: REPO_ROOT });
  const written = writeBuckpartsExecutionLedgerArtifactsV1({
    rootDir: REPO_ROOT,
    report,
  });

  process.stderr.write(
    `Wrote ${written.jsonRelPath} (read-only index; no CSV/Supabase/production mutation).\n`,
  );
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);

  if (report.contract !== BUCKPARTS_EXECUTION_LEDGER_CONTRACT_V1) {
    process.exit(2);
  }
}

main();
