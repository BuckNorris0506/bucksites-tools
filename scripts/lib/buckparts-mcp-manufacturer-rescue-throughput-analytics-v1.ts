/**
 * BuckParts Truth MCP v2 — manufacturer rescue throughput analytics (read-only).
 */

import type { BuckPartsMcpDepsV1 } from "./buckparts-mcp-truth-context-v1";
import {
  loadManufacturerRescueThroughputAnalyticsReportV1,
  MANUFACTURER_RESCUE_THROUGHPUT_ANALYTICS_CONTRACT_V1,
  MANUFACTURER_RESCUE_THROUGHPUT_ANALYTICS_JSON_REL_V1,
  MANUFACTURER_RESCUE_THROUGHPUT_ANALYTICS_SOURCE_COMMAND_V1,
  type ManufacturerRescueThroughputAnalyticsReportV1,
} from "./manufacturer-rescue-throughput-analytics-v1";

export const BUCKPARTS_MCP_MANUFACTURER_RESCUE_THROUGHPUT_ANALYTICS_CONTRACT_V1 =
  "buckparts_mcp_manufacturer_rescue_throughput_analytics_v1" as const;

export const MANUFACTURER_RESCUE_THROUGHPUT_ANALYTICS_CC_JQ_PATH_V1 =
  ".command_center_v2.manufacturer_rescue_throughput_analytics_v1" as const;

type McpReadOnlyEnvelopeV1 = {
  read_only: true;
  data_mutation: false;
  mutation_authorized: false;
};

type AnalyticsLoadResultV1 =
  | {
      ok: true;
      report: ManufacturerRescueThroughputAnalyticsReportV1;
      repo_paths_read: string[];
    }
  | {
      ok: false;
      truth_status: "UNKNOWN";
      repo_paths_read: string[];
      truth_note: string;
    };

function envelope(): McpReadOnlyEnvelopeV1 & {
  contract: typeof BUCKPARTS_MCP_MANUFACTURER_RESCUE_THROUGHPUT_ANALYTICS_CONTRACT_V1;
} {
  return {
    contract: BUCKPARTS_MCP_MANUFACTURER_RESCUE_THROUGHPUT_ANALYTICS_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
  };
}

function loadAnalyticsArtifact(deps: BuckPartsMcpDepsV1): AnalyticsLoadResultV1 {
  const report = loadManufacturerRescueThroughputAnalyticsReportV1({
    rootDir: deps.rootDir,
  });
  if (!report) {
    return {
      ok: false,
      truth_status: "UNKNOWN",
      repo_paths_read: [MANUFACTURER_RESCUE_THROUGHPUT_ANALYTICS_JSON_REL_V1],
      truth_note: `Committed throughput analytics artifact missing or invalid. Run ${MANUFACTURER_RESCUE_THROUGHPUT_ANALYTICS_SOURCE_COMMAND_V1} locally; MCP does not rebuild upstream systems.`,
    };
  }
  return {
    ok: true,
    report,
    repo_paths_read: [MANUFACTURER_RESCUE_THROUGHPUT_ANALYTICS_JSON_REL_V1],
  };
}

export function manufacturerRescueThroughputAnalyticsV1(deps: BuckPartsMcpDepsV1) {
  const loaded = loadAnalyticsArtifact(deps);
  if (!loaded.ok) {
    return {
      ...envelope(),
      tool: "manufacturer_rescue_throughput_analytics",
      truth_status: loaded.truth_status,
      analytics_contract: "UNKNOWN",
      command_center_jq_path: MANUFACTURER_RESCUE_THROUGHPUT_ANALYTICS_CC_JQ_PATH_V1,
      intake_complete: false,
      funnel_metrics: null,
      recommended_highest_leverage_improvement: null,
      coverage_unlocked: false,
      repo_paths_read: loaded.repo_paths_read,
      truth_note: loaded.truth_note,
    };
  }

  const { report } = loaded;
  return {
    ...envelope(),
    tool: "manufacturer_rescue_throughput_analytics",
    truth_status: "PROVEN" as const,
    analytics_contract: MANUFACTURER_RESCUE_THROUGHPUT_ANALYTICS_CONTRACT_V1,
    command_center_jq_path: MANUFACTURER_RESCUE_THROUGHPUT_ANALYTICS_CC_JQ_PATH_V1,
    intake_complete: report.intake_complete,
    funnel_metrics: report.funnel_metrics,
    manufacturer_throughput: report.manufacturer_throughput,
    weekly_unlock_capacity_estimate: report.weekly_unlock_capacity_estimate,
    top_bottleneck_ranking: report.top_bottleneck_ranking,
    recommended_highest_leverage_improvement: report.recommended_highest_leverage_improvement,
    coverage_unlocked: false,
    repo_paths_read: loaded.repo_paths_read,
    truth_note:
      "KPI dashboard projected from committed manufacturer_rescue_throughput_analytics_v1 artifact only.",
  };
}

export function manufacturerRescueThroughputFunnelV1(deps: BuckPartsMcpDepsV1) {
  const loaded = loadAnalyticsArtifact(deps);
  if (!loaded.ok) {
    return {
      ...envelope(),
      tool: "manufacturer_rescue_throughput_funnel",
      truth_status: loaded.truth_status,
      funnel_metrics: null,
      coverage_unlocked: false,
      repo_paths_read: loaded.repo_paths_read,
      truth_note: loaded.truth_note,
    };
  }
  return {
    ...envelope(),
    tool: "manufacturer_rescue_throughput_funnel",
    truth_status: "PROVEN" as const,
    funnel_metrics: loaded.report.funnel_metrics,
    stage_ages: loaded.report.stage_ages,
    coverage_unlocked: false,
    repo_paths_read: loaded.repo_paths_read,
    truth_note: "Funnel metrics from committed throughput analytics artifact.",
  };
}

export function manufacturerRescueThroughputBottlenecksV1(deps: BuckPartsMcpDepsV1) {
  const loaded = loadAnalyticsArtifact(deps);
  if (!loaded.ok) {
    return {
      ...envelope(),
      tool: "manufacturer_rescue_throughput_bottlenecks",
      truth_status: loaded.truth_status,
      top_bottleneck_ranking: [],
      blocker_distribution: [],
      coverage_unlocked: false,
      repo_paths_read: loaded.repo_paths_read,
      truth_note: loaded.truth_note,
    };
  }
  return {
    ...envelope(),
    tool: "manufacturer_rescue_throughput_bottlenecks",
    truth_status: "PROVEN" as const,
    top_bottleneck_ranking: loaded.report.top_bottleneck_ranking,
    blocker_distribution: loaded.report.blocker_distribution,
    recommended_highest_leverage_improvement: loaded.report.recommended_highest_leverage_improvement,
    coverage_unlocked: false,
    repo_paths_read: loaded.repo_paths_read,
    truth_note: "Bottleneck ranking from committed throughput analytics artifact.",
  };
}
