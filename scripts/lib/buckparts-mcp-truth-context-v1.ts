/**
 * Shared read-only BuckParts MCP truth context — repo CSV + committed audit JSON.
 * No Supabase, no mutation, no fuzzy search.
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { parse } from "csv-parse/sync";

import { HOMEKEEP_WEDGE_CATALOG, type HomekeepWedgeCatalog } from "@/lib/catalog/identity";
import type { CoverageAssessmentDispositionV1 } from "@/lib/coverage-factory/coverage-assessment-v1";
import {
  buyLinkGateFailureKind,
  filterRealBuyRetailerLinks,
  isDirectBuyableSafeCtaRow,
  isManufacturerSiteSearchUrl,
  type BuyLinkGateFailureKind,
} from "@/lib/retailers/launch-buy-links";
import { normalizeSearchCompact } from "@/lib/search/normalize";

import {
  buildAllProductSafeBuyerPathCensusV1,
  type AllProductCensusProductRowV1,
  type AllProductSafeBuyerPathCensusV1,
  type SafeBuyerPathPageClassificationV1,
} from "./all-product-safe-buyer-path-census-v1";
import {
  MODEL_FILTER_CORRECTNESS_AUDIT_JSON_REL_V1,
  type ModelFilterCorrectnessClassificationV1,
  type ModelFilterCorrectnessRowV1,
} from "./model-filter-correctness-audit-v1";

export const BUCKPARTS_MCP_TRUTH_CONTEXT_CONTRACT_V1 = "buckparts_mcp_truth_context_v1" as const;

export type BuckPartsMcpSafeBuyerPathStatusV1 =
  | "SAFE_BUYER_PATH_PROVEN"
  | "SUPPRESSED"
  | "UNKNOWN";

export type BuckPartsMcpReplacementFitStatusV1 = "PROVEN" | "SUPPRESSED" | "UNKNOWN";

export type BuckPartsMcpResolutionKindV1 = "model" | "filter" | "UNKNOWN";

export type BuckPartsMcpDepsV1 = {
  rootDir: string;
  fileExists?: (abs: string) => boolean;
  readText?: (abs: string) => string;
};

export type WedgeCatalogPathsV1 = {
  models: string;
  filters: string;
  compatibility: string;
  retailer_links: string;
  filter_aliases: string | null;
  modelSlugCol: string;
  filterSlugCol: string;
  hasRecommendedFlag: boolean;
};

export const WEDGE_CATALOG_PATHS: Partial<Record<HomekeepWedgeCatalog, WedgeCatalogPathsV1>> = {
  [HOMEKEEP_WEDGE_CATALOG.refrigerator_water]: {
    models: "data/fridge_models.csv",
    filters: "data/filters.csv",
    compatibility: "data/compatibility_mappings.csv",
    retailer_links: "data/retailer_links.csv",
    filter_aliases: "data/filter_aliases.csv",
    modelSlugCol: "fridge_slug",
    filterSlugCol: "filter_slug",
    hasRecommendedFlag: false,
  },
  [HOMEKEEP_WEDGE_CATALOG.air_purifier]: {
    models: "data/air-purifier/models.csv",
    filters: "data/air-purifier/filters.csv",
    compatibility: "data/air-purifier/compatibility_mappings.csv",
    retailer_links: "data/air-purifier/retailer_links.csv",
    filter_aliases: "data/air-purifier/filter_aliases.csv",
    modelSlugCol: "model_slug",
    filterSlugCol: "filter_slug",
    hasRecommendedFlag: true,
  },
  [HOMEKEEP_WEDGE_CATALOG.whole_house_water]: {
    models: "data/whole-house-water/models.csv",
    filters: "data/whole-house-water/filters.csv",
    compatibility: "data/whole-house-water/compatibility_mappings.csv",
    retailer_links: "data/whole-house-water/retailer_links.csv",
    filter_aliases: "data/whole-house-water/filter_aliases.csv",
    modelSlugCol: "model_slug",
    filterSlugCol: "filter_slug",
    hasRecommendedFlag: true,
  },
};

export type FilterCatalogRowV1 = {
  wedge: HomekeepWedgeCatalog;
  slug: string;
  brand_slug: string;
  oem_part_number: string;
  name: string;
  replacement_interval_months: number | "UNKNOWN";
  notes: string | null;
};

export type ModelCatalogRowV1 = {
  wedge: HomekeepWedgeCatalog;
  slug: string;
  brand_slug: string;
  model_number: string;
  title: string;
  series: string | null;
};

export type CompatEdgeV1 = {
  filter_slug: string;
  is_recommended: boolean | "UNKNOWN";
};

export type RetailerLinkRowV1 = {
  filter_slug: string;
  retailer_name: string;
  retailer_key: string | null;
  affiliate_url: string;
  is_primary: boolean;
  browser_truth_classification: string | null;
  browser_truth_buyable_subtype: string | null;
  browser_truth_notes: string | null;
  browser_truth_checked_at: string | null;
};

export type PrimaryRetailerSummaryV1 = {
  retailer_name: string | "UNKNOWN";
  retailer_key: string | "UNKNOWN";
  affiliate_url: string | "UNKNOWN";
  browser_truth_classification: string | "UNKNOWN";
  browser_truth_buyable_subtype: string | "UNKNOWN";
  direct_buyable: boolean | "UNKNOWN";
  gate_failure: BuyLinkGateFailureKind | null;
  suppression_reason: string | "UNKNOWN";
};

export type BuckPartsMcpTruthContextV1 = {
  contract: typeof BUCKPARTS_MCP_TRUTH_CONTEXT_CONTRACT_V1;
  rootDir: string;
  repo_paths_read: string[];
  census: AllProductSafeBuyerPathCensusV1;
  censusByFilterKey: Map<string, AllProductCensusProductRowV1>;
  filtersBySlug: Map<string, FilterCatalogRowV1>;
  filtersByOemCompact: Map<string, FilterCatalogRowV1[]>;
  filtersByAliasCompact: Map<string, FilterCatalogRowV1[]>;
  filtersByAliasExact: Map<string, FilterCatalogRowV1[]>;
  modelsBySlug: Map<string, ModelCatalogRowV1>;
  modelsByModelNumberCompact: Map<string, ModelCatalogRowV1[]>;
  compatByModelSlug: Map<string, { wedge: HomekeepWedgeCatalog; edges: CompatEdgeV1[] }>;
  modelCountByFilterSlug: Map<string, number>;
  aliasesByFilterKey: Map<string, string[]>;
  retailerLinksByFilterKey: Map<string, RetailerLinkRowV1[]>;
  fridgeAuditByModelSlug: Map<string, ModelFilterCorrectnessRowV1>;
};

function defaultFileExists(abs: string): boolean {
  return existsSync(abs);
}

function defaultReadText(abs: string): string {
  return readFileSync(abs, "utf8");
}

export function uniqueSorted(paths: string[]): string[] {
  return Array.from(new Set(paths)).sort();
}

export function filterCensusKey(wedge: HomekeepWedgeCatalog, slug: string): string {
  return `${wedge}:${slug.trim().toLowerCase()}`;
}

export function readCsvRows(
  rootDir: string,
  relPath: string,
  fileExists: (abs: string) => boolean,
  readText: (abs: string) => string,
): Record<string, string>[] {
  const abs = path.join(rootDir, relPath);
  if (!fileExists(abs)) return [];
  try {
    return parse(readText(abs), {
      columns: true,
      skip_empty_lines: true,
      relax_column_count: true,
    }) as Record<string, string>[];
  } catch {
    return [];
  }
}

export function isCommittedInventory(
  relPath: string,
  fileExists: (abs: string) => boolean,
  rootDir: string,
): boolean {
  const abs = path.join(rootDir, relPath);
  if (!fileExists(abs)) return false;
  return !relPath.includes(".sample.");
}

function isTruthyPrimary(value: string | undefined): boolean {
  const v = (value ?? "").trim().toLowerCase();
  return v === "true" || v === "1" || v === "yes";
}

function parseIntervalMonths(raw: string | undefined): number | "UNKNOWN" {
  const n = Number((raw ?? "").trim());
  return Number.isFinite(n) && n > 0 ? n : "UNKNOWN";
}

export function collapseSafeBuyerPathStatus(
  classification: SafeBuyerPathPageClassificationV1 | undefined,
): BuckPartsMcpSafeBuyerPathStatusV1 {
  if (classification === "SAFE_BUYER_PATH_PROVEN") return "SAFE_BUYER_PATH_PROVEN";
  if (classification === "SAFE_BUYER_PATH_SUPPRESSED_TRUST") return "SUPPRESSED";
  return "UNKNOWN";
}

export function deriveReplacementFitStatus(args: {
  resolution: BuckPartsMcpResolutionKindV1;
  wedge: HomekeepWedgeCatalog | "UNKNOWN";
  auditClassification?: ModelFilterCorrectnessClassificationV1;
  provenFilterSlug?: string;
}): BuckPartsMcpReplacementFitStatusV1 {
  if (args.resolution === "UNKNOWN") return "UNKNOWN";
  if (args.resolution === "filter") return "UNKNOWN";
  if (args.wedge !== HOMEKEEP_WEDGE_CATALOG.refrigerator_water) return "UNKNOWN";
  if (args.auditClassification === "PROVEN_CORRECT" && args.provenFilterSlug) return "PROVEN";
  if (
    args.auditClassification &&
    args.auditClassification !== "UNKNOWN" &&
    args.auditClassification !== "PROVEN_CORRECT"
  ) {
    return "SUPPRESSED";
  }
  return "UNKNOWN";
}

export function deriveDisposition(args: {
  replacement_fit_status: BuckPartsMcpReplacementFitStatusV1;
  safe_buyer_path_status: BuckPartsMcpSafeBuyerPathStatusV1;
  auditClassification?: ModelFilterCorrectnessClassificationV1;
  resolution: BuckPartsMcpResolutionKindV1;
}): CoverageAssessmentDispositionV1 | "UNKNOWN" {
  if (args.replacement_fit_status === "PROVEN" && args.safe_buyer_path_status === "SAFE_BUYER_PATH_PROVEN") {
    return "covered";
  }
  if (args.safe_buyer_path_status === "SAFE_BUYER_PATH_PROVEN" && args.resolution === "filter") {
    return "covered";
  }
  if (args.auditClassification === "WRONG_PART_RISK") return "mapping_review";
  if (args.auditClassification === "BLOCKED") return "suppressed";
  if (args.auditClassification === "LIKELY_CORRECT_NEEDS_EVIDENCE") return "research_fit";
  if (args.safe_buyer_path_status === "SUPPRESSED") return "research_buyer_path";
  if (args.replacement_fit_status === "SUPPRESSED") return "research_fit";
  return "UNKNOWN";
}

export function pickProvenFilterSlug(audit: ModelFilterCorrectnessRowV1 | undefined): string | undefined {
  if (!audit || audit.classification !== "PROVEN_CORRECT") return undefined;
  const aligned = audit.per_filter_proof.filter((p) => p.proof_status === "PROVEN_ALIGNED");
  if (aligned.length === 1) return aligned[0]!.filter_slug;
  if (aligned.length > 1 && audit.mapped_filter_slugs.length === 1) {
    return audit.mapped_filter_slugs[0];
  }
  return aligned[0]?.filter_slug;
}

function loadFridgeAuditByModelSlug(
  rootDir: string,
  fileExists: (abs: string) => boolean,
  readText: (abs: string) => string,
): Map<string, ModelFilterCorrectnessRowV1> {
  const abs = path.join(rootDir, MODEL_FILTER_CORRECTNESS_AUDIT_JSON_REL_V1);
  const map = new Map<string, ModelFilterCorrectnessRowV1>();
  if (!fileExists(abs)) return map;
  try {
    const parsed = JSON.parse(readText(abs)) as { model_rows?: ModelFilterCorrectnessRowV1[] };
    for (const row of parsed.model_rows ?? []) {
      map.set(row.fridge_slug.trim().toLowerCase(), row);
    }
  } catch {
    return map;
  }
  return map;
}

function parseRetailerRow(row: Record<string, string>): RetailerLinkRowV1 | null {
  const filter_slug = (row.filter_slug ?? "").trim().toLowerCase();
  if (!filter_slug) return null;
  const affiliate_url = (row.destination_url ?? row.affiliate_url ?? "").trim();
  return {
    filter_slug,
    retailer_name: (row.retailer_name ?? "").trim() || "UNKNOWN",
    retailer_key: (row.retailer_key ?? "").trim() || null,
    affiliate_url,
    is_primary: isTruthyPrimary(row.is_primary),
    browser_truth_classification: (row.browser_truth_classification ?? "").trim() || null,
    browser_truth_buyable_subtype: (row.browser_truth_buyable_subtype ?? "").trim() || null,
    browser_truth_notes: (row.browser_truth_notes ?? "").trim() || null,
    browser_truth_checked_at: (row.browser_truth_checked_at ?? "").trim() || null,
  };
}

export function summarizePrimaryRetailer(rows: RetailerLinkRowV1[]): PrimaryRetailerSummaryV1 {
  const primary = rows.find((r) => r.is_primary) ?? rows[0];
  if (!primary) {
    return {
      retailer_name: "UNKNOWN",
      retailer_key: "UNKNOWN",
      affiliate_url: "UNKNOWN",
      browser_truth_classification: "UNKNOWN",
      browser_truth_buyable_subtype: "UNKNOWN",
      direct_buyable: "UNKNOWN",
      gate_failure: null,
      suppression_reason: "no_retailer_rows_in_repo_csv",
    };
  }

  const gate = buyLinkGateFailureKind({
    retailer_key: primary.retailer_key,
    affiliate_url: primary.affiliate_url,
    browser_truth_classification: primary.browser_truth_classification,
    browser_truth_buyable_subtype: primary.browser_truth_buyable_subtype,
  });

  const classification = (primary.browser_truth_classification ?? "").trim();
  const direct_buyable =
    gate === null && classification === "direct_buyable"
      ? true
      : gate !== null
        ? false
        : ("UNKNOWN" as const);

  let suppression_reason: string | "UNKNOWN" = "UNKNOWN";
  if (gate === "search_placeholder" || isManufacturerSiteSearchUrl(primary.affiliate_url)) {
    suppression_reason = "search_placeholder_primary";
  } else if (gate === "missing_browser_truth") {
    suppression_reason = "missing_browser_truth";
  } else if (gate === "unsafe_browser_truth") {
    suppression_reason = "unsafe_browser_truth_classification";
  } else if (gate === "broken_destination") {
    suppression_reason = "broken_destination";
  } else if (gate === "indirect_discovery") {
    suppression_reason = "indirect_discovery";
  } else if (direct_buyable === true) {
    suppression_reason = "none";
  }

  return {
    retailer_name: primary.retailer_name,
    retailer_key: primary.retailer_key ?? "UNKNOWN",
    affiliate_url: primary.affiliate_url || "UNKNOWN",
    browser_truth_classification: classification || "UNKNOWN",
    browser_truth_buyable_subtype: (primary.browser_truth_buyable_subtype ?? "").trim() || "UNKNOWN",
    direct_buyable,
    gate_failure: gate,
    suppression_reason,
  };
}

export function countSafeGatedRetailerRows(rows: RetailerLinkRowV1[]): number {
  return filterRealBuyRetailerLinks(
    rows.map((r) => ({
      retailer_key: r.retailer_key,
      affiliate_url: r.affiliate_url,
      browser_truth_classification: r.browser_truth_classification,
      browser_truth_buyable_subtype: r.browser_truth_buyable_subtype,
    })),
  ).length;
}

export function resolveExactToken(
  ctx: BuckPartsMcpTruthContextV1,
  rawQuery: string,
): { kind: "model" | "filter"; wedge: HomekeepWedgeCatalog; slug: string } | null {
  const query = rawQuery.trim();
  if (!query) return null;
  const slugKey = query.toLowerCase();
  const compact = normalizeSearchCompact(query);

  const filterHit = ctx.filtersBySlug.get(slugKey);
  if (filterHit) {
    return { kind: "filter", wedge: filterHit.wedge, slug: filterHit.slug };
  }

  const modelHit = ctx.modelsBySlug.get(slugKey);
  if (modelHit) {
    return { kind: "model", wedge: modelHit.wedge, slug: modelHit.slug };
  }

  const aliasExactHits = ctx.filtersByAliasExact.get(slugKey) ?? [];
  const uniqueAliasExact = dedupeFilterHits(aliasExactHits);
  if (uniqueAliasExact.length === 1) {
    const hit = uniqueAliasExact[0]!;
    return { kind: "filter", wedge: hit.wedge, slug: hit.slug };
  }

  const oemHits = ctx.filtersByOemCompact.get(compact) ?? [];
  const uniqueOem = dedupeFilterHits(oemHits);
  if (uniqueOem.length === 1) {
    const hit = uniqueOem[0]!;
    return { kind: "filter", wedge: hit.wedge, slug: hit.slug };
  }

  const aliasCompactHits = ctx.filtersByAliasCompact.get(compact) ?? [];
  const uniqueAliasCompact = dedupeFilterHits(aliasCompactHits);
  if (uniqueAliasCompact.length === 1) {
    const hit = uniqueAliasCompact[0]!;
    return { kind: "filter", wedge: hit.wedge, slug: hit.slug };
  }

  const modelNumberHits = ctx.modelsByModelNumberCompact.get(compact) ?? [];
  const uniqueModels = dedupeModelHits(modelNumberHits);
  if (uniqueModels.length === 1) {
    const hit = uniqueModels[0]!;
    return { kind: "model", wedge: hit.wedge, slug: hit.slug };
  }

  return null;
}

function dedupeFilterHits(hits: FilterCatalogRowV1[]): FilterCatalogRowV1[] {
  return Array.from(new Map(hits.map((h) => [filterCensusKey(h.wedge, h.slug), h])).values());
}

function dedupeModelHits(hits: ModelCatalogRowV1[]): ModelCatalogRowV1[] {
  return Array.from(new Map(hits.map((h) => [`${h.wedge}:${h.slug}`, h])).values());
}

export function getCensusRowForFilter(
  ctx: BuckPartsMcpTruthContextV1,
  wedge: HomekeepWedgeCatalog,
  filterSlug: string,
): AllProductCensusProductRowV1 | undefined {
  return ctx.censusByFilterKey.get(filterCensusKey(wedge, filterSlug));
}

export function getFilterRow(
  ctx: BuckPartsMcpTruthContextV1,
  wedge: HomekeepWedgeCatalog,
  filterSlug: string,
): FilterCatalogRowV1 | undefined {
  return ctx.filtersBySlug.get(filterSlug.trim().toLowerCase());
}

export function getModelRow(
  ctx: BuckPartsMcpTruthContextV1,
  wedge: HomekeepWedgeCatalog,
  modelSlug: string,
): ModelCatalogRowV1 | undefined {
  const row = ctx.modelsBySlug.get(modelSlug.trim().toLowerCase());
  if (!row || row.wedge !== wedge) return undefined;
  return row;
}

export function resolveFilterByExactSlug(
  ctx: BuckPartsMcpTruthContextV1,
  filterSlug: string,
): { wedge: HomekeepWedgeCatalog; slug: string; row: FilterCatalogRowV1 } | null {
  const key = filterSlug.trim().toLowerCase();
  const row = ctx.filtersBySlug.get(key);
  if (!row) return null;
  return { wedge: row.wedge, slug: row.slug, row };
}

export function resolveModelByExactSlug(
  ctx: BuckPartsMcpTruthContextV1,
  modelSlug: string,
): { wedge: HomekeepWedgeCatalog; slug: string; row: ModelCatalogRowV1 } | null {
  const key = modelSlug.trim().toLowerCase();
  const row = ctx.modelsBySlug.get(key);
  if (!row) return null;
  return { wedge: row.wedge, slug: row.slug, row };
}

export function createBuckPartsMcpTruthContextV1(deps: BuckPartsMcpDepsV1): BuckPartsMcpTruthContextV1 {
  const fileExists = deps.fileExists ?? defaultFileExists;
  const readText = deps.readText ?? defaultReadText;
  const repo_paths_read: string[] = [MODEL_FILTER_CORRECTNESS_AUDIT_JSON_REL_V1];

  const filtersBySlug = new Map<string, FilterCatalogRowV1>();
  const filtersByOemCompact = new Map<string, FilterCatalogRowV1[]>();
  const filtersByAliasCompact = new Map<string, FilterCatalogRowV1[]>();
  const filtersByAliasExact = new Map<string, FilterCatalogRowV1[]>();
  const modelsBySlug = new Map<string, ModelCatalogRowV1>();
  const modelsByModelNumberCompact = new Map<string, ModelCatalogRowV1[]>();
  const compatByModelSlug = new Map<string, { wedge: HomekeepWedgeCatalog; edges: CompatEdgeV1[] }>();
  const modelCountByFilterSlug = new Map<string, number>();
  const aliasesByFilterKey = new Map<string, string[]>();
  const retailerLinksByFilterKey = new Map<string, RetailerLinkRowV1[]>();

  for (const [wedge, paths] of Object.entries(WEDGE_CATALOG_PATHS) as [
    HomekeepWedgeCatalog,
    WedgeCatalogPathsV1,
  ][]) {
    if (!isCommittedInventory(paths.filters, fileExists, deps.rootDir)) continue;
    repo_paths_read.push(paths.filters, paths.models, paths.compatibility, paths.retailer_links);
    if (paths.filter_aliases) repo_paths_read.push(paths.filter_aliases);

    for (const row of readCsvRows(deps.rootDir, paths.filters, fileExists, readText)) {
      const slug = (row.slug ?? "").trim().toLowerCase();
      if (!slug) continue;
      const filterRow: FilterCatalogRowV1 = {
        wedge,
        slug,
        brand_slug: (row.brand_slug ?? "").trim(),
        oem_part_number: (row.oem_part_number ?? "").trim(),
        name: (row.name ?? "").trim(),
        replacement_interval_months: parseIntervalMonths(row.replacement_interval_months),
        notes: (row.notes ?? "").trim() || null,
      };
      filtersBySlug.set(slug, filterRow);
      const oemCompact = normalizeSearchCompact(filterRow.oem_part_number || slug);
      if (oemCompact.length >= 4) {
        const list = filtersByOemCompact.get(oemCompact) ?? [];
        list.push(filterRow);
        filtersByOemCompact.set(oemCompact, list);
      }
    }

    for (const row of readCsvRows(deps.rootDir, paths.models, fileExists, readText)) {
      const slug = (row.slug ?? "").trim().toLowerCase();
      if (!slug) continue;
      const modelRow: ModelCatalogRowV1 = {
        wedge,
        slug,
        brand_slug: (row.brand_slug ?? "").trim(),
        model_number: (row.model_number ?? "").trim(),
        title: (row.title ?? "").trim(),
        series: (row.series ?? "").trim() || null,
      };
      modelsBySlug.set(slug, modelRow);
      const modelCompact = normalizeSearchCompact(modelRow.model_number || slug);
      if (modelCompact.length >= 5) {
        const list = modelsByModelNumberCompact.get(modelCompact) ?? [];
        list.push(modelRow);
        modelsByModelNumberCompact.set(modelCompact, list);
      }
    }

    for (const row of readCsvRows(deps.rootDir, paths.compatibility, fileExists, readText)) {
      const modelSlug = (row[paths.modelSlugCol] ?? "").trim().toLowerCase();
      const filterSlug = (row[paths.filterSlugCol] ?? "").trim().toLowerCase();
      if (!modelSlug || !filterSlug) continue;
      const isRecRaw = (row.is_recommended ?? "").trim().toLowerCase();
      const is_recommended = paths.hasRecommendedFlag
        ? isRecRaw === "true" || isRecRaw === "1" || isRecRaw === "yes"
        : ("UNKNOWN" as const);
      const existing = compatByModelSlug.get(modelSlug);
      if (!existing) {
        compatByModelSlug.set(modelSlug, { wedge, edges: [{ filter_slug: filterSlug, is_recommended }] });
      } else {
        const idx = existing.edges.findIndex((e) => e.filter_slug === filterSlug);
        if (idx === -1) {
          existing.edges.push({ filter_slug: filterSlug, is_recommended });
        } else if (is_recommended === true) {
          existing.edges[idx] = { filter_slug: filterSlug, is_recommended: true };
        }
      }
      modelCountByFilterSlug.set(
        filterCensusKey(wedge, filterSlug),
        (modelCountByFilterSlug.get(filterCensusKey(wedge, filterSlug)) ?? 0) + 1,
      );
    }

    if (paths.filter_aliases) {
      for (const row of readCsvRows(deps.rootDir, paths.filter_aliases, fileExists, readText)) {
        const filterSlug = (row.filter_slug ?? "").trim().toLowerCase();
        const alias = (row.alias ?? "").trim();
        if (!filterSlug || !alias) continue;
        const filterRow = filtersBySlug.get(filterSlug);
        if (!filterRow) continue;
        const key = filterCensusKey(wedge, filterSlug);
        const aliases = aliasesByFilterKey.get(key) ?? [];
        if (!aliases.includes(alias)) aliases.push(alias);
        aliasesByFilterKey.set(key, aliases);
        const aliasExactKey = alias.toLowerCase();
        const exactList = filtersByAliasExact.get(aliasExactKey) ?? [];
        exactList.push(filterRow);
        filtersByAliasExact.set(aliasExactKey, exactList);
        const aliasCompact = normalizeSearchCompact(alias);
        if (aliasCompact.length >= 4) {
          const compactList = filtersByAliasCompact.get(aliasCompact) ?? [];
          compactList.push(filterRow);
          filtersByAliasCompact.set(aliasCompact, compactList);
        }
      }
    }

    for (const row of readCsvRows(deps.rootDir, paths.retailer_links, fileExists, readText)) {
      const parsed = parseRetailerRow(row);
      if (!parsed) continue;
      const key = filterCensusKey(wedge, parsed.filter_slug);
      const list = retailerLinksByFilterKey.get(key) ?? [];
      list.push(parsed);
      retailerLinksByFilterKey.set(key, list);
    }
  }

  const census = buildAllProductSafeBuyerPathCensusV1({
    rootDir: deps.rootDir,
    fileExists,
    readText,
  });
  repo_paths_read.push(...census.exact_repo_paths_read);

  const censusByFilterKey = new Map<string, AllProductCensusProductRowV1>();
  for (const row of census.products) {
    censusByFilterKey.set(filterCensusKey(row.wedge, row.slug), row);
  }

  const fridgeAuditByModelSlug = loadFridgeAuditByModelSlug(deps.rootDir, fileExists, readText);

  return {
    contract: BUCKPARTS_MCP_TRUTH_CONTEXT_CONTRACT_V1,
    rootDir: deps.rootDir,
    repo_paths_read: uniqueSorted(repo_paths_read),
    census,
    censusByFilterKey,
    filtersBySlug,
    filtersByOemCompact,
    filtersByAliasCompact,
    filtersByAliasExact,
    modelsBySlug,
    modelsByModelNumberCompact,
    compatByModelSlug,
    modelCountByFilterSlug,
    aliasesByFilterKey,
    retailerLinksByFilterKey,
    fridgeAuditByModelSlug,
  };
}

export function isDirectBuyableRow(row: RetailerLinkRowV1): boolean {
  return isDirectBuyableSafeCtaRow({
    retailer_key: row.retailer_key,
    affiliate_url: row.affiliate_url,
    browser_truth_classification: row.browser_truth_classification,
    browser_truth_buyable_subtype: row.browser_truth_buyable_subtype,
  });
}
