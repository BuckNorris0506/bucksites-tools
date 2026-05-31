/**
 * Command Center v1 projection for fridge buyer-path apply-plan approval (read-only).
 */

import {
  buildFridgeBuyerPathBatchApplyPlanApprovalReportV1,
  FRIDGE_BUYER_PATH_BATCH_APPLY_PLAN_APPROVAL_CONTRACT_V1,
  type BuildFridgeBuyerPathBatchApplyPlanApprovalDepsV1,
  type FridgeBuyerPathBatchApplyPlanApprovalReportV1,
} from "./fridge-buyer-path-batch-apply-plan-approval-v1";

export const FRIDGE_BUYER_PATH_BATCH_APPLY_PLAN_APPROVAL_CC_JQ_PATH_V1 =
  ".command_center_v2.fridge_buyer_path_batch_apply_plan_approval_v1" as const;

export const FRIDGE_BUYER_PATH_BATCH_APPLY_PLAN_APPROVAL_SOURCE_COMMAND_V1 =
  "npm run buckparts:fridge-buyer-path-batch-apply-plan-approval" as const;

export type FridgeBuyerPathBatchApplyPlanApprovalCommandCenterLaneV1 = {
  contract: typeof FRIDGE_BUYER_PATH_BATCH_APPLY_PLAN_APPROVAL_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  recommended_jq_path: typeof FRIDGE_BUYER_PATH_BATCH_APPLY_PLAN_APPROVAL_CC_JQ_PATH_V1;
  generated_at: string;
  source_command: typeof FRIDGE_BUYER_PATH_BATCH_APPLY_PLAN_APPROVAL_SOURCE_COMMAND_V1;
  source_apply_plan_artifact_rel_path: string;
  proposed_batch_id: string;
  run_id: string;
  plan_status: FridgeBuyerPathBatchApplyPlanApprovalReportV1["plan_status"];
  owner_review_status: FridgeBuyerPathBatchApplyPlanApprovalReportV1["owner_review_status"];
  planned_change_count: number;
  approval_status: FridgeBuyerPathBatchApplyPlanApprovalReportV1["approval_status"];
  owner_approval_required: true;
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

export function buildFridgeBuyerPathBatchApplyPlanApprovalCommandCenterLaneFromReportV1(
  report: FridgeBuyerPathBatchApplyPlanApprovalReportV1,
): FridgeBuyerPathBatchApplyPlanApprovalCommandCenterLaneV1 {
  return {
    contract: FRIDGE_BUYER_PATH_BATCH_APPLY_PLAN_APPROVAL_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    recommended_jq_path: FRIDGE_BUYER_PATH_BATCH_APPLY_PLAN_APPROVAL_CC_JQ_PATH_V1,
    generated_at: report.generated_at,
    source_command: FRIDGE_BUYER_PATH_BATCH_APPLY_PLAN_APPROVAL_SOURCE_COMMAND_V1,
    source_apply_plan_artifact_rel_path: report.source_apply_plan_artifact_rel_path,
    proposed_batch_id: report.proposed_batch_id,
    run_id: report.run_id,
    plan_status: report.plan_status,
    owner_review_status: report.owner_review_status,
    planned_change_count: report.planned_change_count,
    approval_status: report.approval_status,
    owner_approval_required: true,
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
      `PROVEN: Command Center lane ${FRIDGE_BUYER_PATH_BATCH_APPLY_PLAN_APPROVAL_CC_JQ_PATH_V1} surfaces approval_status=${report.approval_status}.`,
      `PROVEN: Full checklist_markdown on ${FRIDGE_BUYER_PATH_BATCH_APPLY_PLAN_APPROVAL_SOURCE_COMMAND_V1} stdout JSON.`,
    ],
    unknown_facts: [...report.unknown_facts],
  };
}

export function buildFridgeBuyerPathBatchApplyPlanApprovalCommandCenterLaneV1(
  deps: BuildFridgeBuyerPathBatchApplyPlanApprovalDepsV1,
): FridgeBuyerPathBatchApplyPlanApprovalCommandCenterLaneV1 {
  const report = buildFridgeBuyerPathBatchApplyPlanApprovalReportV1(deps);
  return buildFridgeBuyerPathBatchApplyPlanApprovalCommandCenterLaneFromReportV1(report);
}
