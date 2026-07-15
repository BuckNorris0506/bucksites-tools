#!/usr/bin/env node
/**
 * Guarded GE MWFP/XWFE Supabase retailer_links sync apply.
 * Dry-run default. Write requires MUTATION + matching founder approval.
 *
 *   npm run buckparts:fridge-model-pdp-ge-mwfp-xwfe-retailer-links-supabase-sync-apply -- --write-artifacts
 *   BUCKPARTS_IO_CAPABILITY=MUTATION npm run buckparts:fridge-model-pdp-ge-mwfp-xwfe-retailer-links-supabase-sync-apply -- --write
 */

import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  applyGeMwfpXwfeSupabaseSyncWriteV1,
  buildGeMwfpXwfeSupabaseSyncApplyReportV1,
  BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_SYNC_APPLY_WRITE_COMMAND_V1,
  parseGeMwfpXwfeSupabaseSyncApplyArgvV1,
  writeGeMwfpXwfeSupabaseSyncApplyReportArtifactsV1,
} from "./lib/buckparts-fridge-model-pdp-ge-mwfp-xwfe-retailer-links-supabase-sync-apply-v1";

const REPO_ROOT = path.resolve(path.join(path.dirname(fileURLToPath(import.meta.url)), ".."));

async function main(): Promise<void> {
  const { write, writeArtifacts } = parseGeMwfpXwfeSupabaseSyncApplyArgvV1(process.argv.slice(2));
  const mode = write ? "write" : "dry_run";

  const report = await buildGeMwfpXwfeSupabaseSyncApplyReportV1({
    rootDir: REPO_ROOT,
    mode,
  });

  if (writeArtifacts || write) {
    const written = writeGeMwfpXwfeSupabaseSyncApplyReportArtifactsV1({
      rootDir: REPO_ROOT,
      report,
    });
    process.stderr.write(`Wrote ${written.json_rel_path} and ${written.md_rel_path}\n`);
  }

  process.stderr.write(
    `${report.contract}: mode=${report.mode} planned=${String(report.row_count_planned)} mutation_authorized=${String(report.mutation_authorized)} blockers=${String(report.blockers.length)} founder=${String(report.founder_approval_present)}\n`,
  );

  if (write) {
    if (!report.mutation_authorized) {
      process.stderr.write(
        `WRITE BLOCKED: ${report.blockers.join("; ") || "mutation_authorized=false"}\n`,
      );
      process.stderr.write(
        `Use: ${BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_SYNC_APPLY_WRITE_COMMAND_V1}\n`,
      );
      process.stdout.write(`${JSON.stringify({ report, applied: false }, null, 2)}\n`);
      process.exitCode = 1;
      return;
    }

    const applied = await applyGeMwfpXwfeSupabaseSyncWriteV1({
      rootDir: REPO_ROOT,
      report,
    });
    process.stderr.write(
      `APPLIED: updated=${String(applied.updated)} inserted=${String(applied.inserted)} deleted=${String(applied.deleted)} closeout=${applied.closeout_json_rel}\n`,
    );
    process.stdout.write(`${JSON.stringify({ applied, report }, null, 2)}\n`);
    return;
  }

  process.stdout.write(`${JSON.stringify({ report }, null, 2)}\n`);
  if (report.supabase_truth_status === "UNKNOWN_DB_UNAVAILABLE") {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  process.stderr.write(`${err instanceof Error ? err.stack ?? err.message : String(err)}\n`);
  process.exit(1);
});
