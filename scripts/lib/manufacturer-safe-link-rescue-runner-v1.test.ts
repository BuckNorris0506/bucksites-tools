import assert from "node:assert/strict";
import test from "node:test";

import { MANUFACTURER_SAFE_LINK_RESCUE_DIRECTOR_CONTRACT_V1 } from "./manufacturer-safe-link-rescue-director-v1";
import type { ManufacturerSafeLinkRescueDirectorCommandCenterLaneV1 } from "./manufacturer-safe-link-rescue-director-command-center-v1";
import {
  MANUFACTURER_SAFE_LINK_RESCUE_ORCHESTRATOR_CONTRACT_V1,
  type ManufacturerRescueOrchestratorQueueRowV1,
  type ManufacturerRescueOrchestratorReportV1,
} from "./manufacturer-safe-link-rescue-orchestrator-v1";
import {
  buildManufacturerSafeLinkRescueRunnerFromInputsV1,
  buildManufacturerSafeLinkRescueRunnerV1,
  deriveManufacturerRescueRunnerStageV1,
  MANUFACTURER_SAFE_LINK_RESCUE_RUNNER_CONTRACT_V1,
  MANUFACTURER_SAFE_LINK_RESCUE_RUNNER_STAGES_V1,
  resolveManufacturerRescueReadinessGatePromotionV1,
} from "./manufacturer-safe-link-rescue-runner-v1";
import {
  MANUFACTURER_SAFE_LINK_RESCUE_READINESS_GATE_CONTRACT_V1,
  MANUFACTURER_RESCUE_BROWSER_PROOF_MAX_AGE_DAYS_V1,
  type ManufacturerRescueReadinessGateReportV1,
} from "./manufacturer-safe-link-rescue-readiness-gate-v1";
import {
  manufacturerRescueOwnerProofOfficialPassV1,
  assessManufacturerRescueBrowserProofFreshnessV1,
} from "./manufacturer-safe-link-rescue-owner-browser-proof-evidence-v1";
import { FRIDGE_OWNER_BROWSER_PROOF_RESULT_CONTRACT_V1 } from "./fridge-safe-link-owner-browser-proof-result-v1";

const REPO_ROOT = process.cwd();

function baseQueueRow(
  overrides: Partial<ManufacturerRescueOrchestratorQueueRowV1>,
): ManufacturerRescueOrchestratorQueueRowV1 {
  return {
    filter_slug: "wf3cb",
    manufacturer_key: "frigidaire",
    oem_part_token: "WF3CB",
    cohort_lane: "RESCUE",
    in_fridge_rescue_queue: true,
    rescue_queue_rank: 1,
    census_rescue_priority_score: 100,
    orchestrator_priority_score: 800,
    expected_safe_coverage_signal: 200,
    existing_evidence_score: 10,
    browser_ready_state: "READY",
    owner_review_readiness: "READY",
    browser_truth_status: "NOT_CAPTURED",
    repo_proven_official_target_url: null,
    adapter_discovery_url: "https://example.com/pdp",
    adapter_discovery_provenance: "INFERRED",
    csv_primary_is_search_placeholder: true,
    blocked_reasons: [],
    recommended_next_action: "capture browser proof",
    orchestrator_rank: 1,
    coverage_unlocked: false,
    ...overrides,
  };
}

function minimalDirectorLane(): ManufacturerSafeLinkRescueDirectorCommandCenterLaneV1 {
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
      total_rescue_candidates: 2,
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
    guarded_apply_queue: [
      {
        rank: 1,
        filter_slug: "wf3cb",
        manufacturer_key: "frigidaire",
        director_value_score: 1200,
        orchestrator_priority_score: 1000,
        expected_safe_coverage_signal: 210,
        trust_risk: "LOW",
        blocked_reasons: [],
        recommended_next_action: "guarded apply",
      },
      {
        rank: 2,
        filter_slug: "gswf",
        manufacturer_key: "ge_appliance_parts",
        director_value_score: 900,
        orchestrator_priority_score: 800,
        expected_safe_coverage_signal: 200,
        trust_risk: "LOW",
        blocked_reasons: [],
        recommended_next_action: "guarded apply",
      },
    ],
    nominated_apply_candidates: [
      {
        rank: 1,
        filter_slug: "wf3cb",
        manufacturer_key: "frigidaire",
        director_value_score: 1200,
        orchestrator_priority_score: 1000,
        expected_safe_coverage_signal: 210,
        trust_risk: "LOW",
        blocked_reasons: [],
        recommended_next_action: "guarded apply",
      },
      {
        rank: 2,
        filter_slug: "gswf",
        manufacturer_key: "ge_appliance_parts",
        director_value_score: 900,
        orchestrator_priority_score: 800,
        expected_safe_coverage_signal: 200,
        trust_risk: "LOW",
        blocked_reasons: [],
        recommended_next_action: "guarded apply",
      },
    ],
    readiness_gate_required_before_apply: true,
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
    next_recommended_slug: "wf3cb",
    best_execution_plan_summary: "apply wf3cb",
    recommended_next_action: "apply wf3cb",
    inspect_summary: {
      recommended_jq_paths: {
        standalone_report: ".inspect_summary",
        command_center: ".command_center_v2.manufacturer_safe_link_rescue_director_v1",
      },
      next_recommended_manufacturer: "frigidaire",
      next_recommended_slug: "wf3cb",
      safe_buyer_paths_unlocked: 0,
      remaining_opportunity: 1,
      browser_proofed_count: 1,
      browser_proof_queue_count: 0,
      owner_review_queue_count: 0,
      guarded_apply_queue_count: 2,
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
        guarded_apply_candidate_count: 0,
      },
    blocked_reasons: [],
    recommended_execution_order: rows.map((r) => r.filter_slug),
    unified_rescue_queue: rows,
    proven_facts: [],
    unknown_facts: [],
    source_paths_read: [],
  };
}

test("deriveManufacturerRescueRunnerStageV1 maps core stages deterministically", () => {
  assert.equal(
    deriveManufacturerRescueRunnerStageV1({
      row: baseQueueRow({ cohort_lane: "REFERENCE_ALREADY_APPLIED" }),
      readyForApplySlug: null,
    }),
    "COMPLETE",
  );
  assert.equal(
    deriveManufacturerRescueRunnerStageV1({
      row: baseQueueRow({ browser_ready_state: "BLOCKED", blocked_reasons: ["known_broken_destination"] }),
      readyForApplySlug: null,
    }),
    "BLOCKED",
  );
  assert.equal(
    deriveManufacturerRescueRunnerStageV1({
      row: baseQueueRow({
        browser_truth_status: "PASS",
        owner_review_readiness: "READY",
        csv_primary_is_search_placeholder: true,
      }),
      readyForApplySlug: "wf3cb",
      readinessStatus: "READY_FOR_APPLY",
    }),
    "READY_FOR_APPLY",
  );
  assert.equal(
    deriveManufacturerRescueRunnerStageV1({
      row: baseQueueRow({
        filter_slug: "gswf",
        manufacturer_key: "ge_appliance_parts",
        browser_truth_status: "PASS",
        owner_review_readiness: "READY",
        csv_primary_is_search_placeholder: true,
      }),
      readyForApplySlug: "wf3cb",
    }),
    "OWNER_REVIEW",
  );
  assert.equal(
    deriveManufacturerRescueRunnerStageV1({
      row: baseQueueRow({ browser_truth_status: "NOT_CAPTURED" }),
      readyForApplySlug: null,
    }),
    "BROWSER_PROOF",
  );
});

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
    candidate_count: 2,
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
      {
        filter_slug: "gswf",
        manufacturer_key: "ge_appliance_parts",
        oem_part_token: "GSWF",
        readiness_status: "PENDING_OWNER_APPROVAL",
        ready_for_apply: false,
        director_value_score: 900,
        checks: [],
        blocking_reasons: ["owner_apply_approval_missing"],
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
        PENDING_OWNER_APPROVAL: 1,
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

test("runner enforces exactly one READY_FOR_APPLY slug", () => {
  const rows = [
    baseQueueRow({
      filter_slug: "wf3cb",
      browser_truth_status: "PASS",
      owner_review_readiness: "READY",
      csv_primary_is_search_placeholder: true,
    }),
    baseQueueRow({
      filter_slug: "gswf",
      manufacturer_key: "ge_appliance_parts",
      browser_truth_status: "PASS",
      owner_review_readiness: "READY",
      csv_primary_is_search_placeholder: true,
    }),
  ];
  const report = buildManufacturerSafeLinkRescueRunnerFromInputsV1({
    directorLane: minimalDirectorLane(),
    orchestrator: minimalOrchestrator(rows),
    readinessGate: mockReadyGate("wf3cb"),
    now: () => new Date("2026-06-10T12:00:00.000Z"),
  });

  assert.equal(report.contract, MANUFACTURER_SAFE_LINK_RESCUE_RUNNER_CONTRACT_V1);
  assert.equal(report.read_only, true);
  assert.equal(report.csv_apply_authorized, false);
  assert.equal(report.browser_automation_authorized, false);
  assert.equal(report.ready_for_apply_slug, "wf3cb");
  assert.equal(report.slug_states.filter((s) => s.stage === "READY_FOR_APPLY").length, 1);
  assert.equal(report.ready_for_apply_enforced, true);
  assert.ok(report.boardy_safety_contract.one_at_a_time_apply_enforced);
  assert.ok(report.execution_order[0] === "wf3cb" || report.execution_order.includes("wf3cb"));
});

test("runner live build from repo artifacts", () => {
  const report = buildManufacturerSafeLinkRescueRunnerV1({ rootDir: REPO_ROOT });
  assert.equal(report.contract, MANUFACTURER_SAFE_LINK_RESCUE_RUNNER_CONTRACT_V1);
  assert.ok(report.slug_states.length > 0);
  assert.equal(
    report.slug_states.filter((s) => s.stage === "READY_FOR_APPLY").length <= 1,
    true,
  );
  if (report.ready_for_apply_slug) {
    assert.equal(report.readiness_gate_promotion_status, "LOADED");
    const readyState = report.slug_states.find((s) => s.filter_slug === report.ready_for_apply_slug);
    assert.equal(readyState?.readiness_status, "READY_FOR_APPLY");
  } else {
    assert.equal(report.readiness_gate_summary.ready_for_apply_count, 0);
  }
  for (const stage of report.slug_states.map((s) => s.stage)) {
    assert.ok((MANUFACTURER_SAFE_LINK_RESCUE_RUNNER_STAGES_V1 as readonly string[]).includes(stage));
  }
});

test("runner fails closed when readiness gate artifact missing", () => {
  const rows = [
    baseQueueRow({
      filter_slug: "wf3cb",
      browser_truth_status: "PASS",
      owner_review_readiness: "READY",
      csv_primary_is_search_placeholder: true,
    }),
  ];
  const report = buildManufacturerSafeLinkRescueRunnerFromInputsV1({
    directorLane: minimalDirectorLane(),
    orchestrator: minimalOrchestrator(rows),
    rootDir: REPO_ROOT,
    fileExists: () => false,
    now: () => new Date("2026-06-10T12:00:00.000Z"),
  });

  assert.equal(report.readiness_gate_promotion_status, "UNKNOWN_READINESS_GATE_STALE_OR_MISSING");
  assert.equal(report.readiness_gate_artifact.status, "missing");
  assert.equal(report.ready_for_apply_slug, null);
  assert.equal(report.slug_states.filter((s) => s.stage === "READY_FOR_APPLY").length, 0);
  assert.match(
    report.inspect_summary.top_pending_work_item?.recommended_next_action ?? "",
    /readiness gate/i,
  );
});

test("runner fails closed when readiness gate artifact stale", () => {
  const rows = [
    baseQueueRow({
      filter_slug: "wf3cb",
      browser_truth_status: "PASS",
      owner_review_readiness: "READY",
      csv_primary_is_search_placeholder: true,
    }),
  ];
  const staleGate = mockReadyGate("wf3cb");
  staleGate.orchestrator_generated_at = "2026-06-09T00:00:00.000Z";

  const report = buildManufacturerSafeLinkRescueRunnerFromInputsV1({
    directorLane: minimalDirectorLane(),
    orchestrator: minimalOrchestrator(rows),
    readinessGate: staleGate,
    now: () => new Date("2026-06-10T12:00:00.000Z"),
  });

  assert.equal(report.readiness_gate_promotion_status, "UNKNOWN_READINESS_GATE_STALE_OR_MISSING");
  assert.equal(report.readiness_gate_artifact.status, "stale");
  assert.equal(report.ready_for_apply_slug, null);
  assert.equal(report.slug_states.every((s) => s.readiness_status === "UNKNOWN_READINESS_GATE_STALE_OR_MISSING"), true);
});

test("runner does not live-rebuild readiness gate in normal path", () => {
  const gateRel =
    "data/fridge/batch-production/drafts/manufacturer-safe-link-rescue-readiness-gate-v1.json";
  const rows = [
    baseQueueRow({
      filter_slug: "wf3cb",
      browser_truth_status: "PASS",
      owner_review_readiness: "READY",
      csv_primary_is_search_placeholder: true,
    }),
  ];
  const promotion = resolveManufacturerRescueReadinessGatePromotionV1({
    rootDir: REPO_ROOT,
    orchestrator_generated_at: "2026-06-10T12:00:00.000Z",
    director_generated_at: "2026-06-10T12:00:00.000Z",
    fileExists: (abs) => !abs.endsWith("manufacturer-safe-link-rescue-readiness-gate-v1.json"),
  });
  assert.equal(promotion.promotion.ok, false);
  assert.equal(promotion.promotion.artifact_status, "missing");

  const report = buildManufacturerSafeLinkRescueRunnerFromInputsV1({
    directorLane: minimalDirectorLane(),
    orchestrator: minimalOrchestrator(rows),
    rootDir: REPO_ROOT,
    fileExists: (abs) => !abs.endsWith("manufacturer-safe-link-rescue-readiness-gate-v1.json"),
    now: () => new Date("2026-06-10T12:00:00.000Z"),
  });
  assert.equal(report.readiness_gate_artifact.source_artifact_path, gateRel);
  assert.equal(report.readiness_gate_promotion_status, "UNKNOWN_READINESS_GATE_STALE_OR_MISSING");
  assert.equal(report.ready_for_apply_slug, null);
});

test("runner grants no READY_FOR_APPLY when readiness gate has zero ready candidates", () => {
  const rows = [
    baseQueueRow({
      filter_slug: "wf3cb",
      browser_truth_status: "PASS",
      owner_review_readiness: "READY",
      csv_primary_is_search_placeholder: true,
    }),
  ];
  const gate = mockReadyGate("wf3cb");
  gate.ready_for_apply_slug = null;
  gate.ready_for_apply_count = 0;
  gate.candidates = gate.candidates.map((c) => ({
    ...c,
    ready_for_apply: false,
    readiness_status: "PENDING_OWNER_APPROVAL" as const,
  }));

  const report = buildManufacturerSafeLinkRescueRunnerFromInputsV1({
    directorLane: minimalDirectorLane(),
    orchestrator: minimalOrchestrator(rows),
    readinessGate: gate,
    now: () => new Date("2026-06-10T12:00:00.000Z"),
  });

  assert.equal(report.ready_for_apply_slug, null);
  assert.equal(report.slug_states.filter((s) => s.stage === "READY_FOR_APPLY").length, 0);
});

test("orchestrator and readiness gate share browser proof PASS and freshness helpers", () => {
  const proofArtifact = {
    contract: FRIDGE_OWNER_BROWSER_PROOF_RESULT_CONTRACT_V1,
    verdict: "PASS_BROWSER_PROOF",
    checked_at: "2026-06-06T12:00:00.000Z",
    owner_proof_urls: [
      {
        url: "https://example.com/pdp",
        path_type: "official_manufacturer_pdp",
        browser_proof_status: "PASS",
      },
    ],
  };
  assert.equal(manufacturerRescueOwnerProofOfficialPassV1(proofArtifact), true);
  const freshness = assessManufacturerRescueBrowserProofFreshnessV1({
    artifact: proofArtifact,
    now: () => new Date("2026-06-10T12:00:00.000Z"),
  });
  assert.equal(freshness.fresh, true);
  assert.equal(freshness.max_age_days, MANUFACTURER_RESCUE_BROWSER_PROOF_MAX_AGE_DAYS_V1);
});
