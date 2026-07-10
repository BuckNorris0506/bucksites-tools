#!/usr/bin/env node
/**
 * Guarded GSWF wrong-part repair apply executor — default dry-run; optional --apply.
 *
 *   npm run buckparts:gswf-wrong-part-repair-guarded-apply -- --dry-run --write-artifacts
 *   npm run buckparts:gswf-wrong-part-repair-guarded-apply -- --apply
 *
 * Apply is blocked unless data/owner-decisions/gswf-wrong-part-repair-owner-approval-v1.json
 * contains a matching founder-approved row. Dry-run never mutates compatibility_mappings.csv.
 */

import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  runGswfWrongPartRepairGuardedApplyV1,
  writeGswfWrongPartRepairGuardedApplyDryRunArtifactsV1,
} from "./lib/gswf-wrong-part-repair-guarded-apply-v1";

const REPO_ROOT = path.resolve(path.join(path.dirname(fileURLToPath(import.meta.url)), ".."));

function main(): void {
  const mode = process.argv.includes("--apply") ? "apply" : "dry_run";
  const writeArtifacts =
    process.argv.includes("--write-artifacts") || process.argv.includes("--write-report");

  const report = runGswfWrongPartRepairGuardedApplyV1({ rootDir: REPO_ROOT, mode });

  if (writeArtifacts || mode === "apply") {
    const written = writeGswfWrongPartRepairGuardedApplyDryRunArtifactsV1({
      rootDir: REPO_ROOT,
      report,
    });
    process.stderr.write(
      `Wrote ${written.json_rel_path} and ${written.md_rel_path} (mode=${mode}; data_mutation=${String(report.data_mutation)}).\n`,
    );
  }

  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);

  if (report.apply_status === "BLOCKED") {
    process.exitCode = 1;
  }
}

main();
