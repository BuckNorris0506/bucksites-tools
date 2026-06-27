/**
 * Coverage Production Sprint v2 — stdout JSON report.
 *
 *   npm run buckparts:coverage-production-sprint-v2
 */

import path from "node:path";
import { fileURLToPath } from "node:url";

import { buildCoverageProductionSprintV2ReportV1 } from "./lib/coverage-production-sprint-v2";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function main(): Promise<void> {
  const report = await buildCoverageProductionSprintV2ReportV1({ rootDir });
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exit(1);
});
