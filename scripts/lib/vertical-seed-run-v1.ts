/**
 * Vertical CSV seed import — run orchestration with truth-ledger outcome recording.
 */

import fs from "node:fs";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { HomekeepWedgeCatalog } from "@/lib/catalog/identity";
import { HOMEKEEP_WEDGE_CATALOG } from "@/lib/catalog/identity";

import type { BuckpartsIoCapabilityV1 } from "./buckparts-io-capabilities-v1";
import { bulkApplyRetailerLinksByAffiliateMatch } from "./bulk-retailer-links-import";
import { categoryDataCsvPath, readCsvFile } from "./csv";
import type { FounderDecisionRowWithSlugCorrelationV1 } from "./founder-decision-slug-correlation-v1";
import { log, warn } from "./log";
import {
  buildVerticalSeedMutationPreflightV1,
  VERTICAL_SEED_MUTATION_GATE_REF_V1,
  VERTICAL_SEED_MUTATION_LANE_V1,
  verticalSeedMutationAuthorizedV1,
  type VerticalSeedMutationPreflightV1,
} from "./vertical-seed-mutation-gate-v1";
import { getSupabaseAdmin } from "./supabase-admin";
import {
  recordTruthLedgerMutationOutcomeV1,
  type TruthLedgerMutationApplyOutcomeV1,
} from "./truth-ledger-v1";

/** Inventory/static-audit marker — run module satisfies mutationGateRef checks. */
const mutationGateRef = VERTICAL_SEED_MUTATION_GATE_REF_V1;
void mutationGateRef;

const TRUTH_LEDGER_IO_ON_WRITE_INTENT_V1 = "MUTATION" as const;

/** Parallel verticals (excludes refrigerator_water — that path uses `import-seed`). */
export type VerticalKey = Exclude<HomekeepWedgeCatalog, "refrigerator_water">;

export type VerticalSeedApplyStatusV1 = "BLOCKED" | "APPLIED";

export type VerticalSeedPhaseResultV1 = {
  phase: string;
  row_count: number;
  action: "skipped_empty" | "skipped_missing" | "would_upsert" | "upserted";
};

export type VerticalSeedReportV1 = {
  dry_run: boolean;
  use_sample: boolean;
  vertical_key: VerticalKey;
  phases: VerticalSeedPhaseResultV1[];
  apply_status?: VerticalSeedApplyStatusV1;
  mutation_authorized?: boolean;
  mutation_preflight_blockers?: string[];
  founder_decision_id?: string | null;
};

export type VerticalSeedRunResultV1 = {
  report: VerticalSeedReportV1;
  exit_code: 0 | 1;
};

export type VerticalSeedDepsV1 = {
  getSupabaseAdmin: () => SupabaseClient;
};

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

type VerticalSeedCtxV1 = {
  rootDir: string;
  useSample: boolean;
  performWrites: boolean;
  verticalKey: VerticalKey;
  c: VerticalConfig;
  deps: VerticalSeedDepsV1;
  phases: VerticalSeedPhaseResultV1[];
};

async function upsertTablePhaseV1(
  ctx: VerticalSeedCtxV1,
  phase: string,
  table: string,
  payload: Record<string, unknown>[],
  file: string,
  onConflict: string,
): Promise<void> {
  const supabase = ctx.deps.getSupabaseAdmin();
  if (ctx.performWrites) {
    const { error } = await supabase.from(table).upsert(payload, {
      onConflict,
      ignoreDuplicates: false,
    });
    if (error) throw error;
    ctx.phases.push({ phase, row_count: payload.length, action: "upserted" });
    log(phase, `Upserted ${payload.length} row(s) from ${file}`);
  } else {
    ctx.phases.push({ phase, row_count: payload.length, action: "would_upsert" });
    log(phase, `Would upsert ${payload.length} row(s) from ${file}`);
  }
}

async function loadVerticalBrandMapsFromCsvAndDbV1(ctx: VerticalSeedCtxV1): Promise<{
  brandBySlug: Map<string, string>;
  brandNameBySlug: Map<string, string>;
}> {
  const { c } = ctx;
  const brandFile = categoryDataCsvPath(ctx.rootDir, c.dataDir, "brands", ctx.useSample);
  const brandRows = readCsvFile(brandFile, ["slug", "name"]);
  const brandBySlug = new Map<string, string>();
  const brandNameBySlug = new Map<string, string>();
  for (const r of brandRows) {
    const slug = r.slug.trim();
    brandBySlug.set(slug, `dry-run-brand:${slug}`);
    brandNameBySlug.set(slug, r.name.trim());
  }
  const supabase = ctx.deps.getSupabaseAdmin();
  const { data: brands, error: bErr } = await supabase.from("brands").select("id, slug, name");
  if (bErr) throw bErr;
  for (const b of brands ?? []) {
    const slug = b.slug as string;
    brandBySlug.set(slug, b.id as string);
    brandNameBySlug.set(slug, b.name as string);
  }
  return { brandBySlug, brandNameBySlug };
}

async function loadVerticalFilterSlugMapFromCsvAndDbV1(
  ctx: VerticalSeedCtxV1,
): Promise<Map<string, string>> {
  const { c } = ctx;
  const file = categoryDataCsvPath(ctx.rootDir, c.dataDir, "filters", ctx.useSample);
  const rows = readCsvFile(file, ["brand_slug", "slug", "oem_part_number"]);
  const filterBySlug = new Map<string, string>();
  for (const r of rows) {
    const slug = r.slug.trim();
    filterBySlug.set(slug, `dry-run-filter:${slug}`);
  }
  const supabase = ctx.deps.getSupabaseAdmin();
  const { data: filters, error: flErr } = await supabase.from(c.tables.filters).select("id, slug");
  if (flErr) throw flErr;
  for (const f of filters ?? []) {
    filterBySlug.set(f.slug as string, f.id as string);
  }
  return filterBySlug;
}

async function loadVerticalModelSlugMapFromCsvAndDbV1(
  ctx: VerticalSeedCtxV1,
): Promise<Map<string, string>> {
  const { c } = ctx;
  const file = categoryDataCsvPath(ctx.rootDir, c.dataDir, "models", ctx.useSample);
  const rows = readCsvFile(file, ["brand_slug", "slug", "model_number"]);
  const modelBySlug = new Map<string, string>();
  for (const r of rows) {
    const slug = r.slug.trim();
    modelBySlug.set(slug, `dry-run-model:${slug}`);
  }
  const supabase = ctx.deps.getSupabaseAdmin();
  const { data: models, error: mErr } = await supabase.from(c.tables.models).select("id, slug");
  if (mErr) throw mErr;
  for (const m of models ?? []) {
    modelBySlug.set(m.slug as string, m.id as string);
  }
  return modelBySlug;
}

function optStr(v: string | undefined): string | null {
  const s = v?.trim();
  return s === undefined || s === "" ? null : s;
}

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

async function importBrands(ctx: VerticalSeedCtxV1) {
  const { c } = ctx;
  const file = categoryDataCsvPath(ctx.rootDir, c.dataDir, "brands", ctx.useSample);
  const rows = readCsvFile(file, ["slug", "name"]);
  if (rows.length === 0) {
    warn(`${c.key}/brands`, `Skip (empty): ${file}`);
    ctx.phases.push({ phase: `${c.key}/brands`, row_count: 0, action: "skipped_empty" });
    return;
  }
  const payload = rows.map((r) => ({
    slug: r.slug.trim(),
    name: r.name.trim(),
  }));
  await upsertTablePhaseV1(ctx, `${c.key}/brands`, "brands", payload, file, "slug");
}

async function importFilters(ctx: VerticalSeedCtxV1) {
  const { c } = ctx;
  const file = categoryDataCsvPath(ctx.rootDir, c.dataDir, "filters", ctx.useSample);
  const rows = readCsvFile(file, ["brand_slug", "slug", "oem_part_number"]);
  if (rows.length === 0) {
    warn(`${c.key}/filters`, `Skip (empty): ${file}`);
    ctx.phases.push({ phase: `${c.key}/filters`, row_count: 0, action: "skipped_empty" });
    return;
  }
  const { brandBySlug } = await loadVerticalBrandMapsFromCsvAndDbV1(ctx);

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

  await upsertTablePhaseV1(
    ctx,
    `${c.key}/filters`,
    c.tables.filters,
    payload,
    file,
    "oem_part_number",
  );
}

async function importModels(ctx: VerticalSeedCtxV1) {
  const { c } = ctx;
  const file = categoryDataCsvPath(ctx.rootDir, c.dataDir, "models", ctx.useSample);
  const rows = readCsvFile(file, ["brand_slug", "slug", "model_number"]);
  if (rows.length === 0) {
    warn(`${c.key}/models`, `Skip (empty): ${file}`);
    ctx.phases.push({ phase: `${c.key}/models`, row_count: 0, action: "skipped_empty" });
    return;
  }
  const { brandBySlug, brandNameBySlug } = await loadVerticalBrandMapsFromCsvAndDbV1(ctx);

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

  await upsertTablePhaseV1(
    ctx,
    `${c.key}/models`,
    c.tables.models,
    payload,
    file,
    "model_number",
  );
}

async function importModelAliases(ctx: VerticalSeedCtxV1) {
  const { c } = ctx;
  const file = categoryDataCsvPath(ctx.rootDir, c.dataDir, "model_aliases", ctx.useSample);
  if (!fs.existsSync(file)) {
    warn(`${c.key}/model_aliases`, `Skip (missing): ${file}`);
    ctx.phases.push({ phase: `${c.key}/model_aliases`, row_count: 0, action: "skipped_missing" });
    return;
  }
  const rows = readCsvFile(file, ["model_slug", "alias"]);
  if (rows.length === 0) {
    warn(`${c.key}/model_aliases`, `Skip (empty): ${file}`);
    ctx.phases.push({ phase: `${c.key}/model_aliases`, row_count: 0, action: "skipped_empty" });
    return;
  }
  const modelBySlug = await loadVerticalModelSlugMapFromCsvAndDbV1(ctx);

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

  await upsertTablePhaseV1(
    ctx,
    `${c.key}/model_aliases`,
    c.tables.modelAliases,
    payload,
    file,
    c.tables.modelAliasConflict,
  );
}

async function importFilterAliases(ctx: VerticalSeedCtxV1) {
  const { c } = ctx;
  const file = categoryDataCsvPath(ctx.rootDir, c.dataDir, "filter_aliases", ctx.useSample);
  if (!fs.existsSync(file)) {
    warn(`${c.key}/filter_aliases`, `Skip (missing): ${file}`);
    ctx.phases.push({ phase: `${c.key}/filter_aliases`, row_count: 0, action: "skipped_missing" });
    return;
  }
  const rows = readCsvFile(file, ["filter_slug", "alias"]);
  if (rows.length === 0) {
    warn(`${c.key}/filter_aliases`, `Skip (empty): ${file}`);
    ctx.phases.push({ phase: `${c.key}/filter_aliases`, row_count: 0, action: "skipped_empty" });
    return;
  }
  const filterBySlug = await loadVerticalFilterSlugMapFromCsvAndDbV1(ctx);

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

  await upsertTablePhaseV1(
    ctx,
    `${c.key}/filter_aliases`,
    c.tables.filterAliases,
    payload,
    file,
    c.tables.filterAliasConflict,
  );
}

async function importCompatibilityMappings(ctx: VerticalSeedCtxV1) {
  const { c } = ctx;
  const file = categoryDataCsvPath(ctx.rootDir, c.dataDir, "compatibility_mappings", ctx.useSample);
  const rows = readCsvFile(file, ["model_slug", "filter_slug"]);
  if (rows.length === 0) {
    warn(`${c.key}/compatibility_mappings`, `Skip (empty): ${file}`);
    ctx.phases.push({
      phase: `${c.key}/compatibility_mappings`,
      row_count: 0,
      action: "skipped_empty",
    });
    return;
  }
  const hasRecCol = rows.length > 0 && "is_recommended" in rows[0]!;
  const [modelBySlug, filterBySlug] = await Promise.all([
    loadVerticalModelSlugMapFromCsvAndDbV1(ctx),
    loadVerticalFilterSlugMapFromCsvAndDbV1(ctx),
  ]);

  const payload = rows.map((r) => {
    const ms = r.model_slug.trim();
    const fsSlug = r.filter_slug.trim();
    const model_id = modelBySlug.get(ms);
    const filter_id = filterBySlug.get(fsSlug);
    if (!model_id) {
      throw new Error(`${c.dataDir}/compatibility_mappings.csv: unknown model_slug "${ms}"`);
    }
    if (!filter_id) {
      throw new Error(`${c.dataDir}/compatibility_mappings.csv: unknown filter_slug "${fsSlug}"`);
    }
    const is_recommended = hasRecCol ? csvBoolRecommended(r.is_recommended) : false;
    return {
      [c.tables.compatModelFk]: model_id,
      [c.tables.compatFilterFk]: filter_id,
      is_recommended,
    };
  });

  await upsertTablePhaseV1(
    ctx,
    `${c.key}/compatibility_mappings`,
    c.tables.compatibility,
    payload,
    file,
    `${c.tables.compatModelFk},${c.tables.compatFilterFk}`,
  );
}

async function importRetailerLinks(ctx: VerticalSeedCtxV1) {
  const { c } = ctx;
  const file = categoryDataCsvPath(ctx.rootDir, c.dataDir, "retailer_links", ctx.useSample);
  const rows = readCsvFile(file, ["filter_slug", "affiliate_url"]);
  if (rows.length === 0) {
    warn(`${c.key}/retailer_links`, `Skip (empty): ${file}`);
    ctx.phases.push({ phase: `${c.key}/retailer_links`, row_count: 0, action: "skipped_empty" });
    return;
  }

  const filterBySlug = await loadVerticalFilterSlugMapFromCsvAndDbV1(ctx);

  const fk = c.tables.retailerFilterFk;
  const ops = rows.map((r) => {
    const filter_slug = r.filter_slug.trim();
    const affiliate_url = r.affiliate_url.trim();
    const destination_url = optStr(r.destination_url) ?? affiliate_url;
    const filter_id = filterBySlug.get(filter_slug);
    if (!filter_id) {
      throw new Error(`${c.dataDir}/retailer_links.csv: unknown filter_slug "${filter_slug}"`);
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

    return { filterId: filter_id, affiliate_url, insertRow, updateRow };
  });

  const uniquePairs = new Set(ops.map((o) => `${o.filterId}\u0000${o.affiliate_url}`)).size;

  if (ctx.performWrites) {
    const supabase = ctx.deps.getSupabaseAdmin();
    const { inserted, updated } = await bulkApplyRetailerLinksByAffiliateMatch(supabase, {
      table: c.tables.retailerLinks,
      filterFkColumn: fk,
      ops,
    });
    ctx.phases.push({
      phase: `${c.key}/retailer_links`,
      row_count: uniquePairs,
      action: "upserted",
    });
    log(
      `${c.key}/retailer_links`,
      `Processed ${rows.length} CSV line(s), ${uniquePairs} unique (filter, affiliate_url) from ${file} (inserted ${inserted}, updated ${updated})`,
    );
  } else {
    ctx.phases.push({
      phase: `${c.key}/retailer_links`,
      row_count: uniquePairs,
      action: "would_upsert",
    });
    log(
      `${c.key}/retailer_links`,
      `Would process ${rows.length} CSV line(s), ${uniquePairs} unique (filter, affiliate_url) from ${file}`,
    );
  }
}

async function executeVerticalSeedPhasesV1(ctx: VerticalSeedCtxV1): Promise<void> {
  await importBrands(ctx);
  await importFilters(ctx);
  await importModels(ctx);
  await importModelAliases(ctx);
  await importFilterAliases(ctx);
  await importCompatibilityMappings(ctx);
  await importRetailerLinks(ctx);
}

export function parseVerticalSeedCliArgsV1(argv: readonly string[]): {
  write: boolean;
  useSample: boolean;
} {
  return {
    write: argv.includes("--write"),
    useSample: argv.includes("--sample"),
  };
}

export function createVerticalSeedLiveDepsV1(
  getSupabaseAdmin: () => SupabaseClient,
): VerticalSeedDepsV1 {
  return { getSupabaseAdmin };
}

export async function runVerticalSeedV1(args: {
  rootDir: string;
  verticalKey: VerticalKey;
  useSample: boolean;
  write: boolean;
  deps: VerticalSeedDepsV1;
  now?: () => Date;
  io_capability?: BuckpartsIoCapabilityV1;
  readText?: (abs: string) => string;
  founderRows?: readonly FounderDecisionRowWithSlugCorrelationV1[];
  recordTruthLedger?: typeof recordTruthLedgerMutationOutcomeV1;
  fileExists?: (abs: string) => boolean;
}): Promise<VerticalSeedRunResultV1> {
  const recordTruthLedger = args.recordTruthLedger ?? recordTruthLedgerMutationOutcomeV1;
  const c = VERTICAL[args.verticalKey];
  const phases: VerticalSeedPhaseResultV1[] = [];
  const ctx: VerticalSeedCtxV1 = {
    rootDir: args.rootDir,
    useSample: args.useSample,
    performWrites: false,
    verticalKey: args.verticalKey,
    c,
    deps: args.deps,
    phases,
  };

  const baseReport: VerticalSeedReportV1 = {
    dry_run: !args.write,
    use_sample: args.useSample,
    vertical_key: args.verticalKey,
    phases: [],
  };

  if (!args.write) {
    await executeVerticalSeedPhasesV1(ctx);
    return { report: { ...baseReport, phases }, exit_code: 0 };
  }

  const preflight: VerticalSeedMutationPreflightV1 = buildVerticalSeedMutationPreflightV1({
    rootDir: args.rootDir,
    mode: "write",
    verticalKey: args.verticalKey,
    useSample: args.useSample,
    io_capability: args.io_capability,
    now: args.now,
    readText: args.readText,
    founderRows: args.founderRows,
    fileExists: args.fileExists,
  });
  const mutation_authorized = verticalSeedMutationAuthorizedV1(preflight);
  const blockers = [...preflight.blockers];

  if (mutation_authorized) {
    ctx.performWrites = true;
    await executeVerticalSeedPhasesV1(ctx);
  }

  let apply_status: VerticalSeedApplyStatusV1 =
    blockers.length > 0 ? "BLOCKED" : "APPLIED";

  const applyOutcome: TruthLedgerMutationApplyOutcomeV1 =
    apply_status === "BLOCKED" ? "blocked" : "applied";
  const record = recordTruthLedger({
    rootDir: args.rootDir,
    io_capability: TRUTH_LEDGER_IO_ON_WRITE_INTENT_V1,
    mutation_lane: VERTICAL_SEED_MUTATION_LANE_V1,
    founder_decision_id: preflight.founder_decision_id,
    apply_outcome: applyOutcome,
    blockers,
    now: args.now,
  });
  if (!record.ok) {
    blockers.push(...record.blockers);
    apply_status = "BLOCKED";
  }

  return {
    report: {
      ...baseReport,
      dry_run: false,
      phases,
      apply_status,
      mutation_authorized: mutation_authorized && apply_status === "APPLIED",
      mutation_preflight_blockers: blockers,
      founder_decision_id: preflight.founder_decision_id,
    },
    exit_code: apply_status === "BLOCKED" ? 1 : 0,
  };
}

/** Back-compat wrapper — defaults to dry-run unless write is passed via options. */
export async function runVerticalSeed(
  verticalKey: VerticalKey,
  rootDir: string,
  useSampleOrOptions: boolean | { useSample?: boolean; write?: boolean },
  maybeWrite?: boolean,
): Promise<VerticalSeedRunResultV1> {
  let useSample: boolean;
  let write: boolean;
  if (typeof useSampleOrOptions === "boolean") {
    useSample = useSampleOrOptions;
    write = maybeWrite ?? false;
  } else {
    useSample = useSampleOrOptions.useSample ?? false;
    write = useSampleOrOptions.write ?? false;
  }
  return runVerticalSeedV1({
    rootDir,
    verticalKey,
    useSample,
    write,
    deps: createVerticalSeedLiveDepsV1(getSupabaseAdmin),
  });
}
