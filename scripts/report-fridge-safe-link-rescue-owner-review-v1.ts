#!/usr/bin/env node
/**
 * Read-only fridge safe-link rescue owner review — stdout JSON; optional draft writes.
 *
 *   npm run buckparts:fridge-safe-link-rescue-owner-review
 *   npx tsx scripts/report-fridge-safe-link-rescue-owner-review-v1.ts --write-drafts
 */

import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildFridgeSafeLinkRescueOwnerReviewV1,
  writeFridgeSafeLinkRescueOwnerReviewDraftsV1,
} from "./lib/fridge-safe-link-rescue-owner-review-v1";

const REPO_ROOT = path.resolve(path.join(path.dirname(fileURLToPath(import.meta.url)), ".."));

async function main(): Promise<void> {
  const writeDrafts = process.argv.includes("--write-drafts");
  const skipLiveScan = process.argv.includes("--skip-live-scan");

  const report = await buildFridgeSafeLinkRescueOwnerReviewV1({
    rootDir: REPO_ROOT,
    skipLiveScan,
  });

  if (writeDrafts) {
    const written = writeFridgeSafeLinkRescueOwnerReviewDraftsV1({ rootDir: REPO_ROOT, report });
    process.stderr.write(
      `Wrote ${written.json_rel_path} and ${written.md_rel_path} (read-only draft artifacts; no mutation authorized).\n`,
    );
  }

  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  process.stderr.write(`${message}\n`);
  process.exit(1);
});
