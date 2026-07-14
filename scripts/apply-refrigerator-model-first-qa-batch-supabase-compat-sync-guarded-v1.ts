#!/usr/bin/env node
/**
 * Guarded refrigerator model-first QA batch Supabase compatibility sync executor — default dry-run; optional --apply.
 *
 *   npm run buckparts:refrigerator-model-first-qa-batch-supabase-compat-sync-guarded-apply:dry-run
 *   npm run buckparts:refrigerator-model-first-qa-batch-supabase-compat-sync-guarded-apply -- --dry-run --write-artifacts
 *   npm run buckparts:refrigerator-model-first-qa-batch-supabase-compat-sync-guarded-apply -- --apply
 *
 * Apply remains fail-closed unless ALL of:
 *   - matching founder approval for this exact plan
 *   - exact pending 20 slugs / 53 removals / 0 additions
 *   - BUCKPARTS_REFRIGERATOR_QA_BATCH_SUPABASE_COMPAT_SYNC_MUTATION_ENABLED=1
 *
 * Already-applied / live-in-sync plans report ALREADY_APPLIED and never rewrite.
 * Dry-run never mutates Supabase or CSV.
 */

import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  runRefrigeratorModelFirstQaBatchSupabaseCompatSyncGuardedApplyV1,
  writeRefrigeratorModelFirstQaBatchSupabaseCompatSyncGuardedDryRunArtifactsV1,
} from "./lib/refrigerator-model-first-qa-batch-supabase-compat-sync-guarded-apply-v1";

const REPO_ROOT = path.resolve(path.join(path.dirname(fileURLToPath(import.meta.url)), ".."));

async function main(): Promise<void> {
  const mode = process.argv.includes("--apply") ? "apply" : "dry_run";
  const writeArtifacts =
    process.argv.includes("--write-artifacts") ||
    process.argv.includes("--write-report") ||
    mode === "dry_run";

  const report = await runRefrigeratorModelFirstQaBatchSupabaseCompatSyncGuardedApplyV1({
    rootDir: REPO_ROOT,
    mode,
  });

  if (writeArtifacts || mode === "apply") {
    const written = writeRefrigeratorModelFirstQaBatchSupabaseCompatSyncGuardedDryRunArtifactsV1({
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
