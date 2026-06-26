import assert from "node:assert/strict";
import test from "node:test";

import {
  buildManufacturerSafeLinkRescueDirectorCommandCenterLaneFromBundleV1,
  buildManufacturerSafeLinkRescueDirectorCommandCenterLaneUnknownV1,
  buildManufacturerSafeLinkRescueDirectorCommandCenterLaneV1,
  MANUFACTURER_SAFE_LINK_RESCUE_DIRECTOR_CC_JQ_PATH_V1,
} from "./manufacturer-safe-link-rescue-director-command-center-v1";
import { MANUFACTURER_SAFE_LINK_RESCUE_DIRECTOR_CONTRACT_V1 } from "./manufacturer-safe-link-rescue-director-v1";
import type { ManufacturerRescueDirectorReportV1 } from "./manufacturer-safe-link-rescue-director-v1";
import type { ManufacturerRescueScoreboardV1 } from "./manufacturer-safe-link-rescue-orchestrator-v1";

const REPO_ROOT = process.cwd();

function minimalDirector(): ManufacturerRescueDirectorReportV1 {
  return {
    contract: MANUFACTURER_SAFE_LINK_RESCUE_DIRECTOR_CONTRACT_V1,
    orchestrator_contract: "manufacturer_safe_link_rescue_orchestrator_v1",
    framework_contract: "manufacturer_safe_link_rescue_framework_v1",
    source_command: "npm run buckparts:manufacturer-safe-link-rescue-director",
    orchestrator_source_path: "data/fridge/batch-production/drafts/manufacturer-safe-link-rescue-orchestrator-v1.json",
    orchestrator_generated_at: "2026-06-10T12:00:00.000Z",
    generated_at: "2026-06-10T12:00:00.000Z",
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    csv_apply_authorized: false,
    supabase_mutation_authorized: false,
    browser_automation_authorized: false,
    coverage_unlocked: false,
    why_this_order_was_chosen: ["owner reviews first"],
    blocked_summary: [],
    ranked_manufacturers: [
      {
        rank: 1,
        manufacturer_key: "frigidaire",
        expected_coverage_unlock_score: 1000,
        rescue_candidate_count: 10,
        owner_review_ready_count: 4,
        browser_pass_count: 4,
        browser_ready_count: 3,
        remaining_opportunity: 6,
        rationale: "owner-review-ready",
      },
    ],
    ranked_browser_work: [
      {
        rank: 1,
        filter_slug: "gswf",
        manufacturer_key: "ge_appliance_parts",
        director_value_score: 900,
        orchestrator_priority_score: 800,
        expected_safe_coverage_signal: 200,
        trust_risk: "UNKNOWN",
        blocked_reasons: [],
        recommended_next_action: "capture",
      },
    ],
    ranked_owner_reviews: [
      {
        rank: 1,
        filter_slug: "wf3cb",
        manufacturer_key: "frigidaire",
        director_value_score: 1200,
        orchestrator_priority_score: 1000,
        expected_safe_coverage_signal: 210,
        trust_risk: "MEDIUM",
        blocked_reasons: ["confusion_family_review_required"],
        recommended_next_action: "owner review",
      },
    ],
    ranked_guarded_apply_candidates: [
      {
        rank: 1,
        filter_slug: "wf3cb",
        manufacturer_key: "frigidaire",
        director_value_score: 1200,
        orchestrator_priority_score: 1000,
        expected_safe_coverage_signal: 210,
        trust_risk: "MEDIUM",
        blocked_reasons: [],
        recommended_next_action: "guarded apply",
      },
    ],
    estimates: {
      safe_buyer_paths_unlockable_estimate: 1,
      safe_buyer_paths_unlockable_note: "estimate only",
      browser_hours_required_estimate: 6,
      browser_hours_note: "planning",
      owner_review_count: 1,
      trust_risk: "MEDIUM",
      trust_risk_factors: ["confusion-family"],
      expected_coverage_gain_percent_estimate: 4,
      expected_coverage_gain_note: "estimate",
    },
    best_execution_plan_summary: "Review wf3cb first.",
    proven_facts: [],
    unknown_facts: [],
  };
}

function minimalScoreboard(): ManufacturerRescueScoreboardV1 {
  return {
    contract: "manufacturer_safe_link_rescue_scoreboard_v1",
    orchestrator_contract: "manufacturer_safe_link_rescue_orchestrator_v1",
    generated_at: "2026-06-10T12:00:00.000Z",
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    coverage_unlocked: false,
    total_rescue_candidates: 26,
    browser_proofed: 6,
    owner_review_ready: 6,
    safe_buyer_paths_unlocked: 0,
    remaining_opportunity: 20,
    by_manufacturer: [],
  };
}

test("command center lane exposes required operational fields from director bundle", () => {
  const lane = buildManufacturerSafeLinkRescueDirectorCommandCenterLaneFromBundleV1({
    director: minimalDirector(),
    scoreboard: minimalScoreboard(),
    director_source_path: "data/fridge/batch-production/drafts/manufacturer-safe-link-rescue-director-v1.json",
    orchestrator_source_path:
      "data/fridge/batch-production/drafts/manufacturer-safe-link-rescue-orchestrator-v1.json",
    scoreboard_source_path:
      "data/fridge/batch-production/drafts/manufacturer-safe-link-rescue-scoreboard-v1.json",
  });

  assert.equal(lane.contract, MANUFACTURER_SAFE_LINK_RESCUE_DIRECTOR_CONTRACT_V1);
  assert.equal(lane.recommended_jq_path, MANUFACTURER_SAFE_LINK_RESCUE_DIRECTOR_CC_JQ_PATH_V1);
  assert.equal(lane.read_only, true);
  assert.equal(lane.data_mutation, false);
  assert.equal(lane.coverage_unlocked, false);
  assert.equal(lane.safe_buyer_paths_unlocked, 0);
  assert.equal(lane.remaining_opportunity, 20);
  assert.equal(lane.manufacturer_rescue_scoreboard.browser_proofed, 6);
  assert.equal(lane.ranked_manufacturers[0].manufacturer_key, "frigidaire");
  assert.equal(lane.browser_proof_queue[0].filter_slug, "gswf");
  assert.equal(lane.owner_review_queue[0].filter_slug, "wf3cb");
  assert.equal(lane.guarded_apply_queue[0].filter_slug, "wf3cb");
  assert.equal(lane.estimates.expected_coverage_gain_percent_estimate, 4);
  assert.equal(lane.trust_risk_summary.trust_risk, "MEDIUM");
  assert.equal(lane.next_recommended_manufacturer, "frigidaire");
  assert.equal(lane.next_recommended_slug, "wf3cb");
  assert.equal(lane.orchestrator_generated_at, "2026-06-10T12:00:00.000Z");
  assert.equal(lane.inspect_summary.director_generated_at, "2026-06-10T12:00:00.000Z");
});

test("command center lane unknown is fail-closed read-only", () => {
  const lane = buildManufacturerSafeLinkRescueDirectorCommandCenterLaneUnknownV1({
    generated_at: "2026-06-10T12:00:00.000Z",
    reason: "test failure",
  });
  assert.equal(lane.next_recommended_manufacturer, "UNKNOWN");
  assert.equal(lane.next_recommended_slug, "UNKNOWN");
  assert.equal(lane.safe_buyer_paths_unlocked, 0);
  assert.equal(lane.browser_automation_authorized, false);
  assert.equal(lane.csv_apply_authorized, false);
});

test("command center lane live build from repo artifacts", () => {
  const lane = buildManufacturerSafeLinkRescueDirectorCommandCenterLaneV1({
    rootDir: REPO_ROOT,
  });
  assert.equal(lane.contract, MANUFACTURER_SAFE_LINK_RESCUE_DIRECTOR_CONTRACT_V1);
  assert.ok(lane.ranked_manufacturers.length === 3);
  assert.ok(lane.manufacturer_rescue_scoreboard.total_rescue_candidates > 0);
  assert.equal(lane.safe_buyer_paths_unlocked, 0);
});
