/**
 * Read-only Customer Reality scoreboard — aggregates existing Command Center lane outputs only.
 * Does not fetch new data sources, mutate product state, or replace next_best_action.
 *
 * Architecture spec: docs/command-center/BuckParts-COMMAND-CENTER-CUSTOMER-REALITY-ARCHITECTURE-V1.md
 */

import type { AllProductSafeBuyerPathCensusV1 } from "./all-product-safe-buyer-path-census-v1";
import type {
  PublicTrustUnificationBackendContractV1,
  RevenueSnapshotLane,
  RevenueTruthLedgerContractV1,
} from "./buckparts-command-center-v2-types";
import type { BuckpartsCertaintyEngineChecklistLaneV1 } from "./buckparts-certainty-engine-checklist-v1";
import type { DeployLiveSiteMonitorCommandCenterLaneV1 } from "./deploy-live-site-monitor-command-center-lane-v1";
import type { BuckpartsMarketingIntelligenceEngineV1 } from "./buckparts-marketing-intelligence-engine-v1";
import type { MissionFactoryRegistryReportV1 } from "./mission-factory-registry-v1";
import type { RpwfePurchaseOptionRescueOwnerReviewLaneV1 } from "./rpwfe-purchase-option-rescue-owner-review-v1";

export const CUSTOMER_REALITY_SCOREBOARD_CONTRACT_V1 = "customer_reality_scoreboard_v1" as const;

export const CUSTOMER_REALITY_SCOREBOARD_CC_JQ_PATH_V1 =
  ".command_center_v2.customer_reality_scoreboard_v1" as const;

export const CUSTOMER_REALITY_SCOREBOARD_SOURCE_COMMAND_V1 = "npm run buckparts:command-center" as const;

export type CustomerRealityEvidenceBasisV1 = "PROVEN" | "INFERRED" | "UNKNOWN";

export type CustomerRealityRuntimeStatusV1 = "OK" | "ATTENTION" | "CRITICAL" | "UNKNOWN";

export type CustomerRealityMetricStatusV1 = {
  evidence_basis: CustomerRealityEvidenceBasisV1;
  runtime_status: CustomerRealityRuntimeStatusV1;
  summary: string;
  source_lanes: string[];
  proven_facts: string[];
  inferred_facts: string[];
  unknown_facts: string[];
};

export type VerifiedBuyerPathCoverageV1 = CustomerRealityMetricStatusV1 & {
  all_wedge_safe_proven_count: number | "UNKNOWN";
  all_wedge_live_product_page_count: number | "UNKNOWN";
  all_wedge_coverage_percent: number | "UNKNOWN";
  refrigerator_verified_link_coverage: {
    with_safe_path: number | "UNKNOWN";
    total_slugs: number | "UNKNOWN";
    coverage_percent: number | "UNKNOWN";
  };
  classification_counts: Record<string, number> | "UNKNOWN";
};

export type CertaintyVisibilityStatusV1 = CustomerRealityMetricStatusV1 & {
  checklist_item_count: number | "UNKNOWN";
  proven_count: number | "UNKNOWN";
  not_proven_count: number | "UNKNOWN";
  blocked_count: number | "UNKNOWN";
  partial_count: number | "UNKNOWN";
  pass_rate_percent: number | "UNKNOWN";
};

export type WrongPartExposureStatusV1 = CustomerRealityMetricStatusV1 & {
  marketing_high_risk_opportunity_count: number | "UNKNOWN";
  suppressed_trust_page_count: number | "UNKNOWN";
  top_high_risk_opportunity_ids: string[];
};

export type RepairClosureStatusV1 = CustomerRealityMetricStatusV1 & {
  net_rescue_direction: "IMPROVING" | "FLAT" | "DEGRADING" | "UNKNOWN";
  missions_promoted_count: number | "UNKNOWN";
  missions_dispatch_ready_count: number | "UNKNOWN";
  safe_cta_links_delta_7d: number | "UNKNOWN";
  discovery_without_closure_ratio: number | "UNKNOWN" | "INFINITE";
};

export type SearchFailureStatusV1 = CustomerRealityMetricStatusV1 & {
  zero_result_rate_last_30d: number | "UNKNOWN";
  zero_result_count_last_30d: number | "UNKNOWN";
  search_events_last_30d: number | "UNKNOWN";
};

export type SearchGapStatusV1 = CustomerRealityMetricStatusV1 & {
  actionable_open: number | "UNKNOWN";
  actionable_reviewing: number | "UNKNOWN";
  actionable_queued: number | "UNKNOWN";
  actionable_total: number | "UNKNOWN";
};

export type CustomerJourneyCompletionStatusV1 = CustomerRealityMetricStatusV1 & {
  clicks_per_search_event_30d: number | "UNKNOWN";
  click_events_last_30d: number | "UNKNOWN";
  search_events_last_30d: number | "UNKNOWN";
  full_journey_measured: false;
};

export type HighDemandNoBuyStatusV1 = CustomerRealityMetricStatusV1 & {
  certainty_checklist_high_demand_no_buy_status: string | "UNKNOWN";
  rpwfe_customer_visible_problem: boolean | "UNKNOWN";
  rpwfe_public_route: string | "UNKNOWN";
};

export type TrustSurfaceComplianceStatusV1 = CustomerRealityMetricStatusV1 & {
  trust_contract_coverage_status: string | "UNKNOWN";
  proven_signal_count: number | "UNKNOWN";
  missing_signal_count: number | "UNKNOWN";
  live_site_monitor_runtime_status: string | "UNKNOWN";
  route_http_ok: boolean | "UNKNOWN";
};

export type CommissionTruthStatusV1 = CustomerRealityMetricStatusV1 & {
  revenue_ledger_valid_entry_count: number | "UNKNOWN";
  click_events_last_30d: number | "UNKNOWN";
  commission_or_revenue: string | "UNKNOWN";
  clicks_without_commission_entries: boolean | "UNKNOWN";
};

export type CustomerRealityNbaTierV1 = 0 | 1 | 2 | 3 | 4 | 5;

export type RecommendedNextCustomerActionDryRunV1 = {
  evidence_basis: CustomerRealityEvidenceBasisV1;
  tier: CustomerRealityNbaTierV1;
  tier_label:
    | "trust_stop_the_line"
    | "customer_rescue"
    | "search_failure_closure"
    | "repair_in_flight_completion"
    | "controlled_discovery"
    | "expansion_new_wedge";
  action: string;
  blocks_discovery: boolean;
  closure_target_slug: string | null;
  source_lanes: string[];
  why_not_discovery: string | null;
  proven_facts: string[];
  inferred_facts: string[];
  unknown_facts: string[];
  dry_run_only: true;
  replaces_next_best_action: false;
};

export type CustomerRealityScoreboardV1 = {
  contract: typeof CUSTOMER_REALITY_SCOREBOARD_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  mutation_authorized: false;
  recommended_jq_path: typeof CUSTOMER_REALITY_SCOREBOARD_CC_JQ_PATH_V1;
  source_command: typeof CUSTOMER_REALITY_SCOREBOARD_SOURCE_COMMAND_V1;
  generated_at: string;
  verified_buyer_path_coverage: VerifiedBuyerPathCoverageV1;
  certainty_visibility_status: CertaintyVisibilityStatusV1;
  wrong_part_exposure_status: WrongPartExposureStatusV1;
  repair_closure_status: RepairClosureStatusV1;
  search_failure_status: SearchFailureStatusV1;
  search_gap_status: SearchGapStatusV1;
  customer_journey_completion_status: CustomerJourneyCompletionStatusV1;
  high_demand_no_buy_status: HighDemandNoBuyStatusV1;
  trust_surface_compliance_status: TrustSurfaceComplianceStatusV1;
  commission_truth_status: CommissionTruthStatusV1;
  recommended_next_customer_action_dry_run: RecommendedNextCustomerActionDryRunV1;
  proven_facts: string[];
  inferred_facts: string[];
  unknown_facts: string[];
};

export type SearchAndClickIntelligenceSummaryInputV1 = {
  runtime_status: "OK" | "UNKNOWN_DB_UNAVAILABLE" | "UNKNOWN_NOT_QUERIED";
  search_events: {
    last_30d: number | "UNKNOWN";
    zero_result_last_30d: number | "UNKNOWN";
    zero_result_rate_last_30d: number | "UNKNOWN";
  };
  search_gaps_backlog: {
    open: number | "UNKNOWN";
    reviewing: number | "UNKNOWN";
    queued: number | "UNKNOWN";
    total_actionable: number | "UNKNOWN";
  };
  click_events: {
    last_30d: number | "UNKNOWN";
  };
};

export type MoneyFunnelSummaryInputV1 = {
  runtime_status: "OK" | "UNKNOWN_DB_UNAVAILABLE" | "UNKNOWN_NOT_QUERIED";
  derived_rates_30d: {
    clicks_per_search_event: number | "UNKNOWN";
  };
  stages_30d: {
    search_events_total: number | "UNKNOWN";
    click_events_total: number | "UNKNOWN";
  };
};

export type RescueDeltaTrendSummaryInputV1 = {
  runtime_status: "OK" | "UNKNOWN_SNAPSHOT_UNAVAILABLE" | "UNKNOWN_NOT_QUERIED";
  deltas: {
    safe_cta_links_delta: number | "UNKNOWN";
  };
  net_rescue_direction: "IMPROVING" | "FLAT" | "DEGRADING" | "UNKNOWN";
};

export type BuildCustomerRealityScoreboardV1Input = {
  generated_at: string;
  census: AllProductSafeBuyerPathCensusV1 | null | undefined;
  certaintyChecklist: BuckpartsCertaintyEngineChecklistLaneV1 | null | undefined;
  marketingEngine: BuckpartsMarketingIntelligenceEngineV1 | null | undefined;
  missionFactoryRegistry: Pick<MissionFactoryRegistryReportV1, "missions_by_state"> | null | undefined;
  publicTrustContract: PublicTrustUnificationBackendContractV1 | null | undefined;
  revenueLedgerContract: RevenueTruthLedgerContractV1 | null | undefined;
  revenueSnapshot: RevenueSnapshotLane | null | undefined;
  deployLiveSiteMonitor: DeployLiveSiteMonitorCommandCenterLaneV1 | null | undefined;
  rpwfeOwnerReview: RpwfePurchaseOptionRescueOwnerReviewLaneV1 | null | undefined;
  searchAndClickIntelligenceSummary: SearchAndClickIntelligenceSummaryInputV1 | null | undefined;
  moneyFunnelSummary: MoneyFunnelSummaryInputV1 | null | undefined;
  rescueDeltaTrendSummary: RescueDeltaTrendSummaryInputV1 | null | undefined;
};

function metricBase(
  evidence_basis: CustomerRealityEvidenceBasisV1,
  runtime_status: CustomerRealityRuntimeStatusV1,
  summary: string,
  source_lanes: string[],
  proven_facts: string[],
  inferred_facts: string[],
  unknown_facts: string[],
): CustomerRealityMetricStatusV1 {
  return {
    evidence_basis,
    runtime_status,
    summary,
    source_lanes,
    proven_facts,
    inferred_facts,
    unknown_facts,
  };
}

function liveWedgeProductPageCount(census: AllProductSafeBuyerPathCensusV1 | null | undefined): number | "UNKNOWN" {
  if (!census || census.contract !== "all_product_safe_buyer_path_census_v1") return "UNKNOWN";
  const live = census.wedge_coverage.filter(
    (w) => w.vertical_launch_state === "LIVE" && w.product_page_count > 0,
  );
  if (live.length === 0) return 0;
  return live.reduce((sum, w) => sum + w.product_page_count, 0);
}

function buildVerifiedBuyerPathCoverage(input: BuildCustomerRealityScoreboardV1Input): VerifiedBuyerPathCoverageV1 {
  const source_lanes = [
    "all_product_safe_buyer_path_census_v1",
    "buckparts_certainty_engine_checklist_v1",
  ];
  const proven_facts: string[] = [];
  const inferred_facts: string[] = [];
  const unknown_facts: string[] = [];

  const census = input.census;
  const checklist = input.certaintyChecklist;

  let safeProven: number | "UNKNOWN" = "UNKNOWN";
  let livePages: number | "UNKNOWN" = "UNKNOWN";
  let coveragePercent: number | "UNKNOWN" = "UNKNOWN";
  let classification_counts: Record<string, number> | "UNKNOWN" = "UNKNOWN";
  let fridgeCoverage = {
    with_safe_path: "UNKNOWN" as number | "UNKNOWN",
    total_slugs: "UNKNOWN" as number | "UNKNOWN",
    coverage_percent: "UNKNOWN" as number | "UNKNOWN",
  };

  if (census?.contract === "all_product_safe_buyer_path_census_v1") {
    safeProven = census.classification_counts.SAFE_BUYER_PATH_PROVEN ?? 0;
    classification_counts = { ...census.classification_counts };
    livePages = liveWedgeProductPageCount(census);
    if (typeof livePages === "number" && livePages > 0 && typeof safeProven === "number") {
      coveragePercent = Math.round((safeProven / livePages) * 1000) / 10;
      proven_facts.push(
        `PROVEN: all_product_safe_buyer_path_census_v1 — ${String(safeProven)} SAFE_BUYER_PATH_PROVEN across ${String(livePages)} live-wedge product pages (${String(coveragePercent)}%).`,
      );
    }
  } else {
    unknown_facts.push("all_product_safe_buyer_path_census_v1 missing or wrong contract.");
  }

  if (checklist?.contract === "buckparts_certainty_engine_checklist_v1") {
    const vc = checklist.verified_link_coverage;
    fridgeCoverage = {
      with_safe_path: vc.refrigerator_filter_slugs_with_safe_buyer_path,
      total_slugs: vc.refrigerator_filter_slugs_in_catalog,
      coverage_percent: vc.coverage_percent,
    };
    if (vc.source_path !== "UNKNOWN") {
      proven_facts.push(
        `PROVEN: buckparts_certainty_engine_checklist_v1.verified_link_coverage — refrigerator ${String(vc.refrigerator_filter_slugs_with_safe_buyer_path)}/${String(vc.refrigerator_filter_slugs_in_catalog)} (${String(vc.coverage_percent)}%).`,
      );
    }
  } else {
    unknown_facts.push("buckparts_certainty_engine_checklist_v1 missing or wrong contract.");
  }

  let runtime_status: CustomerRealityRuntimeStatusV1 = "UNKNOWN";
  let evidence_basis: CustomerRealityEvidenceBasisV1 = "UNKNOWN";
  if (proven_facts.length > 0) {
    evidence_basis = inferred_facts.length > 0 ? "INFERRED" : "PROVEN";
    if (typeof coveragePercent === "number" && coveragePercent < 50) {
      runtime_status = "CRITICAL";
    } else if (typeof coveragePercent === "number" && coveragePercent < 75) {
      runtime_status = "ATTENTION";
    } else if (typeof coveragePercent === "number") {
      runtime_status = "OK";
    } else {
      runtime_status = "ATTENTION";
    }
  }

  const summary =
    typeof coveragePercent === "number"
      ? `Live-wedge verified buyer-path coverage is ${String(coveragePercent)}% (${String(safeProven)}/${String(livePages)} SAFE_BUYER_PATH_PROVEN).`
      : "Verified buyer-path coverage is not fully computable from attached census lanes.";

  return {
    ...metricBase(evidence_basis, runtime_status, summary, source_lanes, proven_facts, inferred_facts, unknown_facts),
    all_wedge_safe_proven_count: safeProven,
    all_wedge_live_product_page_count: livePages,
    all_wedge_coverage_percent: coveragePercent,
    refrigerator_verified_link_coverage: fridgeCoverage,
    classification_counts,
  };
}

function buildCertaintyVisibilityStatus(input: BuildCustomerRealityScoreboardV1Input): CertaintyVisibilityStatusV1 {
  const source_lanes = ["buckparts_certainty_engine_checklist_v1"];
  const proven_facts: string[] = [];
  const unknown_facts: string[] = [];
  const checklist = input.certaintyChecklist;

  if (checklist?.contract !== "buckparts_certainty_engine_checklist_v1") {
    return {
      ...metricBase(
        "UNKNOWN",
        "UNKNOWN",
        "Certainty visibility pass rate unavailable — checklist lane missing.",
        source_lanes,
        [],
        [],
        ["buckparts_certainty_engine_checklist_v1 not attached."],
      ),
      checklist_item_count: "UNKNOWN",
      proven_count: "UNKNOWN",
      not_proven_count: "UNKNOWN",
      blocked_count: "UNKNOWN",
      partial_count: "UNKNOWN",
      pass_rate_percent: "UNKNOWN",
    };
  }

  const items = checklist.checklist_items;
  const proven_count = items.filter((i) => i.status === "PROVEN").length;
  const not_proven_count = items.filter((i) => i.status === "NOT_PROVEN").length;
  const blocked_count = items.filter((i) => i.status === "BLOCKED").length;
  const partial_count = items.filter((i) => i.status === "PARTIAL").length;
  const pass_rate_percent =
    items.length > 0 ? Math.round((proven_count / items.length) * 1000) / 10 : ("UNKNOWN" as const);

  proven_facts.push(
    `PROVEN: certainty checklist — ${String(proven_count)} PROVEN, ${String(not_proven_count)} NOT_PROVEN, ${String(blocked_count)} BLOCKED, ${String(partial_count)} PARTIAL of ${String(items.length)} items.`,
  );

  let runtime_status: CustomerRealityRuntimeStatusV1 = "OK";
  if (blocked_count > 0 || (typeof pass_rate_percent === "number" && pass_rate_percent < 50)) {
    runtime_status = "CRITICAL";
  } else if (typeof pass_rate_percent === "number" && pass_rate_percent < 75) {
    runtime_status = "ATTENTION";
  }

  return {
    ...metricBase(
      "PROVEN",
      runtime_status,
      `Visible certainty pass rate is ${String(pass_rate_percent)}% (${String(proven_count)}/${String(items.length)} checklist items PROVEN).`,
      source_lanes,
      proven_facts,
      [],
      unknown_facts,
    ),
    checklist_item_count: items.length,
    proven_count,
    not_proven_count,
    blocked_count,
    partial_count,
    pass_rate_percent,
  };
}

function buildWrongPartExposureStatus(input: BuildCustomerRealityScoreboardV1Input): WrongPartExposureStatusV1 {
  const source_lanes = ["marketing_intelligence_engine_v1", "all_product_safe_buyer_path_census_v1"];
  const proven_facts: string[] = [];
  const unknown_facts: string[] = [];

  let highRiskCount: number | "UNKNOWN" = "UNKNOWN";
  let topIds: string[] = [];
  let suppressed = "UNKNOWN" as number | "UNKNOWN";

  if (input.marketingEngine?.contract === "marketing_intelligence_engine_v1") {
    const high = input.marketingEngine.opportunities.filter((o) => o.wrong_part_risk === "HIGH");
    highRiskCount = high.length;
    topIds = high.slice(0, 5).map((o) => o.opportunity_id);
    proven_facts.push(
      `PROVEN: marketing_intelligence_engine_v1 — ${String(highRiskCount)} opportunities with wrong_part_risk=HIGH.`,
    );
  } else {
    unknown_facts.push("marketing_intelligence_engine_v1 not attached.");
  }

  if (input.census?.contract === "all_product_safe_buyer_path_census_v1") {
    suppressed = input.census.classification_counts.SAFE_BUYER_PATH_SUPPRESSED_TRUST ?? 0;
    proven_facts.push(
      `PROVEN: all_product_safe_buyer_path_census_v1 — ${String(suppressed)} pages SAFE_BUYER_PATH_SUPPRESSED_TRUST.`,
    );
  } else {
    unknown_facts.push("all_product_safe_buyer_path_census_v1 not attached for suppressed-trust count.");
  }

  const evidence_basis: CustomerRealityEvidenceBasisV1 =
    proven_facts.length > 0 ? (unknown_facts.length > 0 ? "INFERRED" : "PROVEN") : "UNKNOWN";

  let runtime_status: CustomerRealityRuntimeStatusV1 = "UNKNOWN";
  if (typeof highRiskCount === "number" && highRiskCount > 0) {
    runtime_status = "CRITICAL";
  } else if (typeof suppressed === "number" && suppressed > 50) {
    runtime_status = "ATTENTION";
  } else if (evidence_basis === "PROVEN") {
    runtime_status = "OK";
  }

  return {
    ...metricBase(
      evidence_basis,
      runtime_status,
      typeof highRiskCount === "number"
        ? `${String(highRiskCount)} HIGH wrong-part-risk marketing opportunities; ${String(suppressed)} pages suppressed-trust.`
        : "Wrong-part exposure not fully measurable from attached lanes.",
      source_lanes,
      proven_facts,
      [],
      unknown_facts,
    ),
    marketing_high_risk_opportunity_count: highRiskCount,
    suppressed_trust_page_count: suppressed,
    top_high_risk_opportunity_ids: topIds,
  };
}

function buildRepairClosureStatus(input: BuildCustomerRealityScoreboardV1Input): RepairClosureStatusV1 {
  const source_lanes = ["rescue_delta_trend_summary", "mission_factory_registry_v1"];
  const proven_facts: string[] = [];
  const inferred_facts: string[] = [];
  const unknown_facts: string[] = [];

  let netDirection: RepairClosureStatusV1["net_rescue_direction"] = "UNKNOWN";
  let promoted = "UNKNOWN" as number | "UNKNOWN";
  let dispatchReady = "UNKNOWN" as number | "UNKNOWN";
  let safeDelta = "UNKNOWN" as number | "UNKNOWN";
  let ratio: number | "UNKNOWN" | "INFINITE" = "UNKNOWN";

  const rescue = input.rescueDeltaTrendSummary;
  if (rescue?.runtime_status === "OK") {
    netDirection = rescue.net_rescue_direction;
    safeDelta = rescue.deltas.safe_cta_links_delta;
    proven_facts.push(
      `PROVEN: rescue_delta_trend_summary — net_rescue_direction=${netDirection}, safe_cta_links_delta=${String(safeDelta)}.`,
    );
  } else {
    unknown_facts.push("rescue_delta_trend_summary unavailable or not OK.");
  }

  const mf = input.missionFactoryRegistry;
  if (mf?.missions_by_state) {
    promoted = mf.missions_by_state?.PROMOTED ?? 0;
    dispatchReady = mf.missions_by_state?.DISPATCH_READY ?? 0;
    proven_facts.push(
      `PROVEN: mission_factory_registry_v1 — PROMOTED=${String(promoted)}, DISPATCH_READY=${String(dispatchReady)}.`,
    );
    if (typeof dispatchReady === "number" && dispatchReady > 0 && typeof promoted === "number" && promoted === 0) {
      ratio = "INFINITE";
      inferred_facts.push(
        "INFERRED: discovery-without-closure ratio is infinite — dispatch-ready missions exist with zero promoted.",
      );
    } else if (typeof dispatchReady === "number" && typeof promoted === "number" && promoted > 0) {
      ratio = Math.round((dispatchReady / promoted) * 10) / 10;
    }
  } else {
    unknown_facts.push("mission_factory_registry_v1 not attached.");
  }

  unknown_facts.push("UNKNOWN: unified customer-visible repair closure rate (7d) — no closure_registry lane yet.");

  let runtime_status: CustomerRealityRuntimeStatusV1 = "UNKNOWN";
  if (ratio === "INFINITE" || (typeof promoted === "number" && promoted === 0 && typeof dispatchReady === "number" && dispatchReady > 5)) {
    runtime_status = "CRITICAL";
  } else if (netDirection === "DEGRADING") {
    runtime_status = "ATTENTION";
  } else if (proven_facts.length > 0) {
    runtime_status = netDirection === "IMPROVING" ? "OK" : "ATTENTION";
  }

  return {
    ...metricBase(
      proven_facts.length > 0 ? "INFERRED" : "UNKNOWN",
      runtime_status,
      typeof promoted === "number"
        ? `Repair closure: ${String(promoted)} missions PROMOTED; net rescue ${netDirection}. Unified customer-visible closure rate UNKNOWN.`
        : "Repair closure status not fully measurable.",
      source_lanes,
      proven_facts,
      inferred_facts,
      unknown_facts,
    ),
    net_rescue_direction: netDirection,
    missions_promoted_count: promoted,
    missions_dispatch_ready_count: dispatchReady,
    safe_cta_links_delta_7d: safeDelta,
    discovery_without_closure_ratio: ratio,
  };
}

function buildSearchFailureStatus(input: BuildCustomerRealityScoreboardV1Input): SearchFailureStatusV1 {
  const source_lanes = ["search_and_click_intelligence_summary"];
  const s = input.searchAndClickIntelligenceSummary;

  if (!s || s.runtime_status !== "OK") {
    return {
      ...metricBase(
        "UNKNOWN",
        "UNKNOWN",
        "Search failure rate unavailable.",
        source_lanes,
        [],
        [],
        ["search_and_click_intelligence_summary not OK or missing."],
      ),
      zero_result_rate_last_30d: "UNKNOWN",
      zero_result_count_last_30d: "UNKNOWN",
      search_events_last_30d: "UNKNOWN",
    };
  }

  const rate = s.search_events.zero_result_rate_last_30d;
  const zeroCount = s.search_events.zero_result_last_30d;
  const total = s.search_events.last_30d;
  const proven_facts = [
    `PROVEN: search zero_result_rate_last_30d=${String(rate)} (${String(zeroCount)}/${String(total)} search events).`,
  ];

  let runtime_status: CustomerRealityRuntimeStatusV1 = "OK";
  if (typeof rate === "number" && rate > 0.1) runtime_status = "ATTENTION";
  if (typeof rate === "number" && rate > 0.2) runtime_status = "CRITICAL";

  return {
    ...metricBase(
      "PROVEN",
      runtime_status,
      `On-site search zero-result rate (30d) is ${typeof rate === "number" ? `${String(Math.round(rate * 1000) / 10)}%` : "UNKNOWN"}.`,
      source_lanes,
      proven_facts,
      [],
      [],
    ),
    zero_result_rate_last_30d: rate,
    zero_result_count_last_30d: zeroCount,
    search_events_last_30d: total,
  };
}

function buildSearchGapStatus(input: BuildCustomerRealityScoreboardV1Input): SearchGapStatusV1 {
  const source_lanes = ["search_and_click_intelligence_summary"];
  const s = input.searchAndClickIntelligenceSummary;

  if (!s || s.runtime_status !== "OK") {
    return {
      ...metricBase("UNKNOWN", "UNKNOWN", "Search gap backlog unavailable.", source_lanes, [], [], [
        "search_and_click_intelligence_summary not OK or missing.",
      ]),
      actionable_open: "UNKNOWN",
      actionable_reviewing: "UNKNOWN",
      actionable_queued: "UNKNOWN",
      actionable_total: "UNKNOWN",
    };
  }

  const gaps = s.search_gaps_backlog;
  const proven_facts = [
    `PROVEN: search_gaps_backlog — open=${String(gaps.open)}, total_actionable=${String(gaps.total_actionable)}.`,
  ];

  let runtime_status: CustomerRealityRuntimeStatusV1 = "OK";
  if (typeof gaps.total_actionable === "number" && gaps.total_actionable > 0) runtime_status = "ATTENTION";
  if (typeof gaps.total_actionable === "number" && gaps.total_actionable > 10) runtime_status = "CRITICAL";

  return {
    ...metricBase(
      "PROVEN",
      runtime_status,
      `${String(gaps.total_actionable)} actionable search gaps (${String(gaps.open)} open).`,
      source_lanes,
      proven_facts,
      [],
      [],
    ),
    actionable_open: gaps.open,
    actionable_reviewing: gaps.reviewing,
    actionable_queued: gaps.queued,
    actionable_total: gaps.total_actionable,
  };
}

function buildCustomerJourneyCompletionStatus(
  input: BuildCustomerRealityScoreboardV1Input,
): CustomerJourneyCompletionStatusV1 {
  const source_lanes = ["money_funnel_summary", "search_and_click_intelligence_summary"];
  const funnel = input.moneyFunnelSummary;
  const search = input.searchAndClickIntelligenceSummary;

  const unknown_facts = [
    "UNKNOWN: full customer journey (search → model → filter → certainty read → safe click) is not measured as a single funnel in-repo.",
  ];

  if (!funnel || funnel.runtime_status !== "OK") {
    return {
      ...metricBase(
        "UNKNOWN",
        "UNKNOWN",
        "Customer journey completion proxy unavailable.",
        source_lanes,
        [],
        [],
        [...unknown_facts, "money_funnel_summary not OK or missing."],
      ),
      clicks_per_search_event_30d: "UNKNOWN",
      click_events_last_30d: "UNKNOWN",
      search_events_last_30d: "UNKNOWN",
      full_journey_measured: false,
    };
  }

  const clicksPerSearch = funnel.derived_rates_30d.clicks_per_search_event;
  const clicks = funnel.stages_30d.click_events_total;
  const searches = funnel.stages_30d.search_events_total;

  const inferred_facts = [
    `INFERRED: clicks_per_search_event_30d=${String(clicksPerSearch)} is a coarse proxy only — not journey completion proof.`,
  ];

  return {
    ...metricBase(
      "INFERRED",
      "ATTENTION",
      "Customer journey completion is not directly measured; clicks-per-search is a coarse proxy.",
      source_lanes,
      [],
      inferred_facts,
      unknown_facts,
    ),
    clicks_per_search_event_30d: clicksPerSearch,
    click_events_last_30d: clicks,
    search_events_last_30d: searches,
    full_journey_measured: false,
  };
}

function buildHighDemandNoBuyStatus(input: BuildCustomerRealityScoreboardV1Input): HighDemandNoBuyStatusV1 {
  const source_lanes = [
    "buckparts_certainty_engine_checklist_v1",
    "rpwfe_purchase_option_rescue_owner_review_v1",
  ];
  const proven_facts: string[] = [];
  const unknown_facts: string[] = [];

  let checklistStatus: string | "UNKNOWN" = "UNKNOWN";
  const checklist = input.certaintyChecklist;
  if (checklist?.contract === "buckparts_certainty_engine_checklist_v1") {
    const item = checklist.checklist_items.find((i) => i.id === "high_demand_no_buy_emergency_lane");
    checklistStatus = item?.status ?? "UNKNOWN";
    if (item) {
      proven_facts.push(`PROVEN: certainty checklist high_demand_no_buy_emergency_lane status=${item.status}.`);
    }
  } else {
    unknown_facts.push("buckparts_certainty_engine_checklist_v1 not attached.");
  }

  let rpwfeProblem: boolean | "UNKNOWN" = "UNKNOWN";
  let rpwfeRoute: string | "UNKNOWN" = "UNKNOWN";
  const rpwfe = input.rpwfeOwnerReview;
  if (rpwfe?.contract === "rpwfe_purchase_option_rescue_owner_review_v1") {
    rpwfeProblem = rpwfe.customer_visible_problem ?? "UNKNOWN";
    rpwfeRoute = rpwfe.public_route ?? "/filter/rpwfe";
    proven_facts.push(
      `PROVEN: rpwfe_purchase_option_rescue_owner_review_v1 — customer_visible_problem=${String(rpwfeProblem)}.`,
    );
  } else {
    unknown_facts.push("rpwfe_purchase_option_rescue_owner_review_v1 not attached.");
  }

  let runtime_status: CustomerRealityRuntimeStatusV1 = "UNKNOWN";
  if (checklistStatus === "BLOCKED" || rpwfeProblem === true) {
    runtime_status = "CRITICAL";
  } else if (checklistStatus === "NOT_PROVEN") {
    runtime_status = "ATTENTION";
  } else if (proven_facts.length > 0) {
    runtime_status = "OK";
  }

  return {
    ...metricBase(
      proven_facts.length > 0 ? "PROVEN" : "UNKNOWN",
      runtime_status,
      checklistStatus === "BLOCKED"
        ? "High-demand / no-buy emergency lane is BLOCKED on certainty checklist."
        : "High-demand / no-buy emergency posture requires checklist + RPWFE lane review.",
      source_lanes,
      proven_facts,
      [],
      unknown_facts,
    ),
    certainty_checklist_high_demand_no_buy_status: checklistStatus,
    rpwfe_customer_visible_problem: rpwfeProblem,
    rpwfe_public_route: rpwfeRoute,
  };
}

function buildTrustSurfaceComplianceStatus(input: BuildCustomerRealityScoreboardV1Input): TrustSurfaceComplianceStatusV1 {
  const source_lanes = [
    "public_trust_unification_backend_contract_v1",
    "deploy_live_site_monitor_v1",
  ];
  const proven_facts: string[] = [];
  const unknown_facts: string[] = [];

  let coverageStatus: string | "UNKNOWN" = "UNKNOWN";
  let provenSignals = "UNKNOWN" as number | "UNKNOWN";
  let missingSignals = "UNKNOWN" as number | "UNKNOWN";

  const trust = input.publicTrustContract;
  if (trust?.contract === "public_trust_unification_backend_contract_v1") {
    coverageStatus = trust.coverage_status;
    provenSignals = trust.proven_signal_count;
    missingSignals = trust.missing_signal_count;
    proven_facts.push(
      `PROVEN: public_trust_unification_backend_contract_v1 — coverage_status=${coverageStatus}, proven_signal_count=${String(provenSignals)}, missing_signal_count=${String(missingSignals)}.`,
    );
  } else {
    unknown_facts.push("public_trust_unification_backend_contract_v1 not attached.");
  }

  let monitorStatus: string | "UNKNOWN" = "UNKNOWN";
  let routeOk: boolean | "UNKNOWN" = "UNKNOWN";
  const deploy = input.deployLiveSiteMonitor;
  if (deploy?.contract === "deploy_live_site_monitor_v1") {
    monitorStatus = deploy.inspect_summary.runtime_status;
    const routes = deploy.inspect_summary.route_http_status;
    if (routes === "OK") {
      routeOk = true;
    } else if (routes === "ATTENTION" || routes === "UNKNOWN_CONFIG") {
      routeOk = false;
    }
    proven_facts.push(
      `PROVEN: deploy_live_site_monitor_v1 — runtime_status=${monitorStatus}, route_http_status=${String(routes)}.`,
    );
  } else {
    unknown_facts.push("deploy_live_site_monitor_v1 not attached.");
  }

  let runtime_status: CustomerRealityRuntimeStatusV1 = "UNKNOWN";
  if (typeof missingSignals === "number" && missingSignals > 0) runtime_status = "ATTENTION";
  if (routeOk === false) runtime_status = "CRITICAL";
  if (coverageStatus === "PROVEN" && (missingSignals === 0 || missingSignals === "UNKNOWN") && routeOk !== false) {
    runtime_status = "OK";
  }

  return {
    ...metricBase(
      proven_facts.length > 0 ? "PROVEN" : "UNKNOWN",
      runtime_status,
      `Trust contract coverage_status=${coverageStatus}; live-site monitor ${monitorStatus}.`,
      source_lanes,
      proven_facts,
      [],
      unknown_facts,
    ),
    trust_contract_coverage_status: coverageStatus,
    proven_signal_count: provenSignals,
    missing_signal_count: missingSignals,
    live_site_monitor_runtime_status: monitorStatus,
    route_http_ok: routeOk,
  };
}

function buildCommissionTruthStatus(input: BuildCustomerRealityScoreboardV1Input): CommissionTruthStatusV1 {
  const source_lanes = ["revenue_truth_ledger_contract_v1", "revenue_snapshot"];
  const proven_facts: string[] = [];
  const unknown_facts: string[] = [];

  let validEntries = "UNKNOWN" as number | "UNKNOWN";
  const ledger = input.revenueLedgerContract;
  if (ledger?.contract === "revenue_truth_ledger_contract_v1") {
    validEntries = ledger.valid_entry_count;
    proven_facts.push(`PROVEN: revenue_truth_ledger_contract_v1 — valid_entry_count=${String(validEntries)}.`);
  } else {
    unknown_facts.push("revenue_truth_ledger_contract_v1 not attached.");
  }

  let clicks30d = "UNKNOWN" as number | "UNKNOWN";
  let commissionStatus = "UNKNOWN";
  const rev = input.revenueSnapshot;
  if (rev?.click_visibility) {
    clicks30d = rev.click_visibility.last_30_days_clicks ?? "UNKNOWN";
    commissionStatus = rev.click_visibility.commission_or_revenue ?? "UNKNOWN";
    proven_facts.push(
      `PROVEN: revenue_snapshot.click_visibility — last_30_days_clicks=${String(clicks30d)}, commission_or_revenue=${commissionStatus}.`,
    );
  } else {
    unknown_facts.push("revenue_snapshot.click_visibility not attached.");
  }

  const clicksWithoutCommission =
    typeof validEntries === "number" &&
    validEntries === 0 &&
    typeof clicks30d === "number" &&
    clicks30d > 0
      ? true
      : typeof validEntries === "number" && validEntries > 0
        ? false
        : ("UNKNOWN" as const);

  let runtime_status: CustomerRealityRuntimeStatusV1 = "UNKNOWN";
  if (clicksWithoutCommission === true) runtime_status = "CRITICAL";
  else if (typeof validEntries === "number" && validEntries > 0) runtime_status = "OK";
  else if (proven_facts.length > 0) runtime_status = "ATTENTION";

  return {
    ...metricBase(
      proven_facts.length > 0 ? "PROVEN" : "UNKNOWN",
      runtime_status,
      clicksWithoutCommission === true
        ? `${String(clicks30d)} clicks (30d) with zero revenue ledger entries — commission truth not connected.`
        : `Revenue ledger valid_entry_count=${String(validEntries)}.`,
      source_lanes,
      proven_facts,
      [],
      unknown_facts,
    ),
    revenue_ledger_valid_entry_count: validEntries,
    click_events_last_30d: clicks30d,
    commission_or_revenue: commissionStatus,
    clicks_without_commission_entries: clicksWithoutCommission,
  };
}

function buildRecommendedNextCustomerActionDryRun(
  input: BuildCustomerRealityScoreboardV1Input,
  wrongPart: WrongPartExposureStatusV1,
  certainty: CertaintyVisibilityStatusV1,
  census: VerifiedBuyerPathCoverageV1,
  searchGaps: SearchGapStatusV1,
  repair: RepairClosureStatusV1,
): RecommendedNextCustomerActionDryRunV1 {
  const proven_facts: string[] = [];
  const inferred_facts: string[] = [
    "INFERRED: recommended_next_customer_action_dry_run applies architecture spec tier stack — does not replace next_best_action.",
  ];
  const unknown_facts: string[] = [];

  const highRisk =
    typeof wrongPart.marketing_high_risk_opportunity_count === "number" &&
    wrongPart.marketing_high_risk_opportunity_count > 0;
  const certaintyBlocked =
    typeof certainty.blocked_count === "number" && certainty.blocked_count > 0;

  if (highRisk || certaintyBlocked) {
    const topOpp = wrongPart.top_high_risk_opportunity_ids[0] ?? null;
    proven_facts.push("PROVEN: Tier 0 — trust stop-the-line triggered by HIGH wrong_part_risk and/or BLOCKED certainty checklist items.");
    return {
      evidence_basis: "PROVEN",
      tier: 0,
      tier_label: "trust_stop_the_line",
      action: highRisk
        ? `TRUST STOP-THE-LINE: Resolve HIGH wrong-part-risk exposure before discovery (top opportunity: ${topOpp ?? "see marketing_intelligence_engine_v1"}).`
        : "TRUST STOP-THE-LINE: Resolve BLOCKED certainty checklist items before discovery.",
      blocks_discovery: true,
      closure_target_slug: null,
      source_lanes: ["marketing_intelligence_engine_v1", "buckparts_certainty_engine_checklist_v1"],
      why_not_discovery: "Tier 0 trust exposure outranks Mission Factory dispatch.",
      proven_facts,
      inferred_facts,
      unknown_facts,
      dry_run_only: true,
      replaces_next_best_action: false,
    };
  }

  const topRescue = input.census?.top_20_rescue_queue?.[0];
  if (topRescue) {
    proven_facts.push(
      `PROVEN: Tier 1 — top rescue slug ${topRescue.slug} (rescue_priority_score=${String(topRescue.rescue_priority_score)}).`,
    );
    return {
      evidence_basis: "PROVEN",
      tier: 1,
      tier_label: "customer_rescue",
      action: `CUSTOMER RESCUE: ${topRescue.recommended_next_safe_action}`,
      blocks_discovery:
        repair.discovery_without_closure_ratio === "INFINITE" ||
        (typeof repair.missions_promoted_count === "number" && repair.missions_promoted_count === 0),
      closure_target_slug: topRescue.slug,
      source_lanes: ["all_product_safe_buyer_path_census_v1"],
      why_not_discovery:
        repair.discovery_without_closure_ratio === "INFINITE"
          ? "Zero PROMOTED missions — repair must outrank new discovery dispatch."
          : null,
      proven_facts,
      inferred_facts,
      unknown_facts,
      dry_run_only: true,
      replaces_next_best_action: false,
    };
  }

  if (
    typeof searchGaps.actionable_total === "number" &&
    searchGaps.actionable_total > 0
  ) {
    return {
      evidence_basis: "PROVEN",
      tier: 2,
      tier_label: "search_failure_closure",
      action: `SEARCH GAP CLOSURE: Close ${String(searchGaps.actionable_total)} actionable search gaps (${String(searchGaps.actionable_open)} open).`,
      blocks_discovery: false,
      closure_target_slug: null,
      source_lanes: ["search_and_click_intelligence_summary"],
      why_not_discovery: null,
      proven_facts: [
        `PROVEN: ${String(searchGaps.actionable_total)} actionable search gaps remain.`,
      ],
      inferred_facts,
      unknown_facts,
      dry_run_only: true,
      replaces_next_best_action: false,
    };
  }

  if (
    typeof census.all_wedge_coverage_percent === "number" &&
    census.all_wedge_coverage_percent < 50
  ) {
    return {
      evidence_basis: "INFERRED",
      tier: 1,
      tier_label: "customer_rescue",
      action: `CUSTOMER RESCUE: Raise verified buyer-path coverage from ${String(census.all_wedge_coverage_percent)}% — census rescue queue empty but coverage below 50%.`,
      blocks_discovery: true,
      closure_target_slug: null,
      source_lanes: ["all_product_safe_buyer_path_census_v1", "buckparts_certainty_engine_checklist_v1"],
      why_not_discovery: "Verified path coverage below 50% — discovery deprioritized.",
      proven_facts: [],
      inferred_facts: [
        ...inferred_facts,
        `INFERRED: coverage ${String(census.all_wedge_coverage_percent)}% triggers rescue priority without a ranked slug.`,
      ],
      unknown_facts,
      dry_run_only: true,
      replaces_next_best_action: false,
    };
  }

  return {
    evidence_basis: "INFERRED",
    tier: 4,
    tier_label: "controlled_discovery",
    action: "CONTROLLED DISCOVERY: No Tier 0–2 customer rescue signal dominates — factory steering may proceed (dry-run only).",
    blocks_discovery: false,
    closure_target_slug: null,
    source_lanes: ["mission_factory_registry_v1"],
    why_not_discovery: null,
    proven_facts: [],
    inferred_facts,
    unknown_facts: ["UNKNOWN: repair-in-flight and expansion tiers not fully evaluated in dry-run v1."],
    dry_run_only: true,
    replaces_next_best_action: false,
  };
}

/**
 * Build read-only customer reality scoreboard from existing Command Center lane outputs.
 */
export function buildCustomerRealityScoreboardV1(
  input: BuildCustomerRealityScoreboardV1Input,
): CustomerRealityScoreboardV1 {
  const verified_buyer_path_coverage = buildVerifiedBuyerPathCoverage(input);
  const certainty_visibility_status = buildCertaintyVisibilityStatus(input);
  const wrong_part_exposure_status = buildWrongPartExposureStatus(input);
  const repair_closure_status = buildRepairClosureStatus(input);
  const search_failure_status = buildSearchFailureStatus(input);
  const search_gap_status = buildSearchGapStatus(input);
  const customer_journey_completion_status = buildCustomerJourneyCompletionStatus(input);
  const high_demand_no_buy_status = buildHighDemandNoBuyStatus(input);
  const trust_surface_compliance_status = buildTrustSurfaceComplianceStatus(input);
  const commission_truth_status = buildCommissionTruthStatus(input);

  const recommended_next_customer_action_dry_run = buildRecommendedNextCustomerActionDryRun(
    input,
    wrong_part_exposure_status,
    certainty_visibility_status,
    verified_buyer_path_coverage,
    search_gap_status,
    repair_closure_status,
  );

  const proven_facts = [
    "PROVEN: customer_reality_scoreboard_v1 is read-only; aggregates existing Command Center lanes only.",
    "PROVEN: does not replace next_best_action; recommended_next_customer_action_dry_run is dry_run_only.",
    ...verified_buyer_path_coverage.proven_facts.slice(0, 1),
    ...certainty_visibility_status.proven_facts.slice(0, 1),
  ].filter(Boolean);

  const inferred_facts = [
    "INFERRED: Customer Maturity Score composite is not computed in slice 1 — per-metric status only.",
    ...customer_journey_completion_status.inferred_facts,
    ...recommended_next_customer_action_dry_run.inferred_facts,
  ];

  const unknown_facts = [
    "UNKNOWN: pages_upgraded_this_week — no closure_registry lane in slice 1.",
    ...repair_closure_status.unknown_facts.filter((u) => u.startsWith("UNKNOWN:")),
  ];

  return {
    contract: CUSTOMER_REALITY_SCOREBOARD_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    recommended_jq_path: CUSTOMER_REALITY_SCOREBOARD_CC_JQ_PATH_V1,
    source_command: CUSTOMER_REALITY_SCOREBOARD_SOURCE_COMMAND_V1,
    generated_at: input.generated_at,
    verified_buyer_path_coverage,
    certainty_visibility_status,
    wrong_part_exposure_status,
    repair_closure_status,
    search_failure_status,
    search_gap_status,
    customer_journey_completion_status,
    high_demand_no_buy_status,
    trust_surface_compliance_status,
    commission_truth_status,
    recommended_next_customer_action_dry_run,
    proven_facts,
    inferred_facts,
    unknown_facts,
  };
}
