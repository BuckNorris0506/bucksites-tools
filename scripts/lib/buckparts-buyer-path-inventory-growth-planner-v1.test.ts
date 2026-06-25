import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import { HOMEKEEP_WEDGE_CATALOG } from "@/lib/catalog/identity";

import type { AllProductSafeBuyerPathCensusV1 } from "./all-product-safe-buyer-path-census-v1";
import {
  BUYER_PATH_INVENTORY_GROWTH_PLANNER_CONTRACT_V1,
  buildBuyerPathInventoryGrowthPlannerReportFromInputsV1,
  buildBuyerPathInventoryGrowthPlannerReportV1,
  buildGrowthPlannerQualityFollowOnV1,
  buildGrowthPlannerRankedWorkQueueV1,
  ccDemandOverrideActiveV1,
  classifyGrowthPlannerWinningStrategyV1,
  loadCommandCenterNbaSliceV1,
} from "./buckparts-buyer-path-inventory-growth-planner-v1";
import type { ReferenceabilityFactoryRunV1 } from "./referenceability-factory-run-v1";

const REPO_ROOT = process.cwd();
const FIXED_NOW = () => new Date("2026-06-10T12:00:00.000Z");

function mockCensus(overrides?: Partial<AllProductSafeBuyerPathCensusV1>): AllProductSafeBuyerPathCensusV1 {
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
        wedge: HOMEKEEP_WEDGE_CATALOG.air_purifier,
        vertical_slug: "air-purifier",
        vertical_launch_state: "LIVE",
        csv_inventory_source: "committed_csv",
        product_page_count: 50,
        safe_buyer_path_proven_count: 30,
        suppressed_trust_count: 20,
        noindex_unproven_count: 0,
        unknown_count: 0,
      },
      {
        wedge: HOMEKEEP_WEDGE_CATALOG.refrigerator_water,
        vertical_slug: "refrigerator_routes",
        vertical_launch_state: "LIVE",
        csv_inventory_source: "committed_csv",
        product_page_count: 100,
        safe_buyer_path_proven_count: 17,
        suppressed_trust_count: 49,
        noindex_unproven_count: 0,
        unknown_count: 0,
      },
    ],
    classification_counts: {
      SAFE_BUYER_PATH_PROVEN: 47,
      SAFE_BUYER_PATH_SUPPRESSED_TRUST: 69,
      NO_PRODUCT_PAGE_PROVEN: 0,
      NOINDEX_UNPROVEN: 0,
      UNKNOWN: 0,
    },
    products: [],
    top_20_rescue_queue: [
      {
        slug: "high-risk-slug",
        wedge: HOMEKEEP_WEDGE_CATALOG.refrigerator_water,
        vertical_launch_state: "LIVE",
        page_classification: "SAFE_BUYER_PATH_SUPPRESSED_TRUST",
        indexable_in_repo_policy: true,
        public_route: "/filter/high-risk-slug",
        current_page_state: "suppressed",
        retailer_row_state: "1 row",
        evidence_files: ["data/evidence/high-risk-slug.json"],
        supabase_safe_path_missing_from_csv: false,
        csv_safe_path_missing_from_supabase: false,
        recommended_next_safe_action: "browser reproof",
        owner_approval_required: true,
        mutation_authorized: false,
        rescue_priority_score: 300,
      },
      {
        slug: "safe-rescue-slug",
        wedge: HOMEKEEP_WEDGE_CATALOG.refrigerator_water,
        vertical_launch_state: "LIVE",
        page_classification: "SAFE_BUYER_PATH_SUPPRESSED_TRUST",
        indexable_in_repo_policy: true,
        public_route: "/filter/safe-rescue-slug",
        current_page_state: "suppressed",
        retailer_row_state: "1 row",
        evidence_files: ["data/evidence/safe.json"],
        supabase_safe_path_missing_from_csv: false,
        csv_safe_path_missing_from_supabase: false,
        recommended_next_safe_action: "apply",
        owner_approval_required: false,
        mutation_authorized: false,
        rescue_priority_score: 200,
      },
    ],
    easiest_rescue_slugs: [],
    requires_owner_browser_review_slugs: [],
    proven_facts: [],
    inferred_facts: [],
    unknown_facts: [],
    recommended_next_action: "Rescue queue #1: high-risk-slug",
    ...overrides,
  };
}

function mockPublicWedge() {
  return {
    contract: "public_wedge_readiness_and_easiest_wins_v1" as const,
    read_only: true as const,
    data_mutation: false as const,
    generated_at: FIXED_NOW().toISOString(),
    source_paths: [],
    wedge_rows: [],
    global_plan: {
      next_best_wedge_to_expand: HOMEKEEP_WEDGE_CATALOG.air_purifier,
      next_best_public_wedge_to_open_if_safe: "UNKNOWN" as const,
      next_10_easiest_truthful_expansion_targets: [
        {
          rank: 1,
          wedge: HOMEKEEP_WEDGE_CATALOG.refrigerator_water,
          target_kind: "brand_or_family" as const,
          target_id: "frigidaire",
          score: 95,
          reason: "proven family nucleus",
          requires_model_first: false,
        },
        {
          rank: 2,
          wedge: HOMEKEEP_WEDGE_CATALOG.air_purifier,
          target_kind: "filter_slug" as const,
          target_id: "levoit-core-300",
          score: 80,
          reason: "adjacent filter",
          requires_model_first: false,
        },
      ],
    },
    kpi_definitions: {} as never,
    kpi_snapshot: {
      proven_model_replacement_safe_buy_path_count: 120,
      safe_public_wedge_count: 2,
      unsafe_or_unknown_public_claim_count: 3,
      search_placeholder_debt_count: 200,
      mapping_unknown_count: 1,
    },
    proven_facts: [],
    inferred_facts: [],
    unknown_facts: [],
    recommended_next_action: "",
    truth_first_notes: [],
  };
}

test("read-only flags and no mutation authority", async () => {
  const report = buildBuyerPathInventoryGrowthPlannerReportFromInputsV1({
    census: mockCensus(),
    publicWedge: mockPublicWedge(),
    convergence: null,
    demand: null,
    cc: { present: false, next_best_action: null, source_path: null, rescues_demoted: false },
    marketingRisk: null,
    referenceability: null,
    generated_at: FIXED_NOW().toISOString(),
  });

  assert.equal(report.contract, BUYER_PATH_INVENTORY_GROWTH_PLANNER_CONTRACT_V1);
  assert.equal(report.read_only, true);
  assert.equal(report.data_mutation, false);
  assert.equal(report.mutation_authorized, false);
  assert.equal(report.supabase_writes, false);
  assert.equal(report.replaces_command_center, false);
});

test("AP EXPLICITLY_DIVERGED promotes parity-first G0 slice", () => {
  const { ranked, blocked } = buildGrowthPlannerRankedWorkQueueV1({
    census: mockCensus(),
    publicWedge: mockPublicWedge(),
    convergence: {
      state: "EXPLICITLY_DIVERGED",
      measurement: { gap_size: 6 },
    } as never,
    demand: null,
    cc: { present: false, next_best_action: null, source_path: null, rescues_demoted: false },
    marketingRisk: null,
  });

  assert.equal(ranked[0].strategy, "G0");
  assert.equal(ranked[0].wedge, HOMEKEEP_WEDGE_CATALOG.air_purifier);
  assert.ok(
    blocked.some(
      (b) =>
        b.slug === "levoit-core-300" ||
        blocked.some((x) => x.wedge === HOMEKEEP_WEDGE_CATALOG.air_purifier),
    ) ||
      ranked.some(
        (r) =>
          r.strategy === "F" &&
          r.wedge === HOMEKEEP_WEDGE_CATALOG.air_purifier &&
          r.blocking_facts.length > 0,
      ),
  );
});

test("referenceability work items are quality_only not inventory growth", () => {
  const ref: ReferenceabilityFactoryRunV1 = {
    contract: "referenceability_factory_run_v1",
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    artifact_write_authorized: false,
    source_command: "npm run buckparts:referenceability:factory",
    generated_at: FIXED_NOW().toISOString(),
    scoped_wedges: [HOMEKEEP_WEDGE_CATALOG.air_purifier, HOMEKEEP_WEDGE_CATALOG.refrigerator_water],
    census_contract: "all_product_safe_buyer_path_census_v1",
    eligible_packet_count: 1,
    skipped_row_count: 0,
    recommendation_count: 1,
    work_item_count: 5,
    packets: [],
    work_items: [
      {
        work_item_id: "wi:ap:foo:homeowner_comprehension",
        wedge: HOMEKEEP_WEDGE_CATALOG.air_purifier,
        slug: "foo",
        improvement_class: "homeowner_comprehension",
        recommendation_id: "r1",
        summary: "s",
        evidence: [],
        source: "s",
        expected_customer_value: "v",
        truth_risk: "LOW",
        validation_path: "p",
        permitted_action_class: "READ_ONLY_AUDIT",
        priority_score: 1,
        content_invention_required: false,
        public_route: "/air-purifier/filter/foo",
        read_only: true,
        data_mutation: false,
        mutation_authorized: false,
        artifact_write_authorized: false,
      },
    ],
    skipped_rows: [],
    proven_facts: [],
    unknown_facts: [],
  };

  const quality = buildGrowthPlannerQualityFollowOnV1(ref);
  assert.equal(quality[0].expected_inventory_effect, "quality_only");
  assert.ok(
    !quality.some((q) => q.expected_inventory_effect === ("+1" as never)),
  );

  const report = buildBuyerPathInventoryGrowthPlannerReportFromInputsV1({
    census: mockCensus(),
    publicWedge: mockPublicWedge(),
    convergence: null,
    demand: null,
    cc: { present: false, next_best_action: null, source_path: null, rescues_demoted: false },
    marketingRisk: null,
    referenceability: ref,
    generated_at: FIXED_NOW().toISOString(),
  });

  assert.ok(report.quality_follow_on.length > 0);
  assert.ok(
    report.ranked_work_queue.every((r) => r.expected_inventory_effect !== "quality_only"),
  );
  assert.ok(report.proven_facts.some((f) => f.includes("quality_only")));
});

test("HIGH wrong-part-risk rescue blocked in favor of family expansion", () => {
  const marketingRisk = new Map([
    [
      "high-risk-slug",
      { wrong_part_risk: "HIGH" as const, publishability_status: "DO_NOT_PUBLISH" as const },
    ],
    [
      "safe-rescue-slug",
      { wrong_part_risk: "LOW" as const, publishability_status: "OK_TO_PUBLISH" as const },
    ],
  ]);

  const { ranked, blocked } = buildGrowthPlannerRankedWorkQueueV1({
    census: mockCensus(),
    publicWedge: mockPublicWedge(),
    convergence: { state: "CONVERGED", measurement: { gap_size: 0 } } as never,
    demand: null,
    cc: { present: false, next_best_action: null, source_path: null, rescues_demoted: false },
    marketingRisk,
  });

  assert.ok(blocked.some((b) => b.slug === "high-risk-slug"));
  assert.ok(ranked.some((r) => r.strategy === "F"));
  const fIndex = ranked.findIndex((r) => r.strategy === "F");
  const rIndex = ranked.findIndex((r) => r.strategy === "R" && r.slug === "safe-rescue-slug");
  assert.ok(fIndex >= 0 && rIndex >= 0);
  assert.ok(fIndex < rIndex);
});

test("CC demand-to-coverage override blocks naive rescue ordering", () => {
  const cc = {
    present: true,
    next_best_action:
      "DEMAND-TO-COVERAGE [START_NEW_DEMAND_SELECTED_BATCH]: air_purifier batch planning",
    source_path: "data/command-center/customer-authority-history/2026-06-10.json",
    rescues_demoted: true,
  };

  assert.equal(ccDemandOverrideActiveV1(cc), true);

  const { ranked, blocked } = buildGrowthPlannerRankedWorkQueueV1({
    census: mockCensus(),
    publicWedge: mockPublicWedge(),
    convergence: { state: "CONVERGED", measurement: { gap_size: 0 } } as never,
    demand: {
      source_status: "PROVEN",
      recommended_next_action: "start batch",
      next_batch_candidate: "air_purifier_demand_selected_batch_candidate",
      next_wedge: HOMEKEEP_WEDGE_CATALOG.air_purifier,
      blockers: [],
    } as never,
    cc,
    marketingRisk: null,
  });

  assert.ok(ranked.some((r) => r.strategy === "C"));
  assert.ok(blocked.every((b) => b.block_reason.includes("demotes rescue") || b.strategy === "R"));
  assert.equal(ranked.some((r) => r.strategy === "R"), false);

  const classification = classifyGrowthPlannerWinningStrategyV1({
    proven_count: 47,
    suppressed_count: 69,
    wedges_with_proven_paths: 2,
    convergence_state: "CONVERGED",
    convergence_gap_size: 0,
    cc_nba: cc,
    demand_lane_source_status: "PROVEN",
    demand_recommended_action: "start",
    demand_next_batch_candidate: "batch",
    top_rescue_high_risk: true,
    family_expand_target_count: 2,
    referenceability_work_item_count: 0,
  });
  assert.equal(classification.strategy, "MIXED");
});

test("UNKNOWN when source artifacts missing", () => {
  const report = buildBuyerPathInventoryGrowthPlannerReportFromInputsV1({
    census: mockCensus({
      wedge_coverage: [],
      classification_counts: {
        SAFE_BUYER_PATH_PROVEN: 0,
        SAFE_BUYER_PATH_SUPPRESSED_TRUST: 0,
        NO_PRODUCT_PAGE_PROVEN: 0,
        NOINDEX_UNPROVEN: 0,
        UNKNOWN: 5,
      },
      top_20_rescue_queue: [],
    }),
    publicWedge: null,
    convergence: null,
    demand: null,
    cc: { present: false, next_best_action: null, source_path: null, rescues_demoted: false },
    marketingRisk: null,
    referenceability: null,
    generated_at: FIXED_NOW().toISOString(),
  });

  assert.ok(report.unknown_facts.length >= 3);
  assert.ok(
    report.strategy_classification.current_winning_strategy === "UNKNOWN" ||
      report.strategy_classification.condition_classes.length === 0,
  );
});

test("deterministic output with injected inputs", () => {
  const inputs = {
    census: mockCensus(),
    publicWedge: mockPublicWedge(),
    convergence: { state: "EXPLICITLY_DIVERGED", measurement: { gap_size: 6 } } as never,
    demand: null,
    cc: {
      present: true,
      next_best_action: "DEMAND-TO-COVERAGE [START_NEW_DEMAND_SELECTED_BATCH]",
      source_path: "data/command-center/customer-authority-history/2026-06-10.json",
      rescues_demoted: true,
    },
    marketingRisk: new Map([
      ["high-risk-slug", { wrong_part_risk: "HIGH" as const, publishability_status: "DO_NOT_PUBLISH" as const }],
    ]),
    referenceability: null,
    generated_at: FIXED_NOW().toISOString(),
  };

  const a = buildBuyerPathInventoryGrowthPlannerReportFromInputsV1(inputs);
  const b = buildBuyerPathInventoryGrowthPlannerReportFromInputsV1(inputs);
  assert.deepEqual(
    a.ranked_work_queue.map((r) => `${r.strategy}:${r.slug ?? r.family}`),
    b.ranked_work_queue.map((r) => `${r.strategy}:${r.slug ?? r.family}`),
  );
});

test("package.json wires buyer path inventory growth planner CLI", () => {
  const pkg = JSON.parse(readFileSync(path.join(REPO_ROOT, "package.json"), "utf8")) as {
    scripts: Record<string, string>;
  };
  assert.ok(pkg.scripts["buckparts:buyer-path-inventory-growth-planner"]);
});

test("loadCommandCenterNbaSliceV1 reads customer authority history", () => {
  const slice = loadCommandCenterNbaSliceV1(REPO_ROOT);
  if (slice.present) {
    assert.ok(slice.next_best_action);
    assert.ok(slice.source_path?.includes("customer-authority-history"));
  }
});

test("live integration produces ranked queue", async () => {
  const report = await buildBuyerPathInventoryGrowthPlannerReportV1({
    rootDir: REPO_ROOT,
    now: FIXED_NOW,
  });
  assert.ok(report.ranked_work_queue.length > 0);
  assert.ok(report.current_inventory.safe_buyer_path_proven_count > 0);
  assert.ok(
    ["R", "C", "F", "MIXED", "BLOCKED", "UNKNOWN"].includes(
      report.strategy_classification.current_winning_strategy,
    ),
  );
});
