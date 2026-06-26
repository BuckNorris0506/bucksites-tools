import assert from "node:assert/strict";
import test from "node:test";

import {
  buildManufacturerSafeLinkRescueRunnerCommandCenterLaneFromReportV1,
  buildManufacturerSafeLinkRescueRunnerCommandCenterLaneUnknownV1,
  buildManufacturerSafeLinkRescueRunnerCommandCenterLaneV1,
  MANUFACTURER_SAFE_LINK_RESCUE_RUNNER_CC_JQ_PATH_V1,
} from "./manufacturer-safe-link-rescue-runner-command-center-v1";
import {
  buildManufacturerSafeLinkRescueRunnerFromInputsV1,
  MANUFACTURER_SAFE_LINK_RESCUE_RUNNER_CONTRACT_V1,
} from "./manufacturer-safe-link-rescue-runner-v1";

const REPO_ROOT = process.cwd();

test("runner command center lane projects execution plan read-only", () => {
  const report = buildManufacturerSafeLinkRescueRunnerFromInputsV1({
    directorLane: {
      contract: "manufacturer_safe_link_rescue_director_v1",
      read_only: true,
      data_mutation: false,
      mutation_authorized: false,
      csv_apply_authorized: false,
      supabase_mutation_authorized: false,
      browser_automation_authorized: false,
      coverage_unlocked: false,
      recommended_jq_path: ".command_center_v2.manufacturer_safe_link_rescue_director_v1",
      generated_at: "2026-06-10T12:00:00.000Z",
      orchestrator_generated_at: "2026-06-10T12:00:00.000Z",
      director_artifact_path: "data/fridge/batch-production/drafts/manufacturer-safe-link-rescue-director-v1.json",
      orchestrator_artifact_path:
        "data/fridge/batch-production/drafts/manufacturer-safe-link-rescue-orchestrator-v1.json",
      scoreboard_artifact_path:
        "data/fridge/batch-production/drafts/manufacturer-safe-link-rescue-scoreboard-v1.json",
      source_command: "npm run buckparts:manufacturer-safe-link-rescue-director",
      manufacturer_rescue_scoreboard: {
        contract: "manufacturer_safe_link_rescue_scoreboard_v1",
        orchestrator_contract: "manufacturer_safe_link_rescue_orchestrator_v1",
        generated_at: "2026-06-10T12:00:00.000Z",
        read_only: true,
        data_mutation: false,
        mutation_authorized: false,
        coverage_unlocked: false,
        total_rescue_candidates: 0,
        browser_proofed: 0,
        owner_review_ready: 0,
        safe_buyer_paths_unlocked: 0,
        remaining_opportunity: 0,
        by_manufacturer: [],
      },
      ranked_manufacturers: [],
      safe_buyer_paths_unlocked: 0,
      remaining_opportunity: 0,
      browser_proof_queue: [],
      owner_review_queue: [],
      guarded_apply_queue: [],
      estimates: {
        safe_buyer_paths_unlockable_estimate: 0,
        safe_buyer_paths_unlockable_note: "",
        browser_hours_required_estimate: 0,
        browser_hours_note: "",
        owner_review_count: 0,
        trust_risk: "UNKNOWN",
        trust_risk_factors: [],
        expected_coverage_gain_percent_estimate: "UNKNOWN",
        expected_coverage_gain_note: "",
      },
      trust_risk_summary: { trust_risk: "UNKNOWN", trust_risk_factors: [] },
      next_recommended_manufacturer: "UNKNOWN",
      next_recommended_slug: "UNKNOWN",
      best_execution_plan_summary: "",
      recommended_next_action: "",
      inspect_summary: {
        recommended_jq_paths: {
          standalone_report: ".inspect_summary",
          command_center: ".command_center_v2.manufacturer_safe_link_rescue_director_v1",
        },
        next_recommended_manufacturer: "UNKNOWN",
        next_recommended_slug: "UNKNOWN",
        safe_buyer_paths_unlocked: 0,
        remaining_opportunity: 0,
        browser_proofed_count: 0,
        browser_proof_queue_count: 0,
        owner_review_queue_count: 0,
        guarded_apply_queue_count: 0,
        estimated_coverage_gain_percent_estimate: "UNKNOWN",
        trust_risk: "UNKNOWN",
        director_generated_at: "2026-06-10T12:00:00.000Z",
        orchestrator_generated_at: "2026-06-10T12:00:00.000Z",
      },
      proven_facts: [],
      unknown_facts: [],
    },
    orchestrator: {
      contract: "manufacturer_safe_link_rescue_orchestrator_v1",
      framework_contract: "manufacturer_safe_link_rescue_framework_v1",
      source_command: "npm run buckparts:manufacturer-safe-link-rescue-orchestrator",
      generated_at: "2026-06-10T12:00:00.000Z",
      read_only: true,
      data_mutation: false,
      mutation_authorized: false,
      csv_apply_authorized: false,
      supabase_mutation_authorized: false,
      browser_automation_authorized: false,
      coverage_unlocked: false,
      verified_link_authorized: false,
      registered_manufacturers: [],
      manufacturer_summaries: [],
      rescue_counts: {
        total_rescue_candidates: 0,
        browser_ready_count: 0,
        owner_review_ready_count: 0,
        browser_pass_count: 0,
        unknown_truth_count: 0,
        blocked_slug_count: 0,
        guarded_apply_candidate_count: 0,
      },
      blocked_reasons: [],
      recommended_execution_order: [],
      unified_rescue_queue: [],
      proven_facts: [],
      unknown_facts: [],
      source_paths_read: [],
    },
    now: () => new Date("2026-06-10T12:00:00.000Z"),
  });

  const lane = buildManufacturerSafeLinkRescueRunnerCommandCenterLaneFromReportV1({ report });
  assert.equal(lane.contract, MANUFACTURER_SAFE_LINK_RESCUE_RUNNER_CONTRACT_V1);
  assert.equal(lane.recommended_jq_path, MANUFACTURER_SAFE_LINK_RESCUE_RUNNER_CC_JQ_PATH_V1);
  assert.equal(lane.read_only, true);
  assert.equal(lane.coverage_unlocked, false);
  assert.equal(lane.ready_for_apply_enforced, true);
});

test("runner command center lane unknown is fail-closed", () => {
  const lane = buildManufacturerSafeLinkRescueRunnerCommandCenterLaneUnknownV1({
    generated_at: "2026-06-10T12:00:00.000Z",
    reason: "test",
  });
  assert.equal(lane.slug_states.length, 0);
  assert.equal(lane.csv_apply_authorized, false);
  assert.equal(lane.inspect_summary.next_executable_slug, "UNKNOWN");
});

test("runner command center lane live build", () => {
  const lane = buildManufacturerSafeLinkRescueRunnerCommandCenterLaneV1({ rootDir: REPO_ROOT });
  assert.equal(lane.contract, MANUFACTURER_SAFE_LINK_RESCUE_RUNNER_CONTRACT_V1);
  assert.ok(lane.slug_states.length > 0);
  assert.equal(lane.slug_states.filter((s) => s.stage === "READY_FOR_APPLY").length <= 1, true);
});
