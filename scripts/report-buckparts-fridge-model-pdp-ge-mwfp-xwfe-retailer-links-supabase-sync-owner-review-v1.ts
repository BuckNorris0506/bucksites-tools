#!/usr/bin/env node
/**
 * Read-only GE MWFP/XWFE Supabase retailer_links sync owner-review.
 *
 *   npm run buckparts:fridge-model-pdp-ge-mwfp-xwfe-retailer-links-supabase-sync-owner-review
 *   npm run buckparts:fridge-model-pdp-ge-mwfp-xwfe-retailer-links-supabase-sync-owner-review -- --write-artifacts
 */

import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildGeMwfpXwfeRetailerLinksSupabaseSyncOwnerReviewV1,
  parseGeMwfpXwfeSupabaseSyncOwnerReviewArgvV1,
  writeGeMwfpXwfeRetailerLinksSupabaseSyncOwnerReviewArtifactsV1,
} from "./lib/buckparts-fridge-model-pdp-ge-mwfp-xwfe-retailer-links-supabase-sync-owner-review-v1";

const REPO_ROOT = path.resolve(path.join(path.dirname(fileURLToPath(import.meta.url)), ".."));

function main(): void {
  const { writeArtifacts } = parseGeMwfpXwfeSupabaseSyncOwnerReviewArgvV1(process.argv.slice(2));
  const report = buildGeMwfpXwfeRetailerLinksSupabaseSyncOwnerReviewV1({ rootDir: REPO_ROOT });

  if (writeArtifacts) {
    const written = writeGeMwfpXwfeRetailerLinksSupabaseSyncOwnerReviewArtifactsV1({
      rootDir: REPO_ROOT,
      report,
    });
    process.stderr.write(
      `Wrote ${written.json_rel_path} and ${written.md_rel_path} (read-only; apply_authorized=false; supabase_mutation_authorized=false).\n`,
    );
  }

  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

try {
  main();
} catch (err) {
  process.stderr.write(`${err instanceof Error ? err.stack ?? err.message : String(err)}\n`);
  process.exitCode = 1;
}
