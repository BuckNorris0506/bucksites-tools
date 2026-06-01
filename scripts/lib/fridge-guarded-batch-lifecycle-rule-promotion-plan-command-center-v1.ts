/**
 * Command Center lane for owner-approval-ready promotion planning from inactive lifecycle rule proposals.
 *
 * Planning-only: this module never creates active rules, writes a rule registry, creates owner approval rows,
 * mutates CSV/Supabase/evidence, writes learning_outcomes, or wires enforcement.
 */

import type {
  FridgeGuardedBatchLifecycleRuleProposalLaneV1,
  FridgeGuardedBatchLifecycleRuleProposalV1,
} from "./fridge-guarded-batch-lifecycle-rule-proposal-command-center-v1";

export const FRIDGE_GUARDED_BATCH_LIFECYCLE_RULE_PROMOTION_PLAN_LANE_CONTRACT_V1 =
  "fridge_guarded_batch_lifecycle_rule_promotion_plan_command_center_v1" as const;
export const FRIDGE_GUARDED_BATCH_LIFECYCLE_RULE_PROMOTION_PLAN_CC_JQ_PATH_V1 =
  ".command_center_v2.fridge_guarded_batch_lifecycle_rule_promotion_plan_v1" as const;

export type FridgeGuardedBatchLifecycleRulePromotionCandidateV1 = {
  rule_id: FridgeGuardedBatchLifecycleRuleProposalV1["rule_id"];
  source_packet_path: string;
  batch_digest: string;
  rule_type: FridgeGuardedBatchLifecycleRuleProposalV1["rule_type"];
  rule_text: string;
  evidence_basis: string;
  enforcement_target: FridgeGuardedBatchLifecycleRuleProposalV1["enforcement_target"];
  proposed_active_state: true;
  owner_approval_required: true;
  promotion_authorized: false;
  active: false;
  write_authorized: false;
};

export type FridgeGuardedBatchLifecycleRulePromotionPlanLaneV1 = {
  contract: typeof FRIDGE_GUARDED_BATCH_LIFECYCLE_RULE_PROMOTION_PLAN_LANE_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  recommended_jq_path: typeof FRIDGE_GUARDED_BATCH_LIFECYCLE_RULE_PROMOTION_PLAN_CC_JQ_PATH_V1;
  lane_status: "OK" | "EMPTY" | "UNKNOWN";
  source_lane_jq_path: ".command_center_v2.fridge_guarded_batch_lifecycle_rule_proposal_v1";
  source_proposed_rule_count: number;
  promotion_candidate_count: number;
  owner_approval_required: true;
  promotion_authorized: false;
  active_rule_write_authorized: false;
  promotion_candidates: FridgeGuardedBatchLifecycleRulePromotionCandidateV1[];
  blockers: [
    "missing_owner_rule_promotion_approval",
    "active_rule_registry_not_created",
    "enforcement_not_wired",
    ...string[],
  ];
  next_agent_action: string;
  next_owner_action: string;
  proven_facts: string[];
  unknown_facts: string[];
};

function promotionCandidateFromProposal(
  rule: FridgeGuardedBatchLifecycleRuleProposalV1,
): FridgeGuardedBatchLifecycleRulePromotionCandidateV1 | null {
  if (rule.owner_approval_required !== true || rule.active !== false || rule.write_authorized !== false) {
    return null;
  }

  return {
    rule_id: rule.rule_id,
    source_packet_path: rule.source_packet_path,
    batch_digest: rule.batch_digest,
    rule_type: rule.rule_type,
    rule_text: rule.rule_text,
    evidence_basis: rule.evidence_basis,
    enforcement_target: rule.enforcement_target,
    proposed_active_state: true,
    owner_approval_required: true,
    promotion_authorized: false,
    active: false,
    write_authorized: false,
  };
}

export function buildFridgeGuardedBatchLifecycleRulePromotionPlanCommandCenterLaneV1(
  proposalLane: FridgeGuardedBatchLifecycleRuleProposalLaneV1 | null | undefined,
): FridgeGuardedBatchLifecycleRulePromotionPlanLaneV1 {
  const proposedRules = proposalLane?.proposed_rules ?? [];
  const promotionCandidates = proposedRules.flatMap((rule) => {
    const candidate = promotionCandidateFromProposal(rule);
    return candidate ? [candidate] : [];
  });
  const sourceProposedRuleCount = proposalLane?.proposed_rule_count ?? 0;
  const sourceMissing = proposalLane == null;
  const sourceBlocked = (proposalLane?.blockers.length ?? 0) > 0;
  const laneStatus: FridgeGuardedBatchLifecycleRulePromotionPlanLaneV1["lane_status"] = sourceMissing
    ? "UNKNOWN"
    : promotionCandidates.length > 0
      ? sourceBlocked
        ? "UNKNOWN"
        : "OK"
      : "EMPTY";
  const blockers: FridgeGuardedBatchLifecycleRulePromotionPlanLaneV1["blockers"] = [
    "missing_owner_rule_promotion_approval",
    "active_rule_registry_not_created",
    "enforcement_not_wired",
    ...(sourceMissing ? ["source_lifecycle_rule_proposal_lane_missing"] : []),
    ...(proposalLane?.blockers.map((blocker) => `source_lifecycle_rule_proposal_lane_blocker: ${blocker}`) ?? []),
  ];

  return {
    contract: FRIDGE_GUARDED_BATCH_LIFECYCLE_RULE_PROMOTION_PLAN_LANE_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    recommended_jq_path: FRIDGE_GUARDED_BATCH_LIFECYCLE_RULE_PROMOTION_PLAN_CC_JQ_PATH_V1,
    lane_status: laneStatus,
    source_lane_jq_path: ".command_center_v2.fridge_guarded_batch_lifecycle_rule_proposal_v1",
    source_proposed_rule_count: sourceProposedRuleCount,
    promotion_candidate_count: promotionCandidates.length,
    owner_approval_required: true,
    promotion_authorized: false,
    active_rule_write_authorized: false,
    promotion_candidates: promotionCandidates,
    blockers,
    next_agent_action:
      "Review promotion_candidates as owner-approval-ready planning only; do not create active rules, apply rules, wire enforcement, create owner approvals, mutate CSV/Supabase/evidence, or write learning_outcomes.",
    next_owner_action:
      promotionCandidates.length > 0
        ? "Review inactive promotion candidates and explicitly approve any future active rule registry plus enforcement wiring in a separate step."
        : "No lifecycle rule promotion candidates are available until inactive proposed rules are present.",
    proven_facts: [
      `PROVEN: Command Center lane ${FRIDGE_GUARDED_BATCH_LIFECYCLE_RULE_PROMOTION_PLAN_CC_JQ_PATH_V1} is read_only=true and data_mutation=false.`,
      "PROVEN: Promotion candidates propose active state but remain active=false, promotion_authorized=false, and write_authorized=false.",
    ],
    unknown_facts: blockers,
  };
}
