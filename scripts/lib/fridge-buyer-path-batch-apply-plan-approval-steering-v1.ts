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

export const FRIDGE_BUYER_PATH_BATCH_APPLY_PLAN_APPROVED_PLANNING_STEERING_STATUS_V1 =
  "APPROVED_FOR_PLANNING" as const;

export type FridgeBuyerPathBatchApplyPlanApprovalSteeringOverrideV1 = {
  next_best_action: string;
  why_this_action: string;
  next_move_command: string;
  source_apply_plan_artifact_rel_path: string;
  planned_change_count: number;
  approval_status: FridgeBuyerPathBatchApplyPlanApprovalCommandCenterLaneV1["approval_status"];
  mutation_block_reasons: string[];
};

function approvalLaneMutationFlagsFalse(
  approvalLane: Pick<
    FridgeBuyerPathBatchApplyPlanApprovalCommandCenterLaneV1,
    | "apply_mutation_authorized"
    | "csv_apply_authorized"
    | "retailer_links_mutation_authorized"
    | "supabase_mutation_authorized"
    | "public_ui_mutation_authorized"
    | "buy_link_mutation_authorized"
    | "evidence_write_authorized"
    | "netlify_api_authorized"
  >,
): boolean {
  return (
    approvalLane.apply_mutation_authorized === false &&
    approvalLane.csv_apply_authorized === false &&
    approvalLane.retailer_links_mutation_authorized === false &&
    approvalLane.supabase_mutation_authorized === false &&
    approvalLane.public_ui_mutation_authorized === false &&
    approvalLane.buy_link_mutation_authorized === false &&
    approvalLane.evidence_write_authorized === false &&
    approvalLane.netlify_api_authorized === false
  );
}

function approvalLaneMutationBlockReasonsV1(
  approvalLane: Pick<
    FridgeBuyerPathBatchApplyPlanApprovalCommandCenterLaneV1,
    | "approval_status"
    | "plan_status"
    | "owner_review_status"
    | "apply_mutation_authorized"
    | "csv_apply_authorized"
    | "retailer_links_mutation_authorized"
    | "supabase_mutation_authorized"
    | "public_ui_mutation_authorized"
    | "buy_link_mutation_authorized"
    | "evidence_write_authorized"
    | "netlify_api_authorized"
  >,
  extraReasons: string[] = [],
): string[] {
  return [
    `fridge_buyer_path_batch_apply_plan_approval_v1:approval_status=${approvalLane.approval_status}`,
    `fridge_buyer_path_batch_apply_plan_approval_v1:plan_status=${approvalLane.plan_status}`,
    `fridge_buyer_path_batch_apply_plan_approval_v1:owner_review_status=${approvalLane.owner_review_status}`,
    "fridge_buyer_path_batch_apply_plan_approval_v1:apply_mutation_authorized=false",
    "fridge_buyer_path_batch_apply_plan_approval_v1:csv_apply_authorized=false",
    "fridge_buyer_path_batch_apply_plan_approval_v1:retailer_links_mutation_authorized=false",
    "fridge_buyer_path_batch_apply_plan_approval_v1:supabase_mutation_authorized=false",
    "fridge_buyer_path_batch_apply_plan_approval_v1:public_ui_mutation_authorized=false",
    "fridge_buyer_path_batch_apply_plan_approval_v1:buy_link_mutation_authorized=false",
    "fridge_buyer_path_batch_apply_plan_approval_v1:evidence_write_authorized=false",
    "fridge_buyer_path_batch_apply_plan_approval_v1:netlify_api_authorized=false",
    ...extraReasons,
  ];
}

export function resolveFridgeBuyerPathBatchApplyPlanApprovedPlanningSteeringOverrideV1(args: {
  /** When true, refrigerator_water lifecycle is closed — stale apply-plan steering must not win. */
  refrigeratorWaterLifecycleClosed?: boolean;
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
  brainStopTheLine: boolean;
}): FridgeBuyerPathBatchApplyPlanApprovalSteeringOverrideV1 | null {
  if (args.brainStopTheLine) return null;
  if (args.refrigeratorWaterLifecycleClosed === true) return null;
  if (args.approvalLane.approval_status !== "owner_approved_for_next_planning_only") return null;
  if (args.approvalLane.planned_change_count < 1) return null;
  if (!approvalLaneMutationFlagsFalse(args.approvalLane)) return null;

  const count = args.approvalLane.planned_change_count;

  return {
    next_best_action:
      `BATCH APPLY-PLAN [${FRIDGE_BUYER_PATH_BATCH_APPLY_PLAN_APPROVED_PLANNING_STEERING_STATUS_V1}]: ` +
      `refrigerator_water apply-plan approval is recorded for ${String(count)} planned changes. ` +
      "Next step is read-only apply-readiness discovery; mutation unauthorized. " +
      "UNKNOWN: No dedicated post-approval apply-readiness npm command exists; fallback command is read-only apply-plan approval report. " +
      "Do not apply CSV, retailer_links, Supabase, public UI, buy-link, evidence, deploy, or Netlify changes.",
    why_this_action: args.approvalLane.recommended_next_action,
    next_move_command: FRIDGE_BUYER_PATH_BATCH_APPLY_PLAN_APPROVAL_SOURCE_COMMAND_V1,
    source_apply_plan_artifact_rel_path: args.approvalLane.source_apply_plan_artifact_rel_path,
    planned_change_count: count,
    approval_status: args.approvalLane.approval_status,
    mutation_block_reasons: approvalLaneMutationBlockReasonsV1(args.approvalLane, [
      "owner_approved_for_next_planning_only:planning_read_only_not_apply_ready",
      "UNKNOWN:no_dedicated_post_approval_apply_readiness_command",
    ]),
  };
}

export function resolveFridgeBuyerPathBatchApplyPlanApprovalSteeringOverrideV1(args: {
  refrigeratorWaterLifecycleClosed?: boolean;
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
  if (args.refrigeratorWaterLifecycleClosed === true) return null;
  if (args.approvalLane.approval_status !== "awaiting_owner_approval") return null;
  if (args.approvalLane.plan_status !== "READY_FOR_OWNER_REVIEW") return null;
  if (args.approvalLane.owner_review_status !== "OWNER_REVIEW_READY") return null;
  if (args.approvalLane.planned_change_count < 1) return null;
  if (args.applyPlanProposalLane.plan_status !== "READY_FOR_OWNER_REVIEW") return null;
  if (args.applyPlanProposalLane.owner_review_status !== "OWNER_REVIEW_READY") return null;
  if (!approvalLaneMutationFlagsFalse(args.approvalLane)) return null;
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
    mutation_block_reasons: approvalLaneMutationBlockReasonsV1(args.approvalLane, [
      "owner_approval_only:planning_read_only_not_apply_ready",
    ]),
  };
}
