#!/usr/bin/env node
/**
 * Read-only GSWF wrong-part repair Supabase compatibility sync plan owner review.
 *
 *   npm run buckparts:gswf-wrong-part-repair-supabase-compat-sync-plan-owner-review
 *   npm run buckparts:gswf-wrong-part-repair-supabase-compat-sync-plan-owner-review -- --write-artifacts
 */

import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildGswfWrongPartRepairSupabaseCompatSyncPlanOwnerReviewV1,
  writeGswfWrongPartRepairSupabaseCompatSyncPlanOwnerReviewArtifactsV1,
} from "./lib/gswf-wrong-part-repair-supabase-compat-sync-plan-owner-review-v1";

const REPO_ROOT = path.resolve(path.join(path.dirname(fileURLToPath(import.meta.url)), ".."));

async function main(): Promise<void> {
  const writeArtifacts = process.argv.includes("--write-artifacts");
  const report = await buildGswfWrongPartRepairSupabaseCompatSyncPlanOwnerReviewV1({
    rootDir: REPO_ROOT,
  });

  if (writeArtifacts) {
    const written = writeGswfWrongPartRepairSupabaseCompatSyncPlanOwnerReviewArtifactsV1({
      rootDir: REPO_ROOT,
      report,
    });
    process.stderr.write(
      `Wrote ${written.json_rel_path} and ${written.md_rel_path} (read-only draft artifacts; supabase_mutation_authorized=false).\n`,
    );
  }

  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

main().catch((err) => {
  process.stderr.write(`${err instanceof Error ? err.stack ?? err.message : String(err)}\n`);
  process.exitCode = 1;
});
