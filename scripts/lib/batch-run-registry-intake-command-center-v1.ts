/**
 * Command Center v1 projection for universal batch run-registry intake (read-only).
 */

import {
  BATCH_RUN_REGISTRY_INTAKE_CONTRACT_V1,
  buildBatchRunRegistryIntakeReportV1,
  type BatchRunRegistryIntakeReportV1,
  type BuildBatchRunRegistryIntakeDepsV1,
} from "./batch-run-registry-intake-v1";

export const BATCH_RUN_REGISTRY_INTAKE_CC_JQ_PATH_V1 =
  ".command_center_v2.batch_run_registry_intake_v1" as const;

export const BATCH_RUN_REGISTRY_INTAKE_SOURCE_COMMAND_V1 =
  "npm run buckparts:batch-run-registry-intake" as const;

export type BatchRunRegistryIntakeCommandCenterLaneV1 = BatchRunRegistryIntakeReportV1 & {
  recommended_jq_path: typeof BATCH_RUN_REGISTRY_INTAKE_CC_JQ_PATH_V1;
  source_command: typeof BATCH_RUN_REGISTRY_INTAKE_SOURCE_COMMAND_V1;
};

export function buildBatchRunRegistryIntakeCommandCenterLaneFromReportV1(
  report: BatchRunRegistryIntakeReportV1,
): BatchRunRegistryIntakeCommandCenterLaneV1 {
  return {
    ...report,
    recommended_jq_path: BATCH_RUN_REGISTRY_INTAKE_CC_JQ_PATH_V1,
    source_command: BATCH_RUN_REGISTRY_INTAKE_SOURCE_COMMAND_V1,
    proven_facts: [
      ...report.proven_facts,
      `PROVEN: Command Center lane ${BATCH_RUN_REGISTRY_INTAKE_CC_JQ_PATH_V1} is read-only projection; standalone stdout via ${BATCH_RUN_REGISTRY_INTAKE_SOURCE_COMMAND_V1}.`,
    ],
  };
}

export function buildBatchRunRegistryIntakeCommandCenterLaneV1(
  deps: BuildBatchRunRegistryIntakeDepsV1,
): BatchRunRegistryIntakeCommandCenterLaneV1 {
  const report = buildBatchRunRegistryIntakeReportV1(deps);
  return buildBatchRunRegistryIntakeCommandCenterLaneFromReportV1(report);
}

export { BATCH_RUN_REGISTRY_INTAKE_CONTRACT_V1 };
