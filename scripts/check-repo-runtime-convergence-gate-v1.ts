/**
 * CLI for repo_runtime_convergence_gate_v1.
 * Default audit mode: JSON stdout, exit 0.
 * --enforce: exit 1 when BLOCKED; exit 0 for CONVERGED or EXPLICITLY_DIVERGED.
 */

import path from "node:path";
import { fileURLToPath } from "node:url";

import { buildRepoRuntimeConvergenceGateReportV1 } from "./lib/repo-runtime-convergence-gate-v1";
import {
  EXECUTION_LEDGER_TRIGGER_REPO_RUNTIME_CONVERGENCE_V1,
  refreshBuckpartsExecutionLedgerV1,
} from "./lib/buckparts-execution-ledger-v1";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function parseEnforceFlag(argv: string[]): boolean {
  return argv.includes("--enforce");
}

async function main(): Promise<void> {
  const enforce = parseEnforceFlag(process.argv.slice(2));
  const report = await buildRepoRuntimeConvergenceGateReportV1({
    rootDir,
    enforce,
  });

  const ledger = refreshBuckpartsExecutionLedgerV1({
    rootDir,
    trigger_source: EXECUTION_LEDGER_TRIGGER_REPO_RUNTIME_CONVERGENCE_V1,
  });
  process.stderr.write(`Refreshed ${ledger.jsonRelPath} (execution ledger; read-only index).\n`);

  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  process.exit(report.exit_code);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  const failure = {
    contract: "repo_runtime_convergence_gate_v1",
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    supabase_writes: false,
    enforce: parseEnforceFlag(process.argv.slice(2)),
    state: "BLOCKED",
    deploy_allowed: false,
    exit_code: parseEnforceFlag(process.argv.slice(2)) ? 1 : 0,
    block_reasons: [`gate_build_failed: ${message}`],
  };
  process.stdout.write(`${JSON.stringify(failure, null, 2)}\n`);
  process.exit(failure.exit_code);
});
