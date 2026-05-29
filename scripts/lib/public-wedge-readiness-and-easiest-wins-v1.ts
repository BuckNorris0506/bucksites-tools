/**
 * Read-only: public wedge readiness + easiest truthful wins across Homekeep wedges.
 * No CSV, Supabase, dispatch-run, batch-review, or public UI mutation.
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { parse } from "csv-parse/sync";

import { HOMEKEEP_WEDGE_CATALOG, type HomekeepWedgeCatalog } from "@/lib/catalog/identity";
import {
  getVerticalLaunchState,
  isVerticalLive,
  VERTICAL_SLUGS_WITH_APP_SEGMENT_LAYOUT,
  type VerticalLaunchState,
  type VerticalSlug,
} from "@/lib/catalog/vertical-launch-state";
import {
  buyLinkGateFailureKind,
  isDirectBuyableSafeCtaRow,
  isManufacturerSiteSearchUrl,
} from "@/lib/retailers/launch-buy-links";
import { buildOwnerVerticalLaunchPolicyReport } from "@/lib/owner-dashboard/owner-vertical-launch-policy";

export const PUBLIC_WEDGE_READINESS_AND_EASIEST_WINS_CONTRACT_V1 =
  "public_wedge_readiness_and_easiest_wins_v1" as const;

export type PublicFacingStatusV1 =
  | "LIVE"
  | "PREVIEW_ONLY"
  | "HIDDEN_OR_NOINDEXED"
  | "UNKNOWN";

export type BuyerPathTruthStatusV1 =
  | "PROVEN_SAFE_ROWS_EXIST"
  | "ZERO_SAFE_ROWS"
  | "MIXED"
  | "UNKNOWN";

export type MappingTruthStatusV1 =
  | "HAS_EXPLICIT_CONFIDENCE"
  | "IMPLIED_ONLY"
  | "UNKNOWN";

export type PublicOpeningRecommendationV1 =
  | "OPEN_NOW_TRUTH_GATED"
  | "KEEP_PREVIEW_ONLY"
  | "DO_NOT_OPEN_YET"
  | "NEEDS_MORE_PROOF";

export type WedgeCsvDataSourceV1 = "committed_csv" | "sample_csv_only" | "missing";

export type PublicWedgeReadinessRowV1 = {
  wedge: HomekeepWedgeCatalog;
  vertical_slug: VerticalSlug | "refrigerator_routes";
  public_routes_present: boolean;
  currently_public_facing_status: PublicFacingStatusV1;
  csv_data_source: WedgeCsvDataSourceV1;
  model_count: number;
  filter_count: number;
  compatibility_mapping_count: number;
  safe_cta_count: number;
  direct_buyable_count: number;
  search_placeholder_count: number;
  linked_filters_with_safe_gated_buy_path: number;
  linked_filters_with_zero_safe_buy_path: number;
  buyer_path_truth_status: BuyerPathTruthStatusV1;
  mapping_truth_status: MappingTruthStatusV1;
  easiest_truthful_win_score: number;
  easiest_candidate_families_or_brands: string[];
  public_opening_recommendation: PublicOpeningRecommendationV1;
  reason: string;
};

export type EasiestTruthfulExpansionTargetV1 = {
  rank: number;
  wedge: HomekeepWedgeCatalog;
  target_kind: "filter_slug" | "brand_or_family" | "model_slug" | "wedge_lane";
  target_id: string;
  score: number;
  reason: string;
  requires_model_first: boolean;
};

export type PublicWedgeReadinessKpiDefinitionsV1 = {
  proven_model_replacement_safe_buy_path_count: string;
  safe_public_wedge_count: string;
  unsafe_or_unknown_public_claim_count: string;
  search_placeholder_debt_count: string;
  mapping_unknown_count: string;
};

export type PublicWedgeReadinessAndEasiestWinsV1 = {
  contract: typeof PUBLIC_WEDGE_READINESS_AND_EASIEST_WINS_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  generated_at: string;
  source_paths: string[];
  wedge_rows: PublicWedgeReadinessRowV1[];
  global_plan: {
    next_best_wedge_to_expand: HomekeepWedgeCatalog | "UNKNOWN";
    next_best_public_wedge_to_open_if_safe: HomekeepWedgeCatalog | "UNKNOWN";
    next_10_easiest_truthful_expansion_targets: EasiestTruthfulExpansionTargetV1[];
  };
  kpi_definitions: PublicWedgeReadinessKpiDefinitionsV1;
  kpi_snapshot: {
    proven_model_replacement_safe_buy_path_count: number;
    safe_public_wedge_count: number;
    unsafe_or_unknown_public_claim_count: number;
    search_placeholder_debt_count: number;
    mapping_unknown_count: number;
  };
  proven_facts: string[];
  inferred_facts: string[];
  unknown_facts: string[];
  recommended_next_action: string;
  truth_first_notes: string[];
};

const WEDGE_ORDER: HomekeepWedgeCatalog[] = [
  HOMEKEEP_WEDGE_CATALOG.refrigerator_water,
  HOMEKEEP_WEDGE_CATALOG.air_purifier,
  HOMEKEEP_WEDGE_CATALOG.whole_house_water,
  HOMEKEEP_WEDGE_CATALOG.vacuum,
  HOMEKEEP_WEDGE_CATALOG.humidifier,
  HOMEKEEP_WEDGE_CATALOG.appliance_air,
];

const VERTICAL_BY_WEDGE: Record<HomekeepWedgeCatalog, VerticalSlug | "refrigerator_routes"> = {
  [HOMEKEEP_WEDGE_CATALOG.refrigerator_water]: "refrigerator_routes",
  [HOMEKEEP_WEDGE_CATALOG.air_purifier]: "air-purifier",
  [HOMEKEEP_WEDGE_CATALOG.whole_house_water]: "whole-house-water",
  [HOMEKEEP_WEDGE_CATALOG.vacuum]: "vacuum",
  [HOMEKEEP_WEDGE_CATALOG.humidifier]: "humidifier",
  [HOMEKEEP_WEDGE_CATALOG.appliance_air]: "appliance-air",
};

type WedgePathsV1 = {
  models: string;
  filters: string;
  compatibility: string;
  retailer_links: string;
  model_key: "slug" | "model_slug";
  compat_model_key: "fridge_slug" | "model_slug";
  route_dirs: string[];
};

const WEDGE_PATHS: Record<HomekeepWedgeCatalog, WedgePathsV1> = {
  [HOMEKEEP_WEDGE_CATALOG.refrigerator_water]: {
    models: "data/fridge_models.csv",
    filters: "data/filters.csv",
    compatibility: "data/compatibility_mappings.csv",
    retailer_links: "data/retailer_links.csv",
    model_key: "slug",
    compat_model_key: "fridge_slug",
    route_dirs: ["src/app/fridge", "src/app/filter", "src/app/brand"],
  },
  [HOMEKEEP_WEDGE_CATALOG.air_purifier]: {
    models: "data/air-purifier/models.csv",
    filters: "data/air-purifier/filters.csv",
    compatibility: "data/air-purifier/compatibility_mappings.csv",
    retailer_links: "data/air-purifier/retailer_links.csv",
    model_key: "slug",
    compat_model_key: "model_slug",
    route_dirs: ["src/app/air-purifier"],
  },
  [HOMEKEEP_WEDGE_CATALOG.whole_house_water]: {
    models: "data/whole-house-water/models.csv",
    filters: "data/whole-house-water/filters.csv",
    compatibility: "data/whole-house-water/compatibility_mappings.csv",
    retailer_links: "data/whole-house-water/retailer_links.csv",
    model_key: "slug",
    compat_model_key: "model_slug",
    route_dirs: ["src/app/whole-house-water"],
  },
  [HOMEKEEP_WEDGE_CATALOG.vacuum]: {
    models: "data/vacuum/models.sample.csv",
    filters: "data/vacuum/filters.sample.csv",
    compatibility: "data/vacuum/compatibility_mappings.sample.csv",
    retailer_links: "data/vacuum/retailer_links.sample.csv",
    model_key: "slug",
    compat_model_key: "model_slug",
    route_dirs: ["src/app/vacuum"],
  },
  [HOMEKEEP_WEDGE_CATALOG.humidifier]: {
    models: "data/humidifier/models.sample.csv",
    filters: "data/humidifier/filters.sample.csv",
    compatibility: "data/humidifier/compatibility_mappings.sample.csv",
    retailer_links: "data/humidifier/retailer_links.sample.csv",
    model_key: "slug",
    compat_model_key: "model_slug",
    route_dirs: ["src/app/humidifier"],
  },
  [HOMEKEEP_WEDGE_CATALOG.appliance_air]: {
    models: "data/appliance-air/models.sample.csv",
    filters: "data/appliance-air/filters.sample.csv",
    compatibility: "data/appliance-air/compatibility_mappings.sample.csv",
    retailer_links: "data/appliance-air/retailer_links.sample.csv",
    model_key: "slug",
    compat_model_key: "model_slug",
    route_dirs: ["src/app/appliance-air"],
  },
};

type RetailerLinkRow = {
  filter_slug?: string;
  retailer_key?: string;
  affiliate_url?: string;
  is_primary?: string;
  browser_truth_classification?: string | null;
  browser_truth_buyable_subtype?: string | null;
  destination_url?: string | null;
};

type CompatRow = Record<string, string | undefined>;

export type BuildPublicWedgeReadinessDepsV1 = {
  rootDir: string;
  now?: () => Date;
  fileExists?: (abs: string) => boolean;
  readText?: (abs: string) => string;
};

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

function isTruthyPrimary(value: string | undefined): boolean {
  const v = (value ?? "").trim().toLowerCase();
  return v === "true" || v === "1" || v === "yes";
}

function resolveCsvDataSource(relPath: string, fileExists: (abs: string) => boolean, rootDir: string): WedgeCsvDataSourceV1 {
  const abs = path.join(rootDir, relPath);
  if (!fileExists(abs)) return "missing";
  if (relPath.includes(".sample.")) return "sample_csv_only";
  return "committed_csv";
}

function launchStateForWedge(wedge: HomekeepWedgeCatalog): VerticalLaunchState {
  const vertical = VERTICAL_BY_WEDGE[wedge];
  if (vertical === "refrigerator_routes") return getVerticalLaunchState("refrigerator");
  return getVerticalLaunchState(vertical);
}

function publicFacingStatusForWedge(wedge: HomekeepWedgeCatalog, routesPresent: boolean): PublicFacingStatusV1 {
  const vertical = VERTICAL_BY_WEDGE[wedge];
  if (vertical === "refrigerator_routes") {
    return isVerticalLive("refrigerator") ? "LIVE" : "UNKNOWN";
  }
  if (!routesPresent) return "UNKNOWN";
  if (isVerticalLive(vertical)) return "LIVE";
  if (VERTICAL_SLUGS_WITH_APP_SEGMENT_LAYOUT.includes(vertical)) return "PREVIEW_ONLY";
  return "HIDDEN_OR_NOINDEXED";
}

function mappingTruthStatus(compatRows: CompatRow[]): MappingTruthStatusV1 {
  if (compatRows.length === 0) return "UNKNOWN";
  const headers = Object.keys(compatRows[0] ?? {});
  if (headers.some((h) => /confidence|fit_confidence|mapping_confidence/i.test(h))) {
    return "HAS_EXPLICIT_CONFIDENCE";
  }
  if (headers.includes("is_recommended")) return "IMPLIED_ONLY";
  return "UNKNOWN";
}

function brandFromModelSlug(slug: string): string {
  const parts = slug.split("-");
  return parts[0] ?? slug;
}

type LinkAnalysis = {
  safe_cta_count: number;
  direct_buyable_count: number;
  search_placeholder_count: number;
  linkedFiltersWithSafe: Set<string>;
  linkedFiltersWithZeroSafe: Set<string>;
};

function analyzeRetailerLinksForMappedFilters(
  linkRows: RetailerLinkRow[],
  mappedFilterSlugs: Set<string>,
): LinkAnalysis {
  const byFilter = new Map<string, RetailerLinkRow[]>();
  for (const row of linkRows) {
    const slug = (row.filter_slug ?? "").trim().toLowerCase();
    if (!slug) continue;
    const list = byFilter.get(slug) ?? [];
    list.push(row);
    byFilter.set(slug, list);
  }

  let safe_cta_count = 0;
  let direct_buyable_count = 0;
  let search_placeholder_count = 0;
  const linkedFiltersWithSafe = new Set<string>();
  const linkedFiltersWithZeroSafe = new Set<string>();

  for (const row of linkRows) {
    const gate = buyLinkGateFailureKind({
      retailer_key: row.retailer_key ?? null,
      affiliate_url: row.affiliate_url ?? "",
      browser_truth_classification: row.browser_truth_classification ?? null,
      browser_truth_buyable_subtype: row.browser_truth_buyable_subtype ?? null,
    });
    if (row.browser_truth_classification?.trim() === "direct_buyable") direct_buyable_count += 1;
    if (gate === "search_placeholder") search_placeholder_count += 1;
    if (gate === null && row.browser_truth_classification?.trim() === "direct_buyable") {
      safe_cta_count += 1;
    }
  }

  for (const filterSlug of Array.from(mappedFilterSlugs)) {
    const rows = byFilter.get(filterSlug) ?? [];
    const primary = rows.find((r) => isTruthyPrimary(r.is_primary)) ?? rows[0] ?? null;
    const primarySafe =
      primary &&
      isDirectBuyableSafeCtaRow({
        retailer_key: primary.retailer_key ?? null,
        affiliate_url: primary.affiliate_url ?? "",
        browser_truth_classification: primary.browser_truth_classification ?? null,
        browser_truth_buyable_subtype: primary.browser_truth_buyable_subtype ?? null,
      });
    const anySafe = rows.some((r) =>
      isDirectBuyableSafeCtaRow({
        retailer_key: r.retailer_key ?? null,
        affiliate_url: r.affiliate_url ?? "",
        browser_truth_classification: r.browser_truth_classification ?? null,
        browser_truth_buyable_subtype: r.browser_truth_buyable_subtype ?? null,
      }),
    );
    if (primarySafe || anySafe) linkedFiltersWithSafe.add(filterSlug);
    else linkedFiltersWithZeroSafe.add(filterSlug);
    if (
      primary &&
      !primarySafe &&
      (buyLinkGateFailureKind({
        retailer_key: primary.retailer_key ?? null,
        affiliate_url: primary.affiliate_url ?? "",
        browser_truth_classification: primary.browser_truth_classification ?? null,
        browser_truth_buyable_subtype: primary.browser_truth_buyable_subtype ?? null,
      }) === "search_placeholder" ||
        isManufacturerSiteSearchUrl(primary.destination_url ?? primary.affiliate_url ?? ""))
    ) {
      /* counted in search_placeholder_count at row level */
    }
  }

  return {
    safe_cta_count,
    direct_buyable_count,
    search_placeholder_count,
    linkedFiltersWithSafe,
    linkedFiltersWithZeroSafe,
  };
}

function buyerPathTruthStatus(
  csvSource: WedgeCsvDataSourceV1,
  linkedSafe: number,
  linkedZeroSafe: number,
): BuyerPathTruthStatusV1 {
  if (csvSource !== "committed_csv") return "UNKNOWN";
  if (linkedSafe > 0 && linkedZeroSafe > 0) return "MIXED";
  if (linkedSafe > 0) return "PROVEN_SAFE_ROWS_EXIST";
  if (linkedZeroSafe > 0) return "ZERO_SAFE_ROWS";
  return "UNKNOWN";
}

function hasSafeGatedBuyerPathProof(row: PublicWedgeReadinessRowV1): boolean {
  if (row.wedge === HOMEKEEP_WEDGE_CATALOG.refrigerator_water && row.currently_public_facing_status === "LIVE") {
    return true;
  }
  return row.linked_filters_with_safe_gated_buy_path > 0 && row.safe_cta_count > 0;
}

export function computeEasiestTruthfulWinScore(args: {
  wedge: HomekeepWedgeCatalog;
  csvSource: WedgeCsvDataSourceV1;
  buyerPathStatus: BuyerPathTruthStatusV1;
  linkedSafe: number;
  linkedZeroSafe: number;
  mappedFilterCount: number;
  modelCount: number;
  publicFacing: PublicFacingStatusV1;
  routesPresent: boolean;
  searchPlaceholderCount: number;
  retailerLinkCount: number;
}): number {
  if (args.csvSource === "sample_csv_only" || args.csvSource === "missing") {
    return Math.min(10, args.routesPresent ? 10 : 0);
  }

  const mapped = Math.max(args.mappedFilterCount, 1);
  const safeRatio = args.linkedSafe / mapped;
  let score = 0;

  score += Math.round(safeRatio * 40);
  if (args.routesPresent) score += 8;
  if (args.publicFacing === "PREVIEW_ONLY") score += 12;
  if (args.modelCount >= 10) score += 6;
  if (args.buyerPathStatus === "MIXED") score += 4;

  const placeholderDebt =
    args.retailerLinkCount > 0 ? args.searchPlaceholderCount / args.retailerLinkCount : 1;
  score -= Math.round(placeholderDebt * 15);

  if (args.buyerPathStatus === "ZERO_SAFE_ROWS") score = Math.min(score, 20);
  if (args.linkedSafe === 0) score = Math.min(score, 25);

  if (args.wedge === HOMEKEEP_WEDGE_CATALOG.refrigerator_water) {
    score = Math.min(score, 35);
  }

  return Math.max(0, Math.min(100, score));
}

export function computePublicOpeningRecommendation(args: {
  row: Omit<
    PublicWedgeReadinessRowV1,
    "public_opening_recommendation" | "reason" | "easiest_truthful_win_score"
  >;
}): { recommendation: PublicOpeningRecommendationV1; reason: string } {
  const r = args.row;

  if (r.wedge === HOMEKEEP_WEDGE_CATALOG.refrigerator_water) {
    if (r.currently_public_facing_status === "LIVE") {
      return {
        recommendation: "OPEN_NOW_TRUTH_GATED",
        reason:
          "Already LIVE with truth-gated public filter pages (Supabase buyer paths per fridge public-truth audit); committed CSV shows 0/57 safe primaries — do not rebuild fridge products from scratch; founder-approved CSV backfill for 16 Supabase wins is separate work.",
      };
    }
    return {
      recommendation: "NEEDS_MORE_PROOF",
      reason: "Fridge routes exist but launch state is not LIVE in repo constants.",
    };
  }

  if (r.csv_data_source !== "committed_csv") {
    return {
      recommendation: "DO_NOT_OPEN_YET",
      reason: `Only ${r.csv_data_source} inventory — committed buyer-path proof missing; preview routes must stay noindex until committed CSV proves safe gated paths.`,
    };
  }

  if (!r.public_routes_present) {
    return {
      recommendation: "DO_NOT_OPEN_YET",
      reason: "No public route tree in repo for this wedge.",
    };
  }

  if (!hasSafeGatedBuyerPathProof({ ...r, public_opening_recommendation: "DO_NOT_OPEN_YET", reason: "", easiest_truthful_win_score: 0 })) {
    return {
      recommendation: "NEEDS_MORE_PROOF",
      reason: `Committed CSV has ${r.linked_filters_with_safe_gated_buy_path} linked filter(s) with safe gated buyer paths and ${r.safe_cta_count} safe CTA row(s) — insufficient for truth-gated public opening.`,
    };
  }

  const WHW_MIN_SAFE_FILTERS_FOR_PUBLIC_OPEN = 3;
  if (
    r.wedge === HOMEKEEP_WEDGE_CATALOG.whole_house_water &&
    r.linked_filters_with_safe_gated_buy_path > 0 &&
    r.linked_filters_with_safe_gated_buy_path < WHW_MIN_SAFE_FILTERS_FOR_PUBLIC_OPEN
  ) {
    return {
      recommendation: "NEEDS_MORE_PROOF",
      reason: `Committed CSV has ${r.linked_filters_with_safe_gated_buy_path} mapped filter(s) with safe gated direct_buyable rows (${r.safe_cta_count} safe CTA row(s)) — a single founder-approved filter apply is not sufficient WHW wedge coverage for public opening.`,
    };
  }

  if (r.mapping_truth_status === "UNKNOWN" && r.buyer_path_truth_status === "MIXED") {
    return {
      recommendation: "NEEDS_MORE_PROOF",
      reason:
        "Some safe gated buyer paths exist but mapping fit confidence is UNKNOWN-only — open with truth-gated visibility only after fit claims stay generic.",
    };
  }

  if (r.currently_public_facing_status === "LIVE") {
    return {
      recommendation: "OPEN_NOW_TRUTH_GATED",
      reason: "Already LIVE with committed safe gated buyer-path rows on mapped filters.",
    };
  }

  if (r.currently_public_facing_status === "PREVIEW_ONLY" && r.linked_filters_with_safe_gated_buy_path > 0) {
    return {
      recommendation: "OPEN_NOW_TRUTH_GATED",
      reason: `Preview routes exist with ${r.linked_filters_with_safe_gated_buy_path} mapped filter(s) proving safe gated buyer paths in committed CSV — candidate for truth-gated launch (flip vertical launch state + sitemap; no automatic buy-button expansion).`,
    };
  }

  return {
    recommendation: "KEEP_PREVIEW_ONLY",
    reason: "Routes exist under noindex preview policy; buyer-path or mapping proof not strong enough to recommend public opening yet.",
  };
}

function collectCandidateFamilies(
  wedge: HomekeepWedgeCatalog,
  modelRows: Record<string, string>[],
  modelKey: string,
  linkedSafeFilters: Set<string>,
  compatRows: CompatRow[],
  compatModelKey: string,
): string[] {
  const brands = new Map<string, number>();
  for (const row of modelRows) {
    const slug = (row[modelKey] ?? "").trim().toLowerCase();
    if (!slug) continue;
    const brand = brandFromModelSlug(slug);
    brands.set(brand, (brands.get(brand) ?? 0) + 1);
  }

  const safeBrands = new Map<string, number>();
  for (const row of compatRows) {
    const filterSlug = (row.filter_slug ?? "").trim().toLowerCase();
    const modelSlug = (row[compatModelKey] ?? "").trim().toLowerCase();
    if (!filterSlug || !modelSlug || !linkedSafeFilters.has(filterSlug)) continue;
    const brand = brandFromModelSlug(modelSlug);
    safeBrands.set(brand, (safeBrands.get(brand) ?? 0) + 1);
  }

  const ranked = Array.from(safeBrands.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([brand]) => brand);
  if (ranked.length > 0) return ranked.slice(0, 5);

  return Array.from(brands.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([brand]) => brand);
}

function buildExpansionTargets(
  wedgeRows: PublicWedgeReadinessRowV1[],
  rootDir: string,
  fileExists: (abs: string) => boolean,
  readText: (abs: string) => string,
): EasiestTruthfulExpansionTargetV1[] {
  const targets: EasiestTruthfulExpansionTargetV1[] = [];

  for (const row of wedgeRows) {
    if (row.wedge === HOMEKEEP_WEDGE_CATALOG.refrigerator_water) continue;
    if (row.csv_data_source !== "committed_csv") continue;

    const paths = WEDGE_PATHS[row.wedge];
    const linkRows = readCsvRows(rootDir, paths.retailer_links, fileExists, readText) as RetailerLinkRow[];
    const compatRows = readCsvRows(rootDir, paths.compatibility, fileExists, readText);
    const modelRows = readCsvRows(rootDir, paths.models, fileExists, readText);

    const mappedFilters = new Set<string>();
    for (const c of compatRows) {
      const fs = (c.filter_slug ?? "").trim().toLowerCase();
      if (fs) mappedFilters.add(fs);
    }

    const analysis = analyzeRetailerLinksForMappedFilters(linkRows, mappedFilters);
    for (const filterSlug of Array.from(analysis.linkedFiltersWithSafe)) {
      targets.push({
        rank: 0,
        wedge: row.wedge,
        target_kind: "filter_slug",
        target_id: filterSlug,
        score: 70 + (row.currently_public_facing_status === "PREVIEW_ONLY" ? 10 : 0),
        reason: "Mapped filter already has safe gated direct_buyable proof in committed CSV.",
        requires_model_first: false,
      });
    }

    const modelToFilter = new Map<string, string>();
    for (const c of compatRows) {
      const ms = (c[paths.compat_model_key] ?? "").trim().toLowerCase();
      const fs = (c.filter_slug ?? "").trim().toLowerCase();
      if (ms && fs) modelToFilter.set(ms, fs);
    }

    for (const model of modelRows) {
      const modelSlug = (model[paths.model_key] ?? "").trim().toLowerCase();
      if (!modelSlug) continue;
      const filterSlug = modelToFilter.get(modelSlug);
      if (!filterSlug) continue;
      if (analysis.linkedFiltersWithSafe.has(filterSlug)) continue;
      const filterRows = linkRows.filter((r) => (r.filter_slug ?? "").trim().toLowerCase() === filterSlug);
      const primary = filterRows.find((r) => isTruthyPrimary(r.is_primary)) ?? filterRows[0];
      const isPlaceholder =
        primary &&
        (buyLinkGateFailureKind({
          retailer_key: primary.retailer_key ?? null,
          affiliate_url: primary.affiliate_url ?? "",
          browser_truth_classification: primary.browser_truth_classification ?? null,
          browser_truth_buyable_subtype: primary.browser_truth_buyable_subtype ?? null,
        }) === "search_placeholder" ||
          isManufacturerSiteSearchUrl(primary.destination_url ?? primary.affiliate_url ?? ""));
      if (!isPlaceholder) continue;
      targets.push({
        rank: 0,
        wedge: row.wedge,
        target_kind: "model_slug",
        target_id: modelSlug,
        score: 55,
        reason: "Model maps to filter with search-placeholder or weak primary — model-first evidence before public buy claims.",
        requires_model_first: true,
      });
    }
  }

  for (const row of wedgeRows) {
    if (row.wedge === HOMEKEEP_WEDGE_CATALOG.refrigerator_water) continue;
    if (row.public_opening_recommendation === "OPEN_NOW_TRUTH_GATED" && row.currently_public_facing_status === "PREVIEW_ONLY") {
      targets.push({
        rank: 0,
        wedge: row.wedge,
        target_kind: "wedge_lane",
        target_id: row.wedge,
        score: row.easiest_truthful_win_score + 5,
        reason: "Wedge has preview routes plus committed safe buyer-path proof — truth-gated public opening candidate.",
        requires_model_first: false,
      });
    }
  }

  targets.sort((a, b) => b.score - a.score);
  return targets.slice(0, 10).map((t, i) => ({ ...t, rank: i + 1 }));
}

export function buildPublicWedgeReadinessAndEasiestWinsV1(
  args: BuildPublicWedgeReadinessDepsV1,
): PublicWedgeReadinessAndEasiestWinsV1 {
  const now = args.now ?? (() => new Date());
  const fileExists = args.fileExists ?? defaultFileExists;
  const readText = args.readText ?? defaultReadText;
  const rootDir = args.rootDir;

  const launchPolicy = buildOwnerVerticalLaunchPolicyReport();
  const source_paths = [
    "src/lib/catalog/vertical-launch-state.ts",
    "src/lib/owner-dashboard/owner-vertical-launch-policy.ts",
    "src/lib/retailers/launch-buy-links.ts",
    ...Object.values(WEDGE_PATHS).flatMap((p) => [p.models, p.filters, p.compatibility, p.retailer_links]),
    ...Object.values(WEDGE_PATHS).flatMap((p) => p.route_dirs),
  ];

  const wedge_rows: PublicWedgeReadinessRowV1[] = [];

  for (const wedge of WEDGE_ORDER) {
    const paths = WEDGE_PATHS[wedge];
    const csv_data_source = resolveCsvDataSource(paths.retailer_links, fileExists, rootDir);
    const routesPresent = paths.route_dirs.some((rel) => fileExists(path.join(rootDir, rel)));
    const currently_public_facing_status = publicFacingStatusForWedge(wedge, routesPresent);

    const modelRows = readCsvRows(rootDir, paths.models, fileExists, readText);
    const filterRows = readCsvRows(rootDir, paths.filters, fileExists, readText);
    const compatRows = readCsvRows(rootDir, paths.compatibility, fileExists, readText);
    const linkRows = readCsvRows(rootDir, paths.retailer_links, fileExists, readText) as RetailerLinkRow[];

    const mappedFilterSlugs = new Set<string>();
    for (const row of compatRows) {
      const fs = (row.filter_slug ?? "").trim().toLowerCase();
      if (fs) mappedFilterSlugs.add(fs);
    }

    const analysis = analyzeRetailerLinksForMappedFilters(linkRows, mappedFilterSlugs);
    const buyer_path_truth_status = buyerPathTruthStatus(
      csv_data_source,
      analysis.linkedFiltersWithSafe.size,
      analysis.linkedFiltersWithZeroSafe.size,
    );
    const mapping_truth_status = mappingTruthStatus(compatRows);

    const partialRow = {
      wedge,
      vertical_slug: VERTICAL_BY_WEDGE[wedge],
      public_routes_present: routesPresent,
      currently_public_facing_status,
      csv_data_source,
      model_count: modelRows.length,
      filter_count: filterRows.length,
      compatibility_mapping_count: compatRows.length,
      safe_cta_count: analysis.safe_cta_count,
      direct_buyable_count: analysis.direct_buyable_count,
      search_placeholder_count: analysis.search_placeholder_count,
      linked_filters_with_safe_gated_buy_path: analysis.linkedFiltersWithSafe.size,
      linked_filters_with_zero_safe_buy_path: analysis.linkedFiltersWithZeroSafe.size,
      buyer_path_truth_status,
      mapping_truth_status,
      easiest_candidate_families_or_brands: collectCandidateFamilies(
        wedge,
        modelRows,
        paths.model_key,
        analysis.linkedFiltersWithSafe,
        compatRows,
        paths.compat_model_key,
      ),
    } satisfies Omit<PublicWedgeReadinessRowV1, "easiest_truthful_win_score" | "public_opening_recommendation" | "reason">;

    const easiest_truthful_win_score = computeEasiestTruthfulWinScore({
      wedge,
      csvSource: csv_data_source,
      buyerPathStatus: buyer_path_truth_status,
      linkedSafe: analysis.linkedFiltersWithSafe.size,
      linkedZeroSafe: analysis.linkedFiltersWithZeroSafe.size,
      mappedFilterCount: mappedFilterSlugs.size,
      modelCount: modelRows.length,
      publicFacing: currently_public_facing_status,
      routesPresent,
      searchPlaceholderCount: analysis.search_placeholder_count,
      retailerLinkCount: linkRows.length,
    });

    const { recommendation, reason } = computePublicOpeningRecommendation({ row: partialRow });

    wedge_rows.push({
      ...partialRow,
      easiest_truthful_win_score,
      public_opening_recommendation: recommendation,
      reason,
    });
  }

  const nonFridge = wedge_rows.filter((r) => r.wedge !== HOMEKEEP_WEDGE_CATALOG.refrigerator_water);
  const expandCandidates = nonFridge.filter((r) => r.csv_data_source === "committed_csv");
  const next_best_wedge_to_expand =
    expandCandidates.sort((a, b) => b.easiest_truthful_win_score - a.easiest_truthful_win_score)[0]?.wedge ??
    "UNKNOWN";

  const openCandidates = nonFridge.filter(
    (r) =>
      r.public_opening_recommendation === "OPEN_NOW_TRUTH_GATED" &&
      r.currently_public_facing_status === "PREVIEW_ONLY",
  );
  const nextOpenCandidate = openCandidates.sort(
    (a, b) => b.easiest_truthful_win_score - a.easiest_truthful_win_score,
  )[0];
  const next_best_public_wedge_to_open_if_safe: HomekeepWedgeCatalog | "UNKNOWN" =
    nextOpenCandidate?.wedge ?? "UNKNOWN";

  const next_10_easiest_truthful_expansion_targets = buildExpansionTargets(
    wedge_rows,
    rootDir,
    fileExists,
    readText,
  );

  const proven_model_replacement_safe_buy_path_count = wedge_rows.reduce(
    (sum, r) => sum + r.linked_filters_with_safe_gated_buy_path,
    0,
  );
  const safe_public_wedge_count = wedge_rows.filter((r) => hasSafeGatedBuyerPathProof(r)).length;
  const unsafe_or_unknown_public_claim_count = wedge_rows.filter(
    (r) =>
      r.public_opening_recommendation === "DO_NOT_OPEN_YET" ||
      r.public_opening_recommendation === "NEEDS_MORE_PROOF" ||
      r.buyer_path_truth_status === "UNKNOWN",
  ).length;
  const search_placeholder_debt_count = wedge_rows.reduce((sum, r) => sum + r.search_placeholder_count, 0);
  const mapping_unknown_count = wedge_rows.filter((r) => r.mapping_truth_status === "UNKNOWN").length;

  const kpi_definitions: PublicWedgeReadinessKpiDefinitionsV1 = {
    proven_model_replacement_safe_buy_path_count:
      "Count of mapped filter slugs with at least one safe gated direct_buyable buyer path in committed CSV (or LIVE fridge public Supabase gates).",
    safe_public_wedge_count:
      "Wedges with proven safe gated buyer-path proof — not raw row counts or route presence alone.",
    unsafe_or_unknown_public_claim_count:
      "Wedges still DO_NOT_OPEN_YET, NEEDS_MORE_PROOF, or buyer-path UNKNOWN — public claims would overclaim.",
    search_placeholder_debt_count:
      "Retailer link rows flagged search_placeholder by buyLinkGateFailureKind across wedges (committed + sample).",
    mapping_unknown_count:
      "Wedges whose compatibility mappings lack explicit fit-confidence columns (fridge has UNKNOWN-only mapping truth).",
  };

  const proven_facts = [
    "PROVEN: This report is read-only and does not mutate product CSVs, Supabase, dispatch-runs, batch-review, or public customer UI.",
    `PROVEN: Launch policy derived from ${launchPolicy.generated_from.join(", ")}.`,
    "PROVEN: Safe CTA counts use buyLinkGateFailureKind + direct_buyable classification from src/lib/retailers/launch-buy-links.ts.",
    "PROVEN: Row counts alone cannot produce OPEN_NOW_TRUTH_GATED — opening requires safe gated buyer-path proof on mapped filters.",
    "PROVEN: Fridge rebuild from scratch is not recommended — refrigerator_water score is capped and reason cites do-not-rebuild doctrine.",
  ];

  const inferred_facts = [
    "INFERRED: Refrigerator LIVE public pages use Supabase retailer_links through filterRealBuyRetailerLinks (not committed CSV safe counts).",
    "INFERRED: Air purifier model-first steering (Command Center) complements but does not replace this cross-wedge readiness ranking.",
  ];

  const unknown_facts: string[] = [];
  for (const row of wedge_rows.filter((r) => r.csv_data_source === "sample_csv_only")) {
    unknown_facts.push(
      `UNKNOWN: ${row.wedge} buyer-path truth uses sample CSV only — not committed production inventory.`,
    );
  }

  return {
    contract: PUBLIC_WEDGE_READINESS_AND_EASIEST_WINS_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    generated_at: now().toISOString(),
    source_paths,
    wedge_rows,
    global_plan: {
      next_best_wedge_to_expand,
      next_best_public_wedge_to_open_if_safe,
      next_10_easiest_truthful_expansion_targets,
    },
    kpi_definitions,
    kpi_snapshot: {
      proven_model_replacement_safe_buy_path_count,
      safe_public_wedge_count,
      unsafe_or_unknown_public_claim_count,
      search_placeholder_debt_count,
      mapping_unknown_count,
    },
    proven_facts,
    inferred_facts,
    unknown_facts,
    recommended_next_action:
      nextOpenCandidate !== undefined
        ? `Truth-gated public opening review for ${next_best_public_wedge_to_open_if_safe} (committed safe buyer paths exist; flip launch state only after owner approval — no CSV/Supabase mutation from this report). Do not redo fridge products from scratch.`
        : `Expand ${next_best_wedge_to_expand} via model-first / safe buyer-path proof before public opening. Do not redo fridge products from scratch.`,
    truth_first_notes: [
      "Affiliate links remain second to truth.",
      "Public opening means truth-gated visibility — not automatic buy buttons.",
      "Mapping confidence is separate from buyer-path truth and must not be overclaimed.",
    ],
  };
}
