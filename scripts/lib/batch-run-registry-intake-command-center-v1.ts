/**
 * Command Center v1 projection for universal batch run-registry intake (read-only).
 */

import {
  AP_RUN_REGISTRY_DEFAULT_REL_V1,
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

export function buildBatchRunRegistryIntakeReportUnknownV1(args: {
  generated_at: string;
  reason: string;
  apRunRegistryRelPath?: string;
}): BatchRunRegistryIntakeReportV1 {
  const apRel = args.apRunRegistryRelPath ?? AP_RUN_REGISTRY_DEFAULT_REL_V1;
  return {
    contract: BATCH_RUN_REGISTRY_INTAKE_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    generated_at: args.generated_at,
    wedges: [
      {
        wedge: "air_purifier",
        run_registry_rel_path: null,
        run_registry_status: "MISSING",
        closeout_complete: null,
        run_id: null,
      },
      {
        wedge: "refrigerator_water",
        run_registry_rel_path: null,
        run_registry_status: "NO_OPEN_BATCH_PROPOSAL",
        closeout_complete: null,
        run_id: null,
      },
    ],
    ap_run_registry_status: "MISSING",
    ap_run_registry_rel_path: apRel,
    ap_demand_selected_open_run_registry_status: "MISSING",
    ap_demand_selected_open_run_registry_rel_path: null,
    ap_demand_selected_open_run_id: null,
    fridge_run_registry_status: "NO_OPEN_BATCH_PROPOSAL",
    fridge_approval_status: "UNKNOWN",
    fridge_proposed_batch_id: null,
    fridge_next_required_artifact: null,
    mutation_authorized: false,
    recommended_next_action:
      "Batch run-registry intake did not build — restore repo CSV inputs or run npm run buckparts:batch-run-registry-intake locally. Lane is read-only.",
    proven_facts: [
      "PROVEN: Command Center caught batch_run_registry_intake_v1 build failure without throwing.",
    ],
    inferred_facts: [],
    unknown_facts: [`UNKNOWN: batch_run_registry_intake_v1 failed: ${args.reason}`],
  };
}

export function buildBatchRunRegistryIntakeCommandCenterLaneV1(
  deps: BuildBatchRunRegistryIntakeDepsV1,
): BatchRunRegistryIntakeCommandCenterLaneV1 {
  const report = buildBatchRunRegistryIntakeReportV1(deps);
  return buildBatchRunRegistryIntakeCommandCenterLaneFromReportV1(report);
}

export { BATCH_RUN_REGISTRY_INTAKE_CONTRACT_V1 };
