/**
 * Read-only fridge buyer-path batch proposal — stdout JSON only.
 *
 *   npm run buckparts:fridge-buyer-path-batch-proposal
 *   npx tsx scripts/report-fridge-buyer-path-batch-proposal-v1.ts
 */

import path from "node:path";
import { fileURLToPath } from "node:url";

import { buildFridgeBuyerPathBatchProposalV1 } from "./lib/fridge-buyer-path-batch-proposal-v1";

const REPO_ROOT = path.resolve(path.join(path.dirname(fileURLToPath(import.meta.url)), ".."));

function main(): void {
  const report = buildFridgeBuyerPathBatchProposalV1({ rootDir: REPO_ROOT });
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

main();
