/**
 * Command Center v2 projection for Owner Decision Queue v1 (read-only).
 */

import {
  buildOwnerDecisionQueueProjectionV1,
  missingOwnerDecisionQueueFallbackV1,
  OWNER_DECISION_QUEUE_CC_JQ_PATH_V1,
  OWNER_DECISION_QUEUE_CONTRACT_V1,
  OWNER_DECISION_QUEUE_MANIFEST_REL_V1,
  type OwnerDecisionQueueProjectionV1,
  type OwnerDecisionRequestProjectionV1,
} from "@/lib/owner-dashboard/owner-decision-queue-v1";

export const OWNER_DECISION_QUEUE_CC_LANE_CONTRACT_V1 = "owner_decision_queue_v1" as const;

export type OwnerDecisionQueueCommandCenterLaneV1 = OwnerDecisionQueueProjectionV1 & {
  contract: typeof OWNER_DECISION_QUEUE_CC_LANE_CONTRACT_V1;
  recommended_jq_path: typeof OWNER_DECISION_QUEUE_CC_JQ_PATH_V1;
  source_command: "node --import tsx scripts/report-buckparts-command-center.ts";
  recommended_next_action: string;
};

export function buildOwnerDecisionQueueCommandCenterLaneV1(args: {
  rootDir: string;
  now?: () => Date;
}): OwnerDecisionQueueCommandCenterLaneV1 {
  const projection = buildOwnerDecisionQueueProjectionV1(args);
  return {
    ...projection,
    contract: OWNER_DECISION_QUEUE_CC_LANE_CONTRACT_V1,
    recommended_jq_path: OWNER_DECISION_QUEUE_CC_JQ_PATH_V1,
    source_command: "node --import tsx scripts/report-buckparts-command-center.ts",
    recommended_next_action: buildRecommendedNextActionV1(projection),
  };
}

export function buildOwnerDecisionQueueCommandCenterLaneUnknownV1(args: {
  generated_at: string;
  reason: string;
}): OwnerDecisionQueueCommandCenterLaneV1 {
  const fallback = missingOwnerDecisionQueueFallbackV1({
    generated_at: args.generated_at,
    reason: args.reason,
  });
  return {
    ...fallback,
    contract: OWNER_DECISION_QUEUE_CC_LANE_CONTRACT_V1,
    recommended_jq_path: OWNER_DECISION_QUEUE_CC_JQ_PATH_V1,
    source_command: "node --import tsx scripts/report-buckparts-command-center.ts",
    recommended_next_action: `UNKNOWN: Owner decision queue lane failed — ${args.reason}`,
  };
}

function buildRecommendedNextActionV1(projection: OwnerDecisionQueueProjectionV1): string {
  if (projection.pending_count > 0) {
    const top = projection.top_pending_decisions[0];
    if (top) {
      return `PROVEN: ${String(projection.pending_count)} pending owner decision(s) — review ${top.request_artifact_rel_path}; record outcome in founder_decision_registry_v1 (not queue auto-approve).`;
    }
    return `PROVEN: ${String(projection.pending_count)} pending owner decision(s) — review queue artifacts under ${OWNER_DECISION_QUEUE_MANIFEST_REL_V1}.`;
  }
  if (projection.stale_count > 0) {
    return "PROVEN: Stale owner decision request(s) present — refresh evidence or supersede before mutation.";
  }
  return "PROVEN: No pending owner decisions in queue — existing founder_decision_registry_v1 rows remain authoritative.";
}

export type { OwnerDecisionRequestProjectionV1 };
