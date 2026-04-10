/**
 * CSV → Supabase for vacuum vertical only. Same layout as air-purifier under data/vacuum/
 */
import { HOMEKEEP_WEDGE_CATALOG } from "@/lib/catalog/identity";
import { loadEnv } from "./lib/load-env";
import { log } from "./lib/log";
import { runVerticalSeed } from "./lib/vertical-seed";

loadEnv();
const cwd = process.cwd();
const useSample = process.argv.includes("--sample");

async function main() {
  log("import-vacuum", `Starting (sample=${useSample})`);
  try {
    await runVerticalSeed(HOMEKEEP_WEDGE_CATALOG.vacuum, cwd, useSample);
    log("import-vacuum", "Done.");
  } catch (e) {
    if (e instanceof Error) {
      console.error("[import-vacuum] FAILED:", e.message);
      if (e.stack) console.error(e.stack);
    } else {
      console.error("[import-vacuum] FAILED:", e);
    }
    process.exitCode = 1;
  }
}

main();
