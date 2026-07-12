#!/usr/bin/env node
/**
 * Guarded ge-gte18gsnrss no-filter suppression CSV executor — default dry-run; optional --apply.
 *
 *   npm run buckparts:gswf-gte18gsnrss-no-filter-suppression-guarded-apply:dry-run
 *   npm run buckparts:gswf-gte18gsnrss-no-filter-suppression-guarded-apply -- --apply
 *
 * Apply remains fail-closed unless ALL of:
 *   - matching founder approval for this exact plan
 *   - exact 1 slug / 2 removals / 0 additions
 *   - BUCKPARTS_GSWF_GTE18GSNRSS_NO_FILTER_SUPPRESSION_MUTATION_ENABLED=1
 *
 * Dry-run never mutates compatibility_mappings.csv.
 */

import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  runGswfGte18gsnrssNoFilterSuppressionGuardedApplyV1,
  writeGswfGte18gsnrssNoFilterSuppressionGuardedDryRunArtifactsV1,
} from "./lib/gswf-gte18gsnrss-no-filter-suppression-guarded-apply-v1";

const REPO_ROOT = path.resolve(path.join(path.dirname(fileURLToPath(import.meta.url)), ".."));

function main(): void {
  const mode = process.argv.includes("--apply") ? "apply" : "dry_run";
  const writeArtifacts =
    process.argv.includes("--write-artifacts") ||
    process.argv.includes("--write-report") ||
    mode === "dry_run";

  const report = runGswfGte18gsnrssNoFilterSuppressionGuardedApplyV1({
    rootDir: REPO_ROOT,
    mode,
  });

  if (writeArtifacts || mode === "apply") {
    const written = writeGswfGte18gsnrssNoFilterSuppressionGuardedDryRunArtifactsV1({
      rootDir: REPO_ROOT,
      report,
    });
    process.stderr.write(
      `Wrote ${written.json_rel_path} and ${written.md_rel_path} (mode=${mode}; apply_status=${report.apply_status}; data_mutation=${String(report.data_mutation)}; csv_mutation_authorized=${String(report.csv_mutation_authorized)}).\n`,
    );
  }

  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);

  if (report.apply_status === "BLOCKED") {
    process.exitCode = 1;
  }
}

main();
