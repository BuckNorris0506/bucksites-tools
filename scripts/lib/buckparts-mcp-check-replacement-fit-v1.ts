/**
 * Read-only BuckParts MCP truth lookup — replacement fit + safe buyer path.
 * Repo CSV + committed audit JSON only. No Supabase, no mutation, no broad search.
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { parse } from "csv-parse/sync";

import { HOMEKEEP_WEDGE_CATALOG, type HomekeepWedgeCatalog } from "@/lib/catalog/identity";
import type { CoverageAssessmentDispositionV1 } from "@/lib/coverage-factory/coverage-assessment-v1";
import { normalizeSearchCompact } from "@/lib/search/normalize";

import {
  buildAllProductSafeBuyerPathCensusV1,
  type AllProductCensusProductRowV1,
  type SafeBuyerPathPageClassificationV1,
} from "./all-product-safe-buyer-path-census-v1";
import {
  MODEL_FILTER_CORRECTNESS_AUDIT_JSON_REL_V1,
  type ModelFilterCorrectnessClassificationV1,
  type ModelFilterCorrectnessRowV1,
} from "./model-filter-correctness-audit-v1";

export const BUCKPARTS_MCP_CHECK_REPLACEMENT_FIT_CONTRACT_V1 =
  "buckparts_mcp_check_replacement_fit_v1" as const;

export type BuckPartsMcpSafeBuyerPathStatusV1 =
  | "SAFE_BUYER_PATH_PROVEN"
  | "SUPPRESSED"
  | "UNKNOWN";

export type BuckPartsMcpReplacementFitStatusV1 = "PROVEN" | "SUPPRESSED" | "UNKNOWN";

export type BuckPartsMcpResolutionKindV1 = "model" | "filter" | "UNKNOWN";

export type CheckReplacementFitResultV1 = {
  contract: typeof BUCKPARTS_MCP_CHECK_REPLACEMENT_FIT_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  mutation_authorized: false;
  query: string;
  resolution: BuckPartsMcpResolutionKindV1;
  /** Primary proven slug (filter slug for model fit, filter slug for part query). UNKNOWN when not proven. */
  matched_slug: string | "UNKNOWN";
  wedge: HomekeepWedgeCatalog | "UNKNOWN";
  replacement_fit_status: BuckPartsMcpReplacementFitStatusV1;
  disposition: CoverageAssessmentDispositionV1 | "UNKNOWN";
  safe_buyer_path_status: BuckPartsMcpSafeBuyerPathStatusV1;
  evidence_paths: string[];
  /** Census page classification detail when a filter slug is in scope. */
  safe_buyer_path_detail: SafeBuyerPathPageClassificationV1 | "UNKNOWN";
  /** Fridge model-filter audit classification when resolution is model + refrigerator_water. */
  fit_audit_classification: ModelFilterCorrectnessClassificationV1 | "UNKNOWN";
  mapped_filter_slugs: string[];
  repo_paths_read: string[];
  truth_note: string;
};

export type CheckReplacementFitDepsV1 = {
  rootDir: string;
  fileExists?: (abs: string) => boolean;
  readText?: (abs: string) => string;
};

type WedgeCatalogPathsV1 = {
  models: string;
  filters: string;
  compatibility: string;
  modelSlugCol: string;
  filterSlugCol: string;
};

const WEDGE_CATALOG_PATHS: Partial<Record<HomekeepWedgeCatalog, WedgeCatalogPathsV1>> = {
  [HOMEKEEP_WEDGE_CATALOG.refrigerator_water]: {
    models: "data/fridge_models.csv",
    filters: "data/filters.csv",
    compatibility: "data/compatibility_mappings.csv",
    modelSlugCol: "fridge_slug",
    filterSlugCol: "filter_slug",
  },
  [HOMEKEEP_WEDGE_CATALOG.air_purifier]: {
    models: "data/air-purifier/models.csv",
    filters: "data/air-purifier/filters.csv",
    compatibility: "data/air-purifier/compatibility_mappings.csv",
    modelSlugCol: "model_slug",
    filterSlugCol: "filter_slug",
  },
  [HOMEKEEP_WEDGE_CATALOG.whole_house_water]: {
    models: "data/whole-house-water/models.csv",
    filters: "data/whole-house-water/filters.csv",
    compatibility: "data/whole-house-water/compatibility_mappings.csv",
    modelSlugCol: "model_slug",
    filterSlugCol: "filter_slug",
  },
};

type SlugHit = { wedge: HomekeepWedgeCatalog; slug: string };

function defaultFileExists(abs: string): boolean {
  return existsSync(abs);
}

function defaultReadText(abs: string): string {
  return readFileSync(abs, "utf8");
}

function readCsvRows(
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

function isCommittedInventory(relPath: string, fileExists: (abs: string) => boolean, rootDir: string): boolean {
  const abs = path.join(rootDir, relPath);
  if (!fileExists(abs)) return false;
  return !relPath.includes(".sample.");
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

function collapseSafeBuyerPathStatus(
  classification: SafeBuyerPathPageClassificationV1 | undefined,
): BuckPartsMcpSafeBuyerPathStatusV1 {
  if (classification === "SAFE_BUYER_PATH_PROVEN") return "SAFE_BUYER_PATH_PROVEN";
  if (classification === "SAFE_BUYER_PATH_SUPPRESSED_TRUST") return "SUPPRESSED";
  return "UNKNOWN";
}

function deriveReplacementFitStatus(args: {
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

function deriveDisposition(args: {
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

function unknownResult(query: string, note: string, repo_paths_read: string[]): CheckReplacementFitResultV1 {
  return {
    contract: BUCKPARTS_MCP_CHECK_REPLACEMENT_FIT_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    query,
    resolution: "UNKNOWN",
    matched_slug: "UNKNOWN",
    wedge: "UNKNOWN",
    replacement_fit_status: "UNKNOWN",
    disposition: "UNKNOWN",
    safe_buyer_path_status: "UNKNOWN",
    evidence_paths: [],
    safe_buyer_path_detail: "UNKNOWN",
    fit_audit_classification: "UNKNOWN",
    mapped_filter_slugs: [],
    repo_paths_read,
    truth_note: note,
  };
}

function uniqueSorted(paths: string[]): string[] {
  return Array.from(new Set(paths)).sort();
}

function pickProvenFilterSlug(audit: ModelFilterCorrectnessRowV1 | undefined): string | undefined {
  if (!audit || audit.classification !== "PROVEN_CORRECT") return undefined;
  const aligned = audit.per_filter_proof.filter((p) => p.proof_status === "PROVEN_ALIGNED");
  if (aligned.length === 1) return aligned[0]!.filter_slug;
  if (aligned.length > 1 && audit.mapped_filter_slugs.length === 1) {
    return audit.mapped_filter_slugs[0];
  }
  return aligned[0]?.filter_slug;
}

function buildCatalogIndexes(deps: CheckReplacementFitDepsV1): {
  filtersBySlug: Map<string, SlugHit>;
  filtersByOemCompact: Map<string, SlugHit[]>;
  modelsBySlug: Map<string, SlugHit & { model_number: string }>;
  modelsByModelNumberCompact: Map<string, SlugHit[]>;
  compatByModelSlug: Map<string, { wedge: HomekeepWedgeCatalog; filterSlugs: string[] }>;
  repo_paths_read: string[];
} {
  const fileExists = deps.fileExists ?? defaultFileExists;
  const readText = deps.readText ?? defaultReadText;
  const repo_paths_read: string[] = [MODEL_FILTER_CORRECTNESS_AUDIT_JSON_REL_V1];

  const filtersBySlug = new Map<string, SlugHit>();
  const filtersByOemCompact = new Map<string, SlugHit[]>();
  const modelsBySlug = new Map<string, SlugHit & { model_number: string }>();
  const modelsByModelNumberCompact = new Map<string, SlugHit[]>();
  const compatByModelSlug = new Map<string, { wedge: HomekeepWedgeCatalog; filterSlugs: string[] }>();

  for (const [wedge, paths] of Object.entries(WEDGE_CATALOG_PATHS) as [
    HomekeepWedgeCatalog,
    WedgeCatalogPathsV1,
  ][]) {
    if (!isCommittedInventory(paths.filters, fileExists, deps.rootDir)) continue;
    repo_paths_read.push(paths.filters, paths.models, paths.compatibility);

    for (const row of readCsvRows(deps.rootDir, paths.filters, fileExists, readText)) {
      const slug = (row.slug ?? "").trim().toLowerCase();
      if (!slug) continue;
      filtersBySlug.set(slug, { wedge, slug });
      const oemCompact = normalizeSearchCompact(row.oem_part_number ?? row.slug ?? "");
      if (oemCompact.length >= 4) {
        const list = filtersByOemCompact.get(oemCompact) ?? [];
        list.push({ wedge, slug });
        filtersByOemCompact.set(oemCompact, list);
      }
    }

    for (const row of readCsvRows(deps.rootDir, paths.models, fileExists, readText)) {
      const slug = (row.slug ?? "").trim().toLowerCase();
      if (!slug) continue;
      const model_number = (row.model_number ?? "").trim();
      modelsBySlug.set(slug, { wedge, slug, model_number });
      const modelCompact = normalizeSearchCompact(model_number || slug);
      if (modelCompact.length >= 5) {
        const list = modelsByModelNumberCompact.get(modelCompact) ?? [];
        list.push({ wedge, slug });
        modelsByModelNumberCompact.set(modelCompact, list);
      }
    }

    for (const row of readCsvRows(deps.rootDir, paths.compatibility, fileExists, readText)) {
      const modelSlug = (row[paths.modelSlugCol] ?? "").trim().toLowerCase();
      const filterSlug = (row[paths.filterSlugCol] ?? "").trim().toLowerCase();
      if (!modelSlug || !filterSlug) continue;
      const existing = compatByModelSlug.get(modelSlug);
      if (!existing) {
        compatByModelSlug.set(modelSlug, { wedge, filterSlugs: [filterSlug] });
      } else if (!existing.filterSlugs.includes(filterSlug)) {
        existing.filterSlugs.push(filterSlug);
      }
    }
  }

  return {
    filtersBySlug,
    filtersByOemCompact,
    modelsBySlug,
    modelsByModelNumberCompact,
    compatByModelSlug,
    repo_paths_read: uniqueSorted(repo_paths_read),
  };
}

function resolveQuery(
  rawQuery: string,
  indexes: ReturnType<typeof buildCatalogIndexes>,
): {
  kind: "model" | "filter";
  wedge: HomekeepWedgeCatalog;
  slug: string;
} | null {
  const query = rawQuery.trim();
  if (!query) return null;
  const slugKey = query.toLowerCase();
  const compact = normalizeSearchCompact(query);

  const filterHit = indexes.filtersBySlug.get(slugKey);
  if (filterHit) {
    return { kind: "filter", wedge: filterHit.wedge, slug: filterHit.slug };
  }

  const modelHit = indexes.modelsBySlug.get(slugKey);
  if (modelHit) {
    return { kind: "model", wedge: modelHit.wedge, slug: modelHit.slug };
  }

  const oemHits = indexes.filtersByOemCompact.get(compact) ?? [];
  const uniqueOem = Array.from(new Map(oemHits.map((h) => [`${h.wedge}:${h.slug}`, h])).values());
  if (uniqueOem.length === 1) {
    return { kind: "filter", wedge: uniqueOem[0]!.wedge, slug: uniqueOem[0]!.slug };
  }

  const modelNumberHits = indexes.modelsByModelNumberCompact.get(compact) ?? [];
  const uniqueModels = Array.from(
    new Map(modelNumberHits.map((h) => [`${h.wedge}:${h.slug}`, h])).values(),
  );
  if (uniqueModels.length === 1) {
    return { kind: "model", wedge: uniqueModels[0]!.wedge, slug: uniqueModels[0]!.slug };
  }

  return null;
}

function censusRowForFilter(
  censusBySlug: Map<string, AllProductCensusProductRowV1>,
  wedge: HomekeepWedgeCatalog,
  filterSlug: string,
): AllProductCensusProductRowV1 | undefined {
  return censusBySlug.get(`${wedge}:${filterSlug}`);
}

export function checkReplacementFitV1(
  deps: CheckReplacementFitDepsV1,
  modelOrPart: string,
): CheckReplacementFitResultV1 {
  const query = modelOrPart.trim();
  const indexes = buildCatalogIndexes(deps);
  const fileExists = deps.fileExists ?? defaultFileExists;
  const readText = deps.readText ?? defaultReadText;

  const census = buildAllProductSafeBuyerPathCensusV1({ rootDir: deps.rootDir, fileExists, readText });
  const censusBySlug = new Map<string, AllProductCensusProductRowV1>();
  for (const row of census.products) {
    censusBySlug.set(`${row.wedge}:${row.slug}`, row);
  }
  indexes.repo_paths_read.push(...census.exact_repo_paths_read);

  const fridgeAuditByModel = loadFridgeAuditByModelSlug(deps.rootDir, fileExists, readText);

  const resolved = resolveQuery(query, indexes);
  if (!resolved) {
    return unknownResult(
      query,
      "No exact slug or unambiguous OEM/model-number match in committed repo CSV inventory. BuckParts returns UNKNOWN — no inferred fit.",
      uniqueSorted(indexes.repo_paths_read),
    );
  }

  if (resolved.kind === "filter") {
    const censusRow = censusRowForFilter(censusBySlug, resolved.wedge, resolved.slug);
    const safeDetail = censusRow?.page_classification;
    const safeStatus = collapseSafeBuyerPathStatus(safeDetail);
    const evidence_paths = uniqueSorted(censusRow?.evidence_files ?? []);

    const disposition = deriveDisposition({
      replacement_fit_status: "UNKNOWN",
      safe_buyer_path_status: safeStatus,
      resolution: "filter",
    });

    return {
      contract: BUCKPARTS_MCP_CHECK_REPLACEMENT_FIT_CONTRACT_V1,
      read_only: true,
      data_mutation: false,
      mutation_authorized: false,
      query,
      resolution: "filter",
      matched_slug: resolved.slug,
      wedge: resolved.wedge,
      replacement_fit_status: "UNKNOWN",
      disposition,
      safe_buyer_path_status: safeStatus,
      evidence_paths,
      safe_buyer_path_detail: safeDetail ?? "UNKNOWN",
      fit_audit_classification: "UNKNOWN",
      mapped_filter_slugs: [],
      repo_paths_read: uniqueSorted(indexes.repo_paths_read),
      truth_note:
        "Filter/part identity resolved from committed catalog CSV. Model→part fit is UNKNOWN unless proven by model-first audit evidence. Safe buyer path follows repo CSV + trust gates only.",
    };
  }

  const compat = indexes.compatByModelSlug.get(resolved.slug);
  const mapped_filter_slugs = uniqueSorted(compat?.filterSlugs ?? []);

  let audit: ModelFilterCorrectnessRowV1 | undefined;
  if (resolved.wedge === HOMEKEEP_WEDGE_CATALOG.refrigerator_water) {
    audit = fridgeAuditByModel.get(resolved.slug);
  }

  const provenFilterSlug = pickProvenFilterSlug(audit);
  const replacement_fit_status = deriveReplacementFitStatus({
    resolution: "model",
    wedge: resolved.wedge,
    auditClassification: audit?.classification,
    provenFilterSlug,
  });

  const primaryFilterSlug = provenFilterSlug ?? mapped_filter_slugs[0];
  const censusRow = primaryFilterSlug
    ? censusRowForFilter(censusBySlug, resolved.wedge, primaryFilterSlug)
    : undefined;
  const safeDetail = censusRow?.page_classification;
  const safeStatus = collapseSafeBuyerPathStatus(safeDetail);

  const evidence_paths = uniqueSorted([
    ...(audit?.evidence_paths ?? []),
    ...(censusRow?.evidence_files ?? []),
  ]);

  const disposition = deriveDisposition({
    replacement_fit_status,
    safe_buyer_path_status: safeStatus,
    auditClassification: audit?.classification,
    resolution: "model",
  });

  const matched_slug = replacement_fit_status === "PROVEN" && provenFilterSlug ? provenFilterSlug : "UNKNOWN";

  let truth_note: string;
  if (resolved.wedge !== HOMEKEEP_WEDGE_CATALOG.refrigerator_water) {
    truth_note =
      "Appliance model found in committed CSV. Replacement fit is UNKNOWN — no wedge-specific model-first fit audit artifact in repo. CSV compat rows are not promoted to fit claims.";
  } else if (replacement_fit_status === "PROVEN" && provenFilterSlug) {
    truth_note = `Refrigerator model fit PROVEN via committed model-filter-correctness audit for filter ${provenFilterSlug}. Safe buyer path is separate — check safe_buyer_path_status.`;
  } else if (replacement_fit_status === "SUPPRESSED" && audit) {
    truth_note = `Refrigerator compat mapping exists but fit is not proven (${audit.classification}). matched_slug remains UNKNOWN per BuckParts Truth Contract.`;
  } else {
    truth_note =
      "Refrigerator model in catalog without PROVEN_CORRECT audit classification. matched_slug is UNKNOWN — no unsafe fit claim.";
  }

  return {
    contract: BUCKPARTS_MCP_CHECK_REPLACEMENT_FIT_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    query,
    resolution: "model",
    matched_slug,
    wedge: resolved.wedge,
    replacement_fit_status,
    disposition,
    safe_buyer_path_status: safeStatus,
    evidence_paths,
    safe_buyer_path_detail: safeDetail ?? "UNKNOWN",
    fit_audit_classification: audit?.classification ?? "UNKNOWN",
    mapped_filter_slugs,
    repo_paths_read: uniqueSorted(indexes.repo_paths_read),
    truth_note,
  };
}
