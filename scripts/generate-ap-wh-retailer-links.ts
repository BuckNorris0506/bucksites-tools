/**
 * Writes truth-first `retailer_links.csv` for air purifier and whole-house-water wedges from
 * each wedge's `filters.csv` (manufacturer / authorized catalog URLs — never Google/Bing search).
 *
 * Run after editing filters.csv:
 *   npx tsx scripts/generate-ap-wh-retailer-links.ts
 *
 * Root cause addressed: committed `retailer_links.csv` files were header-only, so
 * `runVerticalSeed` → `readCsvFile` returned 0 rows and imports logged `Skip (empty)`.
 */
import fs from "node:fs";
import path from "node:path";

import { readCsvFile } from "./lib/csv";

const cwd = process.cwd();

function csvEscapeField(s: string): string {
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/** Site catalog / keyword URLs only (not google.com or bing.com /search). */
function airPurifierCatalogUrl(brandSlug: string, oemPart: string): string {
  const enc = encodeURIComponent(oemPart);
  switch (brandSlug) {
    case "livepure":
      return `https://livepureshop.com/search?q=${enc}`;
    case "iqair":
      return `https://www.iqair.com/us/search?q=${enc}`;
    case "austin-air":
      return `https://austinair.com/?s=${enc}`;
    case "airdoctor":
      return `https://airdoctorpro.com/search?q=${enc}`;
    case "alen":
      return `https://www.alen.com/search?q=${enc}`;
    case "medify":
      return `https://medifyair.com/search?q=${enc}`;
    case "blueair":
      return `https://www.blueair.com/us/search?q=${enc}`;
    case "coway":
      return `https://coway.com/search?q=${enc}`;
    case "levoit":
      return `https://levoit.com/search?q=${enc}`;
    case "winix":
      return `https://www.winixamerica.com/search?q=${enc}`;
    case "honeywell":
      return `https://www.honeywellstore.com/store/search?q=${enc}`;
    case "germguardian":
      return `https://www.germguardian.com/search?q=${enc}`;
    case "shark":
      return `https://www.sharkclean.com/search?q=${enc}`;
    case "holmes":
      return `https://www.holmesproducts.com/search?q=${enc}`;
    case "hamilton-beach":
      return `https://hamiltonbeach.com/search?q=${enc}`;
    case "vornado":
      return `https://www.vornado.com/search?q=${enc}`;
    case "renpho":
      return `https://renpho.com/search?q=${enc}`;
    case "rabbit-air":
      return `https://www.rabbitair.com/search?q=${enc}`;
    default:
      return `https://www.repairclinic.com/Search?SearchTerm=${enc}`;
  }
}

function wholeHouseCatalogUrl(brandSlug: string, oemPart: string): string {
  const enc = encodeURIComponent(oemPart);
  switch (brandSlug) {
    case "pentek":
      return `https://www.pentair.com/en-us/water-solutions/search.html#q=${enc}`;
    case "pentair":
      return `https://www.pentair.com/en-us/water-solutions/search.html#q=${enc}`;
    case "3m":
      return `https://www.3m.com/3M/en_US/water-filtration-us/search/?Ntt=${enc}`;
    case "ge":
      return `https://www.geapplianceparts.com/store/catalog/search.jsp?searchKeyword=${enc}`;
    case "culligan":
      return `https://www.culligan.com/search?q=${enc}`;
    case "whirlpool":
      return `https://www.whirlpoolparts.com/catalog.jsp?search=stw=&path=&searchKeyword=${enc}`;
    case "watts":
      return `https://www.watts.com/search?q=${enc}`;
    case "springwell":
      return `https://www.springwellwater.com/search?q=${enc}`;
    case "aquasana":
      return `https://www.aquasana.com/catalogsearch/result/?q=${enc}`;
    case "kinetico":
      return "https://www.kinetico.com/en-us/for-home/water-filtration/";
    default:
      return `https://www.repairclinic.com/Search?SearchTerm=${enc}`;
  }
}

function retailerNameForBrand(brandSlug: string, vertical: "ap" | "wh"): string {
  if (brandSlug === "kinetico" && vertical === "wh") {
    return "Kinetico official (dealer network — not direct checkout)";
  }
  return "OEM / manufacturer catalog (keyword lookup)";
}

function writeVerticalRetailerLinks(
  vertical: "ap" | "wh",
  dataDir: string,
  catalogUrl: (brand: string, oem: string) => string,
) {
  const filterPath = path.join(cwd, "data", dataDir, "filters.csv");
  const rows = readCsvFile(filterPath, ["brand_slug", "slug", "oem_part_number"]);
  const outPath = path.join(cwd, "data", dataDir, "retailer_links.csv");
  const lines = [
    "filter_slug,retailer_name,affiliate_url,is_primary,retailer_key,retailer_slug,destination_url",
  ];
  for (const r of rows) {
    const brand = r.brand_slug.trim();
    const slug = r.slug.trim();
    const oem = r.oem_part_number.trim();
    const url = catalogUrl(brand, oem);
    const name = retailerNameForBrand(brand, vertical);
    const retailerKey = "oem-catalog";
    const retailerSlug = "oem-catalog";
    lines.push(
      [
        slug,
        csvEscapeField(name),
        csvEscapeField(url),
        "true",
        retailerKey,
        retailerSlug,
        csvEscapeField(url),
      ].join(","),
    );
  }
  fs.writeFileSync(outPath, lines.join("\n") + "\n", "utf8");
  console.log(JSON.stringify({ wrote: outPath, data_rows: rows.length }, null, 2));
}

if (process.env.BUCKPARTS_ALLOW_FROZEN !== "true") {
  throw new Error(
    "FROZEN_SCRIPT_BLOCKED: Set BUCKPARTS_ALLOW_FROZEN=true to run this frozen/tactical script intentionally.",
  );
}

writeVerticalRetailerLinks("ap", "air-purifier", airPurifierCatalogUrl);
writeVerticalRetailerLinks("wh", "whole-house-water", wholeHouseCatalogUrl);
