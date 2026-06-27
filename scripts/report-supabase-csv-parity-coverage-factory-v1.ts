#!/usr/bin/env node
/**
 * Supabase CSV parity coverage factory — stdout JSON + optional draft writes.
 *
 *   npm run buckparts:supabase-csv-parity-coverage-factory
 *   npm run buckparts:supabase-csv-parity-coverage-factory -- --write-drafts
 *   npm run buckparts:supabase-csv-parity-coverage-factory -- --slug ukf8001
 */

import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildSupabaseCsvParityCoverageFactoryV1,
  writeSupabaseCsvParityCandidatePackageDraftsV1,
} from "./lib/supabase-csv-parity-coverage-factory-v1";

const REPO_ROOT = path.resolve(path.join(path.dirname(fileURLToPath(import.meta.url)), ".."));

function parseArgs(argv: string[]): { writeDrafts: boolean; slug: string | null } {
  let slug: string | null = null;
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--slug" && argv[i + 1]) slug = argv[i + 1]!.trim();
  }
  return { writeDrafts: argv.includes("--write-drafts"), slug };
}

async function main(): Promise<void> {
  const { writeDrafts, slug } = parseArgs(process.argv.slice(2));
  const report = await buildSupabaseCsvParityCoverageFactoryV1({
    rootDir: REPO_ROOT,
    slugFilter: slug,
  });

  if (writeDrafts) {
    for (const pkg of report.candidate_packages) {
      if (pkg.candidate_status !== "READY_FOR_OWNER_REVIEW") continue;
      const written = writeSupabaseCsvParityCandidatePackageDraftsV1({ rootDir: REPO_ROOT, pkg });
      process.stderr.write(
        `Wrote drafts for ${pkg.filter_slug}: ${String(written.apply_plan_rel_path)} (read-only proposal).\n`,
      );
    }
  }

  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

main().catch((err) => {
  process.stderr.write(`${err instanceof Error ? err.message : String(err)}\n`);
  process.exitCode = 1;
});
