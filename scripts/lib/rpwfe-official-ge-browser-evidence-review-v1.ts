/**
 * Command Center read-only lane for RPWFE official GE browser evidence artifact.
 * Does not apply BuckParts Verified Links or mutate CSV/Supabase/public UI.
 */

import {
  loadRpwfeOfficialGeBrowserEvidenceArtifactV1,
  RPWFE_OFFICIAL_GE_ARTIFACT_REL_V1,
  RPWFE_OFFICIAL_GE_TARGET_URL_V1,
  type RpwfeOfficialGeBrowserEvidenceArtifactV1,
} from "./rpwfe-official-ge-browser-capture-v1";
import type { RpwfeVerifiedLinkRescuePlanLaneV1 } from "./rpwfe-verified-link-rescue-plan-v1";

export const RPWFE_OFFICIAL_GE_BROWSER_EVIDENCE_REVIEW_CONTRACT_V1 =
  "rpwfe_official_ge_browser_evidence_review_v1" as const;

export const RPWFE_OFFICIAL_GE_BROWSER_EVIDENCE_REVIEW_CC_JQ_PATH_V1 =
  ".command_center_v2.rpwfe_official_ge_browser_evidence_review_v1" as const;

export type RpwfeOfficialGeBrowserEvidenceReviewLaneV1 = {
  contract: typeof RPWFE_OFFICIAL_GE_BROWSER_EVIDENCE_REVIEW_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  recommended_jq_path: typeof RPWFE_OFFICIAL_GE_BROWSER_EVIDENCE_REVIEW_CC_JQ_PATH_V1;
  filter_slug: "rpwfe";
  emergency_classification: "HIGH_DEMAND_NO_VERIFIED_LINK_TRUST_GAP";
  source_rescue_plan_status: string;
  source_rescue_plan_jq_path: ".command_center_v2.rpwfe_verified_link_rescue_plan_v1";
  artifact_path: typeof RPWFE_OFFICIAL_GE_ARTIFACT_REL_V1;
  artifact_present: boolean;
  target_url: typeof RPWFE_OFFICIAL_GE_TARGET_URL_V1;
  checked_at: string | null;
  browser_truth_status: "PASS" | "FAIL" | "UNKNOWN";
  direct_pdp_status: "PROVEN" | "NOT_PROVEN" | "UNKNOWN";
  exact_token_visible: boolean | "UNKNOWN";
  official_manufacturer_path: boolean | "UNKNOWN";
  direct_purchase_control_visible: boolean | "UNKNOWN";
  official_ge_verified_link_candidate_status:
    | "BROWSER_PROVEN_OWNER_REVIEW_READY"
    | "BROWSER_FAILED"
    | "BROWSER_UNKNOWN"
    | "ARTIFACT_MISSING";
  owner_review_ready: boolean;
  apply_plan_proposal_ready: boolean;
  evidence_summary: string | null;
  blockers: string[];
  waterdrop_in_scope: false;
  buckparts_verified_link_authorized: false;
  csv_apply_authorized: false;
  supabase_mutation_authorized: false;
  public_ui_mutation_authorized: false;
  netlify_api_authorized: false;
  deploy_authorized: false;
  evidence_write_authorized: false;
  next_recommended_action: string;
};

function mapCandidateStatus(
  artifact: RpwfeOfficialGeBrowserEvidenceArtifactV1 | null,
): RpwfeOfficialGeBrowserEvidenceReviewLaneV1["official_ge_verified_link_candidate_status"] {
  if (!artifact) return "ARTIFACT_MISSING";
  if (artifact.browser_truth_status === "PASS") return "BROWSER_PROVEN_OWNER_REVIEW_READY";
  if (artifact.browser_truth_status === "FAIL") return "BROWSER_FAILED";
  return "BROWSER_UNKNOWN";
}

export function buildRpwfeOfficialGeBrowserEvidenceReviewLaneV1(args: {
  rootDir: string;
  fileExists?: (abs: string) => boolean;
  readTextFile?: (abs: string) => string;
  rescuePlan: RpwfeVerifiedLinkRescuePlanLaneV1 | null;
}): RpwfeOfficialGeBrowserEvidenceReviewLaneV1 {
  const artifact = loadRpwfeOfficialGeBrowserEvidenceArtifactV1({
    rootDir: args.rootDir,
    fileExists: args.fileExists,
    readTextFile: args.readTextFile,
  });

  const browserStatus = artifact?.browser_truth_status ?? "UNKNOWN";
  const ownerReviewReady = artifact?.owner_review_ready === true;
  const applyPlanReady =
    browserStatus === "PASS" && artifact?.apply_plan_proposal_ready === true;

  const blockers = [...(artifact?.blockers ?? [])];
  if (!artifact) blockers.push("browser_evidence_artifact_missing");
  if (browserStatus !== "PASS") blockers.push("official_ge_browser_truth_not_pass");

  const rescueStatus =
    args.rescuePlan?.official_ge_candidate.status ?? "UNKNOWN";

  let next_recommended_action: string;
  if (!artifact) {
    next_recommended_action =
      "Run read-only capture: npx tsx scripts/capture-rpwfe-official-ge-browser-evidence-v1.ts (owner-authorized; no CSV apply).";
  } else if (browserStatus === "PASS") {
    next_recommended_action =
      "Owner review: browser evidence PASS for official GE spec PDP. Propose a separate apply plan if approved — do not apply BuckParts Verified Link without explicit owner authorization.";
  } else if (browserStatus === "FAIL") {
    next_recommended_action =
      "Do not propose CSV apply: browser evidence FAIL. Re-capture or investigate blockers before owner review.";
  } else {
    next_recommended_action =
      "Resolve UNKNOWN browser evidence before apply plan proposal.";
  }

  return {
    contract: RPWFE_OFFICIAL_GE_BROWSER_EVIDENCE_REVIEW_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    recommended_jq_path: RPWFE_OFFICIAL_GE_BROWSER_EVIDENCE_REVIEW_CC_JQ_PATH_V1,
    filter_slug: "rpwfe",
    emergency_classification: "HIGH_DEMAND_NO_VERIFIED_LINK_TRUST_GAP",
    source_rescue_plan_status: rescueStatus,
    source_rescue_plan_jq_path: ".command_center_v2.rpwfe_verified_link_rescue_plan_v1",
    artifact_path: RPWFE_OFFICIAL_GE_ARTIFACT_REL_V1,
    artifact_present: artifact !== null,
    target_url: RPWFE_OFFICIAL_GE_TARGET_URL_V1,
    checked_at: artifact?.checked_at ?? null,
    browser_truth_status: browserStatus,
    direct_pdp_status: artifact?.direct_pdp_status ?? "UNKNOWN",
    exact_token_visible: artifact?.exact_token_visible ?? "UNKNOWN",
    official_manufacturer_path: artifact?.official_manufacturer_path ?? "UNKNOWN",
    direct_purchase_control_visible: artifact?.direct_purchase_control_visible ?? "UNKNOWN",
    official_ge_verified_link_candidate_status: mapCandidateStatus(artifact),
    owner_review_ready: ownerReviewReady,
    apply_plan_proposal_ready: applyPlanReady,
    evidence_summary: artifact?.evidence_summary ?? null,
    blockers,
    waterdrop_in_scope: false,
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
