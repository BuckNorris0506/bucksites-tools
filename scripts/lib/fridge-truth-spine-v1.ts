import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { buildFridgeCommandCenterAndPublicTruthAuditV1 } from "./fridge-command-center-and-public-truth-audit-v1";
import { buildFridgeSupabaseVsCsvRetailerLinksDiffV1 } from "./fridge-supabase-vs-csv-retailer-links-diff-v1";
import { buildFridgeTruthReconciliationV1 } from "./fridge-truth-reconciliation-v1";
import { buildRefrigeratorModelFirstTruthAuditV1 } from "./refrigerator-model-first-truth-audit-v1";

export const FRIDGE_TRUTH_SPINE_CONTRACT_V1 = "fridge_truth_spine_v1" as const;

export const FRIDGE_TRUTH_SPINE_RECOMMENDED_NEXT_ACTION_V1 =
  "CTA/go is PASS 27 / FAIL 1 — keep ge-gte18gsnrss remain-no-buy; GE MWFP/XWFE Supabase URL sync is applied (notes-only residual drift is not a re-write trigger); do not claim conversion/revenue; do not re-run completed sync owner-review/write." as const;

/** jq path for Command Center live HTML proof milestone (nested under fridge_truth_spine_v1). */
export const FRIDGE_TRUTH_SPINE_MODEL_PDP_LIVE_HTML_PROOF_JQ_PATH_V1 =
  ".command_center_v2.fridge_truth_spine_v1.model_pdp_live_html_proof" as const;

export const FRIDGE_TRUTH_SPINE_MODEL_PDP_CTA_GO_JQ_PATH_V1 =
  ".command_center_v2.fridge_truth_spine_v1.model_pdp_cta_go_proof" as const;

/** Artifact-backed live HTML proof (string literals only — avoid importing the fetch pack into Next typecheck). */
export const FRIDGE_TRUTH_SPINE_LIVE_HTML_PROOF_CONTRACT_V1 =
  "buckparts_fridge_model_pdp_live_html_proof_pack_v1" as const;
export const FRIDGE_TRUTH_SPINE_LIVE_HTML_PROOF_JSON_REL_V1 =
  "data/fridge/batch-production/drafts/buckparts-fridge-model-pdp-live-html-proof-pack-v1.json" as const;

export const FRIDGE_TRUTH_SPINE_CTA_GO_PROOF_CONTRACT_V1 =
  "buckparts_fridge_model_pdp_cta_go_link_proof_pack_v1" as const;
export const FRIDGE_TRUTH_SPINE_CTA_GO_PROOF_JSON_REL_V1 =
  "data/fridge/batch-production/drafts/buckparts-fridge-model-pdp-cta-go-link-proof-pack-v1.json" as const;

/** GE MWFP/XWFE scoped parity artifact (string literals — avoid importing parity lib into Next typecheck). */
export const FRIDGE_TRUTH_SPINE_GE_MWFP_XWFE_PARITY_CONTRACT_V1 =
  "buckparts_fridge_model_pdp_ge_mwfp_xwfe_retailer_links_supabase_parity_v1" as const;
export const FRIDGE_TRUTH_SPINE_GE_MWFP_XWFE_PARITY_JSON_REL_V1 =
  "data/fridge/batch-production/drafts/buckparts-fridge-model-pdp-ge-mwfp-xwfe-retailer-links-supabase-parity-v1.json" as const;
export const FRIDGE_TRUTH_SPINE_GE_MWFP_XWFE_SUPABASE_SYNC_CLOSEOUT_CONTRACT_V1 =
  "buckparts_fridge_model_pdp_ge_mwfp_xwfe_retailer_links_supabase_sync_apply_closeout_v1" as const;
export const FRIDGE_TRUTH_SPINE_GE_MWFP_XWFE_SUPABASE_SYNC_CLOSEOUT_JSON_REL_V1 =
  "data/fridge/batch-production/drafts/buckparts-fridge-model-pdp-ge-mwfp-xwfe-retailer-links-supabase-sync-apply-closeout-v1.json" as const;
export const FRIDGE_TRUTH_SPINE_GE_MWFP_XWFE_SUPABASE_SYNC_OWNER_REVIEW_EXACT_COMMAND_V1 =
  "npm run buckparts:fridge-model-pdp-ge-mwfp-xwfe-retailer-links-supabase-sync-owner-review -- --write-artifacts" as const;
export const FRIDGE_TRUTH_SPINE_GE_MWFP_XWFE_SUPABASE_SYNC_JQ_PATH_V1 =
  ".command_center_v2.fridge_truth_spine_v1.ge_mwfp_xwfe_retailer_links_supabase_sync" as const;

/** Minimal artifact shape for Command Center projection (no fetch-pack import). */
export type FridgeLiveHtmlProofPackArtifactV1 = {
  contract: string;
  generated_at: string;
  target_base_url?: string | "UNKNOWN";
  scope: { slug_count: number };
  summary: {
    LIVE_PROOF_PASS: number;
    LIVE_PROOF_FAIL: number;
    LIVE_PROOF_UNKNOWN: number;
  };
  rows: Array<{
    proof_heading_present?: boolean | "UNKNOWN";
    last_checked_present?: boolean | "UNKNOWN";
    mapped_filter_numbers_present?: boolean | "UNKNOWN";
    verified_link_section_present?: boolean | "UNKNOWN";
    safe_go_link_present?: boolean | "UNKNOWN";
    product_json_ld_offers_reviews_ratings_absent?: boolean | "UNKNOWN";
    unsafe_cta_or_search_placeholder_exposed?: boolean | "UNKNOWN";
  }>;
};


export const FRIDGE_TRUTH_SPINE_TRUTH_FIRST_NOTES_V1 = [
  "Affiliate links remain second to truth.",
  "Safe CTAs are allowed only when buyer-path gates pass.",
  "Mapping confidence remains a separate fit-truth issue and must not be overclaimed.",
] as const;

export const FRIDGE_EVIDENCE_ONLY_MISMATCH_SLUGS_V1 = ["4396508", "gswf"] as const;

/** Bound to CTA/go FAIL after GE MWFP/XWFE Supabase sync — artifact-backed, not inventively expanded. */
export const FRIDGE_MODEL_PDP_OPEN_BUYER_PATH_FAIL_COUNT_V1 = 1 as const;
export const FRIDGE_MODEL_PDP_REMAIN_NO_BUY_SLUG_V1 = "ge-gte18gsnrss" as const;
export const FRIDGE_MODEL_PDP_NEEDS_OWNER_BROWSER_PROOF_COUNT_V1 = 0 as const;
export const FRIDGE_MODEL_PDP_CTA_GO_PASS_COUNT_V1 = 27 as const;
export const FRIDGE_MODEL_PDP_CTA_GO_FAIL_COUNT_V1 = 1 as const;

export type FridgeTruthSpineModelPdpLiveHtmlProofV1 = {
  contract: typeof FRIDGE_TRUTH_SPINE_LIVE_HTML_PROOF_CONTRACT_V1 | "UNKNOWN";
  source_artifact_rel: typeof FRIDGE_TRUTH_SPINE_LIVE_HTML_PROOF_JSON_REL_V1;
  recommended_jq_path: typeof FRIDGE_TRUTH_SPINE_MODEL_PDP_LIVE_HTML_PROOF_JQ_PATH_V1;
  status: "PROVEN" | "UNKNOWN";
  generated_at: string | null;
  target_base_url: string | null;
  slug_count: number | null;
  LIVE_PROOF_PASS: number | null;
  LIVE_PROOF_FAIL: number | null;
  LIVE_PROOF_UNKNOWN: number | null;
  proof_block_visible_count: number | null;
  last_checked_visible_count: number | null;
  mapped_filters_visible_count: number | null;
  verified_link_and_go_present_count: number | null;
  product_json_ld_commerce_absent_count: number | null;
  search_placeholder_cta_absent_count: number | null;
  conversion_claimed: false;
  conversion_or_revenue: "UNKNOWN";
  open_buyer_path_fail_count: typeof FRIDGE_MODEL_PDP_OPEN_BUYER_PATH_FAIL_COUNT_V1;
  remain_no_buy_slug: typeof FRIDGE_MODEL_PDP_REMAIN_NO_BUY_SLUG_V1;
  needs_owner_browser_proof_count: typeof FRIDGE_MODEL_PDP_NEEDS_OWNER_BROWSER_PROOF_COUNT_V1;
  proven_facts: string[];
  unknown_facts: string[];
};

export type FridgeTruthSpineV1 = {
  contract: typeof FRIDGE_TRUTH_SPINE_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  generated_at: string;
  source_contracts: string[];
  csv_truth: {
    safe_buyer_path_verdict: string;
    linked_filters_with_safe_direct_buyable_primary: number;
    primary_weak_reason_counts: Record<string, number>;
  };
  evidence_truth: {
    win_artifact_count: number;
    linked_slugs_with_evidence_win_count: number;
  };
  supabase_csv_diff: {
    supabase_truth_status: string;
    checked_slug_count: number;
    supabase_has_win_csv_missing_count: number;
    evidence_only_not_in_supabase_count: number;
    evidence_only_slugs: readonly string[];
  };
  public_truth: {
    public_truth_status: string;
    live_page_check_status: string;
    checked_slug_count: number;
    should_redo_fridge_products_now: string;
  };
  /** Production live HTML proof for 21 SAFE_BUYER_PATH_PASS fridge model PDPs (artifact-backed). */
  model_pdp_live_html_proof: FridgeTruthSpineModelPdpLiveHtmlProofV1;
  /** Artifact-backed CTA/go proof pack summary (PASS/FAIL buyer-path counts). */
  model_pdp_cta_go_proof: FridgeTruthSpineModelPdpCtaGoProofV1;
  /**
   * When GE MWFP/XWFE parity is DRIFTED with search-placeholder, surfaces READY exact_command for read-only
   * Supabase sync owner-review. After applied sync (or notes-only residual), dispatch is NOT_NEEDED.
   */
  ge_mwfp_xwfe_retailer_links_supabase_sync: FridgeTruthSpineGeMwfpXwfeSupabaseSyncV1;
  recommended_next_action: string;
  truth_first_notes: string[];
  proven_facts: string[];
  inferred_facts: string[];
  unknown_facts: string[];
};

export type FridgeTruthSpineModelPdpCtaGoProofV1 = {
  contract: typeof FRIDGE_TRUTH_SPINE_CTA_GO_PROOF_CONTRACT_V1 | "UNKNOWN";
  source_artifact_rel: typeof FRIDGE_TRUTH_SPINE_CTA_GO_PROOF_JSON_REL_V1;
  recommended_jq_path: typeof FRIDGE_TRUTH_SPINE_MODEL_PDP_CTA_GO_JQ_PATH_V1;
  status: "PROVEN" | "UNKNOWN";
  SAFE_BUYER_PATH_PASS: number | null;
  SAFE_BUYER_PATH_FAIL: number | null;
  SAFE_BUYER_PATH_UNKNOWN: number | null;
  remain_no_buy_slug: typeof FRIDGE_MODEL_PDP_REMAIN_NO_BUY_SLUG_V1;
  open_buyer_path_fail_count: typeof FRIDGE_MODEL_PDP_OPEN_BUYER_PATH_FAIL_COUNT_V1;
  pages_claimed_closed: false;
  conversion_claimed: false;
  conversion_or_revenue: "UNKNOWN";
  proven_facts: string[];
  unknown_facts: string[];
};

export type FridgeTruthSpineGeMwfpXwfeSupabaseSyncV1 = {
  contract: typeof FRIDGE_TRUTH_SPINE_GE_MWFP_XWFE_PARITY_CONTRACT_V1 | "UNKNOWN";
  source_artifact_rel: typeof FRIDGE_TRUTH_SPINE_GE_MWFP_XWFE_PARITY_JSON_REL_V1;
  recommended_jq_path: typeof FRIDGE_TRUTH_SPINE_GE_MWFP_XWFE_SUPABASE_SYNC_JQ_PATH_V1;
  overall_sync_status: "DRIFTED" | "IN_SYNC" | "UNKNOWN" | null;
  drift_class: "search_placeholder" | "notes_only" | "other" | "none" | null;
  supabase_sync_apply_status: "APPLIED" | "NOT_APPLIED" | "UNKNOWN";
  any_supabase_search_placeholder: boolean | null;
  dispatch_status: "READY" | "BLOCKED" | "NOT_NEEDED" | "UNKNOWN";
  selected_subsystem: "ge_mwfp_xwfe_retailer_links_supabase_sync_owner_review" | "none";
  exact_command: typeof FRIDGE_TRUTH_SPINE_GE_MWFP_XWFE_SUPABASE_SYNC_OWNER_REVIEW_EXACT_COMMAND_V1 | "";
  command_surface: "terminal" | "none";
  mutation_allowed: false;
  owner_approval_required: false;
  supabase_write_authorized: false;
  pages_claimed_closed: false;
  conversion_or_revenue: "UNKNOWN";
  filter_slugs: readonly ["smartwater-mwfp", "xwfe"];
  excluded_filter_slugs: readonly ["xwf"];
  affected_model_slugs: readonly [
    "ge-gfe24jgkww",
    "ge-gfe27jmkes",
    "ge-gne25jmkww",
    "ge-pvd28bymfs",
  ];
  success_transition: string;
  failure_transition: string;
  why_this_is_next: string;
  proven_facts: string[];
  unknown_facts: string[];
};

export type FridgeCtaGoProofPackArtifactV1 = {
  contract: string;
  summary?: {
    SAFE_BUYER_PATH_PASS?: number;
    SAFE_BUYER_PATH_FAIL?: number;
    SAFE_BUYER_PATH_UNKNOWN?: number;
  };
};

export type GeMwfpXwfeParityPackForSpineV1 = {
  contract?: string;
  overall_sync_status?: string;
  any_supabase_search_placeholder?: boolean | null;
  filter_rows?: Array<{ mismatched_fields?: string[] }>;
};

export type GeMwfpXwfeSupabaseSyncCloseoutForSpineV1 = {
  contract?: string;
  apply_status?: string;
  rows_updated?: number;
  pages_claimed_closed?: boolean;
};

export type BuildFridgeTruthSpineV1Args = {
  rootDir: string;
  now?: () => Date;
  /** Command Center skips live HTTP probes; public truth uses Supabase-gated simulation. */
  skipLivePublicProbe?: boolean;
  /** Test override: inject live HTML proof pack instead of reading draft JSON. */
  loadLiveHtmlProofPack?: () => FridgeLiveHtmlProofPackArtifactV1 | null;
  /** Test override: inject CTA/go proof pack instead of reading draft JSON. */
  loadCtaGoProofPack?: () => FridgeCtaGoProofPackArtifactV1 | null;
  /** Test override: inject GE MWFP/XWFE parity artifact instead of reading draft JSON. */
  loadGeMwfpXwfeParityPack?: () => GeMwfpXwfeParityPackForSpineV1 | null;
  /** Test override: inject GE MWFP/XWFE Supabase sync apply closeout. */
  loadGeMwfpXwfeSupabaseSyncCloseout?: () => GeMwfpXwfeSupabaseSyncCloseoutForSpineV1 | null;
};

function emptyModelPdpLiveHtmlProofV1(
  reason: string,
): FridgeTruthSpineModelPdpLiveHtmlProofV1 {
  return {
    contract: "UNKNOWN",
    source_artifact_rel: FRIDGE_TRUTH_SPINE_LIVE_HTML_PROOF_JSON_REL_V1,
    recommended_jq_path: FRIDGE_TRUTH_SPINE_MODEL_PDP_LIVE_HTML_PROOF_JQ_PATH_V1,
    status: "UNKNOWN",
    generated_at: null,
    target_base_url: null,
    slug_count: null,
    LIVE_PROOF_PASS: null,
    LIVE_PROOF_FAIL: null,
    LIVE_PROOF_UNKNOWN: null,
    proof_block_visible_count: null,
    last_checked_visible_count: null,
    mapped_filters_visible_count: null,
    verified_link_and_go_present_count: null,
    product_json_ld_commerce_absent_count: null,
    search_placeholder_cta_absent_count: null,
    conversion_claimed: false,
    conversion_or_revenue: "UNKNOWN",
    open_buyer_path_fail_count: FRIDGE_MODEL_PDP_OPEN_BUYER_PATH_FAIL_COUNT_V1,
    remain_no_buy_slug: FRIDGE_MODEL_PDP_REMAIN_NO_BUY_SLUG_V1,
    needs_owner_browser_proof_count: FRIDGE_MODEL_PDP_NEEDS_OWNER_BROWSER_PROOF_COUNT_V1,
    proven_facts: [],
    unknown_facts: [`UNKNOWN: model PDP live HTML proof pack unavailable (${reason}).`],
  };
}

export function projectFridgeModelPdpLiveHtmlProofForSpineV1(
  pack: FridgeLiveHtmlProofPackArtifactV1,
): FridgeTruthSpineModelPdpLiveHtmlProofV1 {
  const rows = pack.rows ?? [];
  const proof_block_visible_count = rows.filter((r) => r.proof_heading_present === true).length;
  const last_checked_visible_count = rows.filter((r) => r.last_checked_present === true).length;
  const mapped_filters_visible_count = rows.filter(
    (r) => r.mapped_filter_numbers_present === true,
  ).length;
  const verified_link_and_go_present_count = rows.filter(
    (r) => r.verified_link_section_present === true && r.safe_go_link_present === true,
  ).length;
  const product_json_ld_commerce_absent_count = rows.filter(
    (r) => r.product_json_ld_offers_reviews_ratings_absent === true,
  ).length;
  const search_placeholder_cta_absent_count = rows.filter(
    (r) => r.unsafe_cta_or_search_placeholder_exposed === false,
  ).length;

  return {
    contract: FRIDGE_TRUTH_SPINE_LIVE_HTML_PROOF_CONTRACT_V1,
    source_artifact_rel: FRIDGE_TRUTH_SPINE_LIVE_HTML_PROOF_JSON_REL_V1,
    recommended_jq_path: FRIDGE_TRUTH_SPINE_MODEL_PDP_LIVE_HTML_PROOF_JQ_PATH_V1,
    status: "PROVEN",
    generated_at: pack.generated_at,
    target_base_url:
      typeof pack.target_base_url === "string" ? pack.target_base_url : null,
    slug_count: pack.scope.slug_count,
    LIVE_PROOF_PASS: pack.summary.LIVE_PROOF_PASS,
    LIVE_PROOF_FAIL: pack.summary.LIVE_PROOF_FAIL,
    LIVE_PROOF_UNKNOWN: pack.summary.LIVE_PROOF_UNKNOWN,
    proof_block_visible_count,
    last_checked_visible_count,
    mapped_filters_visible_count,
    verified_link_and_go_present_count,
    product_json_ld_commerce_absent_count,
    search_placeholder_cta_absent_count,
    conversion_claimed: false,
    conversion_or_revenue: "UNKNOWN",
    open_buyer_path_fail_count: FRIDGE_MODEL_PDP_OPEN_BUYER_PATH_FAIL_COUNT_V1,
    remain_no_buy_slug: FRIDGE_MODEL_PDP_REMAIN_NO_BUY_SLUG_V1,
    needs_owner_browser_proof_count: FRIDGE_MODEL_PDP_NEEDS_OWNER_BROWSER_PROOF_COUNT_V1,
    proven_facts: [
      `PROVEN: live HTML proof summary PASS=${String(pack.summary.LIVE_PROOF_PASS)} FAIL=${String(pack.summary.LIVE_PROOF_FAIL)} UNKNOWN=${String(pack.summary.LIVE_PROOF_UNKNOWN)} for ${String(pack.scope.slug_count)} SAFE_BUYER_PATH_PASS fridge model PDPs.`,
      `PROVEN: proof heading visible ${String(proof_block_visible_count)}/${String(pack.scope.slug_count)}; Last checked ${String(last_checked_visible_count)}/${String(pack.scope.slug_count)}; mapped filters ${String(mapped_filters_visible_count)}/${String(pack.scope.slug_count)}.`,
      `PROVEN: Verified Link+/go ${String(verified_link_and_go_present_count)}/${String(pack.scope.slug_count)}; Product JSON-LD commerce absent ${String(product_json_ld_commerce_absent_count)}/${String(pack.scope.slug_count)}; search-placeholder CTA absent ${String(search_placeholder_cta_absent_count)}/${String(pack.scope.slug_count)}.`,
      "PROVEN: conversion_claimed=false; conversion_or_revenue=UNKNOWN.",
      `PROVEN: open SAFE_BUYER_PATH_FAIL buyer-path rows remain ${String(FRIDGE_MODEL_PDP_OPEN_BUYER_PATH_FAIL_COUNT_V1)} (${String(FRIDGE_MODEL_PDP_NEEDS_OWNER_BROWSER_PROOF_COUNT_V1)} need owner browser proof; remain-no-buy=${FRIDGE_MODEL_PDP_REMAIN_NO_BUY_SLUG_V1}).`,
    ],
    unknown_facts: [
      "UNKNOWN: conversion, revenue, ranking, SEO impact, and click-through (not measured by this pack).",
    ],
  };
}

export function loadFridgeModelPdpLiveHtmlProofPackForSpineV1(
  rootDir: string,
): FridgeLiveHtmlProofPackArtifactV1 | null {
  const abs = path.join(rootDir, FRIDGE_TRUTH_SPINE_LIVE_HTML_PROOF_JSON_REL_V1);
  if (!existsSync(abs)) return null;
  try {
    const parsed = JSON.parse(readFileSync(abs, "utf8")) as FridgeLiveHtmlProofPackArtifactV1;
    if (parsed.contract !== FRIDGE_TRUTH_SPINE_LIVE_HTML_PROOF_CONTRACT_V1) return null;
    return parsed;
  } catch {
    return null;
  }
}

function emptyModelPdpCtaGoProofV1(reason: string): FridgeTruthSpineModelPdpCtaGoProofV1 {
  return {
    contract: "UNKNOWN",
    source_artifact_rel: FRIDGE_TRUTH_SPINE_CTA_GO_PROOF_JSON_REL_V1,
    recommended_jq_path: FRIDGE_TRUTH_SPINE_MODEL_PDP_CTA_GO_JQ_PATH_V1,
    status: "UNKNOWN",
    SAFE_BUYER_PATH_PASS: null,
    SAFE_BUYER_PATH_FAIL: null,
    SAFE_BUYER_PATH_UNKNOWN: null,
    remain_no_buy_slug: FRIDGE_MODEL_PDP_REMAIN_NO_BUY_SLUG_V1,
    open_buyer_path_fail_count: FRIDGE_MODEL_PDP_OPEN_BUYER_PATH_FAIL_COUNT_V1,
    pages_claimed_closed: false,
    conversion_claimed: false,
    conversion_or_revenue: "UNKNOWN",
    proven_facts: [],
    unknown_facts: [`UNKNOWN: CTA/go proof pack unavailable (${reason}).`],
  };
}

export function projectFridgeModelPdpCtaGoProofForSpineV1(
  pack: FridgeCtaGoProofPackArtifactV1,
): FridgeTruthSpineModelPdpCtaGoProofV1 {
  if (pack.contract !== FRIDGE_TRUTH_SPINE_CTA_GO_PROOF_CONTRACT_V1) {
    return emptyModelPdpCtaGoProofV1("contract_mismatch");
  }
  const pass = pack.summary?.SAFE_BUYER_PATH_PASS ?? null;
  const fail = pack.summary?.SAFE_BUYER_PATH_FAIL ?? null;
  const unknown = pack.summary?.SAFE_BUYER_PATH_UNKNOWN ?? null;
  return {
    contract: FRIDGE_TRUTH_SPINE_CTA_GO_PROOF_CONTRACT_V1,
    source_artifact_rel: FRIDGE_TRUTH_SPINE_CTA_GO_PROOF_JSON_REL_V1,
    recommended_jq_path: FRIDGE_TRUTH_SPINE_MODEL_PDP_CTA_GO_JQ_PATH_V1,
    status: "PROVEN",
    SAFE_BUYER_PATH_PASS: pass,
    SAFE_BUYER_PATH_FAIL: fail,
    SAFE_BUYER_PATH_UNKNOWN: unknown,
    remain_no_buy_slug: FRIDGE_MODEL_PDP_REMAIN_NO_BUY_SLUG_V1,
    open_buyer_path_fail_count: FRIDGE_MODEL_PDP_OPEN_BUYER_PATH_FAIL_COUNT_V1,
    pages_claimed_closed: false,
    conversion_claimed: false,
    conversion_or_revenue: "UNKNOWN",
    proven_facts: [
      `PROVEN: CTA/go proof PASS=${String(pass)} FAIL=${String(fail)} UNKNOWN=${String(unknown)}.`,
      `PROVEN: remaining SAFE_BUYER_PATH_FAIL is ${FRIDGE_MODEL_PDP_REMAIN_NO_BUY_SLUG_V1} (remain-no-buy); open_buyer_path_fail_count=${String(FRIDGE_MODEL_PDP_OPEN_BUYER_PATH_FAIL_COUNT_V1)}.`,
      "PROVEN: pages_claimed_closed=false; conversion_claimed=false; conversion_or_revenue=UNKNOWN.",
      "PROVEN: do not overclaim the 4 GE MWFP/XWFE model PDPs as revenue/conversion wins.",
    ],
    unknown_facts: [
      "UNKNOWN: conversion, revenue, ranking, SEO impact, and click-through (not measured by CTA/go pack).",
    ],
  };
}

export function loadFridgeModelPdpCtaGoProofPackForSpineV1(
  rootDir: string,
): FridgeCtaGoProofPackArtifactV1 | null {
  const abs = path.join(rootDir, FRIDGE_TRUTH_SPINE_CTA_GO_PROOF_JSON_REL_V1);
  if (!existsSync(abs)) return null;
  try {
    const parsed = JSON.parse(readFileSync(abs, "utf8")) as FridgeCtaGoProofPackArtifactV1;
    if (parsed.contract !== FRIDGE_TRUTH_SPINE_CTA_GO_PROOF_CONTRACT_V1) return null;
    return parsed;
  } catch {
    return null;
  }
}

function emptyGeMwfpXwfeSupabaseSyncV1(reason: string): FridgeTruthSpineGeMwfpXwfeSupabaseSyncV1 {
  return {
    contract: "UNKNOWN",
    source_artifact_rel: FRIDGE_TRUTH_SPINE_GE_MWFP_XWFE_PARITY_JSON_REL_V1,
    recommended_jq_path: FRIDGE_TRUTH_SPINE_GE_MWFP_XWFE_SUPABASE_SYNC_JQ_PATH_V1,
    overall_sync_status: null,
    drift_class: null,
    supabase_sync_apply_status: "UNKNOWN",
    any_supabase_search_placeholder: null,
    dispatch_status: "UNKNOWN",
    selected_subsystem: "none",
    exact_command: "",
    command_surface: "none",
    mutation_allowed: false,
    owner_approval_required: false,
    supabase_write_authorized: false,
    pages_claimed_closed: false,
    conversion_or_revenue: "UNKNOWN",
    filter_slugs: ["smartwater-mwfp", "xwfe"],
    excluded_filter_slugs: ["xwf"],
    affected_model_slugs: [
      "ge-gfe24jgkww",
      "ge-gfe27jmkes",
      "ge-gne25jmkww",
      "ge-pvd28bymfs",
    ],
    success_transition:
      "Owner-review drafts written — founder reviews plan; separate approval required before any Supabase write.",
    failure_transition: "Remain blocked — do not invent Supabase sync or claim pages closed.",
    why_this_is_next: `GE MWFP/XWFE parity projection unavailable (${reason}).`,
    proven_facts: [],
    unknown_facts: [`UNKNOWN: GE MWFP/XWFE parity artifact unavailable (${reason}).`],
  };
}

export function classifyGeMwfpXwfeParityDriftForSpineV1(
  pack: GeMwfpXwfeParityPackForSpineV1,
): FridgeTruthSpineGeMwfpXwfeSupabaseSyncV1["drift_class"] {
  const overall = String(pack.overall_sync_status ?? "UNKNOWN");
  if (overall === "IN_SYNC") return "none";
  if (overall !== "DRIFTED") return null;
  if (pack.any_supabase_search_placeholder === true) return "search_placeholder";
  const mismatched = (pack.filter_rows ?? []).flatMap((row) => row.mismatched_fields ?? []);
  if (mismatched.length === 0) return "other";
  if (mismatched.every((field) => field === "browser_truth_notes")) return "notes_only";
  return "other";
}

export function projectGeMwfpXwfeRetailerLinksSupabaseSyncForSpineV1(
  pack: GeMwfpXwfeParityPackForSpineV1,
  closeout?: GeMwfpXwfeSupabaseSyncCloseoutForSpineV1 | null,
): FridgeTruthSpineGeMwfpXwfeSupabaseSyncV1 {
  if (pack.contract !== FRIDGE_TRUTH_SPINE_GE_MWFP_XWFE_PARITY_CONTRACT_V1) {
    return emptyGeMwfpXwfeSupabaseSyncV1("contract_mismatch");
  }
  const overallRaw = String(pack.overall_sync_status ?? "UNKNOWN");
  const overall: FridgeTruthSpineGeMwfpXwfeSupabaseSyncV1["overall_sync_status"] =
    overallRaw === "DRIFTED" || overallRaw === "IN_SYNC" || overallRaw === "UNKNOWN"
      ? overallRaw
      : null;
  const drift_class = classifyGeMwfpXwfeParityDriftForSpineV1(pack);
  const apply_status =
    closeout?.contract === FRIDGE_TRUTH_SPINE_GE_MWFP_XWFE_SUPABASE_SYNC_CLOSEOUT_CONTRACT_V1 &&
    closeout.apply_status === "APPLIED"
      ? ("APPLIED" as const)
      : closeout?.contract === FRIDGE_TRUTH_SPINE_GE_MWFP_XWFE_SUPABASE_SYNC_CLOSEOUT_CONTRACT_V1
        ? ("NOT_APPLIED" as const)
        : ("UNKNOWN" as const);
  const any_placeholder =
    typeof pack.any_supabase_search_placeholder === "boolean"
      ? pack.any_supabase_search_placeholder
      : null;

  const base = {
    contract: FRIDGE_TRUTH_SPINE_GE_MWFP_XWFE_PARITY_CONTRACT_V1,
    source_artifact_rel: FRIDGE_TRUTH_SPINE_GE_MWFP_XWFE_PARITY_JSON_REL_V1,
    recommended_jq_path: FRIDGE_TRUTH_SPINE_GE_MWFP_XWFE_SUPABASE_SYNC_JQ_PATH_V1,
    overall_sync_status: overall,
    drift_class,
    supabase_sync_apply_status: apply_status,
    any_supabase_search_placeholder: any_placeholder,
    mutation_allowed: false as const,
    owner_approval_required: false as const,
    supabase_write_authorized: false as const,
    pages_claimed_closed: false as const,
    conversion_or_revenue: "UNKNOWN" as const,
    filter_slugs: ["smartwater-mwfp", "xwfe"] as const,
    excluded_filter_slugs: ["xwf"] as const,
    affected_model_slugs: [
      "ge-gfe24jgkww",
      "ge-gfe27jmkes",
      "ge-gne25jmkww",
      "ge-pvd28bymfs",
    ] as const,
  };

  // Applied sync (or notes-only residual) must not re-surface owner-review/write dispatch.
  if (apply_status === "APPLIED" || drift_class === "notes_only" || overall === "IN_SYNC") {
    const why =
      apply_status === "APPLIED"
        ? "GE MWFP/XWFE Supabase URL sync apply closeout is APPLIED (exactly smartwater-mwfp + xwfe). Residual notes-only drift is not a re-write trigger; do not re-run sync owner-review/write; do not claim 4 GE pages closed."
        : drift_class === "notes_only"
          ? "GE MWFP/XWFE parity residual is notes-only (browser_truth_notes); any_supabase_search_placeholder=false. Sync owner-review/write is NOT_NEEDED."
          : "GE MWFP/XWFE Supabase parity is IN_SYNC — sync owner-review stage not required from this projector.";
    return {
      ...base,
      dispatch_status: "NOT_NEEDED",
      selected_subsystem: "none",
      exact_command: "",
      command_surface: "none",
      success_transition:
        "Keep ge-gte18gsnrss remain-no-buy; treat CTA/go PASS 27 / FAIL 1 as artifact-backed; do not invent live-HTML allowlist expansion or conversion claims.",
      failure_transition:
        "Do not re-open completed Supabase sync write; do not claim 4 GE pages closed as revenue wins.",
      why_this_is_next: why,
      proven_facts: [
        `PROVEN: overall_sync_status=${String(overall)}; drift_class=${String(drift_class)}; supabase_sync_apply_status=${apply_status}.`,
        `PROVEN: any_supabase_search_placeholder=${String(any_placeholder)}.`,
        "PROVEN: dispatch_status=NOT_NEEDED; exact_command empty; mutation_allowed=false; supabase_write_authorized=false.",
        "PROVEN: pages_claimed_closed=false; conversion_or_revenue=UNKNOWN; do not overclaim 4 affected GE model PDPs.",
      ],
      unknown_facts: [
        "UNKNOWN: conversion/revenue impact of the applied Supabase URL sync.",
        "UNKNOWN: production live HTML coverage beyond the committed 21-slug proof allowlist (expanding allowlist is a separate lane).",
      ],
    };
  }

  if (overall === "DRIFTED" && drift_class === "search_placeholder") {
    return {
      ...base,
      dispatch_status: "READY",
      selected_subsystem: "ge_mwfp_xwfe_retailer_links_supabase_sync_owner_review",
      exact_command: FRIDGE_TRUTH_SPINE_GE_MWFP_XWFE_SUPABASE_SYNC_OWNER_REVIEW_EXACT_COMMAND_V1,
      command_surface: "terminal",
      success_transition:
        "Owner-review JSON/MD drafts written under data/fridge/batch-production/drafts/; hard-stop before Supabase write / founder approval.",
      failure_transition:
        "Remain DRIFTED — re-run parity proof; do not broaden scope or claim 4 GE pages closed.",
      why_this_is_next:
        "CSV GE MWFP/XWFE retailer_links are applied but Supabase/runtime remain DRIFTED (search-placeholder). Next safe stage is read-only Supabase sync owner-review for exactly smartwater-mwfp + xwfe.",
      proven_facts: [
        "PROVEN: overall_sync_status=DRIFTED with search-placeholder from GE MWFP/XWFE parity artifact.",
        "PROVEN: dispatch_status=READY; exact_command writes owner-review drafts only; mutation_allowed=false; supabase_write_authorized=false.",
        "PROVEN: scope smartwater-mwfp + xwfe; xwf excluded; 4 affected GE model slugs; pages_claimed_closed=false; conversion_or_revenue=UNKNOWN.",
      ],
      unknown_facts: [
        "UNKNOWN: conversion/revenue impact of a future authorized Supabase sync.",
        "UNKNOWN: whether CTA/go FAIL clears after a future sync — must re-proof.",
      ],
    };
  }

  if (overall === "DRIFTED") {
    return {
      ...base,
      dispatch_status: "BLOCKED",
      selected_subsystem: "none",
      exact_command: "",
      command_surface: "none",
      success_transition: "Re-classify drift; do not auto-dispatch sync owner-review for non-placeholder residual.",
      failure_transition: "Remain blocked — do not invent Supabase sync or claim pages closed.",
      why_this_is_next:
        "GE MWFP/XWFE parity is DRIFTED but not classified as search-placeholder — resolve drift class before sync owner-review.",
      proven_facts: [
        `PROVEN: overall_sync_status=DRIFTED; drift_class=${String(drift_class)}; sync owner-review not auto-dispatched.`,
      ],
      unknown_facts: ["UNKNOWN: conversion/revenue; do not claim 4 GE pages closed."],
    };
  }

  return {
    ...emptyGeMwfpXwfeSupabaseSyncV1(`overall_sync_status=${overallRaw}`),
    contract: FRIDGE_TRUTH_SPINE_GE_MWFP_XWFE_PARITY_CONTRACT_V1,
    overall_sync_status: overall,
    drift_class,
    supabase_sync_apply_status: apply_status,
    any_supabase_search_placeholder: any_placeholder,
    dispatch_status: "BLOCKED",
    why_this_is_next:
      "GE MWFP/XWFE parity is not DRIFTED search-placeholder — resolve UNKNOWN/unavailable DB or re-run parity before sync owner-review.",
  };
}

export function loadGeMwfpXwfeParityPackForSpineV1(
  rootDir: string,
): GeMwfpXwfeParityPackForSpineV1 | null {
  const abs = path.join(rootDir, FRIDGE_TRUTH_SPINE_GE_MWFP_XWFE_PARITY_JSON_REL_V1);
  if (!existsSync(abs)) return null;
  try {
    return JSON.parse(readFileSync(abs, "utf8")) as GeMwfpXwfeParityPackForSpineV1;
  } catch {
    return null;
  }
}

export function loadGeMwfpXwfeSupabaseSyncCloseoutForSpineV1(
  rootDir: string,
): GeMwfpXwfeSupabaseSyncCloseoutForSpineV1 | null {
  const abs = path.join(rootDir, FRIDGE_TRUTH_SPINE_GE_MWFP_XWFE_SUPABASE_SYNC_CLOSEOUT_JSON_REL_V1);
  if (!existsSync(abs)) return null;
  try {
    return JSON.parse(readFileSync(abs, "utf8")) as GeMwfpXwfeSupabaseSyncCloseoutForSpineV1;
  } catch {
    return null;
  }
}

export function buildFridgeTruthSpineUnknownV1(args: {
  generated_at: string;
  reason: string;
}): FridgeTruthSpineV1 {
  return {
    contract: FRIDGE_TRUTH_SPINE_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    generated_at: args.generated_at,
    source_contracts: [],
    csv_truth: {
      safe_buyer_path_verdict: "UNKNOWN",
      linked_filters_with_safe_direct_buyable_primary: 0,
      primary_weak_reason_counts: {},
    },
    evidence_truth: {
      win_artifact_count: 0,
      linked_slugs_with_evidence_win_count: 0,
    },
    supabase_csv_diff: {
      supabase_truth_status: "UNKNOWN",
      checked_slug_count: 0,
      supabase_has_win_csv_missing_count: 0,
      evidence_only_not_in_supabase_count: 0,
      evidence_only_slugs: [...FRIDGE_EVIDENCE_ONLY_MISMATCH_SLUGS_V1],
    },
    public_truth: {
      public_truth_status: "UNKNOWN",
      live_page_check_status: "UNKNOWN_NOT_CHECKED",
      checked_slug_count: 0,
      should_redo_fridge_products_now: "UNKNOWN",
    },
    model_pdp_live_html_proof: emptyModelPdpLiveHtmlProofV1(args.reason),
    model_pdp_cta_go_proof: emptyModelPdpCtaGoProofV1(args.reason),
    ge_mwfp_xwfe_retailer_links_supabase_sync: emptyGeMwfpXwfeSupabaseSyncV1(args.reason),
    recommended_next_action: FRIDGE_TRUTH_SPINE_RECOMMENDED_NEXT_ACTION_V1,
    truth_first_notes: [...FRIDGE_TRUTH_SPINE_TRUTH_FIRST_NOTES_V1],
    proven_facts: [],
    inferred_facts: [],
    unknown_facts: [`UNKNOWN: fridge_truth_spine_v1 failed: ${args.reason}`],
  };
}

export async function buildFridgeTruthSpineV1(
  args: BuildFridgeTruthSpineV1Args,
): Promise<FridgeTruthSpineV1> {
  const now = args.now ?? (() => new Date());
  const generated_at = now().toISOString();

  const modelAudit = buildRefrigeratorModelFirstTruthAuditV1({ rootDir: args.rootDir, now });
  const reconciliation = buildFridgeTruthReconciliationV1({ rootDir: args.rootDir, now });
  const diff = await buildFridgeSupabaseVsCsvRetailerLinksDiffV1({ rootDir: args.rootDir, deps: { now } });
  const publicAudit = await buildFridgeCommandCenterAndPublicTruthAuditV1({
    rootDir: args.rootDir,
    deps: {
      now,
      buildDiff: async () => diff,
      probeLivePage: async () => ({
        http_status: null,
        error: args.skipLivePublicProbe === false ? null : "skipped_for_command_center_spine",
      }),
      env:
        args.skipLivePublicProbe === false
          ? process.env
          : ({ NODE_ENV: "production" } as NodeJS.ProcessEnv),
    },
  });

  const livePack =
    args.loadLiveHtmlProofPack?.() ?? loadFridgeModelPdpLiveHtmlProofPackForSpineV1(args.rootDir);
  const model_pdp_live_html_proof = livePack
    ? projectFridgeModelPdpLiveHtmlProofForSpineV1(livePack)
    : emptyModelPdpLiveHtmlProofV1("missing_or_unreadable_artifact");

  const ctaPack =
    args.loadCtaGoProofPack?.() ?? loadFridgeModelPdpCtaGoProofPackForSpineV1(args.rootDir);
  const model_pdp_cta_go_proof = ctaPack
    ? projectFridgeModelPdpCtaGoProofForSpineV1(ctaPack)
    : emptyModelPdpCtaGoProofV1("missing_or_unreadable_artifact");

  const geParityPack =
    args.loadGeMwfpXwfeParityPack?.() ?? loadGeMwfpXwfeParityPackForSpineV1(args.rootDir);
  const geCloseout =
    args.loadGeMwfpXwfeSupabaseSyncCloseout?.() ??
    loadGeMwfpXwfeSupabaseSyncCloseoutForSpineV1(args.rootDir);
  const ge_mwfp_xwfe_retailer_links_supabase_sync = geParityPack
    ? projectGeMwfpXwfeRetailerLinksSupabaseSyncForSpineV1(geParityPack, geCloseout)
    : emptyGeMwfpXwfeSupabaseSyncV1("missing_or_unreadable_artifact");

  const proven_facts = [
    `PROVEN: committed CSV has ${modelAudit.linked_filters_with_safe_direct_buyable_primary}/${modelAudit.unique_linked_filter_slugs} safe direct-buyable primaries; verdict=${modelAudit.safe_buyer_path_verdict}.`,
    `PROVEN: ${reconciliation.prior_win_artifact_summary.linked_filter_slugs_with_evidence_win.length} linked slug(s) with evidence-win artifacts; CSV direct_buyable anywhere=${reconciliation.csv_truth_summary.filters_with_direct_buyable_anywhere_count}.`,
    `PROVEN: Supabase-vs-CSV diff ${diff.supabase_has_win_csv_missing_count}/${diff.checked_slug_count} SUPABASE_HAS_WIN_CSV_MISSING; evidence-only=${diff.evidence_only_not_in_supabase_count}.`,
    `PROVEN: Public truth simulation ${publicAudit.public_truth_status}; should_redo_fridge_products_now=${publicAudit.should_redo_fridge_products_now}.`,
    ...model_pdp_live_html_proof.proven_facts,
    ...model_pdp_cta_go_proof.proven_facts,
    ...ge_mwfp_xwfe_retailer_links_supabase_sync.proven_facts,
    "PROVEN: This lane does not authorize CSV export, apply, or Supabase mutation.",
  ];

  const inferred_facts = [
    "INFERRED: Live public pages use Supabase retailer_links through filterRealBuyRetailerLinks (not committed CSV).",
  ];

  const unknown_facts: string[] = [
    ...model_pdp_live_html_proof.unknown_facts,
    ...model_pdp_cta_go_proof.unknown_facts,
    ...ge_mwfp_xwfe_retailer_links_supabase_sync.unknown_facts,
  ];
  if (publicAudit.live_page_check_status === "UNKNOWN_NOT_CHECKED") {
    unknown_facts.push(
      "UNKNOWN: Live HTTP checks for all evidence-win /filter/{slug} pages were skipped in Command Center spine build; run report-fridge-command-center-and-public-truth-audit-v1 for full live proof.",
    );
  }
  if (diff.supabase_truth_status === "UNKNOWN_DB_UNAVAILABLE") {
    unknown_facts.push(
      `UNKNOWN: Supabase retailer_links diff unavailable (${diff.supabase_unavailable_reason ?? "no reason"}).`,
    );
  }

  const recommended_next_action =
    ge_mwfp_xwfe_retailer_links_supabase_sync.dispatch_status === "READY"
      ? `Run ${ge_mwfp_xwfe_retailer_links_supabase_sync.exact_command}; hard-stop before Supabase write / founder approval; do not claim conversion/revenue; do not apply links without founder approval; do not claim 4 GE pages closed.`
      : FRIDGE_TRUTH_SPINE_RECOMMENDED_NEXT_ACTION_V1;

  return {
    contract: FRIDGE_TRUTH_SPINE_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    generated_at,
    source_contracts: [
      modelAudit.contract,
      reconciliation.contract,
      diff.contract,
      publicAudit.contract,
      ...(livePack ? [livePack.contract] : []),
      ...(ctaPack ? [ctaPack.contract] : []),
      ...(geParityPack?.contract ? [geParityPack.contract] : []),
      ...(geCloseout?.contract === FRIDGE_TRUTH_SPINE_GE_MWFP_XWFE_SUPABASE_SYNC_CLOSEOUT_CONTRACT_V1
        ? [geCloseout.contract]
        : []),
    ],
    csv_truth: {
      safe_buyer_path_verdict: modelAudit.safe_buyer_path_verdict,
      linked_filters_with_safe_direct_buyable_primary:
        modelAudit.linked_filters_with_safe_direct_buyable_primary,
      primary_weak_reason_counts:
        modelAudit.diagnostic_crosscheck_summary.primary_weak_reason_counts,
    },
    evidence_truth: {
      win_artifact_count: reconciliation.evidence_truth_summary.win_artifact_count,
      linked_slugs_with_evidence_win_count:
        reconciliation.prior_win_artifact_summary.linked_filter_slugs_with_evidence_win.length,
    },
    supabase_csv_diff: {
      supabase_truth_status: diff.supabase_truth_status,
      checked_slug_count: diff.checked_slug_count,
      supabase_has_win_csv_missing_count: diff.supabase_has_win_csv_missing_count,
      evidence_only_not_in_supabase_count: diff.evidence_only_not_in_supabase_count,
      evidence_only_slugs: [...FRIDGE_EVIDENCE_ONLY_MISMATCH_SLUGS_V1],
    },
    public_truth: {
      public_truth_status: publicAudit.public_truth_status,
      live_page_check_status: publicAudit.live_page_check_status,
      checked_slug_count: publicAudit.checked_slug_count,
      should_redo_fridge_products_now: publicAudit.should_redo_fridge_products_now,
    },
    model_pdp_live_html_proof,
    model_pdp_cta_go_proof,
    ge_mwfp_xwfe_retailer_links_supabase_sync,
    recommended_next_action,
    truth_first_notes: [...FRIDGE_TRUTH_SPINE_TRUTH_FIRST_NOTES_V1],
    proven_facts,
    inferred_facts,
    unknown_facts,
  };
}
