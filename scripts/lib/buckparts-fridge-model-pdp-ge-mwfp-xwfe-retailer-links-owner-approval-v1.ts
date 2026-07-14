/**
 * Founder approval draft for exact 2 GE MWFP/XWFE retailer_links CSV primary updates.
 * Binds owner-review plan + owner browser proof hashes. Does not apply or mutate.
 */

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { FOUNDER_DECISION_REGISTRY_CONTRACT_V1 } from "../../src/lib/owner-dashboard/founder-decision-registry-v1";
import {
  BUCKPARTS_FRIDGE_MODEL_PDP_GE_CLOSABLE_APPLY_PLAN_CONTRACT_V1,
  BUCKPARTS_FRIDGE_MODEL_PDP_GE_CLOSABLE_APPLY_PLAN_JSON_REL_V1,
  type BuckpartsFridgeModelPdpGeClosableApplyPlanOwnerReviewV1,
} from "./buckparts-fridge-model-pdp-ge-closable-mwfp-xwfe-apply-plan-owner-review-v1";
import {
  BUCKPARTS_FRIDGE_MODEL_PDP_OWNER_BROWSER_PROOF_RESULT_CONTRACT_V1,
  BUCKPARTS_FRIDGE_MODEL_PDP_OWNER_BROWSER_PROOF_RESULT_JSON_REL_V1,
  type BuckpartsFridgeModelPdpOwnerBrowserProofResultPacketV1,
} from "./buckparts-fridge-model-pdp-owner-browser-proof-result-packet-v1";

export const BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_OWNER_APPROVAL_CONTRACT_V1 =
  "buckparts_fridge_model_pdp_ge_mwfp_xwfe_retailer_links_owner_approval_v1" as const;

export const BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_OWNER_APPROVAL_SOURCE_COMMAND_V1 =
  "npm run buckparts:fridge-model-pdp-ge-mwfp-xwfe-retailer-links-owner-approval" as const;

export const BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_OWNER_APPROVAL_JSON_REL_V1 =
  "data/owner-decisions/buckparts-fridge-model-pdp-ge-mwfp-xwfe-retailer-links-owner-approval-v1.json" as const;

export const BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_OWNER_APPROVAL_MD_REL_V1 =
  "data/owner-decisions/buckparts-fridge-model-pdp-ge-mwfp-xwfe-retailer-links-owner-approval-v1.md" as const;

export const BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_OWNER_APPROVAL_ALLOWED_WRITE_REL_PATHS_V1 =
  [
    BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_OWNER_APPROVAL_JSON_REL_V1,
    BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_OWNER_APPROVAL_MD_REL_V1,
  ] as const;

export const BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_OWNER_APPROVAL_DECISION_ID_V1 =
  "decision-2026-07-14-ge-mwfp-xwfe-retailer-links-csv-update-approve" as const;

export const BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_OWNER_APPROVAL_FILTERS_V1 = [
  "smartwater-mwfp",
  "xwfe",
] as const;

export const BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_OWNER_APPROVAL_URLS_V1 = {
  "smartwater-mwfp": "https://www.geapplianceparts.com/store/parts/spec/MWFP",
  xwfe: "https://www.geapplianceparts.com/store/parts/spec/XWFE",
} as const;

export const BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_OWNER_APPROVAL_AFFECTED_SLUGS_V1 =
  [
    "ge-gfe24jgkww",
    "ge-gfe27jmkes",
    "ge-gne25jmkww",
    "ge-pvd28bymfs",
  ] as const;

export const BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_OWNER_APPROVAL_EXCLUSIONS_V1 =
  ["xwf", "ge-gne27jstss", "ge-gse25hskss", "ge-gte18gsnrss"] as const;

export const BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_OWNER_APPROVAL_RETAILER_NAME_V1 =
  "GE Appliance Parts" as const;

export const BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_OWNER_APPROVAL_RETAILER_KEY_V1 =
  "oem-parts-catalog" as const;

export const BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_OWNER_APPROVAL_BROWSER_TRUTH_V1 =
  "direct_buyable" as const;

export type BoundArtifactSha256V1 = {
  artifact_rel_path: string;
  sha256_at_binding: string;
  entry_type: "apply_plan" | "evidence";
};

export type GeMwfpXwfeRetailerLinksApprovedDeltaV1 = {
  filter_slug: string;
  change_kind: "update_existing_primary_row";
  proposed_affiliate_url: string;
  proposed_retailer_name: typeof BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_OWNER_APPROVAL_RETAILER_NAME_V1;
  proposed_retailer_key: typeof BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_OWNER_APPROVAL_RETAILER_KEY_V1;
  proposed_browser_truth_classification: typeof BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_OWNER_APPROVAL_BROWSER_TRUTH_V1;
  affected_model_slugs: string[];
};

export type GeMwfpXwfeRetailerLinksOwnerApprovalContextV1 = {
  founder_option_id: "approve_ge_mwfp_xwfe_retailer_links_csv_updates";
  option_id: "approve_ge_mwfp_xwfe_retailer_links_csv_updates";
  owner_review_plan_rel_path: typeof BUCKPARTS_FRIDGE_MODEL_PDP_GE_CLOSABLE_APPLY_PLAN_JSON_REL_V1;
  owner_browser_proof_result_rel_path: typeof BUCKPARTS_FRIDGE_MODEL_PDP_OWNER_BROWSER_PROOF_RESULT_JSON_REL_V1;
  owner_review_plan_contract: typeof BUCKPARTS_FRIDGE_MODEL_PDP_GE_CLOSABLE_APPLY_PLAN_CONTRACT_V1;
  owner_browser_proof_result_contract: typeof BUCKPARTS_FRIDGE_MODEL_PDP_OWNER_BROWSER_PROOF_RESULT_CONTRACT_V1;
  target_csv_rel_path: "data/retailer_links.csv";
  approved_filter_slugs: readonly string[];
  approved_updates: 2;
  approved_inserts: 0;
  approved_deletes: 0;
  approved_deltas: GeMwfpXwfeRetailerLinksApprovedDeltaV1[];
  affected_potentially_closable_model_slugs: readonly string[];
  exclusions: readonly string[];
  allowed_future_mutation_type: "retailer_links_csv_update_existing_primary_only";
  retailer_links_csv_update_authorized_when_guarded_apply_runs: true;
  retailer_links_insert_authorized: false;
  retailer_links_delete_authorized: false;
  supabase_mutation_authorized: false;
  supabase_compatibility_mutation_authorized: false;
  csv_compatibility_mutation_authorized: false;
  buy_cta_expansion_authorized: false;
  sitemap_robots_mutation_authorized: false;
  product_json_ld_mutation_authorized: false;
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

export type GeMwfpXwfeRetailerLinksOwnerApprovalRegistryDocV1 = {
  contract: typeof FOUNDER_DECISION_REGISTRY_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  packet_contract: typeof BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_OWNER_APPROVAL_CONTRACT_V1;
  generated_at: string;
  source_command: typeof BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_OWNER_APPROVAL_SOURCE_COMMAND_V1;
  apply_authorized: false;
  mutation_authorized: false;
  rows: Array<{
    decision_id: typeof BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_OWNER_APPROVAL_DECISION_ID_V1;
    source_queue_row_id: "queue-buckparts-fridge-model-pdp-ge-mwfp-xwfe-retailer-links";
    source_decision_packet_id: typeof BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_OWNER_APPROVAL_CONTRACT_V1;
    decided_at: string;
    decision_status: "approved";
    owner_note: string;
    allowed_next_scope: "owner_mutation_approved";
    evidence_required_before_mutation: true;
    expires_at: string;
    prohibited_actions_still_apply: string[];
    buckparts_fridge_model_pdp_ge_mwfp_xwfe_retailer_links_owner_approval_context_v1: GeMwfpXwfeRetailerLinksOwnerApprovalContextV1;
    bound_artifacts_v1: BoundArtifactSha256V1[];
  }>;
  proven_facts: string[];
  unknown_facts: string[];
  risk_notes: string[];
};

export type BuildGeMwfpXwfeOwnerApprovalDepsV1 = {
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

export function buildBuckpartsFridgeModelPdpGeMwfpXwfeRetailerLinksOwnerApprovalV1(
  deps: BuildGeMwfpXwfeOwnerApprovalDepsV1,
): GeMwfpXwfeRetailerLinksOwnerApprovalRegistryDocV1 {
  const readText = deps.readText ?? ((abs) => readFileSync(abs, "utf8"));
  const sha256File =
    deps.sha256File ??
    ((rel) => defaultSha256File(deps.rootDir, rel, readText));
  const generated_at = (deps.now ?? (() => new Date()))().toISOString();
  const decided_at = generated_at;
  const expires_at = new Date(
    Date.parse(decided_at) + 365 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const planRel = BUCKPARTS_FRIDGE_MODEL_PDP_GE_CLOSABLE_APPLY_PLAN_JSON_REL_V1;
  const proofRel = BUCKPARTS_FRIDGE_MODEL_PDP_OWNER_BROWSER_PROOF_RESULT_JSON_REL_V1;
  if (!existsSync(path.join(deps.rootDir, planRel))) {
    throw new Error(`fail-closed: missing owner-review plan ${planRel}`);
  }
  if (!existsSync(path.join(deps.rootDir, proofRel))) {
    throw new Error(`fail-closed: missing owner browser proof result ${proofRel}`);
  }

  const plan = JSON.parse(readText(path.join(deps.rootDir, planRel))) as BuckpartsFridgeModelPdpGeClosableApplyPlanOwnerReviewV1;
  const proof = JSON.parse(
    readText(path.join(deps.rootDir, proofRel)),
  ) as BuckpartsFridgeModelPdpOwnerBrowserProofResultPacketV1;

  if (plan.contract !== BUCKPARTS_FRIDGE_MODEL_PDP_GE_CLOSABLE_APPLY_PLAN_CONTRACT_V1) {
    throw new Error("fail-closed: unexpected owner-review plan contract");
  }
  if (proof.contract !== BUCKPARTS_FRIDGE_MODEL_PDP_OWNER_BROWSER_PROOF_RESULT_CONTRACT_V1) {
    throw new Error("fail-closed: unexpected owner browser proof result contract");
  }

  const deltas = plan.unique_retailer_links_deltas ?? [];
  if (deltas.length !== 2) {
    throw new Error(`fail-closed: expected exactly 2 unique retailer_links deltas, got ${String(deltas.length)}`);
  }

  const byFilter = new Map(deltas.map((d) => [d.filter_slug, d]));
  for (const filter of BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_OWNER_APPROVAL_FILTERS_V1) {
    const delta = byFilter.get(filter);
    if (!delta) throw new Error(`fail-closed: missing plan delta for ${filter}`);
    if (delta.change_kind !== "update_existing_primary_row") {
      throw new Error(`fail-closed: ${filter} must be update_existing_primary_row`);
    }
    const expectedUrl =
      BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_OWNER_APPROVAL_URLS_V1[filter];
    if (delta.proposed_url !== expectedUrl) {
      throw new Error(
        `fail-closed: ${filter} proposed_url mismatch; expected ${expectedUrl}, got ${delta.proposed_url}`,
      );
    }
  }
  if (byFilter.has("xwf")) {
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

  const approved_deltas: GeMwfpXwfeRetailerLinksApprovedDeltaV1[] = [
    ...BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_OWNER_APPROVAL_FILTERS_V1,
  ].map((filter_slug) => {
    const delta = byFilter.get(filter_slug)!;
    return {
      filter_slug,
      change_kind: "update_existing_primary_row" as const,
      proposed_affiliate_url:
        BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_OWNER_APPROVAL_URLS_V1[filter_slug],
      proposed_retailer_name:
        BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_OWNER_APPROVAL_RETAILER_NAME_V1,
      proposed_retailer_key:
        BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_OWNER_APPROVAL_RETAILER_KEY_V1,
      proposed_browser_truth_classification:
        BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_OWNER_APPROVAL_BROWSER_TRUTH_V1,
      affected_model_slugs: [...delta.affected_model_slugs].sort(),
    };
  });

  const context: GeMwfpXwfeRetailerLinksOwnerApprovalContextV1 = {
    founder_option_id: "approve_ge_mwfp_xwfe_retailer_links_csv_updates",
    option_id: "approve_ge_mwfp_xwfe_retailer_links_csv_updates",
    owner_review_plan_rel_path: planRel,
    owner_browser_proof_result_rel_path: proofRel,
    owner_review_plan_contract: BUCKPARTS_FRIDGE_MODEL_PDP_GE_CLOSABLE_APPLY_PLAN_CONTRACT_V1,
    owner_browser_proof_result_contract:
      BUCKPARTS_FRIDGE_MODEL_PDP_OWNER_BROWSER_PROOF_RESULT_CONTRACT_V1,
    target_csv_rel_path: "data/retailer_links.csv",
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
    allowed_future_mutation_type: "retailer_links_csv_update_existing_primary_only",
    retailer_links_csv_update_authorized_when_guarded_apply_runs: true,
    retailer_links_insert_authorized: false,
    retailer_links_delete_authorized: false,
    supabase_mutation_authorized: false,
    supabase_compatibility_mutation_authorized: false,
    csv_compatibility_mutation_authorized: false,
    buy_cta_expansion_authorized: false,
    sitemap_robots_mutation_authorized: false,
    product_json_ld_mutation_authorized: false,
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
    "Do not INSERT any retailer_links rows from this approval — UPDATE of existing smartwater-mwfp and xwfe primaries only.",
    "Do not DELETE any retailer_links rows from this approval.",
    "Do not promote filter_slug xwf or any XWF destination URL from this approval.",
    "Do not include ge-gne27jstss or ge-gse25hskss (XWF supersession-safe policy still required).",
    "Do not include ge-gte18gsnrss (remain no-buy).",
    "Do not mutate compatibility_mappings.csv or Supabase compatibility_mappings from this approval.",
    "Do not mutate Supabase retailer_links from this approval — CSV retailer_links update only via a separate guarded apply executor.",
    "Do not authorize buy CTA expansion beyond existing gated retailer_links truth after a future approved apply.",
    "Do not change public routes, sitemap, robots, or Product JSON-LD from this approval.",
    "Do not claim the 4 model PDPs are buyer-path closed from this approval alone.",
    "Do not run autonomous or scheduled apply — explicit founder-run of a separate guarded apply executor is still required.",
    "Approval alone does not mutate retailer_links.csv; separate guarded apply + session authorization still required.",
  ];

  const owner_note = [
    "Jared approves the founder-gated GE MWFP/XWFE retailer_links CSV primary UPDATE plan only:",
    "exactly 2 updates — smartwater-mwfp → https://www.geapplianceparts.com/store/parts/spec/MWFP",
    "and xwfe → https://www.geapplianceparts.com/store/parts/spec/XWFE —",
    "retailer_name=GE Appliance Parts, retailer_key=oem-parts-catalog, browser_truth_classification=direct_buyable.",
    `Bound to ${planRel} (sha256 ${planSha}) and ${proofRel} (sha256 ${proofSha}).`,
    "Affected potentially closable model context: ge-gfe24jgkww, ge-gfe27jmkes, ge-gne25jmkww, ge-pvd28bymfs.",
    "Exclusions: xwf, ge-gne27jstss, ge-gse25hskss, ge-gte18gsnrss.",
    "This row records founder approval for a future retailer_links CSV update-only guarded apply — not autonomous apply,",
    "not inserts/deletes, not Supabase, not compatibility CSV/DB, not Product JSON-LD/sitemap/robots, not XWF promotion,",
    "and does not claim pages closed. apply_not_executed=true; mutation_authorized=false until an explicit founder-run guarded apply.",
  ].join(" ");

  return {
    contract: FOUNDER_DECISION_REGISTRY_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    packet_contract:
      BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_OWNER_APPROVAL_CONTRACT_V1,
    generated_at,
    source_command:
      BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_OWNER_APPROVAL_SOURCE_COMMAND_V1,
    apply_authorized: false,
    mutation_authorized: false,
    rows: [
      {
        decision_id:
          BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_OWNER_APPROVAL_DECISION_ID_V1,
        source_queue_row_id: "queue-buckparts-fridge-model-pdp-ge-mwfp-xwfe-retailer-links",
        source_decision_packet_id:
          BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_OWNER_APPROVAL_CONTRACT_V1,
        decided_at,
        decision_status: "approved",
        owner_note,
        allowed_next_scope: "owner_mutation_approved",
        evidence_required_before_mutation: true,
        expires_at,
        prohibited_actions_still_apply: prohibited,
        buckparts_fridge_model_pdp_ge_mwfp_xwfe_retailer_links_owner_approval_context_v1: context,
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
        ],
      },
    ],
    proven_facts: [
      "PROVEN: apply_authorized=false; mutation_authorized=false; apply_not_executed=true; autonomous_apply_authorized=false.",
      "PROVEN: exact 2 approved retailer_links CSV updates for smartwater-mwfp and xwfe only.",
      "PROVEN: xwf_promotion_authorized=false; exclusions include xwf and 3 GE model slugs.",
      `PROVEN: bound plan sha256=${planSha}.`,
      `PROVEN: bound proof sha256=${proofSha}.`,
      "PROVEN: pages_claimed_closed=false; conversion_claimed=false.",
    ],
    unknown_facts: [
      "UNKNOWN: future guarded apply executor outcome until explicitly founder-run.",
      "UNKNOWN: live Supabase retailer_links parity (not authorized by this approval).",
      "UNKNOWN: conversion/revenue impact.",
    ],
    risk_notes: [
      "Presence of this approval file does not authorize running --apply in this session.",
      "Do not expand beyond the 2 bound filter URLs or promote XWF.",
      "Separate guarded apply executor still required; Supabase remains a separate founder lane.",
    ],
  };
}

export function buildBuckpartsFridgeModelPdpGeMwfpXwfeRetailerLinksOwnerApprovalMarkdownV1(
  doc: GeMwfpXwfeRetailerLinksOwnerApprovalRegistryDocV1,
): string {
  const row = doc.rows[0]!;
  const ctx =
    row.buckparts_fridge_model_pdp_ge_mwfp_xwfe_retailer_links_owner_approval_context_v1;
  const lines: string[] = [
    "# BuckParts GE MWFP/XWFE retailer_links founder approval v1",
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
    "",
    "## Allowed future mutations",
    "",
    `- \`${ctx.allowed_future_mutation_type}\` — exactly **${String(ctx.approved_updates)}** UPDATE(s) of existing \`data/retailer_links.csv\` primaries`,
    `- filters: ${ctx.approved_filter_slugs.join(", ")}`,
    "",
    "| filter | URL | retailer_name | retailer_key | browser_truth |",
    "|---|---|---|---|---|",
  ];
  for (const d of ctx.approved_deltas) {
    lines.push(
      `| ${d.filter_slug} | \`${d.proposed_affiliate_url}\` | ${d.proposed_retailer_name} | ${d.proposed_retailer_key} | ${d.proposed_browser_truth_classification} |`,
    );
  }
  lines.push("");
  lines.push("## Disallowed mutations");
  lines.push("");
  for (const p of row.prohibited_actions_still_apply) lines.push(`- ${p}`);
  lines.push("");
  lines.push("## Exclusions");
  lines.push("");
  for (const ex of ctx.exclusions) lines.push(`- \`${ex}\``);
  lines.push("");
  lines.push("## Affected potentially closable model slugs");
  lines.push("");
  for (const s of ctx.affected_potentially_closable_model_slugs) lines.push(`- \`${s}\``);
  lines.push("");
  lines.push("## Bound artifacts");
  lines.push("");
  for (const b of row.bound_artifacts_v1) {
    lines.push(`- \`${b.artifact_rel_path}\` (${b.entry_type}) sha256=\`${b.sha256_at_binding}\``);
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

export function writeBuckpartsFridgeModelPdpGeMwfpXwfeRetailerLinksOwnerApprovalArtifactsV1(args: {
  rootDir: string;
  doc: GeMwfpXwfeRetailerLinksOwnerApprovalRegistryDocV1;
}): { json_rel_path: string; md_rel_path: string } {
  const jsonRel =
    BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_OWNER_APPROVAL_JSON_REL_V1;
  const mdRel =
    BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_OWNER_APPROVAL_MD_REL_V1;
  mkdirSync(path.dirname(path.join(args.rootDir, jsonRel)), { recursive: true });
  writeFileSync(
    path.join(args.rootDir, jsonRel),
    `${JSON.stringify(args.doc, null, 2)}\n`,
    "utf8",
  );
  writeFileSync(
    path.join(args.rootDir, mdRel),
    buildBuckpartsFridgeModelPdpGeMwfpXwfeRetailerLinksOwnerApprovalMarkdownV1(args.doc),
    "utf8",
  );
  return { json_rel_path: jsonRel, md_rel_path: mdRel };
}
