/**
 * Read-only gap detectors for buckparts_referenceability_factory_v1 Slice 1.
 * Derives improvement opportunities from repo truth only — no content invention.
 */

import type { AllProductCensusProductRowV1 } from "./all-product-safe-buyer-path-census-v1";
import type { MarketingPublishabilityStatusV1, MarketingWrongPartRiskV1 } from "./buckparts-marketing-intelligence-engine-v1";
import type { RepoRuntimeConvergenceGateStateV1 } from "./repo-runtime-convergence-gate-v1";

export const REFERENCEABILITY_IMPROVEMENT_CLASSES_V1 = [
  "homeowner_comprehension",
  "evidence_presentation",
  "comparison_clarity",
  "structured_data",
  "human_readability",
  "internal_linking",
  "update_freshness",
] as const;

export type ReferenceabilityImprovementClassV1 =
  (typeof REFERENCEABILITY_IMPROVEMENT_CLASSES_V1)[number];

export const REFERENCEABILITY_PERMITTED_ACTION_CLASSES_V1 = [
  "READ_ONLY_AUDIT",
  "OWNER_COPY_REVIEW",
  "PAGE_TEMPLATE_WIRE",
  "INTERNAL_LINK_PLAN",
  "STRUCTURED_DATA_WIRE",
  "BROWSER_REPROOF",
] as const;

export type ReferenceabilityPermittedActionClassV1 =
  (typeof REFERENCEABILITY_PERMITTED_ACTION_CLASSES_V1)[number];

export type ReferenceabilityTruthRiskV1 = "LOW" | "MEDIUM" | "HIGH";

export type ReferenceabilityRecommendationV1 = {
  recommendation_id: string;
  improvement_class: ReferenceabilityImprovementClassV1;
  summary: string;
  evidence: string[];
  source: string;
  expected_customer_value: string;
  truth_risk: ReferenceabilityTruthRiskV1;
  validation_path: string;
  permitted_action_class: ReferenceabilityPermittedActionClassV1;
  priority_score: number;
  content_invention_required: false;
};

export type ReferenceabilityWorkItemV1 = ReferenceabilityRecommendationV1 & {
  work_item_id: string;
  wedge: AllProductCensusProductRowV1["wedge"];
  slug: string;
  public_route: string;
  read_only: true;
  data_mutation: false;
  mutation_authorized: false;
  artifact_write_authorized: false;
};

export type ReferenceabilityPageContextV1 = {
  compat_model_count: number;
  filter_row_present: boolean;
  oem_part_number: string | null;
  browser_truth_checked_at: string | null;
  browser_truth_classification: string | null;
  page_template_rel_path: string;
  page_template_banned_phrases: string[];
  trust_contract_rel_path: string;
  filter_pdp_trust_status: "READY" | "UNKNOWN";
  has_product_json_ld_on_template: boolean;
  marketing_risk: {
    wrong_part_risk: MarketingWrongPartRiskV1;
    publishability_status: MarketingPublishabilityStatusV1;
  } | null;
  ap_runtime_gate_state: RepoRuntimeConvergenceGateStateV1 | null;
};

export type ReferenceabilityGapFindingV1 = Omit<
  ReferenceabilityRecommendationV1,
  "recommendation_id"
>;

const TRUST_CONTRACT_REL_V1 = "docs/BuckParts-UNIVERSAL-PAGE-TRUST-CONTRACT.md" as const;

const BANNED_PHRASES_V1 = ["store links", "buying links"] as const;

const FRESHNESS_STALE_DAYS_V1 = 90;

const PAGE_TEMPLATE_BY_WEDGE: Record<
  AllProductCensusProductRowV1["wedge"],
  { rel: string; has_product_json_ld: boolean }
> = {
  refrigerator_water: {
    rel: "src/app/filter/[slug]/page.tsx",
    has_product_json_ld: true,
  },
  air_purifier: {
    rel: "src/app/air-purifier/filter/[slug]/page.tsx",
    has_product_json_ld: false,
  },
  whole_house_water: { rel: "", has_product_json_ld: false },
  vacuum: { rel: "", has_product_json_ld: false },
  humidifier: { rel: "", has_product_json_ld: false },
  appliance_air: { rel: "", has_product_json_ld: false },
};

function isImprovementClass(value: unknown): value is ReferenceabilityImprovementClassV1 {
  return (
    typeof value === "string" &&
    (REFERENCEABILITY_IMPROVEMENT_CLASSES_V1 as readonly string[]).includes(value)
  );
}

function isPermittedActionClass(value: unknown): value is ReferenceabilityPermittedActionClassV1 {
  return (
    typeof value === "string" &&
    (REFERENCEABILITY_PERMITTED_ACTION_CLASSES_V1 as readonly string[]).includes(value)
  );
}

function isTruthRisk(value: unknown): value is ReferenceabilityTruthRiskV1 {
  return value === "LOW" || value === "MEDIUM" || value === "HIGH";
}

export function scanPageTemplateBannedPhrasesV1(templateSource: string): string[] {
  const lower = templateSource.toLowerCase();
  return BANNED_PHRASES_V1.filter((phrase) => lower.includes(phrase));
}

export function buildReferenceabilityPageContextV1(args: {
  wedge: AllProductCensusProductRowV1["wedge"];
  slug: string;
  compat_model_count: number;
  filter_row_present: boolean;
  oem_part_number: string | null;
  browser_truth_checked_at: string | null;
  browser_truth_classification: string | null;
  page_template_source: string | null;
  marketing_risk: ReferenceabilityPageContextV1["marketing_risk"];
  ap_runtime_gate_state: RepoRuntimeConvergenceGateStateV1 | null;
}): ReferenceabilityPageContextV1 {
  const templateMeta = PAGE_TEMPLATE_BY_WEDGE[args.wedge];
  const page_template_rel_path = templateMeta.rel;
  const page_template_banned_phrases =
    args.page_template_source && page_template_rel_path
      ? scanPageTemplateBannedPhrasesV1(args.page_template_source)
      : [];

  return {
    compat_model_count: args.compat_model_count,
    filter_row_present: args.filter_row_present,
    oem_part_number: args.oem_part_number,
    browser_truth_checked_at: args.browser_truth_checked_at,
    browser_truth_classification: args.browser_truth_classification,
    page_template_rel_path,
    page_template_banned_phrases,
    trust_contract_rel_path: TRUST_CONTRACT_REL_V1,
    filter_pdp_trust_status: args.filter_row_present ? "READY" : "UNKNOWN",
    has_product_json_ld_on_template: templateMeta.has_product_json_ld,
    marketing_risk: args.marketing_risk,
    ap_runtime_gate_state: args.ap_runtime_gate_state,
  };
}

function daysSinceIso(iso: string | null, now: Date): number | null {
  if (!iso) return null;
  const parsed = Date.parse(iso);
  if (Number.isNaN(parsed)) return null;
  return Math.floor((now.getTime() - parsed) / (24 * 60 * 60 * 1000));
}

function basePriority(improvementClass: ReferenceabilityImprovementClassV1): number {
  const weights: Record<ReferenceabilityImprovementClassV1, number> = {
    evidence_presentation: 85,
    homeowner_comprehension: 80,
    comparison_clarity: 75,
    human_readability: 70,
    internal_linking: 65,
    structured_data: 60,
    update_freshness: 55,
  };
  return weights[improvementClass];
}

function recommendationId(
  wedge: string,
  slug: string,
  improvementClass: ReferenceabilityImprovementClassV1,
): string {
  return `ref-factory-v1:${wedge}:${slug}:${improvementClass}`;
}

function workItemId(
  wedge: string,
  slug: string,
  improvementClass: ReferenceabilityImprovementClassV1,
): string {
  return `ref-work-v1:${wedge}:${slug}:${improvementClass}`;
}

export function validateReferenceabilityRecommendationFiveFieldSchemaV1(
  rec: ReferenceabilityRecommendationV1,
): boolean {
  if (!Array.isArray(rec.evidence) || rec.evidence.length === 0) return false;
  if (!rec.evidence.every((e) => typeof e === "string" && e.trim().length > 0)) return false;
  if (typeof rec.source !== "string" || rec.source.trim().length === 0) return false;
  if (typeof rec.expected_customer_value !== "string" || rec.expected_customer_value.trim().length === 0) {
    return false;
  }
  if (!isTruthRisk(rec.truth_risk)) return false;
  if (typeof rec.validation_path !== "string" || rec.validation_path.trim().length === 0) {
    return false;
  }
  if (!isImprovementClass(rec.improvement_class)) return false;
  if (!isPermittedActionClass(rec.permitted_action_class)) return false;
  if (rec.content_invention_required !== false) return false;
  return true;
}

export function isLiveTemplateRecommendationBlockedV1(args: {
  wedge: AllProductCensusProductRowV1["wedge"];
  permitted_action_class: ReferenceabilityPermittedActionClassV1;
  ap_runtime_gate_state: RepoRuntimeConvergenceGateStateV1 | null;
}): boolean {
  if (args.wedge !== "air_purifier") return false;
  if (args.permitted_action_class !== "PAGE_TEMPLATE_WIRE") return false;
  return args.ap_runtime_gate_state === "BLOCKED";
}

export function detectReferenceabilityGapsV1(args: {
  row: AllProductCensusProductRowV1;
  context: ReferenceabilityPageContextV1;
  now: Date;
}): ReferenceabilityGapFindingV1[] {
  const { row, context, now } = args;
  const findings: ReferenceabilityGapFindingV1[] = [];

  if (row.evidence_files.length === 0) {
    findings.push({
      improvement_class: "evidence_presentation",
      summary: "Surface explicit repo evidence references on the filter PDP.",
      evidence: [`census:evidence_files_empty:${row.slug}`],
      source: "all_product_safe_buyer_path_census_v1",
      expected_customer_value:
        "Homeowners see why BuckParts trusts this part before clicking a buying option.",
      truth_risk: "LOW",
      validation_path:
        "Owner browser review: evidence file list visible on PDP without inventing claims.",
      permitted_action_class: "OWNER_COPY_REVIEW",
      priority_score: basePriority("evidence_presentation"),
      content_invention_required: false,
    });
  } else {
    findings.push({
      improvement_class: "evidence_presentation",
      summary: "Align filter PDP source-tier framing with universal trust contract Q4.",
      evidence: [
        ...row.evidence_files.map((f) => `evidence_file:${f}`),
        `trust_contract:${context.trust_contract_rel_path}:filter_pdp_light_q4`,
      ],
      source: TRUST_CONTRACT_REL_V1,
      expected_customer_value:
        "Citation-worthy pages show where proof lives instead of sanitized notes only.",
      truth_risk: "LOW",
      validation_path: "READ_ONLY_AUDIT against trust contract question 4 checklist.",
      permitted_action_class: "READ_ONLY_AUDIT",
      priority_score: basePriority("evidence_presentation") - 5,
      content_invention_required: false,
    });
  }

  findings.push({
    improvement_class: "homeowner_comprehension",
    summary: "Strengthen fit-decision framing for filter PDP trust questions 2, 5, 7, 9.",
    evidence: [
      `public_route:${row.public_route}`,
      `page_classification:${row.page_classification}`,
      `trust_contract:${context.trust_contract_rel_path}`,
    ],
    source: TRUST_CONTRACT_REL_V1,
    expected_customer_value:
      "Readers grasp fit, uncertainty, and CTA visibility without internal jargon.",
    truth_risk: "LOW",
    validation_path: "OWNER_COPY_REVIEW against universal trust Q2/Q5/Q7/Q9.",
    permitted_action_class: "OWNER_COPY_REVIEW",
    priority_score: basePriority("homeowner_comprehension"),
    content_invention_required: false,
  });

  if (context.compat_model_count <= 1) {
    findings.push({
      improvement_class: "comparison_clarity",
      summary: "Compat graph is thin — clarify single-model fit vs family alternatives.",
      evidence: [`compat_model_count:${context.compat_model_count}`, `slug:${row.slug}`],
      source: "compatibility_mappings.csv",
      expected_customer_value:
        "Homeowners understand whether this cartridge is the only fit or one of several.",
      truth_risk: "MEDIUM",
      validation_path: "MAPPING_REVIEW via compat CSV — no new model claims.",
      permitted_action_class: "READ_ONLY_AUDIT",
      priority_score: basePriority("comparison_clarity"),
      content_invention_required: false,
    });
  } else {
    findings.push({
      improvement_class: "comparison_clarity",
      summary: "Expose model comparison anchors from proven compat mappings.",
      evidence: [`compat_model_count:${context.compat_model_count}`, `slug:${row.slug}`],
      source: "compatibility_mappings.csv",
      expected_customer_value:
        "Readers can compare compatible models without leaving for a forum thread.",
      truth_risk: "LOW",
      validation_path: "INTERNAL_LINK_PLAN limited to mapped models only.",
      permitted_action_class: "INTERNAL_LINK_PLAN",
      priority_score: basePriority("comparison_clarity") - 3,
      content_invention_required: false,
    });
  }

  if (!context.has_product_json_ld_on_template && context.filter_row_present) {
    findings.push({
      improvement_class: "structured_data",
      summary: "Wire minimal Product JSON-LD from proven filter CSV fields.",
      evidence: [
        `filter_row_present:${context.filter_row_present}`,
        `oem_part_number:${context.oem_part_number ?? "missing"}`,
        `page_template:${context.page_template_rel_path}`,
      ],
      source: context.page_template_rel_path,
      expected_customer_value:
        "Search and AI systems can cite structured part identity without guessing.",
      truth_risk: "LOW",
      validation_path: "STRUCTURED_DATA_WIRE using filters.csv + existing JSON-LD helpers only.",
      permitted_action_class: "STRUCTURED_DATA_WIRE",
      priority_score: basePriority("structured_data"),
      content_invention_required: false,
    });
  } else if (context.has_product_json_ld_on_template) {
    findings.push({
      improvement_class: "structured_data",
      summary: "Audit existing Product JSON-LD against live PDP required fields.",
      evidence: [`page_template:${context.page_template_rel_path}:buildRefrigeratorFilterProductJsonLd`],
      source: "src/lib/seo/structured-data.ts",
      expected_customer_value: "Rich results stay aligned with repo-proven MPN and brand.",
      truth_risk: "LOW",
      validation_path: "READ_ONLY_AUDIT of JSON-LD output vs filters.csv row.",
      permitted_action_class: "READ_ONLY_AUDIT",
      priority_score: basePriority("structured_data") - 5,
      content_invention_required: false,
    });
  }

  if (context.page_template_banned_phrases.length > 0) {
    findings.push({
      improvement_class: "human_readability",
      summary: "Remove legacy banned phrases from filter page template.",
      evidence: context.page_template_banned_phrases.map((p) => `banned_phrase:${p}`),
      source: context.page_template_rel_path,
      expected_customer_value:
        "Copy matches approved buying-options language — easier to quote and share.",
      truth_risk: "LOW",
      validation_path: "OWNER_COPY_REVIEW + phrase guard on template source.",
      permitted_action_class: "OWNER_COPY_REVIEW",
      priority_score: basePriority("human_readability") + 5,
      content_invention_required: false,
    });
  } else {
    findings.push({
      improvement_class: "human_readability",
      summary: "Template passes banned-phrase scan — schedule periodic readability audit.",
      evidence: [`page_template:${context.page_template_rel_path}:no_banned_phrases`],
      source: context.page_template_rel_path,
      expected_customer_value: "Maintains homeowner-safe tone as templates evolve.",
      truth_risk: "LOW",
      validation_path: "READ_ONLY_AUDIT on template diff.",
      permitted_action_class: "READ_ONLY_AUDIT",
      priority_score: basePriority("human_readability") - 10,
      content_invention_required: false,
    });
  }

  if (context.compat_model_count > 0) {
    findings.push({
      improvement_class: "internal_linking",
      summary: "Plan internal links from filter PDP to mapped model pages.",
      evidence: [`compat_model_count:${context.compat_model_count}`, `public_route:${row.public_route}`],
      source: "compatibility_mappings.csv",
      expected_customer_value: "Discovery paths stay on-site between model and part decisions.",
      truth_risk: "LOW",
      validation_path: "INTERNAL_LINK_PLAN — only compat-proven targets.",
      permitted_action_class: "INTERNAL_LINK_PLAN",
      priority_score: basePriority("internal_linking"),
      content_invention_required: false,
    });
  }

  const staleDays = daysSinceIso(context.browser_truth_checked_at, now);
  if (
    staleDays === null ||
    staleDays > FRESHNESS_STALE_DAYS_V1 ||
    context.browser_truth_classification !== "direct_buyable"
  ) {
    findings.push({
      improvement_class: "update_freshness",
      summary: "Browser-truth proof is missing, stale, or not direct_buyable.",
      evidence: [
        `browser_truth_checked_at:${context.browser_truth_checked_at ?? "missing"}`,
        `browser_truth_classification:${context.browser_truth_classification ?? "missing"}`,
        staleDays !== null ? `stale_days:${staleDays}` : "stale_days:unknown",
      ],
      source: "retailer_links.csv",
      expected_customer_value: "Safe buying options stay current — trust survives sharing.",
      truth_risk: "MEDIUM",
      validation_path: "BROWSER_REPROOF per retailer_links row — no URL mutation in factory.",
      permitted_action_class: "BROWSER_REPROOF",
      priority_score: basePriority("update_freshness") + (staleDays !== null && staleDays > 180 ? 10 : 0),
      content_invention_required: false,
    });
  }

  if (row.wedge === "air_purifier" && context.ap_runtime_gate_state !== "CONVERGED") {
    findings.push({
      improvement_class: "human_readability",
      summary: "AP homeowner template pilot wire blocked until repo-runtime convergence.",
      evidence: [
        `ap_runtime_gate_state:${context.ap_runtime_gate_state ?? "unknown"}`,
        `page_template:${context.page_template_rel_path}`,
      ],
      source: "repo_runtime_convergence_gate_v1",
      expected_customer_value:
        "Live template changes ship only when CSV and runtime safe CTA truth align.",
      truth_risk: "HIGH",
      validation_path: "Re-run repo_runtime_convergence_gate_v1 after acceptance or parity fix.",
      permitted_action_class: "PAGE_TEMPLATE_WIRE",
      priority_score: 40,
      content_invention_required: false,
    });
  }

  return findings;
}

export function gapFindingToRecommendationV1(
  finding: ReferenceabilityGapFindingV1,
  row: AllProductCensusProductRowV1,
): ReferenceabilityRecommendationV1 | null {
  if (finding.content_invention_required !== false) return null;
  return {
    recommendation_id: recommendationId(row.wedge, row.slug, finding.improvement_class),
    ...finding,
  };
}

export function gapFindingToWorkItemV1(
  finding: ReferenceabilityGapFindingV1,
  row: AllProductCensusProductRowV1,
): ReferenceabilityWorkItemV1 | null {
  const rec = gapFindingToRecommendationV1(finding, row);
  if (!rec) return null;
  return {
    ...rec,
    work_item_id: workItemId(row.wedge, row.slug, finding.improvement_class),
    wedge: row.wedge,
    slug: row.slug,
    public_route: row.public_route,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    artifact_write_authorized: false,
  };
}

export function filterGapsForEligibilityV1(args: {
  findings: ReferenceabilityGapFindingV1[];
  row: AllProductCensusProductRowV1;
  context: ReferenceabilityPageContextV1;
}): ReferenceabilityGapFindingV1[] {
  const { row, context } = args;
  let findings = args.findings;

  if (row.page_classification !== "SAFE_BUYER_PATH_PROVEN") {
    return [];
  }

  if (context.marketing_risk?.wrong_part_risk === "HIGH") {
    return [];
  }
  if (context.marketing_risk?.publishability_status === "DO_NOT_PUBLISH") {
    return [];
  }

  if (row.wedge === "air_purifier" && context.ap_runtime_gate_state === "BLOCKED") {
    findings = findings.filter(
      (f) =>
        !isLiveTemplateRecommendationBlockedV1({
          wedge: row.wedge,
          permitted_action_class: f.permitted_action_class,
          ap_runtime_gate_state: context.ap_runtime_gate_state,
        }),
    );
  }

  return findings.filter((f) => f.content_invention_required === false);
}
