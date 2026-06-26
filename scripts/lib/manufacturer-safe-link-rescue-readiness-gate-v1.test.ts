import assert from "node:assert/strict";
import test from "node:test";

import { MANUFACTURER_SAFE_LINK_RESCUE_DIRECTOR_CONTRACT_V1 } from "./manufacturer-safe-link-rescue-director-v1";
import type { ManufacturerSafeLinkRescueDirectorCommandCenterLaneV1 } from "./manufacturer-safe-link-rescue-director-command-center-v1";
import {
  assessManufacturerRescueReadinessCandidateV1,
  buildManufacturerSafeLinkRescueReadinessGateFromInputsV1,
  buildManufacturerSafeLinkRescueReadinessGateV1,
  MANUFACTURER_RESCUE_BROWSER_PROOF_MAX_AGE_DAYS_V1,
  MANUFACTURER_SAFE_LINK_RESCUE_READINESS_GATE_CONTRACT_V1,
  type ManufacturerRescueReadinessGateReportV1,
} from "./manufacturer-safe-link-rescue-readiness-gate-v1";
import {
  MANUFACTURER_SAFE_LINK_RESCUE_ORCHESTRATOR_CONTRACT_V1,
  type ManufacturerRescueOrchestratorQueueRowV1,
  type ManufacturerRescueOrchestratorReportV1,
} from "./manufacturer-safe-link-rescue-orchestrator-v1";
import {
  buildManufacturerSafeLinkRescueRunnerFromInputsV1,
  deriveManufacturerRescueRunnerStageV1,
} from "./manufacturer-safe-link-rescue-runner-v1";

const REPO_ROOT = process.cwd();

function baseQueueRow(
  overrides: Partial<ManufacturerRescueOrchestratorQueueRowV1>,
): ManufacturerRescueOrchestratorQueueRowV1 {
  return {
    filter_slug: "ultrawf",
    manufacturer_key: "frigidaire",
    oem_part_token: "ULTRAWF",
    cohort_lane: "RESCUE",
    in_fridge_rescue_queue: true,
    rescue_queue_rank: 1,
    census_rescue_priority_score: 100,
    orchestrator_priority_score: 900,
    expected_safe_coverage_signal: 200,
    existing_evidence_score: 10,
    browser_ready_state: "READY",
    owner_review_readiness: "READY",
    browser_truth_status: "PASS",
    repo_proven_official_target_url: "https://example.com/ultrawf",
    adapter_discovery_url: "https://example.com/ultrawf",
    adapter_discovery_provenance: "INFERRED",
    csv_primary_is_search_placeholder: true,
    blocked_reasons: ["confusion_family_review_required"],
    recommended_next_action: "owner review",
    orchestrator_rank: 1,
    coverage_unlocked: false,
    ...overrides,
  };
}

function minimalDirectorLane(
  slugs: string[] = ["ultrawf"],
): ManufacturerSafeLinkRescueDirectorCommandCenterLaneV1 {
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
    generated_at: "2026-06-10T12:00:00.000Z",
    orchestrator_generated_at: "2026-06-10T12:00:00.000Z",
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
      generated_at: "2026-06-10T12:00:00.000Z",
      read_only: true,
      data_mutation: false,
      mutation_authorized: false,
      coverage_unlocked: false,
      total_rescue_candidates: slugs.length,
      browser_proofed: 1,
      owner_review_ready: 1,
      safe_buyer_paths_unlocked: 0,
      remaining_opportunity: 1,
      by_manufacturer: [],
    },
    ranked_manufacturers: [],
    safe_buyer_paths_unlocked: 0,
    remaining_opportunity: 1,
    browser_proof_queue: [],
    owner_review_queue: [],
    guarded_apply_queue: slugs.map((slug, index) => ({
      rank: index + 1,
      filter_slug: slug,
      manufacturer_key: "frigidaire",
      director_value_score: 1200 - index * 100,
      orchestrator_priority_score: 1000,
      expected_safe_coverage_signal: 210,
      trust_risk: "LOW" as const,
      blocked_reasons: slug === "ultrawf" ? ["confusion_family_review_required"] : [],
      recommended_next_action: "guarded apply",
    })),
    estimates: {
      safe_buyer_paths_unlockable_estimate: 1,
      safe_buyer_paths_unlockable_note: "estimate",
      browser_hours_required_estimate: 1,
      browser_hours_note: "estimate",
      owner_review_count: 1,
      trust_risk: "LOW",
      trust_risk_factors: [],
      expected_coverage_gain_percent_estimate: 1,
      expected_coverage_gain_note: "estimate",
    },
    trust_risk_summary: { trust_risk: "LOW", trust_risk_factors: [] },
    next_recommended_manufacturer: "frigidaire",
    next_recommended_slug: slugs[0] ?? "ultrawf",
    best_execution_plan_summary: "apply",
    recommended_next_action: "apply",
    inspect_summary: {
      recommended_jq_paths: {
        standalone_report: ".inspect_summary",
        command_center: ".command_center_v2.manufacturer_safe_link_rescue_director_v1",
      },
      next_recommended_manufacturer: "frigidaire",
      next_recommended_slug: slugs[0] ?? "ultrawf",
      safe_buyer_paths_unlocked: 0,
      remaining_opportunity: 1,
      browser_proofed_count: 1,
      browser_proof_queue_count: 0,
      owner_review_queue_count: 0,
      guarded_apply_queue_count: slugs.length,
      estimated_coverage_gain_percent_estimate: 1,
      trust_risk: "LOW",
      director_generated_at: "2026-06-10T12:00:00.000Z",
      orchestrator_generated_at: "2026-06-10T12:00:00.000Z",
    },
    proven_facts: [],
    unknown_facts: [],
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
    browser_automation_authorized: false,
    coverage_unlocked: false,
    verified_link_authorized: false,
    registered_manufacturers: [],
    manufacturer_summaries: [],
    rescue_counts: {
      total_rescue_candidates: rows.length,
      browser_ready_count: 0,
      owner_review_ready_count: 0,
      browser_pass_count: 0,
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

function mockReadyGate(readySlug: string): ManufacturerRescueReadinessGateReportV1 {
  return {
    contract: MANUFACTURER_SAFE_LINK_RESCUE_READINESS_GATE_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    csv_apply_authorized: false,
    supabase_mutation_authorized: false,
    browser_automation_authorized: false,
    coverage_unlocked: false,
    generated_at: "2026-06-10T12:00:00.000Z",
    source_command: "npm run buckparts:manufacturer-safe-link-rescue-readiness-gate",
    orchestrator_contract: MANUFACTURER_SAFE_LINK_RESCUE_ORCHESTRATOR_CONTRACT_V1,
    orchestrator_generated_at: "2026-06-10T12:00:00.000Z",
    director_generated_at: "2026-06-10T12:00:00.000Z",
    browser_proof_max_age_days: MANUFACTURER_RESCUE_BROWSER_PROOF_MAX_AGE_DAYS_V1,
    deploy_build_marker: {
      marker: "UNKNOWN",
      marker_source_path: null,
      proof_after_marker_proven: "UNKNOWN",
    },
    candidate_count: 1,
    candidates: [
      {
        filter_slug: readySlug,
        manufacturer_key: "frigidaire",
        oem_part_token: readySlug.toUpperCase(),
        readiness_status: "READY_FOR_APPLY",
        ready_for_apply: true,
        director_value_score: 1200,
        checks: [],
        blocking_reasons: [],
        source_paths_read: [],
      },
    ],
    ready_for_apply_slug: readySlug,
    ready_for_apply_count: 1,
    top_pending_work_item: null,
    readiness_summary: {
      by_status: {
        READY_FOR_APPLY: 1,
        PENDING_BROWSER_REFRESH: 0,
        PENDING_CONFUSION_FAMILY_REVIEW: 0,
        PENDING_OWNER_APPROVAL: 0,
        PENDING_APPLY_PLAN: 0,
        BLOCKED_WRONG_FAMILY_RISK: 0,
        BLOCKED_MISSING_PROOF: 0,
        UNKNOWN_READINESS: 0,
      },
      ready_for_apply_slugs: [readySlug],
    },
    inspect_summary: {
      recommended_jq_paths: {
        standalone_report: ".inspect_summary",
        command_center:
          ".command_center_v2.manufacturer_safe_link_rescue_runner_v1.readiness_gate_summary",
        ready_for_apply_slug: ".ready_for_apply_slug",
        top_pending_work_item: ".top_pending_work_item",
      },
      recommended_next_action: `READY_FOR_APPLY proven for ${readySlug}`,
    },
    proven_facts: [],
    unknown_facts: [],
  };
}

test("ultrawf is not READY_FOR_APPLY in live readiness gate", () => {
  const gate = buildManufacturerSafeLinkRescueReadinessGateV1({
    rootDir: REPO_ROOT,
    now: () => new Date("2026-06-10T12:00:00.000Z"),
  });
  const ultrawf = gate.candidates.find((c) => c.filter_slug === "ultrawf");
  assert.ok(ultrawf, "ultrawf should be in readiness gate scope");
  assert.notEqual(ultrawf.readiness_status, "READY_FOR_APPLY");
  assert.equal(ultrawf.ready_for_apply, false);
  assert.ok(
    ultrawf.readiness_status === "PENDING_BROWSER_REFRESH" ||
      ultrawf.readiness_status === "PENDING_CONFUSION_FAMILY_REVIEW",
    `expected PENDING_BROWSER_REFRESH or PENDING_CONFUSION_FAMILY_REVIEW, got ${ultrawf.readiness_status}`,
  );
  assert.ok(ultrawf.blocking_reasons.length > 0);
  assert.equal(gate.ready_for_apply_slug, null);
  assert.equal(gate.ready_for_apply_count, 0);
});

test("no candidate is READY_FOR_APPLY without fresh browser proof", () => {
  const row = baseQueueRow({
    blocked_reasons: [],
    browser_truth_status: "PASS",
  });
  const directorLane = minimalDirectorLane(["ultrawf"]);
  const orchestrator = minimalOrchestrator([row]);
  const gate = buildManufacturerSafeLinkRescueReadinessGateFromInputsV1({
    rootDir: REPO_ROOT,
    orchestrator,
    directorLane,
    now: () => new Date("2026-07-01T12:00:00.000Z"),
  });
  const candidate = gate.candidates.find((c) => c.filter_slug === "ultrawf");
  assert.ok(candidate);
  assert.notEqual(candidate.readiness_status, "READY_FOR_APPLY");
  const freshCheck = candidate.checks.find((c) => c.check_id === "browser_proof_fresh");
  assert.ok(freshCheck);
  assert.equal(freshCheck.status, "FAIL");
});

test("no candidate is READY_FOR_APPLY without owner approval", () => {
  const row = baseQueueRow({ blocked_reasons: [] });
  const candidate = assessManufacturerRescueReadinessCandidateV1({
    rootDir: REPO_ROOT,
    row,
    directorLane: minimalDirectorLane(),
    deployMarker: { marker: "UNKNOWN", marker_source_path: null, proof_after_marker_proven: "UNKNOWN" },
    now: () => new Date("2026-06-10T12:00:00.000Z"),
    founderRows: [],
  });
  assert.notEqual(candidate.readiness_status, "READY_FOR_APPLY");
  assert.ok(candidate.blocking_reasons.includes("owner_apply_approval_missing"));
});

test("no candidate is READY_FOR_APPLY with unresolved confusion-family review", () => {
  const row = baseQueueRow({
    blocked_reasons: ["confusion_family_review_required"],
  });
  const candidate = assessManufacturerRescueReadinessCandidateV1({
    rootDir: REPO_ROOT,
    row,
    directorLane: minimalDirectorLane(),
    deployMarker: { marker: "UNKNOWN", marker_source_path: null, proof_after_marker_proven: "UNKNOWN" },
    now: () => new Date("2026-06-10T12:00:00.000Z"),
    founderRows: [],
  });
  assert.equal(candidate.readiness_status, "PENDING_CONFUSION_FAMILY_REVIEW");
  assert.equal(candidate.ready_for_apply, false);
});

test("zero READY_FOR_APPLY is valid when nothing is actually ready", () => {
  const gate = buildManufacturerSafeLinkRescueReadinessGateFromInputsV1({
    rootDir: REPO_ROOT,
    orchestrator: minimalOrchestrator([baseQueueRow({})]),
    directorLane: minimalDirectorLane(),
    now: () => new Date("2026-06-10T12:00:00.000Z"),
  });
  assert.equal(gate.ready_for_apply_count, 0);
  assert.equal(gate.ready_for_apply_slug, null);
  assert.ok(gate.top_pending_work_item);
});

test("runner does not invent READY_FOR_APPLY without readiness gate proof", () => {
  const rows = [
    baseQueueRow({
      filter_slug: "wf3cb",
      oem_part_token: "WF3CB",
      browser_truth_status: "PASS",
      blocked_reasons: [],
    }),
    baseQueueRow({
      filter_slug: "ultrawf",
      oem_part_token: "ULTRAWF",
      blocked_reasons: ["confusion_family_review_required"],
    }),
  ];
  const report = buildManufacturerSafeLinkRescueRunnerFromInputsV1({
    directorLane: minimalDirectorLane(["wf3cb", "ultrawf"]),
    orchestrator: minimalOrchestrator(rows),
    rootDir: REPO_ROOT,
    now: () => new Date("2026-06-10T12:00:00.000Z"),
  });
  assert.equal(report.ready_for_apply_slug, null);
  assert.equal(report.slug_states.filter((s) => s.stage === "READY_FOR_APPLY").length, 0);
  assert.ok(report.inspect_summary.top_pending_work_item);
});

test("runner assigns READY_FOR_APPLY only from readiness gate READY_FOR_APPLY", () => {
  const rows = [
    baseQueueRow({
      filter_slug: "wf3cb",
      oem_part_token: "WF3CB",
      browser_truth_status: "PASS",
      blocked_reasons: [],
    }),
    baseQueueRow({
      filter_slug: "gswf",
      manufacturer_key: "ge_appliance_parts",
      oem_part_token: "GSWF",
      browser_truth_status: "PASS",
      blocked_reasons: [],
    }),
  ];
  const report = buildManufacturerSafeLinkRescueRunnerFromInputsV1({
    directorLane: minimalDirectorLane(["wf3cb", "gswf"]),
    orchestrator: minimalOrchestrator(rows),
    readinessGate: mockReadyGate("wf3cb"),
    now: () => new Date("2026-06-10T12:00:00.000Z"),
  });
  assert.equal(report.ready_for_apply_slug, "wf3cb");
  assert.equal(report.slug_states.filter((s) => s.stage === "READY_FOR_APPLY").length, 1);
});

test("deriveManufacturerRescueRunnerStageV1 requires readiness gate READY_FOR_APPLY", () => {
  const row = baseQueueRow({
    filter_slug: "wf3cb",
    blocked_reasons: [],
  });
  assert.equal(
    deriveManufacturerRescueRunnerStageV1({
      row,
      readyForApplySlug: "wf3cb",
      readinessStatus: "READY_FOR_APPLY",
    }),
    "READY_FOR_APPLY",
  );
  assert.notEqual(
    deriveManufacturerRescueRunnerStageV1({
      row,
      readyForApplySlug: "wf3cb",
      readinessStatus: "PENDING_OWNER_APPROVAL",
    }),
    "READY_FOR_APPLY",
  );
});

test("readiness gate report is read-only with no mutation flags", () => {
  const gate = buildManufacturerSafeLinkRescueReadinessGateV1({ rootDir: REPO_ROOT });
  assert.equal(gate.contract, MANUFACTURER_SAFE_LINK_RESCUE_READINESS_GATE_CONTRACT_V1);
  assert.equal(gate.read_only, true);
  assert.equal(gate.data_mutation, false);
  assert.equal(gate.mutation_authorized, false);
  assert.equal(gate.csv_apply_authorized, false);
  assert.equal(gate.supabase_mutation_authorized, false);
  assert.equal(gate.browser_automation_authorized, false);
  assert.equal(gate.coverage_unlocked, false);
});
