/**
 * Server-only entry to build the BuckParts Command Center report (includes v2).
 * Lives under src so Next can bundle Node runtime code; delegates to scripts/.
 */
import { buildBuckpartsCommandCenterReport } from "../../../scripts/report-buckparts-command-center";
import { buildBuckpartsCommandSurfaceReport } from "../../../scripts/report-buckparts-command-surface";
import { getFridgeBySlug } from "@/lib/data/fridges";
import {
  listFridgeModelReviewOverrides,
  type FridgeModelReviewOverride,
} from "@/lib/fridge/fridge-model-review-overrides";
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


type QuarantinedFridgeModelStats = {
  mapped_filter_count: number;
  safe_cta_count: number;
} | null;

export type OwnerQuarantinedFridgeModelSummary = Pick<
  FridgeModelReviewOverride,
  "fridge_model_slug" | "reason" | "public_status" | "internal_evidence_doc"
> & {
  mapped_filter_count: number | "UNKNOWN";
  safe_cta_count: number | "UNKNOWN";
  owner_action_required: true;
};

export type OwnerQuarantinedFridgeModelsReport = {
  data_mutation: false;
  models: OwnerQuarantinedFridgeModelSummary[];
};


export type IntegritySentinelSourceClass = "LIVE" | "ARTIFACT" | "MANUAL" | "MIXED" | "UNKNOWN";
export type IntegritySentinelFallback = true | false | "UNKNOWN";
export type IntegritySentinelUnknownHonesty = "PASS" | "FAIL" | "UNKNOWN";
export type IntegritySentinelActionSafety =
  | "SAFE_TO_RECOMMEND"
  | "CAUTION_INCOMPLETE_INPUTS"
  | "UNKNOWN";
export type IntegritySentinelProviderKey =
  | "command_surface_summary"
  | "affiliate_tracker"
  | "amazon_first_queue"
  | "click_visibility_snapshot"
  | "evidence_rollup_token_controls";
export type IntegritySentinelOverallStatus = "PASS" | "WARN" | "FAIL" | "UNKNOWN";

export type OwnerIntegritySentinelProvider = {
  provider_key: IntegritySentinelProviderKey;
  source_class: IntegritySentinelSourceClass;
  freshness_signal_present: boolean;
  fallback_active: IntegritySentinelFallback;
  unknown_honesty: IntegritySentinelUnknownHonesty;
  action_safety: IntegritySentinelActionSafety;
  proven_facts: string[];
  unknown_facts: string[];
};

export type OwnerIntegritySentinelReport = {
  data_mutation: false;
  overall_status: IntegritySentinelOverallStatus;
  action_confidence: IntegritySentinelActionSafety;
  owner_note: string;
  providers: OwnerIntegritySentinelProvider[];
};


export type OwnerGscExternalDemandReport = {
  data_mutation: false;
  generated_from: string[];
  gsc_external_demand: OwnerGscExternalDemandNeuron;
};


function deriveUnknownHonesty(args: {
  fallback_active: IntegritySentinelFallback;
  has_unknown_condition: boolean;
  unknown_facts: string[];
}): IntegritySentinelUnknownHonesty {
  if (args.fallback_active === "UNKNOWN") return "UNKNOWN";
  if (!args.has_unknown_condition && args.fallback_active === false) return "PASS";
  return args.unknown_facts.length > 0 ? "PASS" : "FAIL";
}

function deriveActionSafety(args: {
  source_class: IntegritySentinelSourceClass;
  freshness_signal_present: boolean;
  fallback_active: IntegritySentinelFallback;
  is_click_snapshot?: boolean;
  click_freshness_signal_ready?: boolean;
}): IntegritySentinelActionSafety {
  if (args.fallback_active === true) return "CAUTION_INCOMPLETE_INPUTS";
  if (args.fallback_active === "UNKNOWN") return "UNKNOWN";
  if (
    (args.source_class === "ARTIFACT" || args.source_class === "MANUAL") &&
    args.freshness_signal_present === false
  ) {
    return "CAUTION_INCOMPLETE_INPUTS";
  }
  if (args.source_class === "UNKNOWN") return "UNKNOWN";
  if (args.is_click_snapshot) {
    return args.click_freshness_signal_ready ? "SAFE_TO_RECOMMEND" : "CAUTION_INCOMPLETE_INPUTS";
  }
  return "SAFE_TO_RECOMMEND";
}

export async function buildOwnerQuarantinedFridgeModelsSummary(args?: {
  resolveModelStats?: (slug: string) => Promise<QuarantinedFridgeModelStats>;
}): Promise<OwnerQuarantinedFridgeModelSummary[]> {
  const resolveModelStats =
    args?.resolveModelStats ??
    (async (slug: string): Promise<QuarantinedFridgeModelStats> => {
      const fridge = await getFridgeBySlug(slug);
      if (!fridge) return null;
      return {
        mapped_filter_count: fridge.filters.length,
        safe_cta_count: fridge.filters.reduce((n, f) => n + f.retailer_links.length, 0),
      };
    });

  const overrides = listFridgeModelReviewOverrides();
  const rows = await Promise.all(
    overrides.map(async (o): Promise<OwnerQuarantinedFridgeModelSummary> => {
      try {
        const stats = await resolveModelStats(o.fridge_model_slug);
        return {
          fridge_model_slug: o.fridge_model_slug,
          reason: o.reason,
          public_status: o.public_status,
          internal_evidence_doc: o.internal_evidence_doc,
          mapped_filter_count: stats?.mapped_filter_count ?? "UNKNOWN",
          safe_cta_count: stats?.safe_cta_count ?? "UNKNOWN",
          owner_action_required: true,
        };
      } catch {
        return {
          fridge_model_slug: o.fridge_model_slug,
          reason: o.reason,
          public_status: o.public_status,
          internal_evidence_doc: o.internal_evidence_doc,
          mapped_filter_count: "UNKNOWN",
          safe_cta_count: "UNKNOWN",
          owner_action_required: true,
        };
      }
    }),
  );
  rows.sort((a, b) => a.fridge_model_slug.localeCompare(b.fridge_model_slug));
  return rows;
}

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


export function buildOwnerIntegritySentinelReport(args: {
  report: Awaited<ReturnType<typeof buildBuckpartsCommandCenterReport>>;
  commandSurface: Awaited<ReturnType<typeof buildBuckpartsCommandSurfaceReport>>;
  providerOverrides?: Partial<
    Record<
      IntegritySentinelProviderKey,
      Partial<
        Omit<OwnerIntegritySentinelProvider, "provider_key"> & {
          has_unknown_condition: boolean;
          click_freshness_signal_ready: boolean;
        }
      >
    >
  >;
}): OwnerIntegritySentinelReport {
  const { report, commandSurface } = args;
  const providerOverrides = args.providerOverrides ?? {};

  const providers: OwnerIntegritySentinelProvider[] = [];

  {
    const unknownFacts: string[] = [];
    const provenFacts: string[] = [
      `command_surface system_health status: ${report.system_health_summary.status}.`,
      `command_surface generated_at: ${commandSurface.generated_at}.`,
    ];
    const csStatuses = [
      report.search_and_click_intelligence_summary.runtime_status,
      report.money_funnel_summary.runtime_status,
      report.rescue_velocity_summary.runtime_status,
      report.rescue_delta_trend_summary.runtime_status,
    ];
    const fallbackActive = csStatuses.some((s) => s !== "OK");
    if (fallbackActive) {
      unknownFacts.push(
        `One or more command_surface-derived runtime summaries are non-OK: ${csStatuses.join(", ")}.`,
      );
    }
    const freshnessSignalPresent = Boolean(commandSurface.generated_at);
    const hasUnknownCondition = fallbackActive || commandSurface.known_unknowns.length > 0;
    if (commandSurface.known_unknowns.length > 0) {
      unknownFacts.push(
        `command_surface known_unknowns present (${commandSurface.known_unknowns.length}).`,
      );
    }
    const override = providerOverrides.command_surface_summary ?? {};
    const source_class = override.source_class ?? "MIXED";
    const resolvedFallback = override.fallback_active ?? fallbackActive;
    const resolvedFreshness = override.freshness_signal_present ?? freshnessSignalPresent;
    const resolvedUnknownFacts = [...unknownFacts, ...(override.unknown_facts ?? [])];
    const unknown_honesty =
      override.unknown_honesty ??
      deriveUnknownHonesty({
        fallback_active: resolvedFallback,
        has_unknown_condition: override.has_unknown_condition ?? hasUnknownCondition,
        unknown_facts: resolvedUnknownFacts,
      });
    const action_safety =
      override.action_safety ??
      deriveActionSafety({
        source_class,
        freshness_signal_present: resolvedFreshness,
        fallback_active: resolvedFallback,
      });
    providers.push({
      provider_key: "command_surface_summary",
      source_class,
      freshness_signal_present: resolvedFreshness,
      fallback_active: resolvedFallback,
      unknown_honesty,
      action_safety,
      proven_facts: [...provenFacts, ...(override.proven_facts ?? [])],
      unknown_facts: resolvedUnknownFacts,
    });
  }

  {
    const unknownFacts: string[] = [];
    const provenFacts: string[] = [
      `affiliate approved_count: ${report.affiliate_readiness_summary.approved_count}.`,
      `affiliate pending_count: ${report.affiliate_readiness_summary.pending_count}.`,
    ];
    const fallbackActive = report.affiliate_readiness_summary.repairclinic_status === "UNKNOWN";
    if (fallbackActive) {
      unknownFacts.push("affiliate tracker surfaced UNKNOWN repairclinic_status.");
    }
    const freshnessSignalPresent = false;
    const hasUnknownCondition = fallbackActive;
    const override = providerOverrides.affiliate_tracker ?? {};
    const source_class = override.source_class ?? "MANUAL";
    const resolvedFallback = override.fallback_active ?? fallbackActive;
    const resolvedFreshness = override.freshness_signal_present ?? freshnessSignalPresent;
    const resolvedUnknownFacts = [...unknownFacts, ...(override.unknown_facts ?? [])];
    const unknown_honesty =
      override.unknown_honesty ??
      deriveUnknownHonesty({
        fallback_active: resolvedFallback,
        has_unknown_condition: override.has_unknown_condition ?? hasUnknownCondition,
        unknown_facts: resolvedUnknownFacts,
      });
    const action_safety =
      override.action_safety ??
      deriveActionSafety({
        source_class,
        freshness_signal_present: resolvedFreshness,
        fallback_active: resolvedFallback,
      });
    providers.push({
      provider_key: "affiliate_tracker",
      source_class,
      freshness_signal_present: resolvedFreshness,
      fallback_active: resolvedFallback,
      unknown_honesty,
      action_safety,
      proven_facts: [...provenFacts, ...(override.proven_facts ?? [])],
      unknown_facts: resolvedUnknownFacts,
    });
  }

  {
    const unknownFacts: string[] = [];
    const provenFacts: string[] = [
      `amazon_first_queue runtime_status: ${report.amazon_first_blocked_queue_summary.runtime_status}.`,
      `amazon_first_queue source_report: ${report.amazon_first_blocked_queue_summary.source_report}.`,
    ];
    const fallbackActive = report.amazon_first_blocked_queue_summary.runtime_status !== "OK";
    if (fallbackActive) {
      unknownFacts.push(
        "amazon_first_queue runtime_status is not OK; queue metrics are fallback/unknown.",
      );
    }
    const freshnessSignalPresent = Boolean(report.generated_at);
    const hasUnknownCondition =
      fallbackActive || report.amazon_first_blocked_queue_summary.top_candidate_count === "UNKNOWN";
    if (report.amazon_first_blocked_queue_summary.top_candidate_count === "UNKNOWN") {
      unknownFacts.push("amazon_first_queue top_candidate_count is UNKNOWN.");
    }
    const override = providerOverrides.amazon_first_queue ?? {};
    const source_class = override.source_class ?? "MIXED";
    const resolvedFallback = override.fallback_active ?? fallbackActive;
    const resolvedFreshness = override.freshness_signal_present ?? freshnessSignalPresent;
    const resolvedUnknownFacts = [...unknownFacts, ...(override.unknown_facts ?? [])];
    const unknown_honesty =
      override.unknown_honesty ??
      deriveUnknownHonesty({
        fallback_active: resolvedFallback,
        has_unknown_condition: override.has_unknown_condition ?? hasUnknownCondition,
        unknown_facts: resolvedUnknownFacts,
      });
    const action_safety =
      override.action_safety ??
      deriveActionSafety({
        source_class,
        freshness_signal_present: resolvedFreshness,
        fallback_active: resolvedFallback,
      });
    providers.push({
      provider_key: "amazon_first_queue",
      source_class,
      freshness_signal_present: resolvedFreshness,
      fallback_active: resolvedFallback,
      unknown_honesty,
      action_safety,
      proven_facts: [...provenFacts, ...(override.proven_facts ?? [])],
      unknown_facts: resolvedUnknownFacts,
    });
  }

  {
    const unknownFacts: string[] = [];
    const provenFacts: string[] = [
      `click_visibility runtime_status: ${report.command_center_v2.revenue_snapshot.click_visibility?.runtime_status ?? "UNKNOWN"}.`,
      `click_visibility freshness_status: ${report.command_center_v2.revenue_snapshot.click_visibility?.click_freshness_status ?? "UNKNOWN"}.`,
    ];
    const clickRuntime = report.command_center_v2.revenue_snapshot.click_visibility?.runtime_status ?? "UNKNOWN";
    const clickFreshness = report.command_center_v2.revenue_snapshot.click_visibility?.click_freshness_status;
    const clickFreshnessReason = report.command_center_v2.revenue_snapshot.click_visibility?.click_freshness_reason;
    const clickFreshnessSignalReady =
      typeof clickFreshness === "string" &&
      clickFreshness !== "UNKNOWN" &&
      typeof clickFreshnessReason === "string" &&
      clickFreshnessReason.length > 0;
    const fallbackActive =
      report.command_center_v2.revenue_snapshot.status !== "OK" || clickRuntime !== "OK";
    if (fallbackActive) {
      unknownFacts.push("click visibility snapshot runtime is not fully OK.");
    }
    if (!clickFreshnessSignalReady) {
      unknownFacts.push("click freshness status/reason is incomplete or UNKNOWN.");
    }
    const freshnessSignalPresent = clickFreshnessSignalReady;
    const hasUnknownCondition = fallbackActive || !clickFreshnessSignalReady;
    const override = providerOverrides.click_visibility_snapshot ?? {};
    const source_class = override.source_class ?? "LIVE";
    const resolvedFallback = override.fallback_active ?? fallbackActive;
    const resolvedFreshness = override.freshness_signal_present ?? freshnessSignalPresent;
    const resolvedUnknownFacts = [...unknownFacts, ...(override.unknown_facts ?? [])];
    const unknown_honesty =
      override.unknown_honesty ??
      deriveUnknownHonesty({
        fallback_active: resolvedFallback,
        has_unknown_condition: override.has_unknown_condition ?? hasUnknownCondition,
        unknown_facts: resolvedUnknownFacts,
      });
    const action_safety =
      override.action_safety ??
      deriveActionSafety({
        source_class,
        freshness_signal_present: resolvedFreshness,
        fallback_active: resolvedFallback,
        is_click_snapshot: true,
        click_freshness_signal_ready:
          override.click_freshness_signal_ready ?? clickFreshnessSignalReady,
      });
    providers.push({
      provider_key: "click_visibility_snapshot",
      source_class,
      freshness_signal_present: resolvedFreshness,
      fallback_active: resolvedFallback,
      unknown_honesty,
      action_safety,
      proven_facts: [...provenFacts, ...(override.proven_facts ?? [])],
      unknown_facts: resolvedUnknownFacts,
    });
  }

  {
    const unknownFacts: string[] = [];
    const provenFacts: string[] = [
      `evidence live_count: ${report.command_center_v2.recent_evidence.evidence_rollup.live_outcome_count}.`,
      `registry_path: ${report.command_center_v2.amazon_rescue.registry_path}.`,
    ];
    const inv = report.command_center_v2.recent_evidence.evidence_inventory;
    if (inv?.contract === "evidence_inventory_v1") {
      const bm = inv.data_evidence.body_mapping;
      provenFacts.push(
        `evidence_inventory_v1 data/evidence: total_json_files=${inv.data_evidence.total_json_files}; body parsed_ok=${bm.parsed_ok_count}, parse_errors=${bm.parse_error_count}, mapped_for_scope_token_filter_slug=${bm.mapped_count}, unmapped_no_rollups_keys=${bm.unmapped_count}.`,
      );
      provenFacts.push(
        `Separate inventories — manual valid records=${inv.refrigerator_manual_evidence.valid_record_count}, form_factor valid records=${inv.fridge_form_factor_evidence.valid_record_count} (not merged with Amazon/token evidence files).`,
      );
      unknownFacts.push(
        "Filename substring buckets in evidence_rollup are not JSON verdicts or insert outcomes; use evidence_inventory body_mapping rollups for scope/token/filter_slug only when keys exist.",
      );
      unknownFacts.push(
        "No catalog-wide fridge model or brand coverage is proven from evidence file counts; validated manual/form-factor slug lists are not joined to `fridge_models` or brand tables.",
      );
      unknownFacts.push(
        "Brand coverage remains UNKNOWN — slugs are not interpreted as brand identifiers.",
      );
      unknownFacts.push(
        "Recent evidence filenames stay lexicographic-by-filename unless a future contract sorts by parsed `generated_at` or file mtime.",
      );
      for (const f of inv.unknown_facts) {
        if (!unknownFacts.includes(f)) unknownFacts.push(f);
      }
    } else {
      unknownFacts.push(
        "command_center_v2.recent_evidence.evidence_inventory is missing — structured evidence inventory facts are UNKNOWN for this report snapshot.",
      );
    }
    const fallbackActive = report.command_center_v2.amazon_rescue.registry_load_error != null;
    if (fallbackActive) {
      unknownFacts.push(
        `token controls registry load error: ${report.command_center_v2.amazon_rescue.registry_load_error}.`,
      );
    }
    const freshnessSignalPresent = false;
    const inventoryContractOk = inv?.contract === "evidence_inventory_v1";
    const hasUnknownCondition =
      fallbackActive ||
      report.command_center_v2.recent_evidence.evidence_rollup.unknown_outcome_count > 0 ||
      !inventoryContractOk;
    if (report.command_center_v2.recent_evidence.evidence_rollup.unknown_outcome_count > 0) {
      unknownFacts.push(
        `evidence rollup includes UNKNOWN outcomes (${report.command_center_v2.recent_evidence.evidence_rollup.unknown_outcome_count}).`,
      );
    }
    const override = providerOverrides.evidence_rollup_token_controls ?? {};
    const source_class = override.source_class ?? "ARTIFACT";
    const resolvedFallback = override.fallback_active ?? fallbackActive;
    const resolvedFreshness = override.freshness_signal_present ?? freshnessSignalPresent;
    const resolvedUnknownFacts = [...unknownFacts, ...(override.unknown_facts ?? [])];
    const unknown_honesty =
      override.unknown_honesty ??
      deriveUnknownHonesty({
        fallback_active: resolvedFallback,
        has_unknown_condition: override.has_unknown_condition ?? hasUnknownCondition,
        unknown_facts: resolvedUnknownFacts,
      });
    const action_safety =
      override.action_safety ??
      deriveActionSafety({
        source_class,
        freshness_signal_present: resolvedFreshness,
        fallback_active: resolvedFallback,
      });
    providers.push({
      provider_key: "evidence_rollup_token_controls",
      source_class,
      freshness_signal_present: resolvedFreshness,
      fallback_active: resolvedFallback,
      unknown_honesty,
      action_safety,
      proven_facts: [...provenFacts, ...(override.proven_facts ?? [])],
      unknown_facts: resolvedUnknownFacts,
    });
  }

  const anyHonestyFail = providers.some((p) => p.unknown_honesty === "FAIL");
  const anyUnknownSafety = providers.some((p) => p.action_safety === "UNKNOWN");
  const allSafe = providers.every((p) => p.action_safety === "SAFE_TO_RECOMMEND");
  const anyCaution = providers.some((p) => p.action_safety === "CAUTION_INCOMPLETE_INPUTS");

  const overall_status: IntegritySentinelOverallStatus = anyHonestyFail
    ? "FAIL"
    : anyUnknownSafety
      ? "UNKNOWN"
      : allSafe
        ? "PASS"
        : anyCaution
          ? "WARN"
          : "UNKNOWN";

  const action_confidence: IntegritySentinelActionSafety = anyHonestyFail
    ? "CAUTION_INCOMPLETE_INPUTS"
    : anyUnknownSafety
      ? "UNKNOWN"
      : allSafe
        ? "SAFE_TO_RECOMMEND"
        : "CAUTION_INCOMPLETE_INPUTS";

  const owner_note =
    action_confidence === "SAFE_TO_RECOMMEND"
      ? "Integrity Sentinel sees no active fallback or freshness gaps in critical watcher providers; current Command Center guidance is actionable."
      : action_confidence === "CAUTION_INCOMPLETE_INPUTS"
        ? "Integrity Sentinel detected fallback/manual-artifact or uncertainty conditions; treat Command Center recommendations as cautionary until gaps are resolved."
        : "Integrity Sentinel cannot prove watcher integrity end-to-end from current signals; treat recommendations as UNKNOWN confidence.";

  return {
    data_mutation: false,
    overall_status,
    action_confidence,
    owner_note,
    providers,
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
    const quarantined = await buildOwnerQuarantinedFridgeModelsSummary();
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
    const sentinel = buildOwnerIntegritySentinelReport({ report, commandSurface });
    const withQuarantine = attachOwnerQuarantinedFridgeModelsReport(report, quarantined);
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
