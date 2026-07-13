#!/usr/bin/env node
/**
 * Read-only Samsung PASS 5 Supabase compatibility sync plan owner review.
 *
 *   npm run buckparts:samsung-pass-repair-supabase-compat-sync-plan-owner-review
 *   npm run buckparts:samsung-pass-repair-supabase-compat-sync-plan-owner-review -- --write-artifacts
 */

import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildSamsungPassRepairSupabaseCompatSyncPlanOwnerReviewV1,
  writeSamsungPassRepairSupabaseCompatSyncPlanOwnerReviewArtifactsV1,
} from "./lib/samsung-pass-repair-supabase-compat-sync-plan-owner-review-v1";

const REPO_ROOT = path.resolve(path.join(path.dirname(fileURLToPath(import.meta.url)), ".."));

async function main(): Promise<void> {
  const writeArtifacts = process.argv.includes("--write-artifacts");
  const plan = await buildSamsungPassRepairSupabaseCompatSyncPlanOwnerReviewV1({
    rootDir: REPO_ROOT,
  });

  if (writeArtifacts) {
    const written = writeSamsungPassRepairSupabaseCompatSyncPlanOwnerReviewArtifactsV1({
      rootDir: REPO_ROOT,
      plan,
    });
    process.stderr.write(
      `Wrote ${written.json_rel_path} and ${written.md_rel_path} (read-only draft artifacts; supabase_mutation_authorized=false; plan_sync_state=${plan.plan_sync_state}).\n`,
    );
  }

  process.stdout.write(`${JSON.stringify(plan, null, 2)}\n`);
}

main().catch((err) => {
  process.stderr.write(`${err instanceof Error ? err.stack ?? err.message : String(err)}\n`);
  process.exitCode = 1;
});
