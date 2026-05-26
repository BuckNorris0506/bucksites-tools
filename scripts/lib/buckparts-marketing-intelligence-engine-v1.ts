/**
 * Read-only BuckParts Marketing Intelligence Engine v1 — ranks marketing opportunities
 * from proven operating truth (GSC demand, buyer-path coverage, batch lane, aggregator).
 * No auto-publish, no CSV/Supabase mutation, no campaign runner.
 */

import path from "node:path";

import { HOMEKEEP_WEDGE_CATALOG, type HomekeepWedgeCatalog } from "@/lib/catalog/identity";

import {
  buildAirPurifierAgentResultsAggregatorV1Report,
  type AirPurifierAgentResultsAggregatorReportV1,
} from "./air-purifier-agent-results-aggregator-v1";
import {
  buildAirPurifierBatchProductionLaneV1Report,
  type AirPurifierBatchProductionLaneReportV1,
  type ApBatchCandidateV1,
  type ApCatalogIdentityGapV1,
} from "./air-purifier-batch-production-lane-v1";
import {
  DEMAND_TO_COVERAGE_NEXT_LANE_REPORT_NAME_V1,
  type DemandToCoverageNextLaneReportV1,
  type DemandToCoverageNextLaneWedgeRowV1,
} from "./demand-to-coverage-next-lane-v1";

export const BUCKPARTS_MARKETING_INTELLIGENCE_ENGINE_CONTRACT_V1 =
  "marketing_intelligence_engine_v1" as const;

export const BUCKPARTS_MARKETING_MOTTO_V1 = "The Wrong Part Prevention Department" as const;

export const BUCKPARTS_MARKETING_INTELLIGENCE_COMMAND_V1 =
  "npx tsx scripts/report-buckparts-marketing-intelligence-engine-v1.ts" as const;

export type MarketingSourceStatusV1 = "PROVEN" | "PARTIAL" | "UNKNOWN";

export type MarketingOpportunityClassV1 =
  | "gsc_demand_thin_coverage"
  | "catalog_identity_confusion"
  | "wrong_family_reject"
  | "no_safe_path_row"
  | "safe_cta_win"
  | "search_placeholder_rescue_queue"
  | "official_vs_compatible_ambiguity";

export type MarketingPublishabilityStatusV1 =
  | "READY_TO_DRAFT"
  | "NEEDS_PRODUCT_PROOF"
  | "NEEDS_COVERAGE"
  | "NEEDS_OWNER_TASTE_REVIEW"
  | "DO_NOT_PUBLISH";

export type MarketingWrongPartRiskV1 = "HIGH" | "MEDIUM" | "LOW";

export type MarketingOpportunityV1 = {
  opportunity_id: string;
  opportunity_class: MarketingOpportunityClassV1;
  wedge: HomekeepWedgeCatalog | "cross_wedge";
  source_truth_paths: string[];
  source_status: MarketingSourceStatusV1;
  customer_pain: string;
  wrong_part_risk: MarketingWrongPartRiskV1;
  business_reason: string;
  asset_recommendations: string[];
  sarcastic_hooks: string[];
  plain_english_explanation: string;
  trust_copy_angle: string;
  publishability_status: MarketingPublishabilityStatusV1;
  blocked_reasons: string[];
  suggested_internal_links: string[];
  rank_score: number;
  /** Stable evidence keys tying this row to repo truth (not joke-only). */
  evidence_keys: string[];
};

export type BuckpartsMarketingIntelligenceEngineV1 = {
  contract: typeof BUCKPARTS_MARKETING_INTELLIGENCE_ENGINE_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  motto: typeof BUCKPARTS_MARKETING_MOTTO_V1;
  generated_at: string;
  source_status: MarketingSourceStatusV1;
  source_reports: string[];
  opportunity_count: number;
  opportunities: MarketingOpportunityV1[];
  /** Top ranked opportunities for Command Center / owner dashboard (not a campaign queue). */
  selected_opportunities: MarketingOpportunityV1[];
  proven_facts: string[];
  unknown_facts: string[];
  notes: string[];
};

export type BuildBuckpartsMarketingIntelligenceEngineDepsV1 = {
  rootDir: string;
  now?: () => Date;
  demandToCoverageNextLane: DemandToCoverageNextLaneReportV1;
  apBatchLane?: AirPurifierBatchProductionLaneReportV1;
  apAggregator?: AirPurifierAgentResultsAggregatorReportV1;
  fileExists?: (absolutePath: string) => boolean;
  readTextFile?: (absolutePath: string) => string;
};

function slugifyId(parts: string[]): string {
  return parts
    .join("-")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

function filterPagePath(wedge: HomekeepWedgeCatalog, filterSlug: string): string | null {
  switch (wedge) {
    case HOMEKEEP_WEDGE_CATALOG.air_purifier:
      return `/air-purifier/filter/${filterSlug}`;
    case HOMEKEEP_WEDGE_CATALOG.refrigerator_water:
      return `/filter/${filterSlug}`;
    case HOMEKEEP_WEDGE_CATALOG.whole_house_water:
      return `/whole-house-water/filter/${filterSlug}`;
    default:
      return null;
  }
}

function wedgeMaturityBonus(launchState: DemandToCoverageNextLaneWedgeRowV1["launch_state"]): number {
  if (launchState === "LIVE") return 12;
  if (launchState === "NOINDEX_UNPROVEN") return 2;
  return 0;
}

function rankOpportunity(args: {
  demandSignal: number;
  wrongPartRisk: MarketingWrongPartRiskV1;
  safeCtaReadiness: number;
  wedgeMaturity: number;
  confusionPatternReuse: number;
  publishability: MarketingPublishabilityStatusV1;
}): number {
  const riskBonus =
    args.wrongPartRisk === "HIGH" ? 28 : args.wrongPartRisk === "MEDIUM" ? 16 : 6;
  const publishPenalty =
    args.publishability === "DO_NOT_PUBLISH"
      ? -80
      : args.publishability === "NEEDS_COVERAGE"
        ? -12
        : args.publishability === "NEEDS_PRODUCT_PROOF"
          ? -18
          : args.publishability === "NEEDS_OWNER_TASTE_REVIEW"
            ? -4
            : 8;
  const score =
    args.demandSignal * 1.2 +
    riskBonus +
    args.safeCtaReadiness +
    args.wedgeMaturity +
    args.confusionPatternReuse +
    publishPenalty;
  return Math.round(score * 10) / 10;
}

function publishabilityForClass(
  opportunityClass: MarketingOpportunityClassV1,
  sourceStatus: MarketingSourceStatusV1,
  opts?: { educationFraming?: boolean; hasLiveSafeCta?: boolean },
): MarketingPublishabilityStatusV1 {
  switch (opportunityClass) {
    case "safe_cta_win":
      if (sourceStatus === "PROVEN" && opts?.hasLiveSafeCta) return "READY_TO_DRAFT";
      if (sourceStatus === "PARTIAL") return "NEEDS_OWNER_TASTE_REVIEW";
      return "NEEDS_PRODUCT_PROOF";
    case "gsc_demand_thin_coverage":
      return "NEEDS_COVERAGE";
    case "search_placeholder_rescue_queue":
      return "NEEDS_PRODUCT_PROOF";
    case "official_vs_compatible_ambiguity":
      return "NEEDS_OWNER_TASTE_REVIEW";
    case "catalog_identity_confusion":
    case "wrong_family_reject":
      return opts?.educationFraming ? "NEEDS_OWNER_TASTE_REVIEW" : "DO_NOT_PUBLISH";
    case "no_safe_path_row":
      return opts?.educationFraming ? "NEEDS_OWNER_TASTE_REVIEW" : "DO_NOT_PUBLISH";
    default:
      return "DO_NOT_PUBLISH";
  }
}

function collectApCandidates(lane: AirPurifierBatchProductionLaneReportV1): ApBatchCandidateV1[] {
  const bySlug = new Map<string, ApBatchCandidateV1>();
  for (const pool of [
    lane.top_candidates,
    lane.direct_buy_candidates,
    lane.reference_link_candidates,
    lane.blocked_or_rejected,
  ]) {
    for (const c of pool) {
      if (!bySlug.has(c.filter_slug)) bySlug.set(c.filter_slug, c);
    }
  }
  return Array.from(bySlug.values());
}

function opportunityFromGscThinCoverage(
  row: DemandToCoverageNextLaneWedgeRowV1,
  demandReportPath: string,
): MarketingOpportunityV1 | null {
  const impressions = typeof row.impressions === "number" ? row.impressions : 0;
  const safeCtas = row.safe_cta_count;
  const blocked = typeof row.blocked_link_count === "number" ? row.blocked_link_count : 0;
  if (impressions < 5 && blocked < 3) return null;

  const thinCoverage =
    safeCtas === 0 ||
    (typeof safeCtas === "number" && safeCtas < 3 && impressions >= 10) ||
    blocked >= 5;
  if (!thinCoverage) return null;

  const source_truth_paths = [
    demandReportPath,
    row.wedge === HOMEKEEP_WEDGE_CATALOG.air_purifier
      ? "data/air-purifier/retailer_links.csv"
      : row.wedge === HOMEKEEP_WEDGE_CATALOG.refrigerator_water
        ? "data/retailer_links.csv"
        : row.wedge === HOMEKEEP_WEDGE_CATALOG.whole_house_water
          ? "data/whole-house-water/retailer_links.csv"
          : "scripts/lib/demand-to-coverage-next-lane-v1.ts",
  ];

  const evidence_keys = [
    `wedge:${row.wedge}`,
    `impressions:${String(row.impressions)}`,
    `safe_cta:${String(row.safe_cta_count)}`,
    `blocked:${String(row.blocked_link_count)}`,
  ];

  const publishability_status = publishabilityForClass("gsc_demand_thin_coverage", "PROVEN");
  const wrong_part_risk: MarketingWrongPartRiskV1 =
    safeCtas === 0 ? "HIGH" : blocked >= 5 ? "MEDIUM" : "LOW";

  return {
    opportunity_id: slugifyId(["gsc-thin", row.wedge]),
    opportunity_class: "gsc_demand_thin_coverage",
    wedge: row.wedge,
    source_truth_paths,
    source_status: "PROVEN",
    customer_pain: `Search demand exists for ${row.wedge.replaceAll("_", " ")} but buyer-path coverage is thin (${row.coverage_gap_summary}).`,
    wrong_part_risk,
    business_reason:
      "Marketing must not promise easy purchase where GSC demand meets blocked or search-placeholder retailer links.",
    asset_recommendations: [
      "Wedge explainer: why BuckParts maps demand to safe CTAs before humor",
      "Internal coverage snapshot post (draft only) tied to demand-to-coverage report",
    ],
    sarcastic_hooks: [
      `Google already sent ${String(row.impressions)} impressions to a wedge with ${String(row.safe_cta_count)} safe CTAs — the Wrong Part Prevention Department is taking notes.`,
      `We do not mock shoppers; we mock replacement-part chaos when ${row.blocked_link_count} links are still blocked/search placeholders.`,
    ],
    plain_english_explanation: row.coverage_gap_summary,
    trust_copy_angle:
      "Show the gap honestly: demand without safe buy path is a wrong-part trap, not a conversion funnel.",
    publishability_status,
    blocked_reasons:
      publishability_status === "NEEDS_COVERAGE"
        ? ["Buyer-path coverage must improve before outward marketing claims purchase confidence."]
        : [],
    suggested_internal_links: row.top_pages.slice(0, 3),
    rank_score: 0,
    evidence_keys,
  };
}

function opportunityFromCatalogGap(
  gap: ApCatalogIdentityGapV1,
  lanePath: string,
): MarketingOpportunityV1 {
  const publishability_status = publishabilityForClass("catalog_identity_confusion", "PROVEN", {
    educationFraming: true,
  });

  return {
    opportunity_id: slugifyId(["catalog-gap", gap.gap_id]),
    opportunity_class: "catalog_identity_confusion",
    wedge: HOMEKEEP_WEDGE_CATALOG.air_purifier,
    source_truth_paths: [lanePath, "data/air-purifier/filters.csv"],
    source_status: "PROVEN",
    customer_pain: gap.issue,
    wrong_part_risk: "HIGH",
    business_reason:
      "Catalog identity confusion causes confident wrong purchases — educate before any product CTA humor.",
    asset_recommendations: [
      "Caution/education brief: F4MAX vs PART411 naming (draft only)",
      "FAQ-style internal doc explaining why aliases are blocked",
    ],
    sarcastic_hooks: [
      `The internet calls it ${gap.demand_signal}; our catalog calls it a meeting — ${gap.gap_id}.`,
      "Wrong Part Prevention Department motto applies: mock the SKU soup, not the shopper.",
    ],
    plain_english_explanation: `${gap.safe_action} (${gap.gap_type})`,
    trust_copy_angle:
      "Lead with identity clarity and explicit non-alias policy — never imply interchangeable filters without token proof.",
    publishability_status,
    blocked_reasons: [
      "Not READY_TO_DRAFT: catalog gap requires owner-approved identity fix or caution-only education framing.",
    ],
    suggested_internal_links: gap.catalog_slug
      ? [`/air-purifier/filter/${gap.catalog_slug}`]
      : [],
    rank_score: 0,
    evidence_keys: [`gap:${gap.gap_id}`, `type:${gap.gap_type}`],
  };
}

function opportunityFromCandidate(
  candidate: ApBatchCandidateV1,
  opportunityClass: MarketingOpportunityClassV1,
  lanePath: string,
): MarketingOpportunityV1 {
  const page = filterPagePath(HOMEKEEP_WEDGE_CATALOG.air_purifier, candidate.filter_slug);
  const educationFraming =
    opportunityClass === "catalog_identity_confusion" ||
    opportunityClass === "wrong_family_reject" ||
    opportunityClass === "no_safe_path_row";

  const source_status: MarketingSourceStatusV1 = "PROVEN";
  const hasLiveSafeCta = candidate.state === "existing_direct_buyable";

  const publishability_status = publishabilityForClass(opportunityClass, source_status, {
    educationFraming,
    hasLiveSafeCta,
  });

  const wrong_part_risk: MarketingWrongPartRiskV1 =
    opportunityClass === "wrong_family_reject"
      ? "HIGH"
      : opportunityClass === "no_safe_path_row"
        ? "HIGH"
        : opportunityClass === "search_placeholder_rescue_queue"
          ? "MEDIUM"
          : opportunityClass === "safe_cta_win"
            ? "LOW"
            : "MEDIUM";

  const sarcasticByClass: Record<MarketingOpportunityClassV1, string[]> = {
    wrong_family_reject: [
      `${candidate.filter_slug}: the listing wore a cousin's part number — Wrong Part Prevention Department intervenes.`,
      `OEM token proof failed on ${candidate.oem_part_number}; we mock the mismatch, not the buyer.`,
    ],
    no_safe_path_row: [
      `${candidate.filter_slug} has no safe /go yet — chaos wins if we joke before proof.`,
    ],
    search_placeholder_rescue_queue: [
      `${candidate.filter_slug} still points at a manufacturer search URL — discovery is not a buy button.`,
    ],
    safe_cta_win: [
      `${candidate.filter_slug} earned a direct_buyable safe CTA — rare calm in replacement-part weather.`,
    ],
    catalog_identity_confusion: [
      `${candidate.filter_slug}: catalog identity gap — educate before anyone clicks confidently wrong.`,
    ],
    official_vs_compatible_ambiguity: [
      `${candidate.filter_slug}: OEM vs compatible policy fork — owner taste required before snark ships.`,
    ],
    gsc_demand_thin_coverage: [],
  };

  const assetByClass: Record<MarketingOpportunityClassV1, string[]> = {
    wrong_family_reject: [
      "Education post: how wrong-family Amazon rows get rejected (draft)",
      "Checklist graphic: exact token on PDP before CTA",
    ],
    no_safe_path_row: [
      "Transparency brief: why some slugs stay reference-only",
    ],
    search_placeholder_rescue_queue: [
      "Rescue queue explainer tied to batch lane state",
    ],
    safe_cta_win: [
      "Confidence vignette: what a proven safe CTA means on BuckParts",
      "Short trust module for filter page hero (owner taste review)",
    ],
    catalog_identity_confusion: [
      "Catalog caution brief — not a product launch post",
    ],
    official_vs_compatible_ambiguity: [
      "OEM vs compatible decision tree (owner review)",
    ],
    gsc_demand_thin_coverage: [],
  };

  return {
    opportunity_id: slugifyId([opportunityClass, candidate.filter_slug]),
    opportunity_class: opportunityClass,
    wedge: HOMEKEEP_WEDGE_CATALOG.air_purifier,
    source_truth_paths: [lanePath, "data/air-purifier/retailer_links.csv"],
    source_status,
    customer_pain: candidate.rationale,
    wrong_part_risk,
    business_reason: `Batch lane state=${candidate.state}; pattern=${candidate.pattern}; gate=${candidate.gate_failure ?? "none"}.`,
    asset_recommendations: assetByClass[opportunityClass],
    sarcastic_hooks: sarcasticByClass[opportunityClass],
    plain_english_explanation: candidate.proof_required,
    trust_copy_angle:
      opportunityClass === "safe_cta_win"
        ? "Celebrate verified safe purchase path — cite browser truth and exact token proof."
        : "Lead with prevention: explain why BuckParts withheld or rejected the risky path.",
    publishability_status,
    blocked_reasons:
      publishability_status === "DO_NOT_PUBLISH"
        ? [`State ${candidate.state} — outward publish blocked until product proof or caution-only education approved.`]
        : publishability_status === "NEEDS_OWNER_TASTE_REVIEW"
          ? ["Sarcasm/tone requires owner taste review even when education framing is allowed."]
          : publishability_status === "NEEDS_PRODUCT_PROOF"
            ? [candidate.proof_required]
            : [],
    suggested_internal_links: page ? [page] : [],
    rank_score: 0,
    evidence_keys: [`slug:${candidate.filter_slug}`, `state:${candidate.state}`, `pattern:${candidate.pattern}`],
  };
}

function mapCandidateToClass(
  candidate: ApBatchCandidateV1,
): MarketingOpportunityClassV1 | null {
  switch (candidate.state) {
    case "wrong_family_reject":
      return "wrong_family_reject";
    case "no_safe_path_yet":
      return "no_safe_path_row";
    case "search_placeholder_rescue_needed":
      return "search_placeholder_rescue_queue";
    case "existing_direct_buyable":
      return "safe_cta_win";
    case "catalog_identity_gap":
      return "catalog_identity_confusion";
    case "owner_review":
      if (
        candidate.pattern === "amazon_secondary_verification" ||
        candidate.rationale.includes("Amazon secondary") ||
        candidate.rationale.includes("compatible")
      ) {
        return "official_vs_compatible_ambiguity";
      }
      return "official_vs_compatible_ambiguity";
    default:
      return null;
  }
}

function opportunityFromAggregatorNoSafePath(
  slug: string,
  sourceFile: string,
  aggregatorPath: string,
): MarketingOpportunityV1 {
  const publishability_status = publishabilityForClass("no_safe_path_row", "PROVEN", {
    educationFraming: true,
  });

  return {
    opportunity_id: slugifyId(["no-safe-path", slug]),
    opportunity_class: "no_safe_path_row",
    wedge: HOMEKEEP_WEDGE_CATALOG.air_purifier,
    source_truth_paths: [aggregatorPath, sourceFile],
    source_status: "PROVEN",
    customer_pain: `Agent evidence marked NO_SAFE_PATH for ${slug} — no defensible buyer CTA.`,
    wrong_part_risk: "HIGH",
    business_reason: "Aggregator no_safe_path group — marketing cannot invent purchase confidence.",
    asset_recommendations: ["Internal status brief: why slug remains blocked (draft only)"],
    sarcastic_hooks: [
      `${slug}: we will not hand you a buy button cosplaying as certainty.`,
    ],
    plain_english_explanation: `Review group no_safe_path from ${sourceFile}`,
    trust_copy_angle: "Explain withholding CTA as protection, not absence of care.",
    publishability_status,
    blocked_reasons: ["DO_NOT_PUBLISH without education framing and owner taste review."],
    suggested_internal_links: [`/air-purifier/filter/${slug}`],
    rank_score: 0,
    evidence_keys: [`slug:${slug}`, "review_group:no_safe_path"],
  };
}

function finalizeRankings(
  opportunities: MarketingOpportunityV1[],
  demand: DemandToCoverageNextLaneReportV1,
  apLane: AirPurifierBatchProductionLaneReportV1 | undefined,
): MarketingOpportunityV1[] {
  const wedgeRowByWedge = new Map(demand.wedge_rows.map((r) => [r.wedge, r]));

  return opportunities
    .map((o) => {
      const wedgeRow =
        o.wedge !== "cross_wedge" ? wedgeRowByWedge.get(o.wedge as HomekeepWedgeCatalog) : undefined;
      const demandSignal =
        wedgeRow && typeof wedgeRow.impressions === "number" ? wedgeRow.impressions : 0;
      const safeCtaReadiness =
        wedgeRow && typeof wedgeRow.safe_cta_count === "number" ? wedgeRow.safe_cta_count * 4 : 0;
      const wedgeMaturity = wedgeRow ? wedgeMaturityBonus(wedgeRow.launch_state) : 0;
      const confusionPatternReuse =
        o.opportunity_class === "catalog_identity_confusion" ||
        o.opportunity_class === "wrong_family_reject"
          ? 14
          : o.opportunity_class === "official_vs_compatible_ambiguity"
            ? 10
            : 4;

      const candidateImpressions =
        o.evidence_keys
          .find((k) => k.startsWith("slug:"))
          ?.replace("slug:", "") ?? null;
      const apBoost =
        candidateImpressions && apLane
          ? (collectApCandidates(apLane).find((c) => c.filter_slug === candidateImpressions)
              ?.gsc_impressions ?? 0) * 8
          : 0;

      return {
        ...o,
        rank_score: rankOpportunity({
          demandSignal: demandSignal + apBoost,
          wrongPartRisk: o.wrong_part_risk,
          safeCtaReadiness,
          wedgeMaturity,
          confusionPatternReuse,
          publishability: o.publishability_status,
        }),
      };
    })
    .sort((a, b) => b.rank_score - a.rank_score);
}

export function buildBuckpartsMarketingIntelligenceEngineUnknownV1(args: {
  generated_at: string;
  reason?: string;
}): BuckpartsMarketingIntelligenceEngineV1 {
  return {
    contract: BUCKPARTS_MARKETING_INTELLIGENCE_ENGINE_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    motto: BUCKPARTS_MARKETING_MOTTO_V1,
    generated_at: args.generated_at,
    source_status: "UNKNOWN",
    source_reports: [],
    opportunity_count: 0,
    opportunities: [],
    selected_opportunities: [],
    proven_facts: [BUCKPARTS_MARKETING_MOTTO_V1],
    unknown_facts: [args.reason ?? "marketing_intelligence_engine_v1 build failed"],
    notes: [args.reason ?? "UNKNOWN"],
  };
}

export async function buildBuckpartsMarketingIntelligenceEngineV1Report(
  deps: BuildBuckpartsMarketingIntelligenceEngineDepsV1,
): Promise<BuckpartsMarketingIntelligenceEngineV1> {
  const now = deps.now ?? (() => new Date());
  const demand = deps.demandToCoverageNextLane;
  const demandPath = `scripts/lib/demand-to-coverage-next-lane-v1.ts (${DEMAND_TO_COVERAGE_NEXT_LANE_REPORT_NAME_V1})`;
  const lanePath = "scripts/lib/air-purifier-batch-production-lane-v1.ts";
  const aggregatorPath = "scripts/lib/air-purifier-agent-results-aggregator-v1.ts";

  const apLane =
    deps.apBatchLane ??
    (await buildAirPurifierBatchProductionLaneV1Report({ rootDir: deps.rootDir }));
  const aggregator =
    deps.apAggregator ??
    buildAirPurifierAgentResultsAggregatorV1Report({ rootDir: deps.rootDir });

  const proven_facts: string[] = [
    `PROVEN: ${BUCKPARTS_MARKETING_MOTTO_V1} — BuckParts marketing intelligence is read-only.`,
    `PROVEN: read_only=true data_mutation=false — no auto-publish or campaign runner.`,
  ];
  const unknown_facts: string[] = [];
  const notes: string[] = [];
  const source_reports = [demandPath, lanePath, aggregatorPath];

  let source_status: MarketingSourceStatusV1 = "UNKNOWN";
  if (demand.source_status === "PROVEN" && apLane.source_status === "PROVEN") {
    source_status = "PROVEN";
  } else if (demand.source_status !== "UNKNOWN" || apLane.source_status !== "UNKNOWN") {
    source_status = "PARTIAL";
  }

  if (demand.source_status === "UNKNOWN") {
    unknown_facts.push("GSC demand join unavailable — gsc_demand_thin_coverage opportunities may be missing.");
  }
  if (apLane.source_status === "UNKNOWN") {
    unknown_facts.push("AP batch lane unavailable — slug-level opportunities may be missing.");
  }

  const opportunities: MarketingOpportunityV1[] = [];

  for (const row of demand.wedge_rows) {
    const opp = opportunityFromGscThinCoverage(row, demandPath);
    if (opp) opportunities.push(opp);
  }

  for (const gap of apLane.catalog_identity_gaps) {
    opportunities.push(opportunityFromCatalogGap(gap, lanePath));
  }

  for (const candidate of collectApCandidates(apLane)) {
    const cls = mapCandidateToClass(candidate);
    if (!cls) continue;
    if (opportunities.some((o) => o.opportunity_id === slugifyId([cls, candidate.filter_slug]))) {
      continue;
    }
    opportunities.push(opportunityFromCandidate(candidate, cls, lanePath));
  }

  for (const row of aggregator.review_groups.no_safe_path) {
    const noSafeId = slugifyId(["no-safe-path", row.slug]);
    if (opportunities.some((o) => o.opportunity_id === noSafeId)) continue;
    opportunities.push(
      opportunityFromAggregatorNoSafePath(row.slug, row.source_file, aggregatorPath),
    );
  }

  for (const row of aggregator.review_groups.owner_review_required) {
    if (row.wrong_family_tokens_seen.length > 0) {
      if (!opportunities.some((o) => o.opportunity_id === slugifyId(["wrong-family", row.slug]))) {
        opportunities.push({
          ...opportunityFromCandidate(
            {
              rank: 0,
              filter_slug: row.slug,
              brand_slug: "",
              oem_part_number: row.exact_tokens_seen.join(",") || "UNKNOWN",
              state: "wrong_family_reject",
              priority_score: 0,
              gsc_impressions: 0,
              gsc_queries: [],
              compat_model_count: 0,
              primary_retailer_key: null,
              primary_url: row.final_url,
              gate_failure: null,
              browser_truth_classification: row.browser_truth_classification,
              pattern: "amazon_secondary_verification",
              rationale: row.review_reasons.join("; ") || "wrong_family_tokens in aggregator",
              proof_required: "Exact OEM token on PDP before promotion",
              allowed_future_mutations: [],
              reject_rules: ["Do not weaken buy gates"],
            },
            "wrong_family_reject",
            aggregatorPath,
          ),
          opportunity_id: slugifyId(["wrong-family", row.slug]),
          source_truth_paths: [aggregatorPath, row.source_file],
          evidence_keys: [`slug:${row.slug}`, "aggregator:wrong_family"],
        });
      }
    }
  }

  const ranked = finalizeRankings(opportunities, demand, apLane);
  const selected_opportunities = ranked.slice(0, 10);

  proven_facts.push(
    `PROVEN: ${ranked.length} marketing opportunities synthesized from demand, AP lane, and aggregator.`,
  );
  proven_facts.push(
    `PROVEN: ${ranked.filter((o) => o.publishability_status === "READY_TO_DRAFT").length} READY_TO_DRAFT; ${ranked.filter((o) => o.publishability_status === "DO_NOT_PUBLISH").length} DO_NOT_PUBLISH.`,
  );

  if (ranked.length === 0) {
    unknown_facts.push("No marketing opportunities met evidence thresholds in this snapshot.");
  }

  notes.push("No auto-publish, no scheduling, no campaign runner — asset briefs only.");
  notes.push(`Demand recommendation: ${demand.recommended_wedge} (${demand.recommendation_status}).`);

  return {
    contract: BUCKPARTS_MARKETING_INTELLIGENCE_ENGINE_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    motto: BUCKPARTS_MARKETING_MOTTO_V1,
    generated_at: now().toISOString(),
    source_status,
    source_reports,
    opportunity_count: ranked.length,
    opportunities: ranked,
    selected_opportunities,
    proven_facts,
    unknown_facts,
    notes,
  };
}
