/**
 * Read-only RPWFE official GE apply-plan proposal.
 * Plans a single data/retailer_links.csv change only — does not mutate CSV, Supabase, or public UI.
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { parse } from "csv-parse/sync";

import { buyLinkGateFailureKind } from "@/lib/retailers/launch-buy-links";
import { mapSignalsToRetailerLinkState } from "@/lib/retailers/retailer-link-state";

import {
  loadRpwfeOfficialGeBrowserEvidenceArtifactV1,
  RPWFE_OFFICIAL_GE_ARTIFACT_REL_V1,
  RPWFE_OFFICIAL_GE_TARGET_URL_V1,
  type RpwfeOfficialGeBrowserEvidenceArtifactV1,
} from "./rpwfe-official-ge-browser-capture-v1";
import type { RpwfeOfficialGeBrowserEvidenceReviewLaneV1 } from "./rpwfe-official-ge-browser-evidence-review-v1";
import {
  isRpwfeRepoCsvOfficialGeDirectBuyableApplied,
  rpwfeRepoCsvCurrentRowState,
  type RpwfeRepoCsvRowLike,
} from "./rpwfe-official-ge-repo-csv-state-v1";
import type { RpwfeProposedSupabaseParityStatusV1 } from "./rpwfe-official-ge-supabase-parity-plan-v1";

export const RPWFE_OFFICIAL_GE_APPLY_PLAN_PROPOSAL_CONTRACT_V1 =
  "rpwfe_official_ge_apply_plan_proposal_v1" as const;

export const RPWFE_OFFICIAL_GE_APPLY_PLAN_PROPOSAL_CC_JQ_PATH_V1 =
  ".command_center_v2.rpwfe_official_ge_apply_plan_proposal_v1" as const;

const FILTER_SLUG = "rpwfe" as const;
const PUBLIC_ROUTE = "/filter/rpwfe" as const;
const RETAILER_LINKS_CSV_REL = "data/retailer_links.csv" as const;
const PROPOSED_RETAILER_NAME = "GE Appliance Parts" as const;
const PROPOSED_RETAILER_KEY = "oem-parts-catalog" as const;
const PROPOSED_CUSTOMER_LABEL = "BuckParts Verified Link" as const;
const PROPOSED_LABEL_SUBTYPE = "official_manufacturer_official_ge" as const;

export type RpwfePlannedRetailerLinksCsvChangeV1 = {
  source_path: typeof RETAILER_LINKS_CSV_REL;
  filter_slug: typeof FILTER_SLUG;
  change_kind: "update_existing_primary_row_affiliate_url";
  current_row: {
    retailer_name: string | null;
    retailer_key: string | null;
    affiliate_url: string | null;
    is_primary: boolean | null;
    gate_failure_kind: string | null;
    retailer_link_state: string;
    summary: string;
  };
  proposed_row: {
    retailer_name: typeof PROPOSED_RETAILER_NAME;
    retailer_key: typeof PROPOSED_RETAILER_KEY;
    affiliate_url: typeof RPWFE_OFFICIAL_GE_TARGET_URL_V1;
    is_primary: true;
    customer_visible_label: typeof PROPOSED_CUSTOMER_LABEL;
    label_subtype: typeof PROPOSED_LABEL_SUBTYPE;
    compatible_replacement: false;
    waterdrop: false;
    amazon: false;
    summary: string;
  };
};

export type RpwfeOfficialGeApplyPlanProposalLaneV1 = {
  contract: typeof RPWFE_OFFICIAL_GE_APPLY_PLAN_PROPOSAL_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  recommended_jq_path: typeof RPWFE_OFFICIAL_GE_APPLY_PLAN_PROPOSAL_CC_JQ_PATH_V1;
  filter_slug: typeof FILTER_SLUG;
  public_route: typeof PUBLIC_ROUTE;
  emergency_classification: "HIGH_DEMAND_NO_VERIFIED_LINK_TRUST_GAP";
  browser_evidence_artifact_path: typeof RPWFE_OFFICIAL_GE_ARTIFACT_REL_V1;
  browser_evidence_review_jq_path: ".command_center_v2.rpwfe_official_ge_browser_evidence_review_v1";
  browser_truth_status: "PASS" | "FAIL" | "UNKNOWN";
  plan_status:
    | "PROPOSED_OWNER_REVIEW_READY"
    | "ALREADY_APPLIED_REPO_DIRECT_BUYABLE"
    | "NOT_READY";
  csv_apply_noop: boolean;
  owner_apply_review_ready: boolean;
  apply_plan_proposal_ready: boolean;
  current_row_state: string;
  proposed_retailer: typeof PROPOSED_RETAILER_NAME;
  proposed_url: typeof RPWFE_OFFICIAL_GE_TARGET_URL_V1;
  proposed_customer_label: typeof PROPOSED_CUSTOMER_LABEL;
  proposed_label_subtype: typeof PROPOSED_LABEL_SUBTYPE;
  compatible_replacement_in_proposal: false;
  waterdrop_in_proposal: false;
  amazon_in_proposal: false;
  planned_retailer_links_csv_change: RpwfePlannedRetailerLinksCsvChangeV1 | null;
  blockers: string[];
  buckparts_verified_link_authorized: false;
  csv_apply_authorized: false;
  supabase_mutation_authorized: false;
  public_ui_mutation_authorized: false;
  netlify_api_authorized: false;
  deploy_authorized: false;
  evidence_write_authorized: false;
  next_recommended_action: string;
};

const PRE_APPLY_BLOCKERS = [
  "owner_apply_approval_missing",
  "csv_apply_not_authorized",
  "supabase_mutation_not_authorized",
  "public_ui_mutation_not_authorized",
] as const;

const POST_APPLY_BLOCKERS = [
  "repo_csv_already_applied_official_ge",
  "csv_apply_not_authorized",
  "supabase_parity_not_applied",
  "live_page_not_revalidated_after_supabase_parity",
] as const;

const POST_SUPABASE_PARITY_BLOCKERS = [
  "repo_csv_already_applied_official_ge",
  "supabase_parity_already_applied",
  "csv_apply_not_authorized",
] as const;

function readRetailerLinkRow(args: {
  rootDir: string;
  fileExists: (abs: string) => boolean;
  readTextFile: (abs: string) => string;
}): RpwfeRepoCsvRowLike | null {
  const abs = path.join(args.rootDir, RETAILER_LINKS_CSV_REL);
  if (!args.fileExists(abs)) return null;
  try {
    const rows = parse(args.readTextFile(abs), {
      columns: true,
      skip_empty_lines: true,
      relax_column_count: true,
    }) as RpwfeRepoCsvRowLike[];
    return rows.find((r) => r.filter_slug?.trim().toLowerCase() === FILTER_SLUG) ?? null;
  } catch {
    return null;
  }
}

function buildPlannedChange(
  row: RpwfeRepoCsvRowLike | null,
): RpwfePlannedRetailerLinksCsvChangeV1 | null {
  if (!row) return null;
  const gate = buyLinkGateFailureKind({
    retailer_key: row.retailer_key ?? null,
    affiliate_url: row.affiliate_url ?? "",
    browser_truth_classification: row.browser_truth_classification ?? null,
    browser_truth_buyable_subtype: null,
  });
  const state = mapSignalsToRetailerLinkState({
    browserTruthClassification: row.browser_truth_classification ?? null,
    gateFailureKind: gate,
  });
  const currentUrl = row.affiliate_url?.trim() || null;
  return {
    source_path: RETAILER_LINKS_CSV_REL,
    filter_slug: FILTER_SLUG,
    change_kind: "update_existing_primary_row_affiliate_url",
    current_row: {
      retailer_name: row.retailer_name?.trim() || null,
      retailer_key: row.retailer_key?.trim() || null,
      affiliate_url: currentUrl,
      is_primary: row.is_primary?.trim().toLowerCase() === "true" ? true : null,
      gate_failure_kind: gate,
      retailer_link_state: state,
      summary:
        "Primary OEM row points at GE Appliance Parts catalog search (searchKeyword=RPWFE); buy gates treat this as blocked search placeholder.",
    },
    proposed_row: {
      retailer_name: PROPOSED_RETAILER_NAME,
      retailer_key: PROPOSED_RETAILER_KEY,
      affiliate_url: RPWFE_OFFICIAL_GE_TARGET_URL_V1,
      is_primary: true,
      customer_visible_label: PROPOSED_CUSTOMER_LABEL,
      label_subtype: PROPOSED_LABEL_SUBTYPE,
      compatible_replacement: false,
      waterdrop: false,
      amazon: false,
      summary:
        "Replace affiliate_url with browser-proven official GE spec PDP; surface as BuckParts Verified Link (official manufacturer / official GE), not compatible replacement, not Waterdrop, not Amazon.",
    },
  };
}

function proposalReady(
  artifact: RpwfeOfficialGeBrowserEvidenceArtifactV1 | null,
): boolean {
  return (
    artifact !== null &&
    artifact.browser_truth_status === "PASS" &&
    artifact.apply_plan_proposal_ready === true
  );
}

export function buildRpwfeOfficialGeApplyPlanProposalLaneV1(args: {
  rootDir: string;
  fileExists?: (abs: string) => boolean;
  readTextFile?: (abs: string) => string;
  browserEvidenceReview?: RpwfeOfficialGeBrowserEvidenceReviewLaneV1 | null;
  supabaseParityStatus?: RpwfeProposedSupabaseParityStatusV1 | null;
}): RpwfeOfficialGeApplyPlanProposalLaneV1 {
  const fileExists = args.fileExists ?? existsSync;
  const readTextFile = args.readTextFile ?? ((p: string) => readFileSync(p, "utf8"));

  const artifact = loadRpwfeOfficialGeBrowserEvidenceArtifactV1({
    rootDir: args.rootDir,
    fileExists,
    readTextFile,
  });

  const browserStatus = artifact?.browser_truth_status ?? "UNKNOWN";
  const evidenceReady = proposalReady(artifact);
  const retailerRow = readRetailerLinkRow({ rootDir: args.rootDir, fileExists, readTextFile });
  const alreadyApplied = isRpwfeRepoCsvOfficialGeDirectBuyableApplied(retailerRow);
  const supabaseParityApplied = args.supabaseParityStatus === "SUPABASE_MATCHES_REPO_CSV";
  const currentRowState = rpwfeRepoCsvCurrentRowState(retailerRow);

  let planStatus: RpwfeOfficialGeApplyPlanProposalLaneV1["plan_status"] = "NOT_READY";
  let applyReady = false;
  let ownerReviewReady = false;
  let plannedChange: RpwfePlannedRetailerLinksCsvChangeV1 | null = null;
  let blockers: string[] = [];
  let next_recommended_action: string;

  if (alreadyApplied) {
    planStatus = "ALREADY_APPLIED_REPO_DIRECT_BUYABLE";
    blockers = supabaseParityApplied ? [...POST_SUPABASE_PARITY_BLOCKERS] : [...POST_APPLY_BLOCKERS];
    next_recommended_action = supabaseParityApplied
      ? "CSV and Supabase apply are both spent/no-op for rpwfe official GE. Run read-only live /filter/rpwfe purchase-option proof only — do not re-apply CSV or Supabase."
      : "CSV apply is spent/no-op: repo rpwfe row is already direct_buyable official GE spec PDP. Next owner step is read-only Supabase parity review (.command_center_v2.rpwfe_official_ge_supabase_parity_plan_v1) — do not re-apply CSV.";
  } else if (evidenceReady) {
    planStatus = "PROPOSED_OWNER_REVIEW_READY";
    applyReady = true;
    ownerReviewReady = true;
    plannedChange = buildPlannedChange(retailerRow);
    blockers = [...PRE_APPLY_BLOCKERS];
    if (!retailerRow) blockers.push("retailer_links_csv_row_missing_for_rpwfe");
    next_recommended_action =
      "Owner review this apply-plan proposal only. Explicit owner apply approval required before any data/retailer_links.csv mutation or BuckParts Verified Link authorization.";
  } else {
    blockers = [...PRE_APPLY_BLOCKERS];
    if (!artifact) blockers.push("browser_evidence_artifact_missing");
    if (browserStatus !== "PASS") blockers.push("official_ge_browser_truth_not_pass");
    if (!retailerRow) blockers.push("retailer_links_csv_row_missing_for_rpwfe");
    next_recommended_action =
      "Do not apply: apply-plan proposal is not ready until official GE browser evidence PASS is on disk.";
  }

  return {
    contract: RPWFE_OFFICIAL_GE_APPLY_PLAN_PROPOSAL_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    recommended_jq_path: RPWFE_OFFICIAL_GE_APPLY_PLAN_PROPOSAL_CC_JQ_PATH_V1,
    filter_slug: FILTER_SLUG,
    public_route: PUBLIC_ROUTE,
    emergency_classification: "HIGH_DEMAND_NO_VERIFIED_LINK_TRUST_GAP",
    browser_evidence_artifact_path: RPWFE_OFFICIAL_GE_ARTIFACT_REL_V1,
    browser_evidence_review_jq_path:
      ".command_center_v2.rpwfe_official_ge_browser_evidence_review_v1",
    browser_truth_status: browserStatus,
    plan_status: planStatus,
    csv_apply_noop: alreadyApplied,
    owner_apply_review_ready: ownerReviewReady,
    apply_plan_proposal_ready: applyReady,
    current_row_state: currentRowState,
    proposed_retailer: PROPOSED_RETAILER_NAME,
    proposed_url: RPWFE_OFFICIAL_GE_TARGET_URL_V1,
    proposed_customer_label: PROPOSED_CUSTOMER_LABEL,
    proposed_label_subtype: PROPOSED_LABEL_SUBTYPE,
    compatible_replacement_in_proposal: false,
    waterdrop_in_proposal: false,
    amazon_in_proposal: false,
    planned_retailer_links_csv_change: plannedChange,
    blockers,
    buckparts_verified_link_authorized: false,
    csv_apply_authorized: false,
    supabase_mutation_authorized: false,
    public_ui_mutation_authorized: false,
    netlify_api_authorized: false,
    deploy_authorized: false,
    evidence_write_authorized: false,
    next_recommended_action,
  };
}
