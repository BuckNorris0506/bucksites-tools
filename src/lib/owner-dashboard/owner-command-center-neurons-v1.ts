import { existsSync } from "node:fs";
import path from "node:path";

import {
  buildOwnerGscExternalDemandNeuron,
  type OwnerGscExternalDemandNeuron,
} from "@/lib/owner-dashboard/gsc-external-demand";
import type {
  Ga4TrustFunnelEventTotals,
  Ga4TrustFunnelRates,
} from "@/lib/owner-dashboard/ga4-trust-funnel-artifact";
import type { Ga4TrustFunnelArtifact } from "@/lib/owner-dashboard/ga4-trust-funnel-artifact";
import { loadGa4TrustFunnelAggregateArtifact } from "@/lib/owner-dashboard/load-ga4-trust-funnel-aggregate-artifact";
import {
  buildOwnerSearchDemandAndGapsNeuronFromSummary,
  type OwnerSearchDemandAndGapsNeuron,
  type SearchAndClickIntelligenceSummaryForNeurons,
} from "@/lib/owner-dashboard/owner-search-demand-and-gaps-build-v1";
import type {
  BatchProductionOwnerDecisionsLaneV1,
  ClickVisibilitySnapshot,
  DecisionLane,
  PagePublishabilityTruthSummaryV1,
} from "../../../scripts/lib/buckparts-command-center-v2-types";

/** Command Center affiliate readiness slice for neuron wiring (no duplicate tracker scan). */
export type AffiliateReadinessNeuronInput = {
  lane: DecisionLane;
  summary: {
    approved_count: number;
    pending_count: number;
    pending_network_or_programs: string[];
    repairclinic_status: string | "UNKNOWN";
    affiliate_approval_pending: boolean;
  };
  commission_or_revenue: "NOT_CONNECTED" | string;
};

/** Command Center CTA / coverage slice for neuron wiring (no duplicate Supabase retailer_links query). */
export type CtaCoverageHealthNeuronInput = {
  coverageLane: DecisionLane;
  ctaCoverage: {
    source: "supabase_retailer_links";
    runtime_status: "OK" | "UNKNOWN_DB_UNAVAILABLE" | "UNKNOWN_NOT_QUERIED";
    total_retailer_links: number | "UNKNOWN";
    direct_buyable_links: number | "UNKNOWN";
    safe_cta_links: number | "UNKNOWN";
    blocked_or_unsafe_links: number | "UNKNOWN";
    missing_browser_truth_links: number | "UNKNOWN";
    retailer_counts: Record<string, number> | "UNKNOWN";
  };
  blockedRemediation?: {
    runtime_status: "OK" | "UNKNOWN";
    top_blocked_states: Array<{ state: string; count: number }> | "UNKNOWN";
    top_blocked_retailer_keys: Array<{ retailer_key: string; count: number }> | "UNKNOWN";
    recommended_next_action: string;
  };
};
export type OwnerNeuronConnectionLevel = "BRIGHT" | "DIM" | "DARK";

type OwnerNeuronStatus = "PROVEN" | "UNKNOWN";

export type OwnerDashboardNeuron = {
  neuron_key:
    | "page_state_distribution"
    | "trust_funnel_measurement"
    | "gsc_search_discovery"
    | "search_demand_and_gaps"
    | "click_visibility"
    | "affiliate_readiness"
    | "coverage_health"
    | "batch_production_owner_decisions";
  title: string;
  connection_level: OwnerNeuronConnectionLevel;
  freshness_method: string;
  proven_facts: string[];
  unknown_facts: string[];
  next_owner_action: string;
  status: OwnerNeuronStatus;
  trust_funnel_aggregate?:
    | {
        artifact_source: "SUPABASE" | "LOCAL_ARTIFACT" | "EMITTER_CONTRACT_ONLY" | "NONE";
        fetched_at: string | "UNKNOWN";
        status: "OK" | "UNKNOWN_CONFIG" | "UNKNOWN_API_ERROR" | "UNKNOWN";
        event_totals: Ga4TrustFunnelEventTotals | "UNKNOWN";
        rates: Ga4TrustFunnelRates | "UNKNOWN";
        dimension_breakdowns: {
          top_model_slugs: "UNKNOWN";
          top_filter_slugs: "UNKNOWN";
          quarantined_vs_normal: "UNKNOWN";
        };
      };
};

export type OwnerCommandCenterNeuronsReport = {
  data_mutation: false;
  generated_from: string[];
  neurons: OwnerDashboardNeuron[];
};

export type {
  OwnerSearchDemandAndGapsNeuron,
  OwnerSearchDemandAndGapsReport,
  OwnerSearchDemandConnectionLevel,
  OwnerSearchDemandSourceClass,
} from "@/lib/owner-dashboard/owner-search-demand-and-gaps-build-v1";

const TRUST_FUNNEL_EMITTER_MODULES = [
  "src/lib/analytics/fridge-trust-funnel.ts",
  "src/components/analytics/FridgeTrustFunnelViewTracker.tsx",
  "src/components/analytics/FridgeTrustFunnelLink.tsx",
  "src/components/analytics/FridgeTrustFunnelDetails.tsx",
] as const;
/** Legacy copy when `owner_gsc_external_demand` is not passed into neuron reconciliation (tests only). */
const STALE_GSC_AGGREGATES_UNKNOWN_OWNER_PATH =
  "Parsed impressions/clicks aggregates are UNKNOWN in owner dashboard unless explicit parser outputs are added to command-center inputs.";

const SEMANTIC_PAGE_STATE_FULLY_UNKNOWN_FACT =
  "Semantic PageState/PublishabilityState (buy-ready vs info-only, READY-style cohorts, quarantine integration, demand/noindex exclusions) is UNKNOWN in this neuron unless CTA, buy-gate/trust, quarantine, and demand signals are explicitly joined—this lane does not prove those facts.";

function hasComputableSemanticPublishabilityTruth(
  lane: PagePublishabilityTruthSummaryV1 | null | undefined,
): lane is PagePublishabilityTruthSummaryV1 {
  return !!lane && lane.computable_semantic_count > 0;
}

/** DIM when semantic truth exists but joins/automation still constrain completeness (not fully green). */
export function mapPageStateNeuronConnectionLevelWithPublishabilityTruth(args: {
  inventoryConnectionLevel: OwnerNeuronConnectionLevel;
  publishabilityTruth: PagePublishabilityTruthSummaryV1 | null | undefined;
}): OwnerNeuronConnectionLevel {
  const { inventoryConnectionLevel, publishabilityTruth } = args;
  if (!hasComputableSemanticPublishabilityTruth(publishabilityTruth)) {
    return inventoryConnectionLevel;
  }
  if (
    publishabilityTruth.unknown_join_count > 0 ||
    publishabilityTruth.runtime_status === "ATTENTION" ||
    publishabilityTruth.runtime_status === "UNKNOWN"
  ) {
    return inventoryConnectionLevel === "BRIGHT" ? "DIM" : inventoryConnectionLevel;
  }
  return inventoryConnectionLevel;
}

function appendSemanticPublishabilityTruthToPageStateNeuron(args: {
  lane: PagePublishabilityTruthSummaryV1;
  proven_facts: string[];
  unknown_facts: string[];
}): { status: OwnerNeuronStatus; next_owner_action: string } {
  const { lane } = args;
  const proven = args.proven_facts;
  const unknown = args.unknown_facts;

  proven.push(
    `command_center_v2.page_publishability_truth_summary_v1: contract=${lane.contract}; read_only=${String(lane.read_only)}; data_mutation=${String(lane.data_mutation)}.`,
  );
  proven.push(
    `Semantic PageState/PublishabilityState is computable for ${lane.computable_semantic_count}/${lane.total_candidate_pages} refrigerator_filter catalog pages (page_kind=${lane.page_kind}).`,
  );
  proven.push(`page_publishability_truth runtime_status: ${lane.runtime_status}.`);
  proven.push(`distribution_page_state: ${JSON.stringify(lane.distribution_page_state)}.`);
  proven.push(
    `distribution_publishability_state: ${JSON.stringify(lane.distribution_publishability_state)}.`,
  );
  proven.push(
    `distribution_automation_allowed: ${JSON.stringify(lane.distribution_automation_allowed)} (v1 never emits auto_fix_allowed).`,
  );
  if (lane.top_unknown_join_reasons.length > 0) {
    proven.push(`top_unknown_join_reasons: ${lane.top_unknown_join_reasons.join("; ")}.`);
  }

  unknown.push(
    `unknown_join_count=${lane.unknown_join_count} across per-page joins — semantic distributions are proven for computable pages, but the lane is not fully complete.`,
  );
  unknown.push(
    "Per-page demand_signal and click_signal remain UNKNOWN in page_publishability_truth_summary_v1 until explicit page-key joins exist.",
  );
  if (lane.unknown_join_count > 0) {
    unknown.push(
      "Automation remains constrained (read_only_only / owner_approval_required / never_auto_mutate) — do not treat semantic buy-ready counts as permission for autonomous mutation.",
    );
  }
  for (const f of lane.unknown_facts) {
    if (!unknown.includes(f)) unknown.push(f);
  }

  const next_owner_action =
    lane.runtime_status === "ATTENTION" || lane.unknown_join_count > 0
      ? "Use page_publishability_truth_summary_v1 sample_rows for refrigerator_filter semantic truth; keep sitemap inventory buckets separate; resolve unknown per-page demand/click joins before treating this neuron as fully bright."
      : "Semantic refrigerator_filter publishability truth is proven for all candidate pages in this lane; still treat commission/revenue and autonomous mutation as out-of-scope for this neuron.";

  return { status: "PROVEN", next_owner_action };
}

export function mapClickVisibilityToNeuronConnectionLevel(
  click: ClickVisibilitySnapshot | null | undefined,
): OwnerNeuronConnectionLevel {
  if (!click) return "DARK";
  if (click.runtime_status === "UNKNOWN_DB_UNAVAILABLE") return "DARK";
  if (click.runtime_status === "UNKNOWN_SCHEMA") return "DIM";
  if (click.runtime_status !== "OK") return "DARK";
  if (click.click_freshness_status === "STALE" || click.click_freshness_status === "NO_RECENT_EVENTS") {
    return "DIM";
  }
  if (click.click_freshness_status !== "OK") return "DIM";
  const partialMetrics =
    click.last_30_days_clicks === "UNKNOWN" ||
    click.human_likely_last_30_days_clicks === "UNKNOWN" ||
    click.newest_click_at === "UNKNOWN";
  return partialMetrics ? "DIM" : "BRIGHT";
}

function buildClickVisibilityNeuron(
  click: ClickVisibilitySnapshot | null | undefined,
): OwnerDashboardNeuron {
  const proven_facts: string[] = [
    "revenue_snapshot.click_visibility data_mutation: false (read-only Supabase aggregate; no second query in neuron builder).",
    "Outbound clicks are operational visibility only — not revenue, commission, or conversion proof.",
  ];
  const unknown_facts: string[] = [];
  const connection_level = mapClickVisibilityToNeuronConnectionLevel(click);
  let status: OwnerNeuronStatus = "UNKNOWN";

  if (!click) {
    unknown_facts.push(
      "command_center_v2.revenue_snapshot.click_visibility is missing from Command Center report.",
    );
    unknown_facts.push("Click counts are unavailable — do not infer revenue or buyer intent.");
    return {
      neuron_key: "click_visibility",
      title: "Supabase click visibility",
      connection_level: "DARK",
      freshness_method:
        "Command Center v2 revenue_snapshot.click_visibility at owner-dashboard load time (no duplicate Supabase query).",
      proven_facts,
      unknown_facts,
      next_owner_action:
        "Restore the same Supabase URL + SUPABASE_SERVICE_ROLE_KEY contract used by Command Center for read-only click_events counts.",
      status,
    };
  }

  if (connection_level === "BRIGHT") {
    status = "PROVEN";
  }

  proven_facts.push(`runtime_status: ${click.runtime_status}.`);
  proven_facts.push(`click_freshness_status: ${click.click_freshness_status}.`);
  proven_facts.push(`commission_or_revenue: ${click.commission_or_revenue}.`);
  if (click.commission_or_revenue === "NOT_CONNECTED") {
    proven_facts.push(
      click.commission_or_revenue_notes ||
        "Commission / revenue remains NOT_CONNECTED in Command Center — clicks must not be treated as revenue.",
    );
  } else {
    unknown_facts.push(
      "commission_or_revenue is not NOT_CONNECTED in this snapshot — verify Command Center before treating as revenue truth.",
    );
  }
  if (click.newest_click_at !== "UNKNOWN") {
    proven_facts.push(`newest_click_at: ${click.newest_click_at}.`);
  } else {
    unknown_facts.push("newest_click_at is UNKNOWN — click freshness cannot be fully proven.");
  }
  if (typeof click.human_likely_last_30_days_clicks === "number") {
    proven_facts.push(`human_likely_last_30_days_clicks: ${click.human_likely_last_30_days_clicks}.`);
  } else {
    unknown_facts.push("human_likely_last_30_days_clicks is UNKNOWN.");
  }
  if (typeof click.last_30_days_clicks === "number") {
    proven_facts.push(`last_30_days_clicks (raw): ${click.last_30_days_clicks}.`);
  }
  if (click.click_freshness_reason) {
    proven_facts.push(`click_freshness_reason: ${click.click_freshness_reason}.`);
  }
  if (click.click_quality_notes) {
    proven_facts.push(click.click_quality_notes);
  }
  if (click.runtime_status !== "OK") {
    unknown_facts.push(
      `Click visibility runtime_status is ${click.runtime_status}; Supabase click_events snapshot is not fully usable.`,
    );
  }
  if (click.click_freshness_status === "STALE") {
    unknown_facts.push("Click data is STALE per Command Center freshness — treat counts as cautionary only.");
  }
  if (click.click_freshness_status === "NO_RECENT_EVENTS") {
    unknown_facts.push("No recent click_events in the freshness window — visibility is partial.");
  }
  if (click.click_freshness_status === "UNKNOWN") {
    unknown_facts.push("click_freshness_status is UNKNOWN — freshness is not proven.");
  }
  for (const note of click.aggregation_notes ?? []) {
    if (!unknown_facts.includes(note)) unknown_facts.push(note);
  }

  return {
    neuron_key: "click_visibility",
    title: "Supabase click visibility",
    connection_level,
    freshness_method: `Command Center click snapshot generated_at=${click.generated_at}; window ${click.window_days.short}d/${click.window_days.long}d.`,
    proven_facts,
    unknown_facts,
    next_owner_action:
      click.runtime_status === "OK"
        ? click.click_freshness_status === "OK"
          ? "Use human_likely_* counts for conservative ops visibility; never treat clicks as revenue until commission_or_revenue is connected with a real feed."
          : "Refresh click_events visibility or investigate stale/no-recent freshness before prioritizing monetization work from raw counts."
        : "Restore read-only Supabase click_events access before using this neuron for operational visibility.",
    status,
  };
}

export function mapAffiliateReadinessToNeuronConnectionLevel(
  input: AffiliateReadinessNeuronInput | null | undefined,
): OwnerNeuronConnectionLevel {
  if (!input) return "DARK";
  const { lane, summary } = input;
  if (lane.status === "UNKNOWN" || lane.status === "PLACEHOLDER" || lane.status === "BLOCKED") {
    return "DARK";
  }
  if (
    lane.status === "OK" &&
    summary.approved_count >= 1 &&
    !summary.affiliate_approval_pending
  ) {
    return "BRIGHT";
  }
  return "DIM";
}

function buildAffiliateReadinessNeuron(
  input: AffiliateReadinessNeuronInput | null | undefined,
): OwnerDashboardNeuron {
  const proven_facts: string[] = [
    "affiliate_readiness data_mutation: false (Command Center read-only affiliate tracker summary; no second file scan in neuron builder).",
    "Affiliate approval/setup state is monetization readiness only — not revenue, commission, or conversion proof.",
  ];
  const unknown_facts: string[] = [];
  const connection_level = mapAffiliateReadinessToNeuronConnectionLevel(input);
  let status: OwnerNeuronStatus = "UNKNOWN";

  if (!input) {
    unknown_facts.push(
      "command_center_v2.affiliate_readiness and affiliate_readiness_summary are missing from Command Center report.",
    );
    unknown_facts.push("Affiliate program status is unavailable — do not infer revenue from setup state.");
    return {
      neuron_key: "affiliate_readiness",
      title: "Affiliate readiness",
      connection_level: "DARK",
      freshness_method:
        "Command Center v2 affiliate_readiness lane + v1 affiliate_readiness_summary at owner-dashboard load time.",
      proven_facts,
      unknown_facts,
      next_owner_action:
        "Restore affiliate tracker read model via Command Center (data/affiliate/affiliate-application-tracker.json) before using this neuron.",
      status,
    };
  }

  if (connection_level === "BRIGHT") {
    status = "PROVEN";
  }

  const { lane, summary, commission_or_revenue } = input;
  proven_facts.push(`affiliate_readiness lane status: ${lane.status}.`);
  proven_facts.push(`approved_count: ${summary.approved_count}.`);
  proven_facts.push(`pending_count: ${summary.pending_count}.`);
  proven_facts.push(`affiliate_approval_pending: ${String(summary.affiliate_approval_pending)}.`);
  proven_facts.push(`repairclinic_status: ${summary.repairclinic_status}.`);
  proven_facts.push(`commission_or_revenue: ${commission_or_revenue}.`);
  if (commission_or_revenue === "NOT_CONNECTED") {
    proven_facts.push(
      "Commission / revenue remains NOT_CONNECTED in Command Center — affiliate approvals must not be treated as revenue proof.",
    );
  } else {
    unknown_facts.push(
      "commission_or_revenue is not NOT_CONNECTED in this snapshot — verify Command Center revenue ledger before any revenue claim.",
    );
  }
  if (summary.approved_count >= 1 && summary.pending_network_or_programs.length > 0) {
    proven_facts.push(
      `Notable approved monetization programs are proven via tracker (approved_count=${summary.approved_count}); pending networks/programs remain: ${summary.pending_network_or_programs.join(", ")}.`,
    );
  } else if (summary.approved_count >= 1) {
    proven_facts.push(
      `At least one approved affiliate program is proven (approved_count=${summary.approved_count}).`,
    );
  }
  if (summary.pending_network_or_programs.length > 0) {
    proven_facts.push(`pending_network_or_programs: ${summary.pending_network_or_programs.join(", ")}.`);
  }
  if (summary.affiliate_approval_pending) {
    unknown_facts.push(
      "affiliate_approval_pending is true — non-Amazon monetization programs still need owner setup/approval workflow.",
    );
  }
  if (summary.approved_count === 0) {
    unknown_facts.push("approved_count is 0 — no approved affiliate programs are proven for monetization readiness.");
  }
  if (summary.pending_count > 0) {
    unknown_facts.push(
      `pending_count is ${summary.pending_count} — affiliate tracker shows programs still pending or in-flight.`,
    );
  }
  if (lane.blocker) {
    unknown_facts.push(`affiliate_readiness blocker: ${lane.blocker}.`);
  }
  if (lane.top_items && lane.top_items.length > 0) {
    proven_facts.push(`affiliate_readiness top_items: ${lane.top_items.join(", ")}.`);
  }

  return {
    neuron_key: "affiliate_readiness",
    title: "Affiliate readiness",
    connection_level,
    freshness_method:
      "Command Center affiliate_readiness lane + affiliate_readiness_summary from report-buckparts-command-center (tracker already ingested once).",
    proven_facts,
    unknown_facts,
    next_owner_action: lane.next_owner_action,
    status,
  };
}

export function mapCoverageHealthToNeuronConnectionLevel(
  input: CtaCoverageHealthNeuronInput | null | undefined,
): OwnerNeuronConnectionLevel {
  if (!input) return "DARK";
  const { coverageLane, ctaCoverage: cta } = input;
  if (
    cta.runtime_status === "UNKNOWN_DB_UNAVAILABLE" ||
    cta.runtime_status === "UNKNOWN_NOT_QUERIED"
  ) {
    return "DARK";
  }
  if (
    coverageLane.status === "BLOCKED" ||
    coverageLane.status === "UNKNOWN" ||
    coverageLane.status === "PLACEHOLDER"
  ) {
    return "DARK";
  }
  if (cta.runtime_status !== "OK") return "DARK";

  if (
    typeof cta.safe_cta_links !== "number" ||
    typeof cta.total_retailer_links !== "number" ||
    typeof cta.direct_buyable_links !== "number"
  ) {
    return "DIM";
  }
  const safeCta = cta.safe_cta_links;
  const totalLinks = cta.total_retailer_links;
  if (coverageLane.status === "ATTENTION") return "DIM";
  if (safeCta === 0) return "DIM";

  const blocked =
    typeof cta.blocked_or_unsafe_links === "number" ? cta.blocked_or_unsafe_links : 0;
  if (totalLinks > 0 && blocked > safeCta) return "DIM";

  if (coverageLane.status === "OK" && safeCta > 0) return "BRIGHT";
  return "DIM";
}

function buildCoverageHealthNeuron(
  input: CtaCoverageHealthNeuronInput | null | undefined,
): OwnerDashboardNeuron {
  const proven_facts: string[] = [
    "coverage_health data_mutation: false (Command Center command-surface + v2 coverage lane; no second retailer_links query in neuron builder).",
    "CTA coverage is buyer-path / monetization readiness only — not revenue, commission, or conversion proof.",
    "Valid buy CTA availability (safe_cta_links) proves link-level readiness from retailer_links aggregates, not live PDP buyer intent.",
  ];
  const unknown_facts: string[] = [
    "Coverage metrics must not be used for revenue or commission claims — commission_or_revenue remains excluded from this neuron lane.",
  ];
  const connection_level = mapCoverageHealthToNeuronConnectionLevel(input);
  let status: OwnerNeuronStatus = "UNKNOWN";

  if (!input) {
    unknown_facts.push(
      "command_center_v2.coverage_health and command-surface cta_coverage_metrics are missing from Command Center owner load.",
    );
    return {
      neuron_key: "coverage_health",
      title: "CTA / coverage health",
      connection_level: "DARK",
      freshness_method:
        "command_center_v2.coverage_health + report-buckparts-command-surface.cta_coverage_metrics at owner-dashboard load time.",
      proven_facts,
      unknown_facts,
      next_owner_action:
        "Run buckparts:command-surface read-only and restore Supabase retailer_links visibility before using this neuron.",
      status,
    };
  }

  if (connection_level === "BRIGHT") {
    status = "PROVEN";
  }

  const { coverageLane, ctaCoverage: cta, blockedRemediation } = input;
  proven_facts.push(`coverage_health lane status: ${coverageLane.status}.`);
  proven_facts.push(`cta_coverage_metrics runtime_status: ${cta.runtime_status}.`);
  proven_facts.push(`cta_coverage_metrics source: ${cta.source}.`);
  if (typeof cta.safe_cta_links === "number") {
    proven_facts.push(`safe_cta_links (valid buy CTA): ${cta.safe_cta_links}.`);
  } else {
    unknown_facts.push("safe_cta_links is UNKNOWN — valid CTA coverage cannot be proven.");
  }
  if (typeof cta.total_retailer_links === "number") {
    proven_facts.push(`total_retailer_links: ${cta.total_retailer_links}.`);
  }
  if (typeof cta.direct_buyable_links === "number") {
    proven_facts.push(`direct_buyable_links: ${cta.direct_buyable_links}.`);
  }
  if (typeof cta.blocked_or_unsafe_links === "number") {
    proven_facts.push(`blocked_or_unsafe_links: ${cta.blocked_or_unsafe_links}.`);
    if (cta.safe_cta_links === 0) {
      unknown_facts.push(
        `safe_cta_links is 0 with ${cta.blocked_or_unsafe_links} blocked_or_unsafe_links — significant buy-path gaps remain.`,
      );
    }
  }
  if (typeof cta.missing_browser_truth_links === "number" && cta.missing_browser_truth_links > 0) {
    unknown_facts.push(
      `missing_browser_truth_links: ${cta.missing_browser_truth_links} — browser-truth gaps remain on retailer_links.`,
    );
  }
  if (coverageLane.blocker) {
    unknown_facts.push(`coverage_health blocker: ${coverageLane.blocker}.`);
  }
  if (coverageLane.top_items && coverageLane.top_items.length > 0) {
    proven_facts.push(`coverage_health top_items: ${coverageLane.top_items.join("; ")}.`);
  }
  if (blockedRemediation?.runtime_status === "OK") {
    if (
      blockedRemediation.top_blocked_states !== "UNKNOWN" &&
      blockedRemediation.top_blocked_states.length > 0
    ) {
      const top = blockedRemediation.top_blocked_states
        .slice(0, 3)
        .map((s) => `${s.state}:${s.count}`)
        .join(", ");
      proven_facts.push(`strongest blocked_link states (command-surface): ${top}.`);
    }
    if (
      blockedRemediation.top_blocked_retailer_keys !== "UNKNOWN" &&
      blockedRemediation.top_blocked_retailer_keys.length > 0
    ) {
      const top = blockedRemediation.top_blocked_retailer_keys
        .slice(0, 3)
        .map((r) => `${r.retailer_key}:${r.count}`)
        .join(", ");
      proven_facts.push(`strongest blocked retailer keys (command-surface): ${top}.`);
    }
  }
  if (cta.runtime_status !== "OK") {
    unknown_facts.push(
      `cta_coverage_metrics runtime_status is ${cta.runtime_status}; retailer_links aggregates are not fully usable.`,
    );
  }

  return {
    neuron_key: "coverage_health",
    title: "CTA / coverage health",
    connection_level,
    freshness_method:
      "command_center_v2.coverage_health (command-surface health projection) + cta_coverage_metrics from report-buckparts-command-surface (single Supabase read at command-surface build).",
    proven_facts,
    unknown_facts,
    next_owner_action: coverageLane.next_owner_action,
    status,
  };
}

export function mapSearchDemandAndGapsToNeuronConnectionLevel(
  search: OwnerSearchDemandAndGapsNeuron | null | undefined,
): OwnerNeuronConnectionLevel {
  if (!search) return "DARK";
  if (search.connection_level === "UNKNOWN") return "DARK";
  return search.connection_level;
}

function buildSearchDemandAndGapsNeuron(
  search: OwnerSearchDemandAndGapsNeuron | null | undefined,
): OwnerDashboardNeuron {
  const proven_facts: string[] = ["owner_search_demand_and_gaps data_mutation: false."];
  const unknown_facts: string[] = [];
  const connection_level = mapSearchDemandAndGapsToNeuronConnectionLevel(search);
  let status: OwnerNeuronStatus = "UNKNOWN";

  if (!search) {
    unknown_facts.push(
      "owner_search_demand_and_gaps.search_demand_and_gaps is missing from Command Center owner load.",
    );
    return {
      neuron_key: "search_demand_and_gaps",
      title: "Search demand and gaps",
      connection_level: "DARK",
      freshness_method:
        "Built at owner-dashboard request time from command_center search_and_click_intelligence_summary (no duplicate DB query in neuron builder).",
      proven_facts,
      unknown_facts,
      next_owner_action:
        "Restore command-surface search runtime availability before using this neuron to guide demand decisions.",
      status,
    };
  }

  if (connection_level === "BRIGHT") {
    status = "PROVEN";
  }

  proven_facts.push(`connection_level (source report): ${search.connection_level}.`);
  proven_facts.push(`runtime_status: ${search.runtime_status}.`);
  proven_facts.push(`source_class: ${search.source_class}.`);
  if (typeof search.actionable_search_gaps === "number") {
    proven_facts.push(`actionable_search_gaps: ${search.actionable_search_gaps}.`);
  } else {
    unknown_facts.push("actionable_search_gaps is UNKNOWN — search gap backlog is not fully queryable.");
  }
  for (const f of search.proven_facts) {
    if (!proven_facts.includes(f)) proven_facts.push(f);
  }
  for (const f of search.unknown_facts) {
    if (!unknown_facts.includes(f)) unknown_facts.push(f);
  }

  return {
    neuron_key: "search_demand_and_gaps",
    title: "Search demand and gaps",
    connection_level,
    freshness_method: search.freshness_method,
    proven_facts,
    unknown_facts,
    next_owner_action: search.next_owner_action,
    status,
  };
}

export function mapBatchProductionOwnerDecisionsLaneToNeuronConnectionLevel(
  lane: BatchProductionOwnerDecisionsLaneV1 | null | undefined,
): OwnerNeuronConnectionLevel {
  if (!lane) return "DARK";
  if (
    lane.runtime_status === "OK" &&
    lane.approved_for_planning_count > 0 &&
    lane.may_mutate === false
  ) {
    return "BRIGHT";
  }
  if (
    lane.runtime_status === "UNKNOWN_REGISTRY_MISSING" ||
    lane.runtime_status === "UNKNOWN_NO_BATCH_ROWS"
  ) {
    return "DARK";
  }
  return "DIM";
}

function buildBatchProductionOwnerDecisionsNeuron(
  batchLane: BatchProductionOwnerDecisionsLaneV1 | null | undefined,
): OwnerDashboardNeuron {
  const proven_facts: string[] = [];
  const unknown_facts: string[] = [];
  const connection_level = mapBatchProductionOwnerDecisionsLaneToNeuronConnectionLevel(batchLane);
  let status: OwnerNeuronStatus = "UNKNOWN";

  if (!batchLane) {
    unknown_facts.push(
      "command_center_v2.batch_production_owner_decisions_lane_v1 is missing from Command Center report.",
    );
    return {
      neuron_key: "batch_production_owner_decisions",
      title: "Batch production owner decisions (Layer 7)",
      connection_level: "DARK",
      freshness_method:
        "Command Center v2 batch_production_owner_decisions_lane_v1 at owner-dashboard load time (no registry scan in neuron builder).",
      proven_facts,
      unknown_facts,
      next_owner_action:
        "Restore Command Center v2 batch lane wiring from committed founder decision registry export.",
      status,
    };
  }

  if (connection_level === "BRIGHT") {
    status = "PROVEN";
  }

  proven_facts.push(`runtime_status: ${batchLane.runtime_status}.`);
  proven_facts.push(`approved_for_planning_count: ${batchLane.approved_for_planning_count}.`);
  for (const row of batchLane.approved_rows) {
    proven_facts.push(`approved row_id=${row.row_id} token=${row.token}.`);
  }
  if (batchLane.excluded_not_owner_review_ready_row_ids !== "UNKNOWN") {
    proven_facts.push(
      `excluded_not_owner_review_ready_row_ids: ${batchLane.excluded_not_owner_review_ready_row_ids.join(", ")}.`,
    );
  } else {
    unknown_facts.push("excluded_not_owner_review_ready_row_ids is UNKNOWN.");
  }
  proven_facts.push(`may_mutate: ${String(batchLane.may_mutate)}.`);
  proven_facts.push(`may_write_production_evidence: ${String(batchLane.may_write_production_evidence)}.`);
  proven_facts.push(`batch_size_20_status: ${batchLane.batch_size_20_status}.`);
  proven_facts.push(
    `layer_6_founder_only_production_mutation_approval: ${batchLane.layer_6_founder_only_production_mutation_approval}.`,
  );
  proven_facts.push(`production_evidence_commit: ${batchLane.production_evidence_commit}.`);

  if (batchLane.source_row_count !== "UNKNOWN") {
    proven_facts.push(`source_row_count: ${batchLane.source_row_count}.`);
  } else {
    unknown_facts.push("source_row_count is UNKNOWN.");
  }
  if (batchLane.primary_source_registry_file === "UNKNOWN") {
    unknown_facts.push("primary_source_registry_file is UNKNOWN.");
  } else {
    proven_facts.push(`primary_source_registry_file: ${batchLane.primary_source_registry_file}.`);
  }
  for (const f of batchLane.proven_facts) {
    if (!proven_facts.includes(f)) proven_facts.push(f);
  }
  for (const f of batchLane.unknown_facts) {
    if (!unknown_facts.includes(f)) unknown_facts.push(f);
  }

  return {
    neuron_key: "batch_production_owner_decisions",
    title: "Batch production owner decisions (Layer 7)",
    connection_level,
    freshness_method:
      "Command Center v2 batch_production_owner_decisions_lane_v1 at owner-dashboard load time (no dashboard registry scan).",
    proven_facts,
    unknown_facts,
    next_owner_action: batchLane.next_agent_action,
    status,
  };
}

export function buildOwnerCommandCenterNeuronsReport(args: {
  rootDir: string;
  pageState:
    | {
        computable: boolean;
        distribution: Record<string, number> | "UNKNOWN";
        reason: string;
        contract?: "sitemap_artifact_inventory_v1";
        artifact_relative_path?: string;
        url_count?: number;
      }
    | null;
  gscPresence: {
    sitemap_xml: boolean;
    coverage_zip: boolean;
    performance_zip: boolean;
  } | null;
  /** When set (owner load path), reconciles `gsc_search_discovery` with lane 16 ingest truth. */
  gscExternalDemand?: OwnerGscExternalDemandNeuron | null;
  trustFunnelEmitterContractOverride?: {
    all_emitters_present: boolean;
    missing_emitter_files?: string[];
  };
  trustFunnelAggregateArtifact?: {
    source: "SUPABASE" | "LOCAL_ARTIFACT";
    artifact: Ga4TrustFunnelArtifact;
  } | null;
  trustFunnelAggregateIssue?: string | null;
  /** When set, adds search_demand_and_gaps neuron from owner_search_demand_and_gaps output only (no duplicate query). */
  searchDemandAndGaps?: OwnerSearchDemandAndGapsNeuron | null;
  /** When set, adds click_visibility neuron from revenue_snapshot.click_visibility only (no duplicate Supabase query). */
  clickVisibility?: ClickVisibilitySnapshot | null;
  /** When set, adds affiliate_readiness neuron from CC v2 lane + v1 summary only (no duplicate tracker scan). */
  affiliateReadiness?: AffiliateReadinessNeuronInput | null;
  /** When set, adds coverage_health neuron from CC v2 + command-surface cta_coverage_metrics (no duplicate query). */
  ctaCoverageHealth?: CtaCoverageHealthNeuronInput | null;
  /** When set, adds batch_production_owner_decisions neuron from CC v2 lane only (no registry scan). */
  batchProductionOwnerDecisionsLane?: BatchProductionOwnerDecisionsLaneV1 | null;
  /** When set with computable_semantic_count > 0, upgrades semantic PageState truth (inventory metrics unchanged). */
  pagePublishabilityTruth?: PagePublishabilityTruthSummaryV1 | null;
}): OwnerCommandCenterNeuronsReport {
  const allEmittersPresent = args.trustFunnelEmitterContractOverride?.all_emitters_present ?? true;
  const missingEmitterFiles = args.trustFunnelEmitterContractOverride?.missing_emitter_files ?? [];

  const pageStateProvenFacts: string[] = [];
  const pageStateUnknownFacts: string[] = [];
  let pageStateConnectionLevel: OwnerNeuronConnectionLevel = "DARK";
  let pageStateStatus: OwnerNeuronStatus = "UNKNOWN";

  const semanticPageStateUnknownFactsWithoutPublishabilityLane = [
    SEMANTIC_PAGE_STATE_FULLY_UNKNOWN_FACT,
    "Per-page CTA availability is not represented unless proven via joined retailer/link truth.",
    "Buy-gate and trust-suppressed buy paths are not represented unless proven via runtime trust inputs.",
    "Quarantine or mapping-conflict integration is not represented in page-state counts (see dedicated owner lanes when present).",
    "Search-demand / hasDemand-style signals are not represented here.",
  ];

  const inventoryContract = args.pageState?.contract === "sitemap_artifact_inventory_v1";
  const hasNumericDistribution =
    args.pageState?.computable === true && args.pageState.distribution !== "UNKNOWN";

  if (inventoryContract && hasNumericDistribution && args.pageState) {
    const ps = args.pageState;
    pageStateConnectionLevel = "BRIGHT";
    pageStateStatus = "UNKNOWN";
    const path =
      ps.artifact_relative_path ?? "data/gsc/sitemap.xml (default artifact path when omitted)";
    const n = ps.url_count;
    pageStateProvenFacts.push(
      `Sitemap artifact inventory contract: ${typeof n === "number" ? `${n} URLs` : "URL count omitted"} parsed from local artifact ${path}.`,
    );
    pageStateProvenFacts.push(
      `Vertical-policy rollup uses repo config only (first URL path segment → VERTICAL_POLICY_* buckets): ${JSON.stringify(ps.distribution)}.`,
    );
    pageStateProvenFacts.push(`Inventory note: ${ps.reason}`);
    pageStateUnknownFacts.push(
      "VERTICAL_POLICY_* buckets are route-prefix projections from `vertical-launch-state` — not proof of live Google indexing or on-page robots metadata.",
    );
    if (!hasComputableSemanticPublishabilityTruth(args.pagePublishabilityTruth)) {
      pageStateUnknownFacts.push(...semanticPageStateUnknownFactsWithoutPublishabilityLane);
    }
  } else if (hasNumericDistribution) {
    pageStateConnectionLevel = "DIM";
    pageStateStatus = "UNKNOWN";
    pageStateProvenFacts.push(
      `Command-surface reported a numeric page_state distribution without the sitemap artifact inventory contract (${JSON.stringify(args.pageState?.distribution)}).`,
    );
    pageStateProvenFacts.push(`Computation note: ${args.pageState?.reason ?? "UNKNOWN"}.`);
    if (!hasComputableSemanticPublishabilityTruth(args.pagePublishabilityTruth)) {
      pageStateUnknownFacts.push(...semanticPageStateUnknownFactsWithoutPublishabilityLane);
    }
  } else {
    pageStateUnknownFacts.push(
      args.pageState?.reason ??
        "state_system_metrics.page_state is UNKNOWN or unavailable from command-surface in this load path.",
    );
    if (!hasComputableSemanticPublishabilityTruth(args.pagePublishabilityTruth)) {
      pageStateUnknownFacts.push(...semanticPageStateUnknownFactsWithoutPublishabilityLane);
    }
  }

  let pageStateNextOwnerAction =
    "Treat inventory/policy buckets as artifact truth only; wire joined CTA/trust/quarantine/demand inputs if you need semantic PageState or PublishabilityState counts.";

  if (hasComputableSemanticPublishabilityTruth(args.pagePublishabilityTruth)) {
    const semantic = appendSemanticPublishabilityTruthToPageStateNeuron({
      lane: args.pagePublishabilityTruth,
      proven_facts: pageStateProvenFacts,
      unknown_facts: pageStateUnknownFacts,
    });
    pageStateStatus = semantic.status;
    pageStateNextOwnerAction = semantic.next_owner_action;
    pageStateConnectionLevel = mapPageStateNeuronConnectionLevelWithPublishabilityTruth({
      inventoryConnectionLevel: pageStateConnectionLevel,
      publishabilityTruth: args.pagePublishabilityTruth,
    });
  }

  const trustFunnelProvenFacts: string[] = [];
  const trustFunnelUnknownFacts: string[] = [];
  let trustFunnelAggregate:
    | OwnerDashboardNeuron["trust_funnel_aggregate"]
    | undefined;
  let trustFunnelConnectionLevel: OwnerNeuronConnectionLevel = "DARK";
  let trustFunnelStatus: OwnerNeuronStatus = "UNKNOWN";
  const aggregate = args.trustFunnelAggregateArtifact;
  if (aggregate?.artifact?.status === "OK") {
    trustFunnelConnectionLevel = "BRIGHT";
    trustFunnelStatus = "PROVEN";
    trustFunnelProvenFacts.push(
      `GA4 trust-funnel aggregate artifact loaded from ${aggregate.source}.`,
    );
    trustFunnelAggregate = {
      artifact_source: aggregate.source,
      fetched_at: aggregate.artifact.fetched_at,
      status: aggregate.artifact.status,
      event_totals: aggregate.artifact.event_totals,
      rates: aggregate.artifact.rates,
      dimension_breakdowns: aggregate.artifact.dimension_breakdowns,
    };
    trustFunnelUnknownFacts.push(...aggregate.artifact.unknown_facts);
  } else if (aggregate?.artifact) {
    trustFunnelAggregate = {
      artifact_source: aggregate.source,
      fetched_at: aggregate.artifact.fetched_at,
      status: aggregate.artifact.status,
      event_totals: "UNKNOWN",
      rates: "UNKNOWN",
      dimension_breakdowns: {
        top_model_slugs: "UNKNOWN",
        top_filter_slugs: "UNKNOWN",
        quarantined_vs_normal: "UNKNOWN",
      },
    };
    trustFunnelUnknownFacts.push(
      `GA4 trust-funnel aggregate artifact status is ${aggregate.artifact.status}.`,
      ...aggregate.artifact.unknown_facts,
    );
  }
  if (allEmittersPresent) {
    if (!aggregate) {
      trustFunnelStatus = "PROVEN";
      trustFunnelConnectionLevel = "DIM";
    }
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
  if (!trustFunnelAggregate) {
    trustFunnelAggregate = {
      artifact_source: allEmittersPresent ? "EMITTER_CONTRACT_ONLY" : "NONE",
      fetched_at: "UNKNOWN",
      status: "UNKNOWN",
      event_totals: "UNKNOWN",
      rates: "UNKNOWN",
      dimension_breakdowns: {
        top_model_slugs: "UNKNOWN",
        top_filter_slugs: "UNKNOWN",
        quarantined_vs_normal: "UNKNOWN",
      },
    };
  }
  if (args.trustFunnelAggregateIssue) {
    trustFunnelUnknownFacts.push(args.trustFunnelAggregateIssue);
  }
  trustFunnelUnknownFacts.push(
    "Sampled browser firing proof is not represented in this dashboard lane and remains UNKNOWN unless captured in report artifacts.",
  );
  if (trustFunnelAggregate.artifact_source === "EMITTER_CONTRACT_ONLY" || trustFunnelAggregate.artifact_source === "NONE") {
    trustFunnelUnknownFacts.push(
      "Dashboard aggregate ingest for GA4 trust-funnel events is not connected in current command-center report outputs.",
    );
  }

  const gscProvenFacts: string[] = [];
  const gscUnknownFacts: string[] = [];
  let gscConnectionLevel: OwnerNeuronConnectionLevel = "DARK";
  let gscStatus: OwnerNeuronStatus = "UNKNOWN";
  let gscFreshnessMethod =
    "Command-surface local file-presence checks at owner-dashboard request time.";
  let gscNextOwnerAction =
    "Connect a GSC export parser or enforce a weekly manual upload-and-parse workflow for impressions/clicks visibility.";

  const ext = args.gscExternalDemand ?? null;
  const gscTotalsNumeric =
    !!ext &&
    typeof ext.total_impressions === "number" &&
    typeof ext.total_clicks === "number";

  if (args.gscPresence) {
    gscProvenFacts.push(
      `Command-surface GSC export file-presence: sitemap_xml=${String(args.gscPresence.sitemap_xml)}, coverage_zip=${String(args.gscPresence.coverage_zip)}, performance_zip=${String(args.gscPresence.performance_zip)}.`,
    );
  } else if (!ext) {
    gscUnknownFacts.push("GSC presence signals are unavailable from command-surface in this load path.");
  }

  if (ext) {
    gscFreshnessMethod = ext.freshness_method;
    gscNextOwnerAction = ext.next_owner_action;
    for (const f of ext.proven_facts) {
      if (!gscProvenFacts.includes(f)) gscProvenFacts.push(f);
    }
    for (const u of ext.unknown_facts) {
      if (!gscUnknownFacts.includes(u)) gscUnknownFacts.push(u);
    }

    const mappedLevel: OwnerNeuronConnectionLevel =
      ext.connection_level === "UNKNOWN" ? "DARK" : ext.connection_level;

    if (ext.connection_level === "BRIGHT" && gscTotalsNumeric) {
      gscConnectionLevel = "BRIGHT";
      gscStatus = "PROVEN";
      gscProvenFacts.unshift(
        `GSC search-demand totals are proven via owner_gsc_external_demand (total_impressions=${ext.total_impressions}, total_clicks=${ext.total_clicks}; artifact_source=${ext.artifact_source}, export_file_used=${String(ext.export_file_used)}).`,
      );
    } else {
      let effectiveLevel = mappedLevel;
      if (ext.connection_level === "BRIGHT" && !gscTotalsNumeric) {
        effectiveLevel = "DIM";
      }
      gscConnectionLevel = effectiveLevel;
      gscStatus = gscTotalsNumeric ? "PROVEN" : "UNKNOWN";
    }

    gscUnknownFacts.push(
      "Owner-dashboard request path does not call Google Search Console live APIs; metrics reflect durable Supabase artifact, local JSON artifact, or manual export ingest freshness.",
    );
    if (ext.export_date !== "UNKNOWN") {
      gscUnknownFacts.push(
        `Export/window dating hint: export_date=${ext.export_date} (compare to API artifact date_range when applicable).`,
      );
    }
  } else {
    if (args.gscPresence) {
      gscStatus = "PROVEN";
      gscConnectionLevel = "DIM";
    }
    gscUnknownFacts.push(STALE_GSC_AGGREGATES_UNKNOWN_OWNER_PATH);
  }

  const coreNeurons: OwnerDashboardNeuron[] = [
      {
        neuron_key: "page_state_distribution",
        title: "Page-state distribution",
        connection_level: pageStateConnectionLevel,
        freshness_method: "Built at owner-dashboard request time from command-surface output.",
        proven_facts: pageStateProvenFacts,
        unknown_facts: pageStateUnknownFacts,
        next_owner_action: pageStateNextOwnerAction,
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
          trustFunnelAggregate.artifact_source === "SUPABASE" || trustFunnelAggregate.artifact_source === "LOCAL_ARTIFACT"
            ? "Maintain scheduled GA4 trust-funnel artifact refresh and validate dimension setup before relying on slug/trust-state breakdowns."
            : "Connect a GA4 aggregate pull (or weekly export import) into command-center reporting before treating trust-funnel outcomes as bright.",
        status: trustFunnelStatus,
        trust_funnel_aggregate: trustFunnelAggregate,
      },
      {
        neuron_key: "gsc_search_discovery",
        title: "GSC search discovery",
        connection_level: gscConnectionLevel,
        freshness_method: gscFreshnessMethod,
        proven_facts: gscProvenFacts,
        unknown_facts: gscUnknownFacts,
        next_owner_action: gscNextOwnerAction,
        status: gscStatus,
      },
  ];

  const optionalNeurons: OwnerDashboardNeuron[] = [];
  const searchNeuronIncluded = args.searchDemandAndGaps !== undefined;
  const clickNeuronIncluded = args.clickVisibility !== undefined;
  const affiliateNeuronIncluded = args.affiliateReadiness !== undefined;
  const coverageNeuronIncluded = args.ctaCoverageHealth !== undefined;
  const batchNeuronIncluded = args.batchProductionOwnerDecisionsLane !== undefined;
  if (searchNeuronIncluded) {
    optionalNeurons.push(buildSearchDemandAndGapsNeuron(args.searchDemandAndGaps));
  }
  if (clickNeuronIncluded) {
    optionalNeurons.push(buildClickVisibilityNeuron(args.clickVisibility));
  }
  if (affiliateNeuronIncluded) {
    optionalNeurons.push(buildAffiliateReadinessNeuron(args.affiliateReadiness));
  }
  if (coverageNeuronIncluded) {
    optionalNeurons.push(buildCoverageHealthNeuron(args.ctaCoverageHealth));
  }
  if (batchNeuronIncluded) {
    optionalNeurons.push(buildBatchProductionOwnerDecisionsNeuron(args.batchProductionOwnerDecisionsLane));
  }
  const neurons = [...coreNeurons, ...optionalNeurons];

  return {
    data_mutation: false,
    generated_from: [
      "scripts/report-buckparts-command-surface.ts (state_system_metrics + gsc_exports_present)",
      ...(ext ? ["src/lib/owner-dashboard/gsc-external-demand.ts (reconciles gsc_search_discovery)"] : []),
      ...TRUST_FUNNEL_EMITTER_MODULES,
      ...(searchNeuronIncluded
        ? ["owner_search_demand_and_gaps.search_demand_and_gaps (from buildOwnerSearchDemandAndGapsReport; no duplicate DB query)"]
        : []),
      ...(clickNeuronIncluded
        ? ["command_center_v2.revenue_snapshot.click_visibility (read-only click_events snapshot; no duplicate Supabase query)"]
        : []),
      ...(affiliateNeuronIncluded
        ? [
            "command_center_v2.affiliate_readiness + affiliate_readiness_summary (from report-buckparts-command-center; no duplicate tracker scan)",
          ]
        : []),
      ...(coverageNeuronIncluded
        ? [
            "command_center_v2.coverage_health + report-buckparts-command-surface.cta_coverage_metrics (no duplicate retailer_links query)",
          ]
        : []),
      ...(batchNeuronIncluded
        ? ["command_center_v2.batch_production_owner_decisions_lane_v1 (read-only; no neuron registry scan)"]
        : []),
      ...(hasComputableSemanticPublishabilityTruth(args.pagePublishabilityTruth)
        ? [
            "command_center_v2.page_publishability_truth_summary_v1 (semantic PageState/PublishabilityState for refrigerator_filter pages; inventory contract unchanged)",
          ]
        : []),
    ],
    neurons,
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

export type OwnerCommandCenterNeuronsForReportInput = {
  rootDir: string;
  pageState:
    | {
        computable: boolean;
        distribution: Record<string, number> | "UNKNOWN";
        reason: string;
        contract?: "sitemap_artifact_inventory_v1";
        artifact_relative_path?: string;
        url_count?: number;
      }
    | null;
  gscPresence: {
    sitemap_xml: boolean;
    coverage_zip: boolean;
    performance_zip: boolean;
  } | null;
  searchAndClickIntelligenceSummary: SearchAndClickIntelligenceSummaryForNeurons;
  clickVisibility: ClickVisibilitySnapshot | null;
  affiliateReadiness: AffiliateReadinessNeuronInput | null;
  ctaCoverageHealth: CtaCoverageHealthNeuronInput | null;
  batchProductionOwnerDecisionsLane: BatchProductionOwnerDecisionsLaneV1 | null;
  pagePublishabilityTruth?: PagePublishabilityTruthSummaryV1 | null;
};

/** Command Center path: all eight neurons from in-scope CC/command-surface data only. */
export async function buildOwnerCommandCenterNeuronsForReport(
  args: OwnerCommandCenterNeuronsForReportInput,
): Promise<OwnerCommandCenterNeuronsReport> {
  const gscExternalDemand = await buildOwnerGscExternalDemandNeuron({ rootDir: args.rootDir });
  const ga4TrustFunnelAggregate = await loadGa4TrustFunnelAggregateArtifact({ rootDir: args.rootDir });
  const missingEmitterFiles = TRUST_FUNNEL_EMITTER_MODULES.filter(
    (rel) => !existsSync(path.resolve(args.rootDir, rel)),
  );
  const searchDemandAndGaps = buildOwnerSearchDemandAndGapsNeuronFromSummary(
    args.searchAndClickIntelligenceSummary,
  );
  return buildOwnerCommandCenterNeuronsReport({
    rootDir: args.rootDir,
    pageState: args.pageState,
    gscPresence: args.gscPresence,
    gscExternalDemand,
    trustFunnelEmitterContractOverride: {
      all_emitters_present: missingEmitterFiles.length === 0,
      missing_emitter_files: missingEmitterFiles,
    },
    trustFunnelAggregateArtifact: ga4TrustFunnelAggregate.artifact,
    trustFunnelAggregateIssue: ga4TrustFunnelAggregate.issue,
    searchDemandAndGaps,
    clickVisibility: args.clickVisibility,
    affiliateReadiness: args.affiliateReadiness,
    ctaCoverageHealth: args.ctaCoverageHealth,
    batchProductionOwnerDecisionsLane: args.batchProductionOwnerDecisionsLane,
    pagePublishabilityTruth: args.pagePublishabilityTruth ?? null,
  });
}
