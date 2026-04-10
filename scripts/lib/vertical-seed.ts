/**
 * CSV import for parallel catalog verticals (not refrigerator water filters).
 * Reuses public.brands.
 */
import fs from "node:fs";

import { getSupabaseAdmin } from "./supabase-admin";
import { bulkApplyRetailerLinksByAffiliateMatch } from "./bulk-retailer-links-import";
import { categoryDataCsvPath, readCsvFile } from "./csv";
import type { HomekeepWedgeCatalog } from "@/lib/catalog/identity";
import { HOMEKEEP_WEDGE_CATALOG } from "@/lib/catalog/identity";
import { log, warn } from "./log";

/** Parallel verticals (excludes refrigerator_water — that path uses `import-seed`). */
export type VerticalKey = Exclude<HomekeepWedgeCatalog, "refrigerator_water">;

type VerticalTables = {
  filters: string;
  models: string;
  modelAliases: string;
  modelAliasModelFk: string;
  modelAliasConflict: string;
  filterAliases: string;
  filterAliasFilterFk: string;
  filterAliasConflict: string;
  compatibility: string;
  compatModelFk: string;
  compatFilterFk: string;
  retailerLinks: string;
  retailerFilterFk: string;
};

type VerticalConfig = {
  key: VerticalKey;
  dataDir: string;
  labelForTitle: string;
  tables: VerticalTables;
};

const VERTICAL: Record<VerticalKey, VerticalConfig> = {
  [HOMEKEEP_WEDGE_CATALOG.air_purifier]: {
    key: HOMEKEEP_WEDGE_CATALOG.air_purifier,
    dataDir: "air-purifier",
    labelForTitle: "Air purifier",
    tables: {
      filters: "air_purifier_filters",
      models: "air_purifier_models",
      modelAliases: "air_purifier_model_aliases",
      modelAliasModelFk: "air_purifier_model_id",
      modelAliasConflict: "air_purifier_model_id,alias",
      filterAliases: "air_purifier_filter_aliases",
      filterAliasFilterFk: "air_purifier_filter_id",
      filterAliasConflict: "air_purifier_filter_id,alias",
      compatibility: "air_purifier_compatibility_mappings",
      compatModelFk: "air_purifier_model_id",
      compatFilterFk: "air_purifier_filter_id",
      retailerLinks: "air_purifier_retailer_links",
      retailerFilterFk: "air_purifier_filter_id",
    },
  },
  [HOMEKEEP_WEDGE_CATALOG.vacuum]: {
    key: HOMEKEEP_WEDGE_CATALOG.vacuum,
    dataDir: "vacuum",
    labelForTitle: "Vacuum",
    tables: {
      filters: "vacuum_filters",
      models: "vacuum_models",
      modelAliases: "vacuum_model_aliases",
      modelAliasModelFk: "vacuum_model_id",
      modelAliasConflict: "vacuum_model_id,alias",
      filterAliases: "vacuum_filter_aliases",
      filterAliasFilterFk: "vacuum_filter_id",
      filterAliasConflict: "vacuum_filter_id,alias",
      compatibility: "vacuum_compatibility_mappings",
      compatModelFk: "vacuum_model_id",
      compatFilterFk: "vacuum_filter_id",
      retailerLinks: "vacuum_retailer_links",
      retailerFilterFk: "vacuum_filter_id",
    },
  },
  [HOMEKEEP_WEDGE_CATALOG.humidifier]: {
    key: HOMEKEEP_WEDGE_CATALOG.humidifier,
    dataDir: "humidifier",
    labelForTitle: "Humidifier",
    tables: {
      filters: "humidifier_filters",
      models: "humidifier_models",
      modelAliases: "humidifier_model_aliases",
      modelAliasModelFk: "humidifier_model_id",
      modelAliasConflict: "humidifier_model_id,alias",
      filterAliases: "humidifier_filter_aliases",
      filterAliasFilterFk: "humidifier_filter_id",
      filterAliasConflict: "humidifier_filter_id,alias",
      compatibility: "humidifier_compatibility_mappings",
      compatModelFk: "humidifier_model_id",
      compatFilterFk: "humidifier_filter_id",
      retailerLinks: "humidifier_retailer_links",
      retailerFilterFk: "humidifier_filter_id",
    },
  },
  [HOMEKEEP_WEDGE_CATALOG.appliance_air]: {
    key: HOMEKEEP_WEDGE_CATALOG.appliance_air,
    dataDir: "appliance-air",
    labelForTitle: "Appliance air",
    tables: {
      filters: "appliance_air_parts",
      models: "appliance_air_models",
      modelAliases: "appliance_air_model_aliases",
      modelAliasModelFk: "appliance_air_model_id",
      modelAliasConflict: "appliance_air_model_id,alias",
      filterAliases: "appliance_air_part_aliases",
      filterAliasFilterFk: "appliance_air_part_id",
      filterAliasConflict: "appliance_air_part_id,alias",
      compatibility: "appliance_air_compatibility_mappings",
      compatModelFk: "appliance_air_model_id",
      compatFilterFk: "appliance_air_part_id",
      retailerLinks: "appliance_air_retailer_links",
      retailerFilterFk: "appliance_air_part_id",
    },
  },
  [HOMEKEEP_WEDGE_CATALOG.whole_house_water]: {
    key: HOMEKEEP_WEDGE_CATALOG.whole_house_water,
    dataDir: "whole-house-water",
    labelForTitle: "Whole-house water filter",
    tables: {
      filters: "whole_house_water_parts",
      models: "whole_house_water_models",
      modelAliases: "whole_house_water_model_aliases",
      modelAliasModelFk: "whole_house_water_model_id",
      modelAliasConflict: "whole_house_water_model_id,alias",
      filterAliases: "whole_house_water_part_aliases",
      filterAliasFilterFk: "whole_house_water_part_id",
      filterAliasConflict: "whole_house_water_part_id,alias",
      compatibility: "whole_house_water_compatibility_mappings",
      compatModelFk: "whole_house_water_model_id",
      compatFilterFk: "whole_house_water_part_id",
      retailerLinks: "whole_house_water_retailer_links",
      retailerFilterFk: "whole_house_water_part_id",
    },
  },
};

function optStr(v: string | undefined): string | null {
  const s = v?.trim();
  return s === undefined || s === "" ? null : s;
}

/** Optional CSV column: true / 1 / yes (case-insensitive). */
function csvBoolRecommended(v: string | undefined): boolean {
  const s = v?.trim().toLowerCase();
  return s === "true" || s === "1" || s === "yes";
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

export async function runVerticalSeed(
  verticalKey: VerticalKey,
  cwd: string,
  useSample: boolean,
) {
  const c = VERTICAL[verticalKey];
  const supabase = getSupabaseAdmin();

  async function importBrands() {
    const file = categoryDataCsvPath(cwd, c.dataDir, "brands", useSample);
    const rows = readCsvFile(file, ["slug", "name"]);
    if (rows.length === 0) {
      warn(`${c.key}/brands`, `Skip (empty): ${file}`);
      return;
    }
    const payload = rows.map((r) => ({
      slug: r.slug.trim(),
      name: r.name.trim(),
    }));
    const { error } = await supabase.from("brands").upsert(payload, {
      onConflict: "slug",
      ignoreDuplicates: false,
    });
    if (error) throw error;
    log(`${c.key}/brands`, `Upserted ${payload.length} row(s) from ${file}`);
  }

  async function importFilters() {
    const file = categoryDataCsvPath(cwd, c.dataDir, "filters", useSample);
    const rows = readCsvFile(file, [
      "brand_slug",
      "slug",
      "oem_part_number",
    ]);
    if (rows.length === 0) {
      warn(`${c.key}/filters`, `Skip (empty): ${file}`);
      return;
    }
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
          `${c.dataDir}/filters.csv: unknown brand_slug "${brand_slug}" for filter slug "${r.slug}"`,
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

    const { error } = await supabase.from(c.tables.filters).upsert(payload, {
      onConflict: "oem_part_number",
      ignoreDuplicates: false,
    });
    if (error) throw error;
    log(`${c.key}/filters`, `Upserted ${payload.length} row(s) from ${file}`);
  }

  async function importModels() {
    const file = categoryDataCsvPath(cwd, c.dataDir, "models", useSample);
    const rows = readCsvFile(file, ["brand_slug", "slug", "model_number"]);
    if (rows.length === 0) {
      warn(`${c.key}/models`, `Skip (empty): ${file}`);
      return;
    }
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
          `${c.dataDir}/models.csv: unknown brand_slug "${brand_slug}" for slug "${r.slug}"`,
        );
      }
      const model_number = r.model_number.trim();
      const brandName = brandNameBySlug.get(brand_slug) ?? brand_slug;
      const titleFromCsv = optStr(r.title);
      const title =
        titleFromCsv && titleFromCsv.trim().length > 0
          ? titleFromCsv.trim()
          : `${brandName} ${model_number} ${c.labelForTitle}`;
      return {
        brand_id,
        slug: r.slug.trim(),
        model_number,
        title,
        series: optStr(r.series),
        notes: optStr(r.notes),
      };
    });

    const { error } = await supabase.from(c.tables.models).upsert(payload, {
      onConflict: "model_number",
      ignoreDuplicates: false,
    });
    if (error) throw error;
    log(`${c.key}/models`, `Upserted ${payload.length} row(s) from ${file}`);
  }

  async function importModelAliases() {
    const file = categoryDataCsvPath(
      cwd,
      c.dataDir,
      "model_aliases",
      useSample,
    );
    if (!fs.existsSync(file)) {
      warn(`${c.key}/model_aliases`, `Skip (missing): ${file}`);
      return;
    }
    const rows = readCsvFile(file, ["model_slug", "alias"]);
    if (rows.length === 0) {
      warn(`${c.key}/model_aliases`, `Skip (empty): ${file}`);
      return;
    }
    const { data: models, error: mErr } = await supabase
      .from(c.tables.models)
      .select("id, slug");
    if (mErr) throw mErr;
    const modelBySlug = new Map(
      (models ?? []).map((x) => [x.slug as string, x.id as string]),
    );

    const payload = rows.map((r) => {
      const ms = r.model_slug.trim();
      const alias = r.alias.trim();
      const mid = modelBySlug.get(ms);
      if (!mid) {
        throw new Error(
          `${c.dataDir}/model_aliases.csv: unknown model_slug "${ms}" for alias "${alias}"`,
        );
      }
      return { [c.tables.modelAliasModelFk]: mid, alias };
    });

    const { error } = await supabase
      .from(c.tables.modelAliases)
      .upsert(payload, {
        onConflict: c.tables.modelAliasConflict,
        ignoreDuplicates: false,
      });
    if (error) throw error;
    log(
      `${c.key}/model_aliases`,
      `Upserted ${payload.length} row(s) from ${file}`,
    );
  }

  async function importFilterAliases() {
    const file = categoryDataCsvPath(
      cwd,
      c.dataDir,
      "filter_aliases",
      useSample,
    );
    if (!fs.existsSync(file)) {
      warn(`${c.key}/filter_aliases`, `Skip (missing): ${file}`);
      return;
    }
    const rows = readCsvFile(file, ["filter_slug", "alias"]);
    if (rows.length === 0) {
      warn(`${c.key}/filter_aliases`, `Skip (empty): ${file}`);
      return;
    }
    const { data: filters, error: flErr } = await supabase
      .from(c.tables.filters)
      .select("id, slug");
    if (flErr) throw flErr;
    const filterBySlug = new Map(
      (filters ?? []).map((x) => [x.slug as string, x.id as string]),
    );

    const payload = rows.map((r) => {
      const fsSlug = r.filter_slug.trim();
      const alias = r.alias.trim();
      const fid = filterBySlug.get(fsSlug);
      if (!fid) {
        throw new Error(
          `${c.dataDir}/filter_aliases.csv: unknown filter_slug "${fsSlug}" for alias "${alias}"`,
        );
      }
      return { [c.tables.filterAliasFilterFk]: fid, alias };
    });

    const { error } = await supabase
      .from(c.tables.filterAliases)
      .upsert(payload, {
        onConflict: c.tables.filterAliasConflict,
        ignoreDuplicates: false,
      });
    if (error) throw error;
    log(
      `${c.key}/filter_aliases`,
      `Upserted ${payload.length} row(s) from ${file}`,
    );
  }

  async function importCompatibilityMappings() {
    const file = categoryDataCsvPath(
      cwd,
      c.dataDir,
      "compatibility_mappings",
      useSample,
    );
    const rows = readCsvFile(file, ["model_slug", "filter_slug"]);
    if (rows.length === 0) {
      warn(`${c.key}/compatibility_mappings`, `Skip (empty): ${file}`);
      return;
    }
    const hasRecCol = rows.length > 0 && "is_recommended" in rows[0]!;

    const [{ data: models, error: mErr }, { data: filters, error: flErr }] =
      await Promise.all([
        supabase.from(c.tables.models).select("id, slug"),
        supabase.from(c.tables.filters).select("id, slug"),
      ]);
    if (mErr) throw mErr;
    if (flErr) throw flErr;

    const modelBySlug = new Map(
      (models ?? []).map((x) => [x.slug as string, x.id as string]),
    );
    const filterBySlug = new Map(
      (filters ?? []).map((x) => [x.slug as string, x.id as string]),
    );

    const payload = rows.map((r) => {
      const ms = r.model_slug.trim();
      const fsSlug = r.filter_slug.trim();
      const model_id = modelBySlug.get(ms);
      const filter_id = filterBySlug.get(fsSlug);
      if (!model_id) {
        throw new Error(
          `${c.dataDir}/compatibility_mappings.csv: unknown model_slug "${ms}"`,
        );
      }
      if (!filter_id) {
        throw new Error(
          `${c.dataDir}/compatibility_mappings.csv: unknown filter_slug "${fsSlug}"`,
        );
      }
      const is_recommended = hasRecCol ? csvBoolRecommended(r.is_recommended) : false;
      return {
        [c.tables.compatModelFk]: model_id,
        [c.tables.compatFilterFk]: filter_id,
        is_recommended,
      };
    });

    const { error } = await supabase
      .from(c.tables.compatibility)
      .upsert(payload, {
        onConflict: `${c.tables.compatModelFk},${c.tables.compatFilterFk}`,
        ignoreDuplicates: false,
      });
    if (error) throw error;
    log(
      `${c.key}/compatibility_mappings`,
      `Upserted ${payload.length} row(s) from ${file}`,
    );
  }

  async function importRetailerLinks() {
    const file = categoryDataCsvPath(
      cwd,
      c.dataDir,
      "retailer_links",
      useSample,
    );
    const rows = readCsvFile(file, ["filter_slug", "affiliate_url"]);
    if (rows.length === 0) {
      warn(`${c.key}/retailer_links`, `Skip (empty): ${file}`);
      return;
    }

    const { data: filters, error: flErr } = await supabase
      .from(c.tables.filters)
      .select("id, slug");
    if (flErr) throw flErr;
    const filterBySlug = new Map(
      (filters ?? []).map((x) => [x.slug as string, x.id as string]),
    );

    const fk = c.tables.retailerFilterFk;
    const ops = rows.map((r) => {
      const filter_slug = r.filter_slug.trim();
      const affiliate_url = r.affiliate_url.trim();
      const destination_url = optStr(r.destination_url) ?? affiliate_url;
      const filter_id = filterBySlug.get(filter_slug);
      if (!filter_id) {
        throw new Error(
          `${c.dataDir}/retailer_links.csv: unknown filter_slug "${filter_slug}"`,
        );
      }

      const retailer_key = retailerKeyFromRow(r);
      const retailer_slug = retailerSlugFromRow(r);

      const insertRow: Record<string, unknown> = {
        [fk]: filter_id,
        retailer_name: optStr(r.retailer_name),
        affiliate_url,
        destination_url,
        is_primary: optBool(r.is_primary) ?? false,
        retailer_key,
        retailer_slug,
        status: "approved",
        source: "manual",
      };

      const updateRow: Record<string, unknown> = {
        retailer_name: insertRow.retailer_name,
        destination_url: insertRow.destination_url,
        is_primary: insertRow.is_primary,
        retailer_key: insertRow.retailer_key,
        retailer_slug: insertRow.retailer_slug,
        status: insertRow.status,
        source: insertRow.source,
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
        table: c.tables.retailerLinks,
        filterFkColumn: fk,
        ops,
      });

    log(
      `${c.key}/retailer_links`,
      `Processed ${rows.length} CSV line(s), ${uniquePairs} unique (filter, affiliate_url) from ${file} (inserted ${inserted}, updated ${updated})`,
    );
  }

  await importBrands();
  await importFilters();
  await importModels();
  await importModelAliases();
  await importFilterAliases();
  await importCompatibilityMappings();
  await importRetailerLinks();
}
