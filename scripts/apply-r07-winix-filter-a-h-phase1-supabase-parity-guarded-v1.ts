#!/usr/bin/env node
/**
 * Guarded R07 Phase 1 Supabase parity — default dry-run; --apply for bounded write.
 *
 *   npm run buckparts:r07-winix-filter-a-h-phase1-supabase-parity-guarded-apply
 *   BUCKPARTS_IO_CAPABILITY=MUTATION BUCKPARTS_R07_PHASE1_SUPABASE_PARITY_MUTATION_ENABLED=1 \
 *     npm run buckparts:r07-winix-filter-a-h-phase1-supabase-parity-guarded-apply -- --apply
 */

import path from "node:path";
import { fileURLToPath } from "node:url";

import { runR07Phase1SupabaseParityGuardedApplyV1 } from "./lib/r07-winix-filter-a-h-phase1-supabase-parity-guarded-apply-v1";

const REPO_ROOT = path.resolve(path.join(path.dirname(fileURLToPath(import.meta.url)), ".."));

async function main(): Promise<void> {
  const mode = process.argv.includes("--apply") ? "apply" : "dry_run";
  const report = await runR07Phase1SupabaseParityGuardedApplyV1({
    rootDir: REPO_ROOT,
    mode,
  });
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  if (report.apply_status === "BLOCKED") {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  process.stderr.write(`${err instanceof Error ? err.stack ?? err.message : String(err)}\n`);
  process.exitCode = 1;
});
