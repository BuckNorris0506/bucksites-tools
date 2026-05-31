/**
 * Command Center steering — prefer proven READY_FOR_OWNER_REVIEW apply-plan proposals
 * over run-registry apply-plan discovery when batch planning is active.
 * Read-only; no mutation authorization.
 */

import {
  FRIDGE_BUYER_PATH_BATCH_APPLY_PLAN_PROPOSAL_SOURCE_COMMAND_V1,
  type FridgeBuyerPathBatchApplyPlanProposalCommandCenterLaneV1,
} from "./fridge-buyer-path-batch-apply-plan-proposal-command-center-v1";

export const FRIDGE_BUYER_PATH_BATCH_APPLY_PLAN_STEERING_STATUS_V1 = "OWNER_REVIEW_READY" as const;

export type FridgeBuyerPathBatchApplyPlanSteeringOverrideV1 = {
  next_best_action: string;
  why_this_action: string;
  next_move_command: string;
  plan_artifact_rel_path: string;
  planned_change_count: number;
  mutation_block_reasons: string[];
};

export function resolveFridgeBuyerPathBatchApplyPlanSteeringOverrideV1(args: {
  applyPlanLane: Pick<
    FridgeBuyerPathBatchApplyPlanProposalCommandCenterLaneV1,
    | "plan_status"
    | "planned_change_count"
    | "plan_artifact_rel_path"
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
}): FridgeBuyerPathBatchApplyPlanSteeringOverrideV1 | null {
  if (args.brainStopTheLine) return null;
  if (args.applyPlanLane.plan_status !== "READY_FOR_OWNER_REVIEW") return null;
  if (args.applyPlanLane.planned_change_count < 1) return null;
  if (args.applyPlanLane.apply_mutation_authorized !== false) return null;
  if (args.applyPlanLane.csv_apply_authorized !== false) return null;

  const path = args.applyPlanLane.plan_artifact_rel_path;
  const count = args.applyPlanLane.planned_change_count;

  return {
    next_best_action:
      `BATCH APPLY-PLAN [${FRIDGE_BUYER_PATH_BATCH_APPLY_PLAN_STEERING_STATUS_V1}]: ` +
      `refrigerator_water apply-plan proposal is ready for owner review (${String(count)} planned changes; artifact path ${path}). ` +
      "Review plan only; mutation unauthorized. Do not apply CSV, retailer_links, Supabase, public UI, buy-link, evidence, deploy, or Netlify changes.",
    why_this_action: args.applyPlanLane.recommended_next_action,
    next_move_command: FRIDGE_BUYER_PATH_BATCH_APPLY_PLAN_PROPOSAL_SOURCE_COMMAND_V1,
    plan_artifact_rel_path: path,
    planned_change_count: count,
    mutation_block_reasons: [
      "fridge_buyer_path_batch_apply_plan_proposal_v1:plan_status=READY_FOR_OWNER_REVIEW",
      "fridge_buyer_path_batch_apply_plan_proposal_v1:apply_mutation_authorized=false",
      "fridge_buyer_path_batch_apply_plan_proposal_v1:csv_apply_authorized=false",
      "fridge_buyer_path_batch_apply_plan_proposal_v1:retailer_links_mutation_authorized=false",
      "fridge_buyer_path_batch_apply_plan_proposal_v1:supabase_mutation_authorized=false",
      "owner_review_only:not_mutation_ready",
    ],
  };
}
