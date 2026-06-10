import assert from "node:assert/strict";
import test from "node:test";

import type { AllProductCensusProductRowV1, AllProductSafeBuyerPathCensusV1 } from "./all-product-safe-buyer-path-census-v1";
import {
  buildCustomerClosureReportV1,
  discoveryWithoutClosureRatioV1,
  isWithinDays,
  proveCustomerVisibleClosureV1,
} from "./customer-closure-report-v1";
import type { FridgeGuardedBatchCloseoutLearningLaneV1 } from "./fridge-guarded-batch-closeout-learning-command-center-v1";

const GENERATED_AT = "2026-06-10T12:00:00.000Z";

function censusProduct(
  slug: string,
  classification: AllProductCensusProductRowV1["page_classification"],
): AllProductCensusProductRowV1 {
  return {
    slug,
    wedge: "refrigerator_water",
    vertical_launch_state: "LIVE",
    page_classification: classification,
    indexable_in_repo_policy: true,
    public_route: `/filters/${slug}`,
    current_page_state: "INDEXABLE_BUY_READY",
    retailer_row_state: "safe_gated",
    evidence_files: [],
    supabase_safe_path_missing_from_csv: false,
    csv_safe_path_missing_from_supabase: false,
    recommended_next_safe_action: "none",
    owner_approval_required: false,
    mutation_authorized: false,
    rescue_priority_score: 10,
  };
}

function minimalCensus(
  products: AllProductCensusProductRowV1[],
): AllProductSafeBuyerPathCensusV1 {
  const counts = {
    SAFE_BUYER_PATH_PROVEN: 0,
    SAFE_BUYER_PATH_SUPPRESSED_TRUST: 0,
    NO_PRODUCT_PAGE_PROVEN: 0,
    NOINDEX_UNPROVEN: 0,
    UNKNOWN: 0,
  };
  for (const product of products) {
    counts[product.page_classification] += 1;
  }
  return {
    contract: "all_product_safe_buyer_path_census_v1",
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    recommended_jq_path: ".command_center_v2.all_product_safe_buyer_path_census_v1",
    source_command: "npm run buckparts:all-product-safe-buyer-path-census",
    generated_at: GENERATED_AT,
    exact_repo_paths_read: [],
    wedge_coverage: [],
    classification_counts: counts,
    products,
    top_20_rescue_queue: products.filter(
      (p) => p.page_classification === "SAFE_BUYER_PATH_SUPPRESSED_TRUST",
    ),
    easiest_rescue_slugs: [],
    requires_owner_browser_review_slugs: [],
    proven_facts: [],
    inferred_facts: [],
    unknown_facts: [],
    recommended_next_action: "none",
  };
}

function closeoutLane(): FridgeGuardedBatchCloseoutLearningLaneV1 {
  return {
    contract: "fridge_guarded_batch_closeout_learning_command_center_v1",
    read_only: true,
    data_mutation: false,
    recommended_jq_path: ".command_center_v2.fridge_guarded_batch_closeout_learning_v1",
    source_directory: "data/fridge/batch-production/closeout",
    lane_status: "OK",
    packet_count: 1,
    latest_packet_path: "data/fridge/batch-production/closeout/packet.json",
    latest_batch_digest: "abc",
    latest_post_apply_status: "APPLIED_PARITY_PROVEN",
    latest_lifecycle_state: "parity_verified",
    latest_repeat_write_lockout_status: "PROVEN",
    latest_learning_lane_candidate: false,
    latest_recommended_next_lifecycle_state: null,
    captured_lessons: [],
    candidate_count: 0,
    latest_candidate_lesson: null,
    candidate_learning_items: [],
    blockers: [],
    next_agent_action: "read-only",
    next_owner_action: "read-only",
    proven_facts: [],
    unknown_facts: [],
  };
}

test("discoveryWithoutClosureRatioV1 returns INFINITE when dispatch-ready with zero promoted", () => {
  assert.equal(
    discoveryWithoutClosureRatioV1({ DISPATCH_READY: 14, PROMOTED: 0 }),
    "INFINITE",
  );
  assert.equal(discoveryWithoutClosureRatioV1({ DISPATCH_READY: 4, PROMOTED: 2 }), 2);
});

test("proveCustomerVisibleClosureV1 requires closeout parity plus census SAFE_BUYER_PATH_PROVEN", () => {
  const proven = proveCustomerVisibleClosureV1({
    slug: "edr1rxd1",
    closeout: {
      slug: "edr1rxd1",
      packet_path: "data/fridge/batch-production/closeout/packet.json",
      packet_generated_at: GENERATED_AT,
      closed_at: GENERATED_AT,
      parity_status: "APPLIED_PARITY_PROVEN",
      parity_proven: true,
    },
    censusRow: censusProduct("edr1rxd1", "SAFE_BUYER_PATH_PROVEN"),
    publishabilityState: "PUBLISHABLE_BUY_READY",
    missionPromoted: false,
  });
  assert.equal(proven.customer_visible, true);
  assert.equal(proven.evidence_basis, "PROVEN");
  assert.ok(proven.proof_kinds.includes("closeout_artifact"));
  assert.ok(proven.proof_kinds.includes("census_reclassification"));

  const notProven = proveCustomerVisibleClosureV1({
    slug: "edr1rxd1",
    closeout: {
      slug: "edr1rxd1",
      packet_path: "data/fridge/batch-production/closeout/packet.json",
      packet_generated_at: GENERATED_AT,
      closed_at: GENERATED_AT,
      parity_status: "APPLIED_PARITY_PROVEN",
      parity_proven: true,
    },
    censusRow: censusProduct("edr1rxd1", "SAFE_BUYER_PATH_SUPPRESSED_TRUST"),
    publishabilityState: null,
    missionPromoted: false,
  });
  assert.equal(notProven.customer_visible, false);
  assert.equal(notProven.evidence_basis, "UNKNOWN");
});

test("proveCustomerVisibleClosureV1 does not invent closure from census alone", () => {
  const shipment = proveCustomerVisibleClosureV1({
    slug: "ukf8001",
    closeout: null,
    censusRow: censusProduct("ukf8001", "SAFE_BUYER_PATH_PROVEN"),
    publishabilityState: "PUBLISHABLE_BUY_READY",
    missionPromoted: false,
  });
  assert.equal(shipment.customer_visible, false);
  assert.equal(shipment.evidence_basis, "UNKNOWN");
});

test("isWithinDays respects 7-day window", () => {
  assert.equal(isWithinDays("2026-06-09T12:00:00.000Z", GENERATED_AT, 7), true);
  assert.equal(isWithinDays("2026-05-01T12:00:00.000Z", GENERATED_AT, 7), false);
});

test("buildCustomerClosureReportV1 counts PROVEN shipments from closeout packet fixtures", () => {
  const packet = JSON.stringify({
    contract: "fridge_buyer_path_batch_closeout_learning_packet_v1",
    read_only: true,
    data_mutation: false,
    generated_at: "2026-06-09T10:00:00.000Z",
    applied_slugs: ["edr1rxd1", "lt700p"],
    post_apply_parity: { status: "APPLIED_PARITY_PROVEN" },
  });
  const registry = JSON.stringify({
    closeout_complete: true,
    closed_at: "2026-06-09T11:00:00.000Z",
    proposed_slugs: ["edr1rxd1", "lt700p"],
  });

  const files = new Map<string, string>([
    [
      "/repo/data/fridge/batch-production/closeout/packet.json",
      packet,
    ],
    [
      "/repo/data/fridge/batch-production/run-registry/run.json",
      registry,
    ],
  ]);

  const lane = buildCustomerClosureReportV1({
    generated_at: GENERATED_AT,
    rootDir: "/repo",
    missionFactoryRegistry: {
      missions_by_state: { PROMOTED: 0, DISPATCH_READY: 2 } as never,
      active_missions: [],
    },
    closeoutLearning: closeoutLane(),
    rescueDeltaTrendSummary: {
      runtime_status: "OK",
      deltas: { safe_cta_links_delta: 2 },
      net_rescue_direction: "IMPROVING",
    },
    census: minimalCensus([
      censusProduct("edr1rxd1", "SAFE_BUYER_PATH_PROVEN"),
      censusProduct("lt700p", "SAFE_BUYER_PATH_SUPPRESSED_TRUST"),
    ]),
    publishability: {
      contract: "page_publishability_truth_summary_v1",
      read_only: true,
      data_mutation: false,
      runtime_status: "OK",
      page_kind: "refrigerator_filter",
      total_candidate_pages: 2,
      computable_semantic_count: 2,
      unknown_join_count: 0,
      distribution_page_state: {},
      distribution_publishability_state: {},
      distribution_automation_allowed: {},
      top_unknown_join_reasons: [],
      sample_rows: [
        {
          page_key: "refrigerator_filter:edr1rxd1",
          page_kind: "refrigerator_filter",
          filter_slug: "edr1rxd1",
          oem_token: "edr1rxd1",
          exists_in_catalog: true,
          indexable: true,
          page_state: "INDEXABLE_BUY_READY",
          publishability_state: "PUBLISHABLE_BUY_READY",
          cta: {
            safe_cta_link_count: 1,
            direct_buyable_link_count: 1,
            mapped_model_count: 1,
            buyer_path_state: "show_buy",
            buy_allowed: "allowed",
          },
          demand_signal: "present",
          click_signal: "absent",
          evidence_file_count: 0,
          evidence_tokens: [],
          quarantine: "none",
          affiliate_path: "known",
          revenue_path: "not_connected",
          automation_allowed: "read_only_only",
          next_safe_action: "none",
          proven_facts: [],
          unknown_facts: [],
        },
      ],
      proven_facts: [],
      unknown_facts: [],
    },
    recentEvidence: {
      status: "OK",
      evidence_rollup: {
        live_outcome_count: 3,
        unknown_outcome_count: 0,
        fail_hold_outcome_count: 0,
        unclassified_json_count: 0,
        recent_evidence_filenames: [],
      },
    },
    fileExists: (abs) => files.has(abs) || abs.endsWith("/closeout") || abs.endsWith("/run-registry"),
    readDir: (abs) => {
      if (abs.endsWith("/closeout")) return ["packet.json"];
      if (abs.endsWith("/run-registry")) return ["run.json"];
      return [];
    },
    readTextFile: (abs) => files.get(abs) ?? "",
  });

  assert.equal(lane.contract, "customer_closure_report_v1");
  assert.equal(lane.read_only, true);
  assert.equal(lane.data_mutation, false);
  assert.equal(lane.mutation_authorized, false);
  assert.equal(lane.customer_visible_closures_count, 1);
  assert.equal(lane.promoted_missions_count, 0);
  assert.ok(lane.closure_candidates_count >= 1);
  assert.equal(lane.pages_upgraded_this_week_status.status, "PROVEN");
  assert.equal(lane.pages_upgraded_this_week_status.count, 1);
  assert.equal(lane.discovery_without_closure_ratio, "INFINITE");
  assert.equal(lane.closure_confidence, "PROVEN");
  assert.ok(lane.source_lanes.includes("mission_factory_registry_v1"));
  assert.ok(lane.source_lanes.includes("recent_evidence"));
  const provenShipment = lane.customer_visible_shipments.find((s) => s.slug === "edr1rxd1");
  assert.ok(provenShipment);
  assert.equal(provenShipment.customer_visible, true);
});
