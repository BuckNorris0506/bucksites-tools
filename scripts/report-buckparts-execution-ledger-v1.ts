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
  BUCKPARTS_EXECUTION_LEDGER_SOURCE_COMMAND_V1,
  refreshBuckpartsExecutionLedgerV1,
} from "./lib/buckparts-execution-ledger-v1";

const REPO_ROOT = path.resolve(path.join(path.dirname(fileURLToPath(import.meta.url)), ".."));

function main(): void {
  const { report, jsonRelPath } = refreshBuckpartsExecutionLedgerV1({
    rootDir: REPO_ROOT,
    trigger_source: BUCKPARTS_EXECUTION_LEDGER_SOURCE_COMMAND_V1,
  });

  process.stderr.write(
    `Wrote ${jsonRelPath} (read-only index; no CSV/Supabase/production mutation).\n`,
  );
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);

  if (report.contract !== BUCKPARTS_EXECUTION_LEDGER_CONTRACT_V1) {
    process.exit(2);
  }
}

main();
