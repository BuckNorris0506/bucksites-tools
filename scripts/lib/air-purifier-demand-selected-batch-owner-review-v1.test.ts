import assert from "node:assert/strict";
import test from "node:test";

import { HOMEKEEP_WEDGE_CATALOG } from "@/lib/catalog/identity";

import {
  buildAirPurifierDemandSelectedBatchOwnerReviewLaneV1,
  AP_RETAILER_LINKS_CSV_REL_V1,
} from "./air-purifier-demand-selected-batch-owner-review-v1";
import {
  buildDemandToCoverageNextLaneUnknownV1,
  type DemandToCoverageNextLaneReportV1,
} from "./demand-to-coverage-next-lane-v1";

const fixedNow = () => new Date("2026-06-01T12:00:00.000Z");
const AP_LINKS_CSV = `filter_slug,retailer_name,affiliate_url,is_primary,retailer_key,retailer_slug,destination_url,browser_truth_classification,browser_truth_notes,browser_truth_checked_at
levoit-rf-rar029,OEM / manufacturer catalog (keyword lookup),https://levoit.com/search?q=LEVOIT-RF-RAR029,true,oem-catalog,oem-catalog,https://levoit.com/search?q=LEVOIT-RF-RAR029,,,
levoit-rf-rar040,OEM / manufacturer catalog (keyword lookup),https://levoit.com/search?q=LEVOIT-RF-RAR040,true,oem-catalog,oem-catalog,https://levoit.com/search?q=LEVOIT-RF-RAR040,,,
`;

function apDemandReportFixture(): DemandToCoverageNextLaneReportV1 {
  const base = buildDemandToCoverageNextLaneUnknownV1({ now: fixedNow, reason: "fixture" });
  return {
    ...base,
    runtime_status: "PROVEN",
    source_status: "PROVEN",
    recommended_wedge: HOMEKEEP_WEDGE_CATALOG.air_purifier,
    recommendation_status: "START_NEW_DEMAND_SELECTED_BATCH",
    recommended_next_action:
      "Start a demand-selected air_purifier buyer-path batch candidate only after owner approval; no open batch is proven by this report.",
    next_action:
      "Start a demand-selected air_purifier buyer-path batch candidate only after owner approval; no open batch is proven by this report.",
    next_lane: "air_purifier_buyer_path_coverage",
    next_wedge: HOMEKEEP_WEDGE_CATALOG.air_purifier,
    next_batch_candidate: "air_purifier_demand_selected_batch_candidate",
    blockers: ["open_batch_not_proven"],
    top_queries: [
      { key: "air purifier filter replacement", impressions: 28, clicks: 1, ctr: 0.035 },
      { key: "he15fkpet", impressions: 14, clicks: 0, ctr: 0 },
    ],
    wedge_rows: [
      {
        wedge: HOMEKEEP_WEDGE_CATALOG.air_purifier,
        vertical_slug: "air-purifier",
        impressions: 221,
        clicks: 3,
        top_pages: [
          "https://buckparts.com/air-purifier",
          "https://buckparts.com/air-purifier/model/shark-hp150",
        ],
        launch_state: "LIVE",
        sitemap_url_count: 2,
        live_filter_count: 37,
        retailer_link_count: 80,
        blocked_link_count: 58,
        safe_cta_count: 10,
        coverage_gap_summary: "58 blocked/search-placeholder retailer links",
        recommended_action:
          "Start a demand-selected air_purifier buyer-path batch candidate only after owner approval.",
        priority_score: 236.6,
      },
    ],
    coverage_gap: {
      highest_demand_wedge: HOMEKEEP_WEDGE_CATALOG.air_purifier,
      highest_blocked_wedge: HOMEKEEP_WEDGE_CATALOG.air_purifier,
      active_batch_wedge: HOMEKEEP_WEDGE_CATALOG.refrigerator_water,
      gap_rationale: "air_purifier priority_score=236.6",
    },
    proven_facts: [
      "demand_to_coverage_next_lane_v1 is read_only=true and data_mutation=false.",
      "Recommended wedge is air_purifier.",
    ],
    unknown_facts: ["No active/open batch registry is read by demand_to_coverage_next_lane_v1."],
  };
}

test("AP demand-selected owner review lane is read-only and mutation-blocked", () => {
  const lane = buildAirPurifierDemandSelectedBatchOwnerReviewLaneV1({
    rootDir: "/fixture-root",
    demandToCoverageNextLane: apDemandReportFixture(),
    fileExists: (abs) => abs.endsWith(AP_RETAILER_LINKS_CSV_REL_V1),
    readTextFile: () => AP_LINKS_CSV,
  });

  assert.equal(lane.contract, "air_purifier_demand_selected_batch_owner_review_v1");
  assert.equal(lane.read_only, true);
  assert.equal(lane.data_mutation, false);
  assert.equal(lane.recommended_wedge, HOMEKEEP_WEDGE_CATALOG.air_purifier);
  assert.equal(lane.source_recommendation_status, "START_NEW_DEMAND_SELECTED_BATCH");
  assert.equal(lane.next_lane, "air_purifier_buyer_path_coverage");
  assert.equal(lane.next_wedge, HOMEKEEP_WEDGE_CATALOG.air_purifier);
  assert.equal(lane.next_batch_candidate, "air_purifier_demand_selected_batch_candidate");
  assert.equal(lane.owner_approval_required, true);
  assert.equal(lane.batch_start_authorized, false);
  assert.equal(lane.csv_apply_authorized, false);
  assert.equal(lane.supabase_mutation_authorized, false);
  assert.equal(lane.evidence_write_authorized, false);
  assert.equal(lane.netlify_api_authorized, false);
  assert.equal(lane.public_ui_mutation_authorized, false);
  assert.equal(lane.demand_proof.air_purifier_impressions, 221);
  assert.equal(lane.demand_proof.air_purifier_priority_score, 236.6);
  assert.equal(lane.demand_proof.safe_cta_count, 10);
  assert.equal(lane.demand_proof.blocked_link_count, 58);
  assert.equal(lane.candidate_rows_status, "PROVEN");
  assert.equal(lane.candidate_rows.length, 2);
  assert.ok(lane.blockers.includes("open_batch_not_proven"));
  assert.ok(lane.blockers.includes("owner_batch_start_approval_missing"));
  assert.ok(lane.blockers.includes("batch_run_registry_not_created"));
  assert.ok(lane.blockers.includes("evidence_collection_not_started"));
  assert.match(lane.next_agent_action, /do not start a batch/i);
});

test("AP owner review lane degrades safely when demand source is UNKNOWN", () => {
  const lane = buildAirPurifierDemandSelectedBatchOwnerReviewLaneV1({
    rootDir: "/fixture-root",
    demandToCoverageNextLane: buildDemandToCoverageNextLaneUnknownV1({
      now: fixedNow,
      reason: "fixture demand missing",
    }),
    fileExists: () => false,
    readTextFile: () => "",
  });

  assert.equal(lane.read_only, true);
  assert.equal(lane.data_mutation, false);
  assert.equal(lane.recommended_wedge, "UNKNOWN");
  assert.equal(lane.source_recommendation_status, "UNKNOWN");
  assert.equal(lane.batch_start_authorized, false);
  assert.equal(lane.csv_apply_authorized, false);
  assert.equal(lane.supabase_mutation_authorized, false);
  assert.equal(lane.evidence_write_authorized, false);
  assert.equal(lane.netlify_api_authorized, false);
  assert.equal(lane.public_ui_mutation_authorized, false);
  assert.equal(lane.candidate_rows_status, "UNKNOWN");
  assert.deepEqual(lane.candidate_rows, []);
  assert.ok(lane.blockers.includes("source_demand_to_coverage_not_ap_start_candidate"));
  assert.ok(lane.unknown_facts.some((fact) => fact.includes("fixture demand missing")));
});
