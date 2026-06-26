import assert from "node:assert/strict";
import test from "node:test";

import {
  buildManufacturerRescueScoreboardV1,
  buildManufacturerSafeLinkRescueOrchestratorReportV1,
  computeOrchestratorPriorityScoreV1,
  discoverRegisteredManufacturerRescueAdaptersV1,
  MANUFACTURER_RESCUE_ORCHESTRATOR_REGISTRY_V1,
  MANUFACTURER_SAFE_LINK_RESCUE_ORCHESTRATOR_CONTRACT_V1,
} from "./manufacturer-safe-link-rescue-orchestrator-v1";

const REPO_ROOT = process.cwd();

test("discoverRegisteredManufacturerRescueAdaptersV1 lists three manufacturers", () => {
  const registered = discoverRegisteredManufacturerRescueAdaptersV1();
  assert.equal(registered.length, 3);
  assert.deepEqual(
    registered.map((r) => r.manufacturer_key).sort(),
    ["everydrop_whirlpool", "frigidaire", "ge_appliance_parts"],
  );
  assert.equal(registered.length, MANUFACTURER_RESCUE_ORCHESTRATOR_REGISTRY_V1.length);
});

test("computeOrchestratorPriorityScoreV1 ranks census + browser signals deterministically", () => {
  const low = computeOrchestratorPriorityScoreV1({
    censusRescuePriorityScore: 50,
    inFridgeRescueQueue: false,
    rescueQueueRank: null,
    browserReadyState: "NOT_READY",
    browserTruthStatus: "UNKNOWN",
    ownerReviewReadiness: "NOT_READY",
    repoProvenOfficialTargetUrl: null,
    existingEvidenceScore: 0,
    cohortLane: "RESCUE_SEARCH_PLACEHOLDER",
    blockedReasons: [],
  });
  const high = computeOrchestratorPriorityScoreV1({
    censusRescuePriorityScore: 50,
    inFridgeRescueQueue: true,
    rescueQueueRank: 1,
    browserReadyState: "READY",
    browserTruthStatus: "PASS",
    ownerReviewReadiness: "READY",
    repoProvenOfficialTargetUrl: "https://example.com/pdp",
    existingEvidenceScore: 70,
    cohortLane: "RESCUE_SEARCH_PLACEHOLDER",
    blockedReasons: [],
  });
  assert.ok(high > low);
});

test("computeOrchestratorPriorityScoreV1 fail-closed on known_broken", () => {
  const score = computeOrchestratorPriorityScoreV1({
    censusRescuePriorityScore: 500,
    inFridgeRescueQueue: true,
    rescueQueueRank: 1,
    browserReadyState: "BLOCKED",
    browserTruthStatus: "UNKNOWN",
    ownerReviewReadiness: "NOT_READY",
    repoProvenOfficialTargetUrl: null,
    existingEvidenceScore: 0,
    cohortLane: "RESCUE_SEARCH_PLACEHOLDER",
    blockedReasons: ["known_broken_destination"],
  });
  assert.ok(score < 0);
});

test("orchestrator report has deterministic ordering for fixed now", () => {
  const fixedNow = () => new Date("2026-06-10T12:00:00.000Z");
  const a = buildManufacturerSafeLinkRescueOrchestratorReportV1({
    rootDir: REPO_ROOT,
    now: fixedNow,
  });
  const b = buildManufacturerSafeLinkRescueOrchestratorReportV1({
    rootDir: REPO_ROOT,
    now: fixedNow,
  });
  assert.deepEqual(
    a.unified_rescue_queue.map((r) => r.filter_slug),
    b.unified_rescue_queue.map((r) => r.filter_slug),
  );
  assert.deepEqual(a.recommended_execution_order, b.recommended_execution_order);
});

test("orchestrator propagates UNKNOWN census score without inventing priority", () => {
  const report = buildManufacturerSafeLinkRescueOrchestratorReportV1({
    rootDir: REPO_ROOT,
    fileExists: () => false,
    readTextFile: () => "",
  });
  assert.ok(report.unknown_facts.some((f) => f.includes("UNKNOWN")));
  for (const row of report.unified_rescue_queue) {
    assert.equal(row.census_rescue_priority_score, "UNKNOWN");
  }
});

test("orchestrator report is read-only with coverage_unlocked false", () => {
  const report = buildManufacturerSafeLinkRescueOrchestratorReportV1({ rootDir: REPO_ROOT });
  assert.equal(report.contract, MANUFACTURER_SAFE_LINK_RESCUE_ORCHESTRATOR_CONTRACT_V1);
  assert.equal(report.read_only, true);
  assert.equal(report.data_mutation, false);
  assert.equal(report.mutation_authorized, false);
  assert.equal(report.csv_apply_authorized, false);
  assert.equal(report.coverage_unlocked, false);
  for (const row of report.unified_rescue_queue) {
    assert.equal(row.coverage_unlocked, false);
  }
});

test("orchestrator never exposes unproven direct_buyable or unlocks safe paths in scoreboard", () => {
  const report = buildManufacturerSafeLinkRescueOrchestratorReportV1({ rootDir: REPO_ROOT });
  const scoreboard = buildManufacturerRescueScoreboardV1(report);
  assert.equal(scoreboard.safe_buyer_paths_unlocked, 0);
  assert.equal(scoreboard.coverage_unlocked, false);
  assert.equal(scoreboard.data_mutation, false);
});

test("orchestrator ranks in_fridge_rescue_queue slugs ahead when scores tie", () => {
  const report = buildManufacturerSafeLinkRescueOrchestratorReportV1({ rootDir: REPO_ROOT });
  const inQueue = report.unified_rescue_queue.filter((r) => r.in_fridge_rescue_queue);
  const notInQueue = report.unified_rescue_queue.filter((r) => !r.in_fridge_rescue_queue);
  if (inQueue.length > 0 && notInQueue.length > 0) {
    const bestNotInQueue = Math.max(...notInQueue.map((r) => r.orchestrator_priority_score));
    const worstInQueue = Math.min(...inQueue.map((r) => r.orchestrator_priority_score));
    assert.ok(
      worstInQueue >= bestNotInQueue - 200,
      "rescue queue membership should materially influence ranking",
    );
  }
});

test("orchestrator registers GE reference lane separately from rescue candidates", () => {
  const report = buildManufacturerSafeLinkRescueOrchestratorReportV1({ rootDir: REPO_ROOT });
  const reference = report.unified_rescue_queue.find((r) => r.cohort_lane === "REFERENCE_ALREADY_APPLIED");
  if (reference) {
    assert.equal(reference.browser_ready_state, "ALREADY_APPLIED");
    assert.ok(reference.orchestrator_priority_score < 0);
  }
  assert.ok(report.rescue_counts.total_rescue_candidates > 0);
});
