/**
 * Read-only AP-wide Supabase vs committed CSV diff v1.
 * No CSV or Supabase mutation.
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { parse } from "csv-parse/sync";

import {
  buyLinkGateFailureKind,
  isDirectBuyableSafeCtaRow,
} from "@/lib/retailers/launch-buy-links";

export const AP_SUPABASE_VS_CSV_DIFF_CONTRACT_V1 =
  "air_purifier_supabase_vs_csv_diff_v1" as const;

export const AP_SUPABASE_VS_CSV_DIFF_DEFAULT_OUT_REL_V1 =
  "data/air-purifier/batch-production/audits/ap-supabase-vs-csv-diff-v1.json" as const;

/** Slugs removed from CSV but known to remain dangerous if live in Supabase. */
export const AP_KNOWN_DEPRECATED_CSV_REMOVED_FILTER_SLUGS_V1 = [
  "shark-carbon-foam",
] as const;

export type ApSupabaseTruthStatusV1 = "CHECKED" | "UNKNOWN_DB_UNAVAILABLE";

export type ApFieldDriftRowV1 = {
  key: string;
  field: string;
  csv_value: string | null;
  supabase_value: string | null;
};

export type ApSeedImportBlockerV1 = {
  blocker_kind:
    | "filter_slug_oem_collision"
    | "filter_missing_brand"
    | "model_missing_brand"
    | "compat_unknown_model_slug"
    | "compat_unknown_filter_slug"
    | "retailer_link_unknown_filter_slug"
    | "filter_alias_unknown_filter_slug"
    | "model_alias_unknown_model_slug";
  key: string;
  detail: string;
};

export type ApDangerousDbOnlySlugV1 = {
  filter_slug: string;
  danger_class: "csv_removed_deprecated" | "db_only_with_live_links" | "db_only_with_compat";
  supabase_oem_part_number: string | null;
  supabase_retailer_link_count: number;
  supabase_compat_model_count: number;
  why_dangerous: string;
};

export type ApTableDiffSummaryV1 = {
  csv_count: number;
  supabase_count: number;
  csv_only_count: number;
  supabase_only_count: number;
  shared_count: number;
  field_drift_count: number;
};

export type ApSupabaseVsCsvDiffReportV1 = {
  contract: typeof AP_SUPABASE_VS_CSV_DIFF_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  generated_at: string;
  git_head_hint: string | null;
  exact_repo_paths_read: string[];
  supabase_tables_queried: string[];
  supabase_truth_status: ApSupabaseTruthStatusV1;
  supabase_unavailable_reason: string | null;
  summary: {
    brands: ApTableDiffSummaryV1;
    air_purifier_filters: ApTableDiffSummaryV1;
    air_purifier_models: ApTableDiffSummaryV1;
    air_purifier_filter_aliases: ApTableDiffSummaryV1;
    air_purifier_model_aliases: ApTableDiffSummaryV1;
    air_purifier_compatibility_mappings: ApTableDiffSummaryV1;
    air_purifier_retailer_links: ApTableDiffSummaryV1;
    seed_import_blocker_count: number;
    browser_truth_drift_count: number;
    dangerous_db_only_slug_count: number;
    csv_safe_direct_buyable_count: number;
    supabase_safe_direct_buyable_count: number;
  };
  brands: {
    csv_only: Array<{ slug: string; name: string }>;
    supabase_only: Array<{ slug: string; name: string }>;
    field_drift: ApFieldDriftRowV1[];
  };
  air_purifier_filters: {
    csv_only: Array<{ slug: string; oem_part_number: string; brand_slug: string }>;
    supabase_only: Array<{ slug: string; oem_part_number: string; brand_slug: string | null }>;
    field_drift: ApFieldDriftRowV1[];
  };
  air_purifier_models: {
    csv_only: Array<{ slug: string; model_number: string; brand_slug: string }>;
    supabase_only: Array<{ slug: string; model_number: string; brand_slug: string | null }>;
    field_drift: ApFieldDriftRowV1[];
  };
  air_purifier_filter_aliases: {
    csv_only: Array<{ filter_slug: string; alias: string }>;
    supabase_only: Array<{ filter_slug: string; alias: string }>;
    field_drift: ApFieldDriftRowV1[];
  };
  air_purifier_model_aliases: {
    csv_only: Array<{ model_slug: string; alias: string }>;
    supabase_only: Array<{ model_slug: string; alias: string }>;
    field_drift: ApFieldDriftRowV1[];
  };
  air_purifier_compatibility_mappings: {
    csv_only: Array<{ model_slug: string; filter_slug: string; is_recommended: boolean }>;
    supabase_only: Array<{ model_slug: string; filter_slug: string; is_recommended: boolean }>;
    field_drift: ApFieldDriftRowV1[];
  };
  air_purifier_retailer_links: {
    csv_only: Array<{
      filter_slug: string;
      retailer_key: string;
      affiliate_url: string;
      is_primary: boolean;
      browser_truth_classification: string | null;
    }>;
    supabase_only: Array<{
      filter_slug: string;
      retailer_key: string;
      affiliate_url: string;
      is_primary: boolean;
      browser_truth_classification: string | null;
    }>;
    field_drift: ApFieldDriftRowV1[];
    browser_truth_drift: Array<{
      filter_slug: string;
      retailer_key: string;
      affiliate_url: string;
      csv_browser_truth_classification: string | null;
      supabase_browser_truth_classification: string | null;
      csv_browser_truth_notes: string | null;
      supabase_browser_truth_notes: string | null;
      csv_browser_truth_checked_at: string | null;
      supabase_browser_truth_checked_at: string | null;
    }>;
  };
  seed_import_blockers: ApSeedImportBlockerV1[];
  dangerous_db_only_slugs: ApDangerousDbOnlySlugV1[];
  authorization_recommendations: {
    backup_export: "HOLD" | "READY_FOR_OWNER_APPROVAL";
    oem_pre_alignment_sql: "HOLD" | "READY_FOR_OWNER_APPROVAL";
    seed_import: "HOLD" | "READY_FOR_OWNER_APPROVAL";
    browser_truth_parity_apply: "HOLD" | "READY_FOR_OWNER_APPROVAL";
    stale_db_delete_packet: "HOLD" | "READY_FOR_OWNER_APPROVAL";
    rationale: string[];
  };
  recommended_next_action: string;
  proven_facts: string[];
  inferred_facts: string[];
  unknown_facts: string[];
};

const AP_CSV_RELS_V1 = {
  brands: "data/air-purifier/brands.csv",
  filters: "data/air-purifier/filters.csv",
  models: "data/air-purifier/models.csv",
  filter_aliases: "data/air-purifier/filter_aliases.csv",
  model_aliases: "data/air-purifier/model_aliases.csv",
  compatibility_mappings: "data/air-purifier/compatibility_mappings.csv",
  retailer_links: "data/air-purifier/retailer_links.csv",
} as const;

type CsvRow = Record<string, string>;

function norm(value: string | null | undefined): string {
  return (value ?? "").trim();
}

function normLower(value: string | null | undefined): string {
  return norm(value).toLowerCase();
}

function csvBool(value: string | undefined): boolean {
  const s = normLower(value);
  return s === "true" || s === "1" || s === "yes";
}

function readOptionalCsv(absPath: string): CsvRow[] {
  if (!existsSync(absPath)) return [];
  return parse(readFileSync(absPath, "utf8"), {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true,
  }) as CsvRow[];
}

function readRequiredCsv(rootDir: string, rel: string): CsvRow[] {
  const abs = path.join(rootDir, rel);
  if (!existsSync(abs)) {
    throw new Error(`CSV not found: ${rel}`);
  }
  return parse(readFileSync(abs, "utf8"), {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true,
  }) as CsvRow[];
}

function tableSummary(args: {
  csvCount: number;
  supabaseCount: number;
  csvOnlyCount: number;
  supabaseOnlyCount: number;
  fieldDriftCount: number;
}): ApTableDiffSummaryV1 {
  return {
    csv_count: args.csvCount,
    supabase_count: args.supabaseCount,
    csv_only_count: args.csvOnlyCount,
    supabase_only_count: args.supabaseOnlyCount,
    shared_count: args.csvCount - args.csvOnlyCount,
    field_drift_count: args.fieldDriftCount,
  };
}

async function pageSupabase<T extends Record<string, unknown>>(
  query: (from: number, to: number) => Promise<{ data: T[] | null; error: Error | null }>,
): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += 2000) {
    const { data, error } = await query(from, from + 1999);
    if (error) throw error;
    const chunk = data ?? [];
    out.push(...chunk);
    if (chunk.length < 2000) break;
  }
  return out;
}

export type BuildApSupabaseVsCsvDiffDepsV1 = {
  now?: () => Date;
  loadSupabase?: () => Promise<
    | { status: "CHECKED"; data: ApSupabaseSnapshotV1 }
    | { status: "UNKNOWN_DB_UNAVAILABLE"; reason: string }
  >;
  readCsv?: (rootDir: string, rel: string) => CsvRow[];
  readOptionalCsv?: (rootDir: string, rel: string) => CsvRow[];
};

type ApSupabaseSnapshotV1 = {
  brands: Array<{ id: string; slug: string; name: string }>;
  filters: Array<{
    id: string;
    slug: string;
    oem_part_number: string;
    name: string | null;
    brand_slug: string | null;
  }>;
  models: Array<{
    id: string;
    slug: string;
    model_number: string;
    title: string;
    series: string | null;
    notes: string | null;
    brand_slug: string | null;
  }>;
  filterAliases: Array<{ filter_slug: string; alias: string }>;
  modelAliases: Array<{ model_slug: string; alias: string }>;
  compat: Array<{ model_slug: string; filter_slug: string; is_recommended: boolean }>;
  retailerLinks: Array<{
    filter_slug: string;
    retailer_key: string;
    affiliate_url: string;
    destination_url: string;
    is_primary: boolean;
    browser_truth_classification: string | null;
    browser_truth_notes: string | null;
    browser_truth_checked_at: string | null;
  }>;
};

export async function tryLoadApSupabaseSnapshotV1(): Promise<
  | { status: "CHECKED"; data: ApSupabaseSnapshotV1 }
  | { status: "UNKNOWN_DB_UNAVAILABLE"; reason: string }
> {
  try {
    const { loadEnv } = await import("./load-env");
    const { getSupabaseAdmin } = await import("./supabase-admin");
    loadEnv();
    const supabase = getSupabaseAdmin();

    const brands = await pageSupabase(async (from, to) =>
      supabase.from("brands").select("id,slug,name").range(from, to),
    );

    const filtersRaw = await pageSupabase(async (from, to) =>
      supabase
        .from("air_purifier_filters")
        .select("id,slug,oem_part_number,name,brands:brand_id(slug)")
        .range(from, to),
    );
    const filters = filtersRaw.map((row) => ({
      id: row.id as string,
      slug: row.slug as string,
      oem_part_number: row.oem_part_number as string,
      name: (row.name as string | null) ?? null,
      brand_slug: ((row.brands as { slug?: string } | null)?.slug ?? null) as string | null,
    }));

    const filterIdToSlug = new Map(filters.map((f) => [f.id, f.slug]));

    const modelsRaw = await pageSupabase(async (from, to) =>
      supabase
        .from("air_purifier_models")
        .select("id,slug,model_number,title,series,notes,brands:brand_id(slug)")
        .range(from, to),
    );
    const models = modelsRaw.map((row) => ({
      id: row.id as string,
      slug: row.slug as string,
      model_number: row.model_number as string,
      title: row.title as string,
      series: (row.series as string | null) ?? null,
      notes: (row.notes as string | null) ?? null,
      brand_slug: ((row.brands as { slug?: string } | null)?.slug ?? null) as string | null,
    }));

    const modelIdToSlug = new Map(models.map((m) => [m.id, m.slug]));

    const filterAliasesRaw = await pageSupabase(async (from, to) =>
      supabase.from("air_purifier_filter_aliases").select("air_purifier_filter_id,alias").range(from, to),
    );
    const filterAliases = filterAliasesRaw
      .map((row) => {
        const filter_slug = filterIdToSlug.get(row.air_purifier_filter_id as string);
        if (!filter_slug) return null;
        return { filter_slug, alias: row.alias as string };
      })
      .filter((row): row is { filter_slug: string; alias: string } => row !== null);

    const modelAliasesRaw = await pageSupabase(async (from, to) =>
      supabase.from("air_purifier_model_aliases").select("air_purifier_model_id,alias").range(from, to),
    );
    const modelAliases = modelAliasesRaw
      .map((row) => {
        const model_slug = modelIdToSlug.get(row.air_purifier_model_id as string);
        if (!model_slug) return null;
        return { model_slug, alias: row.alias as string };
      })
      .filter((row): row is { model_slug: string; alias: string } => row !== null);

    const compatRaw = await pageSupabase(async (from, to) =>
      supabase
        .from("air_purifier_compatibility_mappings")
        .select("air_purifier_model_id,air_purifier_filter_id,is_recommended")
        .range(from, to),
    );
    const compat = compatRaw
      .map((row) => {
        const model_slug = modelIdToSlug.get(row.air_purifier_model_id as string);
        const filter_slug = filterIdToSlug.get(row.air_purifier_filter_id as string);
        if (!model_slug || !filter_slug) return null;
        return {
          model_slug,
          filter_slug,
          is_recommended: row.is_recommended === true,
        };
      })
      .filter(
        (row): row is { model_slug: string; filter_slug: string; is_recommended: boolean } =>
          row !== null,
      );

    const linksRaw = await pageSupabase(async (from, to) =>
      supabase
        .from("air_purifier_retailer_links")
        .select(
          "air_purifier_filter_id,retailer_key,affiliate_url,destination_url,is_primary,browser_truth_classification,browser_truth_notes,browser_truth_checked_at",
        )
        .range(from, to),
    );
    const retailerLinks = linksRaw
      .map((row) => {
        const filter_slug = filterIdToSlug.get(row.air_purifier_filter_id as string);
        if (!filter_slug) return null;
        return {
          filter_slug,
          retailer_key: norm(row.retailer_key as string),
          affiliate_url: norm(row.affiliate_url as string),
          destination_url: norm(row.destination_url as string),
          is_primary: row.is_primary === true,
          browser_truth_classification: norm(row.browser_truth_classification as string) || null,
          browser_truth_notes: norm(row.browser_truth_notes as string) || null,
          browser_truth_checked_at: norm(row.browser_truth_checked_at as string) || null,
        };
      })
      .filter((row): row is NonNullable<typeof row> => row !== null);

    return {
      status: "CHECKED",
      data: {
        brands,
        filters,
        models,
        filterAliases,
        modelAliases,
        compat,
        retailerLinks,
      },
    };
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    return { status: "UNKNOWN_DB_UNAVAILABLE", reason };
  }
}

function linkKey(filterSlug: string, affiliateUrl: string): string {
  return `${filterSlug}\u0000${affiliateUrl}`;
}

export async function buildAirPurifierSupabaseVsCsvDiffV1Report(args: {
  rootDir: string;
  gitHeadHint?: string | null;
  deps?: BuildApSupabaseVsCsvDiffDepsV1;
}): Promise<ApSupabaseVsCsvDiffReportV1> {
  const now = args.deps?.now ?? (() => new Date());
  const readCsvFn =
    args.deps?.readCsv ??
    ((rootDir: string, rel: string) => readRequiredCsv(rootDir, rel));
  const readOptionalCsvFn =
    args.deps?.readOptionalCsv ??
    ((rootDir: string, rel: string) => readOptionalCsv(path.join(rootDir, rel)));
  const loadSupabase = args.deps?.loadSupabase ?? tryLoadApSupabaseSnapshotV1;

  const brandsCsv = readCsvFn(args.rootDir, AP_CSV_RELS_V1.brands);
  const filtersCsv = readCsvFn(args.rootDir, AP_CSV_RELS_V1.filters);
  const modelsCsv = readCsvFn(args.rootDir, AP_CSV_RELS_V1.models);
  const filterAliasesCsv = readOptionalCsvFn(args.rootDir, AP_CSV_RELS_V1.filter_aliases);
  const modelAliasesCsv = readOptionalCsvFn(args.rootDir, AP_CSV_RELS_V1.model_aliases);
  const compatCsv = readCsvFn(args.rootDir, AP_CSV_RELS_V1.compatibility_mappings);
  const linksCsv = readCsvFn(args.rootDir, AP_CSV_RELS_V1.retailer_links);

  const supabaseLoad = await loadSupabase();
  const supabaseChecked = supabaseLoad.status === "CHECKED";
  const db = supabaseChecked ? supabaseLoad.data : null;

  const csvBrandBySlug = new Map(brandsCsv.map((r) => [norm(r.slug), r]));
  const dbBrandBySlug = new Map((db?.brands ?? []).map((r) => [norm(r.slug), r]));

  const brandsCsvOnly = brandsCsv
    .filter((r) => !dbBrandBySlug.has(norm(r.slug)))
    .map((r) => ({ slug: norm(r.slug), name: norm(r.name) }))
    .sort((a, b) => a.slug.localeCompare(b.slug));
  const brandsDbOnly = (db?.brands ?? [])
    .filter((r) => !csvBrandBySlug.has(norm(r.slug)))
    .map((r) => ({ slug: norm(r.slug), name: norm(r.name) }))
    .sort((a, b) => a.slug.localeCompare(b.slug));
  const brandsFieldDrift: ApFieldDriftRowV1[] = [];
  for (const [slug, csvRow] of Array.from(csvBrandBySlug.entries())) {
    const dbRow = dbBrandBySlug.get(slug);
    if (!dbRow) continue;
    if (norm(csvRow.name) !== norm(dbRow.name)) {
      brandsFieldDrift.push({
        key: slug,
        field: "name",
        csv_value: norm(csvRow.name),
        supabase_value: norm(dbRow.name),
      });
    }
  }

  const csvFilterBySlug = new Map(filtersCsv.map((r) => [norm(r.slug), r]));
  const dbFilterBySlug = new Map((db?.filters ?? []).map((r) => [norm(r.slug), r]));
  const dbFilterByOem = new Map((db?.filters ?? []).map((r) => [norm(r.oem_part_number), r]));

  const filtersCsvOnly = filtersCsv
    .filter((r) => !dbFilterBySlug.has(norm(r.slug)))
    .map((r) => ({
      slug: norm(r.slug),
      oem_part_number: norm(r.oem_part_number),
      brand_slug: norm(r.brand_slug),
    }))
    .sort((a, b) => a.slug.localeCompare(b.slug));
  const filtersDbOnly = (db?.filters ?? [])
    .filter((r) => !csvFilterBySlug.has(norm(r.slug)))
    .map((r) => ({
      slug: norm(r.slug),
      oem_part_number: norm(r.oem_part_number),
      brand_slug: r.brand_slug,
    }))
    .sort((a, b) => a.slug.localeCompare(b.slug));
  const filtersFieldDrift: ApFieldDriftRowV1[] = [];
  for (const [slug, csvRow] of Array.from(csvFilterBySlug.entries())) {
    const dbRow = dbFilterBySlug.get(slug);
    if (!dbRow) continue;
    const checks: Array<[string, string, string]> = [
      ["oem_part_number", norm(csvRow.oem_part_number), norm(dbRow.oem_part_number)],
      ["brand_slug", norm(csvRow.brand_slug), norm(dbRow.brand_slug ?? "")],
      ["name", norm(csvRow.name), norm(dbRow.name ?? "")],
    ];
    for (const [field, csvValue, dbValue] of checks) {
      if (csvValue !== dbValue) {
        filtersFieldDrift.push({
          key: slug,
          field,
          csv_value: csvValue || null,
          supabase_value: dbValue || null,
        });
      }
    }
  }

  const csvModelBySlug = new Map(modelsCsv.map((r) => [norm(r.slug), r]));
  const dbModelBySlug = new Map((db?.models ?? []).map((r) => [norm(r.slug), r]));

  const modelsCsvOnly = modelsCsv
    .filter((r) => !dbModelBySlug.has(norm(r.slug)))
    .map((r) => ({
      slug: norm(r.slug),
      model_number: norm(r.model_number),
      brand_slug: norm(r.brand_slug),
    }))
    .sort((a, b) => a.slug.localeCompare(b.slug));
  const modelsDbOnly = (db?.models ?? [])
    .filter((r) => !csvModelBySlug.has(norm(r.slug)))
    .map((r) => ({
      slug: norm(r.slug),
      model_number: norm(r.model_number),
      brand_slug: r.brand_slug,
    }))
    .sort((a, b) => a.slug.localeCompare(b.slug));
  const modelsFieldDrift: ApFieldDriftRowV1[] = [];
  for (const [slug, csvRow] of Array.from(csvModelBySlug.entries())) {
    const dbRow = dbModelBySlug.get(slug);
    if (!dbRow) continue;
    const checks: Array<[string, string, string]> = [
      ["model_number", norm(csvRow.model_number), norm(dbRow.model_number)],
      ["brand_slug", norm(csvRow.brand_slug), norm(dbRow.brand_slug ?? "")],
      ["title", norm(csvRow.title), norm(dbRow.title)],
      ["series", norm(csvRow.series), norm(dbRow.series ?? "")],
      ["notes", norm(csvRow.notes), norm(dbRow.notes ?? "")],
    ];
    for (const [field, csvValue, dbValue] of checks) {
      if (csvValue !== dbValue) {
        modelsFieldDrift.push({
          key: slug,
          field,
          csv_value: csvValue || null,
          supabase_value: dbValue || null,
        });
      }
    }
  }

  const faKey = (filterSlug: string, alias: string) => `${filterSlug}\u0000${alias}`;
  const csvFa = new Map(
    filterAliasesCsv.map((r) => [faKey(norm(r.filter_slug), norm(r.alias)), r]),
  );
  const dbFa = new Map(
    (db?.filterAliases ?? []).map((r) => [faKey(norm(r.filter_slug), norm(r.alias)), r]),
  );
  const filterAliasesCsvOnly = filterAliasesCsv
    .filter((r) => !dbFa.has(faKey(norm(r.filter_slug), norm(r.alias))))
    .map((r) => ({ filter_slug: norm(r.filter_slug), alias: norm(r.alias) }))
    .sort((a, b) => a.filter_slug.localeCompare(b.filter_slug));
  const filterAliasesDbOnly = (db?.filterAliases ?? [])
    .filter((r) => !csvFa.has(faKey(norm(r.filter_slug), norm(r.alias))))
    .map((r) => ({ filter_slug: norm(r.filter_slug), alias: norm(r.alias) }))
    .sort((a, b) => a.filter_slug.localeCompare(b.filter_slug));

  const maKey = (modelSlug: string, alias: string) => `${modelSlug}\u0000${alias}`;
  const csvMa = new Map(modelAliasesCsv.map((r) => [maKey(norm(r.model_slug), norm(r.alias)), r]));
  const dbMa = new Map(
    (db?.modelAliases ?? []).map((r) => [maKey(norm(r.model_slug), norm(r.alias)), r]),
  );
  const modelAliasesCsvOnly = modelAliasesCsv
    .filter((r) => !dbMa.has(maKey(norm(r.model_slug), norm(r.alias))))
    .map((r) => ({ model_slug: norm(r.model_slug), alias: norm(r.alias) }))
    .sort((a, b) => a.model_slug.localeCompare(b.model_slug));
  const modelAliasesDbOnly = (db?.modelAliases ?? [])
    .filter((r) => !csvMa.has(maKey(norm(r.model_slug), norm(r.alias))))
    .map((r) => ({ model_slug: norm(r.model_slug), alias: norm(r.alias) }))
    .sort((a, b) => a.model_slug.localeCompare(b.model_slug));

  const compatKey = (modelSlug: string, filterSlug: string) =>
    `${modelSlug}\u0000${filterSlug}`;
  const csvCompat = new Map(
    compatCsv.map((r) => [
      compatKey(norm(r.model_slug), norm(r.filter_slug)),
      {
        model_slug: norm(r.model_slug),
        filter_slug: norm(r.filter_slug),
        is_recommended: csvBool(r.is_recommended),
      },
    ]),
  );
  const dbCompat = new Map(
    (db?.compat ?? []).map((r) => [
      compatKey(norm(r.model_slug), norm(r.filter_slug)),
      r,
    ]),
  );
  const compatCsvOnly = Array.from(csvCompat.values())
    .filter((r) => !dbCompat.has(compatKey(r.model_slug, r.filter_slug)))
    .sort((a, b) => a.model_slug.localeCompare(b.model_slug));
  const compatDbOnly = (db?.compat ?? [])
    .filter((r) => !csvCompat.has(compatKey(norm(r.model_slug), norm(r.filter_slug))))
    .sort((a, b) => a.model_slug.localeCompare(b.model_slug));
  const compatFieldDrift: ApFieldDriftRowV1[] = [];
  for (const [key, csvRow] of Array.from(csvCompat.entries())) {
    const dbRow = dbCompat.get(key);
    if (!dbRow) continue;
    if (csvRow.is_recommended !== dbRow.is_recommended) {
      compatFieldDrift.push({
        key: `${csvRow.model_slug}|${csvRow.filter_slug}`,
        field: "is_recommended",
        csv_value: String(csvRow.is_recommended),
        supabase_value: String(dbRow.is_recommended),
      });
    }
  }

  const csvLinks = linksCsv.map((r) => ({
    filter_slug: norm(r.filter_slug),
    retailer_key: norm(r.retailer_key),
    affiliate_url: norm(r.affiliate_url),
    destination_url: norm(r.destination_url) || norm(r.affiliate_url),
    is_primary: csvBool(r.is_primary),
    browser_truth_classification: norm(r.browser_truth_classification) || null,
    browser_truth_notes: norm(r.browser_truth_notes) || null,
    browser_truth_checked_at: norm(r.browser_truth_checked_at) || null,
  }));
  const dbLinks = db?.retailerLinks ?? [];

  const csvLinkMap = new Map(csvLinks.map((r) => [linkKey(r.filter_slug, r.affiliate_url), r]));
  const dbLinkMap = new Map(dbLinks.map((r) => [linkKey(r.filter_slug, r.affiliate_url), r]));

  const linksCsvOnly = csvLinks
    .filter((r) => !dbLinkMap.has(linkKey(r.filter_slug, r.affiliate_url)))
    .sort((a, b) => a.filter_slug.localeCompare(b.filter_slug));
  const linksDbOnly = dbLinks
    .filter((r) => !csvLinkMap.has(linkKey(r.filter_slug, r.affiliate_url)))
    .sort((a, b) => a.filter_slug.localeCompare(b.filter_slug));

  const linksFieldDrift: ApFieldDriftRowV1[] = [];
  const browserTruthDrift: ApSupabaseVsCsvDiffReportV1["air_purifier_retailer_links"]["browser_truth_drift"] =
    [];

  for (const [key, csvRow] of Array.from(csvLinkMap.entries())) {
    const dbRow = dbLinkMap.get(key);
    if (!dbRow) continue;
    const checks: Array<[string, string, string]> = [
      ["destination_url", csvRow.destination_url, dbRow.destination_url],
      ["retailer_key", csvRow.retailer_key, dbRow.retailer_key],
      ["is_primary", String(csvRow.is_primary), String(dbRow.is_primary)],
    ];
    for (const [field, csvValue, dbValue] of checks) {
      if (csvValue !== dbValue) {
        linksFieldDrift.push({
          key: `${csvRow.filter_slug}/${csvRow.retailer_key}`,
          field,
          csv_value: csvValue || null,
          supabase_value: dbValue || null,
        });
      }
    }
    const btFieldsMatch =
      (csvRow.browser_truth_classification ?? "") === (dbRow.browser_truth_classification ?? "") &&
      (csvRow.browser_truth_notes ?? "") === (dbRow.browser_truth_notes ?? "") &&
      (csvRow.browser_truth_checked_at ?? "") === (dbRow.browser_truth_checked_at ?? "");
    if (!btFieldsMatch) {
      browserTruthDrift.push({
        filter_slug: csvRow.filter_slug,
        retailer_key: csvRow.retailer_key,
        affiliate_url: csvRow.affiliate_url,
        csv_browser_truth_classification: csvRow.browser_truth_classification,
        supabase_browser_truth_classification: dbRow.browser_truth_classification,
        csv_browser_truth_notes: csvRow.browser_truth_notes,
        supabase_browser_truth_notes: dbRow.browser_truth_notes,
        csv_browser_truth_checked_at: csvRow.browser_truth_checked_at,
        supabase_browser_truth_checked_at: dbRow.browser_truth_checked_at,
      });
    }
  }

  const seedImportBlockers: ApSeedImportBlockerV1[] = [];

  for (const r of filtersCsv) {
    const slug = norm(r.slug);
    const oem = norm(r.oem_part_number);
    const brandSlug = norm(r.brand_slug);
    if (!dbBrandBySlug.has(brandSlug) && supabaseChecked) {
      seedImportBlockers.push({
        blocker_kind: "filter_missing_brand",
        key: slug,
        detail: `brand_slug ${brandSlug} not in public.brands`,
      });
    }
    const bySlug = dbFilterBySlug.get(slug);
    const byOem = dbFilterByOem.get(oem);
    if (bySlug && !byOem) {
      seedImportBlockers.push({
        blocker_kind: "filter_slug_oem_collision",
        key: slug,
        detail: `vertical-seed upserts on oem_part_number; CSV oem ${oem} is new but slug ${slug} already exists with oem ${bySlug.oem_part_number} — insert would violate unique(slug)`,
      });
    }
  }

  for (const r of modelsCsv) {
    const brandSlug = norm(r.brand_slug);
    if (!dbBrandBySlug.has(brandSlug) && supabaseChecked) {
      seedImportBlockers.push({
        blocker_kind: "model_missing_brand",
        key: norm(r.slug),
        detail: `brand_slug ${brandSlug} not in public.brands`,
      });
    }
  }

  if (supabaseChecked) {
    const dbModelSlugs = new Set((db?.models ?? []).map((m) => norm(m.slug)));
    const dbFilterSlugs = new Set((db?.filters ?? []).map((f) => norm(f.slug)));
    for (const r of compatCsv) {
      const ms = norm(r.model_slug);
      const fs = norm(r.filter_slug);
      if (!dbModelSlugs.has(ms)) {
        seedImportBlockers.push({
          blocker_kind: "compat_unknown_model_slug",
          key: `${ms}|${fs}`,
          detail: `model_slug ${ms} absent from Supabase before compat upsert`,
        });
      }
      if (!dbFilterSlugs.has(fs)) {
        seedImportBlockers.push({
          blocker_kind: "compat_unknown_filter_slug",
          key: `${ms}|${fs}`,
          detail: `filter_slug ${fs} absent from Supabase before compat upsert`,
        });
      }
    }
    for (const r of linksCsv) {
      const fs = norm(r.filter_slug);
      if (!dbFilterSlugs.has(fs)) {
        seedImportBlockers.push({
          blocker_kind: "retailer_link_unknown_filter_slug",
          key: `${fs}/${norm(r.retailer_key)}`,
          detail: `filter_slug ${fs} absent from Supabase before retailer link import`,
        });
      }
    }
    for (const r of filterAliasesCsv) {
      const fs = norm(r.filter_slug);
      if (!dbFilterSlugs.has(fs)) {
        seedImportBlockers.push({
          blocker_kind: "filter_alias_unknown_filter_slug",
          key: `${fs}|${norm(r.alias)}`,
          detail: `filter_slug ${fs} absent from Supabase before filter_aliases upsert`,
        });
      }
    }
    for (const r of modelAliasesCsv) {
      const ms = norm(r.model_slug);
      if (!dbModelSlugs.has(ms)) {
        seedImportBlockers.push({
          blocker_kind: "model_alias_unknown_model_slug",
          key: `${ms}|${norm(r.alias)}`,
          detail: `model_slug ${ms} absent from Supabase before model_aliases upsert`,
        });
      }
    }
  }

  const compatCountByFilter = new Map<string, number>();
  for (const row of db?.compat ?? []) {
    compatCountByFilter.set(
      norm(row.filter_slug),
      (compatCountByFilter.get(norm(row.filter_slug)) ?? 0) + 1,
    );
  }
  const linkCountByFilter = new Map<string, number>();
  for (const row of dbLinks) {
    linkCountByFilter.set(
      norm(row.filter_slug),
      (linkCountByFilter.get(norm(row.filter_slug)) ?? 0) + 1,
    );
  }

  const dangerousDbOnlySlugs: ApDangerousDbOnlySlugV1[] = filtersDbOnly.map((row) => {
    const slug = row.slug;
    const isKnownDeprecated = (
      AP_KNOWN_DEPRECATED_CSV_REMOVED_FILTER_SLUGS_V1 as readonly string[]
    ).includes(slug);
    const linkCount = linkCountByFilter.get(slug) ?? 0;
    const compatCount = compatCountByFilter.get(slug) ?? 0;
    let danger_class: ApDangerousDbOnlySlugV1["danger_class"] = "db_only_with_compat";
    if (isKnownDeprecated) danger_class = "csv_removed_deprecated";
    else if (linkCount > 0) danger_class = "db_only_with_live_links";

    const why = isKnownDeprecated
      ? "Removed from committed CSV but still present in Supabase — public runtime may still resolve this invalid identity."
      : linkCount > 0
        ? "DB-only filter slug has live retailer_links — may surface in runtime discovery."
        : "DB-only filter slug has compatibility mappings without CSV truth.";

    return {
      filter_slug: slug,
      danger_class,
      supabase_oem_part_number: row.oem_part_number,
      supabase_retailer_link_count: linkCount,
      supabase_compat_model_count: compatCount,
      why_dangerous: why,
    };
  });

  dangerousDbOnlySlugs.sort((a, b) => {
    const rank = (row: ApDangerousDbOnlySlugV1) =>
      row.danger_class === "csv_removed_deprecated"
        ? 0
        : row.danger_class === "db_only_with_live_links"
          ? 1
          : 2;
    return rank(a) - rank(b) || a.filter_slug.localeCompare(b.filter_slug);
  });

  let csvSafeDirectBuyable = 0;
  const csvLinksByFilter = new Map<string, typeof csvLinks>();
  for (const row of csvLinks) {
    const list = csvLinksByFilter.get(row.filter_slug) ?? [];
    list.push(row);
    csvLinksByFilter.set(row.filter_slug, list);
  }
  for (const slug of Array.from(csvLinksByFilter.keys())) {
    const rows = csvLinksByFilter.get(slug) ?? [];
    const primary = rows.find((r) => r.is_primary) ?? rows[0];
    if (
      primary &&
      isDirectBuyableSafeCtaRow({
        destination_url: primary.destination_url,
        browser_truth_classification: primary.browser_truth_classification ?? "",
        retailer_key: primary.retailer_key,
        affiliate_url: primary.affiliate_url,
      })
    ) {
      csvSafeDirectBuyable += 1;
    }
  }

  let supabaseSafeDirectBuyable = 0;
  const dbLinksByFilter = new Map<string, typeof dbLinks>();
  for (const row of dbLinks) {
    const list = dbLinksByFilter.get(row.filter_slug) ?? [];
    list.push(row);
    dbLinksByFilter.set(row.filter_slug, list);
  }
  for (const slug of Array.from(dbLinksByFilter.keys())) {
    const rows = dbLinksByFilter.get(slug) ?? [];
    const primary = rows.find((r) => r.is_primary) ?? rows[0];
    if (
      primary &&
      isDirectBuyableSafeCtaRow({
        destination_url: primary.destination_url,
        browser_truth_classification: primary.browser_truth_classification ?? "",
        retailer_key: primary.retailer_key,
        affiliate_url: primary.affiliate_url,
      })
    ) {
      supabaseSafeDirectBuyable += 1;
    }
  }

  const oemCollisionCount = seedImportBlockers.filter(
    (b) => b.blocker_kind === "filter_slug_oem_collision",
  ).length;

  const authorization = {
    backup_export:
      supabaseChecked ? ("READY_FOR_OWNER_APPROVAL" as const) : ("HOLD" as const),
    oem_pre_alignment_sql:
      oemCollisionCount > 0 ? ("READY_FOR_OWNER_APPROVAL" as const) : ("HOLD" as const),
    seed_import:
      oemCollisionCount > 0 || !supabaseChecked
        ? ("HOLD" as const)
        : ("READY_FOR_OWNER_APPROVAL" as const),
    browser_truth_parity_apply:
      browserTruthDrift.length > 0 && supabaseChecked
        ? ("READY_FOR_OWNER_APPROVAL" as const)
        : ("HOLD" as const),
    stale_db_delete_packet:
      dangerousDbOnlySlugs.length > 0 && supabaseChecked
        ? ("READY_FOR_OWNER_APPROVAL" as const)
        : ("HOLD" as const),
    rationale: [
      `seed_import_blockers=${seedImportBlockers.length}; oem_collisions=${oemCollisionCount}.`,
      `browser_truth_drift_rows=${browserTruthDrift.length}; csv_safe_cta=${csvSafeDirectBuyable}; supabase_safe_cta=${supabaseSafeDirectBuyable}.`,
      `dangerous_db_only_slugs=${dangerousDbOnlySlugs.length}.`,
      "vertical-seed does not delete DB-only rows or sync browser_truth_* from CSV.",
    ],
  };

  if (oemCollisionCount > 0) {
    authorization.seed_import = "HOLD";
    authorization.oem_pre_alignment_sql = "READY_FOR_OWNER_APPROVAL";
  }

  const proven_facts = [
    "PROVEN: vertical-seed import is upsert-only — no delete path for DB-only AP rows.",
    "PROVEN: vertical-seed retailer_links import does not write browser_truth_* columns from CSV.",
    `PROVEN: supabase_truth_status=${supabaseChecked ? "CHECKED" : "UNKNOWN_DB_UNAVAILABLE"}.`,
    `PROVEN: seed_import_blocker_count=${seedImportBlockers.length}.`,
    `PROVEN: browser_truth_drift_count=${browserTruthDrift.length}.`,
    `PROVEN: dangerous_db_only_slug_count=${dangerousDbOnlySlugs.length}.`,
  ];

  const inferred_facts: string[] = [];
  if (oemCollisionCount > 0) {
    inferred_facts.push(
      "INFERRED: npm run seed:import:air-purifier will abort at importFilters() until OEM pre-alignment resolves slug/oem collisions.",
    );
  }
  if (browserTruthDrift.length > 0) {
    inferred_facts.push(
      "INFERRED: Even after successful seed import, safe CTA parity requires guarded browser_truth parity apply (or seed extension).",
    );
  }

  const unknown_facts: string[] = [];
  if (!supabaseChecked) {
    unknown_facts.push(
      `UNKNOWN: Live Supabase diff — ${supabaseLoad.status === "UNKNOWN_DB_UNAVAILABLE" ? supabaseLoad.reason : "not queried"}.`,
    );
    authorization.backup_export = "HOLD";
    authorization.seed_import = "HOLD";
    authorization.browser_truth_parity_apply = "HOLD";
    authorization.stale_db_delete_packet = "HOLD";
  }

  let recommended_next_action =
    "Read-only diff complete. No Supabase or CSV mutation authorized from this report.";
  if (!supabaseChecked) {
    recommended_next_action =
      "Re-run with NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY configured for live diff.";
  } else if (oemCollisionCount > 0) {
    recommended_next_action =
      "Owner OEM pre-alignment SQL packet required before seed import; then re-run this diff.";
  } else if (browserTruthDrift.length > 0) {
    recommended_next_action =
      "After catalog seed parity, run slug-scoped guarded parity apply for browser_truth_* promotion rows.";
  }

  return {
    contract: AP_SUPABASE_VS_CSV_DIFF_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    generated_at: now().toISOString(),
    git_head_hint: args.gitHeadHint ?? null,
    exact_repo_paths_read: Object.values(AP_CSV_RELS_V1),
    supabase_tables_queried: [
      "brands",
      "air_purifier_filters",
      "air_purifier_models",
      "air_purifier_filter_aliases",
      "air_purifier_model_aliases",
      "air_purifier_compatibility_mappings",
      "air_purifier_retailer_links",
    ],
    supabase_truth_status: supabaseChecked ? "CHECKED" : "UNKNOWN_DB_UNAVAILABLE",
    supabase_unavailable_reason:
      supabaseLoad.status === "UNKNOWN_DB_UNAVAILABLE" ? supabaseLoad.reason : null,
    summary: {
      brands: tableSummary({
        csvCount: brandsCsv.length,
        supabaseCount: db?.brands.length ?? 0,
        csvOnlyCount: brandsCsvOnly.length,
        supabaseOnlyCount: brandsDbOnly.length,
        fieldDriftCount: brandsFieldDrift.length,
      }),
      air_purifier_filters: tableSummary({
        csvCount: filtersCsv.length,
        supabaseCount: db?.filters.length ?? 0,
        csvOnlyCount: filtersCsvOnly.length,
        supabaseOnlyCount: filtersDbOnly.length,
        fieldDriftCount: filtersFieldDrift.length,
      }),
      air_purifier_models: tableSummary({
        csvCount: modelsCsv.length,
        supabaseCount: db?.models.length ?? 0,
        csvOnlyCount: modelsCsvOnly.length,
        supabaseOnlyCount: modelsDbOnly.length,
        fieldDriftCount: modelsFieldDrift.length,
      }),
      air_purifier_filter_aliases: tableSummary({
        csvCount: filterAliasesCsv.length,
        supabaseCount: db?.filterAliases.length ?? 0,
        csvOnlyCount: filterAliasesCsvOnly.length,
        supabaseOnlyCount: filterAliasesDbOnly.length,
        fieldDriftCount: 0,
      }),
      air_purifier_model_aliases: tableSummary({
        csvCount: modelAliasesCsv.length,
        supabaseCount: db?.modelAliases.length ?? 0,
        csvOnlyCount: modelAliasesCsvOnly.length,
        supabaseOnlyCount: modelAliasesDbOnly.length,
        fieldDriftCount: 0,
      }),
      air_purifier_compatibility_mappings: tableSummary({
        csvCount: compatCsv.length,
        supabaseCount: db?.compat.length ?? 0,
        csvOnlyCount: compatCsvOnly.length,
        supabaseOnlyCount: compatDbOnly.length,
        fieldDriftCount: compatFieldDrift.length,
      }),
      air_purifier_retailer_links: tableSummary({
        csvCount: csvLinks.length,
        supabaseCount: dbLinks.length,
        csvOnlyCount: linksCsvOnly.length,
        supabaseOnlyCount: linksDbOnly.length,
        fieldDriftCount: linksFieldDrift.length,
      }),
      seed_import_blocker_count: seedImportBlockers.length,
      browser_truth_drift_count: browserTruthDrift.length,
      dangerous_db_only_slug_count: dangerousDbOnlySlugs.length,
      csv_safe_direct_buyable_count: csvSafeDirectBuyable,
      supabase_safe_direct_buyable_count: supabaseSafeDirectBuyable,
    },
    brands: {
      csv_only: brandsCsvOnly,
      supabase_only: brandsDbOnly,
      field_drift: brandsFieldDrift,
    },
    air_purifier_filters: {
      csv_only: filtersCsvOnly,
      supabase_only: filtersDbOnly,
      field_drift: filtersFieldDrift,
    },
    air_purifier_models: {
      csv_only: modelsCsvOnly,
      supabase_only: modelsDbOnly,
      field_drift: modelsFieldDrift,
    },
    air_purifier_filter_aliases: {
      csv_only: filterAliasesCsvOnly,
      supabase_only: filterAliasesDbOnly,
      field_drift: [],
    },
    air_purifier_model_aliases: {
      csv_only: modelAliasesCsvOnly,
      supabase_only: modelAliasesDbOnly,
      field_drift: [],
    },
    air_purifier_compatibility_mappings: {
      csv_only: compatCsvOnly,
      supabase_only: compatDbOnly,
      field_drift: compatFieldDrift,
    },
    air_purifier_retailer_links: {
      csv_only: linksCsvOnly,
      supabase_only: linksDbOnly,
      field_drift: linksFieldDrift,
      browser_truth_drift: browserTruthDrift,
    },
    seed_import_blockers: seedImportBlockers,
    dangerous_db_only_slugs: dangerousDbOnlySlugs,
    authorization_recommendations: authorization,
    recommended_next_action,
    proven_facts,
    inferred_facts,
    unknown_facts,
  };
}

export function parseApSupabaseVsCsvDiffCliArgsV1(argv: string[]): {
  outPath: string | null;
} {
  const read = (flag: string) => {
    const idx = argv.indexOf(flag);
    return idx >= 0 ? (argv[idx + 1]?.trim() ?? null) : null;
  };
  return {
    outPath: read("--out"),
  };
}

export function assertApSupabaseVsCsvDiffOutPathAllowedV1(
  outPath: string,
  rootDir: string,
): void {
  const abs = path.resolve(rootDir, outPath);
  const auditsDir = path.resolve(rootDir, "data/air-purifier/batch-production/audits");
  if (!abs.startsWith(auditsDir)) {
    throw new Error(
      `Refusing to write AP supabase-vs-csv diff outside data/air-purifier/batch-production/audits: ${outPath}`,
    );
  }
  if (!abs.endsWith(".json")) {
    throw new Error(`Refusing to write non-JSON diff artifact: ${outPath}`);
  }
}
