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
  attachOwnerVerticalLaunchPolicyReport,
  buildOwnerVerticalLaunchPolicyReport,
  type OwnerVerticalLaunchPolicyReport,
} from "@/lib/owner-dashboard/owner-vertical-launch-policy";

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

export type OwnerNeuronConnectionLevel = "BRIGHT" | "DIM" | "DARK";

type OwnerNeuronStatus = "PROVEN" | "UNKNOWN";

export type OwnerDashboardNeuron = {
  neuron_key: "page_state_distribution" | "trust_funnel_measurement" | "gsc_search_discovery";
  title: string;
  connection_level: OwnerNeuronConnectionLevel;
  freshness_method: string;
  proven_facts: string[];
  unknown_facts: string[];
  next_owner_action: string;
  status: OwnerNeuronStatus;
};

export type OwnerCommandCenterNeuronsReport = {
  data_mutation: false;
  generated_from: string[];
  neurons: OwnerDashboardNeuron[];
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

export type OwnerSearchDemandConnectionLevel = "BRIGHT" | "DIM" | "DARK" | "UNKNOWN";
export type OwnerSearchDemandSourceClass = "LIVE" | "ARTIFACT" | "MANUAL" | "MIXED" | "UNKNOWN";

export type OwnerSearchDemandAndGapsNeuron = {
  neuron_key: "search_demand_and_gaps";
  connection_level: OwnerSearchDemandConnectionLevel;
  source_class: OwnerSearchDemandSourceClass;
  freshness_method: string;
  runtime_status: "OK" | "UNKNOWN_DB_UNAVAILABLE" | "UNKNOWN_NOT_QUERIED" | "UNKNOWN";
  window_days: { short: 7; long: 30 } | "UNKNOWN";
  search_events_last_7d: number | "UNKNOWN";
  search_events_last_30d: number | "UNKNOWN";
  zero_result_last_7d: number | "UNKNOWN";
  zero_result_last_30d: number | "UNKNOWN";
  actionable_search_gaps: number | "UNKNOWN";
  proven_facts: string[];
  unknown_facts: string[];
  next_owner_action: string;
};

export type OwnerSearchDemandAndGapsReport = {
  data_mutation: false;
  generated_from: string[];
  search_demand_and_gaps: OwnerSearchDemandAndGapsNeuron;
};

const TRUST_FUNNEL_EMITTER_MODULES = [
  "src/lib/analytics/fridge-trust-funnel.ts",
  "src/components/analytics/FridgeTrustFunnelViewTracker.tsx",
  "src/components/analytics/FridgeTrustFunnelLink.tsx",
  "src/components/analytics/FridgeTrustFunnelDetails.tsx",
] as const;

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

export function buildOwnerCommandCenterNeuronsReport(args: {
  rootDir: string;
  pageState:
    | {
        computable: boolean;
        distribution: Record<string, number> | "UNKNOWN";
        reason: string;
      }
    | null;
  gscPresence: {
    sitemap_xml: boolean;
    coverage_zip: boolean;
    performance_zip: boolean;
  } | null;
  trustFunnelEmitterContractOverride?: {
    all_emitters_present: boolean;
    missing_emitter_files?: string[];
  };
}): OwnerCommandCenterNeuronsReport {
  const allEmittersPresent = args.trustFunnelEmitterContractOverride?.all_emitters_present ?? true;
  const missingEmitterFiles = args.trustFunnelEmitterContractOverride?.missing_emitter_files ?? [];

  const pageStateProvenFacts: string[] = [];
  const pageStateUnknownFacts: string[] = [];
  let pageStateConnectionLevel: OwnerNeuronConnectionLevel = "DARK";
  let pageStateStatus: OwnerNeuronStatus = "UNKNOWN";
  if (args.pageState?.computable && args.pageState.distribution !== "UNKNOWN") {
    pageStateStatus = "PROVEN";
    pageStateConnectionLevel = "DIM";
    pageStateProvenFacts.push(
      `state_system_metrics.page_state is computable in command-surface (${JSON.stringify(args.pageState.distribution)}).`,
    );
    pageStateProvenFacts.push(`Computation note: ${args.pageState.reason}`);
    pageStateUnknownFacts.push(
      "Distribution is sitemap-derived and does not prove full runtime CTA/trust-demand page-state coverage.",
    );
  } else {
    pageStateUnknownFacts.push(
      args.pageState?.reason ??
        "state_system_metrics.page_state is UNKNOWN or unavailable from command-surface in this load path.",
    );
  }

  const trustFunnelProvenFacts: string[] = [];
  const trustFunnelUnknownFacts: string[] = [];
  let trustFunnelConnectionLevel: OwnerNeuronConnectionLevel = "DARK";
  let trustFunnelStatus: OwnerNeuronStatus = "UNKNOWN";
  if (allEmittersPresent) {
    trustFunnelStatus = "PROVEN";
    trustFunnelConnectionLevel = "DIM";
    trustFunnelProvenFacts.push(
      `GA4 trust-funnel emitter module contract is present in repo build (${TRUST_FUNNEL_EMITTER_MODULES.length} modules).`,
    );
    trustFunnelProvenFacts.push(
      "Emitter wiring is treated as a build/test contract signal, not runtime filesystem discovery.",
    );
  } else {
    trustFunnelUnknownFacts.push(
      `Missing trust-funnel emitter files: ${missingEmitterFiles.join(", ") || "UNKNOWN"}.`,
    );
  }
  trustFunnelUnknownFacts.push(
    "Sampled browser firing proof is not represented in this dashboard lane and remains UNKNOWN unless captured in report artifacts.",
  );
  trustFunnelUnknownFacts.push(
    "Dashboard aggregate ingest for GA4 trust-funnel events is not connected in current command-center report outputs.",
  );

  const gscProvenFacts: string[] = [];
  const gscUnknownFacts: string[] = [];
  let gscConnectionLevel: OwnerNeuronConnectionLevel = "DARK";
  let gscStatus: OwnerNeuronStatus = "UNKNOWN";
  if (args.gscPresence) {
    gscStatus = "PROVEN";
    gscConnectionLevel = "DIM";
    gscProvenFacts.push(
      `Command-surface GSC file-presence checks: sitemap_xml=${String(args.gscPresence.sitemap_xml)}, coverage_zip=${String(args.gscPresence.coverage_zip)}, performance_zip=${String(args.gscPresence.performance_zip)}.`,
    );
  } else {
    gscUnknownFacts.push("GSC presence signals are unavailable from command-surface in this load path.");
  }
  gscUnknownFacts.push(
    "Parsed impressions/clicks aggregates are UNKNOWN in owner dashboard unless explicit parser outputs are added to command-center inputs.",
  );

  return {
    data_mutation: false,
    generated_from: [
      "scripts/report-buckparts-command-surface.ts (state_system_metrics + gsc_exports_present)",
      ...TRUST_FUNNEL_EMITTER_MODULES,
    ],
    neurons: [
      {
        neuron_key: "page_state_distribution",
        title: "Page-state distribution",
        connection_level: pageStateConnectionLevel,
        freshness_method: "Built at owner-dashboard request time from command-surface output.",
        proven_facts: pageStateProvenFacts,
        unknown_facts: pageStateUnknownFacts,
        next_owner_action:
          "Decide whether to accept sitemap-derived partial visibility or wire richer page-state inputs into command-center summaries.",
        status: pageStateStatus,
      },
      {
        neuron_key: "trust_funnel_measurement",
        title: "Trust-funnel measurement",
        connection_level: trustFunnelConnectionLevel,
        freshness_method: "Repo file-presence check at owner-dashboard request time.",
        proven_facts: trustFunnelProvenFacts,
        unknown_facts: trustFunnelUnknownFacts,
        next_owner_action:
          "Connect a GA4 aggregate pull (or weekly export import) into command-center reporting before treating trust-funnel outcomes as bright.",
        status: trustFunnelStatus,
      },
      {
        neuron_key: "gsc_search_discovery",
        title: "GSC search discovery",
        connection_level: gscConnectionLevel,
        freshness_method: "Command-surface local file-presence checks at owner-dashboard request time.",
        proven_facts: gscProvenFacts,
        unknown_facts: gscUnknownFacts,
        next_owner_action:
          "Connect a GSC export parser or enforce a weekly manual upload-and-parse workflow for impressions/clicks visibility.",
        status: gscStatus,
      },
    ],
  };
}

export function attachOwnerCommandCenterNeuronsReport<T extends object>(
  report: T,
  neurons: OwnerCommandCenterNeuronsReport,
): T & { owner_command_center_neurons: OwnerCommandCenterNeuronsReport } {
  return {
    ...report,
    owner_command_center_neurons: neurons,
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
    const fallbackActive = report.command_center_v2.amazon_rescue.registry_load_error != null;
    if (fallbackActive) {
      unknownFacts.push(
        `token controls registry load error: ${report.command_center_v2.amazon_rescue.registry_load_error}.`,
      );
    }
    const freshnessSignalPresent = false;
    const hasUnknownCondition =
      fallbackActive || report.command_center_v2.recent_evidence.evidence_rollup.unknown_outcome_count > 0;
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
  const summary = args.report.search_and_click_intelligence_summary;
  const provenFacts: string[] = [];
  const unknownFacts: string[] = [];
  const sourceClass: OwnerSearchDemandSourceClass = "LIVE";
  const runtimeStatus = summary.runtime_status ?? "UNKNOWN";
  const runtimeOk = runtimeStatus === "OK";

  const search7 = summary.search_events.last_7d;
  const search30 = summary.search_events.last_30d;
  const zero7 = summary.search_events.zero_result_last_7d;
  const zero30 = summary.search_events.zero_result_last_30d;
  const actionable = summary.search_gaps_backlog.total_actionable;

  const addUnknownMetric = (label: string, value: number | "UNKNOWN") => {
    if (value === "UNKNOWN") unknownFacts.push(`${label} is UNKNOWN in command-surface summary.`);
    else provenFacts.push(`${label}=${value}.`);
  };

  addUnknownMetric("search_events_last_7d", search7);
  addUnknownMetric("search_events_last_30d", search30);
  addUnknownMetric("zero_result_last_7d", zero7);
  addUnknownMetric("zero_result_last_30d", zero30);
  addUnknownMetric("actionable_search_gaps", actionable);

  if (runtimeOk) {
    provenFacts.push("search_and_click_intelligence_summary runtime_status is OK (live DB-derived command-surface summary).");
  } else {
    unknownFacts.push(
      `search_and_click_intelligence_summary runtime_status is ${runtimeStatus}; search demand signal is not fully usable.`,
    );
  }

  if (runtimeOk && unknownFacts.length === 0) {
    provenFacts.push("Windowed demand and zero-result counts are present for both 7d and 30d.");
  }

  const connectionLevel: OwnerSearchDemandConnectionLevel = runtimeOk
    ? unknownFacts.length === 0
      ? "BRIGHT"
      : "DIM"
    : runtimeStatus === "UNKNOWN_NOT_QUERIED" || runtimeStatus === "UNKNOWN_DB_UNAVAILABLE"
      ? "DARK"
      : "UNKNOWN";

  const nextOwnerAction = runtimeOk
    ? actionable === "UNKNOWN"
      ? "Keep search-demand monitoring active and restore actionable gap counts before using this neuron for backlog prioritization."
      : actionable > 0
        ? "Use actionable search gaps plus zero-result counts to prioritize highest-impact search-fix work."
        : "Search demand telemetry is healthy; continue weekly monitoring and investigate rising zero-result rate if it increases."
    : "Restore command-surface search runtime availability before using this neuron to guide demand decisions.";

  return {
    data_mutation: false,
    generated_from: [
      "scripts/report-buckparts-command-surface.ts (search_and_click_intelligence_summary)",
      "scripts/report-buckparts-command-center.ts",
    ],
    search_demand_and_gaps: {
      neuron_key: "search_demand_and_gaps",
      connection_level: connectionLevel,
      source_class: sourceClass,
      freshness_method: "Built at owner-dashboard request time from command-surface summary windows (7d/30d).",
      runtime_status: runtimeStatus,
      window_days: summary.window_days ?? "UNKNOWN",
      search_events_last_7d: search7,
      search_events_last_30d: search30,
      zero_result_last_7d: zero7,
      zero_result_last_30d: zero30,
      actionable_search_gaps: actionable,
      proven_facts: provenFacts,
      unknown_facts: unknownFacts,
      next_owner_action: nextOwnerAction,
    },
  };
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

export type OwnerCommandCenterLoadResult =
  | {
      ok: true;
      report: Awaited<ReturnType<typeof buildBuckpartsCommandCenterReport>> & {
        owner_quarantined_fridge_models: OwnerQuarantinedFridgeModelsReport;
        owner_vertical_launch_policy: OwnerVerticalLaunchPolicyReport;
        owner_command_center_neurons: OwnerCommandCenterNeuronsReport;
        owner_integrity_sentinel: OwnerIntegritySentinelReport;
        owner_search_demand_and_gaps: OwnerSearchDemandAndGapsReport;
      };
    }
  | { ok: false; message: string };

export async function loadCommandCenterReportForOwner(rootDir = process.cwd()): Promise<OwnerCommandCenterLoadResult> {
  try {
    const report = await buildBuckpartsCommandCenterReport({ rootDir });
    const commandSurface = await buildBuckpartsCommandSurfaceReport({ rootDir });
    const quarantined = await buildOwnerQuarantinedFridgeModelsSummary();
    const launchPolicy = buildOwnerVerticalLaunchPolicyReport();
    const neurons = buildOwnerCommandCenterNeuronsReport({
      rootDir,
      pageState: commandSurface.state_system_metrics.page_state,
      gscPresence: commandSurface.gsc_exports_present,
    });
    const sentinel = buildOwnerIntegritySentinelReport({ report, commandSurface });
    const searchDemandAndGaps = buildOwnerSearchDemandAndGapsReport({ report });
    const withQuarantine = attachOwnerQuarantinedFridgeModelsReport(report, quarantined);
    const withLaunchPolicy = attachOwnerVerticalLaunchPolicyReport(withQuarantine, launchPolicy);
    const withNeurons = attachOwnerCommandCenterNeuronsReport(withLaunchPolicy, neurons);
    const withSentinel = attachOwnerIntegritySentinelReport(withNeurons, sentinel);
    return { ok: true, report: attachOwnerSearchDemandAndGapsReport(withSentinel, searchDemandAndGaps) };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "UNKNOWN";
    return { ok: false, message: msg };
  }
}
