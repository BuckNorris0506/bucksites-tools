import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
  buildManufacturerBrowserProofRefreshBatchesFromFactoryV1,
  buildManufacturerBrowserProofRefreshOrchestratorV1,
  buildManufacturerBrowserProofRefreshWorkItemV1,
  computeManufacturerBrowserProofRefreshPriorityV1,
  MANUFACTURER_BROWSER_PROOF_REFRESH_ORCHESTRATOR_CONTRACT_V1,
  writeManufacturerBrowserProofRefreshOrchestratorArtifactsV1,
  type ManufacturerBrowserProofFactoryReportV1,
  type ManufacturerBrowserProofSlugAssessmentV1,
} from "./manufacturer-browser-proof-refresh-orchestrator-v1";
import {
  MANUFACTURER_BROWSER_PROOF_FACTORY_CONTRACT_V1,
  MANUFACTURER_BROWSER_PROOF_FACTORY_JSON_REL_V1,
} from "./manufacturer-browser-proof-factory-v1";

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

function factoryReport(
  slugAssessments: ManufacturerBrowserProofSlugAssessmentV1[],
): ManufacturerBrowserProofFactoryReportV1 {
  return {
    contract: MANUFACTURER_BROWSER_PROOF_FACTORY_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    csv_apply_authorized: false,
    supabase_mutation_authorized: false,
    browser_automation_authorized: false,
    coverage_unlocked: false,
    generated_at: "2026-06-26T12:00:00.000Z",
    source_command: "npm run buckparts:manufacturer-browser-proof-factory" as const,
    orchestrator_contract: "manufacturer_safe_link_rescue_orchestrator_v1" as const,
    orchestrator_generated_at: "2026-06-26T12:00:00.000Z",
    browser_proof_max_age_days: 14,
    slug_assessment_count: slugAssessments.length,
    capture_work_required_count: slugAssessments.filter((s) => s.capture_work_required).length,
    fresh_official_pass_count: 0,
    stale_count: slugAssessments.filter((s) => s.evidence_status === "STALE").length,
    missing_count: slugAssessments.filter((s) => s.evidence_status === "MISSING").length,
    blocked_count: 0,
    slug_assessments: slugAssessments,
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
}

const deployUnknown = {
  marker: "UNKNOWN" as const,
  marker_source_path: null,
  proof_after_marker_proven: "UNKNOWN" as const,
};

const deployKnown = {
  marker: "abc123",
  marker_source_path: "data/reports/deploy-live-site-monitor.json",
  proof_after_marker_proven: "UNKNOWN" as const,
};

test("stale slug gets higher priority with deploy marker present", () => {
  const stalePriority = computeManufacturerBrowserProofRefreshPriorityV1({
    assessment: assessment({ evidence_status: "STALE", capture_work_reason: "browser_proof_stale" }),
    deployMarker: deployKnown,
  });
  const staleNoDeploy = computeManufacturerBrowserProofRefreshPriorityV1({
    assessment: assessment({ evidence_status: "STALE", capture_work_reason: "browser_proof_stale" }),
    deployMarker: deployUnknown,
  });
  assert.ok(stalePriority > staleNoDeploy);
  assert.equal(staleNoDeploy, 80);
  assert.equal(stalePriority, 100);
});

test("blocked slug excluded from refresh work items", () => {
  const item = buildManufacturerBrowserProofRefreshWorkItemV1({
    assessment: assessment({ evidence_status: "BLOCKED", capture_work_required: false }),
    deployMarker: deployUnknown,
  });
  assert.equal(item, null);
});

test("GE work item sets normalization_draft_only", () => {
  const item = buildManufacturerBrowserProofRefreshWorkItemV1({
    assessment: assessment({}),
    deployMarker: deployUnknown,
  });
  assert.ok(item);
  assert.equal(item.normalization_draft_only, true);
  assert.equal(item.auto_pass_forbidden, true);
});

test("groups slugs into manufacturer-level refresh batches", () => {
  const batches = buildManufacturerBrowserProofRefreshBatchesFromFactoryV1({
    factory: factoryReport([
      assessment({ filter_slug: "mwf" }),
      assessment({ filter_slug: "rpwfe", oem_part_token: "RPWFE" }),
      assessment({
        filter_slug: "edr4rxd1",
        manufacturer_key: "everydrop_whirlpool",
        oem_part_token: "EDR4RXD1",
        capture_strategy: "owner_browser_proof_session_assist",
        recommended_capture_command:
          "npm run buckparts:fridge-safe-link-owner-browser-proof-session (owner visual inspection required)",
      }),
    ]),
    deployMarker: deployUnknown,
  });
  assert.equal(batches.length, 2);
  const geBatch = batches.find((b) => b.manufacturer_key === "ge_appliance_parts");
  assert.ok(geBatch);
  assert.equal(geBatch.scheduled_slug_count, 2);
  assert.equal(geBatch.ge_normalization_draft_only, true);
  assert.equal(geBatch.auto_pass_forbidden, true);
  assert.equal(geBatch.browser_automation_authorized, false);
});

test("orchestrator fails closed without factory artifact", () => {
  assert.throws(
    () =>
      buildManufacturerBrowserProofRefreshOrchestratorV1({
        rootDir: process.cwd(),
        fileExists: () => false,
      }),
    /manufacturer-browser-proof-factory artifact missing/,
  );
});

test("orchestrator artifacts are read-only", () => {
  const root = mkdtempSync(path.join(tmpdir(), "mfr-browser-proof-refresh-"));
  const report = factoryReport([assessment({})]);
  const factoryAbs = path.join(root, MANUFACTURER_BROWSER_PROOF_FACTORY_JSON_REL_V1);
  mkdirSync(path.dirname(factoryAbs), { recursive: true });
  writeFileSync(factoryAbs, `${JSON.stringify(report)}\n`, "utf8");
  const built = buildManufacturerBrowserProofRefreshOrchestratorV1({ rootDir: root });
  const written = writeManufacturerBrowserProofRefreshOrchestratorArtifactsV1({
    rootDir: root,
    report: built,
  });
  const parsed = JSON.parse(
    readFileSync(path.join(root, written.orchestratorJsonRelPath), "utf8"),
  ) as { contract: string; auto_pass_forbidden: boolean; browser_automation_authorized: boolean };
  assert.equal(parsed.contract, MANUFACTURER_BROWSER_PROOF_REFRESH_ORCHESTRATOR_CONTRACT_V1);
  assert.equal(parsed.auto_pass_forbidden, true);
  assert.equal(parsed.browser_automation_authorized, false);
  assert.equal(written.refreshBatchRelPaths.length, 1);
});
