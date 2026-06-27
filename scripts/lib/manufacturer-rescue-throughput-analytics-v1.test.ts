import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
  classifyManufacturerRescueFunnelStageV1,
  buildManufacturerRescueThroughputAnalyticsV1,
  MANUFACTURER_RESCUE_THROUGHPUT_ANALYTICS_CONTRACT_V1,
  writeManufacturerRescueThroughputAnalyticsArtifactsV1,
} from "./manufacturer-rescue-throughput-analytics-v1";
import type { ManufacturerRescueOrchestratorQueueRowV1 } from "./manufacturer-safe-link-rescue-orchestrator-v1";

const REPO_ROOT = process.cwd();

function baseRow(
  overrides: Partial<ManufacturerRescueOrchestratorQueueRowV1>,
): ManufacturerRescueOrchestratorQueueRowV1 {
  return {
    filter_slug: "edr4rxd1",
    manufacturer_key: "everydrop_whirlpool",
    oem_part_token: "EDR4RXD1",
    cohort_lane: "RESCUE_SEARCH_PLACEHOLDER",
    in_fridge_rescue_queue: true,
    rescue_queue_rank: 1,
    census_rescue_priority_score: 100,
    orchestrator_priority_score: 900,
    expected_safe_coverage_signal: 200,
    existing_evidence_score: 10,
    browser_ready_state: "READY",
    owner_review_readiness: "READY",
    browser_truth_status: "PASS",
    repo_proven_official_target_url: "https://example.com/pdp",
    adapter_discovery_url: null,
    adapter_discovery_provenance: "UNKNOWN",
    csv_primary_is_search_placeholder: true,
    blocked_reasons: [],
    recommended_next_action: "test",
    orchestrator_rank: 1,
    coverage_unlocked: false,
    ...overrides,
  };
}

test("classifyManufacturerRescueFunnelStageV1 maps runner READY_FOR_APPLY", () => {
  const stage = classifyManufacturerRescueFunnelStageV1({
    slug: "edr4rxd1",
    orchestrator_row: baseRow({}),
    factory_assessment: undefined,
    refresh_scheduled: false,
    apply_plan_ready: false,
    owner_approval_cohort: false,
    readiness_ready: false,
    runner_state: {
      filter_slug: "edr4rxd1",
      manufacturer_key: "everydrop_whirlpool",
      oem_part_token: "EDR4RXD1",
      stage: "READY_FOR_APPLY",
      readiness_status: "READY_FOR_APPLY",
      execution_rank: 1,
      next_executable_action: "apply",
      executable_now: true,
      blocked_reasons: [],
      trust_risk: "LOW",
      director_value_score: 100,
      boardy_safety_rules: [],
      orchestrator_recommended_next_action: "test",
      coverage_unlocked: false,
    },
  });
  assert.equal(stage, "runner_ready_for_apply");
});

test("classifyManufacturerRescueFunnelStageV1 maps capture scheduled from factory", () => {
  const stage = classifyManufacturerRescueFunnelStageV1({
    slug: "mwf",
    orchestrator_row: baseRow({ filter_slug: "mwf", manufacturer_key: "ge_appliance_parts" }),
    factory_assessment: {
      filter_slug: "mwf",
      manufacturer_key: "ge_appliance_parts",
      oem_part_token: "MWF",
      capture_strategy: "ge_automated_playwright_spec_capture",
      evidence_status: "MISSING",
      owner_proof_artifact_rel: null,
      owner_proof_checked_at: null,
      official_pass: false,
      freshness_notes: null,
      capture_work_required: true,
      capture_work_reason: "owner_browser_proof_artifact_missing",
      target_url: "https://example.com/ge",
      adapter_discovery_url: null,
      blocked_reasons: [],
      normalization_draft_rel: null,
      recommended_capture_command: "npm run buckparts:ge-refrigerator-rescue-capture -- --all",
    },
    refresh_scheduled: true,
    apply_plan_ready: false,
    owner_approval_cohort: false,
    readiness_ready: false,
    runner_state: undefined,
  });
  assert.equal(stage, "browser_proof_capture_scheduled");
});

test("analytics against live repo produces funnel metrics", () => {
  const report = buildManufacturerRescueThroughputAnalyticsV1({
    rootDir: REPO_ROOT,
    now: () => new Date("2026-06-26T12:00:00.000Z"),
  });
  assert.equal(report.contract, MANUFACTURER_RESCUE_THROUGHPUT_ANALYTICS_CONTRACT_V1);
  assert.equal(report.read_only, true);
  assert.equal(report.data_mutation, false);
  assert.ok(report.funnel_metrics.rescue_candidate_count > 0);
  assert.ok(report.blocker_distribution.length > 0);
  assert.ok(report.manufacturer_throughput.length > 0);
  assert.equal(report.weekly_unlock_capacity_estimate.estimated_slugs_per_week, "UNKNOWN");
  assert.ok(report.top_bottleneck_ranking.length > 0);
  assert.ok(report.recommended_highest_leverage_improvement.recommendation.length > 0);
});

test("analytics artifacts are read-only", () => {
  const root = mkdtempSync(path.join(tmpdir(), "mfr-throughput-analytics-"));
  const report = buildManufacturerRescueThroughputAnalyticsV1({
    rootDir: REPO_ROOT,
    now: () => new Date("2026-06-26T12:00:00.000Z"),
  });
  const written = writeManufacturerRescueThroughputAnalyticsArtifactsV1({
    rootDir: root,
    report,
  });
  const parsed = JSON.parse(
    readFileSync(path.join(root, written.jsonRelPath), "utf8"),
  ) as { read_only: boolean; mutation_authorized: boolean };
  assert.equal(parsed.read_only, true);
  assert.equal(parsed.mutation_authorized, false);
  assert.ok(readFileSync(path.join(root, written.mdRelPath), "utf8").includes("Funnel stage counts"));
});

test("incomplete intake fails closed without throwing", () => {
  const root = mkdtempSync(path.join(tmpdir(), "mfr-throughput-empty-"));
  const report = buildManufacturerRescueThroughputAnalyticsV1({
    rootDir: root,
    fileExists: () => false,
    now: () => new Date("2026-06-26T12:00:00.000Z"),
  });
  assert.equal(report.intake_complete, false);
  assert.equal(report.funnel_metrics.rescue_candidate_count, 0);
  assert.equal(report.artifact_intake.orchestrator.status, "MISSING");
});

test("MCP projection loads committed analytics artifact", async () => {
  const root = mkdtempSync(path.join(tmpdir(), "mfr-throughput-mcp-"));
  const report = buildManufacturerRescueThroughputAnalyticsV1({
    rootDir: REPO_ROOT,
    now: () => new Date("2026-06-26T12:00:00.000Z"),
  });
  const jsonAbs = path.join(
    root,
    "data/fridge/batch-production/drafts/manufacturer-rescue-throughput-analytics-v1.json",
  );
  mkdirSync(path.dirname(jsonAbs), { recursive: true });
  writeFileSync(jsonAbs, `${JSON.stringify(report)}\n`, "utf8");

  const { manufacturerRescueThroughputAnalyticsV1 } = await import(
    "./buckparts-mcp-manufacturer-rescue-throughput-analytics-v1"
  );
  const result = manufacturerRescueThroughputAnalyticsV1({ rootDir: root });
  assert.equal(result.truth_status, "PROVEN");
  assert.equal(result.intake_complete, report.intake_complete);
});
