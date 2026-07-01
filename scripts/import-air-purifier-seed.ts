/**
 * CSV → Supabase for air purifier vertical only.
 * Default: dry-run. Mutation requires --write plus founder + trust + CSV binding + MUTATION.
 */
import { HOMEKEEP_WEDGE_CATALOG } from "@/lib/catalog/identity";
import { loadEnv } from "./lib/load-env";
import { getSupabaseAdmin } from "./lib/supabase-admin";
import { log } from "./lib/log";
import {
  createVerticalSeedLiveDepsV1,
  parseVerticalSeedCliArgsV1,
  runVerticalSeedV1,
} from "./lib/vertical-seed-run-v1";

loadEnv();
const cwd = process.cwd();
const { useSample, write } = parseVerticalSeedCliArgsV1(process.argv);

async function main() {
  log("import-air-purifier", `Starting (dry_run=${!write}, sample=${useSample})`);
  try {
    const result = await runVerticalSeedV1({
      rootDir: cwd,
      verticalKey: HOMEKEEP_WEDGE_CATALOG.air_purifier,
      useSample,
      write,
      deps: createVerticalSeedLiveDepsV1(getSupabaseAdmin),
    });
    console.log(JSON.stringify(result.report, null, 2));
    if (result.report.apply_status === "BLOCKED") {
      console.error("[import-air-purifier] BLOCKED");
    } else if (!write) {
      log("import-air-purifier", "Dry-run complete.");
    } else {
      log("import-air-purifier", "Done.");
    }
    process.exit(result.exit_code);
  } catch (e) {
    if (e instanceof Error) {
      console.error("[import-air-purifier] FAILED:", e.message);
      if (e.stack) console.error(e.stack);
    } else {
      console.error("[import-air-purifier] FAILED:", e);
    }
    process.exit(1);
  }
}

main();
