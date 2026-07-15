import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";

import { HOMEKEEP_WEDGE_CATALOG } from "@/lib/catalog/identity";

import type { AirPurifierBatchProductionLaneReportV1 } from "./air-purifier-batch-production-lane-v1";
import { buildAirPurifierBatchProductionLaneV1Report } from "./air-purifier-batch-production-lane-v1";
import {
  buildAirPurifierDemandSelectedBatchOwnerReviewLaneV1,
  candidateRowsFromBatchProductionLaneV1,
} from "./air-purifier-demand-selected-batch-owner-review-v1";
import type { ApDemandSelectedBatchRunRegistryVisibilityV1 } from "./ap-demand-selected-batch-run-registry-v1";
import {
  loadApOwnerReviewEvidenceIndexV1,
  type ApOwnerReviewEvidenceIndexV1,
} from "./air-purifier-owner-review-evidence-index-v1";
import {
  buildDemandToCoverageNextLaneUnknownV1,
  type DemandToCoverageNextLaneReportV1,
} from "./demand-to-coverage-next-lane-v1";

const REPO_ROOT = process.cwd();
const fixedNow = () => new Date("2026-06-01T12:00:00.000Z");

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

function batchProductionFixture(): AirPurifierBatchProductionLaneReportV1 {
  const emptyCounts = Object.fromEntries(
    [
      "existing_direct_buyable",
      "existing_official_reference",
      "direct_buy_candidate",
      "reference_candidate",
      "search_placeholder_rescue_needed",
      "catalog_identity_gap",
      "alias_or_redirect_gap",
      "wrong_family_reject",
      "owner_review",
      "no_safe_path_yet",
    ].map((state) => [state, 0]),
  ) as AirPurifierBatchProductionLaneReportV1["state_counts"];

  return {
    report_name: "air_purifier_batch_production_lane_v1",
    read_only: true,
    data_mutation: false,
    generated_at: fixedNow().toISOString(),
    source_status: "PROVEN",
    candidate_count: 4,
    state_counts: emptyCounts,
    top_candidates: [
      {
        rank: 1,
        filter_slug: "blueair-particle-411",
        brand_slug: "blueair",
        oem_part_number: "BLUEAIR-PART411",
        state: "catalog_identity_gap",
        priority_score: 168,
        gsc_impressions: 10,
        gsc_queries: [],
        compat_model_count: 3,
        primary_retailer_key: "oem-catalog",
        primary_url: "https://www.blueair.com/us/search?q=BLUEAIR-PART411",
        gate_failure: "search_placeholder",
        browser_truth_classification: null,
        pattern: "blueair_catalog_identity",
        rationale: "F4MAX vs PART411 identity split",
        proof_required: "Resolve F4MAX catalog row + compat",
        allowed_future_mutations: [],
        reject_rules: [],
      },
      {
        rank: 2,
        filter_slug: "holmes-hapf30",
        brand_slug: "holmes",
        oem_part_number: "HOLMES-HAPF30",
        state: "search_placeholder_rescue_needed",
        priority_score: 81,
        gsc_impressions: 0,
        gsc_queries: [],
        compat_model_count: 30,
        primary_retailer_key: "oem-catalog",
        primary_url: "https://www.holmesproducts.com/search?q=HOLMES-HAPF30",
        gate_failure: "search_placeholder",
        browser_truth_classification: null,
        pattern: "oem_search_placeholder_discovery",
        rationale: "Only manufacturer search URL",
        proof_required: "Discover official PDP",
        allowed_future_mutations: [],
        reject_rules: [],
      },
      {
        rank: 3,
        filter_slug: "shark-carbon-foam",
        brand_slug: "shark",
        oem_part_number: "SHARK-CARBON-FOAM",
        state: "search_placeholder_rescue_needed",
        priority_score: 63,
        gsc_impressions: 0,
        gsc_queries: [],
        compat_model_count: 20,
        primary_retailer_key: "oem-catalog",
        primary_url: "https://www.sharkclean.com/search?q=SHARK-CARBON-FOAM",
        gate_failure: "search_placeholder",
        browser_truth_classification: null,
        pattern: "oem_search_placeholder_discovery",
        rationale: "Only manufacturer search URL",
        proof_required: "Discover official PDP",
        allowed_future_mutations: [],
        reject_rules: [],
      },
      {
        rank: 15,
        filter_slug: "levoit-rf-rar029",
        brand_slug: "levoit",
        oem_part_number: "LEVOIT-RF-RAR029",
        state: "wrong_family_reject",
        priority_score: 36,
        gsc_impressions: 0,
        gsc_queries: [],
        compat_model_count: 1,
        primary_retailer_key: "oem-catalog",
        primary_url: "https://levoit.com/search?q=LEVOIT-RF-RAR029",
        gate_failure: "search_placeholder",
        browser_truth_classification: null,
        pattern: "levoit_oem_discovery",
        rationale: "Pilot proof: wrong-family Amazon or OEM mismatch",
        proof_required: "Exact OEM token on PDP",
        allowed_future_mutations: [],
        reject_rules: [],
      },
    ],
    agent_work_packets: [],
    catalog_identity_gaps: [],
    reference_link_candidates: [],
    direct_buy_candidates: [],
    blocked_or_rejected: [],
    notes: [],
  };
}

function evidenceIndexFixture(): ApOwnerReviewEvidenceIndexV1 {
  return {
    source_status: "PROVEN",
    excluded_slugs: ["shark-carbon-foam"],
    entries_by_slug: new Map([
      [
        "shark-carbon-foam",
        {
          filter_slug: "shark-carbon-foam",
          disposition: "exclude_no_safe_path",
          agent_decision: "NO_SAFE_PATH",
          agent_review_group: "no_safe_path",
          model_first_mapping_review_required: true,
          promote_pass_reference: false,
          hold_needs_owner_review: false,
          exclude_from_owner_review: true,
          rationale: "Agent evidence NO_SAFE_PATH (fixture).",
          source_files: ["fixture/ap-oem-search-placeholder-v1.results.json"],
        },
      ],
      [
        "holmes-hapf30",
        {
          filter_slug: "holmes-hapf30",
          disposition: "promote_pass_reference",
          agent_decision: "PASS_REFERENCE",
          agent_review_group: "reference_eligible",
          model_first_mapping_review_required: false,
          promote_pass_reference: true,
          hold_needs_owner_review: false,
          exclude_from_owner_review: false,
          rationale: "Agent evidence PASS_REFERENCE with recommended_csv_mutation (fixture).",
          source_files: ["fixture/ap-oem-search-placeholder-v1.results.json"],
        },
      ],
    ]),
  };
}

test("candidateRowsFromBatchProductionLaneV1 excludes NO_SAFE_PATH evidence and promotes PASS_REFERENCE rows", () => {
  const projected = candidateRowsFromBatchProductionLaneV1(batchProductionFixture(), {
    evidenceIndex: evidenceIndexFixture(),
  });
  assert.equal(projected.status, "PROVEN");
  assert.equal(projected.rows.length, 2);
  assert.deepEqual(
    projected.rows.map((row) => row.filter_slug),
    ["blueair-particle-411", "holmes-hapf30"],
  );
  assert.equal(projected.rows[0]?.rank, 1);
  assert.equal(projected.rows[0]?.priority_score, 168);
  assert.equal(projected.rows[0]?.state, "catalog_identity_gap");
  assert.equal(projected.rows[0]?.owner_review_required, true);
  assert.equal(projected.rows[1]?.evidence_disposition, "promote_pass_reference");
  assert.ok(!projected.rows.some((row) => row.filter_slug === "levoit-rf-rar029"));
  assert.ok(!projected.rows.some((row) => row.filter_slug === "shark-carbon-foam"));
  assert.equal(projected.excluded_rows[0]?.filter_slug, "shark-carbon-foam");
  assert.equal(projected.rows[0]?.source_report, "air_purifier_batch_production_lane_v1");
});

test("AP demand-selected owner review lane is read-only and mutation-blocked", async () => {
  const lane = await buildAirPurifierDemandSelectedBatchOwnerReviewLaneV1({
    rootDir: "/fixture-root",
    demandToCoverageNextLane: apDemandReportFixture(),
    batchProductionLane: batchProductionFixture(),
    evidenceIndex: evidenceIndexFixture(),
  });

  assert.equal(lane.contract, "air_purifier_demand_selected_batch_owner_review_v1");
  assert.equal(lane.read_only, true);
  assert.equal(lane.data_mutation, false);
  assert.equal(lane.source_batch_production_report, "air_purifier_batch_production_lane_v1");
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
  assert.equal(lane.candidate_rows[0]?.filter_slug, "blueair-particle-411");
  assert.ok(lane.candidate_selection_logic.some((line) => line.includes("evidence-aware ranking")));
  assert.ok(lane.blockers.includes("open_batch_not_proven"));
  assert.ok(lane.blockers.includes("owner_batch_start_approval_missing"));
  assert.ok(lane.blockers.includes("batch_run_registry_not_created"));
  assert.ok(lane.blockers.includes("evidence_collection_not_started"));
  assert.match(lane.next_agent_action, /do not start a batch/i);
});

test("AP owner review lane detects demand-selected run registry when present", async () => {
  const registryFixture: ApDemandSelectedBatchRunRegistryVisibilityV1 = {
    status: "PROVEN",
    run_registry_rel_path:
      "data/air-purifier/batch-production/run-registry/ap-demand-selected-batch-run-v1-2026-06-23.json",
    run_id: "ap-demand-selected-batch-run-v1-2026-06-23",
    stage: "evidence_collection_planned",
    batch_start_mode: "read_only_evidence_planning_only",
    proposed_slug_count: 10,
    excluded_slug_count: 1,
    read_only_evidence_collection_authorized: false,
    owner_approval_artifact_rel_path: null,
    evidence_collection_started: false,
    parse_error: null,
  };

  const lane = await buildAirPurifierDemandSelectedBatchOwnerReviewLaneV1({
    rootDir: REPO_ROOT,
    demandToCoverageNextLane: apDemandReportFixture(),
    batchProductionLane: batchProductionFixture(),
    evidenceIndex: {
      source_status: "PROVEN",
      entries_by_slug: new Map(),
      excluded_slugs: [],
    },
    loadDemandSelectedRunRegistry: () => registryFixture,
  });

  assert.equal(lane.batch_run_registry.status, "PROVEN");
  assert.equal(lane.batch_run_registry.run_id, "ap-demand-selected-batch-run-v1-2026-06-23");
  assert.equal(lane.batch_run_registry.stage, "evidence_collection_planned");
  assert.equal(lane.batch_run_registry.batch_start_mode, "read_only_evidence_planning_only");
  assert.equal(lane.batch_run_registry.proposed_slug_count, 10);
  assert.equal(lane.batch_run_registry.excluded_slug_count, 1);
  assert.ok(!lane.blockers.includes("batch_run_registry_not_created"));
  assert.equal(lane.batch_start_authorized, false);
  assert.equal(lane.csv_apply_authorized, false);
  assert.equal(lane.evidence_write_authorized, false);
});

test("AP owner review lane clears owner_batch_start_approval_missing when read-only evidence collection is authorized", async () => {
  const registryFixture: ApDemandSelectedBatchRunRegistryVisibilityV1 = {
    status: "PROVEN",
    run_registry_rel_path:
      "data/air-purifier/batch-production/run-registry/ap-demand-selected-batch-run-v1-2026-06-23.json",
    run_id: "ap-demand-selected-incomplete-fixture-run",
    stage: "read_only_evidence_collection_authorized",
    batch_start_mode: "read_only_browser_discovery_only",
    proposed_slug_count: 10,
    excluded_slug_count: 1,
    read_only_evidence_collection_authorized: true,
    owner_approval_artifact_rel_path:
      "data/owner-decisions/ap-demand-selected-batch-read-only-evidence-collection-approval-v1.json",
    evidence_collection_started: false,
    parse_error: null,
  };

  const lane = await buildAirPurifierDemandSelectedBatchOwnerReviewLaneV1({
    rootDir: REPO_ROOT,
    demandToCoverageNextLane: apDemandReportFixture(),
    batchProductionLane: batchProductionFixture(),
    evidenceIndex: {
      source_status: "PROVEN",
      entries_by_slug: new Map(),
      excluded_slugs: [],
    },
    loadDemandSelectedRunRegistry: () => registryFixture,
  });

  assert.ok(!lane.blockers.includes("owner_batch_start_approval_missing"));
  assert.ok(lane.blockers.includes("evidence_collection_not_started"));
  assert.equal(lane.batch_start_authorized, false);
  assert.equal(lane.evidence_completeness_v1.status, "INCOMPLETE");
  assert.match(lane.next_agent_action, /Evidence incomplete/i);
  assert.match(lane.next_agent_action, /missing_slug:|Missing:|hyperagent-chat-discovery/i);
});

test("AP owner review lane clears open_batch_not_proven when registry is PROVEN_OPEN with evidence started", async () => {
  const registryFixture: ApDemandSelectedBatchRunRegistryVisibilityV1 = {
    status: "PROVEN",
    run_registry_rel_path:
      "data/air-purifier/batch-production/run-registry/ap-demand-selected-batch-run-v1-2026-06-23.json",
    run_id: "ap-demand-selected-batch-run-v1-2026-06-23",
    stage: "read_only_evidence_collection_complete",
    batch_start_mode: "read_only_browser_discovery_only",
    proposed_slug_count: 10,
    excluded_slug_count: 1,
    read_only_evidence_collection_authorized: true,
    owner_approval_artifact_rel_path:
      "data/owner-decisions/ap-demand-selected-batch-read-only-evidence-collection-approval-v1.json",
    evidence_collection_started: true,
    parse_error: null,
  };

  const lane = await buildAirPurifierDemandSelectedBatchOwnerReviewLaneV1({
    rootDir: REPO_ROOT,
    demandToCoverageNextLane: {
      ...apDemandReportFixture(),
      blockers: [],
      unknown_facts: [],
    },
    batchProductionLane: batchProductionFixture(),
    evidenceIndex: {
      source_status: "PROVEN",
      entries_by_slug: new Map(),
      excluded_slugs: [],
    },
    loadDemandSelectedRunRegistry: () => registryFixture,
  });

  assert.ok(!lane.blockers.includes("open_batch_not_proven"));
  assert.ok(!lane.blockers.some((blocker) => blocker.includes("open_batch_not_proven")));
  assert.equal(lane.open_batch_proof_v1.open_batch_existence, "PROVEN");
  assert.equal(lane.open_batch_proof_v1.batch_closeout, "NOT_PROVEN");
  assert.equal(lane.open_batch_proof_v1.apply_readiness, "NOT_PROVEN");
  assert.equal(lane.batch_start_authorized, false);
  assert.equal(lane.csv_apply_authorized, false);
  assert.equal(lane.evidence_write_authorized, false);
  assert.equal(lane.evidence_completeness_v1.status, "COMPLETE");
  assert.match(lane.next_agent_action, /already complete/i);
  assert.match(lane.next_agent_action, /closeout-readiness-proof/i);
  assert.doesNotMatch(lane.next_agent_action, /Run read-only HyperAgent chat discovery/i);
});

test("AP owner review lane degrades safely when demand source is UNKNOWN", async () => {
  const lane = await buildAirPurifierDemandSelectedBatchOwnerReviewLaneV1({
    rootDir: "/fixture-root",
    demandToCoverageNextLane: buildDemandToCoverageNextLaneUnknownV1({
      now: fixedNow,
      reason: "fixture demand missing",
    }),
    batchProductionLane: {
      ...batchProductionFixture(),
      source_status: "UNKNOWN",
    },
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

test("live repo owner-review candidates are evidence-aware and exclude shark-carbon-foam", async () => {
  const batchLane = await buildAirPurifierBatchProductionLaneV1Report({
    rootDir: REPO_ROOT,
    loadGscArtifact: async () => ({
      ok: true as const,
      artifact: {
        status: "OK",
        total_impressions: 289,
        total_clicks: 3,
        top_pages_by_impressions: [
          {
            key: "https://buckparts.com/air-purifier/filter/blueair-f4max-411",
            impressions: 10,
            clicks: 0,
            ctr: 0,
            average_position: 4.9,
          },
        ],
        top_queries_by_impressions: [],
      },
      source: "test_fixture",
    }),
  });
  const evidenceIndex = loadApOwnerReviewEvidenceIndexV1({ rootDir: REPO_ROOT });

  const lane = await buildAirPurifierDemandSelectedBatchOwnerReviewLaneV1({
    rootDir: REPO_ROOT,
    demandToCoverageNextLane: apDemandReportFixture(),
    batchProductionLane: batchLane,
    evidenceIndex,
  });

  assert.equal(lane.candidate_rows_status, "PROVEN");
  assert.ok(lane.candidate_rows.length > 0);
  assert.ok(
    lane.candidate_rows[0]?.filter_slug === "holmes-hapf30" ||
      lane.candidate_rows[0]?.filter_slug === "blueair-particle-411",
    `unexpected top candidate: ${lane.candidate_rows[0]?.filter_slug ?? "none"}`,
  );
  assert.ok(!lane.candidate_rows.some((row) => row.filter_slug === "levoit-rf-rar029"));
  assert.ok(!lane.candidate_rows.some((row) => row.filter_slug === "shark-carbon-foam"));
  assert.ok(lane.candidate_rows.some((row) => row.filter_slug === "holmes-hapf30"));
  const sharkHp100Row = lane.candidate_rows.find((row) => row.filter_slug === "shark-hepa-hp100");
  if (sharkHp100Row) {
    assert.equal(sharkHp100Row.evidence_disposition, "hold_needs_owner_review");
    assert.equal(sharkHp100Row.owner_review_required, true);
  }

  const winixCarbon = lane.candidate_rows.find((row) => row.filter_slug === "winix-carbon-116131");
  if (winixCarbon) {
    assert.equal(winixCarbon.owner_review_required, true);
    assert.equal(winixCarbon.evidence_disposition, "hold_needs_owner_review");
  }

  const levoitRowCount = lane.candidate_rows.filter((row) => row.pattern === "levoit_oem_discovery").length;
  assert.ok(levoitRowCount <= 2);

  assert.ok(
    lane.proven_facts.some((fact) => fact.includes("evidence-aware ranking")),
  );
});

test("live repo projection excludes wrong_family_reject from owner-review rows", async () => {
  const batchLane = await buildAirPurifierBatchProductionLaneV1Report({ rootDir: REPO_ROOT });
  const projected = candidateRowsFromBatchProductionLaneV1(batchLane, {
    evidenceIndex: loadApOwnerReviewEvidenceIndexV1({ rootDir: REPO_ROOT }),
  });
  assert.ok(!projected.rows.some((row) => row.state === "wrong_family_reject"));
  assert.ok(!projected.rows.some((row) => row.filter_slug === "levoit-rf-rar029"));
});

test("live repo withholds shark-hepa-hp100 promotion when batch-v3 withholds stale PASS_REFERENCE", () => {
  const evidenceIndex = loadApOwnerReviewEvidenceIndexV1({ rootDir: REPO_ROOT });
  const holmes = evidenceIndex.entries_by_slug.get("holmes-hapf30");
  assert.ok(holmes);
  assert.equal(holmes.promote_pass_reference, true);

  const sharkHp100 = evidenceIndex.entries_by_slug.get("shark-hepa-hp100");
  assert.ok(sharkHp100);
  assert.equal(sharkHp100.promote_pass_reference, false);
  assert.equal(sharkHp100.hold_needs_owner_review, true);
  assert.match(sharkHp100.rationale, /batch-v3 withholds stale PASS_REFERENCE promotion/i);
  assert.ok(
    sharkHp100.source_files.includes(
      "data/air-purifier/batch-production/agent-results/ap-oem-search-placeholder-v1.results.json",
    ),
  );
});
