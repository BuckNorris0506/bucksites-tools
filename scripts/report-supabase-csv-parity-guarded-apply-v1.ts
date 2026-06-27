#!/usr/bin/env node
/**
 * Generic Supabase CSV parity guarded apply — dry-run by default.
 *
 *   npm run buckparts:supabase-csv-parity-guarded-apply -- --slug ukf8001
 *   npm run buckparts:supabase-csv-parity-guarded-apply -- --slug ukf8001 --write-csv
 */

import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  parseSupabaseCsvParityGuardedApplyCliArgsV1,
  runSupabaseCsvParityGuardedApplyV1,
  SUPABASE_CSV_PARITY_GUARDED_APPLY_CONTRACT_V1,
} from "./lib/supabase-csv-parity-guarded-apply-v1";

const REPO_ROOT = path.resolve(path.join(path.dirname(fileURLToPath(import.meta.url)), ".."));

async function main(): Promise<void> {
  const { writeCsv, slug } = parseSupabaseCsvParityGuardedApplyCliArgsV1(process.argv.slice(2));
  if (!slug) {
    process.stderr.write("Missing required --slug <filter_slug>\n");
    process.exitCode = 2;
    return;
  }

  const report = await runSupabaseCsvParityGuardedApplyV1({
    rootDir: REPO_ROOT,
    slug,
    writeCsv,
  });

  process.stderr.write(
    `${report.bridge_status}: slug=${report.target_slug} write_csv_applied=${String(report.write_csv_applied)} blockers=${String(report.blockers.length)}\n`,
  );
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);

  if (report.contract !== SUPABASE_CSV_PARITY_GUARDED_APPLY_CONTRACT_V1) {
    process.exitCode = 2;
    return;
  }
  if (report.bridge_status === "BLOCKED") {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  process.stderr.write(`${err instanceof Error ? err.message : String(err)}\n`);
  process.exitCode = 1;
});
