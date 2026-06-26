import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
  buildManufacturerBrowserProofGeNormalizationExecutionPacketV1,
  buildManufacturerBrowserProofExecutionFactoryV1,
  MANUFACTURER_BROWSER_PROOF_EXECUTION_FACTORY_CONTRACT_V1,
  writeManufacturerBrowserProofExecutionFactoryArtifactsV1,
} from "./manufacturer-browser-proof-execution-factory-v1";
import {
  MANUFACTURER_BROWSER_PROOF_FACTORY_CONTRACT_V1,
  MANUFACTURER_BROWSER_PROOF_FACTORY_JSON_REL_V1,
  type ManufacturerBrowserProofSlugAssessmentV1,
} from "./manufacturer-browser-proof-factory-v1";
import {
  MANUFACTURER_BROWSER_PROOF_REFRESH_ORCHESTRATOR_CONTRACT_V1,
  MANUFACTURER_BROWSER_PROOF_REFRESH_ORCHESTRATOR_JSON_REL_V1,
  type ManufacturerBrowserProofRefreshBatchV1,
} from "./manufacturer-browser-proof-refresh-orchestrator-v1";
import {
  MANUFACTURER_SAFE_LINK_RESCUE_ORCHESTRATOR_CONTRACT_V1,
  MANUFACTURER_SAFE_LINK_RESCUE_ORCHESTRATOR_JSON_REL_V1,
  type ManufacturerRescueOrchestratorQueueRowV1,
} from "./manufacturer-safe-link-rescue-orchestrator-v1";

const REPO_ROOT = process.cwd();

function orchestratorRow(
  overrides: Partial<ManufacturerRescueOrchestratorQueueRowV1>,
): ManufacturerRescueOrchestratorQueueRowV1 {
  return {
    filter_slug: "mwf",
    manufacturer_key: "ge_appliance_parts",
    oem_part_token: "MWF",
    cohort_lane: "RESCUE_SEARCH_PLACEHOLDER",
    in_fridge_rescue_queue: true,
    rescue_queue_rank: 1,
    census_rescue_priority_score: 100,
    orchestrator_priority_score: 900,
    expected_safe_coverage_signal: 200,
    existing_evidence_score: 10,
    browser_ready_state: "READY",
    owner_review_readiness: "READY",
    browser_truth_status: "NOT_CAPTURED",
    repo_proven_official_target_url: "https://www.geapplianceparts.com/store/parts/spec/MWF",
    adapter_discovery_url: "https://www.geapplianceparts.com/store/parts/spec/MWF",
    adapter_discovery_provenance: "INFERRED_GE_SPEC",
    csv_primary_is_search_placeholder: true,
    blocked_reasons: [],
    recommended_next_action: "test",
    orchestrator_rank: 1,
    coverage_unlocked: false,
    ...overrides,
  };
}

function assessment(
  overrides: Partial<ManufacturerBrowserProofSlugAssessmentV1>,
): ManufacturerBrowserProofSlugAssessmentV1 {
  return {
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
    target_url: "https://www.geapplianceparts.com/store/parts/spec/MWF",
    adapter_discovery_url: null,
    blocked_reasons: [],
    normalization_draft_rel: null,
    recommended_capture_command: "npm run buckparts:ge-refrigerator-rescue-capture -- --all",
    ...overrides,
  };
}

function refreshBatch(
  overrides: Partial<ManufacturerBrowserProofRefreshBatchV1> = {},
): ManufacturerBrowserProofRefreshBatchV1 {
  return {
    batch_id: "refresh_batch_ge-appliance-parts",
    manufacturer_key: "ge_appliance_parts",
    scheduled_slug_count: 1,
    work_items: [
      {
        filter_slug: "mwf",
        oem_part_token: "MWF",
        capture_strategy: "ge_automated_playwright_spec_capture",
        evidence_status: "MISSING",
        schedule_reasons: ["owner_browser_proof_artifact_missing"],
        refresh_priority: 100,
        recommended_capture_command: "npm run buckparts:ge-refrigerator-rescue-capture -- --all",
        target_url: "https://www.geapplianceparts.com/store/parts/spec/MWF",
        owner_proof_artifact_rel: null,
        normalization_draft_only: true,
        auto_pass_forbidden: true,
      },
    ],
    capture_strategies: ["ge_automated_playwright_spec_capture"],
    capture_commands: ["npm run buckparts:ge-refrigerator-rescue-capture -- --all"],
    max_refresh_priority: 100,
    schedule_reasons: ["owner_browser_proof_artifact_missing"],
    ge_normalization_draft_only: true,
    auto_pass_forbidden: true,
    browser_automation_authorized: false,
    post_capture_owner_action: "Review GE normalization draft before PASS.",
    ...overrides,
  };
}

function writeFixtureArtifacts(root: string): void {
  const factory = {
    contract: MANUFACTURER_BROWSER_PROOF_FACTORY_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    csv_apply_authorized: false,
    supabase_mutation_authorized: false,
    browser_automation_authorized: false,
    coverage_unlocked: false,
    generated_at: "2026-06-26T12:00:00.000Z",
    source_command: "npm run buckparts:manufacturer-browser-proof-factory",
    orchestrator_contract: MANUFACTURER_SAFE_LINK_RESCUE_ORCHESTRATOR_CONTRACT_V1,
    orchestrator_generated_at: "2026-06-26T12:00:00.000Z",
    browser_proof_max_age_days: 14,
    slug_assessment_count: 1,
    capture_work_required_count: 1,
    fresh_official_pass_count: 0,
    stale_count: 0,
    missing_count: 1,
    blocked_count: 0,
    slug_assessments: [assessment({})],
    capture_batches: [],
    normalization_draft_rels: [],
    inspect_summary: {
      recommended_next_action: "test",
      readiness_gate_note: "test",
      apply_plan_factory_note: "test",
    },
    proven_facts: [],
    unknown_facts: [],
  };

  const refreshOrchestrator = {
    contract: MANUFACTURER_BROWSER_PROOF_REFRESH_ORCHESTRATOR_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    csv_apply_authorized: false,
    supabase_mutation_authorized: false,
    browser_automation_authorized: false,
    coverage_unlocked: false,
    auto_pass_forbidden: true,
    readiness_gate_promotion_authorized: false,
    generated_at: "2026-06-26T12:00:00.000Z",
    source_command: "npm run buckparts:manufacturer-browser-proof-refresh-orchestrator",
    factory_contract: MANUFACTURER_BROWSER_PROOF_FACTORY_CONTRACT_V1,
    factory_artifact_path: MANUFACTURER_BROWSER_PROOF_FACTORY_JSON_REL_V1,
    factory_generated_at: "2026-06-26T12:00:00.000Z",
    factory_orchestrator_generated_at: "2026-06-26T12:00:00.000Z",
    browser_proof_max_age_days: 14,
    deploy_build_marker: {
      marker: "UNKNOWN",
      marker_source_path: null,
      proof_after_marker_proven: "UNKNOWN",
    },
    scheduled_slug_count: 1,
    manufacturer_refresh_batch_count: 1,
    manufacturer_refresh_batches: [refreshBatch()],
    manufacturer_refresh_batch_rels: [
      "data/fridge/batch-production/drafts/manufacturer-browser-proof-refresh-batch-ge-appliance-parts-v1.json",
    ],
    inspect_summary: {
      recommended_next_action: "test",
      readiness_gate_note: "test",
      factory_note: "test",
    },
    proven_facts: [],
    unknown_facts: [],
  };

  const rescueOrchestrator = {
    contract: MANUFACTURER_SAFE_LINK_RESCUE_ORCHESTRATOR_CONTRACT_V1,
    generated_at: "2026-06-26T12:00:00.000Z",
    unified_rescue_queue: [orchestratorRow({})],
  };

  for (const [rel, payload] of [
    [MANUFACTURER_BROWSER_PROOF_FACTORY_JSON_REL_V1, factory],
    [MANUFACTURER_BROWSER_PROOF_REFRESH_ORCHESTRATOR_JSON_REL_V1, refreshOrchestrator],
    [MANUFACTURER_SAFE_LINK_RESCUE_ORCHESTRATOR_JSON_REL_V1, rescueOrchestrator],
  ] as const) {
    const abs = path.join(root, rel);
    mkdirSync(path.dirname(abs), { recursive: true });
    writeFileSync(abs, `${JSON.stringify(payload)}\n`, "utf8");
  }
}

test("GE normalization execution packet never auto-grants PASS", () => {
  const packet = buildManufacturerBrowserProofGeNormalizationExecutionPacketV1({
    rootDir: REPO_ROOT,
    workItem: refreshBatch().work_items[0]!,
    assessment: assessment({}),
    orchestratorRow: orchestratorRow({}),
    fileExists: () => false,
  });
  assert.equal(packet.auto_pass_forbidden, true);
  assert.equal(packet.owner_confirmation_required_before_pass, true);
  assert.equal(packet.prepared_verdict, "NEEDS_OWNER_BROWSER_REVIEW");
  assert.equal(packet.normalization_status, "CAPTURE_REQUIRED_UNKNOWN");
});

test("execution factory fails closed without refresh orchestrator artifact", () => {
  const root = mkdtempSync(path.join(tmpdir(), "mfr-exec-factory-missing-"));
  assert.throws(
    () => buildManufacturerBrowserProofExecutionFactoryV1({ rootDir: root, fileExists: () => false }),
    /refresh-orchestrator artifact missing/,
  );
});

test("execution factory produces manifests from committed upstream artifacts", () => {
  const root = mkdtempSync(path.join(tmpdir(), "mfr-exec-factory-"));
  writeFixtureArtifacts(root);
  const report = buildManufacturerBrowserProofExecutionFactoryV1({
    rootDir: root,
    now: () => new Date("2026-06-26T12:00:00.000Z"),
  });
  assert.equal(report.contract, MANUFACTURER_BROWSER_PROOF_EXECUTION_FACTORY_CONTRACT_V1);
  assert.equal(report.intake_complete, true);
  assert.equal(report.auto_pass_forbidden, true);
  assert.equal(report.browser_automation_authorized, false);
  assert.equal(report.manufacturer_execution_batch_count, 1);
  assert.equal(report.execution_packets.length, 1);
  assert.equal(report.owner_session_packets.length, 1);
  assert.equal(report.ge_normalization_packets.length, 1);
  assert.ok(report.owner_session_packets[0]!.session_slugs[0]!.exact_urls.length > 0);
  assert.equal(report.owner_session_packets[0]!.session_slugs[0]!.auto_pass_forbidden, true);
});

test("execution factory against live repo produces packets", () => {
  const report = buildManufacturerBrowserProofExecutionFactoryV1({
    rootDir: REPO_ROOT,
    now: () => new Date("2026-06-26T12:00:00.000Z"),
  });
  assert.ok(report.scheduled_slug_count > 0);
  assert.equal(report.manufacturer_execution_batch_count, report.manufacturer_execution_manifests.length);
  assert.equal(report.execution_packets.length, report.manufacturer_execution_batch_count);
});

test("execution factory artifacts are read-only", () => {
  const root = mkdtempSync(path.join(tmpdir(), "mfr-exec-factory-write-"));
  writeFixtureArtifacts(root);
  const report = buildManufacturerBrowserProofExecutionFactoryV1({ rootDir: root });
  const written = writeManufacturerBrowserProofExecutionFactoryArtifactsV1({ rootDir: root, report });
  const parsed = JSON.parse(
    readFileSync(path.join(root, written.factoryJsonRelPath), "utf8"),
  ) as { auto_pass_forbidden: boolean; browser_automation_authorized: boolean };
  assert.equal(parsed.auto_pass_forbidden, true);
  assert.equal(parsed.browser_automation_authorized, false);
  assert.equal(written.executionManifestRelPaths.length, 1);
  assert.equal(written.geNormalizationPacketRelPaths.length, 1);
});

test("MCP projection loads committed execution factory artifact", async () => {
  const root = mkdtempSync(path.join(tmpdir(), "mfr-exec-factory-mcp-"));
  writeFixtureArtifacts(root);
  const report = buildManufacturerBrowserProofExecutionFactoryV1({ rootDir: root });
  const jsonAbs = path.join(
    root,
    "data/fridge/batch-production/drafts/manufacturer-browser-proof-execution-factory-v1.json",
  );
  mkdirSync(path.dirname(jsonAbs), { recursive: true });
  writeFileSync(jsonAbs, `${JSON.stringify(report)}\n`, "utf8");

  const { manufacturerBrowserProofExecutionFactoryV1 } = await import(
    "./buckparts-mcp-manufacturer-browser-proof-execution-factory-v1"
  );
  const result = manufacturerBrowserProofExecutionFactoryV1({ rootDir: root });
  assert.equal(result.truth_status, "PROVEN");
  assert.equal(result.auto_pass_forbidden, true);
});
