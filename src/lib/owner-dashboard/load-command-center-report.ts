/**
 * Server-only entry to build the BuckParts Command Center report (includes v2).
 * Lives under src so Next can bundle Node runtime code; delegates to scripts/.
 */
import { buildBuckpartsCommandCenterReport } from "../../../scripts/report-buckparts-command-center";
import { buildBuckpartsCommandSurfaceReport } from "../../../scripts/report-buckparts-command-surface";
import {
  attachOwnerCommandCenterNeuronsReport,
  buildOwnerCommandCenterNeuronsForReport,
  type OwnerCommandCenterNeuronsReport,
} from "@/lib/owner-dashboard/owner-command-center-neurons-v1";
import {
  buildOwnerSearchDemandAndGapsReportFromSummary,
  type OwnerSearchDemandAndGapsReport,
} from "@/lib/owner-dashboard/owner-search-demand-and-gaps-build-v1";
import {
  attachOwnerVerticalLaunchPolicyReport,
  buildOwnerVerticalLaunchPolicyReport,
  type OwnerVerticalLaunchPolicyReport,
} from "@/lib/owner-dashboard/owner-vertical-launch-policy";
import {
  buildOwnerGscExternalDemandNeuron,
  type OwnerGscExternalDemandNeuron,
} from "@/lib/owner-dashboard/gsc-external-demand";
import {
  buildOwnerIntegritySentinelReport,
  type OwnerIntegritySentinelReport,
} from "@/lib/owner-dashboard/owner-integrity-sentinel-v1";
import {
  buildOwnerQuarantinedFridgeModelsV1,
  type OwnerQuarantinedFridgeModelSummary,
  type OwnerQuarantinedFridgeModelsReport,
} from "@/lib/owner-dashboard/owner-quarantined-fridge-models-v1";

export {
  attachOwnerCommandCenterNeuronsReport,
  buildOwnerCommandCenterNeuronsReport,
  type AffiliateReadinessNeuronInput,
  type CtaCoverageHealthNeuronInput,
  type OwnerCommandCenterNeuronsReport,
  type OwnerDashboardNeuron,
  type OwnerNeuronConnectionLevel,
  mapAffiliateReadinessToNeuronConnectionLevel,
  mapBatchProductionOwnerDecisionsLaneToNeuronConnectionLevel,
  mapClickVisibilityToNeuronConnectionLevel,
  mapCoverageHealthToNeuronConnectionLevel,
  mapSearchDemandAndGapsToNeuronConnectionLevel,
} from "@/lib/owner-dashboard/owner-command-center-neurons-v1";
export { loadGa4TrustFunnelAggregateArtifact } from "@/lib/owner-dashboard/load-ga4-trust-funnel-aggregate-artifact";
export type {
  OwnerSearchDemandAndGapsNeuron,
  OwnerSearchDemandAndGapsReport,
  OwnerSearchDemandConnectionLevel,
  OwnerSearchDemandSourceClass,
} from "@/lib/owner-dashboard/owner-search-demand-and-gaps-build-v1";


export type {
  OwnerQuarantinedFridgeModelSummary,
  OwnerQuarantinedFridgeModelsReport,
  OwnerQuarantinedFridgeModelsV1,
} from "@/lib/owner-dashboard/owner-quarantined-fridge-models-v1";
export {
  buildOwnerQuarantinedFridgeModelsSummary,
  buildOwnerQuarantinedFridgeModelsV1,
} from "@/lib/owner-dashboard/owner-quarantined-fridge-models-v1";

export type {
  IntegritySentinelActionSafety,
  IntegritySentinelFallback,
  IntegritySentinelOverallStatus,
  IntegritySentinelProviderKey,
  IntegritySentinelSourceClass,
  IntegritySentinelUnknownHonesty,
  OwnerIntegritySentinelCommandSurfaceInput,
  OwnerIntegritySentinelProvider,
  OwnerIntegritySentinelReport,
  OwnerIntegritySentinelReportInput,
  OwnerIntegritySentinelV1,
} from "@/lib/owner-dashboard/owner-integrity-sentinel-v1";
export {
  buildOwnerIntegritySentinelReport,
  buildOwnerIntegritySentinelV1,
} from "@/lib/owner-dashboard/owner-integrity-sentinel-v1";

export type OwnerGscExternalDemandReport = {
  data_mutation: false;
  generated_from: string[];
  gsc_external_demand: OwnerGscExternalDemandNeuron;
};


export function attachOwnerQuarantinedFridgeModelsReport<T extends object>(
  report: T,
  models: OwnerQuarantinedFridgeModelSummary[],
): T & { owner_quarantined_fridge_models: OwnerQuarantinedFridgeModelsReport } {
  return {
    ...report,
    owner_quarantined_fridge_models: {
      data_mutation: false,
      models,
    },
  };
}

export function attachOwnerIntegritySentinelReport<T extends object>(
  report: T,
  integrity_sentinel: OwnerIntegritySentinelReport,
): T & { owner_integrity_sentinel: OwnerIntegritySentinelReport } {
  return {
    ...report,
    owner_integrity_sentinel: integrity_sentinel,
  };
}

export function buildOwnerSearchDemandAndGapsReport(args: {
  report: Awaited<ReturnType<typeof buildBuckpartsCommandCenterReport>>;
}): OwnerSearchDemandAndGapsReport {
  return buildOwnerSearchDemandAndGapsReportFromSummary(args.report.search_and_click_intelligence_summary);
}

export function attachOwnerSearchDemandAndGapsReport<T extends object>(
  report: T,
  owner_search_demand_and_gaps: OwnerSearchDemandAndGapsReport,
): T & { owner_search_demand_and_gaps: OwnerSearchDemandAndGapsReport } {
  return {
    ...report,
    owner_search_demand_and_gaps,
  };
}

export async function buildOwnerGscExternalDemandReport(args: {
  rootDir: string;
}): Promise<OwnerGscExternalDemandReport> {
  return {
    data_mutation: false,
    generated_from: [
      "supabase.owner_report_artifacts (gsc_search_analytics)",
      "data/reports/buckparts-gsc-search-analytics.json",
      "data/gsc/* Performance export artifacts",
      "src/lib/owner-dashboard/gsc-external-demand.ts",
    ],
    gsc_external_demand: await buildOwnerGscExternalDemandNeuron({ rootDir: args.rootDir }),
  };
}

export function attachOwnerGscExternalDemandReport<T extends object>(
  report: T,
  owner_gsc_external_demand: OwnerGscExternalDemandReport,
): T & { owner_gsc_external_demand: OwnerGscExternalDemandReport } {
  return {
    ...report,
    owner_gsc_external_demand,
  };
}


export type OwnerCommandCenterLoadResult =
  | {
      ok: true;
      report: Awaited<ReturnType<typeof buildBuckpartsCommandCenterReport>> & {
        owner_quarantined_fridge_models: OwnerQuarantinedFridgeModelsReport;
        owner_vertical_launch_policy: OwnerVerticalLaunchPolicyReport;
        owner_command_center_neurons: OwnerCommandCenterNeuronsReport;
        owner_integrity_sentinel: OwnerIntegritySentinelReport;
        owner_search_demand_and_gaps: OwnerSearchDemandAndGapsReport;
        owner_gsc_external_demand: OwnerGscExternalDemandReport;
      };
    }
  | { ok: false; message: string };

export async function loadCommandCenterReportForOwner(rootDir = process.cwd()): Promise<OwnerCommandCenterLoadResult> {
  try {
    const report = await buildBuckpartsCommandCenterReport({ rootDir });
    const commandSurface = await buildBuckpartsCommandSurfaceReport({ rootDir });
    const quarantinedLane =
      report.command_center_v2.owner_quarantined_fridge_models_v1 ??
      (await buildOwnerQuarantinedFridgeModelsV1());
    const launchPolicy = buildOwnerVerticalLaunchPolicyReport();
    const gscExternalDemand = await buildOwnerGscExternalDemandReport({ rootDir });
    const searchDemandAndGaps = buildOwnerSearchDemandAndGapsReport({ report });
    const neurons =
      report.owner_command_center_neurons ??
      (await buildOwnerCommandCenterNeuronsForReport({
        rootDir,
        pageState: commandSurface.state_system_metrics.page_state,
        gscPresence: commandSurface.gsc_exports_present,
        searchAndClickIntelligenceSummary: report.search_and_click_intelligence_summary,
        clickVisibility: report.command_center_v2.revenue_snapshot.click_visibility ?? null,
        affiliateReadiness: {
          lane: report.command_center_v2.affiliate_readiness,
          summary: report.affiliate_readiness_summary,
          commission_or_revenue:
            report.command_center_v2.revenue_snapshot.click_visibility?.commission_or_revenue ??
            "NOT_CONNECTED",
        },
        ctaCoverageHealth: {
          coverageLane: report.command_center_v2.coverage_health,
          ctaCoverage: commandSurface.cta_coverage_metrics,
          blockedRemediation: commandSurface.blocked_retailer_link_remediation,
        },
        batchProductionOwnerDecisionsLane:
          report.command_center_v2.batch_production_owner_decisions_lane_v1,
      }));
    const sentinel =
      report.command_center_v2.owner_integrity_sentinel_v1 ??
      buildOwnerIntegritySentinelReport({ report, commandSurface });
    const withQuarantine = attachOwnerQuarantinedFridgeModelsReport(report, quarantinedLane.models);
    const withLaunchPolicy = attachOwnerVerticalLaunchPolicyReport(withQuarantine, launchPolicy);
    const withNeurons = attachOwnerCommandCenterNeuronsReport(withLaunchPolicy, neurons);
    const withSentinel = attachOwnerIntegritySentinelReport(withNeurons, sentinel);
    const withSearchDemand = attachOwnerSearchDemandAndGapsReport(withSentinel, searchDemandAndGaps);
    return { ok: true, report: attachOwnerGscExternalDemandReport(withSearchDemand, gscExternalDemand) };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "UNKNOWN";
    return { ok: false, message: msg };
  }
}
