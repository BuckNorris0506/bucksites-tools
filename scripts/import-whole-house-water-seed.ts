/**
 * CSV → Supabase for whole-house water filter vertical. Files: data/whole-house-water/
 */
import { HOMEKEEP_WEDGE_CATALOG } from "@/lib/catalog/identity";
import { loadEnv } from "./lib/load-env";
import { log } from "./lib/log";
import { runVerticalSeed } from "./lib/vertical-seed";

loadEnv();
const cwd = process.cwd();
const useSample = process.argv.includes("--sample");

async function main() {
  log("import-whole-house-water", `Starting (sample=${useSample})`);
  try {
    await runVerticalSeed(HOMEKEEP_WEDGE_CATALOG.whole_house_water, cwd, useSample);
    log("import-whole-house-water", "Done.");
  } catch (e) {
    if (e instanceof Error) {
      console.error("[import-whole-house-water] FAILED:", e.message);
      if (e.stack) console.error(e.stack);
    } else {
      console.error("[import-whole-house-water] FAILED:", e);
    }
    process.exitCode = 1;
  }
}

main();
