/**
 * Read-only Waterdrop catalog intelligence report (multi-source lane v1: Rakuten operator input).
 *
 *   npx tsx scripts/report-waterdrop-catalog-intelligence-v1.ts
 *   npx tsx scripts/report-waterdrop-catalog-intelligence-v1.ts --input data/waterdrop/operator-input/local/waterdrop-rakuten-productsearch.v1.json
 *   npx tsx scripts/report-waterdrop-catalog-intelligence-v1.ts --limit 20
 *   npx tsx scripts/report-waterdrop-catalog-intelligence-v1.ts --out data/waterdrop/reports/waterdrop-catalog-intelligence-v1.json
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildWaterdropCatalogIntelligenceReport,
  loadWaterdropCatalogInput,
  resolveWaterdropCatalogInputPath,
} from "./lib/waterdrop-catalog-intelligence-v1";

const REPO_ROOT = path.resolve(path.join(path.dirname(fileURLToPath(import.meta.url)), ".."));

type CliArgs = {
  input: string | null;
  limit: number | null;
  out: string | null;
};

function parseArgs(argv: string[]): CliArgs {
  let input: string | null = null;
  let limit: number | null = null;
  let out: string | null = null;
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i]!;
    if (a === "--input" && argv[i + 1]) input = argv[++i]!;
    else if (a === "--limit" && argv[i + 1]) limit = Number(argv[++i]!);
    else if (a === "--out" && argv[i + 1]) out = argv[++i]!;
  }
  return { input, limit, out };
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv);
  const resolvedPath = resolveWaterdropCatalogInputPath(REPO_ROOT, args.input);
  const loaded = loadWaterdropCatalogInput(resolvedPath);
  const report = buildWaterdropCatalogIntelligenceReport({
    rootDir: REPO_ROOT,
    resolved: loaded,
    reviewQueueLimit: args.limit,
  });

  const json = JSON.stringify(report, null, 2);
  console.log(json);

  if (args.out) {
    const outPath = path.isAbsolute(args.out) ? args.out : path.join(REPO_ROOT, args.out);
    mkdirSync(path.dirname(outPath), { recursive: true });
    writeFileSync(outPath, json, "utf8");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
