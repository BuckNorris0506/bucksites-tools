import assert from "node:assert/strict";
import test from "node:test";

import type { CustomerClosureReportV1 } from "./customer-closure-report-v1";
import type { CustomerSteeringComparisonV1 } from "./customer-steering-comparison-v1";
import type { CustomerRealityScoreboardV1 } from "./customer-reality-scoreboard-v1";
import type { CommandCenterControlGraphRollupV1 } from "./command-center-control-graph-rollup-v1";
import {
  buildCustomerAuthorityScoreV1,
  calculateCustomerAuthorityScore100V1,
  CUSTOMER_AUTHORITY_SCORE_CONTRACT_V1,
} from "./customer-authority-score-v1";

const GENERATED_AT = "2026-06-10T12:00:00.000Z";
const FACTORY_NBA = "DEMAND-TO-COVERAGE [START_NEW_DEMAND_SELECTED_BATCH]: air_purifier planning.";

function metricBase() {
  return {
    evidence_basis: "PROVEN" as const,
    runtime_status: "CRITICAL" as const,
    summary: "metric summary",
    source_lanes: [],
    proven_facts: [],
    inferred_facts: [],
    unknown_facts: [],
  };
}

function dryRun(
  overrides: Partial<CustomerRealityScoreboardV1["recommended_next_customer_action_dry_run"]> = {},
) {
  return {
    evidence_basis: "PROVEN" as const,
    tier: 0 as const,
    tier_label: "trust_stop_the_line" as const,
    action: "TRUST STOP-THE-LINE: Resolve HIGH wrong-part-risk exposure.",
    blocks_discovery: true,
    closure_target_slug: null,
    source_lanes: [],
    why_not_discovery: "Tier 0 trust exposure outranks Mission Factory dispatch.",
    proven_facts: [],
    inferred_facts: [],
    unknown_facts: [],
    dry_run_only: true as const,
    replaces_next_best_action: false as const,
    ...overrides,
  };
}

function scoreboard(
  dry = dryRun(),
  overrides: Partial<CustomerRealityScoreboardV1> = {},
): CustomerRealityScoreboardV1 {
  return {
    contract: "customer_reality_scoreboard_v1",
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    recommended_jq_path: ".command_center_v2.customer_reality_scoreboard_v1",
    source_command: "npm run buckparts:command-center",
    generated_at: GENERATED_AT,
    verified_buyer_path_coverage: {
      ...metricBase(),
      all_wedge_safe_proven_count: 23,
      all_wedge_live_product_page_count: 100,
      all_wedge_coverage_percent: 50,
      classification_counts: {},
      refrigerator_verified_link_coverage: {
        with_safe_path: 13,
        total_slugs: 57,
        coverage_percent: 22.8,
      },
    },
    certainty_visibility_status: {
      ...metricBase(),
      checklist_item_count: 37,
      proven_count: 10,
      not_proven_count: 20,
      blocked_count: 2,
      partial_count: 5,
      pass_rate_percent: 27,
    },
    wrong_part_exposure_status: {
      ...metricBase(),
      marketing_high_risk_opportunity_count: 3,
      suppressed_trust_page_count: 91,
      top_high_risk_opportunity_ids: ["opp-1"],
    },
    repair_closure_status: {
      ...metricBase(),
      net_rescue_direction: "UNKNOWN",
      missions_promoted_count: 0,
      missions_dispatch_ready_count: 14,
      safe_cta_links_delta_7d: "UNKNOWN",
      discovery_without_closure_ratio: "INFINITE",
    },
    search_failure_status: {
      ...metricBase(),
      zero_result_rate_last_30d: 6.2,
      zero_result_count_last_30d: 10,
      search_events_last_30d: 160,
    },
    search_gap_status: {
      ...metricBase(),
      actionable_open: 4,
      actionable_reviewing: 0,
      actionable_queued: 0,
      actionable_total: 4,
    },
    customer_journey_completion_status: {
      ...metricBase(),
      clicks_per_search_event_30d: "UNKNOWN",
      click_events_last_30d: 242,
      search_events_last_30d: 160,
      full_journey_measured: false,
    },
    high_demand_no_buy_status: {
      ...metricBase(),
      certainty_checklist_high_demand_no_buy_status: "ATTENTION",
      rpwfe_customer_visible_problem: false,
      rpwfe_public_route: "/filters/rpwfe",
    },
    trust_surface_compliance_status: {
      ...metricBase(),
      trust_contract_coverage_status: "PARTIAL",
      proven_signal_count: 5,
      missing_signal_count: 3,
      live_site_monitor_runtime_status: "OK",
      route_http_ok: true,
    },
    commission_truth_status: {
      ...metricBase(),
      revenue_ledger_valid_entry_count: 0,
      click_events_last_30d: 242,
      commission_or_revenue: "NOT_CONNECTED",
      clicks_without_commission_entries: true,
    },
    recommended_next_customer_action_dry_run: dry,
    proven_facts: [],
    inferred_facts: [],
    unknown_facts: [],
    ...overrides,
  };
}

function steering(
  overrides: Partial<CustomerSteeringComparisonV1["comparison"]> = {},
): CustomerSteeringComparisonV1 {
  return {
    contract: "customer_steering_comparison_v1",
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    recommended_jq_path: ".command_center_v2.customer_steering_comparison_v1",
    source_command: "npm run buckparts:command-center",
    generated_at: GENERATED_AT,
    next_customer_action_dry_run: dryRun(),
    factory_steering: {
      next_best_action: FACTORY_NBA,
      why_this_action: "Factory batch planning.",
      steering_override_source: "demand_to_coverage",
    },
    comparison: {
      conflicts_with_next_best_action: true,
      customer_tier: 0,
      factory_action_prefix: "DEMAND-TO-COVERAGE...",
      why_factory_differs: "Tier 0 trust exposure outranks Mission Factory dispatch.",
      blocks_discovery: true,
      recommended_primary_for_founder_review: "customer",
      ...overrides,
    },
    source_lanes: [],
    proven_facts: [],
    inferred_facts: [],
    unknown_facts: [],
    dry_run_only: true,
    replaces_next_best_action: false,
  };
}

function closure(count = 0): CustomerClosureReportV1 {
  return {
    contract: "customer_closure_report_v1",
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    recommended_jq_path: ".command_center_v2.customer_closure_report_v1",
    source_command: "npm run buckparts:command-center",
    generated_at: GENERATED_AT,
    customer_visible_closures_count: count,
    promoted_missions_count: 0,
    closure_candidates_count: 23,
    pages_upgraded_this_week_status: {
      status: "UNKNOWN",
      count: "UNKNOWN",
      summary: "No 7d proof.",
    },
    discovery_without_closure_ratio: "INFINITE",
    closure_confidence: count > 0 ? "PROVEN" : "UNKNOWN",
    customer_visible_shipments: [],
    source_lanes: [],
    proven_facts: [],
    inferred_facts: [],
    unknown_facts: [],
  };
}

function controlGraph(nba: string): CommandCenterControlGraphRollupV1 {
  return {
    contract: "command_center_control_graph_rollup_v1",
    read_only: true,
    data_mutation: false,
    mutation_blocked_until_owner_approval: true,
    mutation_authorized: false,
    generated_at: GENERATED_AT,
    recommended_jq_path: ".command_center_v2.command_center_control_graph_rollup_v1",
    dangerous_mapping_summary: {} as CommandCenterControlGraphRollupV1["dangerous_mapping_summary"],
    learned_failure_guard_summary: {} as CommandCenterControlGraphRollupV1["learned_failure_guard_summary"],
    anchor_integrity_summary: {} as CommandCenterControlGraphRollupV1["anchor_integrity_summary"],
    frozen_family_summary: {} as CommandCenterControlGraphRollupV1["frozen_family_summary"],
    evidence_leverage_summary: {} as CommandCenterControlGraphRollupV1["evidence_leverage_summary"],
    pre_research_risk_screen_summary:
      {} as CommandCenterControlGraphRollupV1["pre_research_risk_screen_summary"],
    page_factory_quality_summary:
      {} as CommandCenterControlGraphRollupV1["page_factory_quality_summary"],
    education_opportunity_summary: null,
    next_best_action: nba,
    next_best_action_ranked: [],
    exact_repo_paths_read: [],
    proven_facts: [],
    unknown_facts: [],
  };
}

test("missing lanes yield UNKNOWN authority_score_100", () => {
  const lane = buildCustomerAuthorityScoreV1({
    generated_at: GENERATED_AT,
    scoreboard: null,
    steering: steering(),
    closure: closure(),
    controlGraphRollup: null,
    root_next_best_action: FACTORY_NBA,
  });

  assert.equal(lane.contract, CUSTOMER_AUTHORITY_SCORE_CONTRACT_V1);
  assert.equal(lane.authority_score_100, "UNKNOWN");
  assert.equal(lane.evidence_basis, "UNKNOWN");
  assert.equal(lane.replaces_next_best_action, false);
  assert.equal(lane.retrospective.trend_measurable, false);
  assert.equal(lane.retrospective.steering_history_logged, false);
  assert.equal(lane.retrospective.closure_registry_present, false);
  assert.ok(lane.unknown_facts.some((f) => /missing/i.test(f)));
});

test("tier 0 + blocks_discovery activates authority and scores point-in-time", () => {
  const lane = buildCustomerAuthorityScoreV1({
    generated_at: GENERATED_AT,
    scoreboard: scoreboard(),
    steering: steering(),
    closure: closure(0),
    controlGraphRollup: controlGraph("CONTROL GRAPH: freeze tier"),
    root_next_best_action: FACTORY_NBA,
  });

  assert.equal(lane.authority_mode, "AUTHORITY_GATED_ACTIVE");
  assert.equal(lane.authority_claim_permitted, true);
  assert.equal(typeof lane.authority_score_100, "number");
  assert.equal(lane.replaces_next_best_action, false);
  assert.equal(lane.components.factory_steering.control_graph_nba_differs, true);
  assert.equal(lane.components.wrong_part_exposure.reduction_measurable, false);
  assert.equal(lane.retrospective.point_in_time_measurable, true);
  assert.ok(lane.retrospective.missing_for_full_retrospective.length > 0);
});

test("calculateCustomerAuthorityScore100V1 adds closure and coverage components", () => {
  const score = calculateCustomerAuthorityScore100V1({
    authority_claim_permitted: true,
    scoreboard: scoreboard(dryRun({ tier: 4, tier_label: "controlled_discovery", blocks_discovery: false }), {
      verified_buyer_path_coverage: {
        ...metricBase(),
        all_wedge_safe_proven_count: 80,
        all_wedge_live_product_page_count: 100,
        all_wedge_coverage_percent: 80,
        classification_counts: {},
        refrigerator_verified_link_coverage: {
          with_safe_path: 40,
          total_slugs: 57,
          coverage_percent: 70,
        },
      },
      wrong_part_exposure_status: {
        ...metricBase(),
        marketing_high_risk_opportunity_count: 0,
        suppressed_trust_page_count: 10,
        top_high_risk_opportunity_ids: [],
      },
    }),
    steering: steering({
      customer_tier: 2,
      blocks_discovery: false,
      conflicts_with_next_best_action: false,
      recommended_primary_for_founder_review: "factory",
    }),
    closure: closure(2),
  });

  assert.equal(score, 96);
});

test("lane never replaces next_best_action", () => {
  const lane = buildCustomerAuthorityScoreV1({
    generated_at: GENERATED_AT,
    scoreboard: scoreboard(),
    steering: steering(),
    closure: closure(),
    controlGraphRollup: null,
    root_next_best_action: FACTORY_NBA,
  });

  assert.equal(lane.replaces_next_best_action, false);
  assert.ok(lane.proven_facts.some((f) => /replaces_next_best_action=false/.test(f)));
});
