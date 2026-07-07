import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import {
  HOMEKEEP_MONETIZATION_WEDGE_CATALOG_ORDER,
  HOMEKEEP_WEDGE_CATALOG,
  type HomekeepMonetizationWedgeCatalog,
  type HomekeepWedgeCatalog,
} from "@/lib/catalog/identity";
import { buyLinkGateFailureKind } from "@/lib/retailers/launch-buy-links";
import type { OwnerGscExternalDemandNeuron, OwnerGscTopEntry } from "@/lib/owner-dashboard/gsc-external-demand";
import {
  buildAllProductSafeBuyerPathCensusV1,
  type AllProductCensusProductRowV1,
  type SafeBuyerPathPageClassificationV1,
} from "./all-product-safe-buyer-path-census-v1";
import { categoryDataCsvPath, dataCsvPath, readCsvFile } from "./csv";

export type CoverageOpportunityEvidenceLabelV1 = "PROVEN" | "INFERRED" | "UNKNOWN";

export type CoveragePriorityTierV1 = "TIER 1" | "TIER 2" | "TIER 3" | "TIER 4" | "UNKNOWN";

export type CoverageOpportunityDemandWeightV1 = "HIGH" | "MEDIUM" | "LOW" | "UNKNOWN";

export type CoverageOpportunityRowV1 = {
  rank: number;
  slug: string;
  wedge: HomekeepWedgeCatalog;
  public_route: string;
  page_classification: SafeBuyerPathPageClassificationV1;
  reason: string;
  current_blocker: string;
  recommended_next_safe_action: string;
  owner_approval_required: boolean;
  mutation_authorized: false;
  coverage_priority_tier: CoveragePriorityTierV1;
  demand_weight: CoverageOpportunityDemandWeightV1;
  rescue_priority_score: number;
  source_signals: string[];
  evidence_labels: {
    slug: CoverageOpportunityEvidenceLabelV1;
    wedge: CoverageOpportunityEvidenceLabelV1;
    public_route: CoverageOpportunityEvidenceLabelV1;
    page_classification: CoverageOpportunityEvidenceLabelV1;
    coverage_priority_tier: CoverageOpportunityEvidenceLabelV1;
    demand_weight: CoverageOpportunityEvidenceLabelV1;
    reason: CoverageOpportunityEvidenceLabelV1;
    current_blocker: CoverageOpportunityEvidenceLabelV1;
    recommended_next_safe_action: CoverageOpportunityEvidenceLabelV1;
  };
};

export type NextCoverageOpportunitiesSectionV1 = {
  contract: "buckparts_next_coverage_opportunities_v1";
  read_only: true;
  data_mutation: false;
  mutation_authorized: false;
  runtime_status: "OK" | "ATTENTION" | "UNKNOWN";
  max_opportunities: 10;
  opportunities: CoverageOpportunityRowV1[];
  signal_summary: {
    census_contract: string;
    census_generated_at: string;
    coverage_tier_source: "csv" | "UNKNOWN";
    demand_signal_available: boolean;
    internal_search_runtime_ok: boolean;
  };
  proven_facts: string[];
  unknown_facts: string[];
};

type PriorityTier = "TIER 1" | "TIER 2" | "TIER 3" | "TIER 4";

type FilterCoverageTierRowV1 = {
  wedge: HomekeepMonetizationWedgeCatalog;
  filter_slug: string;
  tier: PriorityTier;
};

const TIER_ORDER: Record<CoveragePriorityTierV1, number> = {
  "TIER 1": 1,
  "TIER 2": 2,
  "TIER 3": 3,
  "TIER 4": 4,
  UNKNOWN: 5,
};

const DEMAND_ORDER: Record<CoverageOpportunityDemandWeightV1, number> = {
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
  UNKNOWN: 4,
};

const CLASSIFICATION_ORDER: Partial<Record<SafeBuyerPathPageClassificationV1, number>> = {
  SAFE_BUYER_PATH_SUPPRESSED_TRUST: 1,
  NOINDEX_UNPROVEN: 2,
};

const WEDGE_CONFIG: Record<
  HomekeepMonetizationWedgeCatalog,
  { dataDir: string | null; hasStatus: boolean }
> = {
  [HOMEKEEP_WEDGE_CATALOG.refrigerator_water]: { dataDir: null, hasStatus: false },
  [HOMEKEEP_WEDGE_CATALOG.whole_house_water]: { dataDir: "whole-house-water", hasStatus: true },
  [HOMEKEEP_WEDGE_CATALOG.air_purifier]: { dataDir: "air-purifier", hasStatus: true },
};

function parseCsvBool(v: string | undefined): boolean {
  const s = (v ?? "").trim().toLowerCase();
  return s === "1" || s === "true" || s === "yes" || s === "y";
}

function computeTier(c: {
  number_of_valid_links: number;
  number_of_direct_buyable_links: number;
  has_primary_amazon: boolean;
}): PriorityTier {
  if (c.number_of_direct_buyable_links === 0) return "TIER 1";
  if (c.number_of_direct_buyable_links === 1) return "TIER 2";
  if (c.number_of_valid_links >= 2 && !c.has_primary_amazon) return "TIER 3";
  return "TIER 4";
}

/** Read-only CSV mirror of `prioritize-coverage-next-batch.ts` tier logic (no Supabase). */
export function buildCoveragePriorityTiersFromCsvV1(rootDir: string): FilterCoverageTierRowV1[] {
  const rows: FilterCoverageTierRowV1[] = [];
  for (const wedge of HOMEKEEP_MONETIZATION_WEDGE_CATALOG_ORDER) {
    const cfg = WEDGE_CONFIG[wedge];
    const filterFile =
      cfg.dataDir === null
        ? dataCsvPath(rootDir, "filters", false)
        : categoryDataCsvPath(rootDir, cfg.dataDir, "filters", false);
    const linksFile =
      cfg.dataDir === null
        ? dataCsvPath(rootDir, "retailer_links", false)
        : categoryDataCsvPath(rootDir, cfg.dataDir, "retailer_links", false);

    const filters = readCsvFile(filterFile, ["slug"]);
    const links = readCsvFile(linksFile, ["filter_slug", "affiliate_url"]);

    const linksByFilter = new Map<string, typeof links>();
    for (const l of links) {
      const k = l.filter_slug.trim();
      if (!linksByFilter.has(k)) linksByFilter.set(k, []);
      linksByFilter.get(k)!.push(l);
    }

    for (const f of filters) {
      const filter_slug = f.slug.trim();
      const entries = linksByFilter.get(filter_slug) ?? [];
      let valid = 0;
      let direct = 0;
      let hasPrimaryAmazon = false;
      for (const e of entries) {
        const gate = buyLinkGateFailureKind({
          retailer_key: e.retailer_key,
          affiliate_url: e.affiliate_url,
          browser_truth_classification: e.browser_truth_classification,
        });
        if (gate !== null) continue;
        valid += 1;
        if ((e.browser_truth_classification ?? "").trim() === "direct_buyable") direct += 1;
        if ((e.retailer_key ?? "").trim().toLowerCase() === "amazon" && parseCsvBool(e.is_primary)) {
          hasPrimaryAmazon = true;
        }
      }
      rows.push({
        wedge,
        filter_slug,
        tier: computeTier({
          number_of_valid_links: valid,
          number_of_direct_buyable_links: direct,
          has_primary_amazon: hasPrimaryAmazon,
        }),
      });
    }
  }
  return rows;
}

function tierKey(wedge: HomekeepWedgeCatalog, slug: string): string {
  return `${wedge}:${slug.trim().toLowerCase()}`;
}

function pathFromGscKey(key: string): string {
  const trimmed = key.trim();
  if (!trimmed) return "";
  try {
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
      return new URL(trimmed).pathname.replace(/\/$/, "") || "/";
    }
  } catch {
    // fall through
  }
  return trimmed.startsWith("/") ? trimmed.replace(/\/$/, "") : `/${trimmed}`.replace(/\/$/, "");
}

function gscImpressionsForRoute(
  publicRoute: string,
  gsc: OwnerGscExternalDemandNeuron | null | undefined,
): { impressions: number; matched: boolean } {
  if (!gsc) return { impressions: 0, matched: false };
  const normalizedRoute = publicRoute.replace(/\/$/, "") || "/";
  const lists: OwnerGscTopEntry[] = [];
  for (const key of [
    "top_pages_by_impressions",
    "top_pages_by_clicks",
    "high_impression_low_click_opportunities",
  ] as const) {
    const value = gsc[key];
    if (value !== "UNKNOWN" && Array.isArray(value)) lists.push(...value);
  }
  let maxImpressions = 0;
  let matched = false;
  for (const entry of lists) {
    const entryPath = pathFromGscKey(entry.key);
    if (!entryPath) continue;
    if (entryPath === normalizedRoute || entryPath.endsWith(normalizedRoute)) {
      matched = true;
      maxImpressions = Math.max(maxImpressions, entry.impressions);
    }
  }
  return { impressions: maxImpressions, matched };
}

function loadCommittedApModelSlugs(rootDir: string): Set<string> {
  const modelsPath = path.join(rootDir, "data/air-purifier/models.csv");
  if (!existsSync(modelsPath)) return new Set();
  const text = readFileSync(modelsPath, "utf8");
  const lines = text.split(/\r?\n/).slice(1);
  const slugs = new Set<string>();
  for (const line of lines) {
    const slug = line.split(",")[0]?.trim().toLowerCase();
    if (slug) slugs.add(slug);
  }
  return slugs;
}

function isExcludedApModelRoute(publicRoute: string, committedApModels: Set<string>): boolean {
  const match = publicRoute.match(/^\/air-purifier\/model\/([^/]+)$/i);
  if (!match) return false;
  const slug = match[1]!.toLowerCase();
  return !committedApModels.has(slug);
}

function isOpportunityCandidate(product: AllProductCensusProductRowV1, tier: CoveragePriorityTierV1): boolean {
  if (!(HOMEKEEP_MONETIZATION_WEDGE_CATALOG_ORDER as readonly string[]).includes(product.wedge)) {
    return false;
  }
  if (tier === "TIER 4") return false;
  if (product.page_classification === "SAFE_BUYER_PATH_SUPPRESSED_TRUST") return true;
  if (
    product.page_classification === "NOINDEX_UNPROVEN" &&
    product.wedge === HOMEKEEP_WEDGE_CATALOG.whole_house_water
  ) {
    return true;
  }
  return false;
}

function buildReason(args: {
  product: AllProductCensusProductRowV1;
  tier: CoveragePriorityTierV1;
  demandWeight: CoverageOpportunityDemandWeightV1;
  gscMatched: boolean;
}): string {
  const parts: string[] = [];
  if (args.tier === "TIER 1") {
    parts.push("CSV coverage prioritizer TIER 1 (zero direct-buyable links in committed CSV)");
  } else if (args.tier !== "UNKNOWN") {
    parts.push(`CSV coverage prioritizer ${args.tier}`);
  }
  if (args.product.page_classification === "SAFE_BUYER_PATH_SUPPRESSED_TRUST") {
    parts.push("product page proven; buyer path suppressed by trust gates");
  }
  if (args.product.page_classification === "NOINDEX_UNPROVEN") {
    parts.push(
      "whole_house_water wedge NOINDEX_UNPROVEN — not for public index promotion until launch proof",
    );
  }
  if (args.gscMatched && args.demandWeight !== "UNKNOWN") {
    parts.push("GSC external demand page signal matched");
  }
  if (parts.length === 0) {
    return "Read-only coverage gap surfaced from census + prioritizer signals";
  }
  return parts.join("; ");
}

function buildCurrentBlocker(product: AllProductCensusProductRowV1): string {
  if (product.public_trust_deny_reasons.length > 0) {
    return product.public_trust_deny_reasons.join("; ");
  }
  return product.current_page_state;
}

function compareOpportunities(
  a: { product: AllProductCensusProductRowV1; tier: CoveragePriorityTierV1; demandWeight: CoverageOpportunityDemandWeightV1 },
  b: { product: AllProductCensusProductRowV1; tier: CoveragePriorityTierV1; demandWeight: CoverageOpportunityDemandWeightV1 },
): number {
  const wedgeOrder = new Map(HOMEKEEP_MONETIZATION_WEDGE_CATALOG_ORDER.map((w, i) => [w, i]));
  const tierDelta = TIER_ORDER[a.tier] - TIER_ORDER[b.tier];
  if (tierDelta !== 0) return tierDelta;

  const wedgeDelta = (wedgeOrder.get(a.product.wedge as HomekeepMonetizationWedgeCatalog) ?? 99) -
    (wedgeOrder.get(b.product.wedge as HomekeepMonetizationWedgeCatalog) ?? 99);
  if (wedgeDelta !== 0) return wedgeDelta;

  const classDelta =
    (CLASSIFICATION_ORDER[a.product.page_classification] ?? 99) -
    (CLASSIFICATION_ORDER[b.product.page_classification] ?? 99);
  if (classDelta !== 0) return classDelta;

  const demandDelta = DEMAND_ORDER[a.demandWeight] - DEMAND_ORDER[b.demandWeight];
  if (demandDelta !== 0) return demandDelta;

  const scoreDelta = b.product.rescue_priority_score - a.product.rescue_priority_score;
  if (scoreDelta !== 0) return scoreDelta;

  return a.product.slug.localeCompare(b.product.slug);
}

export function buildNextCoverageOpportunitiesV1(args: {
  rootDir: string;
  now?: () => Date;
  gsc?: OwnerGscExternalDemandNeuron | null;
  internalSearchRuntimeOk?: boolean;
}): NextCoverageOpportunitiesSectionV1 {
  const now = args.now ?? (() => new Date());
  const internalSearchRuntimeOk = args.internalSearchRuntimeOk === true;
  const provenFacts: string[] = [
    "Next Coverage Opportunities v1 is read-only; mutation_authorized is false on every row.",
  ];
  const unknownFacts: string[] = [];

  try {
    const census = buildAllProductSafeBuyerPathCensusV1({ rootDir: args.rootDir, now: args.now });
    provenFacts.push(
      `All-product safe buyer path census loaded (${census.contract}); suppressed_trust=${census.classification_counts.SAFE_BUYER_PATH_SUPPRESSED_TRUST}.`,
    );

    let tierRows: FilterCoverageTierRowV1[];
    try {
      tierRows = buildCoveragePriorityTiersFromCsvV1(args.rootDir);
      provenFacts.push("Coverage priority tiers derived from committed CSV (no Supabase).");
    } catch (err) {
      tierRows = [];
      unknownFacts.push(
        `Coverage priority tiers unavailable: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    const tierByKey = new Map<string, CoveragePriorityTierV1>();
    for (const row of tierRows) {
      tierByKey.set(tierKey(row.wedge, row.filter_slug), row.tier);
    }

    const committedApModels = loadCommittedApModelSlugs(args.rootDir);
    const demandSignalAvailable = Boolean(
      args.gsc &&
        (args.gsc.top_pages_by_impressions !== "UNKNOWN" ||
          args.gsc.high_impression_low_click_opportunities !== "UNKNOWN"),
    );
    if (!demandSignalAvailable) {
      unknownFacts.push("GSC page-level demand unavailable; demand_weight defaults to UNKNOWN per row.");
    }
    if (!internalSearchRuntimeOk) {
      unknownFacts.push(
        "Internal search demand gaps runtime not OK; per-slug demand_weight not inferred from search backlog.",
      );
    }

    const ranked = census.products
      .map((product) => {
        const tier = tierByKey.get(tierKey(product.wedge, product.slug)) ?? "UNKNOWN";
        const gscMatch = gscImpressionsForRoute(product.public_route, args.gsc);
        let demandWeight: CoverageOpportunityDemandWeightV1 = "UNKNOWN";
        if (gscMatch.matched) {
          demandWeight = gscMatch.impressions >= 10 ? "HIGH" : "MEDIUM";
        }

        return { product, tier, demandWeight, gscMatched: gscMatch.matched };
      })
      .filter(({ product, tier }) => {
        if (!isOpportunityCandidate(product, tier)) return false;
        if (isExcludedApModelRoute(product.public_route, committedApModels)) return false;
        return true;
      })
      .sort(compareOpportunities)
      .slice(0, 10);

    const opportunities: CoverageOpportunityRowV1[] = ranked.map((row, index) => {
      const sourceSignals = [
        "all_product_safe_buyer_path_census_v1",
        row.tier !== "UNKNOWN" ? "coverage_priority_tiers_csv_v1" : null,
        row.gscMatched ? "gsc_external_demand" : null,
        internalSearchRuntimeOk ? "internal_search_demand_gaps_aggregate" : null,
      ].filter((v): v is string => typeof v === "string");

      const tierProven: CoverageOpportunityEvidenceLabelV1 =
        row.tier !== "UNKNOWN" ? "PROVEN" : "UNKNOWN";
      const demandProven: CoverageOpportunityEvidenceLabelV1 =
        row.demandWeight !== "UNKNOWN" ? "PROVEN" : "UNKNOWN";

      return {
        rank: index + 1,
        slug: row.product.slug,
        wedge: row.product.wedge,
        public_route: row.product.public_route,
        page_classification: row.product.page_classification,
        reason: buildReason({
          product: row.product,
          tier: row.tier,
          demandWeight: row.demandWeight,
          gscMatched: row.gscMatched,
        }),
        current_blocker: buildCurrentBlocker(row.product),
        recommended_next_safe_action: row.product.recommended_next_safe_action,
        owner_approval_required: row.product.owner_approval_required,
        mutation_authorized: false,
        coverage_priority_tier: row.tier,
        demand_weight: row.demandWeight,
        rescue_priority_score: row.product.rescue_priority_score,
        source_signals: sourceSignals,
        evidence_labels: {
          slug: "PROVEN",
          wedge: "PROVEN",
          public_route: "PROVEN",
          page_classification: "PROVEN",
          coverage_priority_tier: tierProven,
          demand_weight: demandProven,
          reason: "INFERRED",
          current_blocker: row.product.public_trust_deny_reasons.length > 0 ? "PROVEN" : "INFERRED",
          recommended_next_safe_action: "PROVEN",
        },
      };
    });

    if (opportunities.length === 0) {
      unknownFacts.push("No ranked coverage opportunities after census + tier filters.");
    } else {
      const tier1Count = opportunities.filter((o) => o.coverage_priority_tier === "TIER 1").length;
      provenFacts.push(
        `Ranked ${opportunities.length} read-only opportunity row(s); tier_1_in_top=${tier1Count}.`,
      );
    }

    const runtime_status: NextCoverageOpportunitiesSectionV1["runtime_status"] =
      opportunities.length > 0 ? "OK" : "ATTENTION";

    return {
      contract: "buckparts_next_coverage_opportunities_v1",
      read_only: true,
      data_mutation: false,
      mutation_authorized: false,
      runtime_status,
      max_opportunities: 10,
      opportunities,
      signal_summary: {
        census_contract: census.contract,
        census_generated_at: census.generated_at,
        coverage_tier_source: tierRows.length > 0 ? "csv" : "UNKNOWN",
        demand_signal_available: demandSignalAvailable,
        internal_search_runtime_ok: internalSearchRuntimeOk,
      },
      proven_facts: provenFacts,
      unknown_facts: unknownFacts,
    };
  } catch (err) {
    return {
      contract: "buckparts_next_coverage_opportunities_v1",
      read_only: true,
      data_mutation: false,
      mutation_authorized: false,
      runtime_status: "UNKNOWN",
      max_opportunities: 10,
      opportunities: [],
      signal_summary: {
        census_contract: "UNKNOWN",
        census_generated_at: now().toISOString(),
        coverage_tier_source: "UNKNOWN",
        demand_signal_available: false,
        internal_search_runtime_ok: internalSearchRuntimeOk,
      },
      proven_facts: provenFacts,
      unknown_facts: [
        ...unknownFacts,
        `Failed to build next coverage opportunities: ${err instanceof Error ? err.message : String(err)}`,
      ],
    };
  }
}
