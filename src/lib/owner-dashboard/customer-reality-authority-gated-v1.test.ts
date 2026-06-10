import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { CustomerClosureReportV1 } from "../../../scripts/lib/customer-closure-report-v1";
import type { CustomerSteeringComparisonV1 } from "../../../scripts/lib/customer-steering-comparison-v1";
import type { CustomerRealityScoreboardV1 } from "../../../scripts/lib/customer-reality-scoreboard-v1";
import {
  buildCustomerRealityAuthorityGatedModelV1,
  closureEvidenceSupportsAuthorityV1,
  deriveCustomerRealityAuthorityModeV1,
} from "./customer-reality-authority-gated-v1";

const FACTORY_NBA = "DEMAND-TO-COVERAGE [START_NEW_DEMAND_SELECTED_BATCH]: air_purifier planning.";

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

function scoreboard(
  dry = dryRun(),
): CustomerRealityScoreboardV1 {
  return {
    contract: "customer_reality_scoreboard_v1",
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    recommended_jq_path: ".command_center_v2.customer_reality_scoreboard_v1",
    source_command: "npm run buckparts:command-center",
    generated_at: "2026-06-10T12:00:00.000Z",
    verified_buyer_path_coverage: {
      ...metricBase(),
      all_wedge_safe_proven_count: 23,
      all_wedge_live_product_page_count: 100,
      all_wedge_coverage_percent: 23,
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
    generated_at: "2026-06-10T12:00:00.000Z",
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

function closure(count = 12): CustomerClosureReportV1 {
  return {
    contract: "customer_closure_report_v1",
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    recommended_jq_path: ".command_center_v2.customer_closure_report_v1",
    source_command: "npm run buckparts:command-center",
    generated_at: "2026-06-10T12:00:00.000Z",
    customer_visible_closures_count: count,
    promoted_missions_count: 0,
    closure_candidates_count: 23,
    pages_upgraded_this_week_status: {
      status: "UNKNOWN",
      count: "UNKNOWN",
      summary: "No 7d proof.",
    },
    discovery_without_closure_ratio: "INFINITE",
    closure_confidence: "PROVEN",
    customer_visible_shipments: [],
    source_lanes: [],
    proven_facts: [],
    inferred_facts: [],
    unknown_facts: [],
  };
}

describe("customer-reality-authority-gated-v1", () => {
  it("tier 0 + blocks_discovery activates authority without requiring closure", () => {
    const mode = deriveCustomerRealityAuthorityModeV1({
      scoreboard: scoreboard(),
      steering: steering(),
      closure: closure(0),
    });
    assert.equal(mode.authority_mode, "AUTHORITY_GATED_ACTIVE");
    assert.equal(mode.authority_claim_permitted, true);
  });

  it("tier 1 requires closure evidence for authority", () => {
    const modeWithoutClosure = deriveCustomerRealityAuthorityModeV1({
      scoreboard: scoreboard(dryRun({ tier: 1, tier_label: "customer_rescue" })),
      steering: steering({ customer_tier: 1 }),
      closure: closure(0),
    });
    assert.equal(modeWithoutClosure.authority_mode, "VISIBILITY_ONLY");
    assert.equal(modeWithoutClosure.authority_claim_permitted, false);

    const modeWithClosure = deriveCustomerRealityAuthorityModeV1({
      scoreboard: scoreboard(dryRun({ tier: 1, tier_label: "customer_rescue" })),
      steering: steering({ customer_tier: 1 }),
      closure: closure(2),
    });
    assert.equal(modeWithClosure.authority_mode, "AUTHORITY_GATED_ACTIVE");
    assert.equal(closureEvidenceSupportsAuthorityV1(closure(1)), true);
  });

  it("buildCustomerRealityAuthorityGatedModelV1 never replaces factory NBA", () => {
    const model = buildCustomerRealityAuthorityGatedModelV1({
      factory_next_best_action: FACTORY_NBA,
      scoreboard: scoreboard(),
      steering: steering(),
      closure: closure(),
    });
    assert.equal(model.replaces_next_best_action, false);
    assert.equal(model.dry_run_only, true);
    assert.equal(model.factory_next_best_action, FACTORY_NBA);
    assert.notEqual(model.customer_dry_run_action, FACTORY_NBA);
    assert.equal(model.conflicts_with_factory, true);
    assert.ok(model.trust_surface_template.certainty_status.length > 0);
  });

  it("tier 4 conflict yields ADVISORY_COMPARE not authority", () => {
    const model = buildCustomerRealityAuthorityGatedModelV1({
      factory_next_best_action: FACTORY_NBA,
      scoreboard: scoreboard(
        dryRun({
          tier: 4,
          tier_label: "controlled_discovery",
          blocks_discovery: false,
          action: "CONTROLLED DISCOVERY: dispatch when gates clear.",
        }),
      ),
      steering: steering({
        customer_tier: 4,
        blocks_discovery: false,
        conflicts_with_next_best_action: true,
        recommended_primary_for_founder_review: "compare_both",
      }),
      closure: closure(0),
    });
    assert.equal(model.authority_mode, "ADVISORY_COMPARE");
    assert.equal(model.authority_claim_permitted, false);
    assert.ok(model.why_factory_remains_primary?.includes("next_best_action"));
  });
});
