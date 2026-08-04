import assert from "node:assert/strict";
import test from "node:test";

import type { DemandToCoverageNextLaneReportV1 } from "./demand-to-coverage-next-lane-v1";
import type { ExternalMeasurementFreshnessV1 } from "./buckparts-command-center-v2-types";
import {
  buildPhase4DemandCaptureUnknownV1,
  buildPhase4DemandCaptureV1,
  PHASE4_DEMAND_CAPTURE_CC_JQ_PATH_V1,
  PHASE4_DEMAND_CAPTURE_CONTRACT_V1,
  type Phase4DemandCaptureSearchClickInputV1,
} from "./buckparts-phase4-demand-capture-v1";

const NOW = () => new Date("2026-07-24T18:00:00.000Z");

function demandFixture(
  overrides: Partial<DemandToCoverageNextLaneReportV1> = {},
): DemandToCoverageNextLaneReportV1 {
  return {
    contract: "demand_to_coverage_next_lane_v1",
    report_name: "buckparts_demand_to_coverage_next_lane_v1",
    read_only: true,
    data_mutation: false,
    generated_at: "2026-07-24T17:05:00.000Z",
    runtime_status: "PROVEN",
    source_status: "PROVEN",
    recommended_wedge: "refrigerator_water",
    recommendation_status: "START_NEW_DEMAND_SELECTED_BATCH",
    recommended_next_action: "fixture",
    next_lane: "refrigerator_water_demand_selected",
    next_wedge: "refrigerator_water",
    next_batch_candidate: "fixture",
    blockers: [],
    proof_sources: [],
    wedge_rows: [],
    top_pages: [],
    top_queries: [],
    coverage_gap: {
      highest_demand_wedge: "refrigerator_water",
      highest_blocked_wedge: "refrigerator_water",
      active_batch_wedge: "refrigerator_water",
      gap_rationale: "fixture",
    },
    next_action: "fixture",
    notes: [],
    proven_facts: [],
    inferred_facts: [],
    unknown_facts: [],
    ...overrides,
  };
}

function freshnessFixture(
  overrides: Partial<ExternalMeasurementFreshnessV1> = {},
): ExternalMeasurementFreshnessV1 {
  return {
    contract: "external_measurement_freshness_v1",
    read_only: true,
    data_mutation: false,
    runtime_status: "OK",
    overall_status: "OK",
    gsc: {
      runtime_status: "OK",
      connection_level: "BRIGHT",
      artifact_source: "LOCAL_ARTIFACT",
      fetched_at_or_export_date: "2026-07-24T12:00:00.000Z",
      artifact_recency_status: "OK",
      measurement_usability_status: "OK",
      freshness_status: "OK",
      top_level_note: "ok",
    },
    ga4: {
      runtime_status: "OK",
      artifact_source: "LOCAL_ARTIFACT",
      fetched_at: "2026-07-23T12:00:00.000Z",
      artifact_recency_status: "OK",
      measurement_usability_status: "OK",
      freshness_status: "OK",
      top_level_note: "ok",
    },
    recommended_commands: ["npm run buckparts:gsc:fetch", "npm run buckparts:ga4:fetch"],
    proven_facts: [],
    unknown_facts: [],
    ...overrides,
  };
}

function searchClickFixture(
  overrides: Partial<Phase4DemandCaptureSearchClickInputV1> = {},
): Phase4DemandCaptureSearchClickInputV1 {
  return {
    runtime_status: "OK",
    search_events: { last_7d: 12, last_30d: 40 },
    click_events: { last_7d: 3, last_30d: 9 },
    ...overrides,
  };
}

test("demand capture authority posture is read-only sibling only", () => {
  const capture = buildPhase4DemandCaptureV1({
    now: NOW,
    demandNextLane: demandFixture(),
    externalMeasurementFreshness: freshnessFixture(),
    searchAndClick: searchClickFixture(),
  });
  assert.equal(capture.contract, PHASE4_DEMAND_CAPTURE_CONTRACT_V1);
  assert.equal(capture.read_only, true);
  assert.equal(capture.data_mutation, false);
  assert.equal(capture.mutation_authorized, false);
  assert.equal(capture.steering_authority, false);
  assert.equal(capture.dispatch_authority, false);
  assert.equal(capture.owner_approval_authority, false);
  assert.equal(capture.nba_authority, false);
  assert.equal(capture.recommended_jq_path, PHASE4_DEMAND_CAPTURE_CC_JQ_PATH_V1);
  assert.match(capture.recommended_next_action, /No prioritization/);
  assert.match(capture.steering_note, /cannot authorize mutation/);
});

test("missing telemetry stays UNKNOWN and is never coerced to numeric zero", () => {
  const capture = buildPhase4DemandCaptureV1({
    now: NOW,
    demandNextLane: null,
    externalMeasurementFreshness: null,
    searchAndClick: null,
  });
  assert.equal(capture.demand_signal_status, "UNKNOWN");
  assert.equal(capture.gsc_status, "UNKNOWN");
  assert.equal(capture.ga4_status, "UNKNOWN");
  assert.equal(capture.search_events_status, "UNKNOWN");
  assert.equal(capture.click_events_status, "UNKNOWN");
  assert.equal(capture.demand_questions_observed, "UNKNOWN");
  assert.equal(capture.demand_questions_resolved, "UNKNOWN");
  assert.equal(capture.demand_questions_unknown, "UNKNOWN");
  assert.equal(capture.demand_blocked_by_no_safe_path, "UNKNOWN");
  assert.equal(capture.freshness_status, "UNKNOWN");
  assert.equal(capture.evidence_timestamp, "UNKNOWN");
  assert.notEqual(capture.demand_questions_observed, 0);
  assert.notEqual(capture.demand_blocked_by_no_safe_path, 0);
  assert.ok(capture.unknown_facts.some((f) => f.includes("not coerced to zero")));
  assert.ok(!JSON.stringify(capture).includes('"demand_questions_observed":0'));
  assert.ok(!JSON.stringify(capture).includes('"demand_blocked_by_no_safe_path":0'));
});

test("proven channels map to PROVEN; stale freshness maps to STALE", () => {
  const proven = buildPhase4DemandCaptureV1({
    now: NOW,
    demandNextLane: demandFixture(),
    externalMeasurementFreshness: freshnessFixture(),
    searchAndClick: searchClickFixture(),
  });
  assert.equal(proven.demand_signal_status, "PROVEN");
  assert.equal(proven.gsc_status, "PROVEN");
  assert.equal(proven.ga4_status, "PROVEN");
  assert.equal(proven.search_events_status, "PROVEN");
  assert.equal(proven.click_events_status, "PROVEN");
  assert.equal(proven.freshness_status, "PROVEN");
  assert.equal(proven.evidence_timestamp, "2026-07-24T12:00:00.000Z");
  assert.equal(proven.runtime_status, "OK");

  const stale = buildPhase4DemandCaptureV1({
    now: NOW,
    demandNextLane: demandFixture({ runtime_status: "PARTIAL", source_status: "PARTIAL" }),
    externalMeasurementFreshness: freshnessFixture({
      overall_status: "STALE",
      gsc: {
        ...freshnessFixture().gsc,
        freshness_status: "STALE",
        artifact_recency_status: "STALE",
      },
      ga4: {
        ...freshnessFixture().ga4,
        freshness_status: "STALE",
        artifact_recency_status: "STALE",
      },
    }),
    searchAndClick: searchClickFixture(),
  });
  assert.equal(stale.demand_signal_status, "STALE");
  assert.equal(stale.gsc_status, "STALE");
  assert.equal(stale.ga4_status, "STALE");
  assert.equal(stale.freshness_status, "STALE");
});

test("proven numeric zero event counts remain PROVEN (not UNKNOWN coercion)", () => {
  const capture = buildPhase4DemandCaptureV1({
    now: NOW,
    demandNextLane: demandFixture(),
    externalMeasurementFreshness: freshnessFixture(),
    searchAndClick: searchClickFixture({
      search_events: { last_7d: 0, last_30d: 0 },
      click_events: { last_7d: 0, last_30d: 0 },
    }),
  });
  assert.equal(capture.search_events_status, "PROVEN");
  assert.equal(capture.click_events_status, "PROVEN");
  assert.ok(
    capture.proven_facts.some((f) => f.includes("search_events_status=PROVEN")),
  );
});

test("db-unavailable search/click is UNKNOWN not zero", () => {
  const capture = buildPhase4DemandCaptureV1({
    now: NOW,
    demandNextLane: demandFixture(),
    externalMeasurementFreshness: freshnessFixture(),
    searchAndClick: {
      runtime_status: "UNKNOWN_DB_UNAVAILABLE",
      search_events: { last_7d: "UNKNOWN", last_30d: "UNKNOWN" },
      click_events: { last_7d: "UNKNOWN", last_30d: "UNKNOWN" },
    },
  });
  assert.equal(capture.search_events_status, "UNKNOWN");
  assert.equal(capture.click_events_status, "UNKNOWN");
  assert.ok(capture.blockers.includes("phase4_demand_capture_search_events_unknown"));
  assert.ok(capture.blockers.includes("phase4_demand_capture_click_events_unknown"));
});

test("dimensions are complete, sorted, and demand-questions stay UNKNOWN", () => {
  const capture = buildPhase4DemandCaptureV1({
    now: NOW,
    demandNextLane: demandFixture(),
    externalMeasurementFreshness: freshnessFixture(),
    searchAndClick: searchClickFixture(),
  });
  const ids = capture.dimensions.map((d) => d.dimension_id);
  assert.deepEqual(ids, [...ids].sort());
  assert.deepEqual(ids, [
    "click_events_status",
    "demand_blocked_by_no_safe_path",
    "demand_questions_observed",
    "demand_questions_resolved",
    "demand_questions_unknown",
    "demand_signal_status",
    "evidence_timestamp",
    "freshness_status",
    "ga4_status",
    "gsc_status",
    "search_events_status",
  ]);
  assert.equal(capture.demand_questions_observed, "UNKNOWN");
  assert.equal(capture.demand_blocked_by_no_safe_path, "UNKNOWN");
});

test("unknown builder preserves fail-closed blockers", () => {
  const capture = buildPhase4DemandCaptureUnknownV1({
    reason: "injected failure",
    now: NOW,
  });
  assert.equal(capture.runtime_status, "NOT_PROVEN");
  assert.ok(capture.blockers.includes("phase4_demand_capture_build_failed"));
  assert.ok(capture.blockers.some((b) => b.includes("injected failure")));
  assert.equal(capture.mutation_authorized, false);
  assert.equal(capture.steering_authority, false);
});
