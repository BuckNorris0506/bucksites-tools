/**
 * Read-only universal batch run-registry intake — stdout JSON only.
 *
 *   npm run buckparts:batch-run-registry-intake
 *   npx tsx scripts/report-batch-run-registry-intake-v1.ts
 */

import path from "node:path";
import { fileURLToPath } from "node:url";

import { buildBatchRunRegistryIntakeReportV1 } from "./lib/batch-run-registry-intake-v1";

const REPO_ROOT = path.resolve(path.join(path.dirname(fileURLToPath(import.meta.url)), ".."));

function main(): void {
  const report = buildBatchRunRegistryIntakeReportV1({ rootDir: REPO_ROOT });
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

main();
