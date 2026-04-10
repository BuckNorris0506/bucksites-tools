/**
 * CSV → Supabase for air purifier vertical only.
 * Files: data/air-purifier/*.csv (or *.sample.csv with --sample)
 *
 *   brands.csv          slug,name
 *   filters.csv         brand_slug,slug,oem_part_number,name,replacement_interval_months,notes
 *   models.csv          brand_slug,slug,model_number,title,series,notes  (title optional)
 *   model_aliases.csv   model_slug,alias
 *   filter_aliases.csv  filter_slug,alias
 *   compatibility_mappings.csv  model_slug,filter_slug[,is_recommended]
 *   retailer_links.csv  filter_slug,affiliate_url + optional destination_url,retailer_name,is_primary,retailer_key,retailer_slug
 */
import { HOMEKEEP_WEDGE_CATALOG } from "@/lib/catalog/identity";
import { loadEnv } from "./lib/load-env";
import { log } from "./lib/log";
import { runVerticalSeed } from "./lib/vertical-seed";

loadEnv();
const cwd = process.cwd();
const useSample = process.argv.includes("--sample");

async function main() {
  log("import-air-purifier", `Starting (sample=${useSample})`);
  try {
    await runVerticalSeed(HOMEKEEP_WEDGE_CATALOG.air_purifier, cwd, useSample);
    log("import-air-purifier", "Done.");
  } catch (e) {
    if (e instanceof Error) {
      console.error("[import-air-purifier] FAILED:", e.message);
      if (e.stack) console.error(e.stack);
    } else {
      console.error("[import-air-purifier] FAILED:", e);
    }
    process.exitCode = 1;
  }
}

main();
