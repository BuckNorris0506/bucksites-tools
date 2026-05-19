/**
 * Command Center v1 summary lane for daily operator signals (read-only projection).
 */

import type { RecommendationAuthorityRecord } from "./buckparts-command-center-v2-types";
import type { BuckpartsDailyOperatorReport } from "../report-buckparts-daily-operator";

type RuntimeStatus = BuckpartsDailyOperatorReport["runtime_status"];
type TopOfGameChecklistStatus = BuckpartsDailyOperatorReport["top_of_game_checklist_status"];

export type DailyOperatorSummaryV1 = {
  contract: "daily_operator_summary_v1";
  read_only: true;
  data_mutation: false;
  generated_at: string;
  runtime_status: RuntimeStatus;
  business_warning_status: BuckpartsDailyOperatorReport["business_warning"]["status"];
  business_warning_issues: string[];
  next_owner_action: string;
  next_agent_action: string;
  recommendation_authority: {
    owner_action: Pick<
      RecommendationAuthorityRecord,
      "allowed_as_recommendation" | "authority_level" | "source"
    >;
    agent_action: Pick<
      RecommendationAuthorityRecord,
      "allowed_as_recommendation" | "authority_level" | "source"
    >;
  };
  demand_caveats: string[];
  measurement_caveats: string[];
  blocked_job_count: number;
  top_of_game_checklist_status: TopOfGameChecklistStatus;
  source_command: "npm run buckparts:daily";
  proven_facts: string[];
  unknown_facts: string[];
};

function buildDemandCaveats(report: BuckpartsDailyOperatorReport): string[] {
  const caveats: string[] = [];
  const gsc = report.demand_opportunities.gsc_external_demand;
  if (gsc.status !== "OK") {
    caveats.push(`GSC external demand status=${gsc.status}; connection_level=${gsc.connection_level}.`);
  }
  const internal = report.demand_opportunities.internal_search_demand_gaps;
  if (internal.runtime_status !== "OK") {
    caveats.push(`Internal search demand runtime_status=${internal.runtime_status}.`);
  }
  if (gsc.high_impression_low_click_opportunities === "UNKNOWN") {
    caveats.push("GSC high-impression/low-click opportunities are UNKNOWN.");
  }
  return caveats;
}

function buildMeasurementCaveats(report: BuckpartsDailyOperatorReport): string[] {
  const caveats: string[] = [];
  const ga4 = report.throughput_clicks_money.ga4_trust_funnel;
  if (ga4.status !== "OK") {
    caveats.push(`GA4 trust-funnel status=${ga4.status}; source=${ga4.source}.`);
  }
  if (report.throughput_clicks_money.revenue_conversions.status === "UNKNOWN_NOT_CONNECTED") {
    caveats.push(report.throughput_clicks_money.revenue_conversions.reason);
  }
  if (report.site_health.deploy_sync_status === "UNKNOWN_DEPLOY_COMMIT") {
    caveats.push("Deployed commit sync is UNKNOWN; local HEAD is not production deploy proof.");
  }
  if (report.site_health.route_health_status !== "OK") {
    caveats.push(`Live-site route health status=${report.site_health.route_health_status}.`);
  }
  return caveats;
}

export function buildDailyOperatorSummaryV1FromReport(
  report: BuckpartsDailyOperatorReport,
): DailyOperatorSummaryV1 {
  return {
    contract: "daily_operator_summary_v1",
    read_only: true,
    data_mutation: false,
    generated_at: report.generated_at,
    runtime_status: report.runtime_status,
    business_warning_status: report.business_warning.status,
    business_warning_issues: report.business_warning.issues,
    next_owner_action: report.next_owner_action,
    next_agent_action: report.next_agent_action,
    recommendation_authority: {
      owner_action: {
        allowed_as_recommendation: report.recommendation_authority.owner_action.allowed_as_recommendation,
        authority_level: report.recommendation_authority.owner_action.authority_level,
        source: report.recommendation_authority.owner_action.source,
      },
      agent_action: {
        allowed_as_recommendation: report.recommendation_authority.agent_action.allowed_as_recommendation,
        authority_level: report.recommendation_authority.agent_action.authority_level,
        source: report.recommendation_authority.agent_action.source,
      },
    },
    demand_caveats: buildDemandCaveats(report),
    measurement_caveats: buildMeasurementCaveats(report),
    blocked_job_count: report.blocked_jobs.length,
    top_of_game_checklist_status: report.top_of_game_checklist_status,
    source_command: "npm run buckparts:daily",
    proven_facts: [
      ...report.proven_facts,
      "daily_operator_summary_v1 is a read-only projection of buckparts_daily_operator_v1 for Command Center JSON.",
    ],
    unknown_facts: report.unknown_facts,
  };
}
