/**
 * Command Center v1 projection for fridge buyer-path batch apply-plan proposal (read-only).
 */

import {
  buildFridgeBuyerPathBatchApplyPlanProposalV1,
  FRIDGE_BUYER_PATH_BATCH_APPLY_PLAN_PROPOSAL_CONTRACT_V1,
  type BuildFridgeBuyerPathBatchApplyPlanProposalDepsV1,
  type FridgeBuyerPathBatchApplyPlanProposalReportV1,
} from "./fridge-buyer-path-batch-apply-plan-proposal-v1";

export const FRIDGE_BUYER_PATH_BATCH_APPLY_PLAN_PROPOSAL_CC_JQ_PATH_V1 =
  ".command_center_v2.fridge_buyer_path_batch_apply_plan_proposal_v1" as const;

export const FRIDGE_BUYER_PATH_BATCH_APPLY_PLAN_PROPOSAL_SOURCE_COMMAND_V1 =
  "npm run buckparts:fridge-buyer-path-batch-apply-plan-proposal" as const;

export type FridgeBuyerPathBatchApplyPlanProposalCommandCenterLaneV1 = {
  contract: typeof FRIDGE_BUYER_PATH_BATCH_APPLY_PLAN_PROPOSAL_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  recommended_jq_path: typeof FRIDGE_BUYER_PATH_BATCH_APPLY_PLAN_PROPOSAL_CC_JQ_PATH_V1;
  generated_at: string;
  source_command: typeof FRIDGE_BUYER_PATH_BATCH_APPLY_PLAN_PROPOSAL_SOURCE_COMMAND_V1;
  proposed_batch_id: string;
  run_id: string;
  plan_status: FridgeBuyerPathBatchApplyPlanProposalReportV1["plan_status"];
  owner_review_status: FridgeBuyerPathBatchApplyPlanProposalReportV1["owner_review_status"];
  plan_status_reasons: string[];
  planned_change_count: number;
  planned_slugs: string[];
  blocked_row_count: number;
  missing_affiliate_tag_count: number;
  duplicate_destination_group_count: number;
  duplicate_destination_group_review_status: FridgeBuyerPathBatchApplyPlanProposalReportV1["duplicate_destination_group_review_status"];
  owner_review_risk_count: number;
  plan_artifact_rel_path: string;
  apply_mutation_authorized: false;
  csv_apply_authorized: false;
  retailer_links_mutation_authorized: false;
  supabase_mutation_authorized: false;
  public_ui_mutation_authorized: false;
  buy_link_mutation_authorized: false;
  evidence_write_authorized: false;
  netlify_api_authorized: false;
  recommended_next_action: string;
  proven_facts: string[];
  unknown_facts: string[];
};

export function buildFridgeBuyerPathBatchApplyPlanProposalCommandCenterLaneFromReportV1(
  report: FridgeBuyerPathBatchApplyPlanProposalReportV1,
): FridgeBuyerPathBatchApplyPlanProposalCommandCenterLaneV1 {
  return {
    contract: FRIDGE_BUYER_PATH_BATCH_APPLY_PLAN_PROPOSAL_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    recommended_jq_path: FRIDGE_BUYER_PATH_BATCH_APPLY_PLAN_PROPOSAL_CC_JQ_PATH_V1,
    generated_at: report.generated_at,
    source_command: FRIDGE_BUYER_PATH_BATCH_APPLY_PLAN_PROPOSAL_SOURCE_COMMAND_V1,
    proposed_batch_id: report.proposed_batch_id,
    run_id: report.run_id,
    plan_status: report.plan_status,
    owner_review_status: report.owner_review_status,
    plan_status_reasons: report.plan_status_reasons,
    planned_change_count: report.planned_change_count,
    planned_slugs: report.planned_changes.map((row) => row.slug),
    blocked_row_count: report.blocked_rows.length,
    missing_affiliate_tag_count: report.missing_affiliate_tag_count,
    duplicate_destination_group_count: report.duplicate_destination_group_count,
    duplicate_destination_group_review_status: report.duplicate_destination_group_review_status,
    owner_review_risk_count: report.owner_review_risk_count,
    plan_artifact_rel_path: report.plan_artifact_rel_path,
    apply_mutation_authorized: false,
    csv_apply_authorized: false,
    retailer_links_mutation_authorized: false,
    supabase_mutation_authorized: false,
    public_ui_mutation_authorized: false,
    buy_link_mutation_authorized: false,
    evidence_write_authorized: false,
    netlify_api_authorized: false,
    recommended_next_action: report.recommended_next_action,
    proven_facts: [
      ...report.proven_facts,
      `PROVEN: Command Center lane ${FRIDGE_BUYER_PATH_BATCH_APPLY_PLAN_PROPOSAL_CC_JQ_PATH_V1} is read-only summary projection of ${report.report_name}.`,
      "PROVEN: Full planned_changes remain on npm run buckparts:fridge-buyer-path-batch-apply-plan-proposal stdout JSON.",
    ],
    unknown_facts: [...report.unknown_facts],
  };
}

export function buildFridgeBuyerPathBatchApplyPlanProposalCommandCenterLaneV1(
  deps: BuildFridgeBuyerPathBatchApplyPlanProposalDepsV1,
): FridgeBuyerPathBatchApplyPlanProposalCommandCenterLaneV1 {
  const report = buildFridgeBuyerPathBatchApplyPlanProposalV1(deps);
  return buildFridgeBuyerPathBatchApplyPlanProposalCommandCenterLaneFromReportV1(report);
}
