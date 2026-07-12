#!/usr/bin/env node
/**
 * Guarded GSWF Supabase compatibility sync executor — default dry-run; optional --apply.
 *
 *   npm run buckparts:gswf-wrong-part-repair-supabase-compat-sync-guarded-apply -- --dry-run --write-artifacts
 *   npm run buckparts:gswf-wrong-part-repair-supabase-compat-sync-guarded-apply -- --apply
 *
 * Apply remains fail-closed unless ALL of:
 *   - matching founder approval (approve_supabase_compat_sync_plan + bound plan sha)
 *   - exact pending 13/26/13 conflict plan shape with exclusions untouched
 *   - BUCKPARTS_GSWF_SUPABASE_COMPAT_SYNC_MUTATION_ENABLED=1
 *
 * Post-apply IN_SYNC=13 plans report ALREADY_IN_SYNC and never re-apply deltas.
 * Dry-run never mutates Supabase or CSV.
 */

import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  runGswfWrongPartRepairSupabaseCompatSyncGuardedApplyV1,
  writeGswfWrongPartRepairSupabaseCompatSyncGuardedDryRunArtifactsV1,
} from "./lib/gswf-wrong-part-repair-supabase-compat-sync-guarded-apply-v1";

const REPO_ROOT = path.resolve(path.join(path.dirname(fileURLToPath(import.meta.url)), ".."));

async function main(): Promise<void> {
  const mode = process.argv.includes("--apply") ? "apply" : "dry_run";
  const writeArtifacts =
    process.argv.includes("--write-artifacts") || process.argv.includes("--write-report");

  const report = await runGswfWrongPartRepairSupabaseCompatSyncGuardedApplyV1({
    rootDir: REPO_ROOT,
    mode,
  });

  if (writeArtifacts || mode === "apply") {
    const written = writeGswfWrongPartRepairSupabaseCompatSyncGuardedDryRunArtifactsV1({
      rootDir: REPO_ROOT,
      report,
    });
    process.stderr.write(
      `Wrote ${written.json_rel_path} and ${written.md_rel_path} (mode=${mode}; apply_status=${report.apply_status}; plan_sync_state=${report.plan_sync_state}; data_mutation=${String(report.data_mutation)}; supabase_mutation_authorized=${String(report.supabase_mutation_authorized)}).\n`,
    );
  }

  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);

  if (report.apply_status === "BLOCKED") {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  process.stderr.write(`${err instanceof Error ? err.stack ?? err.message : String(err)}\n`);
  process.exitCode = 1;
});
