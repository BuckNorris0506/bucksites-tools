#!/usr/bin/env node
/**
 * Read-only ge-gte18gsnrss no-filter Supabase removal apply-plan owner review.
 *
 *   npm run buckparts:gswf-gte18gsnrss-no-filter-supabase-removal-apply-plan-owner-review
 *   npm run buckparts:gswf-gte18gsnrss-no-filter-supabase-removal-apply-plan-owner-review -- --write-artifacts
 */

import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildGswfGte18gsnrssNoFilterSupabaseRemovalApplyPlanOwnerReviewV1,
  writeGswfGte18gsnrssNoFilterSupabaseRemovalApplyPlanArtifactsV1,
} from "./lib/gswf-gte18gsnrss-no-filter-supabase-removal-apply-plan-owner-review-v1";

const REPO_ROOT = path.resolve(path.join(path.dirname(fileURLToPath(import.meta.url)), ".."));

async function main(): Promise<void> {
  const writeArtifacts = process.argv.includes("--write-artifacts");
  const plan = await buildGswfGte18gsnrssNoFilterSupabaseRemovalApplyPlanOwnerReviewV1({
    rootDir: REPO_ROOT,
  });

  if (writeArtifacts) {
    const written = writeGswfGte18gsnrssNoFilterSupabaseRemovalApplyPlanArtifactsV1({
      rootDir: REPO_ROOT,
      plan,
    });
    process.stderr.write(
      `Wrote ${written.json_rel_path} and ${written.md_rel_path} (read-only draft artifacts; supabase_mutation_authorized=false).\n`,
    );
  }

  process.stdout.write(`${JSON.stringify(plan, null, 2)}\n`);
}

main().catch((err) => {
  process.stderr.write(`${err instanceof Error ? err.stack ?? err.message : String(err)}\n`);
  process.exitCode = 1;
});
