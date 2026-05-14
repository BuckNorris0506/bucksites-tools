import assert from "node:assert/strict";
import test from "node:test";

import type { TopOfGameFoundationScorecardV1 } from "./lib/buckparts-command-center-v2-types";
import {
  extractTopOfGameFoundationScorecardV1,
  formatScorecardLaneLine,
  getCommandCenterV2FromReport,
  parseJsonStdout,
} from "./lib/buckparts-operator-proof";

const minimalLane = {
  lane_id: "test_lane",
  label: "Test lane",
  status: "PROVEN" as const,
  score_contribution: 10,
  max_contribution: 10,
  proven_basis: ["fixture"],
  unknowns: [],
  next_proof_required: "none",
};

const minimalScorecard: TopOfGameFoundationScorecardV1 = {
  contract: "top_of_game_foundation_scorecard_v1",
  runtime_status: "OK",
  foundation_maturity_score_100: 10,
  current_goal_score_100: 100,
  goal_reached: false,
  lanes: [minimalLane],
  blockers: [],
  next_best_foundation_move: "Continue foundation work.",
  owner_dashboard_ready: true,
  owner_dashboard_note: "fixture",
  read_only: true,
  data_mutation: false,
  proven_facts: ["fixture proven"],
  unknown_facts: [],
};

test("parseJsonStdout trims and parses single JSON value", () => {
  const j = parseJsonStdout("\n  {\"a\":1}  \n");
  assert.deepEqual(j, { a: 1 });
});

test("parseJsonStdout rejects empty", () => {
  assert.throws(() => parseJsonStdout("   \n"), /non-empty JSON/);
});

test("getCommandCenterV2FromReport returns v2 object", () => {
  const v2 = getCommandCenterV2FromReport({
    command_center_v2: { read_only: true },
  });
  assert.ok(v2);
  assert.equal(v2.read_only, true);
});

test("extractTopOfGameFoundationScorecardV1 accepts real lane shape (score_contribution / max_contribution)", () => {
  const r = extractTopOfGameFoundationScorecardV1({
    command_center_v2: {
      top_of_game_foundation_scorecard_v1: minimalScorecard,
    },
  });
  assert.equal(r.ok, true);
  if (r.ok) {
    assert.equal(r.scorecard.lanes[0].score_contribution, 10);
    assert.equal(r.scorecard.lanes[0].max_contribution, 10);
  }
});

test("extractTopOfGameFoundationScorecardV1 flags legacy score / max_score lanes", () => {
  const bad = {
    ...minimalScorecard,
    lanes: [
      {
        lane_id: "legacy",
        label: "Legacy",
        status: "UNKNOWN",
        score: 1,
        max_score: 5,
        proven_basis: [],
        unknowns: [],
        next_proof_required: "fix",
      },
    ],
  };
  const r = extractTopOfGameFoundationScorecardV1({
    command_center_v2: {
      top_of_game_foundation_scorecard_v1: bad,
    },
  });
  assert.equal(r.ok, false);
  if (!r.ok) {
    assert.match(r.error, /score_contribution\/max_contribution/);
  }
});

test("formatScorecardLaneLine uses score_contribution and max_contribution", () => {
  const line = formatScorecardLaneLine(minimalLane);
  assert.equal(line, "test_lane\tPROVEN\t10/10\tTest lane");
});
