/**
 * Read-only all-product safe buyer path census across Homekeep wedges.
 * No CSV/Supabase/evidence mutation; no BuckParts Verified Link authorization.
 */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { parse } from "csv-parse/sync";

import { HOMEKEEP_WEDGE_CATALOG, type HomekeepWedgeCatalog } from "@/lib/catalog/identity";
import {
  getVerticalLaunchState,
  isVerticalLive,
  type VerticalLaunchState,
  type VerticalSlug,
} from "@/lib/catalog/vertical-launch-state";
import {
  buyLinkGateFailureKind,
  filterRealBuyRetailerLinks,
  isDirectBuyableSafeCtaRow,
  isManufacturerSiteSearchUrl,
} from "@/lib/retailers/launch-buy-links";

import {
  decisionSignalsFromBuyLinkRowsV1,
  decisionSignalsFromEvidenceFreshnessV1,
} from "./buckparts-decision-precedence-signals-v1";
import {
  resolveDecisionPrecedenceV1,
  type DecisionDispositionV1,
} from "./buckparts-decision-precedence-resolver-v1";

export const ALL_PRODUCT_SAFE_BUYER_PATH_CENSUS_CONTRACT_V1 =
  "all_product_safe_buyer_path_census_v1" as const;

export const ALL_PRODUCT_SAFE_BUYER_PATH_CENSUS_CC_JQ_PATH_V1 =
  ".command_center_v2.all_product_safe_buyer_path_census_v1" as const;

export const ALL_PRODUCT_SAFE_BUYER_PATH_CENSUS_SOURCE_COMMAND_V1 =
  "npm run buckparts:all-product-safe-buyer-path-census" as const;

export type SafeBuyerPathPageClassificationV1 =
  | "SAFE_BUYER_PATH_PROVEN"
  | "SAFE_BUYER_PATH_SUPPRESSED_TRUST"
  | "NO_PRODUCT_PAGE_PROVEN"
  | "NOINDEX_UNPROVEN"
  | "UNKNOWN";

export type WedgeCsvInventorySourceV1 = "committed_csv" | "sample_csv_only" | "missing";

export type AllProductCensusProductRowV1 = {
  slug: string;
  wedge: HomekeepWedgeCatalog;
  vertical_launch_state: VerticalLaunchState | "UNKNOWN";
  page_classification: SafeBuyerPathPageClassificationV1;
  indexable_in_repo_policy: boolean | "UNKNOWN";
  public_route: string;
  current_page_state: string;
  retailer_row_state: string;
  evidence_files: string[];
  supabase_safe_path_missing_from_csv: boolean | "UNKNOWN";
  csv_safe_path_missing_from_supabase: boolean | "UNKNOWN";
  recommended_next_safe_action: string;
  owner_approval_required: boolean;
  mutation_authorized: false;
  rescue_priority_score: number;
  /** Central precedence resolver — does not demote page_classification. */
  public_trust_current: DecisionDispositionV1;
  public_trust_mutation_permitted: boolean;
  public_trust_deny_reasons: string[];
};

export type AllProductWedgeCoverageSummaryV1 = {
  wedge: HomekeepWedgeCatalog;
  vertical_slug: VerticalSlug | "refrigerator_routes";
  vertical_launch_state: VerticalLaunchState | "UNKNOWN";
  csv_inventory_source: WedgeCsvInventorySourceV1;
  product_page_count: number;
  safe_buyer_path_proven_count: number;
  suppressed_trust_count: number;
  noindex_unproven_count: number;
  unknown_count: number;
};

export type AllProductSafeBuyerPathCensusV1 = {
  contract: typeof ALL_PRODUCT_SAFE_BUYER_PATH_CENSUS_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  mutation_authorized: false;
  recommended_jq_path: typeof ALL_PRODUCT_SAFE_BUYER_PATH_CENSUS_CC_JQ_PATH_V1;
  source_command: typeof ALL_PRODUCT_SAFE_BUYER_PATH_CENSUS_SOURCE_COMMAND_V1;
  generated_at: string;
  exact_repo_paths_read: string[];
  wedge_coverage: AllProductWedgeCoverageSummaryV1[];
  classification_counts: Record<SafeBuyerPathPageClassificationV1, number>;
  products: AllProductCensusProductRowV1[];
  top_20_rescue_queue: AllProductCensusProductRowV1[];
  easiest_rescue_slugs: string[];
  requires_owner_browser_review_slugs: string[];
  proven_facts: string[];
  inferred_facts: string[];
  unknown_facts: string[];
  recommended_next_action: string;
};

export type BuildAllProductSafeBuyerPathCensusDepsV1 = {
  rootDir: string;
  now?: () => Date;
  fileExists?: (abs: string) => boolean;
  readText?: (abs: string) => string;
  listEvidenceFilenames?: (evidenceDir: string) => string[];
  /** Optional Supabase safe-CTA counts by filter slug (fridge/AP when env available). */
  supabaseSafeCtaCountBySlug?: Map<string, number> | null;
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
  filter_route_prefix: string;
};

const WEDGE_PATHS: Record<HomekeepWedgeCatalog, WedgePathsV1> = {
  [HOMEKEEP_WEDGE_CATALOG.refrigerator_water]: {
    models: "data/fridge_models.csv",
    filters: "data/filters.csv",
    compatibility: "data/compatibility_mappings.csv",
    retailer_links: "data/retailer_links.csv",
    filter_route_prefix: "/filter",
  },
  [HOMEKEEP_WEDGE_CATALOG.air_purifier]: {
    models: "data/air-purifier/models.csv",
    filters: "data/air-purifier/filters.csv",
    compatibility: "data/air-purifier/compatibility_mappings.csv",
    retailer_links: "data/air-purifier/retailer_links.csv",
    filter_route_prefix: "/air-purifier/filter",
  },
  [HOMEKEEP_WEDGE_CATALOG.whole_house_water]: {
    models: "data/whole-house-water/models.csv",
    filters: "data/whole-house-water/filters.csv",
    compatibility: "data/whole-house-water/compatibility_mappings.csv",
    retailer_links: "data/whole-house-water/retailer_links.csv",
    filter_route_prefix: "/whole-house-water/filter",
  },
  [HOMEKEEP_WEDGE_CATALOG.vacuum]: {
    models: "data/vacuum/models.sample.csv",
    filters: "data/vacuum/filters.sample.csv",
    compatibility: "data/vacuum/compatibility_mappings.sample.csv",
    retailer_links: "data/vacuum/retailer_links.sample.csv",
    filter_route_prefix: "/vacuum/filter",
  },
  [HOMEKEEP_WEDGE_CATALOG.humidifier]: {
    models: "data/humidifier/models.sample.csv",
    filters: "data/humidifier/filters.sample.csv",
    compatibility: "data/humidifier/compatibility_mappings.sample.csv",
    retailer_links: "data/humidifier/retailer_links.sample.csv",
    filter_route_prefix: "/humidifier/filter",
  },
  [HOMEKEEP_WEDGE_CATALOG.appliance_air]: {
    models: "data/appliance-air/models.sample.csv",
    filters: "data/appliance-air/filters.sample.csv",
    compatibility: "data/appliance-air/compatibility_mappings.sample.csv",
    retailer_links: "data/appliance-air/retailer_links.sample.csv",
    filter_route_prefix: "/appliance-air/filter",
  },
};

type FilterRow = { brand_slug?: string; slug?: string; oem_part_number?: string; notes?: string };
type CompatRow = Record<string, string | undefined>;
type RetailerLinkRow = {
  filter_slug?: string;
  retailer_name?: string;
  retailer_key?: string;
  affiliate_url?: string;
  destination_url?: string;
  is_primary?: string;
  browser_truth_classification?: string | null;
  browser_truth_buyable_subtype?: string | null;
  browser_truth_notes?: string | null;
  browser_truth_checked_at?: string | null;
};

function defaultFileExists(abs: string): boolean {
  return existsSync(abs);
}

function defaultReadText(abs: string): string {
  return readFileSync(abs, "utf8");
}

function defaultListEvidence(evidenceDir: string): string[] {
  try {
    return readdirSync(evidenceDir);
  } catch {
    return [];
  }
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

function resolveCsvInventorySource(
  relPath: string,
  fileExists: (abs: string) => boolean,
  rootDir: string,
): WedgeCsvInventorySourceV1 {
  const abs = path.join(rootDir, relPath);
  if (!fileExists(abs)) return "missing";
  if (relPath.includes(".sample.")) return "sample_csv_only";
  return "committed_csv";
}

function verticalLaunchForWedge(wedge: HomekeepWedgeCatalog): VerticalLaunchState | "UNKNOWN" {
  const vertical = VERTICAL_BY_WEDGE[wedge];
  if (vertical === "refrigerator_routes") return getVerticalLaunchState("refrigerator");
  return getVerticalLaunchState(vertical);
}

function indexableInRepoPolicy(wedge: HomekeepWedgeCatalog): boolean | "UNKNOWN" {
  const vertical = VERTICAL_BY_WEDGE[wedge];
  if (vertical === "refrigerator_routes") return isVerticalLive("refrigerator");
  if (vertical === "whole-house-water") return false;
  if (vertical === "vacuum" || vertical === "humidifier" || vertical === "appliance-air") return false;
  if (vertical === "air-purifier") return isVerticalLive("air-purifier");
  return "UNKNOWN";
}

function isTruthyPrimary(value: string | undefined): boolean {
  const v = (value ?? "").trim().toLowerCase();
  return v === "true" || v === "1" || v === "yes";
}

function linkedFilterSlugs(
  compatRows: CompatRow[],
  linkRows: RetailerLinkRow[],
  compatFilterKey: string,
): Set<string> {
  const slugs = new Set<string>();
  for (const row of compatRows) {
    const slug = (row.filter_slug ?? "").trim().toLowerCase();
    if (slug) slugs.add(slug);
  }
  for (const row of linkRows) {
    const slug = (row.filter_slug ?? "").trim().toLowerCase();
    if (slug) slugs.add(slug);
  }
  return slugs;
}

function evidencePathsFromBrowserTruthNotes(notes: string | undefined): string[] {
  if (!notes?.trim()) return [];
  const matches = notes.match(/data\/[a-zA-Z0-9/_.-]+\.json/g) ?? [];
  return Array.from(new Set(matches)).sort();
}

function evidenceFilesForSlug(
  slug: string,
  filenames: string[],
  browserTruthNotes?: string,
): string[] {
  const needle = slug.toLowerCase();
  const fromEvidenceDir = filenames
    .filter((name) => name.toLowerCase().includes(needle))
    .map((name) => `data/evidence/${name}`);
  const fromNotes = evidencePathsFromBrowserTruthNotes(browserTruthNotes).filter((p) =>
    p.toLowerCase().includes(needle),
  );
  return Array.from(new Set([...fromEvidenceDir, ...fromNotes])).sort();
}

function summarizeRetailerRows(rows: RetailerLinkRow[]): {
  total: number;
  safe_gated: number;
  primary_state: string;
  has_search_placeholder_primary: boolean;
  has_direct_buyable_unsafe: boolean;
} {
  const gated = filterRealBuyRetailerLinks(
    rows.map((r) => ({
      retailer_key: r.retailer_key ?? null,
      affiliate_url: (r.destination_url ?? r.affiliate_url ?? "").trim(),
      browser_truth_classification: r.browser_truth_classification ?? null,
      browser_truth_buyable_subtype: r.browser_truth_buyable_subtype ?? null,
      browser_truth_checked_at: r.browser_truth_checked_at ?? null,
      browser_truth_notes: r.browser_truth_notes ?? null,
    })),
  );
  const primary = rows.find((r) => isTruthyPrimary(r.is_primary)) ?? rows[0] ?? null;
  let primary_state = "no_primary_row";
  let has_search_placeholder_primary = false;
  let has_direct_buyable_unsafe = false;
  if (primary) {
    const url = (primary.destination_url ?? primary.affiliate_url ?? "").trim();
    const gate = buyLinkGateFailureKind({
      retailer_key: primary.retailer_key ?? null,
      affiliate_url: url,
      browser_truth_classification: primary.browser_truth_classification ?? null,
      browser_truth_buyable_subtype: primary.browser_truth_buyable_subtype ?? null,
      browser_truth_checked_at: primary.browser_truth_checked_at ?? null,
      browser_truth_notes: primary.browser_truth_notes ?? null,
    });
    has_search_placeholder_primary =
      gate === "search_placeholder" || isManufacturerSiteSearchUrl(url);
    has_direct_buyable_unsafe =
      (primary.browser_truth_classification ?? "").trim() === "direct_buyable" && gate !== null;
    primary_state = `${primary.retailer_key ?? "unknown"}:${gate ?? "passes_gate"}:${(primary.browser_truth_classification ?? "none").trim() || "none"}`;
  }
  return {
    total: rows.length,
    safe_gated: gated.length,
    primary_state,
    has_search_placeholder_primary,
    has_direct_buyable_unsafe,
  };
}

function rescuePriorityScore(args: {
  indexable: boolean | "UNKNOWN";
  evidence_count: number;
  has_search_placeholder_primary: boolean;
  has_direct_buyable_unsafe: boolean;
  model_link_count: number;
  wedge_live: boolean;
}): number {
  let score = 0;
  if (args.indexable === true) score += 100;
  if (args.wedge_live) score += 40;
  score += Math.min(args.model_link_count, 20) * 3;
  score += Math.min(args.evidence_count, 5) * 12;
  if (args.has_direct_buyable_unsafe) score += 25;
  if (args.has_search_placeholder_primary) score += 15;
  return score;
}

function ownerApprovalRequired(args: {
  classification: SafeBuyerPathPageClassificationV1;
  csv_safe: number;
  supabase_safe: number | "UNKNOWN";
  evidence_count: number;
}): boolean {
  if (args.classification !== "SAFE_BUYER_PATH_SUPPRESSED_TRUST") return false;
  if (args.supabase_safe !== "UNKNOWN" && args.supabase_safe > args.csv_safe) return true;
  if (args.evidence_count > 0 && args.csv_safe === 0) return true;
  return false;
}

function recommendedAction(args: {
  classification: SafeBuyerPathPageClassificationV1;
  wedge: HomekeepWedgeCatalog;
  slug: string;
  retailer_summary: ReturnType<typeof summarizeRetailerRows>;
  evidence_count: number;
}): string {
  const { classification, slug, retailer_summary, evidence_count } = args;
  if (classification === "SAFE_BUYER_PATH_PROVEN") {
    return "No rescue needed — at least one gated safe buyer path exists in repo CSV. Re-check live /go and browser truth before marketing claims.";
  }
  if (classification === "NOINDEX_UNPROVEN") {
    return "Wedge is NOINDEX_UNPROVEN in launch state — do not open public index until safe buyer-path proof and owner launch approval. Continue read-only evidence if needed.";
  }
  if (classification === "NO_PRODUCT_PAGE_PROVEN") {
    return "No proven product page inventory for this slug — confirm catalog/mapping before buyer-path work.";
  }
  if (classification === "UNKNOWN") {
    return "Inventory source is sample-only or missing — treat as UNKNOWN until committed CSV exists.";
  }
  if (retailer_summary.total === 0) {
    return `Read-only retailer discovery for ${slug} — add evidence packet before any CSV row. Owner approval required before production links.`;
  }
  if (retailer_summary.has_search_placeholder_primary) {
    return `Official manufacturer PDP or verified retailer listing search for ${slug}; replace search-placeholder primary with browser-proofed direct_buyable row. Owner approval before CSV apply.`;
  }
  if (evidence_count > 0) {
    return `Review committed evidence for ${slug}, reconcile CSV vs Supabase parity, then propose read-only apply plan — owner approval required.`;
  }
  return `Model-first browser proof for ${slug} — capture listing evidence before authorizing any BuckParts Verified Link.`;
}

function requiresBrowserReview(args: {
  classification: SafeBuyerPathPageClassificationV1;
  owner_approval: boolean;
  has_direct_buyable_unsafe: boolean;
  evidence_count: number;
}): boolean {
  if (args.classification !== "SAFE_BUYER_PATH_SUPPRESSED_TRUST") return false;
  return args.owner_approval || args.has_direct_buyable_unsafe || args.evidence_count > 0;
}

export function buildAllProductSafeBuyerPathCensusV1(
  deps: BuildAllProductSafeBuyerPathCensusDepsV1,
): AllProductSafeBuyerPathCensusV1 {
  const now = deps.now ?? (() => new Date());
  const fileExists = deps.fileExists ?? defaultFileExists;
  const readText = deps.readText ?? defaultReadText;
  const listEvidenceFilenames =
    deps.listEvidenceFilenames ??
    ((dir: string) => defaultListEvidence(dir));
  const evidenceDir = path.join(deps.rootDir, "data/evidence");
  const evidenceFilenames = listEvidenceFilenames(evidenceDir);
  const supabaseBySlug = deps.supabaseSafeCtaCountBySlug ?? null;

  const products: AllProductCensusProductRowV1[] = [];
  const wedge_coverage: AllProductWedgeCoverageSummaryV1[] = [];
  const exact_paths = new Set<string>(["data/evidence/"]);

  for (const wedge of WEDGE_ORDER) {
    const paths = WEDGE_PATHS[wedge];
    exact_paths.add(paths.filters);
    exact_paths.add(paths.compatibility);
    exact_paths.add(paths.retailer_links);

    const csv_source = resolveCsvInventorySource(paths.filters, fileExists, deps.rootDir);
    const launch = verticalLaunchForWedge(wedge);
    const indexable_policy = indexableInRepoPolicy(wedge);
    const wedge_live = launch === "LIVE";

    if (csv_source !== "committed_csv") {
      wedge_coverage.push({
        wedge,
        vertical_slug: VERTICAL_BY_WEDGE[wedge],
        vertical_launch_state: launch,
        csv_inventory_source: csv_source,
        product_page_count: 0,
        safe_buyer_path_proven_count: 0,
        suppressed_trust_count: 0,
        noindex_unproven_count: 0,
        unknown_count: csv_source === "sample_csv_only" ? 0 : 0,
      });
      continue;
    }

    const filterRows = readCsvRows(deps.rootDir, paths.filters, fileExists, readText) as FilterRow[];
    const compatRows = readCsvRows(deps.rootDir, paths.compatibility, fileExists, readText);
    const linkRows = readCsvRows(deps.rootDir, paths.retailer_links, fileExists, readText) as RetailerLinkRow[];

    const linked = linkedFilterSlugs(compatRows, linkRows, "filter_slug");
    const modelCountByFilter = new Map<string, number>();
    for (const row of compatRows) {
      const slug = (row.filter_slug ?? "").trim().toLowerCase();
      if (!slug) continue;
      modelCountByFilter.set(slug, (modelCountByFilter.get(slug) ?? 0) + 1);
    }

    const linksBySlug = new Map<string, RetailerLinkRow[]>();
    for (const row of linkRows) {
      const slug = (row.filter_slug ?? "").trim().toLowerCase();
      if (!slug) continue;
      const list = linksBySlug.get(slug) ?? [];
      list.push(row);
      linksBySlug.set(slug, list);
    }

    let safe_proven = 0;
    let suppressed = 0;
    let noindex = 0;
    let unknown_wedge = 0;

    for (const filterRow of filterRows) {
      const slug = (filterRow.slug ?? "").trim().toLowerCase();
      if (!slug) continue;

      const isLinked = linked.has(slug);
      const retailerRows = linksBySlug.get(slug) ?? [];
      const retailer_summary = summarizeRetailerRows(retailerRows);
      const primaryRetailer =
        retailerRows.find((r) => isTruthyPrimary(r.is_primary)) ?? retailerRows[0] ?? null;
      const evidence_files = evidenceFilesForSlug(
        slug,
        evidenceFilenames,
        primaryRetailer?.browser_truth_notes ?? undefined,
      );
      const model_count = modelCountByFilter.get(slug) ?? 0;

      let classification: SafeBuyerPathPageClassificationV1;
      if (!isLinked) {
        classification = "NO_PRODUCT_PAGE_PROVEN";
      } else if (launch === "NOINDEX_UNPROVEN") {
        classification = "NOINDEX_UNPROVEN";
      } else if (retailer_summary.safe_gated > 0) {
        classification = "SAFE_BUYER_PATH_PROVEN";
      } else {
        classification = "SAFE_BUYER_PATH_SUPPRESSED_TRUST";
      }

      const supabase_safe =
        supabaseBySlug?.get(slug) ??
        (supabaseBySlug === null ? ("UNKNOWN" as const) : 0);
      const csv_safe = retailer_summary.safe_gated;
      const supabase_missing_from_csv: boolean | "UNKNOWN" =
        supabase_safe === "UNKNOWN" ? "UNKNOWN" : supabase_safe > csv_safe;
      const csv_missing_from_supabase: boolean | "UNKNOWN" =
        supabase_safe === "UNKNOWN" ? "UNKNOWN" : csv_safe > supabase_safe;

      const owner_approval = ownerApprovalRequired({
        classification,
        csv_safe,
        supabase_safe,
        evidence_count: evidence_files.length,
      });

      const page_state =
        classification === "SAFE_BUYER_PATH_PROVEN"
          ? "Gated safe buyer path in repo CSV"
          : classification === "SAFE_BUYER_PATH_SUPPRESSED_TRUST"
            ? "Product page inventory proven; buy path suppressed by trust gates"
            : classification === "NOINDEX_UNPROVEN"
              ? "Wedge NOINDEX_UNPROVEN — not safe for public index claims"
              : classification === "NO_PRODUCT_PAGE_PROVEN"
                ? "Not in linked product-page inventory"
                : "UNKNOWN inventory or launch posture";

      const rescue_priority_score = rescuePriorityScore({
        indexable: indexable_policy,
        evidence_count: evidence_files.length,
        has_search_placeholder_primary: retailer_summary.has_search_placeholder_primary,
        has_direct_buyable_unsafe: retailer_summary.has_direct_buyable_unsafe,
        model_link_count: model_count,
        wedge_live,
      });

      const homeownerExposed =
        classification === "SAFE_BUYER_PATH_PROVEN" && indexable_policy === true;
      const precedence = resolveDecisionPrecedenceV1([
        ...decisionSignalsFromBuyLinkRowsV1({
          rows: retailerRows,
          homeowner_exposed: homeownerExposed,
        }),
        ...decisionSignalsFromEvidenceFreshnessV1({
          rootDir: deps.rootDir,
          slug,
          now: deps.now,
          evidence_rel_paths: evidence_files,
          homeowner_exposed: homeownerExposed,
        }),
      ]);

      if (classification === "SAFE_BUYER_PATH_PROVEN") safe_proven += 1;
      else if (classification === "SAFE_BUYER_PATH_SUPPRESSED_TRUST") suppressed += 1;
      else if (classification === "NOINDEX_UNPROVEN") noindex += 1;
      else unknown_wedge += 1;

      products.push({
        slug,
        wedge,
        vertical_launch_state: launch,
        page_classification: classification,
        indexable_in_repo_policy: indexable_policy,
        public_route: `${paths.filter_route_prefix}/${slug}`,
        current_page_state: page_state,
        retailer_row_state: `${retailer_summary.total} row(s), ${retailer_summary.safe_gated} safe gated, primary=${retailer_summary.primary_state}`,
        evidence_files,
        supabase_safe_path_missing_from_csv: supabase_missing_from_csv,
        csv_safe_path_missing_from_supabase: csv_missing_from_supabase,
        recommended_next_safe_action: recommendedAction({
          classification,
          wedge,
          slug,
          retailer_summary,
          evidence_count: evidence_files.length,
        }),
        owner_approval_required: owner_approval,
        mutation_authorized: false,
        rescue_priority_score,
        public_trust_current: precedence.effective_public_trust,
        public_trust_mutation_permitted: precedence.mutation_permitted,
        public_trust_deny_reasons: precedence.deny_signals.map((s) => s.reason),
      });
    }

    wedge_coverage.push({
      wedge,
      vertical_slug: VERTICAL_BY_WEDGE[wedge],
      vertical_launch_state: launch,
      csv_inventory_source: csv_source,
      product_page_count: filterRows.filter((r) => (r.slug ?? "").trim()).length,
      safe_buyer_path_proven_count: safe_proven,
      suppressed_trust_count: suppressed,
      noindex_unproven_count: noindex,
      unknown_count: unknown_wedge,
    });
  }

  const classification_counts: Record<SafeBuyerPathPageClassificationV1, number> = {
    SAFE_BUYER_PATH_PROVEN: 0,
    SAFE_BUYER_PATH_SUPPRESSED_TRUST: 0,
    NO_PRODUCT_PAGE_PROVEN: 0,
    NOINDEX_UNPROVEN: 0,
    UNKNOWN: 0,
  };
  for (const p of products) {
    classification_counts[p.page_classification] += 1;
  }

  const rescue_candidates = products.filter(
    (p) =>
      p.page_classification === "SAFE_BUYER_PATH_SUPPRESSED_TRUST" ||
      p.page_classification === "NOINDEX_UNPROVEN",
  );

  const top_20_rescue_queue = rescue_candidates
    .slice()
    .sort((a, b) => b.rescue_priority_score - a.rescue_priority_score)
    .slice(0, 20);

  const easiest_rescue_slugs = top_20_rescue_queue
    .filter(
      (p) =>
        p.evidence_files.length > 0 ||
        p.retailer_row_state.includes("search_placeholder") ||
        p.retailer_row_state.includes("direct_buyable"),
    )
    .slice(0, 10)
    .map((p) => p.slug);

  const requires_owner_browser_review_slugs = products
    .filter((p) =>
      requiresBrowserReview({
        classification: p.page_classification,
        owner_approval: p.owner_approval_required,
        has_direct_buyable_unsafe: p.retailer_row_state.includes("direct_buyable"),
        evidence_count: p.evidence_files.length,
      }),
    )
    .slice()
    .sort((a, b) => b.rescue_priority_score - a.rescue_priority_score)
    .slice(0, 25)
    .map((p) => p.slug);

  const fridge = wedge_coverage.find((w) => w.wedge === HOMEKEEP_WEDGE_CATALOG.refrigerator_water);
  const ap = wedge_coverage.find((w) => w.wedge === HOMEKEEP_WEDGE_CATALOG.air_purifier);
  const whw = wedge_coverage.find((w) => w.wedge === HOMEKEEP_WEDGE_CATALOG.whole_house_water);

  const proven_facts = [
    `PROVEN: Census scanned committed CSV product inventory for refrigerator_water and air_purifier wedges.`,
    fridge
      ? `PROVEN: refrigerator_water — ${fridge.product_page_count} catalog slugs, ${fridge.safe_buyer_path_proven_count} with gated safe buyer path, ${fridge.suppressed_trust_count} suppressed, launch=${fridge.vertical_launch_state}.`
      : "UNKNOWN: refrigerator_water wedge summary missing.",
    ap
      ? `PROVEN: air_purifier — ${ap.product_page_count} catalog slugs, ${ap.safe_buyer_path_proven_count} with gated safe buyer path, ${ap.suppressed_trust_count} suppressed, launch=${ap.vertical_launch_state}.`
      : "UNKNOWN: air_purifier wedge summary missing.",
    whw
      ? `PROVEN: whole_house_water launch=${whw.vertical_launch_state}; ${whw.noindex_unproven_count} slugs labeled NOINDEX_UNPROVEN in census.`
      : "UNKNOWN: whole_house_water wedge summary missing.",
    "PROVEN: vacuum, humidifier, appliance_air use sample CSV only — excluded from per-product census rows.",
    "PROVEN: mutation_authorized is false for every product row.",
  ];

  const inferred_facts = [
    `INFERRED: ${classification_counts.SAFE_BUYER_PATH_SUPPRESSED_TRUST} live-inventory products need safe buyer path rescue or explicit trust suppression copy.`,
    `INFERRED: Top rescue queue favors indexable LIVE wedges with mapping + evidence already on disk.`,
  ];

  const unknown_facts = [
    supabaseBySlug === null
      ? "UNKNOWN: Live Supabase safe-CTA parity not loaded — csv/supabase mismatch fields are UNKNOWN unless env provided."
      : "PROVEN: Supabase safe-CTA counts supplied for parity fields on matching slugs.",
    "UNKNOWN: Live production /go runtime order and click demand (not required for repo census).",
    "UNKNOWN: Whether NOINDEX_UNPROVEN wedge pages are reachable despite noindex policy.",
  ];

  const top = top_20_rescue_queue[0];
  const recommended_next_action = top
    ? `Rescue queue #1: ${top.slug} (${top.wedge}, score=${top.rescue_priority_score}) — ${top.recommended_next_safe_action}`
    : "No suppressed products in committed CSV wedges — re-run after catalog expansion.";

  return {
    contract: ALL_PRODUCT_SAFE_BUYER_PATH_CENSUS_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    recommended_jq_path: ALL_PRODUCT_SAFE_BUYER_PATH_CENSUS_CC_JQ_PATH_V1,
    source_command: ALL_PRODUCT_SAFE_BUYER_PATH_CENSUS_SOURCE_COMMAND_V1,
    generated_at: now().toISOString(),
    exact_repo_paths_read: Array.from(exact_paths).sort(),
    wedge_coverage,
    classification_counts,
    products,
    top_20_rescue_queue,
    easiest_rescue_slugs,
    requires_owner_browser_review_slugs,
    proven_facts,
    inferred_facts,
    unknown_facts,
    recommended_next_action,
  };
}

export async function buildAllProductSafeBuyerPathCensusV1Report(
  deps: BuildAllProductSafeBuyerPathCensusDepsV1,
): Promise<AllProductSafeBuyerPathCensusV1> {
  let supabaseSafeCtaCountBySlug: Map<string, number> | null = null;
  try {
    const { tryLoadRefrigeratorFilterCtaJoinBySlugV1 } = await import(
      "./buckparts-page-publishability-truth-v1"
    );
    const join = await tryLoadRefrigeratorFilterCtaJoinBySlugV1(new Map());
    if (join) {
      supabaseSafeCtaCountBySlug = new Map();
      for (const [slug, row] of Array.from(join.entries())) {
        supabaseSafeCtaCountBySlug.set(slug, row.safe_cta_link_count);
      }
    }
  } catch {
    supabaseSafeCtaCountBySlug = null;
  }

  return buildAllProductSafeBuyerPathCensusV1({
    ...deps,
    supabaseSafeCtaCountBySlug,
  });
}

export function buildAllProductSafeBuyerPathCensusUnknownV1(args: {
  generated_at: string;
  reason: string;
}): AllProductSafeBuyerPathCensusV1 {
  return {
    contract: ALL_PRODUCT_SAFE_BUYER_PATH_CENSUS_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    recommended_jq_path: ALL_PRODUCT_SAFE_BUYER_PATH_CENSUS_CC_JQ_PATH_V1,
    source_command: ALL_PRODUCT_SAFE_BUYER_PATH_CENSUS_SOURCE_COMMAND_V1,
    generated_at: args.generated_at,
    exact_repo_paths_read: [],
    wedge_coverage: [],
    classification_counts: {
      SAFE_BUYER_PATH_PROVEN: 0,
      SAFE_BUYER_PATH_SUPPRESSED_TRUST: 0,
      NO_PRODUCT_PAGE_PROVEN: 0,
      NOINDEX_UNPROVEN: 0,
      UNKNOWN: 0,
    },
    products: [],
    top_20_rescue_queue: [],
    easiest_rescue_slugs: [],
    requires_owner_browser_review_slugs: [],
    proven_facts: [],
    inferred_facts: [],
    unknown_facts: [`UNKNOWN: census build failed — ${args.reason}`],
    recommended_next_action: "Fix census build error read-only; re-run npm run buckparts:all-product-safe-buyer-path-census locally.",
  };
}
