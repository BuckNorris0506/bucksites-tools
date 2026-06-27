/**
 * Command Center v2 projection for manufacturer rescue throughput analytics v1.
 */

import {
  buildManufacturerRescueThroughputAnalyticsV1,
  loadManufacturerRescueThroughputAnalyticsReportV1,
  MANUFACTURER_RESCUE_THROUGHPUT_ANALYTICS_CONTRACT_V1,
  MANUFACTURER_RESCUE_THROUGHPUT_ANALYTICS_JSON_REL_V1,
  MANUFACTURER_RESCUE_THROUGHPUT_ANALYTICS_MD_REL_V1,
  MANUFACTURER_RESCUE_THROUGHPUT_ANALYTICS_SOURCE_COMMAND_V1,
  type ManufacturerRescueThroughputAnalyticsReportV1,
  type ManufacturerRescueThroughputBottleneckRankV1,
  type ManufacturerRescueThroughputFunnelMetricsV1,
  type ManufacturerRescueThroughputManufacturerRowV1,
} from "./manufacturer-rescue-throughput-analytics-v1";

export const MANUFACTURER_RESCUE_THROUGHPUT_ANALYTICS_CC_LANE_CONTRACT_V1 =
  MANUFACTURER_RESCUE_THROUGHPUT_ANALYTICS_CONTRACT_V1;

export const MANUFACTURER_RESCUE_THROUGHPUT_ANALYTICS_CC_JQ_PATH_V1 =
  ".command_center_v2.manufacturer_rescue_throughput_analytics_v1" as const;

export type ManufacturerRescueThroughputAnalyticsCommandCenterLaneV1 = {
  contract: typeof MANUFACTURER_RESCUE_THROUGHPUT_ANALYTICS_CC_LANE_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  mutation_authorized: false;
  csv_apply_authorized: false;
  supabase_mutation_authorized: false;
  browser_automation_authorized: false;
  coverage_unlocked: false;
  recommended_jq_path: typeof MANUFACTURER_RESCUE_THROUGHPUT_ANALYTICS_CC_JQ_PATH_V1;
  generated_at: string;
  analytics_artifact_path: string;
  analytics_md_artifact_path: string;
  source_command: typeof MANUFACTURER_RESCUE_THROUGHPUT_ANALYTICS_SOURCE_COMMAND_V1;
  intake_complete: boolean;
  artifact_intake: ManufacturerRescueThroughputAnalyticsReportV1["artifact_intake"];
  funnel_metrics: ManufacturerRescueThroughputFunnelMetricsV1;
  manufacturer_throughput: ManufacturerRescueThroughputManufacturerRowV1[];
  top_bottleneck_ranking: ManufacturerRescueThroughputBottleneckRankV1[];
  weekly_unlock_capacity_estimate: ManufacturerRescueThroughputAnalyticsReportV1["weekly_unlock_capacity_estimate"];
  recommended_highest_leverage_improvement: ManufacturerRescueThroughputAnalyticsReportV1["recommended_highest_leverage_improvement"];
  inspect_summary: ManufacturerRescueThroughputAnalyticsReportV1["inspect_summary"];
  recommended_next_action: string;
  proven_facts: string[];
  unknown_facts: string[];
};

function laneFromReport(
  report: ManufacturerRescueThroughputAnalyticsReportV1,
): ManufacturerRescueThroughputAnalyticsCommandCenterLaneV1 {
  return {
    contract: MANUFACTURER_RESCUE_THROUGHPUT_ANALYTICS_CC_LANE_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    csv_apply_authorized: false,
    supabase_mutation_authorized: false,
    browser_automation_authorized: false,
    coverage_unlocked: false,
    recommended_jq_path: MANUFACTURER_RESCUE_THROUGHPUT_ANALYTICS_CC_JQ_PATH_V1,
    generated_at: report.generated_at,
    analytics_artifact_path: MANUFACTURER_RESCUE_THROUGHPUT_ANALYTICS_JSON_REL_V1,
    analytics_md_artifact_path: MANUFACTURER_RESCUE_THROUGHPUT_ANALYTICS_MD_REL_V1,
    source_command: MANUFACTURER_RESCUE_THROUGHPUT_ANALYTICS_SOURCE_COMMAND_V1,
    intake_complete: report.intake_complete,
    artifact_intake: report.artifact_intake,
    funnel_metrics: report.funnel_metrics,
    manufacturer_throughput: report.manufacturer_throughput,
    top_bottleneck_ranking: report.top_bottleneck_ranking,
    weekly_unlock_capacity_estimate: report.weekly_unlock_capacity_estimate,
    recommended_highest_leverage_improvement: report.recommended_highest_leverage_improvement,
    inspect_summary: report.inspect_summary,
    recommended_next_action: report.inspect_summary.recommended_next_action,
    proven_facts: report.proven_facts,
    unknown_facts: report.unknown_facts,
  };
}

export function buildManufacturerRescueThroughputAnalyticsCommandCenterLaneV1(args: {
  rootDir: string;
  now?: () => Date;
  fileExists?: (abs: string) => boolean;
  readText?: (abs: string) => string;
  prefer_committed_artifact?: boolean;
}): ManufacturerRescueThroughputAnalyticsCommandCenterLaneV1 {
  if (args.prefer_committed_artifact !== false) {
    const committed = loadManufacturerRescueThroughputAnalyticsReportV1({
      rootDir: args.rootDir,
      fileExists: args.fileExists,
      readText: args.readText,
    });
    if (committed) {
      return laneFromReport(committed);
    }
  }
  const report = buildManufacturerRescueThroughputAnalyticsV1({
    rootDir: args.rootDir,
    now: args.now,
    fileExists: args.fileExists,
    readText: args.readText,
  });
  return laneFromReport(report);
}

export function buildManufacturerRescueThroughputAnalyticsCommandCenterLaneUnknownV1(args: {
  generated_at: string;
  reason: string;
}): ManufacturerRescueThroughputAnalyticsCommandCenterLaneV1 {
  return {
    contract: MANUFACTURER_RESCUE_THROUGHPUT_ANALYTICS_CC_LANE_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    csv_apply_authorized: false,
    supabase_mutation_authorized: false,
    browser_automation_authorized: false,
    coverage_unlocked: false,
    recommended_jq_path: MANUFACTURER_RESCUE_THROUGHPUT_ANALYTICS_CC_JQ_PATH_V1,
    generated_at: args.generated_at,
    analytics_artifact_path: MANUFACTURER_RESCUE_THROUGHPUT_ANALYTICS_JSON_REL_V1,
    analytics_md_artifact_path: MANUFACTURER_RESCUE_THROUGHPUT_ANALYTICS_MD_REL_V1,
    source_command: MANUFACTURER_RESCUE_THROUGHPUT_ANALYTICS_SOURCE_COMMAND_V1,
    intake_complete: false,
    artifact_intake: {} as ManufacturerRescueThroughputAnalyticsReportV1["artifact_intake"],
    funnel_metrics: {
      stage_counts: {
        rescue_candidate: 0,
        browser_proof_capture_scheduled: 0,
        browser_proof_fresh_official_pass: 0,
        apply_plan_ready_for_owner_review: 0,
        owner_approval_packet_cohort: 0,
        readiness_gate_ready_for_apply: 0,
        runner_ready_for_apply: 0,
        applied_or_complete: 0,
      },
      stage_conversion_rates: {
        rescue_candidate: "UNKNOWN",
        browser_proof_capture_scheduled: "UNKNOWN",
        browser_proof_fresh_official_pass: "UNKNOWN",
        apply_plan_ready_for_owner_review: "UNKNOWN",
        owner_approval_packet_cohort: "UNKNOWN",
        readiness_gate_ready_for_apply: "UNKNOWN",
        runner_ready_for_apply: "UNKNOWN",
        applied_or_complete: "UNKNOWN",
      },
      rescue_candidate_count: 0,
      furthest_stage_reached: "rescue_candidate",
    },
    manufacturer_throughput: [],
    top_bottleneck_ranking: [],
    weekly_unlock_capacity_estimate: {
      estimated_slugs_per_week: "UNKNOWN",
      theoretical_ceiling_if_primary_bottleneck_cleared: 0,
      single_blocker_browser_proof_refresh_candidates: 0,
      readiness_ready_for_apply_count: 0,
      execution_ledger_manufacturer_rescue_entries_30d: "UNKNOWN",
      methodology: "UNKNOWN",
      assumptions: [],
      unknown_gaps: [],
    },
    recommended_highest_leverage_improvement: {
      recommendation:
        "Run npm run buckparts:manufacturer-rescue-throughput-analytics after upstream artifacts are committed.",
      rationale: [],
      supporting_bottleneck_id: "UNKNOWN",
      proven_facts: [],
      unknown_facts: [args.reason],
    },
    inspect_summary: {
      recommended_next_action:
        "Run npm run buckparts:manufacturer-rescue-throughput-analytics after upstream artifacts are committed.",
      kpi_dashboard_note: "KPI dashboard unavailable — analytics build failed.",
    },
    recommended_next_action:
      "Run npm run buckparts:manufacturer-rescue-throughput-analytics after upstream artifacts are committed.",
    proven_facts: [
      "PROVEN: Command Center caught manufacturer_rescue_throughput_analytics_v1 build failure without throwing.",
    ],
    unknown_facts: [`UNKNOWN: manufacturer_rescue_throughput_analytics_v1 failed: ${args.reason}`],
  };
}
