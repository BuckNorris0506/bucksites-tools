import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
  MANUFACTURER_SAFE_LINK_RESCUE_APPLY_PLAN_CONTRACT_V1,
} from "./manufacturer-safe-link-rescue-apply-plan-factory-v1";
import {
  EXPECTED_PRE_APPLY_ORCHESTRATOR_BLOCKERS_V1,
  EVERYDROP_STALE_CAPTURE_BLOCKERS_V1,
  filterEverydropOrchestratorBlockedReasonsV1,
  isExpectedPreApplyOrchestratorBlockerV1,
  isOperationalOrchestratorBlockerV1,
  resolveEverydropWhirlpoolOwnerApplyLaneEligibleV1,
} from "./manufacturer-safe-link-rescue-everydrop-readiness-unblockers-v1";
import {
  assessManufacturerRescueReadinessCandidateV1,
  buildManufacturerSafeLinkRescueReadinessGateFromInputsV1,
} from "./manufacturer-safe-link-rescue-readiness-gate-v1";
import {
  buildManufacturerSafeLinkRescueOrchestratorReportV1,
  type ManufacturerRescueOrchestratorQueueRowV1,
} from "./manufacturer-safe-link-rescue-orchestrator-v1";
import {
  buildManufacturerSafeLinkRescueRunnerFromInputsV1,
  deriveManufacturerRescueRunnerStageV1,
} from "./manufacturer-safe-link-rescue-runner-v1";
import { MANUFACTURER_SAFE_LINK_RESCUE_DIRECTOR_CONTRACT_V1 } from "./manufacturer-safe-link-rescue-director-v1";
import type { ManufacturerSafeLinkRescueDirectorCommandCenterLaneV1 } from "./manufacturer-safe-link-rescue-director-command-center-v1";
import {
  MANUFACTURER_SAFE_LINK_RESCUE_ORCHESTRATOR_CONTRACT_V1,
  type ManufacturerRescueOrchestratorReportV1,
} from "./manufacturer-safe-link-rescue-orchestrator-v1";
import type { OwnerBrowserProofResultV1 } from "./fridge-safe-link-owner-browser-proof-result-v1";

const REPO_ROOT = process.cwd();
const FRESH_NOW = () => new Date("2026-06-26T12:00:00.000Z");

function freshEverydropProof(slug: "edr3rxd1" | "edr4rxd1"): OwnerBrowserProofResultV1 {
  const rel = `data/fridge/batch-production/drafts/fridge-safe-link-owner-browser-proof-result-${slug}-v1.json`;
  const parsed = JSON.parse(readFileSync(path.join(REPO_ROOT, rel), "utf8")) as OwnerBrowserProofResultV1;
  parsed.checked_at = FRESH_NOW().toISOString();
  return parsed;
}

function everydropQueueRow(
  slug: "edr3rxd1" | "edr4rxd1",
  overrides: Partial<ManufacturerRescueOrchestratorQueueRowV1> = {},
): ManufacturerRescueOrchestratorQueueRowV1 {
  const officialUrl =
    slug === "edr3rxd1"
      ? "https://www.whirlpool.com/accessories/kitchen-accessories/refrigerator/p.ice-and-water-refrigerator-filter-3.edr3rxd1.html"
      : "https://www.whirlpool.com/accessories/kitchen-accessories/refrigerator/p.ice-and-water-refrigerator-filter-4.edr4rxd1.html";
  return {
    filter_slug: slug,
    manufacturer_key: "everydrop_whirlpool",
    oem_part_token: slug.toUpperCase(),
    cohort_lane: "RESCUE_SEARCH_PLACEHOLDER",
    in_fridge_rescue_queue: true,
    rescue_queue_rank: slug === "edr4rxd1" ? 1 : 2,
    census_rescue_priority_score: 220,
    orchestrator_priority_score: 1180,
    expected_safe_coverage_signal: 270,
    existing_evidence_score: 70,
    browser_ready_state: "READY",
    owner_review_readiness: "READY",
    browser_truth_status: "PASS",
    repo_proven_official_target_url: officialUrl,
    adapter_discovery_url: null,
    adapter_discovery_provenance: "UNKNOWN",
    csv_primary_is_search_placeholder: true,
    blocked_reasons: [],
    recommended_next_action: "owner review",
    orchestrator_rank: slug === "edr4rxd1" ? 1 : 2,
    coverage_unlocked: false,
    ...overrides,
  };
}

function everydropDirectorLane(slugs: string[]): ManufacturerSafeLinkRescueDirectorCommandCenterLaneV1 {
  return {
    contract: MANUFACTURER_SAFE_LINK_RESCUE_DIRECTOR_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    csv_apply_authorized: false,
    supabase_mutation_authorized: false,
    browser_automation_authorized: false,
    coverage_unlocked: false,
    recommended_jq_path: ".command_center_v2.manufacturer_safe_link_rescue_director_v1",
    generated_at: "2026-06-26T12:00:00.000Z",
    orchestrator_generated_at: "2026-06-26T12:00:00.000Z",
    director_artifact_path:
      "data/fridge/batch-production/drafts/manufacturer-safe-link-rescue-director-v1.json",
    orchestrator_artifact_path:
      "data/fridge/batch-production/drafts/manufacturer-safe-link-rescue-orchestrator-v1.json",
    scoreboard_artifact_path:
      "data/fridge/batch-production/drafts/manufacturer-safe-link-rescue-scoreboard-v1.json",
    source_command: "npm run buckparts:manufacturer-safe-link-rescue-director",
    manufacturer_rescue_scoreboard: {
      contract: "manufacturer_safe_link_rescue_scoreboard_v1",
      orchestrator_contract: MANUFACTURER_SAFE_LINK_RESCUE_ORCHESTRATOR_CONTRACT_V1,
      generated_at: "2026-06-26T12:00:00.000Z",
      read_only: true,
      data_mutation: false,
      mutation_authorized: false,
      coverage_unlocked: false,
      total_rescue_candidates: slugs.length,
      browser_proofed: slugs.length,
      owner_review_ready: slugs.length,
      safe_buyer_paths_unlocked: 0,
      remaining_opportunity: slugs.length,
      by_manufacturer: [],
    },
    ranked_manufacturers: [],
    safe_buyer_paths_unlocked: 0,
    remaining_opportunity: slugs.length,
    browser_proof_queue: [],
    owner_review_queue: [],
    guarded_apply_queue: slugs.map((slug, index) => ({
      rank: index + 1,
      filter_slug: slug,
      manufacturer_key: "everydrop_whirlpool",
      director_value_score: 1200 - index * 10,
      orchestrator_priority_score: 1180,
      expected_safe_coverage_signal: 270,
      trust_risk: "LOW" as const,
      blocked_reasons: [],
      recommended_next_action: "guarded apply",
    })),
    estimates: {
      safe_buyer_paths_unlockable_estimate: slugs.length,
      safe_buyer_paths_unlockable_note: "estimate",
      browser_hours_required_estimate: 0,
      browser_hours_note: "estimate",
      owner_review_count: slugs.length,
      trust_risk: "LOW",
      trust_risk_factors: [],
      expected_coverage_gain_percent_estimate: 1,
      expected_coverage_gain_note: "estimate",
    },
    trust_risk_summary: { trust_risk: "LOW", trust_risk_factors: [] },
    next_recommended_manufacturer: "everydrop_whirlpool",
    next_recommended_slug: slugs[0] ?? "edr4rxd1",
    best_execution_plan_summary: "apply",
    recommended_next_action: "apply",
    inspect_summary: {
      recommended_jq_paths: {
        standalone_report: ".inspect_summary",
        command_center: ".command_center_v2.manufacturer_safe_link_rescue_director_v1",
      },
      next_recommended_manufacturer: "everydrop_whirlpool",
      next_recommended_slug: slugs[0] ?? "edr4rxd1",
      safe_buyer_paths_unlocked: 0,
      remaining_opportunity: slugs.length,
      browser_proofed_count: slugs.length,
      browser_proof_queue_count: 0,
      owner_review_queue_count: slugs.length,
      guarded_apply_queue_count: slugs.length,
      estimated_coverage_gain_percent_estimate: 1,
      trust_risk: "LOW",
      director_generated_at: "2026-06-26T12:00:00.000Z",
      orchestrator_generated_at: "2026-06-26T12:00:00.000Z",
    },
    proven_facts: [],
    unknown_facts: [],
  };
}

function minimalOrchestrator(rows: ManufacturerRescueOrchestratorQueueRowV1[]): ManufacturerRescueOrchestratorReportV1 {
  return {
    contract: MANUFACTURER_SAFE_LINK_RESCUE_ORCHESTRATOR_CONTRACT_V1,
    framework_contract: "manufacturer_safe_link_rescue_framework_v1",
    source_command: "npm run buckparts:manufacturer-safe-link-rescue-orchestrator",
    generated_at: "2026-06-26T12:00:00.000Z",
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
      total_rescue_candidates: rows.length,
      browser_ready_count: rows.length,
      owner_review_ready_count: rows.length,
      browser_pass_count: rows.length,
      unknown_truth_count: 0,
      blocked_slug_count: 0,
      guarded_apply_candidate_count: rows.length,
    },
    blocked_reasons: [],
    recommended_execution_order: rows.map((r) => r.filter_slug),
    unified_rescue_queue: rows,
    proven_facts: [],
    unknown_facts: [],
    source_paths_read: [],
  };
}

test("isExpectedPreApplyOrchestratorBlockerV1 recognizes artifact authorization flags", () => {
  for (const flag of EXPECTED_PRE_APPLY_ORCHESTRATOR_BLOCKERS_V1) {
    assert.equal(isExpectedPreApplyOrchestratorBlockerV1(flag), true);
  }
  assert.equal(isOperationalOrchestratorBlockerV1("supersession_review_required"), true);
  assert.equal(isOperationalOrchestratorBlockerV1("mutation_authorized=false"), false);
});

test("filterEverydropOrchestratorBlockedReasonsV1 clears stale capture blockers when PASS+fresh", () => {
  const proof = freshEverydropProof("edr3rxd1");
  const adapterBlockers = [
    "live_browser_capture_unavailable_or_failed",
    "exact_token_not_proven",
    "mutation_authorized=false",
    "verified_link_authorized=false",
  ];
  const filtered = filterEverydropOrchestratorBlockedReasonsV1({
    adapterBlockers,
    ownerProof: proof,
    now: FRESH_NOW,
  });
  assert.deepEqual(filtered, []);
  for (const blocker of EVERYDROP_STALE_CAPTURE_BLOCKERS_V1) {
    assert.ok(!filtered.some((r) => r.includes(blocker)));
  }
});

test("filterEverydropOrchestratorBlockedReasonsV1 keeps capture blockers when proof stale", () => {
  const proof = freshEverydropProof("edr3rxd1");
  proof.checked_at = "2026-05-01T00:00:00.000Z";
  const filtered = filterEverydropOrchestratorBlockedReasonsV1({
    adapterBlockers: ["live_browser_capture_unavailable_or_failed", "exact_token_not_proven"],
    ownerProof: proof,
    now: FRESH_NOW,
  });
  assert.deepEqual(filtered, [
    "live_browser_capture_unavailable_or_failed",
    "exact_token_not_proven",
  ]);
});

test("live orchestrator clears everydrop stale capture blockers when proof is fresh", () => {
  const freshProofByRel = new Map<string, string>();
  for (const slug of ["edr3rxd1", "edr4rxd1"] as const) {
    const rel = `data/fridge/batch-production/drafts/fridge-safe-link-owner-browser-proof-result-${slug}-v1.json`;
    freshProofByRel.set(
      path.join(REPO_ROOT, rel),
      JSON.stringify(freshEverydropProof(slug), null, 2),
    );
  }

  const report = buildManufacturerSafeLinkRescueOrchestratorReportV1({
    rootDir: REPO_ROOT,
    now: FRESH_NOW,
    readTextFile: (abs) => {
      const override = freshProofByRel.get(abs);
      if (override) return override;
      return readFileSync(abs, "utf8");
    },
  });

  for (const slug of ["edr3rxd1", "edr4rxd1"] as const) {
    const row = report.unified_rescue_queue.find((r) => r.filter_slug === slug);
    assert.ok(row, slug);
    assert.equal(row.browser_truth_status, "PASS");
    assert.deepEqual(row.blocked_reasons, []);
  }
});

test("everydrop owner_apply_lane_eligible true with fresh proof and READY_FOR_OWNER_REVIEW plan", () => {
  const root = mkdtempSync(path.join(tmpdir(), "everydrop-lane-"));
  const slug = "edr4rxd1";
  const proof = freshEverydropProof(slug);
  const applyPlanRel = `data/fridge/batch-production/drafts/manufacturer-safe-link-rescue-apply-plan-${slug}-v1.json`;
  const applyPlanAbs = path.join(root, applyPlanRel);
  mkdirSync(path.dirname(applyPlanAbs), { recursive: true });
  writeFileSync(
    applyPlanAbs,
    JSON.stringify(
      {
        contract: MANUFACTURER_SAFE_LINK_RESCUE_APPLY_PLAN_CONTRACT_V1,
        plan_status: "READY_FOR_OWNER_REVIEW",
      },
      null,
      2,
    ),
  );

  const row = everydropQueueRow(slug);
  const result = resolveEverydropWhirlpoolOwnerApplyLaneEligibleV1({
    rootDir: root,
    row,
    ownerProof: proof,
    applyPlanRel,
    fileExists: (abs) => existsSync(abs),
    readText: (abs) => readFileSync(abs, "utf8"),
    now: FRESH_NOW,
  });
  assert.equal(result.eligible, true);
});

test("everydrop readiness clears no_unresolved_blockers with only pre-apply flags after orchestrator fix", () => {
  const slug = "edr3rxd1";
  const row = everydropQueueRow(slug, { blocked_reasons: [] });
  const directorLane = everydropDirectorLane([slug]);
  const candidate = assessManufacturerRescueReadinessCandidateV1({
    rootDir: REPO_ROOT,
    row,
    directorLane,
    deployMarker: { marker: "UNKNOWN", marker_source_path: null, proof_after_marker_proven: "UNKNOWN" },
    now: FRESH_NOW,
    fileExists: (abs) => {
      if (abs.includes(`fridge-safe-link-owner-browser-proof-result-${slug}-v1.json`)) return true;
      return existsSync(abs);
    },
    readText: (abs) => {
      if (abs.includes(`fridge-safe-link-owner-browser-proof-result-${slug}-v1.json`)) {
        return JSON.stringify(freshEverydropProof(slug));
      }
      return readFileSync(abs, "utf8");
    },
    founderRows: [],
  });

  const unresolved = candidate.checks.find((c) => c.check_id === "no_unresolved_blockers");
  assert.ok(unresolved);
  assert.equal(unresolved.status, "PASS");
  assert.ok(!candidate.blocking_reasons.includes("unresolved_orchestrator_or_director_blockers"));
});

test("everydrop fresh proof simulation reaches PENDING_OWNER_APPROVAL not UNKNOWN_READINESS", () => {
  const slug = "edr4rxd1";
  const row = everydropQueueRow(slug, { blocked_reasons: [] });
  const root = mkdtempSync(path.join(tmpdir(), "everydrop-gate-"));
  const proofRel = `data/fridge/batch-production/drafts/fridge-safe-link-owner-browser-proof-result-${slug}-v1.json`;
  const proofAbs = path.join(root, proofRel);
  mkdirSync(path.dirname(proofAbs), { recursive: true });
  writeFileSync(proofAbs, JSON.stringify(freshEverydropProof(slug), null, 2));

  const applyPlanRel = `data/fridge/batch-production/drafts/manufacturer-safe-link-rescue-apply-plan-${slug}-v1.json`;
  const applyPlanAbs = path.join(root, applyPlanRel);
  mkdirSync(path.dirname(applyPlanAbs), { recursive: true });
  writeFileSync(
    applyPlanAbs,
    JSON.stringify(
      {
        contract: MANUFACTURER_SAFE_LINK_RESCUE_APPLY_PLAN_CONTRACT_V1,
        plan_status: "READY_FOR_OWNER_REVIEW",
      },
      null,
      2,
    ),
  );

  const gate = buildManufacturerSafeLinkRescueReadinessGateFromInputsV1({
    rootDir: root,
    orchestrator: minimalOrchestrator([row]),
    directorLane: everydropDirectorLane([slug]),
    now: FRESH_NOW,
    fileExists: (abs) => existsSync(abs),
    readText: (abs) => readFileSync(abs, "utf8"),
    founderRows: [],
  });

  const candidate = gate.candidates.find((c) => c.filter_slug === slug);
  assert.ok(candidate);
  assert.equal(candidate.readiness_status, "PENDING_OWNER_APPROVAL");
  assert.equal(candidate.ready_for_apply, false);
  assert.ok(!candidate.blocking_reasons.includes("unresolved_orchestrator_or_director_blockers"));
  assert.ok(!candidate.blocking_reasons.includes("owner_apply_lane_eligible_false"));

  const laneCheck = candidate.checks.find((c) => c.check_id === "owner_apply_lane_eligible");
  assert.ok(laneCheck);
  assert.equal(laneCheck.status, "PASS");
});

test("runner assigns OWNER_REVIEW for everydrop with fresh proof and pending owner approval", () => {
  const slug = "edr3rxd1";
  const row = everydropQueueRow(slug, { blocked_reasons: [] });
  const report = buildManufacturerSafeLinkRescueRunnerFromInputsV1({
    directorLane: everydropDirectorLane([slug]),
    orchestrator: minimalOrchestrator([row]),
    rootDir: REPO_ROOT,
    now: FRESH_NOW,
    fileExists: (abs) => {
      if (abs.includes(`fridge-safe-link-owner-browser-proof-result-${slug}-v1.json`)) return true;
      return existsSync(abs);
    },
    readTextFile: (abs) => {
      if (abs.includes(`fridge-safe-link-owner-browser-proof-result-${slug}-v1.json`)) {
        return JSON.stringify(freshEverydropProof(slug));
      }
      return readFileSync(abs, "utf8");
    },
  });
  const state = report.slug_states.find((s) => s.filter_slug === slug);
  assert.ok(state);
  assert.equal(state.stage, "OWNER_REVIEW");
  assert.equal(
    deriveManufacturerRescueRunnerStageV1({
      row,
      readyForApplySlug: null,
      readinessStatus: "PENDING_OWNER_APPROVAL",
    }),
    "OWNER_REVIEW",
  );
});
