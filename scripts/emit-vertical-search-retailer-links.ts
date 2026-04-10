/**
 * Legacy script name: previously emitted Google/Bing search rows into retailer_links.csv.
 * For truth-first launch, live inventory must not contain search placeholders — this writes
 * header-only CSVs. Add real retailer URLs via import or another pipeline.
 *
 *   npx tsx scripts/emit-vertical-search-retailer-links.ts air-purifier
 *   npx tsx scripts/emit-vertical-search-retailer-links.ts whole-house-water
 */
import fs from "node:fs";
import path from "node:path";

const root = path.join(process.cwd(), "data");

const VERTICALS: Record<string, { dir: string }> = {
  "air-purifier": { dir: "air-purifier" },
  "whole-house-water": { dir: "whole-house-water" },
};

function emitHeaderOnly(subdir: string): void {
  const header =
    "filter_slug,retailer_name,affiliate_url,is_primary,retailer_key\n";
  fs.writeFileSync(path.join(root, subdir, "retailer_links.csv"), header, "utf8");
  console.log(
    JSON.stringify(
      { wrote: `data/${subdir}/retailer_links.csv`, linkRows: 0, note: "header only" },
      null,
      2,
    ),
  );
}

const arg = process.argv[2];
if (arg && VERTICALS[arg]) {
  emitHeaderOnly(VERTICALS[arg].dir);
} else {
  console.error(
    "Usage: npx tsx scripts/emit-vertical-search-retailer-links.ts <air-purifier|whole-house-water>",
  );
  process.exitCode = 1;
}
