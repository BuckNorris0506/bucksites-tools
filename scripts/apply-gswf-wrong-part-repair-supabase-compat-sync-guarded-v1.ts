#!/usr/bin/env node
/**
 * Guarded GSWF Supabase compatibility sync executor — default dry-run; optional --apply.
 *
 *   npm run buckparts:gswf-wrong-part-repair-supabase-compat-sync-guarded-apply -- --dry-run --write-artifacts
 *   npm run buckparts:gswf-wrong-part-repair-supabase-compat-sync-guarded-apply -- --apply
 *
 * Apply is blocked unless a future founder approval artifact exists and matches this exact plan.
 * This executor never mutates Supabase or CSV (mutation surface disabled even after approval).
 */

import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  runGswfWrongPartRepairSupabaseCompatSyncGuardedApplyV1,
  writeGswfWrongPartRepairSupabaseCompatSyncGuardedDryRunArtifactsV1,
} from "./lib/gswf-wrong-part-repair-supabase-compat-sync-guarded-apply-v1";

const REPO_ROOT = path.resolve(path.join(path.dirname(fileURLToPath(import.meta.url)), ".."));

function main(): void {
  const mode = process.argv.includes("--apply") ? "apply" : "dry_run";
  const writeArtifacts =
    process.argv.includes("--write-artifacts") || process.argv.includes("--write-report");

  const report = runGswfWrongPartRepairSupabaseCompatSyncGuardedApplyV1({
    rootDir: REPO_ROOT,
    mode,
  });

  if (writeArtifacts || mode === "apply") {
    const written = writeGswfWrongPartRepairSupabaseCompatSyncGuardedDryRunArtifactsV1({
      rootDir: REPO_ROOT,
      report,
    });
    process.stderr.write(
      `Wrote ${written.json_rel_path} and ${written.md_rel_path} (mode=${mode}; data_mutation=false; supabase_mutation_authorized=false).\n`,
    );
  }

  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);

  if (report.apply_status === "BLOCKED") {
    process.exitCode = 1;
  }
}

main();
