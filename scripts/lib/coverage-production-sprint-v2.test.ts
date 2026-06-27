import assert from "node:assert/strict";
import test from "node:test";

import { HOMEKEEP_WEDGE_CATALOG } from "@/lib/catalog/identity";

import type { AllProductSafeBuyerPathCensusV1 } from "./all-product-safe-buyer-path-census-v1";
import {
  COVERAGE_PRODUCTION_SPRINT_V2_CONTRACT_V1,
  COVERAGE_PRODUCTION_SPRINT_V2_MIN_BATCH_TARGET_V1,
  buildCoverageProductionSprintV2ReportV1,
} from "./coverage-production-sprint-v2";
import type { SupabaseCsvParityCoverageFactoryReportV1 } from "./supabase-csv-parity-coverage-factory-v1";

const FIXED_NOW = () => new Date("2026-06-27T12:00:00.000Z");

function mockCensus(proven: number, suppressed: number): AllProductSafeBuyerPathCensusV1 {
  return {
    contract: "all_product_safe_buyer_path_census_v1",
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    recommended_jq_path: ".command_center_v2.all_product_safe_buyer_path_census_v1",
    source_command: "npm run buckparts:all-product-safe-buyer-path-census",
    generated_at: FIXED_NOW().toISOString(),
    exact_repo_paths_read: [],
    wedge_coverage: [
      {
        wedge: HOMEKEEP_WEDGE_CATALOG.refrigerator_water,
        vertical_slug: "refrigerator_routes",
        vertical_launch_state: "LIVE",
        csv_inventory_source: "committed_csv",
        product_page_count: 57,
        safe_buyer_path_proven_count: 14,
        suppressed_trust_count: 43,
        noindex_unproven_count: 0,
        unknown_count: 0,
      },
      {
        wedge: HOMEKEEP_WEDGE_CATALOG.air_purifier,
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
      SAFE_BUYER_PATH_PROVEN: proven,
      SAFE_BUYER_PATH_SUPPRESSED_TRUST: suppressed,
      NO_PRODUCT_PAGE_PROVEN: 0,
      NOINDEX_UNPROVEN: 62,
      UNKNOWN: 0,
    },
    products: [
      {
        slug: "ukf8001",
        wedge: HOMEKEEP_WEDGE_CATALOG.refrigerator_water,
        vertical_launch_state: "LIVE",
        page_classification: "SAFE_BUYER_PATH_PROVEN",
        indexable_in_repo_policy: true,
        public_route: "/filter/ukf8001",
        current_page_state: "proven",
        retailer_row_state: "amazon direct_buyable",
        evidence_files: [],
        supabase_safe_path_missing_from_csv: false,
        csv_safe_path_missing_from_supabase: false,
        recommended_next_safe_action: "none",
        owner_approval_required: false,
        mutation_authorized: false,
        rescue_priority_score: 0,
      },
      {
        slug: "edr4rxd1",
        wedge: HOMEKEEP_WEDGE_CATALOG.refrigerator_water,
        vertical_launch_state: "LIVE",
        page_classification: "SAFE_BUYER_PATH_SUPPRESSED_TRUST",
        indexable_in_repo_policy: true,
        public_route: "/filter/edr4rxd1",
        current_page_state: "suppressed",
        retailer_row_state: "search placeholder",
        evidence_files: ["data/evidence/amazon-edr4rxd1-oem-pdp-evidence.2026-05-04.json"],
        supabase_safe_path_missing_from_csv: false,
        csv_safe_path_missing_from_supabase: false,
        recommended_next_safe_action: "rescue",
        owner_approval_required: true,
        mutation_authorized: false,
        rescue_priority_score: 227,
      },
      {
        slug: "wf3cb",
        wedge: HOMEKEEP_WEDGE_CATALOG.refrigerator_water,
        vertical_launch_state: "LIVE",
        page_classification: "SAFE_BUYER_PATH_SUPPRESSED_TRUST",
        indexable_in_repo_policy: true,
        public_route: "/filter/wf3cb",
        current_page_state: "suppressed",
        retailer_row_state: "search placeholder",
        evidence_files: [],
        supabase_safe_path_missing_from_csv: false,
        csv_safe_path_missing_from_supabase: false,
        recommended_next_safe_action: "rescue",
        owner_approval_required: false,
        mutation_authorized: false,
        rescue_priority_score: 212,
      },
      {
        slug: "winix-hepa-115115",
        wedge: HOMEKEEP_WEDGE_CATALOG.air_purifier,
        vertical_launch_state: "LIVE",
        page_classification: "SAFE_BUYER_PATH_PROVEN",
        indexable_in_repo_policy: true,
        public_route: "/air-purifier/filter/winix-hepa-115115",
        current_page_state: "proven",
        retailer_row_state: "gated",
        evidence_files: [],
        supabase_safe_path_missing_from_csv: false,
        csv_safe_path_missing_from_supabase: false,
        recommended_next_safe_action: "none",
        owner_approval_required: false,
        mutation_authorized: false,
        rescue_priority_score: 0,
      },
    ],
    top_20_rescue_queue: [],
    easiest_rescue_slugs: [],
    requires_owner_browser_review_slugs: [],
    proven_facts: [],
    inferred_facts: [],
    unknown_facts: [],
    recommended_next_action: "mock",
  };
}

function mockParityFactory(): SupabaseCsvParityCoverageFactoryReportV1 {
  return {
    contract: "supabase_csv_parity_coverage_factory_v1",
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    csv_apply_authorized: false,
    generated_at: FIXED_NOW().toISOString(),
    source_command: "npm run buckparts:supabase-csv-parity-coverage-factory",
    supabase_diff_source_contract: "mock",
    supabase_truth_status: "PROVEN",
    parity_candidates_discovered: 1,
    ready_for_owner_review_count: 0,
    blocked_count: 1,
    expected_safe_buyer_path_proven_batch_delta: 0,
    candidate_packages: [
      {
        filter_slug: "4396710",
        candidate_status: "BLOCKED_POLICY",
        parity_diff_row: null,
        apply_plan: null,
        apply_plan_rel_path: null,
        apply_plan_md_rel_path: null,
        founder_decision_template_rel_path: null,
        execution_plan_rel_path: null,
        execution_plan: null,
        expected_census_delta: null,
        blockers: ["HARD_DO_NOT_USE"],
        hard_do_not_use_blocked: true,
      },
    ],
    proven_facts: [],
    inferred_facts: [],
    unknown_facts: [],
    recommended_next_action: "mock",
  };
}

test("coverage production sprint v2 ranks batches and proves +10 impossible with mock inputs", async () => {
  const first4Json = JSON.stringify({
    rows: [
      { slug: "edr4rxd1", owner_apply_review_ready: true, asin: "B00UB38V2A" },
      { slug: "4396508", owner_apply_review_ready: true, asin: "B00NXPKBQ2" },
      { slug: "edr3rxd1", owner_apply_review_ready: true, asin: "B087PDLZL9" },
    ],
  });
  const batchFactoryJson = JSON.stringify({
    cohort_summary: { eligible_now_count: 0, owner_browser_proof_candidate_count: 7 },
    validation_status: "VALIDATION_PARTIAL",
    apply_planning_allowed: false,
  });

  const report = await buildCoverageProductionSprintV2ReportV1({
    rootDir: process.cwd(),
    now: FIXED_NOW,
    census: mockCensus(48, 68),
    parityFactory: mockParityFactory(),
    fileExists: (abs) =>
      abs.endsWith("fridge-safe-link-rescue-first4-apply-review-v1.json") ||
      abs.endsWith("fridge-safe-link-batch-factory-v1.json"),
    readText: (abs) => {
      if (abs.endsWith("fridge-safe-link-rescue-first4-apply-review-v1.json")) return first4Json;
      if (abs.endsWith("fridge-safe-link-batch-factory-v1.json")) return batchFactoryJson;
      return "{}";
    },
  });

  assert.equal(report.contract, COVERAGE_PRODUCTION_SPRINT_V2_CONTRACT_V1);
  assert.equal(report.read_only, true);
  assert.equal(report.current_inventory.safe_buyer_path_proven_count, 48);
  assert.equal(report.plus_ten_executable_possible, false);
  assert.ok(report.plus_ten_impossibility_proof.length >= 3);
  assert.equal(report.largest_achievable_executable_delta, 2);
  assert.ok(report.ranked_production_batches.length >= 5);
  assert.equal(report.winning_batch?.batch_id, "fridge_safe_link_first4_deblocked");
  assert.equal(report.winning_batch?.expected_safe_buyer_path_proven_delta, 2);
  assert.equal(report.safe_to_commit_verdict, "SAFE_TO_COMMIT");
  assert.ok(
    report.bottlenecks_preventing_fifty_plus.some((b) => b.bottleneck_id === "evidence_desert"),
  );
});

test("coverage production sprint v2 live repo smoke", async () => {
  const report = await buildCoverageProductionSprintV2ReportV1({
    rootDir: process.cwd(),
    now: FIXED_NOW,
  });
  assert.equal(report.min_batch_target, COVERAGE_PRODUCTION_SPRINT_V2_MIN_BATCH_TARGET_V1);
  assert.ok(report.current_inventory.safe_buyer_path_proven_count >= 47);
  assert.ok(report.ranked_production_batches.length >= 4);
  assert.equal(report.excluded_slugs.includes("ukf8001"), true);
  const ukf = report.ranked_production_batches.flatMap((b) => b.target_slugs).includes("ukf8001");
  assert.equal(ukf, false);
});
