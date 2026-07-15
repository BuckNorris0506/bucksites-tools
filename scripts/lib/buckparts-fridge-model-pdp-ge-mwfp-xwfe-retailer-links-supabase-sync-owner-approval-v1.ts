/**
 * Founder approval for future guarded Supabase public.retailer_links UPDATE of
 * smartwater-mwfp + xwfe primaries only. Does not apply or mutate.
 */

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { FOUNDER_DECISION_REGISTRY_CONTRACT_V1 } from "../../src/lib/owner-dashboard/founder-decision-registry-v1";
import {
  BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_OWNER_APPROVAL_AFFECTED_SLUGS_V1,
  BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_OWNER_APPROVAL_BROWSER_TRUTH_V1,
  BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_OWNER_APPROVAL_EXCLUSIONS_V1,
  BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_OWNER_APPROVAL_FILTERS_V1,
  BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_OWNER_APPROVAL_RETAILER_KEY_V1,
  BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_OWNER_APPROVAL_RETAILER_NAME_V1,
  BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_OWNER_APPROVAL_URLS_V1,
} from "./buckparts-fridge-model-pdp-ge-mwfp-xwfe-retailer-links-owner-approval-v1";
import {
  BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_PARITY_CONTRACT_V1,
  BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_PARITY_JSON_REL_V1,
} from "./buckparts-fridge-model-pdp-ge-mwfp-xwfe-retailer-links-supabase-parity-v1";
import {
  BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_SYNC_OWNER_REVIEW_CONTRACT_V1,
  BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_SYNC_OWNER_REVIEW_JSON_REL_V1,
  type GeMwfpXwfeRetailerLinksSupabaseSyncOwnerReviewV1,
} from "./buckparts-fridge-model-pdp-ge-mwfp-xwfe-retailer-links-supabase-sync-owner-review-v1";
import {
  BUCKPARTS_FRIDGE_MODEL_PDP_OWNER_BROWSER_PROOF_RESULT_CONTRACT_V1,
  BUCKPARTS_FRIDGE_MODEL_PDP_OWNER_BROWSER_PROOF_RESULT_JSON_REL_V1,
  type BuckpartsFridgeModelPdpOwnerBrowserProofResultPacketV1,
} from "./buckparts-fridge-model-pdp-owner-browser-proof-result-packet-v1";

export const BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_SYNC_OWNER_APPROVAL_CONTRACT_V1 =
  "buckparts_fridge_model_pdp_ge_mwfp_xwfe_retailer_links_supabase_sync_owner_approval_v1" as const;

export const BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_SYNC_OWNER_APPROVAL_SOURCE_COMMAND_V1 =
  "npm run buckparts:fridge-model-pdp-ge-mwfp-xwfe-retailer-links-supabase-sync-owner-approval" as const;

export const BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_SYNC_OWNER_APPROVAL_JSON_REL_V1 =
  "data/owner-decisions/buckparts-fridge-model-pdp-ge-mwfp-xwfe-retailer-links-supabase-sync-owner-approval-v1.json" as const;

export const BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_SYNC_OWNER_APPROVAL_MD_REL_V1 =
  "data/owner-decisions/buckparts-fridge-model-pdp-ge-mwfp-xwfe-retailer-links-supabase-sync-owner-approval-v1.md" as const;

export const BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_SYNC_OWNER_APPROVAL_ALLOWED_WRITE_REL_PATHS_V1 =
  [
    BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_SYNC_OWNER_APPROVAL_JSON_REL_V1,
    BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_SYNC_OWNER_APPROVAL_MD_REL_V1,
  ] as const;

export const BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_SYNC_OWNER_APPROVAL_DECISION_ID_V1 =
  "decision-2026-07-14-ge-mwfp-xwfe-retailer-links-supabase-sync-approve" as const;

/** Match committed CSV primary browser_truth_checked_at from approved GE CSV apply closeout. */
export const BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_SYNC_OWNER_APPROVAL_BROWSER_TRUTH_CHECKED_AT_V1 =
  "2026-07-14T17:40:40.135Z" as const;

const AFFECTED_BY_FILTER_V1 = {
  "smartwater-mwfp": ["ge-gfe24jgkww"],
  xwfe: [
    "ge-gfe24jgkww",
    "ge-gfe27jmkes",
    "ge-gne25jmkww",
    "ge-pvd28bymfs",
  ],
} as const;

export type BoundArtifactSha256V1 = {
  artifact_rel_path: string;
  sha256_at_binding: string;
  entry_type: "apply_plan" | "evidence" | "parity_proof";
};

export type GeMwfpXwfeSupabaseSyncApprovedDeltaV1 = {
  filter_slug: (typeof BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_OWNER_APPROVAL_FILTERS_V1)[number];
  change_kind: "update_existing_primary_row";
  supabase_link_id: string;
  proposed_affiliate_url: string;
  proposed_retailer_name: typeof BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_OWNER_APPROVAL_RETAILER_NAME_V1;
  proposed_retailer_key: typeof BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_OWNER_APPROVAL_RETAILER_KEY_V1;
  proposed_browser_truth_classification: typeof BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_OWNER_APPROVAL_BROWSER_TRUTH_V1;
  proposed_browser_truth_checked_at: typeof BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_SYNC_OWNER_APPROVAL_BROWSER_TRUTH_CHECKED_AT_V1;
  proposed_browser_truth_notes: string;
  affected_model_slugs: string[];
};

export type GeMwfpXwfeRetailerLinksSupabaseSyncOwnerApprovalContextV1 = {
  founder_option_id: "approve_ge_mwfp_xwfe_retailer_links_supabase_sync_updates";
  option_id: "approve_ge_mwfp_xwfe_retailer_links_supabase_sync_updates";
  owner_review_plan_rel_path: typeof BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_SYNC_OWNER_REVIEW_JSON_REL_V1;
  owner_browser_proof_result_rel_path: typeof BUCKPARTS_FRIDGE_MODEL_PDP_OWNER_BROWSER_PROOF_RESULT_JSON_REL_V1;
  parity_artifact_rel_path: typeof BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_PARITY_JSON_REL_V1;
  owner_review_plan_contract: typeof BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_SYNC_OWNER_REVIEW_CONTRACT_V1;
  owner_browser_proof_result_contract: typeof BUCKPARTS_FRIDGE_MODEL_PDP_OWNER_BROWSER_PROOF_RESULT_CONTRACT_V1;
  parity_artifact_contract: typeof BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_PARITY_CONTRACT_V1;
  target_table: "public.retailer_links";
  approved_filter_slugs: readonly string[];
  approved_updates: 2;
  approved_inserts: 0;
  approved_deletes: 0;
  approved_deltas: GeMwfpXwfeSupabaseSyncApprovedDeltaV1[];
  affected_potentially_closable_model_slugs: readonly string[];
  exclusions: readonly string[];
  allowed_future_mutation_type: "supabase_retailer_links_update_existing_primary_only";
  supabase_retailer_links_update_authorized_when_guarded_apply_runs: true;
  retailer_links_csv_mutation_authorized: false;
  retailer_links_insert_authorized: false;
  retailer_links_delete_authorized: false;
  supabase_mutation_authorized: false;
  supabase_compatibility_mutation_authorized: false;
  csv_compatibility_mutation_authorized: false;
  buy_cta_expansion_authorized: false;
  sitemap_robots_mutation_authorized: false;
  product_json_ld_mutation_authorized: false;
  deploy_mutation_authorized: false;
  xwf_promotion_authorized: false;
  pages_claimed_closed: false;
  buyer_path_claimed_closed: false;
  conversion_claimed: false;
  mutation_authorized: false;
  apply_authorized: false;
  apply_not_executed: true;
  autonomous_apply_authorized: false;
  separate_guarded_apply_executor_required: true;
  owner_approved_by: "Jared";
  approved_at: string;
};

export type GeMwfpXwfeRetailerLinksSupabaseSyncOwnerApprovalRegistryDocV1 = {
  contract: typeof FOUNDER_DECISION_REGISTRY_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  packet_contract: typeof BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_SYNC_OWNER_APPROVAL_CONTRACT_V1;
  generated_at: string;
  source_command: typeof BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_SYNC_OWNER_APPROVAL_SOURCE_COMMAND_V1;
  apply_authorized: false;
  mutation_authorized: false;
  rows: Array<{
    decision_id: typeof BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_SYNC_OWNER_APPROVAL_DECISION_ID_V1;
    source_queue_row_id: "queue-buckparts-fridge-model-pdp-ge-mwfp-xwfe-retailer-links-supabase-sync";
    source_decision_packet_id: typeof BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_SYNC_OWNER_APPROVAL_CONTRACT_V1;
    decided_at: string;
    decision_status: "approved";
    owner_note: string;
    allowed_next_scope: "owner_mutation_approved";
    evidence_required_before_mutation: true;
    expires_at: string;
    prohibited_actions_still_apply: string[];
    buckparts_fridge_model_pdp_ge_mwfp_xwfe_retailer_links_supabase_sync_owner_approval_context_v1: GeMwfpXwfeRetailerLinksSupabaseSyncOwnerApprovalContextV1;
    bound_artifacts_v1: BoundArtifactSha256V1[];
  }>;
  proven_facts: string[];
  unknown_facts: string[];
  risk_notes: string[];
};

export type BuildGeMwfpXwfeSupabaseSyncOwnerApprovalDepsV1 = {
  rootDir: string;
  now?: () => Date;
  readText?: (abs: string) => string;
  sha256File?: (rel: string) => string;
};

function sha256Text(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

function defaultSha256File(rootDir: string, rel: string, readText: (abs: string) => string): string {
  return sha256Text(readText(path.join(rootDir, rel)));
}

function browserTruthNotesForFilterV1(
  filter: (typeof BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_OWNER_APPROVAL_FILTERS_V1)[number],
): string {
  return [
    `GE MWFP/XWFE Supabase sync owner-approval v1 for ${filter}.`,
    `Cites owner browser proof ${BUCKPARTS_FRIDGE_MODEL_PDP_OWNER_BROWSER_PROOF_RESULT_JSON_REL_V1}`,
    `and owner-review plan ${BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_SYNC_OWNER_REVIEW_JSON_REL_V1}.`,
    "Does not claim 4 GE model PDPs closed; conversion/revenue UNKNOWN.",
  ].join(" ");
}

export function buildBuckpartsFridgeModelPdpGeMwfpXwfeRetailerLinksSupabaseSyncOwnerApprovalV1(
  deps: BuildGeMwfpXwfeSupabaseSyncOwnerApprovalDepsV1,
): GeMwfpXwfeRetailerLinksSupabaseSyncOwnerApprovalRegistryDocV1 {
  const readText = deps.readText ?? ((abs) => readFileSync(abs, "utf8"));
  const sha256File =
    deps.sha256File ??
    ((rel) => defaultSha256File(deps.rootDir, rel, readText));
  const generated_at = (deps.now ?? (() => new Date()))().toISOString();
  const decided_at = generated_at;
  const expires_at = new Date(
    Date.parse(decided_at) + 365 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const planRel =
    BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_SYNC_OWNER_REVIEW_JSON_REL_V1;
  const proofRel = BUCKPARTS_FRIDGE_MODEL_PDP_OWNER_BROWSER_PROOF_RESULT_JSON_REL_V1;
  const parityRel = BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_PARITY_JSON_REL_V1;

  for (const rel of [planRel, proofRel, parityRel]) {
    if (!existsSync(path.join(deps.rootDir, rel))) {
      throw new Error(`fail-closed: missing bound artifact ${rel}`);
    }
  }

  const plan = JSON.parse(
    readText(path.join(deps.rootDir, planRel)),
  ) as GeMwfpXwfeRetailerLinksSupabaseSyncOwnerReviewV1;
  const proof = JSON.parse(
    readText(path.join(deps.rootDir, proofRel)),
  ) as BuckpartsFridgeModelPdpOwnerBrowserProofResultPacketV1;
  const parity = JSON.parse(readText(path.join(deps.rootDir, parityRel))) as {
    contract?: string;
    overall_sync_status?: string;
  };

  if (plan.contract !== BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_SYNC_OWNER_REVIEW_CONTRACT_V1) {
    throw new Error("fail-closed: unexpected supabase sync owner-review contract");
  }
  if (proof.contract !== BUCKPARTS_FRIDGE_MODEL_PDP_OWNER_BROWSER_PROOF_RESULT_CONTRACT_V1) {
    throw new Error("fail-closed: unexpected owner browser proof result contract");
  }
  if (parity.contract !== BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_PARITY_CONTRACT_V1) {
    throw new Error("fail-closed: unexpected supabase parity contract");
  }
  if (plan.overall_sync_status_observed !== "DRIFTED") {
    throw new Error(
      `fail-closed: owner-review must be DRIFTED (got ${plan.overall_sync_status_observed})`,
    );
  }
  if (parity.overall_sync_status !== "DRIFTED") {
    throw new Error(
      `fail-closed: parity must be DRIFTED (got ${String(parity.overall_sync_status)})`,
    );
  }
  if (plan.planned_updates.length !== 2) {
    throw new Error(
      `fail-closed: expected exactly 2 planned updates, got ${String(plan.planned_updates.length)}`,
    );
  }
  if (plan.scope.excluded_filter_slugs.includes("xwf") !== true) {
    throw new Error("fail-closed: plan must exclude xwf");
  }

  const byFilter = new Map(plan.planned_updates.map((u) => [u.filter_slug, u]));
  for (const filter of BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_OWNER_APPROVAL_FILTERS_V1) {
    const update = byFilter.get(filter);
    if (!update) throw new Error(`fail-closed: missing planned update for ${filter}`);
    if (update.change_kind !== "update_existing_primary_from_csv") {
      throw new Error(`fail-closed: ${filter} must be update_existing_primary_from_csv`);
    }
    const expectedUrl =
      BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_OWNER_APPROVAL_URLS_V1[filter];
    if (update.after_affiliate_url !== expectedUrl) {
      throw new Error(`fail-closed: ${filter} after_affiliate_url mismatch`);
    }
    if (!update.supabase_link_id) {
      throw new Error(`fail-closed: ${filter} missing supabase_link_id`);
    }
    if (update.after_browser_truth_classification !== "direct_buyable") {
      throw new Error(`fail-closed: ${filter} must remain direct_buyable`);
    }
  }
  if (byFilter.has("xwf" as never)) {
    throw new Error("fail-closed: plan must not include xwf");
  }

  for (const filter of BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_OWNER_APPROVAL_FILTERS_V1) {
    const row = (proof.filter_rows ?? []).find((f) => f.filter_slug === filter);
    if (!row || row.classification !== "OWNER_BROWSER_PASS" || !row.clean_direct_buy_pass) {
      throw new Error(`fail-closed: OWNER_BROWSER_PASS required for ${filter}`);
    }
  }
  const xwfProof = (proof.filter_rows ?? []).find((f) => f.filter_slug === "xwf");
  if (xwfProof?.classification === "OWNER_BROWSER_PASS") {
    throw new Error("fail-closed: xwf cannot be OWNER_BROWSER_PASS in this approval");
  }

  const planSha = sha256File(planRel);
  const proofSha = sha256File(proofRel);
  const paritySha = sha256File(parityRel);

  const approved_deltas: GeMwfpXwfeSupabaseSyncApprovedDeltaV1[] = [
    ...BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_OWNER_APPROVAL_FILTERS_V1,
  ].map((filter_slug) => {
    const update = byFilter.get(filter_slug)!;
    return {
      filter_slug,
      change_kind: "update_existing_primary_row" as const,
      supabase_link_id: update.supabase_link_id as string,
      proposed_affiliate_url:
        BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_OWNER_APPROVAL_URLS_V1[filter_slug],
      proposed_retailer_name:
        BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_OWNER_APPROVAL_RETAILER_NAME_V1,
      proposed_retailer_key:
        BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_OWNER_APPROVAL_RETAILER_KEY_V1,
      proposed_browser_truth_classification:
        BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_OWNER_APPROVAL_BROWSER_TRUTH_V1,
      proposed_browser_truth_checked_at:
        BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_SYNC_OWNER_APPROVAL_BROWSER_TRUTH_CHECKED_AT_V1,
      proposed_browser_truth_notes: browserTruthNotesForFilterV1(filter_slug),
      affected_model_slugs: [...AFFECTED_BY_FILTER_V1[filter_slug]],
    };
  });

  const context: GeMwfpXwfeRetailerLinksSupabaseSyncOwnerApprovalContextV1 = {
    founder_option_id: "approve_ge_mwfp_xwfe_retailer_links_supabase_sync_updates",
    option_id: "approve_ge_mwfp_xwfe_retailer_links_supabase_sync_updates",
    owner_review_plan_rel_path: planRel,
    owner_browser_proof_result_rel_path: proofRel,
    parity_artifact_rel_path: parityRel,
    owner_review_plan_contract:
      BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_SYNC_OWNER_REVIEW_CONTRACT_V1,
    owner_browser_proof_result_contract:
      BUCKPARTS_FRIDGE_MODEL_PDP_OWNER_BROWSER_PROOF_RESULT_CONTRACT_V1,
    parity_artifact_contract:
      BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_PARITY_CONTRACT_V1,
    target_table: "public.retailer_links",
    approved_filter_slugs: [
      ...BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_OWNER_APPROVAL_FILTERS_V1,
    ],
    approved_updates: 2,
    approved_inserts: 0,
    approved_deletes: 0,
    approved_deltas,
    affected_potentially_closable_model_slugs: [
      ...BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_OWNER_APPROVAL_AFFECTED_SLUGS_V1,
    ],
    exclusions: [
      ...BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_OWNER_APPROVAL_EXCLUSIONS_V1,
    ],
    allowed_future_mutation_type: "supabase_retailer_links_update_existing_primary_only",
    supabase_retailer_links_update_authorized_when_guarded_apply_runs: true,
    retailer_links_csv_mutation_authorized: false,
    retailer_links_insert_authorized: false,
    retailer_links_delete_authorized: false,
    supabase_mutation_authorized: false,
    supabase_compatibility_mutation_authorized: false,
    csv_compatibility_mutation_authorized: false,
    buy_cta_expansion_authorized: false,
    sitemap_robots_mutation_authorized: false,
    product_json_ld_mutation_authorized: false,
    deploy_mutation_authorized: false,
    xwf_promotion_authorized: false,
    pages_claimed_closed: false,
    buyer_path_claimed_closed: false,
    conversion_claimed: false,
    mutation_authorized: false,
    apply_authorized: false,
    apply_not_executed: true,
    autonomous_apply_authorized: false,
    separate_guarded_apply_executor_required: true,
    owner_approved_by: "Jared",
    approved_at: decided_at,
  };

  const prohibited = [
    "Do not INSERT any public.retailer_links rows from this approval — UPDATE of existing smartwater-mwfp and xwfe primaries only.",
    "Do not DELETE any public.retailer_links rows from this approval.",
    "Do not mutate filter_slug xwf or any XWF destination URL from this approval.",
    "Do not mutate data/retailer_links.csv from this approval — CSV already applied; this lane is Supabase sync only.",
    "Do not mutate compatibility_mappings.csv or Supabase compatibility_mappings from this approval.",
    "Do not authorize buy CTA expansion beyond existing gated retailer_links truth after a future approved sync.",
    "Do not change public routes, sitemap, robots, Product JSON-LD, or deploy config from this approval.",
    "Do not claim the 4 model PDPs are buyer-path closed from this approval alone.",
    "Do not claim conversion/revenue from this approval.",
    "Do not run autonomous or scheduled Supabase writes — explicit founder-run of a separate guarded Supabase apply executor is still required.",
    "Approval alone does not mutate Supabase; separate guarded apply + session authorization still required.",
    "Do not expand beyond the exact 2 approved supabase_link_id primary updates bound to this plan.",
  ];

  const owner_note = [
    "Jared approves the founder-gated GE MWFP/XWFE Supabase retailer_links primary UPDATE plan only:",
    "exactly 2 updates of existing public.retailer_links primaries —",
    "smartwater-mwfp → https://www.geapplianceparts.com/store/parts/spec/MWFP",
    "and xwfe → https://www.geapplianceparts.com/store/parts/spec/XWFE —",
    "retailer_name=GE Appliance Parts, retailer_key=oem-parts-catalog,",
    "browser_truth_classification=direct_buyable,",
    `browser_truth_checked_at=${BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_SYNC_OWNER_APPROVAL_BROWSER_TRUTH_CHECKED_AT_V1}`,
    "(matching approved CSV/owner-proof source).",
    `Bound to ${planRel} (sha256 ${planSha}), ${proofRel} (sha256 ${proofSha}), and ${parityRel} (sha256 ${paritySha}).`,
    "Affected potentially closable model context: ge-gfe24jgkww, ge-gfe27jmkes, ge-gne25jmkww, ge-pvd28bymfs.",
    "Exclusions: xwf, ge-gne27jstss, ge-gse25hskss, ge-gte18gsnrss.",
    "This row records founder approval for a future Supabase update-only guarded apply — not autonomous write,",
    "not inserts/deletes, not CSV mutation, not compatibility CSV/DB, not Product JSON-LD/sitemap/robots/deploy,",
    "not XWF mutation, and does not claim pages closed or conversion/revenue.",
    "apply_not_executed=true; mutation_authorized=false until an explicit founder-run guarded Supabase apply.",
  ].join(" ");

  return {
    contract: FOUNDER_DECISION_REGISTRY_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    packet_contract:
      BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_SYNC_OWNER_APPROVAL_CONTRACT_V1,
    generated_at,
    source_command:
      BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_SYNC_OWNER_APPROVAL_SOURCE_COMMAND_V1,
    apply_authorized: false,
    mutation_authorized: false,
    rows: [
      {
        decision_id:
          BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_SYNC_OWNER_APPROVAL_DECISION_ID_V1,
        source_queue_row_id:
          "queue-buckparts-fridge-model-pdp-ge-mwfp-xwfe-retailer-links-supabase-sync",
        source_decision_packet_id:
          BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_SYNC_OWNER_APPROVAL_CONTRACT_V1,
        decided_at,
        decision_status: "approved",
        owner_note,
        allowed_next_scope: "owner_mutation_approved",
        evidence_required_before_mutation: true,
        expires_at,
        prohibited_actions_still_apply: prohibited,
        buckparts_fridge_model_pdp_ge_mwfp_xwfe_retailer_links_supabase_sync_owner_approval_context_v1:
          context,
        bound_artifacts_v1: [
          {
            artifact_rel_path: planRel,
            sha256_at_binding: planSha,
            entry_type: "apply_plan",
          },
          {
            artifact_rel_path: proofRel,
            sha256_at_binding: proofSha,
            entry_type: "evidence",
          },
          {
            artifact_rel_path: parityRel,
            sha256_at_binding: paritySha,
            entry_type: "parity_proof",
          },
        ],
      },
    ],
    proven_facts: [
      "PROVEN: apply_authorized=false; mutation_authorized=false; apply_not_executed=true; autonomous_apply_authorized=false.",
      "PROVEN: exact 2 approved public.retailer_links UPDATEs for smartwater-mwfp and xwfe existing primaries only.",
      "PROVEN: xwf_promotion_authorized=false; retailer_links_csv_mutation_authorized=false; deploy_mutation_authorized=false.",
      `PROVEN: bound owner-review sha256=${planSha}.`,
      `PROVEN: bound browser proof sha256=${proofSha}.`,
      `PROVEN: bound parity sha256=${paritySha}.`,
      "PROVEN: pages_claimed_closed=false; conversion_claimed=false.",
    ],
    unknown_facts: [
      "UNKNOWN: future guarded Supabase apply executor outcome until explicitly founder-run.",
      "UNKNOWN: whether CTA/go FAIL 7 clears after a future authorized sync — must re-proof.",
      "UNKNOWN: conversion/revenue impact.",
    ],
    risk_notes: [
      "Presence of this approval file does not authorize running --apply or any Supabase write in this session.",
      "Do not expand beyond the 2 bound supabase_link_id filters or promote XWF.",
      "Separate guarded Supabase apply executor still required after this approval.",
    ],
  };
}

export function buildBuckpartsFridgeModelPdpGeMwfpXwfeRetailerLinksSupabaseSyncOwnerApprovalMarkdownV1(
  doc: GeMwfpXwfeRetailerLinksSupabaseSyncOwnerApprovalRegistryDocV1,
): string {
  const row = doc.rows[0]!;
  const ctx =
    row.buckparts_fridge_model_pdp_ge_mwfp_xwfe_retailer_links_supabase_sync_owner_approval_context_v1;
  const lines: string[] = [
    "# BuckParts GE MWFP/XWFE Supabase retailer_links sync founder approval v1",
    "",
    `Generated: ${doc.generated_at}`,
    "",
    "## Status",
    "",
    `- packet_contract: \`${doc.packet_contract}\``,
    `- decision_id: \`${row.decision_id}\``,
    `- decision_status: **${row.decision_status}**`,
    `- allowed_next_scope: **${row.allowed_next_scope}**`,
    `- apply_authorized: **false**`,
    `- mutation_authorized: **false**`,
    `- apply_not_executed: **true**`,
    `- pages_claimed_closed: **false**`,
    `- conversion_claimed: **false**`,
    "",
    "## Allowed future mutations",
    "",
    `- \`${ctx.allowed_future_mutation_type}\` — exactly **${String(ctx.approved_updates)}** UPDATE(s) of existing \`${ctx.target_table}\` primaries`,
    `- filters: ${ctx.approved_filter_slugs.join(", ")}`,
    "",
    "| filter | supabase_link_id | URL | retailer_name | retailer_key | browser_truth | checked_at |",
    "|---|---|---|---|---|---|---|",
  ];
  for (const d of ctx.approved_deltas) {
    lines.push(
      `| ${d.filter_slug} | \`${d.supabase_link_id}\` | \`${d.proposed_affiliate_url}\` | ${d.proposed_retailer_name} | ${d.proposed_retailer_key} | ${d.proposed_browser_truth_classification} | \`${d.proposed_browser_truth_checked_at}\` |`,
    );
  }
  lines.push("");
  lines.push("## Disallowed mutations");
  lines.push("");
  for (const p of row.prohibited_actions_still_apply) lines.push(`- ${p}`);
  lines.push("");
  lines.push("## Exclusions");
  lines.push("");
  for (const e of ctx.exclusions) lines.push(`- \`${e}\``);
  lines.push("");
  lines.push("## Affected potentially closable model slugs");
  lines.push("");
  for (const s of ctx.affected_potentially_closable_model_slugs) lines.push(`- \`${s}\``);
  lines.push("");
  lines.push("## Bound artifacts");
  lines.push("");
  for (const b of row.bound_artifacts_v1) {
    lines.push(
      `- \`${b.artifact_rel_path}\` (${b.entry_type}) sha256=\`${b.sha256_at_binding}\``,
    );
  }
  lines.push("");
  lines.push("## Owner note");
  lines.push("");
  lines.push(row.owner_note);
  lines.push("");
  lines.push("## Proven facts");
  lines.push("");
  for (const f of doc.proven_facts) lines.push(`- ${f}`);
  lines.push("");
  lines.push("## Unknown facts");
  lines.push("");
  for (const f of doc.unknown_facts) lines.push(`- ${f}`);
  lines.push("");
  lines.push("## Risk notes");
  lines.push("");
  for (const f of doc.risk_notes) lines.push(`- ${f}`);
  lines.push("");
  return `${lines.join("\n")}\n`;
}

export function writeBuckpartsFridgeModelPdpGeMwfpXwfeRetailerLinksSupabaseSyncOwnerApprovalArtifactsV1(args: {
  rootDir: string;
  doc: GeMwfpXwfeRetailerLinksSupabaseSyncOwnerApprovalRegistryDocV1;
}): { json_rel_path: string; md_rel_path: string } {
  const jsonRel =
    BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_SYNC_OWNER_APPROVAL_JSON_REL_V1;
  const mdRel =
    BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_SYNC_OWNER_APPROVAL_MD_REL_V1;
  const jsonAbs = path.join(args.rootDir, jsonRel);
  const mdAbs = path.join(args.rootDir, mdRel);
  mkdirSync(path.dirname(jsonAbs), { recursive: true });
  writeFileSync(jsonAbs, `${JSON.stringify(args.doc, null, 2)}\n`, "utf8");
  writeFileSync(
    mdAbs,
    buildBuckpartsFridgeModelPdpGeMwfpXwfeRetailerLinksSupabaseSyncOwnerApprovalMarkdownV1(
      args.doc,
    ),
    "utf8",
  );
  return { json_rel_path: jsonRel, md_rel_path: mdRel };
}
