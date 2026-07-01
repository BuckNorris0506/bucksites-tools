/**
 * CSV → Supabase import for BuckSites Tools (fridge catalog).
 *
 * Default: dry-run (read CSVs, validate, report planned work — no Supabase mutation).
 * Mutation requires explicit --write plus founder + trust + CSV artifact binding + MUTATION.
 *
 * Usage:
 *   npx tsx scripts/import-seed.ts
 *   npx tsx scripts/import-seed.ts --sample
 *   npx tsx scripts/import-seed.ts --write
 *   npx tsx scripts/import-seed.ts --write --prune-fridge-catalog
 */

import { pathToFileURL } from "node:url";

import { loadEnv } from "./lib/load-env";
import { getSupabaseAdmin } from "./lib/supabase-admin";
import { IMPORT_SEED_MUTATION_GATE_REF_V1 } from "./lib/import-seed-mutation-gate-v1";
import {
  createImportSeedLiveDepsV1,
  parseImportSeedCliArgsV1,
  runImportSeedV1,
  __testables,
} from "./lib/import-seed-run-v1";
import { log } from "./lib/log";

export { __testables };

const mutationGateRef = IMPORT_SEED_MUTATION_GATE_REF_V1;
void mutationGateRef;

async function main() {
  loadEnv();
  const { write, useSample, pruneFridgeCatalog } = parseImportSeedCliArgsV1(process.argv);

  log(
    "import-seed",
    `Starting CSV import (dry_run=${!write}, source=${useSample ? "*.sample.csv" : "*.csv"})`,
  );

  try {
    const result = await runImportSeedV1({
      rootDir: process.cwd(),
      write,
      useSample,
      pruneFridgeCatalog,
      deps: createImportSeedLiveDepsV1(getSupabaseAdmin),
    });

    console.log(JSON.stringify(result.report, null, 2));
    if (result.report.apply_status === "BLOCKED") {
      console.error("[import-seed] BLOCKED");
    } else if (!write) {
      log("import-seed", "Dry-run complete.");
    } else {
      log("import-seed", "Done.");
    }
    process.exit(result.exit_code);
  } catch (e) {
    if (e instanceof Error) {
      console.error("[import-seed] FAILED:", e.message);
      if (e.stack) console.error(e.stack);
    } else if (e && typeof e === "object" && "message" in e) {
      console.error("[import-seed] FAILED:", String((e as { message: unknown }).message));
      console.error(e);
    } else {
      console.error("[import-seed] FAILED:", e);
    }
    process.exit(1);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
