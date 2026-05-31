/**
 * Command Center steering — prefer apply-plan owner approval when artifact is
 * OWNER_REVIEW_READY but founder decision is still awaiting_owner_approval.
 * Read-only; no mutation authorization.
 */

import {
  FRIDGE_BUYER_PATH_BATCH_APPLY_PLAN_APPROVAL_SOURCE_COMMAND_V1,
  type FridgeBuyerPathBatchApplyPlanApprovalCommandCenterLaneV1,
} from "./fridge-buyer-path-batch-apply-plan-approval-command-center-v1";
import type { FridgeBuyerPathBatchApplyPlanProposalCommandCenterLaneV1 } from "./fridge-buyer-path-batch-apply-plan-proposal-command-center-v1";

export const FRIDGE_BUYER_PATH_BATCH_APPLY_PLAN_APPROVAL_STEERING_STATUS_V1 =
  "OWNER_APPROVAL_REQUIRED" as const;

export type FridgeBuyerPathBatchApplyPlanApprovalSteeringOverrideV1 = {
  next_best_action: string;
  why_this_action: string;
  next_move_command: string;
  source_apply_plan_artifact_rel_path: string;
  planned_change_count: number;
  approval_status: FridgeBuyerPathBatchApplyPlanApprovalCommandCenterLaneV1["approval_status"];
  mutation_block_reasons: string[];
};

export function resolveFridgeBuyerPathBatchApplyPlanApprovalSteeringOverrideV1(args: {
  approvalLane: Pick<
    FridgeBuyerPathBatchApplyPlanApprovalCommandCenterLaneV1,
    | "approval_status"
    | "plan_status"
    | "owner_review_status"
    | "planned_change_count"
    | "source_apply_plan_artifact_rel_path"
    | "recommended_next_action"
    | "apply_mutation_authorized"
    | "csv_apply_authorized"
    | "retailer_links_mutation_authorized"
    | "supabase_mutation_authorized"
    | "public_ui_mutation_authorized"
    | "buy_link_mutation_authorized"
    | "evidence_write_authorized"
    | "netlify_api_authorized"
  >;
  applyPlanProposalLane: Pick<
    FridgeBuyerPathBatchApplyPlanProposalCommandCenterLaneV1,
    "plan_status" | "owner_review_status" | "apply_mutation_authorized" | "csv_apply_authorized"
  >;
  brainStopTheLine: boolean;
}): FridgeBuyerPathBatchApplyPlanApprovalSteeringOverrideV1 | null {
  if (args.brainStopTheLine) return null;
  if (args.approvalLane.approval_status !== "awaiting_owner_approval") return null;
  if (args.approvalLane.plan_status !== "READY_FOR_OWNER_REVIEW") return null;
  if (args.approvalLane.owner_review_status !== "OWNER_REVIEW_READY") return null;
  if (args.approvalLane.planned_change_count < 1) return null;
  if (args.applyPlanProposalLane.plan_status !== "READY_FOR_OWNER_REVIEW") return null;
  if (args.applyPlanProposalLane.owner_review_status !== "OWNER_REVIEW_READY") return null;
  if (args.approvalLane.apply_mutation_authorized !== false) return null;
  if (args.approvalLane.csv_apply_authorized !== false) return null;
  if (args.approvalLane.retailer_links_mutation_authorized !== false) return null;
  if (args.approvalLane.supabase_mutation_authorized !== false) return null;
  if (args.approvalLane.public_ui_mutation_authorized !== false) return null;
  if (args.approvalLane.buy_link_mutation_authorized !== false) return null;
  if (args.approvalLane.evidence_write_authorized !== false) return null;
  if (args.approvalLane.netlify_api_authorized !== false) return null;
  if (args.applyPlanProposalLane.apply_mutation_authorized !== false) return null;
  if (args.applyPlanProposalLane.csv_apply_authorized !== false) return null;

  const path = args.approvalLane.source_apply_plan_artifact_rel_path;
  const count = args.approvalLane.planned_change_count;

  return {
    next_best_action:
      `BATCH APPLY-PLAN [${FRIDGE_BUYER_PATH_BATCH_APPLY_PLAN_APPROVAL_STEERING_STATUS_V1}]: ` +
      `refrigerator_water apply-plan artifact requires owner approval (${String(count)} planned changes; artifact path ${path}). ` +
      "Owner approval is planning/read-only only and does not authorize applying planned_changes. " +
      "Mutation unauthorized. Do not apply CSV, retailer_links, Supabase, public UI, buy-link, evidence, deploy, or Netlify changes.",
    why_this_action: args.approvalLane.recommended_next_action,
    next_move_command: FRIDGE_BUYER_PATH_BATCH_APPLY_PLAN_APPROVAL_SOURCE_COMMAND_V1,
    source_apply_plan_artifact_rel_path: path,
    planned_change_count: count,
    approval_status: args.approvalLane.approval_status,
    mutation_block_reasons: [
      `fridge_buyer_path_batch_apply_plan_approval_v1:approval_status=${args.approvalLane.approval_status}`,
      `fridge_buyer_path_batch_apply_plan_approval_v1:plan_status=${args.approvalLane.plan_status}`,
      `fridge_buyer_path_batch_apply_plan_approval_v1:owner_review_status=${args.approvalLane.owner_review_status}`,
      "fridge_buyer_path_batch_apply_plan_approval_v1:apply_mutation_authorized=false",
      "fridge_buyer_path_batch_apply_plan_approval_v1:csv_apply_authorized=false",
      "fridge_buyer_path_batch_apply_plan_approval_v1:retailer_links_mutation_authorized=false",
      "fridge_buyer_path_batch_apply_plan_approval_v1:supabase_mutation_authorized=false",
      "fridge_buyer_path_batch_apply_plan_approval_v1:public_ui_mutation_authorized=false",
      "fridge_buyer_path_batch_apply_plan_approval_v1:buy_link_mutation_authorized=false",
      "fridge_buyer_path_batch_apply_plan_approval_v1:evidence_write_authorized=false",
      "fridge_buyer_path_batch_apply_plan_approval_v1:netlify_api_authorized=false",
      "owner_approval_only:planning_read_only_not_apply_ready",
    ],
  };
}
