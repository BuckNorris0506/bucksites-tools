import assert from "node:assert/strict";
import test from "node:test";

import type { DemandToCoverageNextLaneReportV1 } from "./demand-to-coverage-next-lane-v1";
import {
  buildPhase4DecisionCaptureUnknownV1,
  buildPhase4DecisionCaptureV1,
  PHASE4_DECISION_CAPTURE_CC_JQ_PATH_V1,
  PHASE4_DECISION_CAPTURE_CONTRACT_V1,
  type CtaGoProofPackForDecisionCaptureV1,
} from "./buckparts-phase4-decision-capture-v1";
import {
  FRIDGE_MODEL_PDP_REMAIN_NO_BUY_SLUG_V1,
  FRIDGE_TRUTH_SPINE_CTA_GO_PROOF_CONTRACT_V1,
} from "./fridge-truth-spine-v1";

const NOW = () => new Date("2026-07-24T18:00:00.000Z");
const ROOT = "/tmp/buckparts-decision-capture-fixture-root";

function packFixture(
  overrides: Partial<CtaGoProofPackForDecisionCaptureV1> = {},
): CtaGoProofPackForDecisionCaptureV1 {
  return {
    contract: FRIDGE_TRUTH_SPINE_CTA_GO_PROOF_CONTRACT_V1,
    scope: {
      slugs: ["model-a", "model-b", FRIDGE_MODEL_PDP_REMAIN_NO_BUY_SLUG_V1],
      excluded_quarantined_slugs: ["model-q1"],
      excluded_partial_slugs: ["model-p1"],
    },
    rows: [
      { slug: "model-a", verdict: "SAFE_BUYER_PATH_PASS" },
      { slug: "model-b", verdict: "SAFE_BUYER_PATH_PASS" },
      { slug: FRIDGE_MODEL_PDP_REMAIN_NO_BUY_SLUG_V1, verdict: "SAFE_BUYER_PATH_FAIL" },
    ],
    ...overrides,
  };
}

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
    recommended_next_action: "Demand-selected fridge batch.",
    next_lane: "refrigerator_water_demand_selected",
    next_wedge: "refrigerator_water",
    next_batch_candidate: "fridge-demand-selected-batch-run-v1",
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

test("decision capture fails closed without CTA/go proof pack", () => {
  const capture = buildPhase4DecisionCaptureV1({
    rootDir: ROOT,
    now: NOW,
    loadCtaGoProofPack: () => null,
  });
  assert.equal(capture.contract, PHASE4_DECISION_CAPTURE_CONTRACT_V1);
  assert.equal(capture.read_only, true);
  assert.equal(capture.data_mutation, false);
  assert.equal(capture.mutation_authorized, false);
  assert.equal(capture.steering_authority, false);
  assert.equal(capture.runtime_status, "NOT_PROVEN");
  assert.deepEqual(capture.blockers, ["phase4_decision_capture_cta_go_proof_required"]);
  assert.equal(capture.decision_universe_count, 0);
  assert.equal(capture.demand_signal_status, "UNKNOWN");
  assert.equal(capture.recommended_jq_path, PHASE4_DECISION_CAPTURE_CC_JQ_PATH_V1);
});

test("denominator excludes raw inventory; universe is evidence-entered only", () => {
  const capture = buildPhase4DecisionCaptureV1({
    rootDir: ROOT,
    now: NOW,
    loadCtaGoProofPack: () => packFixture(),
    demandNextLane: demandFixture(),
  });
  assert.match(capture.denominator_definition, /Raw inventory does not enter the denominator/);
  assert.equal(capture.decision_universe_count, 5);
  assert.notEqual(capture.decision_universe_count, 500);
  assert.ok(
    capture.proven_facts.some((fact) => fact.includes("raw fridge inventory excluded")),
  );
});

test("BUY / DO-NOT-BUY / UNKNOWN are mutually exclusive and sum to universe", () => {
  const capture = buildPhase4DecisionCaptureV1({
    rootDir: ROOT,
    now: NOW,
    loadCtaGoProofPack: () => packFixture(),
    demandNextLane: demandFixture(),
  });
  assert.equal(capture.confident_buy_count, 2);
  assert.equal(capture.confident_do_not_buy_count, 1);
  assert.equal(capture.honest_unknown_count, 2);
  assert.equal(
    capture.confident_buy_count +
      capture.confident_do_not_buy_count +
      capture.honest_unknown_count,
    capture.decision_universe_count,
  );
  const outcomes = capture.rows.map((row) => row.outcome);
  assert.equal(outcomes.filter((o) => o === "confident_buy").length, 2);
  assert.equal(outcomes.filter((o) => o === "confident_do_not_buy").length, 1);
  assert.equal(outcomes.filter((o) => o === "honest_unknown").length, 2);
  const remain = capture.rows.find((r) => r.model_slug === FRIDGE_MODEL_PDP_REMAIN_NO_BUY_SLUG_V1);
  assert.equal(remain?.outcome, "confident_do_not_buy");
});

test("wrong-part prevention requires current remain-no-buy evidence only", () => {
  const withRemain = buildPhase4DecisionCaptureV1({
    rootDir: ROOT,
    now: NOW,
    loadCtaGoProofPack: () => packFixture(),
  });
  assert.equal(withRemain.evidence_backed_wrong_part_prevention_count, 1);

  const withoutRemain = buildPhase4DecisionCaptureV1({
    rootDir: ROOT,
    now: NOW,
    loadCtaGoProofPack: () =>
      packFixture({
        scope: {
          slugs: ["model-a", "model-b"],
          excluded_quarantined_slugs: ["model-q1"],
          excluded_partial_slugs: [],
        },
        rows: [
          { slug: "model-a", verdict: "SAFE_BUYER_PATH_PASS" },
          { slug: "model-b", verdict: "SAFE_BUYER_PATH_PASS" },
        ],
      }),
  });
  assert.equal(withoutRemain.evidence_backed_wrong_part_prevention_count, 0);
  assert.equal(withoutRemain.confident_do_not_buy_count, 0);
  assert.ok(
    withoutRemain.unknown_facts.some((fact) =>
      fact.includes("dated model-filter WRONG_PART_RISK"),
    ),
  );
});

test("missing demand remains UNKNOWN never numeric zero", () => {
  const capture = buildPhase4DecisionCaptureV1({
    rootDir: ROOT,
    now: NOW,
    loadCtaGoProofPack: () => packFixture(),
    demandNextLane: null,
  });
  assert.equal(capture.demand_signal_status, "UNKNOWN");
  assert.ok(capture.demand_signal_notes.some((n) => n.includes("not coerced to zero")));
  assert.ok(capture.blockers.includes("phase4_decision_capture_demand_signal_unknown"));
  assert.ok(!("demand_count" in capture));
  assert.ok(!JSON.stringify(capture).includes('"demand":0'));
});

test("partial demand is STALE; proven demand is PROVEN", () => {
  const stale = buildPhase4DecisionCaptureV1({
    rootDir: ROOT,
    now: NOW,
    loadCtaGoProofPack: () => packFixture(),
    demandNextLane: demandFixture({ runtime_status: "PARTIAL", source_status: "PARTIAL" }),
  });
  assert.equal(stale.demand_signal_status, "STALE");

  const proven = buildPhase4DecisionCaptureV1({
    rootDir: ROOT,
    now: NOW,
    loadCtaGoProofPack: () => packFixture(),
    demandNextLane: demandFixture(),
  });
  assert.equal(proven.demand_signal_status, "PROVEN");
});

test("authority posture is sibling read-only with no steering", () => {
  const capture = buildPhase4DecisionCaptureV1({
    rootDir: ROOT,
    now: NOW,
    loadCtaGoProofPack: () => packFixture(),
    demandNextLane: demandFixture(),
  });
  assert.equal(capture.mutation_authorized, false);
  assert.equal(capture.steering_authority, false);
  assert.equal(capture.data_mutation, false);
  assert.match(capture.steering_note, /Sibling to phase4_coverage_scoreboard_v1/);
  assert.match(capture.steering_note, /cannot authorize mutation/);
});

test("unknown builder preserves fail-closed blockers", () => {
  const capture = buildPhase4DecisionCaptureUnknownV1({
    reason: "injected failure",
    now: NOW,
  });
  assert.equal(capture.runtime_status, "NOT_PROVEN");
  assert.ok(capture.blockers.includes("phase4_decision_capture_build_failed"));
  assert.ok(capture.blockers.some((b) => b.includes("injected failure")));
});
