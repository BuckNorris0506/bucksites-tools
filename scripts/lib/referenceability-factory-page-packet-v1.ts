/**
 * Page packet builder for buckparts_referenceability_factory_v1 Slice 1.
 */

import type { AllProductCensusProductRowV1 } from "./all-product-safe-buyer-path-census-v1";
import {
  detectReferenceabilityGapsV1,
  filterGapsForEligibilityV1,
  gapFindingToRecommendationV1,
  gapFindingToWorkItemV1,
  type ReferenceabilityPageContextV1,
  type ReferenceabilityRecommendationV1,
  type ReferenceabilityWorkItemV1,
} from "./referenceability-factory-gap-detectors-v1";

export const REFERENCEABILITY_PAGE_PACKET_CONTRACT_V1 = "referenceability_page_packet_v1" as const;

export type ReferenceabilityPageEligibilityV1 =
  | "ELIGIBLE_SAFE_PROVEN"
  | "SKIPPED_NOT_SAFE_PROVEN"
  | "SKIPPED_MARKETING_HIGH_RISK"
  | "SKIPPED_DO_NOT_PUBLISH"
  | "SKIPPED_OUT_OF_SCOPE";

export type ReferenceabilityPagePacketV1 = {
  contract: typeof REFERENCEABILITY_PAGE_PACKET_CONTRACT_V1;
  wedge: AllProductCensusProductRowV1["wedge"];
  slug: string;
  public_route: string;
  eligibility: ReferenceabilityPageEligibilityV1;
  eligibility_block_reasons: string[];
  strengths: string[];
  weaknesses: string[];
  recommendations: ReferenceabilityRecommendationV1[];
  work_items: ReferenceabilityWorkItemV1[];
  proven_facts: string[];
  inferred_facts: string[];
  unknown_facts: string[];
};

function classifyEligibilityV1(args: {
  row: AllProductCensusProductRowV1;
  context: ReferenceabilityPageContextV1;
  inScope: boolean;
}): { eligibility: ReferenceabilityPageEligibilityV1; block_reasons: string[] } {
  const { row, context, inScope } = args;
  if (!inScope) {
    return { eligibility: "SKIPPED_OUT_OF_SCOPE", block_reasons: ["wedge outside v1 scope"] };
  }
  if (row.page_classification !== "SAFE_BUYER_PATH_PROVEN") {
    return {
      eligibility: "SKIPPED_NOT_SAFE_PROVEN",
      block_reasons: [`page_classification=${row.page_classification}`],
    };
  }
  if (context.marketing_risk?.wrong_part_risk === "HIGH") {
    return {
      eligibility: "SKIPPED_MARKETING_HIGH_RISK",
      block_reasons: ["marketing wrong_part_risk=HIGH"],
    };
  }
  if (context.marketing_risk?.publishability_status === "DO_NOT_PUBLISH") {
    return {
      eligibility: "SKIPPED_DO_NOT_PUBLISH",
      block_reasons: ["marketing publishability_status=DO_NOT_PUBLISH"],
    };
  }
  return { eligibility: "ELIGIBLE_SAFE_PROVEN", block_reasons: [] };
}

function deriveStrengthsV1(
  row: AllProductCensusProductRowV1,
  context: ReferenceabilityPageContextV1,
): string[] {
  const strengths: string[] = [];
  if (row.page_classification === "SAFE_BUYER_PATH_PROVEN") {
    strengths.push("SAFE_BUYER_PATH_PROVEN census classification");
  }
  if (row.evidence_files.length > 0) {
    strengths.push(`repo evidence files present (${row.evidence_files.length})`);
  }
  if (row.retailer_row_state === "direct_buyable") {
    strengths.push("retailer_links.csv direct_buyable state");
  }
  if (row.indexable_in_repo_policy === true) {
    strengths.push("indexable under repo policy");
  }
  if (context.compat_model_count > 1) {
    strengths.push(`compat mappings cover ${context.compat_model_count} models`);
  }
  if (context.has_product_json_ld_on_template) {
    strengths.push("filter PDP template wires Product JSON-LD");
  }
  return strengths;
}

function deriveWeaknessesV1(
  row: AllProductCensusProductRowV1,
  context: ReferenceabilityPageContextV1,
): string[] {
  const weaknesses: string[] = [];
  if (row.evidence_files.length === 0) {
    weaknesses.push("no census-linked evidence files");
  }
  if (context.compat_model_count <= 1) {
    weaknesses.push("thin compat graph for comparison");
  }
  if (!context.has_product_json_ld_on_template && context.filter_row_present) {
    weaknesses.push("no Product JSON-LD on filter template");
  }
  if (context.page_template_banned_phrases.length > 0) {
    weaknesses.push(`template contains banned phrases: ${context.page_template_banned_phrases.join(", ")}`);
  }
  if (
    !context.browser_truth_checked_at ||
    context.browser_truth_classification !== "direct_buyable"
  ) {
    weaknesses.push("browser-truth proof missing or not direct_buyable");
  }
  if (row.wedge === "air_purifier" && context.ap_runtime_gate_state === "BLOCKED") {
    weaknesses.push("AP repo-runtime convergence gate BLOCKED — live-template work withheld");
  }
  return weaknesses;
}

export function buildReferenceabilityPagePacketV1(args: {
  row: AllProductCensusProductRowV1;
  context: ReferenceabilityPageContextV1;
  inScope: boolean;
  now: Date;
}): ReferenceabilityPagePacketV1 {
  const { row, context, inScope, now } = args;
  const { eligibility, block_reasons } = classifyEligibilityV1({ row, context, inScope });

  const proven_facts: string[] = [
    `PROVEN: page_classification=${row.page_classification}`,
    `PROVEN: public_route=${row.public_route}`,
    `PROVEN: retailer_row_state=${row.retailer_row_state}`,
  ];
  if (row.evidence_files.length > 0) {
    proven_facts.push(`PROVEN: evidence_files=${row.evidence_files.join("|")}`);
  }

  const inferred_facts: string[] = [];
  if (context.filter_pdp_trust_status === "READY") {
    inferred_facts.push(
      "INFERRED: filter PDP aligns with universal trust contract READY baseline (docs/BuckParts-UNIVERSAL-PAGE-TRUST-CONTRACT.md).",
    );
  }

  const unknown_facts: string[] = [];
  if (!context.filter_row_present) {
    unknown_facts.push(`UNKNOWN: filters.csv row missing for slug=${row.slug}`);
  }
  if (context.marketing_risk === null) {
    unknown_facts.push("UNKNOWN: marketing_intelligence slug-level risk not loaded");
  }

  const rawGaps = detectReferenceabilityGapsV1({ row, context, now });
  const eligibleGaps = filterGapsForEligibilityV1({ findings: rawGaps, row, context });

  const recommendations: ReferenceabilityRecommendationV1[] = [];
  const work_items: ReferenceabilityWorkItemV1[] = [];

  if (eligibility === "ELIGIBLE_SAFE_PROVEN") {
    for (const gap of eligibleGaps) {
      const rec = gapFindingToRecommendationV1(gap, row);
      const work = gapFindingToWorkItemV1(gap, row);
      if (rec) recommendations.push(rec);
      if (work) work_items.push(work);
    }
  }

  return {
    contract: REFERENCEABILITY_PAGE_PACKET_CONTRACT_V1,
    wedge: row.wedge,
    slug: row.slug,
    public_route: row.public_route,
    eligibility,
    eligibility_block_reasons: block_reasons,
    strengths: deriveStrengthsV1(row, context),
    weaknesses: deriveWeaknessesV1(row, context),
    recommendations,
    work_items,
    proven_facts,
    inferred_facts,
    unknown_facts,
  };
}
