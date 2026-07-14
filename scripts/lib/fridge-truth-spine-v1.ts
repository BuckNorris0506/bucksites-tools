import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { buildFridgeCommandCenterAndPublicTruthAuditV1 } from "./fridge-command-center-and-public-truth-audit-v1";
import { buildFridgeSupabaseVsCsvRetailerLinksDiffV1 } from "./fridge-supabase-vs-csv-retailer-links-diff-v1";
import { buildFridgeTruthReconciliationV1 } from "./fridge-truth-reconciliation-v1";
import { buildRefrigeratorModelFirstTruthAuditV1 } from "./refrigerator-model-first-truth-audit-v1";

export const FRIDGE_TRUTH_SPINE_CONTRACT_V1 = "fridge_truth_spine_v1" as const;

export const FRIDGE_TRUTH_SPINE_RECOMMENDED_NEXT_ACTION_V1 =
  "Owner browser proof for the 6 remaining SAFE_BUYER_PATH_FAIL GE models; keep ge-gte18gsnrss remain-no-buy; do not claim conversion/revenue; do not apply links without founder approval." as const;

/** jq path for Command Center live HTML proof milestone (nested under fridge_truth_spine_v1). */
export const FRIDGE_TRUTH_SPINE_MODEL_PDP_LIVE_HTML_PROOF_JQ_PATH_V1 =
  ".command_center_v2.fridge_truth_spine_v1.model_pdp_live_html_proof" as const;

/** Artifact-backed live HTML proof (string literals only — avoid importing the fetch pack into Next typecheck). */
export const FRIDGE_TRUTH_SPINE_LIVE_HTML_PROOF_CONTRACT_V1 =
  "buckparts_fridge_model_pdp_live_html_proof_pack_v1" as const;
export const FRIDGE_TRUTH_SPINE_LIVE_HTML_PROOF_JSON_REL_V1 =
  "data/fridge/batch-production/drafts/buckparts-fridge-model-pdp-live-html-proof-pack-v1.json" as const;

/** GE MWFP/XWFE scoped parity artifact (string literals — avoid importing parity lib into Next typecheck). */
export const FRIDGE_TRUTH_SPINE_GE_MWFP_XWFE_PARITY_CONTRACT_V1 =
  "buckparts_fridge_model_pdp_ge_mwfp_xwfe_retailer_links_supabase_parity_v1" as const;
export const FRIDGE_TRUTH_SPINE_GE_MWFP_XWFE_PARITY_JSON_REL_V1 =
  "data/fridge/batch-production/drafts/buckparts-fridge-model-pdp-ge-mwfp-xwfe-retailer-links-supabase-parity-v1.json" as const;
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

/** Bound to CTA/go FAIL + research/gap packets — not inventively expanded here. */
export const FRIDGE_MODEL_PDP_OPEN_BUYER_PATH_FAIL_COUNT_V1 = 7 as const;
export const FRIDGE_MODEL_PDP_REMAIN_NO_BUY_SLUG_V1 = "ge-gte18gsnrss" as const;
export const FRIDGE_MODEL_PDP_NEEDS_OWNER_BROWSER_PROOF_COUNT_V1 = 6 as const;

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
  /**
   * When GE MWFP/XWFE parity is DRIFTED, surfaces READY exact_command for read-only
   * Supabase sync owner-review (Command Center / dispatch runner). Hard-stop before write.
   */
  ge_mwfp_xwfe_retailer_links_supabase_sync: FridgeTruthSpineGeMwfpXwfeSupabaseSyncV1;
  recommended_next_action: string;
  truth_first_notes: string[];
  proven_facts: string[];
  inferred_facts: string[];
  unknown_facts: string[];
};

export type FridgeTruthSpineGeMwfpXwfeSupabaseSyncV1 = {
  contract: typeof FRIDGE_TRUTH_SPINE_GE_MWFP_XWFE_PARITY_CONTRACT_V1 | "UNKNOWN";
  source_artifact_rel: typeof FRIDGE_TRUTH_SPINE_GE_MWFP_XWFE_PARITY_JSON_REL_V1;
  recommended_jq_path: typeof FRIDGE_TRUTH_SPINE_GE_MWFP_XWFE_SUPABASE_SYNC_JQ_PATH_V1;
  overall_sync_status: "DRIFTED" | "IN_SYNC" | "UNKNOWN" | null;
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

export type BuildFridgeTruthSpineV1Args = {
  rootDir: string;
  now?: () => Date;
  /** Command Center skips live HTTP probes; public truth uses Supabase-gated simulation. */
  skipLivePublicProbe?: boolean;
  /** Test override: inject live HTML proof pack instead of reading draft JSON. */
  loadLiveHtmlProofPack?: () => FridgeLiveHtmlProofPackArtifactV1 | null;
  /** Test override: inject GE MWFP/XWFE parity artifact instead of reading draft JSON. */
  loadGeMwfpXwfeParityPack?: () => {
    contract?: string;
    overall_sync_status?: string;
  } | null;
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

function emptyGeMwfpXwfeSupabaseSyncV1(reason: string): FridgeTruthSpineGeMwfpXwfeSupabaseSyncV1 {
  return {
    contract: "UNKNOWN",
    source_artifact_rel: FRIDGE_TRUTH_SPINE_GE_MWFP_XWFE_PARITY_JSON_REL_V1,
    recommended_jq_path: FRIDGE_TRUTH_SPINE_GE_MWFP_XWFE_SUPABASE_SYNC_JQ_PATH_V1,
    overall_sync_status: null,
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

export function projectGeMwfpXwfeRetailerLinksSupabaseSyncForSpineV1(pack: {
  contract?: string;
  overall_sync_status?: string;
}): FridgeTruthSpineGeMwfpXwfeSupabaseSyncV1 {
  if (pack.contract !== FRIDGE_TRUTH_SPINE_GE_MWFP_XWFE_PARITY_CONTRACT_V1) {
    return emptyGeMwfpXwfeSupabaseSyncV1("contract_mismatch");
  }
  const overall = String(pack.overall_sync_status ?? "UNKNOWN");
  if (overall === "DRIFTED") {
    return {
      contract: FRIDGE_TRUTH_SPINE_GE_MWFP_XWFE_PARITY_CONTRACT_V1,
      source_artifact_rel: FRIDGE_TRUTH_SPINE_GE_MWFP_XWFE_PARITY_JSON_REL_V1,
      recommended_jq_path: FRIDGE_TRUTH_SPINE_GE_MWFP_XWFE_SUPABASE_SYNC_JQ_PATH_V1,
      overall_sync_status: "DRIFTED",
      dispatch_status: "READY",
      selected_subsystem: "ge_mwfp_xwfe_retailer_links_supabase_sync_owner_review",
      exact_command: FRIDGE_TRUTH_SPINE_GE_MWFP_XWFE_SUPABASE_SYNC_OWNER_REVIEW_EXACT_COMMAND_V1,
      command_surface: "terminal",
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
        "Owner-review JSON/MD drafts written under data/fridge/batch-production/drafts/; hard-stop before Supabase write / founder approval.",
      failure_transition:
        "Remain DRIFTED — re-run parity proof; do not broaden scope or claim 4 GE pages closed.",
      why_this_is_next:
        "CSV GE MWFP/XWFE retailer_links are applied but Supabase/runtime remain DRIFTED (search-placeholder). Next safe stage is read-only Supabase sync owner-review for exactly smartwater-mwfp + xwfe.",
      proven_facts: [
        "PROVEN: overall_sync_status=DRIFTED from committed GE MWFP/XWFE parity artifact.",
        "PROVEN: dispatch_status=READY; exact_command writes owner-review drafts only; mutation_allowed=false; supabase_write_authorized=false.",
        "PROVEN: scope smartwater-mwfp + xwfe; xwf excluded; 4 affected GE model slugs; pages_claimed_closed=false; conversion_or_revenue=UNKNOWN.",
      ],
      unknown_facts: [
        "UNKNOWN: conversion/revenue impact of a future authorized Supabase sync.",
        "UNKNOWN: whether CTA/go FAIL 7 clears after a future sync — must re-proof.",
      ],
    };
  }
  if (overall === "IN_SYNC") {
    return {
      ...emptyGeMwfpXwfeSupabaseSyncV1("in_sync"),
      contract: FRIDGE_TRUTH_SPINE_GE_MWFP_XWFE_PARITY_CONTRACT_V1,
      overall_sync_status: "IN_SYNC",
      dispatch_status: "NOT_NEEDED",
      why_this_is_next:
        "GE MWFP/XWFE Supabase parity is IN_SYNC — sync owner-review stage not required from this projector.",
      proven_facts: ["PROVEN: overall_sync_status=IN_SYNC from GE MWFP/XWFE parity artifact."],
      unknown_facts: ["UNKNOWN: conversion/revenue; do not claim 4 GE pages closed from IN_SYNC alone."],
    };
  }
  return {
    ...emptyGeMwfpXwfeSupabaseSyncV1(`overall_sync_status=${overall}`),
    contract: FRIDGE_TRUTH_SPINE_GE_MWFP_XWFE_PARITY_CONTRACT_V1,
    overall_sync_status: overall === "UNKNOWN" ? "UNKNOWN" : null,
    dispatch_status: "BLOCKED",
    why_this_is_next:
      "GE MWFP/XWFE parity is not DRIFTED — resolve UNKNOWN/unavailable DB or re-run parity before sync owner-review.",
  };
}

export function loadGeMwfpXwfeParityPackForSpineV1(rootDir: string): {
  contract?: string;
  overall_sync_status?: string;
} | null {
  const abs = path.join(rootDir, FRIDGE_TRUTH_SPINE_GE_MWFP_XWFE_PARITY_JSON_REL_V1);
  if (!existsSync(abs)) return null;
  try {
    return JSON.parse(readFileSync(abs, "utf8")) as {
      contract?: string;
      overall_sync_status?: string;
    };
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

  const geParityPack =
    args.loadGeMwfpXwfeParityPack?.() ?? loadGeMwfpXwfeParityPackForSpineV1(args.rootDir);
  const ge_mwfp_xwfe_retailer_links_supabase_sync = geParityPack
    ? projectGeMwfpXwfeRetailerLinksSupabaseSyncForSpineV1(geParityPack)
    : emptyGeMwfpXwfeSupabaseSyncV1("missing_or_unreadable_artifact");

  const proven_facts = [
    `PROVEN: committed CSV has ${modelAudit.linked_filters_with_safe_direct_buyable_primary}/${modelAudit.unique_linked_filter_slugs} safe direct-buyable primaries; verdict=${modelAudit.safe_buyer_path_verdict}.`,
    `PROVEN: ${reconciliation.prior_win_artifact_summary.linked_filter_slugs_with_evidence_win.length} linked slug(s) with evidence-win artifacts; CSV direct_buyable anywhere=${reconciliation.csv_truth_summary.filters_with_direct_buyable_anywhere_count}.`,
    `PROVEN: Supabase-vs-CSV diff ${diff.supabase_has_win_csv_missing_count}/${diff.checked_slug_count} SUPABASE_HAS_WIN_CSV_MISSING; evidence-only=${diff.evidence_only_not_in_supabase_count}.`,
    `PROVEN: Public truth simulation ${publicAudit.public_truth_status}; should_redo_fridge_products_now=${publicAudit.should_redo_fridge_products_now}.`,
    ...model_pdp_live_html_proof.proven_facts,
    ...ge_mwfp_xwfe_retailer_links_supabase_sync.proven_facts,
    "PROVEN: This lane does not authorize CSV export, apply, or Supabase mutation.",
  ];

  const inferred_facts = [
    "INFERRED: Live public pages use Supabase retailer_links through filterRealBuyRetailerLinks (not committed CSV).",
  ];

  const unknown_facts: string[] = [
    ...model_pdp_live_html_proof.unknown_facts,
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
      ...(geParityPack?.contract ? [geParityPack.contract] : []),
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
    ge_mwfp_xwfe_retailer_links_supabase_sync,
    recommended_next_action,
    truth_first_notes: [...FRIDGE_TRUTH_SPINE_TRUTH_FIRST_NOTES_V1],
    proven_facts,
    inferred_facts,
    unknown_facts,
  };
}
