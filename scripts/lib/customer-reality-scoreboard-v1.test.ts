import assert from "node:assert/strict";
import test from "node:test";

import { buildCustomerRealityScoreboardV1 } from "./customer-reality-scoreboard-v1";
import type { AllProductSafeBuyerPathCensusV1 } from "./all-product-safe-buyer-path-census-v1";
import type { BuckpartsCertaintyEngineChecklistLaneV1 } from "./buckparts-certainty-engine-checklist-v1";
import type { BuckpartsMarketingIntelligenceEngineV1 } from "./buckparts-marketing-intelligence-engine-v1";
import type { MissionFactoryRegistryReportV1 } from "./mission-factory-registry-v1";

const GENERATED_AT = "2026-06-10T12:00:00.000Z";

function minimalCensus(): AllProductSafeBuyerPathCensusV1 {
  return {
    contract: "all_product_safe_buyer_path_census_v1",
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    recommended_jq_path: ".command_center_v2.all_product_safe_buyer_path_census_v1",
    source_command: "npm run buckparts:all-product-safe-buyer-path-census",
    generated_at: GENERATED_AT,
    exact_repo_paths_read: [],
    wedge_coverage: [
      {
        wedge: "refrigerator_water",
        vertical_slug: "refrigerator_routes",
        vertical_launch_state: "LIVE",
        csv_inventory_source: "committed_csv",
        product_page_count: 57,
        safe_buyer_path_proven_count: 13,
        suppressed_trust_count: 44,
        noindex_unproven_count: 0,
        unknown_count: 0,
      },
      {
        wedge: "air_purifier",
        vertical_slug: "air-purifier",
        vertical_launch_state: "LIVE",
        csv_inventory_source: "committed_csv",
        product_page_count: 57,
        safe_buyer_path_proven_count: 10,
        suppressed_trust_count: 47,
        noindex_unproven_count: 0,
        unknown_count: 0,
      },
    ],
    classification_counts: {
      SAFE_BUYER_PATH_PROVEN: 23,
      SAFE_BUYER_PATH_SUPPRESSED_TRUST: 91,
      NO_PRODUCT_PAGE_PROVEN: 0,
      NOINDEX_UNPROVEN: 62,
      UNKNOWN: 0,
    },
    products: [],
    top_20_rescue_queue: [
      {
        slug: "ukf8001",
        wedge: "refrigerator_water",
        vertical_launch_state: "LIVE",
        page_classification: "SAFE_BUYER_PATH_SUPPRESSED_TRUST",
        indexable_in_repo_policy: true,
        public_route: "/filter/ukf8001",
        current_page_state: "INDEXABLE_BUY_SUPPRESSED_TRUST",
        retailer_row_state: "BLOCKED_SEARCH_OR_DISCOVERY",
        evidence_files: [],
        supabase_safe_path_missing_from_csv: false,
        csv_safe_path_missing_from_supabase: false,
        recommended_next_safe_action: "Rescue ukf8001 with browser-proofed direct_buyable row.",
        owner_approval_required: true,
        mutation_authorized: false,
        rescue_priority_score: 251,
      },
    ],
    easiest_rescue_slugs: [],
    requires_owner_browser_review_slugs: [],
    proven_facts: [],
    inferred_facts: [],
    unknown_facts: [],
    recommended_next_action: "Rescue top queue.",
  };
}

function minimalChecklist(blocked = true): BuckpartsCertaintyEngineChecklistLaneV1 {
  return {
    contract: "buckparts_certainty_engine_checklist_v1",
    read_only: true,
    data_mutation: false,
    recommended_jq_path: ".command_center_v2.buckparts_certainty_engine_checklist_v1",
    source_command: "npm run buckparts:command-center",
    north_star_statement: "test",
    master_question: "test",
    branded_term: "BuckParts Verified Link",
    branded_term_definition: "test",
    ai_vs_buckparts_positioning: "AI can suggest. BuckParts verifies.",
    ai_vs_buckparts_explanation: "test",
    customer_facing_terminology: {
      branded_term: "BuckParts Verified Link",
      branded_term_definition: "test",
      forbidden_customer_language: [],
      preferred_language: [],
    },
    login_and_email_stance: {
      forced_login_before_value: false,
      optional_email_save_reminder_after_value: true,
      recommended_first_version: "test",
      future_account_value: [],
    },
    marketing_plan: {
      founder_ai_solo_builder_handle: "@test",
      buckparts_brand_handle: "@test",
      every_post_must_include_educational_component: true,
      founder_themes: [],
      brand_themes: [],
    },
    future_brand_product_ideas: [],
    current_blockers: [],
    verified_link_coverage: {
      refrigerator_filter_slugs_in_catalog: 57,
      refrigerator_filter_slugs_with_safe_buyer_path: 13,
      coverage_percent: 22.8,
      source_path: "data/filters.csv+data/retailer_links.csv",
    },
    checklist_item_count: 3,
    checklist_items: [
      {
        id: "every_filter_has_buckparts_verified_link_or_safe_buyer_path",
        label: "test",
        status: "NOT_PROVEN",
        why_it_matters: "test",
        proof_or_blocker: "test",
        priority_rank: 1,
      },
      {
        id: "high_demand_no_buy_emergency_lane",
        label: "test",
        status: blocked ? "BLOCKED" : "PROVEN",
        why_it_matters: "test",
        proof_or_blocker: "test",
        priority_rank: 3,
      },
      {
        id: "above_the_fold_certainty_snapshot",
        label: "test",
        status: "NOT_PROVEN",
        why_it_matters: "test",
        proof_or_blocker: "test",
        priority_rank: 4,
      },
    ],
    csv_apply_authorized: false,
    supabase_mutation_authorized: false,
    evidence_write_authorized: false,
    public_ui_mutation_authorized: false,
    netlify_api_authorized: false,
    buy_cta_authorized: false,
    buckparts_verified_link_authorized: false,
    proven_facts: [],
    inferred_facts: [],
    unknown_facts: [],
    recommended_next_action: "test",
  };
}

function minimalMarketing(highRisk = 2): BuckpartsMarketingIntelligenceEngineV1 {
  return {
    contract: "marketing_intelligence_engine_v1",
    read_only: true,
    data_mutation: false,
    motto: "The Wrong Part Prevention Department",
    generated_at: GENERATED_AT,
    source_status: "PROVEN",
    source_reports: [],
    opportunity_count: highRisk,
    opportunities: Array.from({ length: highRisk }, (_, i) => ({
      opportunity_id: `opp-high-${String(i)}`,
      opportunity_class: "catalog_identity_confusion",
      wedge: "air_purifier",
      source_truth_paths: [],
      source_status: "PROVEN",
      customer_pain: "test",
      wrong_part_risk: "HIGH",
      business_reason: "test",
      asset_recommendations: [],
      sarcastic_hooks: [],
      plain_english_explanation: "test",
      trust_copy_angle: "test",
      publishability_status: "NEEDS_OWNER_TASTE_REVIEW",
      blocked_reasons: [],
      suggested_internal_links: [],
      rank_score: 100 - i,
      evidence_keys: [],
    })),
    selected_opportunities: [],
    proven_facts: [],
    unknown_facts: [],
    notes: [],
  };
}

function minimalMissionFactory(): MissionFactoryRegistryReportV1 {
  const states = {
    QUEUED: 0,
    DISPATCH_READY: 14,
    DISPATCHED: 0,
    DISCOVERY_COMPLETE: 1,
    INGEST_COMMITTED: 0,
    CURSOR_VALIDATED: 0,
    OWNER_REVIEWED: 0,
    PROMOTED: 0,
    GUARD_CAPTURED: 0,
    CLOSED: 0,
    DISCOVERY_BLOCKED: 0,
    VALIDATION_FAILED: 0,
    OWNER_REJECTED: 0,
    EXPIRED: 0,
  };
  return {
    contract: "mission_factory_registry_report_v1",
    report_name: "mission_factory_registry_report_v1",
    generated_at: GENERATED_AT,
    read_only: true,
    data_mutation: false,
    active_mission_count: 15,
    missions_by_state: states,
    missions_by_type: {
      EVIDENCE_SCALING: 5,
      WRONG_PART_RESEARCH: 3,
      FAMILY_RECONCILIATION: 2,
      SAFE_LINK_COVERAGE: 4,
      NEW_WEDGE_EXPANSION: 1,
    },
    missions_by_wedge: {
      refrigerator: 8,
      air_purifier: 5,
      whole_house_water: 1,
      vacuum: 1,
    },
    queue_depth: 14,
    ttl_expired_mission_count: 0,
    proven_facts: [],
    unknown_facts: [],
  };
}

test("customer_reality_scoreboard_v1 is read-only with required metric fields", () => {
  const board = buildCustomerRealityScoreboardV1({
    generated_at: GENERATED_AT,
    census: minimalCensus(),
    certaintyChecklist: minimalChecklist(false),
    marketingEngine: minimalMarketing(0),
    missionFactoryRegistry: minimalMissionFactory(),
    publicTrustContract: {
      contract: "public_trust_unification_backend_contract_v1",
      read_only: true,
      data_mutation: false,
      owner_approval_required: false,
      coverage_status: "PROVEN",
      proven_signal_count: 8,
      missing_signal_count: 0,
      page_contracts_evaluated_count: 3,
      required_signal_ids: [],
      page_contracts: [],
      proven_facts: [],
      unknown_facts: [],
    },
    revenueLedgerContract: {
      contract: "revenue_truth_ledger_contract_v1",
      read_only: true,
      data_mutation: false,
      owner_approval_required: false,
      coverage_status: "PROVEN",
      valid_entry_count: 0,
      invalid_entry_count: 0,
      total_reported_gross_usd: 0,
      proven_facts: [],
      unknown_facts: [],
    },
    revenueSnapshot: {
      status: "OK",
      count: 0,
      top_items: [],
      blocker: null,
      next_agent_action: "test",
      next_owner_action: "test",
      click_visibility: {
        runtime_status: "OK",
        generated_at: GENERATED_AT,
        window_days: { short: 7, long: 30 },
        last_7_days_clicks: 10,
        last_30_days_clicks: 242,
        raw_last_7_days_clicks: 10,
        raw_last_30_days_clicks: 242,
        human_likely_last_7_days_clicks: 8,
        human_likely_last_30_days_clicks: 200,
        excluded_last_30_days_clicks: 42,
        excluded_by_category_30d: {},
        newest_click_at: GENERATED_AT,
        oldest_click_at_in_30d_window: GENERATED_AT,
        click_freshness_status: "OK",
        click_freshness_reason: "test",
        clicks_by_wedge_30d: {},
        commission_or_revenue: "NOT_CONNECTED",
        commission_or_revenue_notes: "test",
      },
    },
    deployLiveSiteMonitor: {
      contract: "deploy_live_site_monitor_v1",
      read_only: true,
      data_mutation: false,
      inspect_summary: {
        recommended_jq_paths: {
          command_center: ".command_center_v2.deploy_live_site_monitor_v1.inspect_summary",
          deploy_lane_monitor: ".command_center_v2.deploy_live_site_status.live_site_monitor",
        },
        contract: "live_site_monitor_v1",
        artifact_source: "inline_read_only",
        checked_at: GENERATED_AT,
        target_base_url: "https://example.test",
        runtime_status: "OK",
        route_http_status: "OK",
        content_contract_status: "OK",
        deploy_sync_status: "OK",
        wrong_part_prevention: "UNKNOWN",
        proven_facts: [],
        unknown_facts: [],
      },
      live_site_monitor: null,
    },
    rpwfeOwnerReview: null,
    searchAndClickIntelligenceSummary: {
      runtime_status: "OK",
      search_events: {
        last_30d: 130,
        zero_result_last_30d: 8,
        zero_result_rate_last_30d: 0.06153846153846154,
      },
      search_gaps_backlog: {
        open: 4,
        reviewing: 0,
        queued: 0,
        total_actionable: 4,
      },
      click_events: { last_30d: 242 },
    },
    moneyFunnelSummary: {
      runtime_status: "OK",
      derived_rates_30d: { clicks_per_search_event: 1.86 },
      stages_30d: { search_events_total: 130, click_events_total: 242 },
    },
    rescueDeltaTrendSummary: {
      runtime_status: "OK",
      deltas: { safe_cta_links_delta: 1 },
      net_rescue_direction: "IMPROVING",
    },
  });

  assert.equal(board.contract, "customer_reality_scoreboard_v1");
  assert.equal(board.read_only, true);
  assert.equal(board.data_mutation, false);
  assert.equal(board.mutation_authorized, false);
  assert.equal(board.verified_buyer_path_coverage.evidence_basis, "PROVEN");
  assert.equal(board.verified_buyer_path_coverage.all_wedge_safe_proven_count, 23);
  assert.equal(board.verified_buyer_path_coverage.all_wedge_live_product_page_count, 114);
  assert.equal(board.certainty_visibility_status.proven_count, 1);
  assert.equal(board.certainty_visibility_status.blocked_count, 0);
  assert.equal(board.wrong_part_exposure_status.suppressed_trust_page_count, 91);
  assert.equal(board.repair_closure_status.discovery_without_closure_ratio, "INFINITE");
  assert.equal(board.search_failure_status.zero_result_count_last_30d, 8);
  assert.equal(board.search_gap_status.actionable_total, 4);
  assert.equal(board.customer_journey_completion_status.full_journey_measured, false);
  assert.equal(board.customer_journey_completion_status.evidence_basis, "INFERRED");
  assert.equal(board.commission_truth_status.clicks_without_commission_entries, true);
  assert.equal(board.recommended_next_customer_action_dry_run.dry_run_only, true);
  assert.equal(board.recommended_next_customer_action_dry_run.replaces_next_best_action, false);
});

test("tier 0 dry-run when HIGH wrong-part risk and BLOCKED certainty", () => {
  const board = buildCustomerRealityScoreboardV1({
    generated_at: GENERATED_AT,
    census: minimalCensus(),
    certaintyChecklist: minimalChecklist(true),
    marketingEngine: minimalMarketing(3),
    missionFactoryRegistry: minimalMissionFactory(),
    publicTrustContract: null,
    revenueLedgerContract: null,
    revenueSnapshot: null,
    deployLiveSiteMonitor: null,
    rpwfeOwnerReview: null,
    searchAndClickIntelligenceSummary: {
      runtime_status: "OK",
      search_events: { last_30d: 10, zero_result_last_30d: 0, zero_result_rate_last_30d: 0 },
      search_gaps_backlog: { open: 0, reviewing: 0, queued: 0, total_actionable: 0 },
      click_events: { last_30d: 0 },
    },
    moneyFunnelSummary: null,
    rescueDeltaTrendSummary: null,
  });

  assert.equal(board.recommended_next_customer_action_dry_run.tier, 0);
  assert.equal(board.recommended_next_customer_action_dry_run.tier_label, "trust_stop_the_line");
  assert.equal(board.recommended_next_customer_action_dry_run.blocks_discovery, true);
  assert.match(board.recommended_next_customer_action_dry_run.action, /TRUST STOP-THE-LINE/i);
});

test("tier 1 dry-run rescue when no tier 0 and rescue queue present", () => {
  const board = buildCustomerRealityScoreboardV1({
    generated_at: GENERATED_AT,
    census: minimalCensus(),
    certaintyChecklist: minimalChecklist(false),
    marketingEngine: minimalMarketing(0),
    missionFactoryRegistry: minimalMissionFactory(),
    publicTrustContract: null,
    revenueLedgerContract: null,
    revenueSnapshot: null,
    deployLiveSiteMonitor: null,
    rpwfeOwnerReview: null,
    searchAndClickIntelligenceSummary: {
      runtime_status: "OK",
      search_events: { last_30d: 10, zero_result_last_30d: 0, zero_result_rate_last_30d: 0 },
      search_gaps_backlog: { open: 0, reviewing: 0, queued: 0, total_actionable: 0 },
      click_events: { last_30d: 0 },
    },
    moneyFunnelSummary: null,
    rescueDeltaTrendSummary: null,
  });

  assert.equal(board.recommended_next_customer_action_dry_run.tier, 1);
  assert.equal(board.recommended_next_customer_action_dry_run.tier_label, "customer_rescue");
  assert.equal(board.recommended_next_customer_action_dry_run.closure_target_slug, "ukf8001");
  assert.equal(board.recommended_next_customer_action_dry_run.blocks_discovery, true);
});
