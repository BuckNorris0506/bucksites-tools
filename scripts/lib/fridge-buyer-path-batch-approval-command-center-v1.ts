/**
 * Command Center v1 projection for fridge buyer-path batch approval (read-only).
 */

import {
  buildFridgeBuyerPathBatchApprovalReportV1,
  FRIDGE_BUYER_PATH_BATCH_APPROVAL_CONTRACT_V1,
  type BuildFridgeBuyerPathBatchApprovalDepsV1,
  type FridgeBuyerPathBatchApprovalReportV1,
} from "./fridge-buyer-path-batch-approval-v1";

export const FRIDGE_BUYER_PATH_BATCH_APPROVAL_CC_JQ_PATH_V1 =
  ".command_center_v2.fridge_buyer_path_batch_approval_v1" as const;

export const FRIDGE_BUYER_PATH_BATCH_APPROVAL_SOURCE_COMMAND_V1 =
  "npm run buckparts:fridge-buyer-path-batch-approval" as const;

export type FridgeBuyerPathBatchApprovalCommandCenterLaneV1 = {
  contract: typeof FRIDGE_BUYER_PATH_BATCH_APPROVAL_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  recommended_jq_path: typeof FRIDGE_BUYER_PATH_BATCH_APPROVAL_CC_JQ_PATH_V1;
  generated_at: string;
  source_command: typeof FRIDGE_BUYER_PATH_BATCH_APPROVAL_SOURCE_COMMAND_V1;
  proposed_batch_id: string;
  proposed_row_count: number;
  proposed_slugs: string[];
  approval_status: FridgeBuyerPathBatchApprovalReportV1["approval_status"];
  owner_approval_required: true;
  apply_authorization_present: false;
  apply_mutation_authorized: false;
  csv_apply_authorized: false;
  retailer_links_mutation_authorized: false;
  supabase_mutation_authorized: false;
  public_ui_mutation_authorized: false;
  buy_link_mutation_authorized: false;
  formal_batch_exists: false;
  recommended_next_action: string;
  proven_facts: string[];
  unknown_facts: string[];
};

export type BuildFridgeBuyerPathBatchApprovalCommandCenterLaneDepsV1 =
  BuildFridgeBuyerPathBatchApprovalDepsV1;

export function buildFridgeBuyerPathBatchApprovalCommandCenterLaneFromReportV1(
  report: FridgeBuyerPathBatchApprovalReportV1,
): FridgeBuyerPathBatchApprovalCommandCenterLaneV1 {
  return {
    contract: FRIDGE_BUYER_PATH_BATCH_APPROVAL_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    recommended_jq_path: FRIDGE_BUYER_PATH_BATCH_APPROVAL_CC_JQ_PATH_V1,
    generated_at: report.generated_at,
    source_command: FRIDGE_BUYER_PATH_BATCH_APPROVAL_SOURCE_COMMAND_V1,
    proposed_batch_id: report.proposed_batch_id,
    proposed_row_count: report.proposed_row_count,
    proposed_slugs: report.proposed_slugs,
    approval_status: report.approval_status,
    owner_approval_required: true,
    apply_authorization_present: false,
    apply_mutation_authorized: false,
    csv_apply_authorized: false,
    retailer_links_mutation_authorized: false,
    supabase_mutation_authorized: false,
    public_ui_mutation_authorized: false,
    buy_link_mutation_authorized: false,
    formal_batch_exists: false,
    recommended_next_action: report.recommended_next_action,
    proven_facts: [
      ...report.proven_facts,
      `PROVEN: Command Center lane ${FRIDGE_BUYER_PATH_BATCH_APPROVAL_CC_JQ_PATH_V1} surfaces approval_status=${report.approval_status}.`,
      `PROVEN: Full checklist_markdown on ${FRIDGE_BUYER_PATH_BATCH_APPROVAL_SOURCE_COMMAND_V1} stdout JSON.`,
    ],
    unknown_facts: [...report.unknown_facts],
  };
}

export function buildFridgeBuyerPathBatchApprovalCommandCenterLaneV1(
  deps: BuildFridgeBuyerPathBatchApprovalCommandCenterLaneDepsV1,
): FridgeBuyerPathBatchApprovalCommandCenterLaneV1 {
  const report = buildFridgeBuyerPathBatchApprovalReportV1(deps);
  return buildFridgeBuyerPathBatchApprovalCommandCenterLaneFromReportV1(report);
}
