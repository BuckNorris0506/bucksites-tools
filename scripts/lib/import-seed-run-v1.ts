/**
 * Fridge CSV seed import — run orchestration with truth-ledger outcome recording.
 */

import fs from "node:fs";
import path from "node:path";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { BuckpartsIoCapabilityV1 } from "./buckparts-io-capabilities-v1";
import {
  buildImportSeedMutationPreflightV1,
  IMPORT_SEED_MUTATION_GATE_REF_V1,
  IMPORT_SEED_MUTATION_LANE_V1,
  importSeedMutationAuthorizedV1,
  type ImportSeedMutationPreflightV1,
} from "./import-seed-mutation-gate-v1";
import type { FounderDecisionRowWithSlugCorrelationV1 } from "./founder-decision-slug-correlation-v1";
import { readCsvFile, dataCsvPath } from "./csv";
import { bulkApplyRetailerLinksByAffiliateMatch } from "./bulk-retailer-links-import";
import { log, warn } from "./log";
import {
  recordTruthLedgerMutationOutcomeV1,
  type TruthLedgerMutationApplyOutcomeV1,
} from "./truth-ledger-v1";

/** Inventory/static-audit marker — run module satisfies mutationGateRef checks. */
const mutationGateRef = IMPORT_SEED_MUTATION_GATE_REF_V1;
void mutationGateRef;

const TRUTH_LEDGER_IO_ON_WRITE_INTENT_V1 = "MUTATION" as const;

export type ImportSeedApplyStatusV1 = "BLOCKED" | "APPLIED";

export type ImportSeedPhaseResultV1 = {
  phase: string;
  row_count: number;
  action: "skipped_empty" | "skipped_missing" | "would_upsert" | "upserted" | "would_prune" | "pruned";
};

export type ImportSeedReportV1 = {
  dry_run: boolean;
  use_sample: boolean;
  prune_fridge_catalog_requested: boolean;
  phases: ImportSeedPhaseResultV1[];
  apply_status?: ImportSeedApplyStatusV1;
  mutation_authorized?: boolean;
  mutation_preflight_blockers?: string[];
  founder_decision_id?: string | null;
};

export type ImportSeedRunResultV1 = {
  report: ImportSeedReportV1;
  exit_code: 0 | 1;
};

export type ImportSeedDepsV1 = {
  getSupabaseAdmin: () => SupabaseClient;
};

type ImportSeedCtxV1 = {
  rootDir: string;
  useSample: boolean;
  pruneFridgeCatalog: boolean;
  performWrites: boolean;
  deps: ImportSeedDepsV1;
  phases: ImportSeedPhaseResultV1[];
};

async function upsertTablePhaseV1(
  ctx: ImportSeedCtxV1,
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

async function loadBrandMapsFromCsvAndDbV1(ctx: ImportSeedCtxV1): Promise<{
  brandBySlug: Map<string, string>;
  brandNameBySlug: Map<string, string>;
}> {
  const brandFile = dataCsvPath(ctx.rootDir, "brands", ctx.useSample);
  const brandRows = readCsvFile(brandFile, ["slug", "name"]);
  const brandBySlug = new Map<string, string>();
  const brandNameBySlug = new Map<string, string>();
  for (const r of brandRows) {
    const slug = r.slug.trim();
    brandBySlug.set(slug, `dry-run-brand:${slug}`);
    brandNameBySlug.set(slug, r.name.trim());
  }
  const supabase = ctx.deps.getSupabaseAdmin();
  const { data: brands, error: bErr } = await supabase
    .from("brands")
    .select("id, slug, name");
  if (bErr) throw bErr;
  for (const b of brands ?? []) {
    const slug = b.slug as string;
    brandBySlug.set(slug, b.id as string);
    brandNameBySlug.set(slug, b.name as string);
  }
  return { brandBySlug, brandNameBySlug };
}

async function loadFilterSlugMapFromCsvAndDbV1(ctx: ImportSeedCtxV1): Promise<Map<string, string>> {
  const file = dataCsvPath(ctx.rootDir, "filters", ctx.useSample);
  const rows = readCsvFile(file, ["brand_slug", "slug", "oem_part_number"]);
  const filterBySlug = new Map<string, string>();
  for (const r of rows) {
    const slug = r.slug.trim();
    filterBySlug.set(slug, `dry-run-filter:${slug}`);
  }
  const supabase = ctx.deps.getSupabaseAdmin();
  const { data: filters, error: flErr } = await supabase.from("filters").select("id, slug");
  if (flErr) throw flErr;
  for (const f of filters ?? []) {
    filterBySlug.set(f.slug as string, f.id as string);
  }
  return filterBySlug;
}

async function loadFridgeSlugMapFromCsvAndDbV1(ctx: ImportSeedCtxV1): Promise<Map<string, string>> {
  const file = dataCsvPath(ctx.rootDir, "fridge_models", ctx.useSample);
  const rows = readCsvFile(file, ["brand_slug", "slug", "model_number"]);
  const fridgeBySlug = new Map<string, string>();
  for (const r of rows) {
    const slug = r.slug.trim();
    fridgeBySlug.set(slug, `dry-run-fridge:${slug}`);
  }
  const supabase = ctx.deps.getSupabaseAdmin();
  const { data: fridges, error: fErr } = await supabase
    .from("fridge_models")
    .select("id, slug");
  if (fErr) throw fErr;
  for (const f of fridges ?? []) {
    fridgeBySlug.set(f.slug as string, f.id as string);
  }
  return fridgeBySlug;
}

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

/**
 * Align legacy fridge inventory with the current CSV pack: wipe derived rows, delete models and
 * filters absent from the CSV files, then let the normal import repopulate.
 */
async function pruneFridgeCatalogToMatchCsv(ctx: ImportSeedCtxV1) {
  const fridgeFile = dataCsvPath(ctx.rootDir, "fridge_models", ctx.useSample);
  const filterFile = dataCsvPath(ctx.rootDir, "filters", ctx.useSample);
  const fridgeRows = readCsvFile(fridgeFile, ["brand_slug", "slug", "model_number"]);
  const filterRows = readCsvFile(filterFile, ["brand_slug", "slug", "oem_part_number"]);
  if (fridgeRows.length === 0 || filterRows.length === 0) {
    throw new Error(
      "--prune-fridge-catalog requires non-empty fridge_models.csv and filters.csv",
    );
  }

  const allowedFridge = new Set(fridgeRows.map((r) => r.slug.trim()));
  const allowedFilters = new Set(filterRows.map((r) => r.slug.trim()));

  const supabase = ctx.deps.getSupabaseAdmin();

  if (ctx.performWrites) {
    const { error: e1 } = await supabase
      .from("compatibility_mappings")
      .delete()
      .not("fridge_model_id", "is", null);
    if (e1) throw e1;
    log(
      "prune-fridge-catalog",
      "Deleted all compatibility_mappings (re-import from CSV next)",
    );

    const { error: e2 } = await supabase
      .from("retailer_links")
      .delete()
      .not("filter_id", "is", null);
    if (e2) throw e2;
    log("prune-fridge-catalog", "Deleted all retailer_links (re-import from CSV next)");

    const { error: e3 } = await supabase
      .from("fridge_model_aliases")
      .delete()
      .not("fridge_model_id", "is", null);
    if (e3) throw e3;
    log("prune-fridge-catalog", "Deleted all fridge_model_aliases (re-import from CSV next)");

    const { error: e4 } = await supabase
      .from("filter_aliases")
      .delete()
      .not("filter_id", "is", null);
    if (e4) throw e4;
    log("prune-fridge-catalog", "Deleted all filter_aliases (re-import from CSV next)");
  }

  const { data: allFridges, error: fErr } = await supabase
    .from("fridge_models")
    .select("id, slug");
  if (fErr) throw fErr;
  const orphanFridges = (allFridges ?? []).filter(
    (r) => !allowedFridge.has(r.slug as string),
  );
  const orphanFridgeIds = orphanFridges.map((r) => r.id as string);

  if (orphanFridgeIds.length > 0) {
    const slugs = orphanFridges.map((r) => r.slug as string);
    const msg =
      `${orphanFridgeIds.length} fridge_models not in ${path.basename(fridgeFile)} ` +
      `(sample=${ctx.useSample}). First slugs: ${slugs.slice(0, 40).join(", ")}${slugs.length > 40 ? " …" : ""}`;
    if (ctx.performWrites) {
      log("prune-fridge-catalog", `Removing ${msg}`);
      const CHUNK = 200;
      for (let i = 0; i < orphanFridgeIds.length; i += CHUNK) {
        const chunk = orphanFridgeIds.slice(i, i + CHUNK);
        const { error } = await supabase.from("fridge_models").delete().in("id", chunk);
        if (error) throw error;
      }
    } else {
      log("prune-fridge-catalog", `Would remove ${msg}`);
    }
    ctx.phases.push({
      phase: "prune_fridge_models",
      row_count: orphanFridgeIds.length,
      action: ctx.performWrites ? "pruned" : "would_prune",
    });
  } else {
    log("prune-fridge-catalog", "No orphan fridge_models to remove");
  }

  const { data: allFilters, error: flErr } = await supabase
    .from("filters")
    .select("id, slug");
  if (flErr) throw flErr;
  const orphanFilters = (allFilters ?? []).filter(
    (r) => !allowedFilters.has(r.slug as string),
  );
  const orphanFilterIds = orphanFilters.map((r) => r.id as string);

  if (orphanFilterIds.length > 0) {
    const slugs = orphanFilters.map((r) => r.slug as string);
    const msg =
      `${orphanFilterIds.length} filters not in ${path.basename(filterFile)}. ` +
      `First slugs: ${slugs.slice(0, 40).join(", ")}${slugs.length > 40 ? " …" : ""}`;
    if (ctx.performWrites) {
      log("prune-fridge-catalog", `Removing ${msg}`);
      const CHUNK = 200;
      for (let i = 0; i < orphanFilterIds.length; i += CHUNK) {
        const chunk = orphanFilterIds.slice(i, i + CHUNK);
        const { error } = await supabase.from("filters").delete().in("id", chunk);
        if (error) throw error;
      }
    } else {
      log("prune-fridge-catalog", `Would remove ${msg}`);
    }
    ctx.phases.push({
      phase: "prune_filters",
      row_count: orphanFilterIds.length,
      action: ctx.performWrites ? "pruned" : "would_prune",
    });
  } else {
    log("prune-fridge-catalog", "No orphan filters to remove");
  }

  if (ctx.performWrites) {
    log("prune-fridge-catalog", "Prune complete; running CSV upserts.");
  } else {
    log("prune-fridge-catalog", "Prune preview complete (no deletes).");
  }
}

async function importBrands(ctx: ImportSeedCtxV1) {
  const file = dataCsvPath(ctx.rootDir, "brands", ctx.useSample);
  const rows = readCsvFile(file, ["slug", "name"]);
  if (rows.length === 0) {
    warn("brands", `Skip (empty): ${file}`);
    ctx.phases.push({ phase: "brands", row_count: 0, action: "skipped_empty" });
    return;
  }

  const payload = rows.map((r) => ({
    slug: r.slug.trim(),
    name: r.name.trim(),
  }));

  await upsertTablePhaseV1(ctx, "brands", "brands", payload, file, "slug");
}

async function importFilters(ctx: ImportSeedCtxV1) {
  const file = dataCsvPath(ctx.rootDir, "filters", ctx.useSample);
  const rows = readCsvFile(file, [
    "brand_slug",
    "slug",
    "oem_part_number",
  ]);
  if (rows.length === 0) {
    warn("filters", `Skip (empty): ${file}`);
    ctx.phases.push({ phase: "filters", row_count: 0, action: "skipped_empty" });
    return;
  }

  const { brandBySlug } = await loadBrandMapsFromCsvAndDbV1(ctx);

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

  await upsertTablePhaseV1(ctx, "filters", "filters", payload, file, "slug");
}

async function importFridgeModels(ctx: ImportSeedCtxV1) {
  const file = dataCsvPath(ctx.rootDir, "fridge_models", ctx.useSample);
  const rows = readCsvFile(file, ["brand_slug", "slug", "model_number"]);
  if (rows.length === 0) {
    warn("fridge_models", `Skip (empty): ${file}`);
    ctx.phases.push({ phase: "fridge_models", row_count: 0, action: "skipped_empty" });
    return;
  }

  const { brandBySlug, brandNameBySlug } = await loadBrandMapsFromCsvAndDbV1(ctx);

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

  await upsertTablePhaseV1(ctx, "fridge_models", "fridge_models", payload, file, "model_number");
}

async function importFridgeModelAliases(ctx: ImportSeedCtxV1) {
  const file = dataCsvPath(ctx.rootDir, "fridge_model_aliases", ctx.useSample);
  if (!fs.existsSync(file)) {
    warn("fridge_model_aliases", `Skip (missing): ${file}`);
    ctx.phases.push({ phase: "fridge_model_aliases", row_count: 0, action: "skipped_missing" });
    return;
  }
  const rows = readCsvFile(file, ["fridge_slug", "alias"]);
  if (rows.length === 0) {
    warn("fridge_model_aliases", `Skip (empty): ${file}`);
    ctx.phases.push({ phase: "fridge_model_aliases", row_count: 0, action: "skipped_empty" });
    return;
  }

  const fridgeBySlug = await loadFridgeSlugMapFromCsvAndDbV1(ctx);

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

  await upsertTablePhaseV1(
    ctx,
    "fridge_model_aliases",
    "fridge_model_aliases",
    payload,
    file,
    "fridge_model_id,alias",
  );
}

async function importFilterAliases(ctx: ImportSeedCtxV1) {
  const file = dataCsvPath(ctx.rootDir, "filter_aliases", ctx.useSample);
  if (!fs.existsSync(file)) {
    warn("filter_aliases", `Skip (missing): ${file}`);
    ctx.phases.push({ phase: "filter_aliases", row_count: 0, action: "skipped_missing" });
    return;
  }
  const rows = readCsvFile(file, ["filter_slug", "alias"]);
  if (rows.length === 0) {
    warn("filter_aliases", `Skip (empty): ${file}`);
    ctx.phases.push({ phase: "filter_aliases", row_count: 0, action: "skipped_empty" });
    return;
  }

  const filterBySlug = await loadFilterSlugMapFromCsvAndDbV1(ctx);

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

  await upsertTablePhaseV1(
    ctx,
    "filter_aliases",
    "filter_aliases",
    payload,
    file,
    "filter_id,alias",
  );
}

async function importCompatibilityMappings(ctx: ImportSeedCtxV1) {
  const file = dataCsvPath(ctx.rootDir, "compatibility_mappings", ctx.useSample);
  const rows = readCsvFile(file, ["fridge_slug", "filter_slug"]);
  if (rows.length === 0) {
    warn("compatibility_mappings", `Skip (empty): ${file}`);
    ctx.phases.push({ phase: "compatibility_mappings", row_count: 0, action: "skipped_empty" });
    return;
  }

  const [fridgeBySlug, filterBySlug] = await Promise.all([
    loadFridgeSlugMapFromCsvAndDbV1(ctx),
    loadFilterSlugMapFromCsvAndDbV1(ctx),
  ]);

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

  await upsertTablePhaseV1(
    ctx,
    "compatibility_mappings",
    "compatibility_mappings",
    payload,
    file,
    "fridge_model_id,filter_id",
  );
}

async function importRetailerLinks(ctx: ImportSeedCtxV1) {
  const file = dataCsvPath(ctx.rootDir, "retailer_links", ctx.useSample);
  const rows = readCsvFile(file, ["filter_slug", "affiliate_url"]);
  if (rows.length === 0) {
    warn("retailer_links", `Skip (empty): ${file}`);
    ctx.phases.push({ phase: "retailer_links", row_count: 0, action: "skipped_empty" });
    return;
  }

  const filterBySlug = await loadFilterSlugMapFromCsvAndDbV1(ctx);

  const ops = rows.map((r) => {
    const filter_slug = r.filter_slug.trim();
    const affiliate_url = r.affiliate_url.trim();
    const filter_id = filterBySlug.get(filter_slug);
    if (!filter_id) {
      throw new Error(
        `retailer_links.csv: unknown filter_slug "${filter_slug}"`,
      );
    }

    return buildRetailerLinkBulkOp(r, filter_id);
  });

  const uniquePairs = new Set(ops.map((o) => `${o.filterId}\u0000${o.affiliate_url}`)).size;

  if (ctx.performWrites) {
    const supabase = ctx.deps.getSupabaseAdmin();
    const { inserted, updated } = await bulkApplyRetailerLinksByAffiliateMatch(supabase, {
      table: "retailer_links",
      filterFkColumn: "filter_id",
      ops,
    });
    ctx.phases.push({
      phase: "retailer_links",
      row_count: uniquePairs,
      action: "upserted",
    });
    log(
      "retailer_links",
      `Processed ${rows.length} CSV line(s), ${uniquePairs} unique (filter, affiliate_url) from ${file} (inserted ${inserted}, updated ${updated})`,
    );
  } else {
    ctx.phases.push({
      phase: "retailer_links",
      row_count: uniquePairs,
      action: "would_upsert",
    });
    log(
      "retailer_links",
      `Would process ${rows.length} CSV line(s), ${uniquePairs} unique (filter, affiliate_url) from ${file}`,
    );
  }
}

function buildRetailerLinkBulkOp(r: Record<string, string>, filterId: string) {
  const affiliate_url = r.affiliate_url.trim();
  const destination_url = optStr(r.destination_url) ?? affiliate_url;
  const retailer_key = retailerKeyFromRow(r);
  const retailer_slug = retailerSlugFromRow(r);
  const insertRow = {
    filter_id: filterId,
    retailer_name: optStr(r.retailer_name),
    affiliate_url,
    destination_url,
    is_primary: optBool(r.is_primary) ?? false,
    retailer_key,
    retailer_slug,
    browser_truth_classification: optStr(r.browser_truth_classification),
    browser_truth_notes: optStr(r.browser_truth_notes),
    browser_truth_checked_at: optStr(r.browser_truth_checked_at),
  };

  const updateRow = {
    retailer_name: insertRow.retailer_name,
    destination_url: insertRow.destination_url,
    is_primary: insertRow.is_primary,
    retailer_key: insertRow.retailer_key,
    retailer_slug: insertRow.retailer_slug,
    browser_truth_classification: insertRow.browser_truth_classification,
    browser_truth_notes: insertRow.browser_truth_notes,
    browser_truth_checked_at: insertRow.browser_truth_checked_at,
  };

  return {
    filterId,
    affiliate_url,
    insertRow,
    updateRow,
  };
}

export const __testables = {
  buildRetailerLinkBulkOp,
};

export function parseImportSeedCliArgsV1(argv: readonly string[]): {
  write: boolean;
  useSample: boolean;
  pruneFridgeCatalog: boolean;
} {
  return {
    write: argv.includes("--write"),
    useSample: argv.includes("--sample"),
    pruneFridgeCatalog: argv.includes("--prune-fridge-catalog"),
  };
}

export function createImportSeedLiveDepsV1(
  getSupabaseAdmin: () => SupabaseClient,
): ImportSeedDepsV1 {
  return { getSupabaseAdmin };
}

async function executeImportSeedPhasesV1(ctx: ImportSeedCtxV1): Promise<void> {
  if (ctx.pruneFridgeCatalog && ctx.useSample) {
    throw new Error(
      "--prune-fridge-catalog cannot be used with --sample (would clear live tables using tiny CSVs)",
    );
  }
  if (ctx.pruneFridgeCatalog) {
    await pruneFridgeCatalogToMatchCsv(ctx);
  }
  await importBrands(ctx);
  await importFilters(ctx);
  await importFridgeModels(ctx);
  await importFridgeModelAliases(ctx);
  await importFilterAliases(ctx);
  await importCompatibilityMappings(ctx);
  await importRetailerLinks(ctx);
}

export async function runImportSeedV1(args: {
  rootDir: string;
  write: boolean;
  useSample: boolean;
  pruneFridgeCatalog: boolean;
  deps: ImportSeedDepsV1;
  now?: () => Date;
  io_capability?: BuckpartsIoCapabilityV1;
  readText?: (abs: string) => string;
  founderRows?: readonly FounderDecisionRowWithSlugCorrelationV1[];
  recordTruthLedger?: typeof recordTruthLedgerMutationOutcomeV1;
  fileExists?: (abs: string) => boolean;
}): Promise<ImportSeedRunResultV1> {
  const recordTruthLedger = args.recordTruthLedger ?? recordTruthLedgerMutationOutcomeV1;
  const phases: ImportSeedPhaseResultV1[] = [];
  const ctx: ImportSeedCtxV1 = {
    rootDir: args.rootDir,
    useSample: args.useSample,
    pruneFridgeCatalog: args.pruneFridgeCatalog,
    performWrites: false,
    deps: args.deps,
    phases,
  };

  const baseReport: ImportSeedReportV1 = {
    dry_run: !args.write,
    use_sample: args.useSample,
    prune_fridge_catalog_requested: args.pruneFridgeCatalog,
    phases: [],
  };

  if (!args.write) {
    await executeImportSeedPhasesV1(ctx);
    return {
      report: { ...baseReport, phases },
      exit_code: 0,
    };
  }

  const preflight: ImportSeedMutationPreflightV1 = buildImportSeedMutationPreflightV1({
    rootDir: args.rootDir,
    mode: "write",
    useSample: args.useSample,
    pruneFridgeCatalog: args.pruneFridgeCatalog,
    io_capability: args.io_capability,
    now: args.now,
    readText: args.readText,
    founderRows: args.founderRows,
    fileExists: args.fileExists,
  });
  const mutation_authorized = importSeedMutationAuthorizedV1(preflight);
  const blockers = [...preflight.blockers];

  if (mutation_authorized) {
    ctx.performWrites = true;
    await executeImportSeedPhasesV1(ctx);
  }

  let apply_status: ImportSeedApplyStatusV1 =
    blockers.length > 0 ? "BLOCKED" : "APPLIED";

  const applyOutcome: TruthLedgerMutationApplyOutcomeV1 =
    apply_status === "BLOCKED" ? "blocked" : "applied";
  const record = recordTruthLedger({
    rootDir: args.rootDir,
    io_capability: TRUTH_LEDGER_IO_ON_WRITE_INTENT_V1,
    mutation_lane: IMPORT_SEED_MUTATION_LANE_V1,
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
