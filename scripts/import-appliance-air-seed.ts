/**
 * CSV → Supabase for appliance air filter vertical. Files: data/appliance-air/
 */
import { HOMEKEEP_WEDGE_CATALOG } from "@/lib/catalog/identity";
import { loadEnv } from "./lib/load-env";
import { log } from "./lib/log";
import { runVerticalSeed } from "./lib/vertical-seed";

loadEnv();
const cwd = process.cwd();
const useSample = process.argv.includes("--sample");

async function main() {
  log("import-appliance-air", `Starting (sample=${useSample})`);
  try {
    await runVerticalSeed(HOMEKEEP_WEDGE_CATALOG.appliance_air, cwd, useSample);
    log("import-appliance-air", "Done.");
  } catch (e) {
    if (e instanceof Error) {
      console.error("[import-appliance-air] FAILED:", e.message);
      if (e.stack) console.error(e.stack);
    } else {
      console.error("[import-appliance-air] FAILED:", e);
    }
    process.exitCode = 1;
  }
}

main();
