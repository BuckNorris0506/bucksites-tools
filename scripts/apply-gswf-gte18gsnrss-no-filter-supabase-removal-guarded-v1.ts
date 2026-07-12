#!/usr/bin/env node
/**
 * Guarded ge-gte18gsnrss no-filter Supabase removal executor — default dry-run; optional --apply.
 *
 *   npm run buckparts:gswf-gte18gsnrss-no-filter-supabase-removal-guarded-apply:dry-run
 *   npm run buckparts:gswf-gte18gsnrss-no-filter-supabase-removal-guarded-apply -- --apply
 *
 * Apply remains fail-closed unless ALL of:
 *   - matching founder approval for this exact plan
 *   - exact pending 1 slug / 2 removals / 0 additions
 *   - BUCKPARTS_GSWF_GTE18GSNRSS_NO_FILTER_SUPABASE_REMOVAL_MUTATION_ENABLED=1
 *
 * Already-applied plans report ALREADY_APPLIED and never re-remove rows.
 * Dry-run never mutates Supabase or CSV.
 */

import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  runGswfGte18gsnrssNoFilterSupabaseRemovalGuardedApplyV1,
  writeGswfGte18gsnrssNoFilterSupabaseRemovalGuardedDryRunArtifactsV1,
} from "./lib/gswf-gte18gsnrss-no-filter-supabase-removal-guarded-apply-v1";

const REPO_ROOT = path.resolve(path.join(path.dirname(fileURLToPath(import.meta.url)), ".."));

async function main(): Promise<void> {
  const mode = process.argv.includes("--apply") ? "apply" : "dry_run";
  const writeArtifacts =
    process.argv.includes("--write-artifacts") ||
    process.argv.includes("--write-report") ||
    mode === "dry_run";

  const report = await runGswfGte18gsnrssNoFilterSupabaseRemovalGuardedApplyV1({
    rootDir: REPO_ROOT,
    mode,
  });

  if (writeArtifacts || mode === "apply") {
    const written = writeGswfGte18gsnrssNoFilterSupabaseRemovalGuardedDryRunArtifactsV1({
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
