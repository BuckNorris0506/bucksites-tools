/**
 * Command Center lane for proposed lifecycle rules from closeout learning candidates.
 *
 * Proposal-only: this module never writes rule registries, owner approval rows, CSV,
 * Supabase, evidence, or learning_outcomes.
 */

import type {
  FridgeCloseoutLearningCandidateV1,
  FridgeGuardedBatchCloseoutLearningLaneV1,
} from "./fridge-guarded-batch-closeout-learning-command-center-v1";

export const FRIDGE_GUARDED_BATCH_LIFECYCLE_RULE_PROPOSAL_LANE_CONTRACT_V1 =
  "fridge_guarded_batch_lifecycle_rule_proposal_command_center_v1" as const;
export const FRIDGE_GUARDED_BATCH_LIFECYCLE_RULE_PROPOSAL_CC_JQ_PATH_V1 =
  ".command_center_v2.fridge_guarded_batch_lifecycle_rule_proposal_v1" as const;

export type FridgeGuardedBatchLifecycleRuleProposalV1 = {
  rule_id:
    | "go_first_hop_redirect_smoke_only"
    | "applied_parity_proven_is_closeout_state"
    | "block_repeat_guarded_csv_write_after_parity";
  source_packet_path: string;
  batch_digest: string;
  rule_type: FridgeCloseoutLearningCandidateV1["learning_type"];
  rule_text: string;
  evidence_basis: string;
  enforcement_target:
    | "go_redirect_smoke"
    | "universal_batch_lifecycle_truth_table"
    | "guarded_csv_apply_executor";
  owner_approval_required: true;
  active: false;
  write_authorized: false;
};

export type FridgeGuardedBatchLifecycleRuleProposalLaneV1 = {
  contract: typeof FRIDGE_GUARDED_BATCH_LIFECYCLE_RULE_PROPOSAL_LANE_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  recommended_jq_path: typeof FRIDGE_GUARDED_BATCH_LIFECYCLE_RULE_PROPOSAL_CC_JQ_PATH_V1;
  lane_status: "OK" | "EMPTY" | "UNKNOWN";
  source_lane_jq_path: ".command_center_v2.fridge_guarded_batch_closeout_learning_v1";
  source_candidate_count: number;
  proposed_rule_count: number;
  proposed_rules: FridgeGuardedBatchLifecycleRuleProposalV1[];
  blockers: string[];
  next_agent_action: string;
  next_owner_action: string;
  proven_facts: string[];
  unknown_facts: string[];
};

function ruleFromCandidate(
  candidate: FridgeCloseoutLearningCandidateV1,
): FridgeGuardedBatchLifecycleRuleProposalV1 | null {
  if (candidate.recommended_destination !== "lifecycle_rule_candidate") return null;
  if (candidate.owner_approval_required !== true || candidate.write_authorized !== false) return null;

  if (candidate.learning_type === "validation_methodology") {
    return {
      rule_id: "go_first_hop_redirect_smoke_only",
      source_packet_path: candidate.source_packet_path,
      batch_digest: candidate.batch_digest,
      rule_type: candidate.learning_type,
      rule_text:
        "/go smoke validation should prove the BuckParts first-hop redirect response only; it must not treat Amazon final-hop HTTP status as BuckParts route health.",
      evidence_basis: candidate.evidence_basis,
      enforcement_target: "go_redirect_smoke",
      owner_approval_required: true,
      active: false,
      write_authorized: false,
    };
  }

  if (candidate.learning_type === "lifecycle") {
    return {
      rule_id: "applied_parity_proven_is_closeout_state",
      source_packet_path: candidate.source_packet_path,
      batch_digest: candidate.batch_digest,
      rule_type: candidate.learning_type,
      rule_text:
        "APPLIED_PARITY_PROVEN with lifecycle_state=parity_verified should be proposed as a safe post-apply closeout state.",
      evidence_basis: candidate.evidence_basis,
      enforcement_target: "universal_batch_lifecycle_truth_table",
      owner_approval_required: true,
      active: false,
      write_authorized: false,
    };
  }

  if (candidate.learning_type === "safety") {
    return {
      rule_id: "block_repeat_guarded_csv_write_after_parity",
      source_packet_path: candidate.source_packet_path,
      batch_digest: candidate.batch_digest,
      rule_type: candidate.learning_type,
      rule_text:
        "Guarded CSV apply execution should block repeat CSV writes after post-apply parity has already been proven.",
      evidence_basis: candidate.evidence_basis,
      enforcement_target: "guarded_csv_apply_executor",
      owner_approval_required: true,
      active: false,
      write_authorized: false,
    };
  }

  return null;
}

export function buildFridgeGuardedBatchLifecycleRuleProposalCommandCenterLaneV1(
  sourceLane: FridgeGuardedBatchCloseoutLearningLaneV1 | null | undefined,
): FridgeGuardedBatchLifecycleRuleProposalLaneV1 {
  const sourceCandidates = sourceLane?.candidate_learning_items ?? [];
  const proposedRules = sourceCandidates.flatMap((candidate) => {
    const rule = ruleFromCandidate(candidate);
    return rule ? [rule] : [];
  });
  const sourceCandidateCount = sourceLane?.candidate_count ?? 0;
  const sourceMissing = sourceLane == null;
  const sourceBlocked = (sourceLane?.blockers.length ?? 0) > 0;
  const laneStatus: FridgeGuardedBatchLifecycleRuleProposalLaneV1["lane_status"] = sourceMissing
    ? "UNKNOWN"
    : proposedRules.length > 0
      ? sourceBlocked
        ? "UNKNOWN"
        : "OK"
      : "EMPTY";
  const blockers = [
    ...(sourceMissing ? ["source_closeout_learning_lane_missing"] : []),
    ...(sourceLane?.blockers.map((blocker) => `source_closeout_learning_lane_blocker: ${blocker}`) ?? []),
  ];

  return {
    contract: FRIDGE_GUARDED_BATCH_LIFECYCLE_RULE_PROPOSAL_LANE_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    recommended_jq_path: FRIDGE_GUARDED_BATCH_LIFECYCLE_RULE_PROPOSAL_CC_JQ_PATH_V1,
    lane_status: laneStatus,
    source_lane_jq_path: ".command_center_v2.fridge_guarded_batch_closeout_learning_v1",
    source_candidate_count: sourceCandidateCount,
    proposed_rule_count: proposedRules.length,
    proposed_rules: proposedRules,
    blockers,
    next_agent_action:
      "Review proposed_rules as inactive lifecycle-rule proposals only; do not apply rules, create owner approvals, mutate CSV/Supabase/evidence, or write learning_outcomes from this lane.",
    next_owner_action:
      proposedRules.length > 0
        ? "Review inactive lifecycle rule proposals and explicitly approve any future active rule registry work in a separate step."
        : "No lifecycle rule proposals are available until closeout learning candidates are present.",
    proven_facts: [
      `PROVEN: Command Center lane ${FRIDGE_GUARDED_BATCH_LIFECYCLE_RULE_PROPOSAL_CC_JQ_PATH_V1} is read_only=true and data_mutation=false.`,
      "PROVEN: Proposed lifecycle rules are emitted with active=false and write_authorized=false.",
    ],
    unknown_facts: blockers,
  };
}
