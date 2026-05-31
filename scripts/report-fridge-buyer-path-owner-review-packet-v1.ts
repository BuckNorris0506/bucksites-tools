/**
 * Read-only fridge buyer-path owner review packet — stdout JSON only.
 *
 *   npm run buckparts:fridge-buyer-path-owner-review-packet
 *   npx tsx scripts/report-fridge-buyer-path-owner-review-packet-v1.ts
 */

import path from "node:path";
import { fileURLToPath } from "node:url";

import { buildFridgeBuyerPathOwnerReviewPacketV1 } from "./lib/fridge-buyer-path-owner-review-packet-v1";

const REPO_ROOT = path.resolve(path.join(path.dirname(fileURLToPath(import.meta.url)), ".."));

function main(): void {
  const report = buildFridgeBuyerPathOwnerReviewPacketV1({ rootDir: REPO_ROOT });
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

main();
