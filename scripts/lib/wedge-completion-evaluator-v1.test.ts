import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { HOMEKEEP_WEDGE_CATALOG } from "@/lib/catalog/identity";

import type { AllProductSafeBuyerPathCensusV1 } from "./all-product-safe-buyer-path-census-v1";
import type { ProductionMissionLifecycleArtifactV1 } from "./buckparts-production-mission-v1";
import {
  buildWedgeCompletionEvaluatorReportV1,
  listProductionMissionLifecycleArtifactsV1,
} from "./wedge-completion-evaluator-v1";

const REPO_ROOT = process.cwd();

function minimalCensus(overrides?: Partial<AllProductSafeBuyerPathCensusV1>): AllProductSafeBuyerPathCensusV1 {
  return {
    contract: "all_product_safe_buyer_path_census_v1",
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    recommended_jq_path: ".command_center_v2.all_product_safe_buyer_path_census_v1",
    source_command: "npm run buckparts:all-product-safe-buyer-path-census",
    generated_at: "2026-06-27T12:00:00.000Z",
    exact_repo_paths_read: ["data/filters.csv"],
    classification_counts: {
      SAFE_BUYER_PATH_PROVEN: 2,
      SAFE_BUYER_PATH_SUPPRESSED_TRUST: 1,
      NO_PRODUCT_PAGE_PROVEN: 0,
      NOINDEX_UNPROVEN: 0,
      UNKNOWN: 0,
    },
    wedge_coverage: [
      {
        wedge: HOMEKEEP_WEDGE_CATALOG.refrigerator_water,
        vertical_slug: "refrigerator_routes",
        vertical_launch_state: "LIVE",
        csv_inventory_source: "committed_csv",
        product_page_count: 10,
        safe_buyer_path_proven_count: 2,
        suppressed_trust_count: 1,
        noindex_unproven_count: 0,
        unknown_count: 0,
      },
    ],
    products: [
      {
        slug: "edr4rxd1",
        wedge: HOMEKEEP_WEDGE_CATALOG.refrigerator_water,
        vertical_launch_state: "LIVE",
        page_classification: "SAFE_BUYER_PATH_PROVEN",
        indexable_in_repo_policy: true,
        public_route: "/filter/edr4rxd1",
        current_page_state: "PROVEN",
        retailer_row_state: "SAFE_CTA",
        evidence_files: [],
        supabase_safe_path_missing_from_csv: false,
        csv_safe_path_missing_from_supabase: false,
        recommended_next_safe_action: "none",
        owner_approval_required: false,
        mutation_authorized: false,
        rescue_priority_score: 0,
      },
      {
        slug: "ukf8001",
        wedge: HOMEKEEP_WEDGE_CATALOG.refrigerator_water,
        vertical_launch_state: "LIVE",
        page_classification: "SAFE_BUYER_PATH_SUPPRESSED_TRUST",
        indexable_in_repo_policy: true,
        public_route: "/filter/ukf8001",
        current_page_state: "SUPPRESSED",
        retailer_row_state: "SUPPRESSED",
        evidence_files: [],
        supabase_safe_path_missing_from_csv: false,
        csv_safe_path_missing_from_supabase: false,
        recommended_next_safe_action: "refresh evidence",
        owner_approval_required: false,
        mutation_authorized: false,
        rescue_priority_score: 1,
      },
    ],
    proven_facts: [],
    inferred_facts: [],
    unknown_facts: [],
    top_20_rescue_queue: [],
    easiest_rescue_slugs: [],
    requires_owner_browser_review_slugs: [],
    recommended_next_action: "test",
    ...overrides,
  };
}

function completeLifecycle(): ProductionMissionLifecycleArtifactV1 {
  return {
    contract: "buckparts_production_mission_lifecycle_v1",
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    generated_at: "2026-06-27T15:06:42.619Z",
    run_id: "a6b27301-e040-4405-b613-5adcb6c99bb6",
    runner_mission_id: "production_mission_v1",
    runner_artifact_rel_path: "data/command-center/runner-runs/x.json",
    runner_overall_status: "RESUMED_COMPLETE",
    target: {
      batch_id: "fridge_safe_link_first4_deblocked",
      batch_label: "First4",
      primary_apply_slug: "edr4rxd1",
      target_slugs: ["edr4rxd1"],
      expected_safe_buyer_path_proven_delta: 1,
      executability: "EXECUTABLE_AFTER_APPROVAL",
      founder_approval_required: true,
      dispatch_input_artifact_rel_paths: [],
      expected_agent_output_artifact_rel_paths: [],
      apply_executor_kind: "manufacturer_rescue_bridge",
      apply_factory_report_script: "scripts/x.ts",
      apply_factory_argv: ["--"],
      guarded_apply_report_script: "scripts/y.ts",
      guarded_apply_argv: ["--"],
      dry_run_command_display: "dry",
      write_command_display: "write",
    },
    phases: [],
    safe_buyer_path_proven: { baseline: 48, at_run: 49, delta: 1, expected_delta: 1 },
    owner_decision_queue: { pending_count: 0, linked_request_ids: [], linked_request_artifact_paths: [] },
    operations_metrics: {
      snapshot_recorded: true,
      history_rel_path: "data/command-center/operations-metrics/history-v1.jsonl",
      aggregate_agent_success_rate: 0.5,
      aggregate_validation_pass_rate: 0.8,
    },
    lifecycle_complete: true,
    lifecycle_complete_reason: "delta +1",
    proven_facts: [],
    unknown_facts: [],
    recommended_next_action: "done",
  };
}

describe("wedge completion evaluator v1", () => {
  test("contract and read-only flags", async () => {
    const report = await buildWedgeCompletionEvaluatorReportV1({
      rootDir: REPO_ROOT,
      skipSearchIntent: true,
      skipReferenceability: true,
      skipDemand: true,
      skipSprint: true,
    });
    assert.equal(report.contract, "wedge_completion_evaluator_v1");
    assert.equal(report.audit_contract, "wedge_completion_audit_v1");
    assert.equal(report.read_only, true);
    assert.equal(report.mutation_authorized, false);
    assert.equal(report.wedge, HOMEKEEP_WEDGE_CATALOG.refrigerator_water);
    assert.equal(report.dimensions.length, 4);
  });

  test("overall WEDGE_COMPLETE requires all dimensions PASS", async () => {
    const report = await buildWedgeCompletionEvaluatorReportV1({
      rootDir: REPO_ROOT,
      census: minimalCensus(),
      lifecycles: [completeLifecycle()],
      skipSearchIntent: true,
      skipReferenceability: true,
      skipDemand: true,
      skipSprint: true,
      matrix: {
        contract: "wedge_truth_spine_coverage_matrix_v1",
        read_only: true,
        data_mutation: false,
        generated_at: "2026-06-27T12:00:00.000Z",
        source_contracts: [],
        wedges: [
          {
            wedge: HOMEKEEP_WEDGE_CATALOG.refrigerator_water,
            public_launch_state: "refrigerator_routes_live",
            public_indexing_status: "INDEXABLE_LIVE",
            has_formal_truth_spine: true,
            truth_spine_contract_name: "fridge_truth_spine_v1",
            has_public_readiness_report_coverage: true,
            has_safe_cta_queue_or_batch_director: true,
            has_model_first_evidence_lane: true,
            has_buyer_path_proof_lane: true,
            has_browser_truth_lane: true,
            has_apply_plan_lane: false,
            safe_cta_count_from_committed_csv: 2,
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
          wedges_with_formal_spine_count: 1,
          wedges_public_but_without_formal_spine: [],
          wedges_partial_operational_proof: [],
          wedges_preview_or_sample_only: [],
          next_truth_gap: "none",
          ap_truth_spine_gap_present: false,
          whw_truth_spine_gap_present: false,
          recommended_next_action: "none",
        },
        proven_facts: [],
        inferred_facts: [],
        unknown_facts: [],
      },
      readinessRow: {
        wedge: HOMEKEEP_WEDGE_CATALOG.refrigerator_water,
        vertical_slug: "refrigerator_routes",
        public_routes_present: true,
        currently_public_facing_status: "LIVE",
        csv_data_source: "committed_csv",
        model_count: 5,
        filter_count: 10,
        compatibility_mapping_count: 20,
        safe_cta_count: 2,
        direct_buyable_count: 2,
        search_placeholder_count: 0,
        linked_filters_with_safe_gated_buy_path: 2,
        linked_filters_with_zero_safe_buy_path: 0,
        buyer_path_truth_status: "PROVEN_SAFE_ROWS_EXIST",
        mapping_truth_status: "HAS_EXPLICIT_CONFIDENCE",
        easiest_truthful_win_score: 0,
        easiest_candidate_families_or_brands: [],
        public_opening_recommendation: "OPEN_NOW_TRUTH_GATED",
        reason: "test",
      },
      sprint: {
        contract: "coverage_production_sprint_v2_v1",
        read_only: true,
        data_mutation: false,
        mutation_authorized: false,
        source_command: "npm run buckparts:coverage-production-sprint-v2",
        generated_at: "2026-06-27T12:00:00.000Z",
        sprint_version: 2,
        min_batch_target: 10,
        excluded_slugs: [],
        current_inventory: {
          safe_buyer_path_proven_count: 2,
          safe_buyer_path_suppressed_trust_count: 1,
          live_wedge_product_page_count: 10,
          refrigerator_water_proven: 2,
          refrigerator_water_suppressed: 1,
          air_purifier_proven: 0,
          air_purifier_suppressed: 0,
        },
        plus_ten_executable_possible: false,
        plus_ten_impossibility_proof: ["proof line"],
        largest_achievable_executable_delta: 2,
        ranked_production_batches: [
          {
            rank: 1,
            batch_id: "fridge_safe_link_first4_deblocked",
            batch_label: "First4",
            target_slugs: ["edr4rxd1"],
            slug_count: 1,
            expected_safe_buyer_path_proven_delta: 2,
            executability: "EXECUTABLE_AFTER_APPROVAL",
            infrastructure_reused: ["manufacturer_safe_link_rescue_runner_v1"],
            founder_approval_required: true,
            dry_run_commands: [],
            write_commands: [],
            blockers: [],
            customer_impact: "test",
          },
        ],
        winning_batch: null,
        bottlenecks: [],
        proven_facts: [],
        unknown_facts: [],
        recommended_next_action: "test",
      },
      dailyOperatorLiveSiteBannedRoutes: [],
    });
    const coverage = report.dimensions.find((d) => d.dimension_id === "coverage");
    assert.equal(coverage?.status, "PASS");
    assert.notEqual(report.overall_status, "WEDGE_COMPLETE");
  });

  test("lists production mission lifecycle artifacts from disk when present", () => {
    const artifacts = listProductionMissionLifecycleArtifactsV1(REPO_ROOT);
    assert.ok(Array.isArray(artifacts));
  });
});
