import assert from "node:assert/strict";
import test from "node:test";

import type { AllProductSafeBuyerPathCensusV1 } from "./all-product-safe-buyer-path-census-v1";
import type { BuckpartsRetailerLinkParityCorrectionCommandCenterLaneV1 } from "./buckparts-command-center-v2-types";
import type { BuckpartsSitemapIndexabilityAuditV1 } from "./buckparts-sitemap-indexability-audit-v1";
import type { DemandToCoverageNextLaneReportV1 } from "./demand-to-coverage-next-lane-v1";
import type { FridgeTruthSpineV1 } from "./fridge-truth-spine-v1";
import type { WedgeTruthSpineCoverageMatrixV1 } from "./wedge-truth-spine-coverage-matrix-v1";
import {
  buildPhase4CoverageScoreboardV1,
  PHASE4_COVERAGE_SCOREBOARD_CONTRACT_V1,
  PHASE4_COVERAGE_SCOREBOARD_CC_JQ_PATH_V1,
} from "./buckparts-phase4-coverage-scoreboard-v1";

const NOW = () => new Date("2026-07-24T18:00:00.000Z");

function censusFixture(overrides: Partial<AllProductSafeBuyerPathCensusV1> = {}): AllProductSafeBuyerPathCensusV1 {
  return {
    contract: "all_product_safe_buyer_path_census_v1",
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    recommended_jq_path: ".command_center_v2.all_product_safe_buyer_path_census_v1",
    source_command: "npm run buckparts:all-product-safe-buyer-path-census",
    generated_at: "2026-07-24T17:00:00.000Z",
    exact_repo_paths_read: ["data/filters.csv"],
    wedge_coverage: [
      {
        wedge: "refrigerator_water",
        vertical_slug: "refrigerator_routes",
        vertical_launch_state: "LIVE",
        csv_inventory_source: "committed_csv",
        product_page_count: 57,
        safe_buyer_path_proven_count: 22,
        suppressed_trust_count: 35,
        noindex_unproven_count: 0,
        unknown_count: 0,
      },
      {
        wedge: "air_purifier",
        vertical_slug: "air-purifier",
        vertical_launch_state: "LIVE",
        csv_inventory_source: "committed_csv",
        product_page_count: 59,
        safe_buyer_path_proven_count: 34,
        suppressed_trust_count: 25,
        noindex_unproven_count: 0,
        unknown_count: 0,
      },
    ],
    classification_counts: {
      SAFE_BUYER_PATH_PROVEN: 56,
      SAFE_BUYER_PATH_SUPPRESSED_TRUST: 60,
      NO_PRODUCT_PAGE_PROVEN: 0,
      NOINDEX_UNPROVEN: 62,
      UNKNOWN: 0,
    },
    products: [],
    top_20_rescue_queue: [
      {
        slug: "da97-17376b",
        wedge: "refrigerator_water",
        vertical_launch_state: "LIVE",
        page_classification: "SAFE_BUYER_PATH_SUPPRESSED_TRUST",
        indexable_in_repo_policy: true,
        public_route: "/filter/da97-17376b",
        current_page_state: "suppressed",
        retailer_row_state: "search_placeholder",
        evidence_files: [],
        supabase_safe_path_missing_from_csv: false,
        csv_safe_path_missing_from_supabase: false,
        recommended_next_safe_action: "Collect manufacturer PDP browser proof.",
        owner_approval_required: true,
        mutation_authorized: false,
        rescue_priority_score: 215,
        public_trust_current: "FAIL_CLOSED" as never,
        public_trust_mutation_permitted: false,
        public_trust_deny_reasons: [],
      },
    ],
    easiest_rescue_slugs: ["da97-17376b"],
    requires_owner_browser_review_slugs: ["da97-17376b"],
    proven_facts: [],
    inferred_facts: [],
    unknown_facts: [],
    recommended_next_action: "Rescue queue #1: da97-17376b",
    ...overrides,
  };
}

function demandFixture(): DemandToCoverageNextLaneReportV1 {
  return {
    contract: "demand_to_coverage_next_lane_v1",
    report_name: "buckparts_demand_to_coverage_next_lane_v1",
    read_only: true,
    data_mutation: false,
    generated_at: "2026-07-24T17:05:00.000Z",
    runtime_status: "PROVEN",
    source_status: "PROVEN",
    recommended_wedge: "air_purifier",
    recommendation_status: "START_NEW_DEMAND_SELECTED_BATCH",
    recommended_next_action: "Demand-selected AP batch closeout not proven.",
    next_lane: "air_purifier_demand_selected",
    next_wedge: "air_purifier",
    next_batch_candidate: "ap-demand-selected-batch-run-v1",
    blockers: ["batch_closeout_not_proven"],
    proof_sources: ["data/gsc/search-analytics.json"],
    wedge_rows: [
      {
        wedge: "air_purifier",
        vertical_slug: "air-purifier",
        impressions: 233,
        clicks: 2,
        top_pages: [],
        launch_state: "LIVE",
        sitemap_url_count: 4,
        live_filter_count: 59,
        retailer_link_count: 65,
        blocked_link_count: 65,
        // Deliberately incompatible with census proven=56 — must not override.
        safe_cta_count: 0,
        coverage_gap_summary: "blocked links dominate",
        recommended_action: "evidence",
        priority_score: 274.05,
      },
    ],
    top_pages: [],
    top_queries: [],
    coverage_gap: {
      highest_demand_wedge: "air_purifier",
      highest_blocked_wedge: "air_purifier",
      active_batch_wedge: "refrigerator_water",
      gap_rationale: "AP demand highest",
    },
    next_action: "evidence",
    notes: [],
    proven_facts: [],
    inferred_facts: [],
    unknown_facts: [],
  };
}

function sitemapFixture(): BuckpartsSitemapIndexabilityAuditV1 {
  return {
    contract: "buckparts_sitemap_indexability_audit_v1",
    read_only: true,
    data_mutation: false,
    generated_at: "2026-07-24T17:06:00.000Z",
    live_sitemap_url: "https://buckparts.com/sitemap.xml",
    live_sitemap_fetch_status: "CHECKED",
    repo_expected_indexable_url_count: 931,
    live_sitemap_url_count: 1138,
    gsc_indexed_count: "UNKNOWN",
    gsc_discovered_count: "UNKNOWN",
    seventy_five_indexed_page_threshold_status: "UNKNOWN",
    first_campaign_indexability_status: "NOT_READY",
    recommended_next_action: "Do not claim SEO wins",
  } as BuckpartsSitemapIndexabilityAuditV1;
}

function wedgeFixture(): WedgeTruthSpineCoverageMatrixV1 {
  return {
    contract: "wedge_truth_spine_coverage_matrix_v1",
    read_only: true,
    data_mutation: false,
    generated_at: "2026-07-24T17:07:00.000Z",
    wedges: [
      {
        wedge: "refrigerator_water",
        public_launch_state: "LIVE",
        public_indexing_status: "INDEXABLE_LIVE",
        has_formal_truth_spine: true,
        truth_spine_contract_name: "fridge_truth_spine_v1",
        has_public_readiness_report_coverage: true,
        has_safe_cta_queue_or_batch_director: true,
        has_model_first_evidence_lane: true,
        has_buyer_path_proof_lane: true,
        has_browser_truth_lane: true,
        has_apply_plan_lane: true,
        safe_cta_count_from_committed_csv: 0,
        current_public_opening_authorized: false,
        truth_coverage_status: "FORMAL_SPINE",
        next_truth_gap_to_close: "none",
        proven_lane_refs: [],
      },
    ],
    inspect_summary: {
      recommended_jq_paths: {
        standalone_report: ".inspect_summary",
        command_center: ".command_center_v2.wedge_truth_spine_coverage_matrix_v1.inspect_summary",
      },
      wedges_with_formal_spine_count: 2,
      wedges_public_but_without_formal_spine: [],
      wedges_partial_operational_proof: ["whole_house_water"],
      wedges_preview_or_sample_only: ["vacuum", "humidifier", "appliance_air"],
      next_truth_gap: "WHW spine",
      ap_truth_spine_gap_present: false,
      whw_truth_spine_gap_present: true,
      recommended_next_action: "Do not scale wedges equally",
    },
  } as WedgeTruthSpineCoverageMatrixV1;
}

function parityFixture(): BuckpartsRetailerLinkParityCorrectionCommandCenterLaneV1 {
  return {
    contract: "buckparts_retailer_link_parity_correction_command_center_lane_v1",
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    runtime_status: "ARMED_AND_IDLE",
    detected_count: 4,
    discovered_count: 1,
    classified_count: 4,
    planned_count: 0,
    awaiting_approval_count: 0,
    approved_ready_count: 0,
    applied_count: 0,
    verified_count: 0,
    failed_or_reconciliation_count: 0,
    owner_action_count: 0,
    cohorts: [{ status: "DISCOVERED", count: 1, row_ids: ["issue-a"] }],
    blockers: ["no_op_update_refused:issue-a", "zero_row_plan_refused"],
    proof_sources: [],
    steering_note: "parity steering note",
    next_action: "Continue read-only monitoring.",
  };
}

function fridgeSpineFixture(): FridgeTruthSpineV1 {
  return {
    model_pdp_live_html_proof: {
      contract: "buckparts_fridge_model_pdp_live_html_proof_pack_v1",
      LIVE_PROOF_PASS: 21,
      LIVE_PROOF_FAIL: 0,
      LIVE_PROOF_UNKNOWN: 0,
      proven_facts: [],
      unknown_facts: [],
    },
  } as FridgeTruthSpineV1;
}

test("scoreboard fails closed without census and invents no counts", () => {
  const board = buildPhase4CoverageScoreboardV1({ now: NOW });
  assert.equal(board.contract, PHASE4_COVERAGE_SCOREBOARD_CONTRACT_V1);
  assert.equal(board.read_only, true);
  assert.equal(board.data_mutation, false);
  assert.equal(board.mutation_authorized, false);
  assert.equal(board.runtime_status, "NOT_PROVEN");
  assert.deepEqual(board.blockers, ["phase4_scoreboard_census_required"]);
  assert.equal(board.dimensions.length, 0);
  assert.equal(board.recommended_jq_path, PHASE4_COVERAGE_SCOREBOARD_CC_JQ_PATH_V1);
});

test("scoreboard prefers census proven paths over demand safe_cta_count=0", () => {
  const board = buildPhase4CoverageScoreboardV1({
    now: NOW,
    census: censusFixture(),
    demandNextLane: demandFixture(),
    sitemapAudit: sitemapFixture(),
    wedgeMatrix: wedgeFixture(),
    retailerLinkParity: parityFixture(),
    fridgeTruthSpine: fridgeSpineFixture(),
  });
  assert.equal(board.mutation_authorized, false);
  assert.equal(board.data_mutation, false);
  const safe = board.dimensions.find((d) => d.dimension_id === "safe_buyer_paths");
  assert.ok(safe);
  assert.equal(safe!.counters.SAFE_BUYER_PATH_PROVEN, 56);
  assert.notEqual(safe!.counters.SAFE_BUYER_PATH_PROVEN, 0);
  assert.ok(
    board.inferred_facts.some((fact) => fact.includes("safe_cta_count must not override")),
  );
  const demand = board.dimensions.find((d) => d.dimension_id === "demand_gaps");
  assert.equal(demand?.counters.recommendation_status, "START_NEW_DEMAND_SELECTED_BATCH");
});

test("blockers are exact, deduplicated, and sorted; dimensions sorted", () => {
  const board = buildPhase4CoverageScoreboardV1({
    now: NOW,
    census: censusFixture(),
    demandNextLane: demandFixture(),
    sitemapAudit: sitemapFixture(),
    wedgeMatrix: wedgeFixture(),
    retailerLinkParity: parityFixture(),
    fridgeTruthSpine: fridgeSpineFixture(),
  });
  assert.deepEqual(board.blockers, [...board.blockers].sort());
  assert.equal(board.blockers.length, new Set(board.blockers).size);
  assert.ok(board.blockers.includes("parity:no_op_update_refused:issue-a"));
  assert.ok(board.blockers.includes("parity:zero_row_plan_refused"));
  assert.ok(board.blockers.includes("demand_lane:batch_closeout_not_proven"));
  const ids = board.dimensions.map((d) => d.dimension_id);
  assert.deepEqual(ids, [...ids].sort());
  assert.deepEqual(ids, [
    "customer_visible_closure",
    "demand_gaps",
    "inventory",
    "retailer_link_parity",
    "safe_buyer_paths",
    "sitemap_indexability",
    "suppression_and_noindex",
    "wedge_launch_state",
  ]);
});

test("missing optional lanes surface UNKNOWN without inventing totals", () => {
  const board = buildPhase4CoverageScoreboardV1({
    now: NOW,
    census: censusFixture(),
  });
  assert.ok(board.blockers.includes("phase4_scoreboard_demand_next_lane_unavailable"));
  assert.ok(board.blockers.includes("phase4_scoreboard_sitemap_audit_unavailable"));
  assert.ok(board.blockers.includes("phase4_scoreboard_wedge_matrix_unavailable"));
  assert.ok(board.blockers.includes("phase4_scoreboard_retailer_link_parity_unavailable"));
  const sitemap = board.dimensions.find((d) => d.dimension_id === "sitemap_indexability");
  assert.equal(sitemap?.counters.gsc_indexed_count, "UNKNOWN");
  const closure = board.dimensions.find((d) => d.dimension_id === "customer_visible_closure");
  assert.equal(closure?.evidence_basis, "UNKNOWN");
  assert.equal(closure?.counters.LIVE_PROOF_PASS, "UNKNOWN");
});

test("malformed census contract fails closed", () => {
  const board = buildPhase4CoverageScoreboardV1({
    now: NOW,
    census: { ...censusFixture(), contract: "wrong_contract" as never },
  });
  assert.equal(board.runtime_status, "NOT_PROVEN");
  assert.deepEqual(board.blockers, ["phase4_scoreboard_census_required"]);
});

test("recommendation remains read-only and evidence-oriented", () => {
  const board = buildPhase4CoverageScoreboardV1({
    now: NOW,
    census: censusFixture(),
    demandNextLane: demandFixture(),
    sitemapAudit: sitemapFixture(),
    wedgeMatrix: wedgeFixture(),
    retailerLinkParity: parityFixture(),
    fridgeTruthSpine: fridgeSpineFixture(),
  });
  assert.match(board.recommended_next_action, /Read-only/);
  assert.match(board.recommended_next_action, /da97-17376b/);
  assert.match(board.steering_note, /cannot authorize mutation/);
  assert.equal(board.source_command, "npm run buckparts:command-center");
});
