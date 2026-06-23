/**
 * Golden cases for BuckParts Production Truth Test Suite v1 — Air Purifier vertical.
 * Read-only contract definitions; authority pointers cite committed repo artifacts.
 */

export const PRODUCTION_TRUTH_GOLDEN_CASES_AP_CONTRACT_V1 =
  "buckparts_production_truth_golden_cases_ap_v1" as const;

export type ProductionTruthAssertionKindV1 =
  | "safe_cta_present"
  | "safe_cta_absent"
  | "primary_affiliate_url_contains"
  | "primary_affiliate_url_must_not_contain"
  | "go_redirect_gate_safe"
  | "csv_runtime_safe_cta_parity"
  | "model_lists_filter"
  | "filter_lists_model";

export type ProductionTruthGoldenAssertionV1 = {
  assertion_id: string;
  kind: ProductionTruthAssertionKindV1;
  expected: string | boolean;
  /** PROVEN | PARTIAL | UNKNOWN — how testable this assertion is in-repo today. */
  testability: "PROVEN" | "PARTIAL" | "UNKNOWN";
  /**
   * When false, a failing assertion is reported as an inventory_warning only —
   * it does not fail case status or the suite exit code. Defaults: PROVEN→true, PARTIAL→false.
   */
  blocks_case_pass?: boolean;
  notes: string;
};

export type ProductionTruthGoldenCaseApV1 = {
  case_id: string;
  title: string;
  vertical: "air_purifier";
  case_type: "safe_direct_buyable" | "suppressed_search_placeholder" | "csv_runtime_drift" | "model_filter_compat";
  filter_slug?: string;
  model_slug?: string;
  authority_artifacts: string[];
  assertions: ProductionTruthGoldenAssertionV1[];
};

export const PRODUCTION_TRUTH_GOLDEN_CASES_AP_V1: ProductionTruthGoldenCaseApV1[] = [
  {
    case_id: "ap-safe-winix-filter-h-116130",
    title: "Winix Filter H 116130 — known safe direct-buyable OEM PDP",
    vertical: "air_purifier",
    case_type: "safe_direct_buyable",
    filter_slug: "winix-filter-h-116130",
    authority_artifacts: [
      "data/air-purifier/retailer_links.csv",
      "data/air-purifier/batch-production/agent-results-model-first-v1/ap-model-first-winix-filter-h-116130-v1.results.json",
      "docs/air-purifier/AP-EVIDENCE-WRITE-OWNER-REVIEW-WINIX-FILTER-H-116130-v1.md",
    ],
    assertions: [
      {
        assertion_id: "safe_cta_present",
        kind: "safe_cta_present",
        expected: true,
        testability: "PROVEN",
        notes: "Runtime loader must expose at least one gated safe buy row (filterRealBuyRetailerLinks).",
      },
      {
        assertion_id: "primary_pdp_path",
        kind: "primary_affiliate_url_contains",
        expected: "winixamerica.com/product/filter-h-116130",
        testability: "PROVEN",
        notes: "Selected buy link must be official Filter H PDP, not site search.",
      },
      {
        assertion_id: "go_gate_safe",
        kind: "go_redirect_gate_safe",
        expected: true,
        testability: "PROVEN",
        notes: "isAffiliateUrlSafeForGoRedirect must pass for selected buy link.",
      },
    ],
  },
  {
    case_id: "ap-suppressed-holmes-hapf30",
    title: "Holmes HAPF30 — search-placeholder primary; buy path suppressed",
    vertical: "air_purifier",
    case_type: "suppressed_search_placeholder",
    filter_slug: "holmes-hapf30",
    authority_artifacts: [
      "data/air-purifier/retailer_links.csv",
      "data/air-purifier/batch-production/agent-results-model-first-v1/ap-model-first-holmes-hapf30-live-browser-v1.results.json",
    ],
    assertions: [
      {
        assertion_id: "safe_cta_absent",
        kind: "safe_cta_absent",
        expected: true,
        testability: "PROVEN",
        notes: "No live safe CTA when primary is manufacturer site-search placeholder.",
      },
      {
        assertion_id: "no_search_primary_win",
        kind: "primary_affiliate_url_must_not_contain",
        expected: "/search?",
        testability: "PARTIAL",
        blocks_case_pass: false,
        notes:
          "Inventory hygiene: raw is_primary OEM search row may remain in Supabase until search_placeholder_rescue. Does not affect gated buy path when safe_cta_absent passes.",
      },
    ],
  },
  {
    case_id: "ap-drift-blueair-f2-211",
    title: "Blueair F2-211 — CSV authority vs runtime primary (drift alarm)",
    vertical: "air_purifier",
    case_type: "csv_runtime_drift",
    filter_slug: "blueair-f2-211",
    authority_artifacts: [
      "data/air-purifier/retailer_links.csv",
      "data/air-purifier/batch-production/audits/ap-runtime-convergence-gap-v1.json",
      "data/air-purifier/batch-production/audits/ap-runtime-safe-cta-parity-packet-v1.json",
    ],
    assertions: [
      {
        assertion_id: "csv_runtime_parity",
        kind: "csv_runtime_safe_cta_parity",
        expected: true,
        testability: "PROVEN",
        notes: "Committed CSV primary is direct_buyable official PDP; runtime must match after parity apply. Fails while stale-primary drift remains.",
      },
      {
        assertion_id: "csv_pdp_authority",
        kind: "primary_affiliate_url_contains",
        expected: "blueair.com/products/blue-pure-211-plus-particle-carbon",
        testability: "PROVEN",
        notes: "Runtime-selected buy path must use CSV official PDP when safe CTA is present.",
      },
    ],
  },
  {
    case_id: "ap-compat-winix-5500-2",
    title: "Winix 5500-2 model page — maps to Filter H 116130",
    vertical: "air_purifier",
    case_type: "model_filter_compat",
    model_slug: "winix-5500-2",
    filter_slug: "winix-filter-h-116130",
    authority_artifacts: [
      "data/air-purifier/compatibility_mappings.csv",
      "data/air-purifier/batch-production/drafts/ap-apply-plan-winix-filter-i-116131-identity-correction-v1.md",
    ],
    assertions: [
      {
        assertion_id: "model_lists_filter",
        kind: "model_lists_filter",
        expected: "winix-filter-h-116130",
        testability: "PROVEN",
        notes: "getAirPurifierModelBySlug must include mapped filter slug.",
      },
    ],
  },
];
