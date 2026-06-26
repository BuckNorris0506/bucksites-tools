import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { FRIDGE_OWNER_BROWSER_PROOF_RESULT_CONTRACT_V1 } from "./fridge-safe-link-owner-browser-proof-result-v1";
import { GE_REFRIGERATOR_RESCUE_BROWSER_EVIDENCE_CONTRACT_V1 } from "./ge-refrigerator-rescue-browser-capture-v1";
import {
  assessManufacturerBrowserProofSlugV1,
  buildManufacturerBrowserProofFactoryV1,
  MANUFACTURER_BROWSER_PROOF_FACTORY_CONTRACT_V1,
  normalizeGeBrowserEvidenceToOwnerProofDraftV1,
  resolveManufacturerBrowserCaptureStrategyV1,
  writeManufacturerBrowserProofFactoryArtifactsV1,
} from "./manufacturer-browser-proof-factory-v1";
import {
  MANUFACTURER_SAFE_LINK_RESCUE_ORCHESTRATOR_CONTRACT_V1,
  type ManufacturerRescueOrchestratorQueueRowV1,
  type ManufacturerRescueOrchestratorReportV1,
} from "./manufacturer-safe-link-rescue-orchestrator-v1";

function baseQueueRow(
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
    browser_truth_status: "NOT_CAPTURED",
    repo_proven_official_target_url:
      "https://www.whirlpool.com/accessories/kitchen-accessories/refrigerator/p.ice-and-water-refrigerator-filter-4.edr4rxd1.html",
    adapter_discovery_url: null,
    adapter_discovery_provenance: "UNKNOWN",
    csv_primary_is_search_placeholder: true,
    blocked_reasons: [],
    recommended_next_action: "owner review",
    orchestrator_rank: 1,
    coverage_unlocked: false,
    ...overrides,
  };
}

function freshEdr4Proof() {
  return {
    contract: FRIDGE_OWNER_BROWSER_PROOF_RESULT_CONTRACT_V1,
    verdict: "PASS_BROWSER_PROOF",
    checked_at: "2026-06-20T12:00:00.000Z",
    slug: "edr4rxd1",
    oem_part_token: "EDR4RXD1",
    owner_proof_urls: [
      {
        url: "https://www.whirlpool.com/accessories/kitchen-accessories/refrigerator/p.ice-and-water-refrigerator-filter-4.edr4rxd1.html",
        path_type: "official_manufacturer_pdp",
        browser_proof_status: "PASS",
        proven_observations: ["PROVEN: Model: EDR4RXD1."],
      },
    ],
  };
}

function mockOrchestrator(rows: ManufacturerRescueOrchestratorQueueRowV1[]): ManufacturerRescueOrchestratorReportV1 {
  return {
    contract: MANUFACTURER_SAFE_LINK_RESCUE_ORCHESTRATOR_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    generated_at: "2026-06-26T12:00:00.000Z",
    unified_rescue_queue: rows,
    manufacturer_summaries: [],
    proven_facts: [],
    unknown_facts: [],
  } as ManufacturerRescueOrchestratorReportV1;
}

test("missing owner proof requires capture work", () => {
  const assessment = assessManufacturerBrowserProofSlugV1({
    row: baseQueueRow({}),
    rootDir: process.cwd(),
    fileExists: () => false,
    now: () => new Date("2026-06-26T12:00:00.000Z"),
  });
  assert.equal(assessment.evidence_status, "MISSING");
  assert.equal(assessment.capture_work_required, true);
  assert.equal(assessment.capture_work_reason, "owner_browser_proof_artifact_missing");
});

test("stale owner proof requires capture work", () => {
  const proof = freshEdr4Proof();
  proof.checked_at = "2026-05-01T12:00:00.000Z";
  const assessment = assessManufacturerBrowserProofSlugV1({
    row: baseQueueRow({ browser_truth_status: "PASS" }),
    rootDir: process.cwd(),
    fileExists: (abs) => abs.endsWith("fridge-safe-link-owner-browser-proof-result-edr4rxd1-v1.json"),
    readText: (abs) => {
      if (abs.endsWith("fridge-safe-link-owner-browser-proof-result-edr4rxd1-v1.json")) {
        return JSON.stringify(proof);
      }
      throw new Error(`unexpected read: ${abs}`);
    },
    now: () => new Date("2026-06-26T12:00:00.000Z"),
  });
  assert.equal(assessment.evidence_status, "STALE");
  assert.equal(assessment.capture_work_required, true);
});

test("fresh official pass does not require capture work", () => {
  const assessment = assessManufacturerBrowserProofSlugV1({
    row: baseQueueRow({ browser_truth_status: "PASS" }),
    rootDir: process.cwd(),
    fileExists: (abs) => abs.endsWith("fridge-safe-link-owner-browser-proof-result-edr4rxd1-v1.json"),
    readText: (abs) => {
      if (abs.endsWith("fridge-safe-link-owner-browser-proof-result-edr4rxd1-v1.json")) {
        return JSON.stringify(freshEdr4Proof());
      }
      throw new Error(`unexpected read: ${abs}`);
    },
    now: () => new Date("2026-06-26T12:00:00.000Z"),
  });
  assert.equal(assessment.evidence_status, "FRESH_OFFICIAL_PASS");
  assert.equal(assessment.capture_work_required, false);
});

test("known_broken slug is blocked with no capture work", () => {
  const assessment = assessManufacturerBrowserProofSlugV1({
    row: baseQueueRow({ blocked_reasons: ["known_broken_adapter"] }),
    rootDir: process.cwd(),
    fileExists: () => false,
  });
  assert.equal(assessment.evidence_status, "BLOCKED");
  assert.equal(assessment.capture_work_required, false);
});

test("batches identical capture strategies by manufacturer", () => {
  const rows = [
    baseQueueRow({ filter_slug: "edr4rxd1", manufacturer_key: "everydrop_whirlpool" }),
    baseQueueRow({
      filter_slug: "edr1rxd1",
      manufacturer_key: "everydrop_whirlpool",
      oem_part_token: "EDR1RXD1",
    }),
    baseQueueRow({
      filter_slug: "mwf",
      manufacturer_key: "ge_appliance_parts",
      oem_part_token: "MWF",
    }),
  ];
  const { report } = buildManufacturerBrowserProofFactoryV1({
    rootDir: process.cwd(),
    orchestrator: mockOrchestrator(rows),
    fileExists: () => false,
    now: () => new Date("2026-06-26T12:00:00.000Z"),
  });
  const everydropBatch = report.capture_batches.find(
    (b) => b.manufacturer_key === "everydrop_whirlpool",
  );
  const geBatch = report.capture_batches.find((b) => b.manufacturer_key === "ge_appliance_parts");
  assert.ok(everydropBatch);
  assert.equal(everydropBatch.slug_count, 2);
  assert.ok(geBatch);
  assert.equal(geBatch.capture_strategy, "ge_automated_playwright_spec_capture");
  assert.equal(geBatch.slug_count, 1);
});

test("GE normalization draft never auto-grants PASS_BROWSER_PROOF", () => {
  const draft = normalizeGeBrowserEvidenceToOwnerProofDraftV1({
    row: baseQueueRow({
      filter_slug: "mwf",
      manufacturer_key: "ge_appliance_parts",
      oem_part_token: "MWF",
    }),
    geArtifact: {
      contract: GE_REFRIGERATOR_RESCUE_BROWSER_EVIDENCE_CONTRACT_V1,
      adapter_contract: "ge_refrigerator_rescue_adapter_v1",
      read_only: true,
      data_mutation: false,
      filter_slug: "mwf",
      oem_part_token: "MWF",
      target_url: "https://www.geapplianceparts.com/store/parts/spec/MWF",
      checked_at: "2026-06-20T12:00:00.000Z",
      browser_truth_status: "PASS",
      direct_pdp_status: "PROVEN",
      exact_token_in_primary_slice: true,
      official_manufacturer_path: true,
      direct_purchase_control_visible: true,
      wrong_family_assessment: {
        blocked: false,
        forbidden_tokens_checked: [],
        detected_forbidden_tokens: [],
        notes: "test",
      },
      validation_gates: [{ gate_id: "exact_token", status: "PASS", notes: "test" }],
      evidence_summary: "test",
      captured_signals: {
        final_url: null,
        page_title: "MWF",
        h1_text: "MWF",
        sku_line_sample: null,
        purchase_actions_visible: [],
        classification: "OFFICIAL_MANUFACTURER_PDP",
        classification_notes: null,
        text_sample_excerpt: null,
        screenshot_path: null,
        navigation_error: null,
      },
      blockers: [],
      prohibited_actions: [],
    },
    ownerProofArtifactRel:
      "data/fridge/batch-production/drafts/fridge-safe-link-owner-browser-proof-result-mwf-v1.json",
  });
  assert.equal(draft.auto_pass_forbidden, true);
  assert.equal(draft.normalized_verdict, "NEEDS_OWNER_BROWSER_REVIEW");
  assert.equal(draft.owner_proof_result_draft.verdict, "NEEDS_OWNER_BROWSER_REVIEW");
  assert.notEqual(draft.owner_proof_result_draft.verdict, "PASS_BROWSER_PROOF");
});

test("resolveManufacturerBrowserCaptureStrategyV1 maps GE to playwright batch", () => {
  assert.equal(
    resolveManufacturerBrowserCaptureStrategyV1("ge_appliance_parts", baseQueueRow({})),
    "ge_automated_playwright_spec_capture",
  );
  assert.equal(
    resolveManufacturerBrowserCaptureStrategyV1("frigidaire", baseQueueRow({})),
    "owner_browser_proof_session_assist",
  );
});

test("factory artifacts are read-only drafts", () => {
  const root = mkdtempSync(path.join(tmpdir(), "mfr-browser-proof-factory-"));
  const rows = [baseQueueRow({})];
  const { report, normalization_drafts } = buildManufacturerBrowserProofFactoryV1({
    rootDir: root,
    orchestrator: mockOrchestrator(rows),
    fileExists: () => false,
    now: () => new Date("2026-06-26T12:00:00.000Z"),
  });
  const written = writeManufacturerBrowserProofFactoryArtifactsV1({
    rootDir: root,
    report,
    normalization_drafts,
  });
  const factoryJson = JSON.parse(
    readFileSync(path.join(root, written.factoryJsonRelPath), "utf8"),
  ) as { contract: string; read_only: boolean; data_mutation: boolean; mutation_authorized: boolean };
  assert.equal(factoryJson.contract, MANUFACTURER_BROWSER_PROOF_FACTORY_CONTRACT_V1);
  assert.equal(factoryJson.read_only, true);
  assert.equal(factoryJson.data_mutation, false);
  assert.equal(factoryJson.mutation_authorized, false);
  assert.ok(existsSync(path.join(root, written.captureQueueMdRelPath)));
  assert.ok(existsSync(path.join(root, written.ownerWorkPacketMdRelPath)));
});
