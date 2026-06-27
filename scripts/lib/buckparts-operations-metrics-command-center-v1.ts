/**
 * Command Center v2 projection for BuckParts Operations Metrics v1 (read-only).
 */

import {
  BUCKPARTS_OPERATIONS_METRICS_CC_JQ_PATH_V1,
  BUCKPARTS_OPERATIONS_METRICS_CONTRACT_V1,
  BUCKPARTS_OPERATIONS_METRICS_SOURCE_COMMAND_V1,
  buildOperationsMetricsReportV1,
  type OperationsMetricsReportV1,
} from "./buckparts-operations-metrics-v1";

export const OPERATIONS_METRICS_CC_LANE_CONTRACT_V1 = "operations_metrics_v1" as const;

export type OperationsMetricsCommandCenterLaneV1 = Omit<OperationsMetricsReportV1, "contract"> & {
  contract: typeof OPERATIONS_METRICS_CC_LANE_CONTRACT_V1;
};

export function buildOperationsMetricsCommandCenterLaneV1(args: {
  rootDir: string;
  now?: () => Date;
}): OperationsMetricsCommandCenterLaneV1 {
  const report = buildOperationsMetricsReportV1(args);
  return {
    ...report,
    contract: OPERATIONS_METRICS_CC_LANE_CONTRACT_V1,
    recommended_jq_path: BUCKPARTS_OPERATIONS_METRICS_CC_JQ_PATH_V1,
    source_command: BUCKPARTS_OPERATIONS_METRICS_SOURCE_COMMAND_V1,
  };
}

export function buildOperationsMetricsCommandCenterLaneUnknownV1(args: {
  generated_at: string;
  reason: string;
}): OperationsMetricsCommandCenterLaneV1 {
  return {
    contract: OPERATIONS_METRICS_CC_LANE_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    recommended_jq_path: BUCKPARTS_OPERATIONS_METRICS_CC_JQ_PATH_V1,
    source_command: BUCKPARTS_OPERATIONS_METRICS_SOURCE_COMMAND_V1,
    generated_at: args.generated_at,
    aggregate: {
      mission_run_count: 0,
      agent_dispatch_count: 0,
      agent_success_rate: "UNKNOWN",
      validation_pass_rate: "UNKNOWN",
      total_retry_count: 0,
      total_timeout_count: 0,
      total_owner_decision_count: 0,
      mean_mission_duration_ms: "UNKNOWN",
      mean_validation_duration_ms: "UNKNOWN",
      mean_dispatch_duration_ms: "UNKNOWN",
      mean_owner_wait_time_ms: "UNKNOWN",
      mean_founder_effort_units: "UNKNOWN",
      safe_buyer_path_proven_count_current: "UNKNOWN",
    },
    mission_runs: [],
    dispatch_summaries: [],
    trend: {
      snapshot_count: 0,
      first_snapshot_at: null,
      last_snapshot_at: null,
      safe_buyer_path_proven_delta_since_first: "UNKNOWN",
      queue_depth_series: [],
      points: [],
      throughput_hypothesis: {
        foundation_v2_measurement_mode: true,
        agent_success_rate_latest: "UNKNOWN",
        agent_success_rate_prior: "UNKNOWN",
        validation_pass_rate_latest: "UNKNOWN",
        proven_delta_since_first_snapshot: "UNKNOWN",
        interpretation: `UNKNOWN: Operations metrics lane failed — ${args.reason}`,
      },
    },
    source_paths_read: [],
    recommended_next_action: `UNKNOWN: Operations metrics lane failed — ${args.reason}`,
    proven_facts: [],
    unknown_facts: [args.reason],
  };
}

export {
  BUCKPARTS_OPERATIONS_METRICS_CC_JQ_PATH_V1,
  BUCKPARTS_OPERATIONS_METRICS_CONTRACT_V1,
  BUCKPARTS_OPERATIONS_METRICS_SOURCE_COMMAND_V1,
};
