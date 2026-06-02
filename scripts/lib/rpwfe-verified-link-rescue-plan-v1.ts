/**
 * Read-only RPWFE BuckParts Verified Link rescue evidence plan.
 *
 * Converts the RPWFE no-buy trust defect into a bounded owner-review plan.
 * Does not apply links, collect browser evidence, mutate CSV/Supabase/evidence, or authorize Verified Links.
 */

import {
  buildRpwfePurchaseOptionRescueOwnerReviewLaneV1,
  type RpwfePurchaseOptionRescueOwnerReviewLaneV1,
} from "./rpwfe-purchase-option-rescue-owner-review-v1";
import {
  BUCKPARTS_AI_VS_BUCKPARTS_POSITIONING_V1,
  BUCKPARTS_CERTAINTY_ENGINE_CHECKLIST_CC_JQ_PATH_V1,
  type BuckpartsCertaintyEngineChecklistLaneV1,
} from "./buckparts-certainty-engine-checklist-v1";

export const RPWFE_VERIFIED_LINK_RESCUE_PLAN_CONTRACT_V1 = "rpwfe_verified_link_rescue_plan_v1" as const;
export const RPWFE_VERIFIED_LINK_RESCUE_PLAN_CC_JQ_PATH_V1 =
  ".command_center_v2.rpwfe_verified_link_rescue_plan_v1" as const;

export const RPWFE_ELECTRONIC_FILTER_RISK_PLAIN_LANGUAGE_V1 =
  "Some refrigerator filters have a small electronic piece inside that the fridge checks before it will work. A look-alike filter can fit physically but still fail if that electronic requirement is different." as const;

const FILTER_SLUG = "rpwfe" as const;
const PUBLIC_ROUTE = "/filter/rpwfe" as const;
const OFFICIAL_GE_SPEC_URL = "https://www.geapplianceparts.com/store/parts/spec/RPWFE" as const;
const WATERDROP_SKU = "WD-F19C" as const;
const RPWFE_RESCUE_DOC_REL = "docs/RPWFE-PURCHASE-OPTION-RESCUE-V1.md" as const;

export type RpwfeVerifiedLinkRescuePlanLaneV1 = {
  contract: typeof RPWFE_VERIFIED_LINK_RESCUE_PLAN_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  owner_approval_required: true;
  recommended_jq_path: typeof RPWFE_VERIFIED_LINK_RESCUE_PLAN_CC_JQ_PATH_V1;
  filter_slug: typeof FILTER_SLUG;
  public_route: typeof PUBLIC_ROUTE;
  emergency_classification: "HIGH_DEMAND_NO_VERIFIED_LINK_TRUST_GAP";
  customer_visible_problem: true;
  current_public_state: "no_buy_options";
  compatible_model_count: number | "UNKNOWN";
  current_blocker_summary: string;
  why_this_matters_to_certainty_engine: string;
  certainty_engine_context: {
    checklist_jq_path: typeof BUCKPARTS_CERTAINTY_ENGINE_CHECKLIST_CC_JQ_PATH_V1;
    ai_positioning: typeof BUCKPARTS_AI_VS_BUCKPARTS_POSITIONING_V1;
    first_checklist_item_id: "every_filter_has_buckparts_verified_link_or_safe_buyer_path";
    first_checklist_item_status: string | "UNKNOWN";
    high_demand_no_buy_emergency_lane_references_rpwfe: boolean;
    branded_customer_term: "BuckParts Verified Link";
  };
  official_ge_candidate: {
    path_type: "OFFICIAL_GE_MANUFACTURER";
    candidate_url: typeof OFFICIAL_GE_SPEC_URL | null;
    status: "PROVEN_IN_REPO_DOC_NOT_APPLIED" | "NEEDS_BROWSER_RECHECK" | "UNKNOWN";
    direct_buyable_authorized: false;
    buckparts_verified_link_authorized: false;
    repo_evidence_summary: string;
    browser_evidence_required_before_link: string[];
    separated_from_compatible_path: true;
  };
  compatible_waterdrop_candidate: {
    path_type: "COMPATIBLE_REPLACEMENT_NOT_OFFICIAL_GE";
    product_sku: typeof WATERDROP_SKU;
    status: "UNPROVEN_UNAUTHORIZED" | "UNKNOWN";
    buckparts_verified_link_authorized: false;
    not_official_ge: true;
    repo_evidence_summary: string;
  };
  visual_match_proof_needed: {
    required: true;
    status: "NOT_PROVEN";
    summary: string;
    requirements: string[];
  };
  evidence_requirements: {
    official_ge: string[];
    compatible_waterdrop: string[];
    no_live_browser_collection_in_this_lane: true;
  };
  safe_labeling_requirements: string[];
  electronic_filter_risk_plain_language: typeof RPWFE_ELECTRONIC_FILTER_RISK_PLAIN_LANGUAGE_V1;
  prohibited_claims: string[];
  owner_decision_required: string[];
  csv_apply_authorized: false;
  supabase_mutation_authorized: false;
  evidence_write_authorized: false;
  public_ui_mutation_authorized: false;
  netlify_api_authorized: false;
  deploy_authorized: false;
  buckparts_verified_link_authorized: false;
  related_owner_review_lane: ".command_center_v2.rpwfe_purchase_option_rescue_owner_review_v1";
  proven_facts: string[];
  inferred_facts: string[];
  unknown_facts: string[];
  recommended_next_action: string;
};

export type BuildRpwfeVerifiedLinkRescuePlanDepsV1 = {
  rootDir: string;
  fileExists?: (absolutePath: string) => boolean;
  readTextFile?: (absolutePath: string) => string;
  rpwfeOwnerReview?: RpwfePurchaseOptionRescueOwnerReviewLaneV1;
  certaintyEngineChecklist?: BuckpartsCertaintyEngineChecklistLaneV1 | null;
};

const OFFICIAL_GE_BROWSER_EVIDENCE = [
  "Re-confirm GE Appliance Parts spec PDP URL resolves to /parts/spec/RPWFE (not catalog search).",
  "Visible exact token RPWFE in title, H1, and SKU line on the live page.",
  "Visible Add to Cart or equivalent direct purchase control on the official GE parts PDP.",
  "Capture browser_truth notes proving direct_buyable — repo doc cites ephemeral Playwright 2026-05-22; production row not applied.",
  "Label path as Official GE / manufacturer — never as compatible replacement.",
] as const;

const WATERDROP_BROWSER_EVIDENCE = [
  "Visible product title or on-page token WD-F19C.",
  "Visible compatibility with RPWFE and/or RPWF on the live listing (not URL slug alone).",
  "Proof listing is a compatible replacement, not official GE — separate label from manufacturer path.",
  "Proof listing is a direct product page, not search or category redirect.",
  "Proof current purchase path exists (Add to Cart / Buy Now visible).",
  "Proof listing is not primarily for a different family (e.g. XWFE/MWF) unless page clearly supports RPWFE/RPWF.",
  "Visual Match Proof: customer can compare their filter to listing images; visual similarity alone is not proof.",
  "Plain-language note if electronic-in-filter requirement may apply (see electronic_filter_risk_plain_language).",
] as const;

const SAFE_LABELING = [
  "Official GE path and compatible Waterdrop path must be visually and verbally separate on /filter/rpwfe.",
  "Use customer term BuckParts Verified Link only after evidence gates pass — not buy button.",
  "Compatible replacement label required for Waterdrop; Official GE label required for manufacturer PDP.",
  "No guaranteed-fit, warranty, refund, or guarantee language.",
  "Suppress buy until browser_truth_classification and launch-buy-links gates pass.",
] as const;

const PROHIBITED_CLAIMS = [
  "Do not call Waterdrop WD-F19C official GE or OEM.",
  "Do not say fits your fridge or guaranteed fit unless evidence gates prove it.",
  "Do not authorize or show a BuckParts Verified Link from this lane.",
  "Do not claim BuckParts is better than generic AI on this page until evidence and verified buying paths exist.",
  "Do not imply guarantee, refund, or warranty.",
  "Do not apply data/retailer_links.csv or Supabase rows from this plan.",
] as const;

const OWNER_DECISIONS = [
  "Authorize read-only official GE RPWFE browser evidence recheck packet (no CSV apply).",
  "Authorize read-only Waterdrop WD-F19C compatible-replacement browser evidence packet (no CSV apply).",
  "Approve safe_labeling copy separating Official GE vs Compatible replacement before any future link apply.",
  "Explicit owner approval before any BuckParts Verified Link apply for rpwfe.",
] as const;

export function buildRpwfeVerifiedLinkRescuePlanV1(
  deps: BuildRpwfeVerifiedLinkRescuePlanDepsV1,
): RpwfeVerifiedLinkRescuePlanLaneV1 {
  const ownerReview =
    deps.rpwfeOwnerReview ??
    buildRpwfePurchaseOptionRescueOwnerReviewLaneV1({
      rootDir: deps.rootDir,
      fileExists: deps.fileExists,
      readTextFile: deps.readTextFile,
    });

  const certainty = deps.certaintyEngineChecklist ?? null;
  const firstItem = certainty?.checklist_items.find(
    (item) => item.id === "every_filter_has_buckparts_verified_link_or_safe_buyer_path",
  );
  const emergencyItem = certainty?.checklist_items.find(
    (item) => item.id === "high_demand_no_buy_emergency_lane",
  );
  const emergencyRefsRpwfe = Boolean(
    emergencyItem?.proof_or_blocker.toLowerCase().includes("rpwfe"),
  );

  const geStatus =
    ownerReview.official_ge_path_status === "PROVEN_IN_REPO_DOC_NOT_APPLIED"
      ? ("PROVEN_IN_REPO_DOC_NOT_APPLIED" as const)
      : ownerReview.official_ge_path_status === "UNKNOWN"
        ? ("UNKNOWN" as const)
        : ("NEEDS_BROWSER_RECHECK" as const);

  const waterdropStatus =
    ownerReview.compatible_waterdrop_path_status === "UNPROVEN_UNAUTHORIZED"
      ? ("UNPROVEN_UNAUTHORIZED" as const)
      : ("UNKNOWN" as const);

  const current_blocker_summary = [
    `Public ${PUBLIC_ROUTE} shows no_buy_options with ${String(ownerReview.compatible_model_count)} compatible models mapped.`,
    `Committed ${ownerReview.existing_retailer_row?.source_path ?? "data/retailer_links.csv"} row is ${ownerReview.existing_retailer_row_status} (search placeholder, not a BuckParts Verified Link).`,
    `Official GE spec PDP is ${geStatus}; Waterdrop ${WATERDROP_SKU} is ${waterdropStatus}.`,
    "No BuckParts Verified Link is authorized in this lane.",
  ].join(" ");

  const why_this_matters_to_certainty_engine = [
    "Certainty Engine checklist item #1 requires every filter page to expose a BuckParts Verified Link or safe buyer path — rpwfe fails that bar today.",
    BUCKPARTS_AI_VS_BUCKPARTS_POSITIONING_V1 +
      " RPWFE is a high-visibility counterexample: demand and compatibility exist, but verified buying paths do not.",
    "Until official GE and/or labeled compatible paths are proven and applied with owner approval, homeowners cannot use BuckParts as the must-check step for RPWFE.",
  ].join(" ");

  const retailerLinksSource =
    ownerReview.existing_retailer_row?.source_path ?? "data/retailer_links.csv";
  const officialGeRepoSummary =
    geStatus === "PROVEN_IN_REPO_DOC_NOT_APPLIED"
      ? "PROVEN in " +
        RPWFE_RESCUE_DOC_REL +
        ": Playwright documented " +
        OFFICIAL_GE_SPEC_URL +
        " with Add to Cart on spec PDP; not applied to " +
        retailerLinksSource +
        "."
      : "UNKNOWN: repo doc does not prove GE spec PDP path.";
  const waterdropRepoSummary =
    waterdropStatus === "UNPROVEN_UNAUTHORIZED"
      ? "PROVEN in " +
        RPWFE_RESCUE_DOC_REL +
        ": " +
        WATERDROP_SKU +
        " candidate URLs rejected — automation blocked, no visible RPWFE/Add to Cart; rpwfe not in Waterdrop exact-proof slice."
      : "UNKNOWN: Waterdrop compatibility not established in repo.";

  return {
    contract: RPWFE_VERIFIED_LINK_RESCUE_PLAN_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    owner_approval_required: true,
    recommended_jq_path: RPWFE_VERIFIED_LINK_RESCUE_PLAN_CC_JQ_PATH_V1,
    filter_slug: FILTER_SLUG,
    public_route: PUBLIC_ROUTE,
    emergency_classification: "HIGH_DEMAND_NO_VERIFIED_LINK_TRUST_GAP",
    customer_visible_problem: true,
    current_public_state: "no_buy_options",
    compatible_model_count: ownerReview.compatible_model_count,
    current_blocker_summary,
    why_this_matters_to_certainty_engine,
    certainty_engine_context: {
      checklist_jq_path: BUCKPARTS_CERTAINTY_ENGINE_CHECKLIST_CC_JQ_PATH_V1,
      ai_positioning: BUCKPARTS_AI_VS_BUCKPARTS_POSITIONING_V1,
      first_checklist_item_id: "every_filter_has_buckparts_verified_link_or_safe_buyer_path",
      first_checklist_item_status: firstItem?.status ?? "UNKNOWN",
      high_demand_no_buy_emergency_lane_references_rpwfe: emergencyRefsRpwfe,
      branded_customer_term: "BuckParts Verified Link",
    },
    official_ge_candidate: {
      path_type: "OFFICIAL_GE_MANUFACTURER",
      candidate_url: ownerReview.official_ge_candidate_url,
      status: geStatus,
      direct_buyable_authorized: false,
      buckparts_verified_link_authorized: false,
      repo_evidence_summary: officialGeRepoSummary,
      browser_evidence_required_before_link: [...OFFICIAL_GE_BROWSER_EVIDENCE],
      separated_from_compatible_path: true,
    },
    compatible_waterdrop_candidate: {
      path_type: "COMPATIBLE_REPLACEMENT_NOT_OFFICIAL_GE",
      product_sku: WATERDROP_SKU,
      status: waterdropStatus,
      buckparts_verified_link_authorized: false,
      not_official_ge: true,
      repo_evidence_summary: waterdropRepoSummary,
    },
    visual_match_proof_needed: {
      required: true,
      status: "NOT_PROVEN",
      summary:
        "Customer should compare the filter they have against candidate replacement images before any BuckParts Verified Link; visual similarity alone is not proof.",
      requirements: [
        "Side-by-side or overlay comparison of customer filter vs listing product image when available.",
        "Visual match increases confidence only when combined with RPWFE/RPWF token, WD-F19C token, and direct-buy evidence.",
        "Visual match alone must not authorize a BuckParts Verified Link.",
      ],
    },
    evidence_requirements: {
      official_ge: [...OFFICIAL_GE_BROWSER_EVIDENCE],
      compatible_waterdrop: [...WATERDROP_BROWSER_EVIDENCE],
      no_live_browser_collection_in_this_lane: true,
    },
    safe_labeling_requirements: [...SAFE_LABELING],
    electronic_filter_risk_plain_language: RPWFE_ELECTRONIC_FILTER_RISK_PLAIN_LANGUAGE_V1,
    prohibited_claims: [...PROHIBITED_CLAIMS],
    owner_decision_required: [...OWNER_DECISIONS],
    csv_apply_authorized: false,
    supabase_mutation_authorized: false,
    evidence_write_authorized: false,
    public_ui_mutation_authorized: false,
    netlify_api_authorized: false,
    deploy_authorized: false,
    buckparts_verified_link_authorized: false,
    related_owner_review_lane: ".command_center_v2.rpwfe_purchase_option_rescue_owner_review_v1",
    proven_facts: [
      "PROVEN: lane is read_only with all mutation and BuckParts Verified Link authorization flags false.",
      `PROVEN: emergency_classification=HIGH_DEMAND_NO_VERIFIED_LINK_TRUST_GAP; filter_slug=${FILTER_SLUG}; current_public_state=no_buy_options.`,
      `PROVEN: owner_review ${ownerReview.contract} attached — existing_retailer_row_status=${ownerReview.existing_retailer_row_status}.`,
      `PROVEN: official_ge_candidate.status=${geStatus}; compatible_waterdrop_candidate.status=${waterdropStatus}.`,
      "PROVEN: visual_match_proof_needed.required=true; status=NOT_PROVEN.",
      `PROVEN: ${RPWFE_RESCUE_DOC_REL} exists in repo — no web fetch in this lane.`,
    ],
    inferred_facts: [
      "INFERRED: Official GE spec PDP is the primary manufacturer rescue target; Waterdrop WD-F19C is a separate compatible-replacement lane.",
      "INFERRED: Owner must approve future read-only browser evidence packets before any apply.",
    ],
    unknown_facts: [
      "UNKNOWN: live production Supabase buyer-path state for rpwfe (lane uses committed CSV + docs only).",
      "UNKNOWN: whether fresh human browser capture would pass gates today (no collection in this lane).",
    ],
    recommended_next_action:
      "Owner: approve read-only evidence packets for (1) official GE RPWFE spec PDP recheck and (2) Waterdrop WD-F19C compatible-replacement proof with Visual Match Proof + plain-language electronic-filter risk — then re-run Command Center; still no CSV/Supabase/UI apply until separate owner apply authorization.",
  };
}
