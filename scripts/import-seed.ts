/**
 * CSV → Supabase import for BuckSites Tools.
 *
 * Expected files under ./data/ (or *.sample.csv with --sample):
 *
 *   brands.csv
 *     slug,name
 *
 *   filters.csv
 *     brand_slug,slug,oem_part_number,name,replacement_interval_months,notes
 *
 *   fridge_models.csv
 *     brand_slug,slug,model_number,notes
 *   Optional: title — display title; default "{Brand name} {model_number} Refrigerator"
 *
 *   compatibility_mappings.csv
 *     fridge_slug,filter_slug
 *
 *   fridge_model_aliases.csv  (optional)
 *     fridge_slug,alias
 *
 *   filter_aliases.csv  (optional)
 *     filter_slug,alias
 *
 *   retailer_links.csv
 *     filter_slug,retailer_name,affiliate_url,is_primary
 *   Optional: destination_url (defaults to affiliate_url), retailer_slug, retailer_key (stable slot id; one live row per filter + key).
 *   retailer_slug defaults from retailer_slug → retailer_key → slugified retailer_name.
 *   Live links only — pre-approval URLs belong in retailer_link_candidates (SQL / service role).
 *
 * Env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (.env.local)
 *
 * Usage:
 *   npx tsx scripts/import-seed.ts
 *   npx tsx scripts/import-seed.ts --sample
 */

import fs from "node:fs";

import { loadEnv } from "./lib/load-env";
import { getSupabaseAdmin } from "./lib/supabase-admin";
import { readCsvFile, dataCsvPath } from "./lib/csv";
import { bulkApplyRetailerLinksByAffiliateMatch } from "./lib/bulk-retailer-links-import";
import { log, warn } from "./lib/log";

loadEnv();
const cwd = process.cwd();
const useSample = process.argv.includes("--sample");

function optStr(v: string | undefined): string | null {
  const s = v?.trim();
  return s === undefined || s === "" ? null : s;
}

function optInt(v: string | undefined): number | null {
  const s = v?.trim();
  if (s === undefined || s === "") return null;
  const n = Number.parseInt(s, 10);
  if (Number.isNaN(n)) {
    throw new Error(`Not an integer: "${v}"`);
  }
  return n;
}

function optBool(v: string | undefined): boolean | null {
  const s = v?.trim().toLowerCase();
  if (s === undefined || s === "") return null;
  if (["1", "true", "yes", "y"].includes(s)) return true;
  if (["0", "false", "no", "n"].includes(s)) return false;
  throw new Error(`Not a boolean: "${v}"`);
}

function slugifyRetailerKey(raw: string): string {
  const s = raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return s || "store";
}

function retailerKeyFromRow(r: Record<string, string>): string {
  const explicit = optStr(r.retailer_key)?.trim();
  if (explicit) return slugifyRetailerKey(explicit);
  return slugifyRetailerKey(optStr(r.retailer_name) ?? "store");
}

function retailerSlugFromRow(r: Record<string, string>): string {
  const fromSlug = optStr(r.retailer_slug);
  if (fromSlug) return slugifyRetailerKey(fromSlug);
  const fromKey = optStr(r.retailer_key);
  if (fromKey) return slugifyRetailerKey(fromKey);
  return slugifyRetailerKey(optStr(r.retailer_name) ?? "store");
}

async function importBrands() {
  const file = dataCsvPath(cwd, "brands", useSample);
  const rows = readCsvFile(file, ["slug", "name"]);
  if (rows.length === 0) {
    warn("brands", `Skip (empty): ${file}`);
    return;
  }

  const payload = rows.map((r) => ({
    slug: r.slug.trim(),
    name: r.name.trim(),
  }));

  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("brands").upsert(payload, {
    onConflict: "slug",
    ignoreDuplicates: false,
  });

  if (error) throw error;
  log("brands", `Upserted ${payload.length} row(s) from ${file}`);
}

async function importFilters() {
  const file = dataCsvPath(cwd, "filters", useSample);
  const rows = readCsvFile(file, [
    "brand_slug",
    "slug",
    "oem_part_number",
  ]);
  if (rows.length === 0) {
    warn("filters", `Skip (empty): ${file}`);
    return;
  }

  const supabase = getSupabaseAdmin();
  const { data: brands, error: bErr } = await supabase
    .from("brands")
    .select("id, slug");

  if (bErr) throw bErr;
  const brandBySlug = new Map(
    (brands ?? []).map((b) => [b.slug as string, b.id as string]),
  );

  const payload = rows.map((r) => {
    const brand_slug = r.brand_slug.trim();
    const brand_id = brandBySlug.get(brand_slug);
    if (!brand_id) {
      throw new Error(
        `filters.csv: unknown brand_slug "${brand_slug}" for filter slug "${r.slug}"`,
      );
    }
    return {
      brand_id,
      slug: r.slug.trim(),
      oem_part_number: r.oem_part_number.trim(),
      name: optStr(r.name),
      replacement_interval_months: optInt(r.replacement_interval_months),
      notes: optStr(r.notes),
    };
  });

  const { error } = await supabase.from("filters").upsert(payload, {
    onConflict: "slug",
    ignoreDuplicates: false,
  });

  if (error) throw error;
  log("filters", `Upserted ${payload.length} row(s) from ${file}`);
}

async function importFridgeModels() {
  const file = dataCsvPath(cwd, "fridge_models", useSample);
  const rows = readCsvFile(file, ["brand_slug", "slug", "model_number"]);
  if (rows.length === 0) {
    warn("fridge_models", `Skip (empty): ${file}`);
    return;
  }

  const supabase = getSupabaseAdmin();
  const { data: brands, error: bErr } = await supabase
    .from("brands")
    .select("id, slug, name");

  if (bErr) throw bErr;
  const brandBySlug = new Map(
    (brands ?? []).map((b) => [b.slug as string, b.id as string]),
  );
  const brandNameBySlug = new Map(
    (brands ?? []).map((b) => [b.slug as string, b.name as string]),
  );

  const payload = rows.map((r) => {
    const brand_slug = r.brand_slug.trim();
    const brand_id = brandBySlug.get(brand_slug);
    if (!brand_id) {
      throw new Error(
        `fridge_models.csv: unknown brand_slug "${brand_slug}" for fridge slug "${r.slug}"`,
      );
    }
    const model_number = r.model_number.trim();
    const brandName = brandNameBySlug.get(brand_slug) ?? brand_slug;
    const titleFromCsv = optStr(r.title);
    const title =
      titleFromCsv && titleFromCsv.trim().length > 0
        ? titleFromCsv.trim()
        : `${brandName} ${model_number} Refrigerator`;
    return {
      brand_id,
      slug: r.slug.trim(),
      model_number,
      title,
      notes: optStr(r.notes),
    };
  });

  const { error } = await supabase.from("fridge_models").upsert(payload, {
    onConflict: "model_number",
    ignoreDuplicates: false,
  });

  if (error) throw error;
  log("fridge_models", `Upserted ${payload.length} row(s) from ${file}`);
}

async function importFridgeModelAliases() {
  const file = dataCsvPath(cwd, "fridge_model_aliases", useSample);
  if (!fs.existsSync(file)) {
    warn("fridge_model_aliases", `Skip (missing): ${file}`);
    return;
  }
  const rows = readCsvFile(file, ["fridge_slug", "alias"]);
  if (rows.length === 0) {
    warn("fridge_model_aliases", `Skip (empty): ${file}`);
    return;
  }

  const supabase = getSupabaseAdmin();
  const { data: fridges, error: fErr } = await supabase
    .from("fridge_models")
    .select("id, slug");

  if (fErr) throw fErr;
  const fridgeBySlug = new Map(
    (fridges ?? []).map((x) => [x.slug as string, x.id as string]),
  );

  const payload = rows.map((r) => {
    const fs = r.fridge_slug.trim();
    const alias = r.alias.trim();
    const fridge_model_id = fridgeBySlug.get(fs);
    if (!fridge_model_id) {
      throw new Error(
        `fridge_model_aliases.csv: unknown fridge_slug "${fs}" for alias "${alias}"`,
      );
    }
    return { fridge_model_id, alias };
  });

  const { error } = await supabase.from("fridge_model_aliases").upsert(payload, {
    onConflict: "fridge_model_id,alias",
    ignoreDuplicates: false,
  });

  if (error) throw error;
  log("fridge_model_aliases", `Upserted ${payload.length} row(s) from ${file}`);
}

async function importFilterAliases() {
  const file = dataCsvPath(cwd, "filter_aliases", useSample);
  if (!fs.existsSync(file)) {
    warn("filter_aliases", `Skip (missing): ${file}`);
    return;
  }
  const rows = readCsvFile(file, ["filter_slug", "alias"]);
  if (rows.length === 0) {
    warn("filter_aliases", `Skip (empty): ${file}`);
    return;
  }

  const supabase = getSupabaseAdmin();
  const { data: filters, error: flErr } = await supabase
    .from("filters")
    .select("id, slug");

  if (flErr) throw flErr;
  const filterBySlug = new Map(
    (filters ?? []).map((x) => [x.slug as string, x.id as string]),
  );

  const payload = rows.map((r) => {
    const fs = r.filter_slug.trim();
    const alias = r.alias.trim();
    const filter_id = filterBySlug.get(fs);
    if (!filter_id) {
      throw new Error(
        `filter_aliases.csv: unknown filter_slug "${fs}" for alias "${alias}"`,
      );
    }
    return { filter_id, alias };
  });

  const { error } = await supabase.from("filter_aliases").upsert(payload, {
    onConflict: "filter_id,alias",
    ignoreDuplicates: false,
  });

  if (error) throw error;
  log("filter_aliases", `Upserted ${payload.length} row(s) from ${file}`);
}

async function importCompatibilityMappings() {
  const file = dataCsvPath(cwd, "compatibility_mappings", useSample);
  const rows = readCsvFile(file, ["fridge_slug", "filter_slug"]);
  if (rows.length === 0) {
    warn("compatibility_mappings", `Skip (empty): ${file}`);
    return;
  }

  const supabase = getSupabaseAdmin();

  const [{ data: fridges, error: fErr }, { data: filters, error: flErr }] =
    await Promise.all([
      supabase.from("fridge_models").select("id, slug"),
      supabase.from("filters").select("id, slug"),
    ]);

  if (fErr) throw fErr;
  if (flErr) throw flErr;

  const fridgeBySlug = new Map(
    (fridges ?? []).map((x) => [x.slug as string, x.id as string]),
  );
  const filterBySlug = new Map(
    (filters ?? []).map((x) => [x.slug as string, x.id as string]),
  );

  const payload = rows.map((r) => {
    const fs = r.fridge_slug.trim();
    const gs = r.filter_slug.trim();
    const fridge_model_id = fridgeBySlug.get(fs);
    const filter_id = filterBySlug.get(gs);
    if (!fridge_model_id) {
      throw new Error(`compatibility_mappings.csv: unknown fridge_slug "${fs}"`);
    }
    if (!filter_id) {
      throw new Error(`compatibility_mappings.csv: unknown filter_slug "${gs}"`);
    }
    return { fridge_model_id, filter_id };
  });

  const { error } = await supabase.from("compatibility_mappings").upsert(
    payload,
    { onConflict: "fridge_model_id,filter_id", ignoreDuplicates: false },
  );

  if (error) throw error;
  log(
    "compatibility_mappings",
    `Upserted ${payload.length} row(s) from ${file}`,
  );
}

async function importRetailerLinks() {
  const file = dataCsvPath(cwd, "retailer_links", useSample);
  const rows = readCsvFile(file, ["filter_slug", "affiliate_url"]);
  if (rows.length === 0) {
    warn("retailer_links", `Skip (empty): ${file}`);
    return;
  }

  const supabase = getSupabaseAdmin();
  const { data: filters, error: flErr } = await supabase
    .from("filters")
    .select("id, slug");

  if (flErr) throw flErr;
  const filterBySlug = new Map(
    (filters ?? []).map((x) => [x.slug as string, x.id as string]),
  );

  const ops = rows.map((r) => {
    const filter_slug = r.filter_slug.trim();
    const affiliate_url = r.affiliate_url.trim();
    const destination_url = optStr(r.destination_url) ?? affiliate_url;
    const filter_id = filterBySlug.get(filter_slug);
    if (!filter_id) {
      throw new Error(
        `retailer_links.csv: unknown filter_slug "${filter_slug}"`,
      );
    }

    const retailer_key = retailerKeyFromRow(r);
    const retailer_slug = retailerSlugFromRow(r);

    const insertRow = {
      filter_id,
      retailer_name: optStr(r.retailer_name),
      affiliate_url,
      destination_url,
      is_primary: optBool(r.is_primary) ?? false,
      retailer_key,
      retailer_slug,
    };

    const updateRow = {
      retailer_name: insertRow.retailer_name,
      destination_url: insertRow.destination_url,
      is_primary: insertRow.is_primary,
      retailer_key: insertRow.retailer_key,
      retailer_slug: insertRow.retailer_slug,
    };

    return {
      filterId: filter_id,
      affiliate_url,
      insertRow,
      updateRow,
    };
  });

  const { inserted, updated, uniquePairs } =
    await bulkApplyRetailerLinksByAffiliateMatch(supabase, {
      table: "retailer_links",
      filterFkColumn: "filter_id",
      ops,
    });

  log(
    "retailer_links",
    `Processed ${rows.length} CSV line(s), ${uniquePairs} unique (filter, affiliate_url) from ${file} (inserted ${inserted}, updated ${updated})`,
  );
}

async function main() {
  log(
    "import-seed",
    `Starting CSV import (source=${useSample ? "*.sample.csv" : "*.csv"})`,
  );

  try {
    await importBrands();
    await importFilters();
    await importFridgeModels();
    await importFridgeModelAliases();
    await importFilterAliases();
    await importCompatibilityMappings();
    await importRetailerLinks();
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
    process.exitCode = 1;
    return;
  }

  log("import-seed", "Done.");
}

main();
