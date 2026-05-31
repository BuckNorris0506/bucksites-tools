/**
 * Command Center v1 projection for owner drift detector (read-only).
 */

import {
  buildOwnerDriftDetectorReportV1,
  OWNER_DRIFT_DETECTOR_CONTRACT_V1,
  OWNER_DRIFT_DETECTOR_DEFAULT_VAULT_IDEA_V1,
  type BuildOwnerDriftExecutionContextInputV1,
  type OwnerDriftDetectorReportV1,
} from "./owner-drift-detector-v1";

export const OWNER_DRIFT_DETECTOR_CC_JQ_PATH_V1 =
  ".command_center_v2.owner_drift_detector_v1" as const;

export const OWNER_DRIFT_DETECTOR_SOURCE_COMMAND_V1 =
  "npm run buckparts:owner-drift-detector" as const;

export type OwnerDriftDetectorCommandCenterLaneV1 = OwnerDriftDetectorReportV1 & {
  recommended_jq_path: typeof OWNER_DRIFT_DETECTOR_CC_JQ_PATH_V1;
  source_command: typeof OWNER_DRIFT_DETECTOR_SOURCE_COMMAND_V1;
  default_example_idea: typeof OWNER_DRIFT_DETECTOR_DEFAULT_VAULT_IDEA_V1;
};

export type BuildOwnerDriftDetectorCommandCenterLaneDepsV1 = BuildOwnerDriftExecutionContextInputV1 & {
  rootDir: string;
  now?: () => Date;
  idea?: string;
};

export function buildOwnerDriftDetectorCommandCenterLaneFromReportV1(
  report: OwnerDriftDetectorReportV1,
): OwnerDriftDetectorCommandCenterLaneV1 {
  return {
    ...report,
    recommended_jq_path: OWNER_DRIFT_DETECTOR_CC_JQ_PATH_V1,
    source_command: OWNER_DRIFT_DETECTOR_SOURCE_COMMAND_V1,
    default_example_idea: OWNER_DRIFT_DETECTOR_DEFAULT_VAULT_IDEA_V1,
    proven_facts: [
      ...report.proven_facts,
      `PROVEN: Command Center lane ${OWNER_DRIFT_DETECTOR_CC_JQ_PATH_V1} is read-only projection; classify other ideas via ${OWNER_DRIFT_DETECTOR_SOURCE_COMMAND_V1} -- --idea \"...\".`,
    ],
  };
}

export function buildOwnerDriftDetectorCommandCenterLaneV1(
  deps: BuildOwnerDriftDetectorCommandCenterLaneDepsV1,
): OwnerDriftDetectorCommandCenterLaneV1 {
  const report = buildOwnerDriftDetectorReportV1({
    rootDir: deps.rootDir,
    now: deps.now,
    idea: deps.idea ?? OWNER_DRIFT_DETECTOR_DEFAULT_VAULT_IDEA_V1,
    next_best_action: deps.next_best_action,
    fridge_batch_proposal: deps.fridge_batch_proposal,
    fridge_owner_review_packet: deps.fridge_owner_review_packet,
    batch_dispatch: deps.batch_dispatch,
    brain_manifest: deps.brain_manifest,
    extra_lane_mutation_flags: deps.extra_lane_mutation_flags,
  });
  return buildOwnerDriftDetectorCommandCenterLaneFromReportV1(report);
}
