#!/usr/bin/env node
/**
 * Guarded Samsung PASS 5 Supabase compatibility sync executor — default dry-run; optional --apply.
 *
 *   npm run buckparts:samsung-pass-repair-supabase-compat-sync-guarded-apply:dry-run
 *   npm run buckparts:samsung-pass-repair-supabase-compat-sync-guarded-apply -- --dry-run --write-artifacts
 *   npm run buckparts:samsung-pass-repair-supabase-compat-sync-guarded-apply -- --apply
 *
 * Apply remains fail-closed unless ALL of:
 *   - matching founder approval for this exact plan
 *   - exact pending 5 slugs / 6 removals / 5 additions
 *   - BUCKPARTS_SAMSUNG_PASS_SUPABASE_COMPAT_SYNC_MUTATION_ENABLED=1
 *
 * Already-applied / live-in-sync plans report ALREADY_APPLIED and never rewrite.
 * Dry-run never mutates Supabase or CSV.
 */

import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  runSamsungPassRepairSupabaseCompatSyncGuardedApplyV1,
  writeSamsungPassRepairSupabaseCompatSyncGuardedDryRunArtifactsV1,
} from "./lib/samsung-pass-repair-supabase-compat-sync-guarded-apply-v1";

const REPO_ROOT = path.resolve(path.join(path.dirname(fileURLToPath(import.meta.url)), ".."));

async function main(): Promise<void> {
  const mode = process.argv.includes("--apply") ? "apply" : "dry_run";
  const writeArtifacts =
    process.argv.includes("--write-artifacts") ||
    process.argv.includes("--write-report") ||
    mode === "dry_run";

  const report = await runSamsungPassRepairSupabaseCompatSyncGuardedApplyV1({
    rootDir: REPO_ROOT,
    mode,
  });

  if (writeArtifacts || mode === "apply") {
    const written = writeSamsungPassRepairSupabaseCompatSyncGuardedDryRunArtifactsV1({
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
