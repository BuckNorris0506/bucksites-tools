#!/usr/bin/env node
/**
 * Guarded EDR4 buyer-path closable parity (CSV ↔ Supabase retailer_links).
 * Dry-run default. Write requires MUTATION + new Supabase-parity founder approval.
 *
 *   npm run buckparts:fridge-model-pdp-edr4-buyer-path-closable-parity -- --write-artifacts
 *   BUCKPARTS_IO_CAPABILITY=MUTATION npm run buckparts:fridge-model-pdp-edr4-buyer-path-closable-parity -- --write
 */

import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  applyEdr4BuyerPathClosableParityWriteV1,
  buildEdr4BuyerPathClosableParityReportV1,
  BUCKPARTS_FRIDGE_MODEL_PDP_EDR4_BUYER_PATH_CLOSABLE_PARITY_CONTRACT_V1,
  BUCKPARTS_FRIDGE_MODEL_PDP_EDR4_BUYER_PATH_CLOSABLE_PARITY_WRITE_COMMAND_V1,
  parseEdr4BuyerPathClosableParityCliArgsV1,
  planEdr4BuyerPathClosableParityWriteOpsV1,
  writeEdr4BuyerPathClosableParityReportArtifactV1,
} from "./lib/buckparts-fridge-model-pdp-edr4-buyer-path-closable-parity-v1";

const REPO_ROOT = path.resolve(path.join(path.dirname(fileURLToPath(import.meta.url)), ".."));

async function main(): Promise<void> {
  const { write, writeArtifacts } = parseEdr4BuyerPathClosableParityCliArgsV1(process.argv.slice(2));
  const mode = write ? "write" : "dry_run";

  const report = await buildEdr4BuyerPathClosableParityReportV1({
    rootDir: REPO_ROOT,
    mode,
  });

  let artifactRel: string | null = null;
  if (writeArtifacts || write) {
    artifactRel = writeEdr4BuyerPathClosableParityReportArtifactV1({
      rootDir: REPO_ROOT,
      report,
    });
    process.stderr.write(`Wrote ${artifactRel}\n`);
  }

  const ops = planEdr4BuyerPathClosableParityWriteOpsV1(report);

  process.stderr.write(
    `${report.contract}: mode=${report.mode} all_in_parity=${String(report.all_in_parity)} planned=${String(report.row_count_planned)} mutation_authorized=${String(report.mutation_authorized)} blockers=${String(report.blockers.length)} invent_link_authorized=${String(report.invent_link_authorized)}\n`,
  );

  if (write) {
    if (!report.mutation_authorized) {
      process.stderr.write(
        `WRITE BLOCKED: ${report.blockers.join("; ") || "mutation_authorized=false"}\n`,
      );
      process.stderr.write(`Use: ${BUCKPARTS_FRIDGE_MODEL_PDP_EDR4_BUYER_PATH_CLOSABLE_PARITY_WRITE_COMMAND_V1}\n`);
      process.stdout.write(`${JSON.stringify({ report, ops, applied: false }, null, 2)}\n`);
      process.exitCode = 1;
      return;
    }
    const applied = await applyEdr4BuyerPathClosableParityWriteV1({
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

  if (report.contract !== BUCKPARTS_FRIDGE_MODEL_PDP_EDR4_BUYER_PATH_CLOSABLE_PARITY_CONTRACT_V1) {
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
