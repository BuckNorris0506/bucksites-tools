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

const TRUST_FUNNEL_EMITTER_MODULES = [
  "src/lib/analytics/fridge-trust-funnel.ts",
  "src/components/analytics/FridgeTrustFunnelViewTracker.tsx",
  "src/components/analytics/FridgeTrustFunnelLink.tsx",
  "src/components/analytics/FridgeTrustFunnelDetails.tsx",
] as const;

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

export type OwnerCommandCenterLoadResult =
  | {
      ok: true;
      report: Awaited<ReturnType<typeof buildBuckpartsCommandCenterReport>> & {
        owner_quarantined_fridge_models: OwnerQuarantinedFridgeModelsReport;
        owner_vertical_launch_policy: OwnerVerticalLaunchPolicyReport;
        owner_command_center_neurons: OwnerCommandCenterNeuronsReport;
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
    const withQuarantine = attachOwnerQuarantinedFridgeModelsReport(report, quarantined);
    const withLaunchPolicy = attachOwnerVerticalLaunchPolicyReport(withQuarantine, launchPolicy);
    return { ok: true, report: attachOwnerCommandCenterNeuronsReport(withLaunchPolicy, neurons) };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "UNKNOWN";
    return { ok: false, message: msg };
  }
}
