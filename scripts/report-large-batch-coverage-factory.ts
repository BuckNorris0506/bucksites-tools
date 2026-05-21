/**
 * Read-only Large Batch Coverage Factory v1 — stdout JSON only.
 *
 *   npm run buckparts:large-batch-coverage-factory
 *   npx tsx scripts/report-large-batch-coverage-factory.ts --limit 50
 *
 * PROVEN: does not mutate Supabase, retailer_links, evidence JSON, or production UI.
 */

import path from "node:path";
import { fileURLToPath } from "node:url";

import { buildLargeBatchCoverageFactoryReportV1 } from "@/lib/coverage/large-batch-coverage-factory-v1";

const REPO_ROOT = path.resolve(path.join(path.dirname(fileURLToPath(import.meta.url)), ".."));

function parseLimit(argv: string[]): number {
  const idx = argv.indexOf("--limit");
  if (idx < 0) return 25;
  const raw = argv[idx + 1];
  const n = raw ? Number.parseInt(raw, 10) : Number.NaN;
  return Number.isFinite(n) && n > 0 ? n : 25;
}

function main(): void {
  const limit = parseLimit(process.argv);
  const report = buildLargeBatchCoverageFactoryReportV1({
    rootDir: REPO_ROOT,
    topCandidatesLimit: limit,
  });
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

main();
