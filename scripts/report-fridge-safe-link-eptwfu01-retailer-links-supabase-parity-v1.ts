#!/usr/bin/env node
/**
 * eptwfu01 only — scoped fridge retailer_links CSV ↔ Supabase parity.
 * Dry-run default. Write requires BUCKPARTS_IO_CAPABILITY=MUTATION and founder approval.
 *
 *   npm run buckparts:fridge-safe-link-eptwfu01-retailer-links-supabase-parity
 *   BUCKPARTS_IO_CAPABILITY=MUTATION npm run buckparts:fridge-safe-link-eptwfu01-retailer-links-supabase-parity -- --write
 */

import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  applyEptwfu01FridgeRetailerLinksWriteV1,
  buildEptwfu01FridgeRetailerLinksParityReportV1,
  eptwfu01FridgeRetailerLinksWriteCommandV1,
  FRIDGE_SAFE_LINK_EPTWFU01_RETAILER_LINKS_PARITY_CONTRACT_V1,
  parseEptwfu01FridgeRetailerLinksCliArgsV1,
  planEptwfu01WriteOpsV1,
  writeEptwfu01ParityReportArtifactV1,
} from "./lib/fridge-safe-link-eptwfu01-retailer-links-supabase-parity-v1";

const REPO_ROOT = path.resolve(path.join(path.dirname(fileURLToPath(import.meta.url)), ".."));

async function main(): Promise<void> {
  const { write } = parseEptwfu01FridgeRetailerLinksCliArgsV1(process.argv.slice(2));
  const mode = write ? "write" : "dry_run";

  const report = await buildEptwfu01FridgeRetailerLinksParityReportV1({
    rootDir: REPO_ROOT,
    mode,
  });

  const artifactRel = writeEptwfu01ParityReportArtifactV1({
    rootDir: REPO_ROOT,
    report,
  });

  const ops = planEptwfu01WriteOpsV1(report);

  process.stderr.write(
    `${report.contract}: mode=${report.mode} all_in_parity=${String(report.all_in_parity)} planned=${String(report.row_count_planned)} mutation_authorized=${String(report.mutation_authorized)} blockers=${String(report.blockers.length)}\n`,
  );
  process.stderr.write(`Wrote ${artifactRel}\n`);

  if (write) {
    if (!report.mutation_authorized) {
      process.stderr.write(
        `WRITE BLOCKED: ${report.blockers.join("; ") || "mutation_authorized=false"}\n`,
      );
      process.stderr.write(`Use: ${eptwfu01FridgeRetailerLinksWriteCommandV1()}\n`);
      process.stdout.write(`${JSON.stringify({ report, ops, applied: false }, null, 2)}\n`);
      process.exitCode = 1;
      return;
    }
    const applied = await applyEptwfu01FridgeRetailerLinksWriteV1({
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

  if (report.contract !== FRIDGE_SAFE_LINK_EPTWFU01_RETAILER_LINKS_PARITY_CONTRACT_V1) {
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
