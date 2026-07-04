#!/usr/bin/env node
/**
 * Coverage Batch A — scoped fridge retailer_links CSV ↔ Supabase parity.
 * Dry-run default. Write requires BUCKPARTS_IO_CAPABILITY=MUTATION and founder approvals.
 *
 *   npm run buckparts:coverage-batch-a-fridge-retailer-links-supabase-parity
 *   BUCKPARTS_IO_CAPABILITY=MUTATION npm run buckparts:coverage-batch-a-fridge-retailer-links-supabase-parity -- --write
 */

import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  applyCoverageBatchAFridgeRetailerLinksWriteV1,
  buildCoverageBatchAFridgeRetailerLinksParityReportV1,
  COVERAGE_BATCH_A_FRIDGE_RETAILER_LINKS_PARITY_CONTRACT_V1,
  coverageBatchAFridgeRetailerLinksWriteCommandV1,
  parseCoverageBatchAFridgeRetailerLinksCliArgsV1,
  planCoverageBatchAWriteOpsV1,
  writeCoverageBatchAParityReportArtifactV1,
} from "./lib/coverage-batch-a-fridge-retailer-links-supabase-parity-v1";

const REPO_ROOT = path.resolve(path.join(path.dirname(fileURLToPath(import.meta.url)), ".."));

async function main(): Promise<void> {
  const { write } = parseCoverageBatchAFridgeRetailerLinksCliArgsV1(process.argv.slice(2));
  const mode = write ? "write" : "dry_run";

  const report = await buildCoverageBatchAFridgeRetailerLinksParityReportV1({
    rootDir: REPO_ROOT,
    mode,
  });

  const artifactRel = writeCoverageBatchAParityReportArtifactV1({
    rootDir: REPO_ROOT,
    report,
  });

  const ops = planCoverageBatchAWriteOpsV1(report);

  process.stderr.write(
    `${report.contract}: mode=${report.mode} all_in_parity=${String(report.all_in_parity)} planned=${String(report.row_count_planned)} mutation_authorized=${String(report.mutation_authorized)} blockers=${String(report.blockers.length)}\n`,
  );
  process.stderr.write(`Wrote ${artifactRel}\n`);

  if (write) {
    if (!report.mutation_authorized) {
      process.stderr.write(
        `WRITE BLOCKED: ${report.blockers.join("; ") || "mutation_authorized=false"}\n`,
      );
      process.stderr.write(`Use: ${coverageBatchAFridgeRetailerLinksWriteCommandV1()}\n`);
      process.stdout.write(`${JSON.stringify({ report, ops, applied: false }, null, 2)}\n`);
      process.exitCode = 1;
      return;
    }
    const applied = await applyCoverageBatchAFridgeRetailerLinksWriteV1({
      rootDir: REPO_ROOT,
      report,
    });
    process.stderr.write(
      `APPLIED: inserted=${String(applied.inserted)} updated=${String(applied.updated)} closeout=${applied.closeout_rel}\n`,
    );
    process.stdout.write(
      `${JSON.stringify({ report: { ...report, data_mutation: true }, ops, applied }, null, 2)}\n`,
    );
    return;
  }

  process.stdout.write(`${JSON.stringify({ report, ops }, null, 2)}\n`);

  if (report.contract !== COVERAGE_BATCH_A_FRIDGE_RETAILER_LINKS_PARITY_CONTRACT_V1) {
    process.exitCode = 2;
    return;
  }
  if (report.supabase_truth_status === "UNKNOWN_DB_UNAVAILABLE") {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
