#!/usr/bin/env node
/**
 * Guarded R09 AP903 standard-cartridge Supabase parity — default dry-run; --apply for bounded write.
 */

import path from "node:path";
import { fileURLToPath } from "node:url";

import { runR09Ap903StandardCartridgeSupabaseParityGuardedApplyV1 } from "./lib/r09-ap903-standard-cartridge-supabase-parity-guarded-apply-v1";

const REPO_ROOT = path.resolve(path.join(path.dirname(fileURLToPath(import.meta.url)), ".."));

async function main(): Promise<void> {
  const mode = process.argv.includes("--apply") ? "apply" : "dry_run";
  const report = await runR09Ap903StandardCartridgeSupabaseParityGuardedApplyV1({
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
