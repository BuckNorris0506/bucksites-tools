/**
 * CSV → Supabase for appliance air filter vertical.
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
  log("import-appliance-air", `Starting (dry_run=${!write}, sample=${useSample})`);
  try {
    const result = await runVerticalSeedV1({
      rootDir: cwd,
      verticalKey: HOMEKEEP_WEDGE_CATALOG.appliance_air,
      useSample,
      write,
      deps: createVerticalSeedLiveDepsV1(getSupabaseAdmin),
    });
    console.log(JSON.stringify(result.report, null, 2));
    if (result.report.apply_status === "BLOCKED") {
      console.error("[import-appliance-air] BLOCKED");
    } else if (!write) {
      log("import-appliance-air", "Dry-run complete.");
    } else {
      log("import-appliance-air", "Done.");
    }
    process.exit(result.exit_code);
  } catch (e) {
    if (e instanceof Error) {
      console.error("[import-appliance-air] FAILED:", e.message);
      if (e.stack) console.error(e.stack);
    } else {
      console.error("[import-appliance-air] FAILED:", e);
    }
    process.exit(1);
  }
}

main();
