#!/usr/bin/env node
/**
 * Guarded HP302 stale compatibility delete — default dry-run; --apply for the two keys only.
 *
 *   npm run buckparts:hp302-stale-compat-delete-guarded-apply
 *   BUCKPARTS_IO_CAPABILITY=MUTATION BUCKPARTS_HP302_STALE_COMPAT_DELETE_MUTATION_ENABLED=1 \
 *     npm run buckparts:hp302-stale-compat-delete-guarded-apply -- --apply
 */

import path from "node:path";
import { fileURLToPath } from "node:url";

import { runHp302StaleCompatDeleteGuardedApplyV1 } from "./lib/hp302-stale-compat-delete-guarded-apply-v1";

const REPO_ROOT = path.resolve(path.join(path.dirname(fileURLToPath(import.meta.url)), ".."));

async function main(): Promise<void> {
  const mode = process.argv.includes("--apply") ? "apply" : "dry_run";
  const report = await runHp302StaleCompatDeleteGuardedApplyV1({
    rootDir: REPO_ROOT,
    mode,
  });
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  if (report.apply_status === "BLOCKED" || report.apply_status === "PREFLIGHT_FAILED") {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  process.stderr.write(`${err instanceof Error ? err.stack ?? err.message : String(err)}\n`);
  process.exitCode = 1;
});
