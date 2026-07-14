#!/usr/bin/env node
/**
 * Guarded GE MWFP/XWFE retailer_links CSV apply — dry-run default; --write requires approval gates.
 *
 *   npm run buckparts:fridge-model-pdp-ge-mwfp-xwfe-retailer-links-guarded-apply -- --write-artifacts
 *   npm run buckparts:fridge-model-pdp-ge-mwfp-xwfe-retailer-links-guarded-apply -- --write --write-artifacts
 */

import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  runBuckpartsFridgeModelPdpGeMwfpXwfeRetailerLinksGuardedApplyV1,
  writeBuckpartsFridgeModelPdpGeMwfpXwfeGuardedApplyArtifactsV1,
} from "./lib/buckparts-fridge-model-pdp-ge-mwfp-xwfe-retailer-links-guarded-apply-v1";

const REPO_ROOT = path.resolve(path.join(path.dirname(fileURLToPath(import.meta.url)), ".."));

function main(): void {
  const mode = process.argv.includes("--write") ? "write" : "dry_run";
  const writeArtifacts = process.argv.includes("--write-artifacts") || mode === "dry_run";

  const report = runBuckpartsFridgeModelPdpGeMwfpXwfeRetailerLinksGuardedApplyV1({
    rootDir: REPO_ROOT,
    mode,
  });

  if (writeArtifacts || report.closeout_written) {
    const written = writeBuckpartsFridgeModelPdpGeMwfpXwfeGuardedApplyArtifactsV1({
      rootDir: REPO_ROOT,
      report,
    });
    process.stderr.write(
      `Wrote ${written.json_rel_path} and ${written.md_rel_path} (mode=${mode}; apply_status=${report.apply_status}; all_gates_pass=${String(report.gates.all_gates_pass)}; data_mutation=${String(report.data_mutation)}; planned_updates=${String(report.planned_update_count)}; closeout_written=${String(report.closeout_written)}).\n`,
    );
  }

  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);

  if (report.apply_status === "BLOCKED") {
    process.exitCode = 1;
  }
}

try {
  main();
} catch (err) {
  process.stderr.write(`${err instanceof Error ? err.stack ?? err.message : String(err)}\n`);
  process.exitCode = 1;
}
