#!/usr/bin/env node
/**
 * Guarded catalog-completeness mirror compatibility removal.
 * Default dry-run. Apply deletes only the exact CSV-diff keys.
 *
 *   npx tsx scripts/apply-catalog-completeness-mirror-compat-removal-guarded-v1.ts --dry-run --write-artifacts
 *   BUCKPARTS_IO_CAPABILITY=MUTATION \
 *   BUCKPARTS_CATALOG_COMPLETENESS_MIRROR_COMPAT_REMOVAL_MUTATION_ENABLED=1 \
 *   npx tsx scripts/apply-catalog-completeness-mirror-compat-removal-guarded-v1.ts --apply --write-artifacts
 */

import path from "node:path";
import { fileURLToPath } from "node:url";

import { runCatalogCompletenessMirrorCompatRemovalGuardedApplyV1 } from "./lib/catalog-completeness-mirror-compat-removal-guarded-apply-v1";

const REPO_ROOT = path.resolve(path.join(path.dirname(fileURLToPath(import.meta.url)), ".."));

async function main(): Promise<void> {
  const mode = process.argv.includes("--apply") ? "apply" : "dry_run";
  const writeArtifacts =
    process.argv.includes("--write-artifacts") || process.argv.includes("--write-report") || mode === "apply";
  const report = await runCatalogCompletenessMirrorCompatRemovalGuardedApplyV1({
    rootDir: REPO_ROOT,
    mode,
    writeArtifacts,
  });
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  if (report.apply_status === "BLOCKED" || report.apply_status === "PARTIAL") {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  process.stderr.write(`${err instanceof Error ? err.stack ?? err.message : String(err)}\n`);
  process.exitCode = 1;
});
