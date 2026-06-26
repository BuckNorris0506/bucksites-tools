import assert from "node:assert/strict";
import test from "node:test";

import {
  assessSlugTrustRiskV1,
  buildManufacturerRescueRoadmapV1,
  buildManufacturerSafeLinkRescueDirectorReportV1,
  computeDirectorValueScoreV1,
  computeManufacturerExpectedCoverageUnlockScoreV1,
  MANUFACTURER_SAFE_LINK_RESCUE_DIRECTOR_CONTRACT_V1,
  type ManufacturerRescueOrchestratorQueueRowV1,
  type ManufacturerRescueOrchestratorReportV1,
} from "./manufacturer-safe-link-rescue-director-v1";
import { MANUFACTURER_SAFE_LINK_RESCUE_ORCHESTRATOR_CONTRACT_V1 } from "./manufacturer-safe-link-rescue-orchestrator-v1";

const REPO_ROOT = process.cwd();

function baseQueueRow(
  overrides: Partial<ManufacturerRescueOrchestratorQueueRowV1>,
): ManufacturerRescueOrchestratorQueueRowV1 {
  return {
    filter_slug: "test-slug",
    manufacturer_key: "frigidaire",
    oem_part_token: "TEST",
    cohort_lane: "RESCUE_SEARCH_PLACEHOLDER",
    in_fridge_rescue_queue: false,
    rescue_queue_rank: null,
    census_rescue_priority_score: 100,
    orchestrator_priority_score: 200,
    expected_safe_coverage_signal: 50,
    existing_evidence_score: 70,
    browser_ready_state: "READY",
    owner_review_readiness: "READY",
    browser_truth_status: "PASS",
    repo_proven_official_target_url: "https://example.com/pdp",
    adapter_discovery_url: null,
    adapter_discovery_provenance: "UNKNOWN",
    csv_primary_is_search_placeholder: true,
    blocked_reasons: [],
    recommended_next_action: "Owner review.",
    orchestrator_rank: 1,
    coverage_unlocked: false,
    ...overrides,
  };
}

function minimalOrchestrator(
  rows: ManufacturerRescueOrchestratorQueueRowV1[],
): ManufacturerRescueOrchestratorReportV1 {
  return {
    contract: MANUFACTURER_SAFE_LINK_RESCUE_ORCHESTRATOR_CONTRACT_V1,
    framework_contract: "manufacturer_safe_link_rescue_framework_v1",
    source_command: "npm run buckparts:manufacturer-safe-link-rescue-orchestrator",
    generated_at: "2026-06-10T12:00:00.000Z",
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    csv_apply_authorized: false,
    supabase_mutation_authorized: false,
    verified_link_authorized: false,
    coverage_unlocked: false,
    registered_manufacturers: [],
    manufacturer_summaries: [
      {
        manufacturer_key: "frigidaire",
        adapter_contract: "frigidaire_refrigerator_rescue_adapter_v1",
        rescue_candidate_count: rows.length,
        browser_ready_count: rows.filter((r) => r.browser_ready_state === "READY").length,
        owner_review_ready_count: rows.filter(
          (r) => r.owner_review_readiness === "READY" || r.owner_review_readiness === "SUPERSESSION_REVIEW",
        ).length,
        browser_pass_count: rows.filter((r) => r.browser_truth_status === "PASS").length,
        unknown_truth_count: 0,
        blocked_slug_count: rows.length,
        reference_applied_count: 0,
      },
    ],
    rescue_counts: {
      total_rescue_candidates: rows.length,
      browser_ready_count: rows.filter((r) => r.browser_ready_state === "READY").length,
      owner_review_ready_count: rows.filter(
        (r) => r.owner_review_readiness === "READY" || r.owner_review_readiness === "SUPERSESSION_REVIEW",
      ).length,
      browser_pass_count: rows.filter((r) => r.browser_truth_status === "PASS").length,
      unknown_truth_count: 0,
      blocked_slug_count: rows.length,
      guarded_apply_candidate_count: rows.filter(
        (r) =>
          r.browser_truth_status === "PASS" &&
          r.csv_primary_is_search_placeholder === true &&
          (r.owner_review_readiness === "READY" || r.owner_review_readiness === "SUPERSESSION_REVIEW"),
      ).length,
    },
    blocked_reasons: [],
    recommended_execution_order: rows.map((r) => r.filter_slug),
    unified_rescue_queue: rows,
    proven_facts: [],
    unknown_facts: [],
    source_paths_read: [],
  };
}

test("computeDirectorValueScoreV1 ranks owner-review PASS above browser-only READY", () => {
  const ownerReady = computeDirectorValueScoreV1(
    baseQueueRow({ filter_slug: "a", owner_review_readiness: "READY", browser_truth_status: "PASS" }),
  );
  const browserOnly = computeDirectorValueScoreV1(
    baseQueueRow({
      filter_slug: "b",
      owner_review_readiness: "NOT_READY",
      browser_truth_status: "NOT_CAPTURED",
      orchestrator_priority_score: 200,
    }),
  );
  assert.ok(ownerReady > browserOnly);
});

test("assessSlugTrustRiskV1 fail-closed on known_broken", () => {
  assert.equal(
    assessSlugTrustRiskV1(baseQueueRow({ blocked_reasons: ["known_broken_destination"] })),
    "HIGH",
  );
});

test("computeManufacturerExpectedCoverageUnlockScoreV1 prefers owner-review-ready manufacturers", () => {
  const high = computeManufacturerExpectedCoverageUnlockScoreV1({
    manufacturerKey: "everydrop_whirlpool",
    summary: {
      manufacturer_key: "everydrop_whirlpool",
      adapter_contract: "x",
      rescue_candidate_count: 7,
      browser_ready_count: 2,
      owner_review_ready_count: 2,
      browser_pass_count: 2,
      unknown_truth_count: 0,
      blocked_slug_count: 7,
      reference_applied_count: 0,
    },
    rows: [baseQueueRow({ manufacturer_key: "everydrop_whirlpool" })],
  });
  const low = computeManufacturerExpectedCoverageUnlockScoreV1({
    manufacturerKey: "ge_appliance_parts",
    summary: {
      manufacturer_key: "ge_appliance_parts",
      adapter_contract: "x",
      rescue_candidate_count: 9,
      browser_ready_count: 8,
      owner_review_ready_count: 0,
      browser_pass_count: 0,
      unknown_truth_count: 0,
      blocked_slug_count: 9,
      reference_applied_count: 0,
    },
    rows: [],
  });
  assert.ok(high > low);
});

test("director report is deterministic for fixed orchestrator input", () => {
  const orchestrator = minimalOrchestrator([
    baseQueueRow({ filter_slug: "wf3cb", orchestrator_priority_score: 500 }),
    baseQueueRow({
      filter_slug: "mwf",
      manufacturer_key: "ge_appliance_parts",
      owner_review_readiness: "NOT_READY",
      browser_truth_status: "NOT_CAPTURED",
      orchestrator_priority_score: 100,
    }),
  ]);
  const fixedNow = () => new Date("2026-06-10T12:00:00.000Z");
  const a = buildManufacturerSafeLinkRescueDirectorReportV1({
    rootDir: REPO_ROOT,
    now: fixedNow,
    orchestrator,
  });
  const b = buildManufacturerSafeLinkRescueDirectorReportV1({
    rootDir: REPO_ROOT,
    now: fixedNow,
    orchestrator,
  });
  assert.deepEqual(
    a.ranked_owner_reviews.map((r) => r.filter_slug),
    b.ranked_owner_reviews.map((r) => r.filter_slug),
  );
  assert.deepEqual(a.ranked_manufacturers, b.ranked_manufacturers);
});

test("director read-only flags and no browser automation", () => {
  const director = buildManufacturerSafeLinkRescueDirectorReportV1({
    rootDir: REPO_ROOT,
    orchestrator: minimalOrchestrator([baseQueueRow({})]),
  });
  assert.equal(director.contract, MANUFACTURER_SAFE_LINK_RESCUE_DIRECTOR_CONTRACT_V1);
  assert.equal(director.read_only, true);
  assert.equal(director.data_mutation, false);
  assert.equal(director.mutation_authorized, false);
  assert.equal(director.csv_apply_authorized, false);
  assert.equal(director.browser_automation_authorized, false);
  assert.equal(director.coverage_unlocked, false);
});

test("roadmap stage 1 is owner reviews before guarded apply", () => {
  const orchestrator = minimalOrchestrator([baseQueueRow({ filter_slug: "wf3cb" })]);
  const director = buildManufacturerSafeLinkRescueDirectorReportV1({
    rootDir: REPO_ROOT,
    orchestrator,
  });
  const roadmap = buildManufacturerRescueRoadmapV1({ director, orchestrator });
  assert.equal(roadmap.stages[0].workload_type, "owner_review");
  assert.equal(roadmap.stages[1].workload_type, "guarded_apply");
  assert.ok(roadmap.stages[1].estimated_safe_paths_after_stage >= 1);
});

test("director live build reads orchestrator contract", () => {
  const director = buildManufacturerSafeLinkRescueDirectorReportV1({ rootDir: REPO_ROOT });
  assert.equal(director.orchestrator_contract, MANUFACTURER_SAFE_LINK_RESCUE_ORCHESTRATOR_CONTRACT_V1);
  assert.ok(director.ranked_manufacturers.length === 3);
  assert.ok(director.estimates.safe_buyer_paths_unlockable_estimate >= 0);
});

test("director estimates do not claim unlocked coverage", () => {
  const director = buildManufacturerSafeLinkRescueDirectorReportV1({ rootDir: REPO_ROOT });
  assert.equal(director.coverage_unlocked, false);
  assert.match(director.estimates.safe_buyer_paths_unlockable_note, /does not authorize/i);
});
