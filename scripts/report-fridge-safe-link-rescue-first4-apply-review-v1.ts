#!/usr/bin/env node
/**
 * Read-only first-4 fridge safe-link rescue owner apply-review packet.
 *
 *   npm run buckparts:fridge-safe-link-rescue-first4-apply-review
 */

import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildFridgeSafeLinkRescueFirst4ApplyReviewV1,
  writeFridgeSafeLinkRescueFirst4ApplyReviewDraftsV1,
} from "./lib/fridge-safe-link-rescue-first4-apply-review-v1";

const REPO_ROOT = path.resolve(path.join(path.dirname(fileURLToPath(import.meta.url)), ".."));

function main(): void {
  const report = buildFridgeSafeLinkRescueFirst4ApplyReviewV1({ rootDir: REPO_ROOT });
  const written = writeFridgeSafeLinkRescueFirst4ApplyReviewDraftsV1({ rootDir: REPO_ROOT, report });
  process.stderr.write(
    `Wrote ${written.json_rel_path} and ${written.md_rel_path} (read-only draft; no mutation authorized).\n`,
  );
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

main();
