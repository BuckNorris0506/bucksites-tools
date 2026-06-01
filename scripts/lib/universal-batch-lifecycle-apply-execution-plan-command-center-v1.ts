/**
 * Command Center projection for universal batch lifecycle apply execution plan (read-only).
 */

import {
  buildUniversalBatchLifecycleApplyExecutionPlanV1,
  UNIVERSAL_BATCH_LIFECYCLE_APPLY_EXECUTION_PLAN_CC_JQ_PATH_V1,
  UNIVERSAL_BATCH_LIFECYCLE_APPLY_EXECUTION_PLAN_CONTRACT_V1,
  UNIVERSAL_BATCH_LIFECYCLE_APPLY_EXECUTION_PLAN_SOURCE_COMMAND_V1,
  type BuildUniversalBatchLifecycleApplyExecutionPlanInputV1,
  type UniversalBatchLifecycleApplyExecutionPlanReportV1,
} from "./universal-batch-lifecycle-apply-execution-plan-v1";

export type UniversalBatchLifecycleApplyExecutionPlanCommandCenterLaneV1 =
  UniversalBatchLifecycleApplyExecutionPlanReportV1;

export function buildUniversalBatchLifecycleApplyExecutionPlanCommandCenterLaneV1(
  deps: BuildUniversalBatchLifecycleApplyExecutionPlanInputV1,
): UniversalBatchLifecycleApplyExecutionPlanCommandCenterLaneV1 {
  const report = buildUniversalBatchLifecycleApplyExecutionPlanV1(deps);
  return {
    ...report,
    proven_facts: [
      ...report.proven_facts,
      `PROVEN: Command Center lane ${UNIVERSAL_BATCH_LIFECYCLE_APPLY_EXECUTION_PLAN_CC_JQ_PATH_V1} is lifecycle-owned apply execution preview (not a fridge micro-lane).`,
      `PROVEN: Read-only CLI ${UNIVERSAL_BATCH_LIFECYCLE_APPLY_EXECUTION_PLAN_SOURCE_COMMAND_V1}.`,
    ],
    contract: UNIVERSAL_BATCH_LIFECYCLE_APPLY_EXECUTION_PLAN_CONTRACT_V1,
  };
}
