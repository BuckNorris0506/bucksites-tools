/**
 * Read-only fridge buyer-path owner-review bridge — stdout JSON only.
 *
 *   npm run buckparts:fridge-buyer-path-owner-review-bridge
 *   npx tsx scripts/report-fridge-buyer-path-owner-review-bridge-v1.ts
 *
 * PROVEN: does not write files by default; does not mutate CSV, Supabase, evidence, or UI.
 */

import path from "node:path";
import { fileURLToPath } from "node:url";

import { buildFridgeBuyerPathOwnerReviewBridgeV1 } from "./lib/fridge-buyer-path-owner-review-bridge-v1";

const REPO_ROOT = path.resolve(path.join(path.dirname(fileURLToPath(import.meta.url)), ".."));

function main(): void {
  const report = buildFridgeBuyerPathOwnerReviewBridgeV1({ rootDir: REPO_ROOT });
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

main();
