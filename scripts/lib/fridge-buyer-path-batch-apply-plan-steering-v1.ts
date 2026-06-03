/**
 * Command Center steering — prefer proven READY_FOR_OWNER_REVIEW apply-plan proposals
 * over run-registry apply-plan discovery when batch planning is active.
 * Read-only; no mutation authorization.
 */

import { FRIDGE_BUYER_PATH_BATCH_BUCKPARTS_AMAZON_TAG_V1 } from "./fridge-buyer-path-batch-apply-plan-proposal-v1";
import {
  FRIDGE_BUYER_PATH_BATCH_APPLY_PLAN_PROPOSAL_SOURCE_COMMAND_V1,
  type FridgeBuyerPathBatchApplyPlanProposalCommandCenterLaneV1,
} from "./fridge-buyer-path-batch-apply-plan-proposal-command-center-v1";

export const FRIDGE_BUYER_PATH_BATCH_APPLY_PLAN_STEERING_STATUS_READY_V1 = "OWNER_REVIEW_READY" as const;
export const FRIDGE_BUYER_PATH_BATCH_APPLY_PLAN_STEERING_STATUS_RISK_V1 = "OWNER_REVIEW_RISK" as const;
export const FRIDGE_BUYER_PATH_BATCH_APPLY_PLAN_STEERING_STATUS_DUPLICATE_DESTINATION_REVIEW_V1 =
  "DUPLICATE_DESTINATION_REVIEW" as const;

export type FridgeBuyerPathBatchApplyPlanSteeringOverrideV1 = {
  next_best_action: string;
  why_this_action: string;
  next_move_command: string;
  plan_artifact_rel_path: string;
  planned_change_count: number;
  owner_review_status: FridgeBuyerPathBatchApplyPlanProposalCommandCenterLaneV1["owner_review_status"];
  mutation_block_reasons: string[];
};

export function resolveFridgeBuyerPathBatchApplyPlanSteeringPrefixV1(args: {
  owner_review_status: FridgeBuyerPathBatchApplyPlanProposalCommandCenterLaneV1["owner_review_status"];
  missing_affiliate_tag_count: number;
  duplicate_destination_group_count: number;
  duplicate_destination_group_review_status: FridgeBuyerPathBatchApplyPlanProposalCommandCenterLaneV1["duplicate_destination_group_review_status"];
}): string {
  if (args.missing_affiliate_tag_count > 0) {
    return FRIDGE_BUYER_PATH_BATCH_APPLY_PLAN_STEERING_STATUS_RISK_V1;
  }
  if (
    args.duplicate_destination_group_count > 0 &&
    args.duplicate_destination_group_review_status === "OWNER_REVIEW_REQUIRED"
  ) {
    return FRIDGE_BUYER_PATH_BATCH_APPLY_PLAN_STEERING_STATUS_DUPLICATE_DESTINATION_REVIEW_V1;
  }
  if (args.owner_review_status === "OWNER_REVIEW_BLOCKED") {
    return FRIDGE_BUYER_PATH_BATCH_APPLY_PLAN_STEERING_STATUS_RISK_V1;
  }
  return FRIDGE_BUYER_PATH_BATCH_APPLY_PLAN_STEERING_STATUS_READY_V1;
}

export function resolveFridgeBuyerPathBatchApplyPlanSteeringOverrideV1(args: {
  refrigeratorWaterLifecycleClosed?: boolean;
  applyPlanLane: Pick<
    FridgeBuyerPathBatchApplyPlanProposalCommandCenterLaneV1,
    | "plan_status"
    | "owner_review_status"
    | "planned_change_count"
    | "plan_artifact_rel_path"
    | "recommended_next_action"
    | "missing_affiliate_tag_count"
    | "duplicate_destination_group_count"
    | "duplicate_destination_group_review_status"
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
}): FridgeBuyerPathBatchApplyPlanSteeringOverrideV1 | null {
  if (args.brainStopTheLine) return null;
  if (args.refrigeratorWaterLifecycleClosed === true) return null;
  if (args.applyPlanLane.plan_status !== "READY_FOR_OWNER_REVIEW") return null;
  if (args.applyPlanLane.planned_change_count < 1) return null;
  if (args.applyPlanLane.apply_mutation_authorized !== false) return null;
  if (args.applyPlanLane.csv_apply_authorized !== false) return null;

  const path = args.applyPlanLane.plan_artifact_rel_path;
  const count = args.applyPlanLane.planned_change_count;
  const steeringStatus = resolveFridgeBuyerPathBatchApplyPlanSteeringPrefixV1({
    owner_review_status: args.applyPlanLane.owner_review_status,
    missing_affiliate_tag_count: args.applyPlanLane.missing_affiliate_tag_count,
    duplicate_destination_group_count: args.applyPlanLane.duplicate_destination_group_count,
    duplicate_destination_group_review_status:
      args.applyPlanLane.duplicate_destination_group_review_status,
  });

  let riskPhrase = "";
  if (args.applyPlanLane.missing_affiliate_tag_count > 0) {
    riskPhrase =
      ` Resolve ${String(args.applyPlanLane.missing_affiliate_tag_count)} missing ${FRIDGE_BUYER_PATH_BATCH_BUCKPARTS_AMAZON_TAG_V1} row(s) and review ${String(args.applyPlanLane.duplicate_destination_group_count)} duplicate proposed_destination_url group(s) before any owner approval.`;
  } else if (
    args.applyPlanLane.duplicate_destination_group_count > 0 &&
    args.applyPlanLane.duplicate_destination_group_review_status === "OWNER_REVIEW_REQUIRED"
  ) {
    riskPhrase =
      ` Review ${String(args.applyPlanLane.duplicate_destination_group_count)} duplicate proposed_destination_url group(s) before any owner approval.`;
  }

  return {
    next_best_action:
      `BATCH APPLY-PLAN [${steeringStatus}]: ` +
      `refrigerator_water apply-plan proposal is ready for owner review (${String(count)} planned changes; artifact path ${path}).` +
      riskPhrase +
      " Review plan only; mutation unauthorized. Do not apply CSV, retailer_links, Supabase, public UI, buy-link, evidence, deploy, or Netlify changes.",
    why_this_action: args.applyPlanLane.recommended_next_action,
    next_move_command: FRIDGE_BUYER_PATH_BATCH_APPLY_PLAN_PROPOSAL_SOURCE_COMMAND_V1,
    plan_artifact_rel_path: path,
    planned_change_count: count,
    owner_review_status: args.applyPlanLane.owner_review_status,
    mutation_block_reasons: [
      `fridge_buyer_path_batch_apply_plan_proposal_v1:plan_status=${args.applyPlanLane.plan_status}`,
      `fridge_buyer_path_batch_apply_plan_proposal_v1:owner_review_status=${args.applyPlanLane.owner_review_status}`,
      "fridge_buyer_path_batch_apply_plan_proposal_v1:apply_mutation_authorized=false",
      "fridge_buyer_path_batch_apply_plan_proposal_v1:csv_apply_authorized=false",
      "fridge_buyer_path_batch_apply_plan_proposal_v1:retailer_links_mutation_authorized=false",
      "fridge_buyer_path_batch_apply_plan_proposal_v1:supabase_mutation_authorized=false",
      "owner_review_only:not_mutation_ready",
    ],
  };
}
