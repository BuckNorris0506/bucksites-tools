import assert from "node:assert/strict";
import test from "node:test";

import type { Phase4DecisionCaptureV1 } from "./buckparts-phase4-decision-capture-v1";
import {
  buildPhase4OutcomeCaptureUnknownV1,
  buildPhase4OutcomeCaptureV1,
  PHASE4_OUTCOME_CAPTURE_CC_JQ_PATH_V1,
  PHASE4_OUTCOME_CAPTURE_CONTRACT_V1,
} from "./buckparts-phase4-outcome-capture-v1";

const NOW = () => new Date("2026-07-24T18:00:00.000Z");

function decisionFixture(
  overrides: Partial<Phase4DecisionCaptureV1> = {},
): Phase4DecisionCaptureV1 {
  return {
    contract: "phase4_decision_capture_v1",
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    steering_authority: false,
    recommended_jq_path: ".command_center_v2.phase4_decision_capture_v1",
    source_command: "npm run buckparts:command-center",
    generated_at: "2026-07-24T17:00:00.000Z",
    runtime_status: "ATTENTION",
    wedge_scope: "refrigerator_water",
    denominator_definition: "fixture",
    decision_universe_count: 42,
    confident_buy_count: 27,
    confident_do_not_buy_count: 1,
    honest_unknown_count: 14,
    evidence_backed_wrong_part_prevention_count: 1,
    demand_signal_status: "PROVEN",
    demand_signal_notes: [],
    rows: [],
    source_paths: [],
    blockers: [],
    proven_facts: [],
    inferred_facts: [],
    unknown_facts: [],
    recommended_next_action: "fixture",
    steering_note: "fixture",
    ...overrides,
  };
}

test("outcome capture authority posture is final read-only sibling", () => {
  const capture = buildPhase4OutcomeCaptureV1({
    now: NOW,
    decisionCapture: decisionFixture(),
    searchAndClick: {
      runtime_status: "OK",
      click_events: { last_7d: 5, last_30d: 20 },
    },
    clickVisibility: { commission_or_revenue: "NOT_CONNECTED", runtime_status: "OK" },
  });
  assert.equal(capture.contract, PHASE4_OUTCOME_CAPTURE_CONTRACT_V1);
  assert.equal(capture.read_only, true);
  assert.equal(capture.data_mutation, false);
  assert.equal(capture.mutation_authorized, false);
  assert.equal(capture.steering_authority, false);
  assert.equal(capture.dispatch_authority, false);
  assert.equal(capture.owner_approval_authority, false);
  assert.equal(capture.nba_authority, false);
  assert.equal(capture.final_phase4_instrumentation_lane, true);
  assert.equal(capture.recommended_jq_path, PHASE4_OUTCOME_CAPTURE_CC_JQ_PATH_V1);
  assert.match(capture.recommended_next_action, /Raw clicks are never rewarded/);
});

test("outcome measures handoff from confident decision; raw clicks never positive", () => {
  const capture = buildPhase4OutcomeCaptureV1({
    now: NOW,
    decisionCapture: decisionFixture(),
    searchAndClick: {
      runtime_status: "OK",
      click_events: { last_7d: 99, last_30d: 400 },
    },
  });
  assert.equal(capture.confident_decision_origin_status, "PROVEN");
  assert.equal(capture.confident_buy_origin_count, 27);
  assert.equal(capture.confident_do_not_buy_origin_count, 1);
  assert.equal(capture.handoff_from_confident_buy_count, "UNKNOWN");
  assert.notEqual(capture.handoff_from_confident_buy_count, 99);
  assert.notEqual(capture.handoff_from_confident_buy_count, 0);
  assert.equal(capture.raw_click_events_visibility_status, "PROVEN");
  assert.equal(capture.goodhart_guard.raw_clicks_never_positive_outcomes, true);
  assert.ok(
    capture.goodhart_guard.notes.some((n) => n.includes("never raise Outcome-Capture scores")),
  );
});

test("wrong-part clicks never positive; go-unavailable is own UNKNOWN class", () => {
  const capture = buildPhase4OutcomeCaptureV1({
    now: NOW,
    decisionCapture: decisionFixture(),
  });
  assert.equal(capture.wrong_part_clicks_never_positive, true);
  assert.equal(capture.wrong_part_click_count, "UNKNOWN");
  assert.notEqual(capture.wrong_part_click_count, 0);
  assert.equal(capture.go_unavailable_count, "UNKNOWN");
  assert.notEqual(capture.go_unavailable_count, 0);
  assert.equal(capture.goodhart_guard.go_unavailable_is_own_class, true);
  assert.equal(capture.remain_no_buy_decision_preserved_count, 1);
});

test("revenue LTV SERP returns retailer conversion remain UNKNOWN placeholders", () => {
  const capture = buildPhase4OutcomeCaptureV1({
    now: NOW,
    decisionCapture: decisionFixture(),
    clickVisibility: { commission_or_revenue: "NOT_CONNECTED" },
  });
  assert.equal(capture.revenue_status, "UNKNOWN");
  assert.equal(capture.retailer_conversion_status, "UNKNOWN");
  assert.equal(capture.returns_status, "UNKNOWN");
  assert.equal(capture.ltv_status, "UNKNOWN");
  assert.equal(capture.serp_rank_status, "UNKNOWN");
  assert.ok(!JSON.stringify(capture).includes('"revenue_status":0'));
  assert.ok(!JSON.stringify(capture).includes('"ltv_status":0'));
});

test("missing decision origin fails closed without inventing handoff zeros", () => {
  const capture = buildPhase4OutcomeCaptureV1({
    now: NOW,
    decisionCapture: null,
    searchAndClick: null,
  });
  assert.equal(capture.confident_decision_origin_status, "UNKNOWN");
  assert.equal(capture.confident_buy_origin_count, "UNKNOWN");
  assert.equal(capture.handoff_from_confident_buy_count, "UNKNOWN");
  assert.equal(capture.remain_no_buy_decision_preserved_count, "UNKNOWN");
  assert.ok(capture.blockers.includes("phase4_outcome_capture_decision_origin_unknown"));
  assert.ok(capture.blockers.includes("phase4_outcome_capture_go_unavailable_unknown"));
});

test("dimensions sorted and include goodhart_guard", () => {
  const capture = buildPhase4OutcomeCaptureV1({
    now: NOW,
    decisionCapture: decisionFixture(),
  });
  const ids = capture.dimensions.map((d) => d.dimension_id);
  assert.deepEqual(ids, [...ids].sort());
  assert.ok(ids.includes("goodhart_guard"));
  assert.ok(ids.includes("go_unavailable_count"));
  const guard = capture.dimensions.find((d) => d.dimension_id === "goodhart_guard");
  assert.equal(guard?.status, "PROVEN");
});

test("unknown builder preserves fail-closed blockers", () => {
  const capture = buildPhase4OutcomeCaptureUnknownV1({
    reason: "injected failure",
    now: NOW,
  });
  assert.equal(capture.runtime_status, "NOT_PROVEN");
  assert.ok(capture.blockers.includes("phase4_outcome_capture_build_failed"));
  assert.equal(capture.mutation_authorized, false);
  assert.equal(capture.steering_authority, false);
  assert.equal(capture.final_phase4_instrumentation_lane, true);
});
