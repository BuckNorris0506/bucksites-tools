import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { FOUNDER_DECISION_REGISTRY_CONTRACT_V1 } from "../../src/lib/owner-dashboard/founder-decision-registry-v1";
import {
  AP_PROVEN_RUN_CONTRACT_V1,
  BATCH_RUN_REGISTRY_INTAKE_CONTRACT_V1,
  buildBatchRunRegistryIntakeReportV1,
  buildFridgeRunRegistryArtifactRelPathV1,
  loadApRunRegistryStatusV1,
  loadFridgePlanningRunRegistryAtPathV1,
  parseApProvenRunRegistryV1,
  resolveFridgeRunRegistryStatusV1,
} from "./batch-run-registry-intake-v1";
import {
  buildFridgeBuyerPathBatchPlanningRunRegistryDocumentV1,
  FRIDGE_BUYER_PATH_BATCH_PLANNING_RUN_REGISTRY_CONTRACT_V1,
} from "./fridge-buyer-path-batch-run-registry-v1";
import type { FridgeBuyerPathBatchApprovalReportV1 } from "./fridge-buyer-path-batch-approval-v1";
import type { FridgeBuyerPathBatchProposalReportV1 } from "./fridge-buyer-path-batch-proposal-v1";

const REPO_ROOT = process.cwd();
const FRIDGE_BATCH_ID = "fridge-buyer-path-batch-proposal-v1-0fec4a7b623a";
const FRIDGE_REGISTRY_REL = buildFridgeRunRegistryArtifactRelPathV1(FRIDGE_BATCH_ID);

const LIB_SOURCE = readFileSync(
  path.join(REPO_ROOT, "scripts/lib/batch-run-registry-intake-v1.ts"),
  "utf8",
);
const REPORT_SOURCE = readFileSync(
  path.join(REPO_ROOT, "scripts/report-batch-run-registry-intake-v1.ts"),
  "utf8",
);
const CC_SOURCE = readFileSync(
  path.join(REPO_ROOT, "scripts/lib/batch-run-registry-intake-command-center-v1.ts"),
  "utf8",
);

function apProvenRunDoc(): Record<string, unknown> {
  return {
    contract: AP_PROVEN_RUN_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    run_id: "ap-batch-v2-test",
    wedge: "air_purifier",
    closeout_complete: true,
  };
}

function fridgeProposalFixture(): FridgeBuyerPathBatchProposalReportV1 {
  return {
    contract: "fridge_buyer_path_batch_proposal_v1",
    report_name: "fridge_buyer_path_batch_proposal_v1",
    read_only: true,
    data_mutation: false,
    generated_at: "2026-05-31T12:00:00.000Z",
    source_packet_contract: "fridge_buyer_path_owner_review_packet_v1",
    source_packet_report: "fridge_buyer_path_owner_review_packet_v1",
    proposed_batch_id: FRIDGE_BATCH_ID,
    proposed_run_id: FRIDGE_BATCH_ID,
    proposed_row_count: 14,
    proposed_rows: [{ slug: "4396710" }],
    owner_approval_required: true,
    formal_batch_exists: false,
    recommended_next_action: "approve",
    proven_facts: [],
    unknown_facts: [],
  } as FridgeBuyerPathBatchProposalReportV1;
}

function fridgeApprovalFixture(
  status: FridgeBuyerPathBatchApprovalReportV1["approval_status"],
): FridgeBuyerPathBatchApprovalReportV1 {
  return {
    contract: "fridge_buyer_path_batch_approval_v1",
    report_name: "fridge_buyer_path_batch_approval_v1",
    read_only: true,
    data_mutation: false,
    generated_at: "2026-05-31T12:00:00.000Z",
    source_proposal_contract: "fridge_buyer_path_batch_proposal_v1",
    proposed_batch_id: FRIDGE_BATCH_ID,
    proposed_row_count: 14,
    proposed_slugs: ["4396710"],
    approval_status: status,
    owner_approval_required: true,
    apply_authorization_present: false,
    apply_mutation_authorized: false,
    csv_apply_authorized: false,
    retailer_links_mutation_authorized: false,
    supabase_mutation_authorized: false,
    public_ui_mutation_authorized: false,
    buy_link_mutation_authorized: false,
    formal_batch_exists: false,
    founder_decision_options: ["approve_for_next_planning_only"],
    checklist_markdown: "",
    matched_registry_row: status === "owner_approved_for_next_planning_only" ? ({} as never) : null,
    registry_validation_errors: [],
    founder_decision_registry_export_preview: null,
    recommended_next_action: "",
    proven_facts: [],
    unknown_facts: [],
  } as FridgeBuyerPathBatchApprovalReportV1;
}

function writeValidPlanningRegistry(dir: string): void {
  const built = buildFridgeBuyerPathBatchPlanningRunRegistryDocumentV1({
    rootDir: REPO_ROOT,
  });
  assert.equal(built.ok, true);
  if (!built.ok) return;
  const abs = path.join(dir, built.registry_rel_path);
  mkdirSync(path.dirname(abs), { recursive: true });
  writeFileSync(abs, JSON.stringify(built.doc, null, 2), "utf8");
}

test("parseApProvenRunRegistryV1 accepts batch_production_proven_run_v1", () => {
  const parsed = parseApProvenRunRegistryV1(apProvenRunDoc());
  assert.equal(parsed.ok, true);
  if (parsed.ok) {
    assert.equal(parsed.closeout_complete, true);
    assert.equal(parsed.run_id, "ap-batch-v2-test");
  }
});

test("loadApRunRegistryStatusV1 detects PROVEN_CLOSED when AP registry exists", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "batch-intake-ap-"));
  const rel = "data/air-purifier/batch-production/run-registry/ap-test.json";
  const abs = path.join(dir, rel);
  mkdirSync(path.dirname(abs), { recursive: true });
  writeFileSync(abs, JSON.stringify(apProvenRunDoc()), "utf8");

  const loaded = loadApRunRegistryStatusV1({ rootDir: dir, relPath: rel });
  assert.equal(loaded.status, "PROVEN_CLOSED");
  assert.equal(loaded.run_id, "ap-batch-v2-test");
});

test("resolveFridgeRunRegistryStatusV1 reports APPROVED_FOR_PLANNING_BUT_RUN_REGISTRY_MISSING", () => {
  const resolved = resolveFridgeRunRegistryStatusV1({
    proposal: fridgeProposalFixture(),
    approval: fridgeApprovalFixture("owner_approved_for_next_planning_only"),
    registryLoad: { exists: false, planning: null, closed: null },
  });
  assert.equal(resolved.status, "APPROVED_FOR_PLANNING_BUT_RUN_REGISTRY_MISSING");
  assert.equal(resolved.nextRequiredArtifact, FRIDGE_REGISTRY_REL);
});

test("resolveFridgeRunRegistryStatusV1 reports PROVEN_PLANNING_RUN_REGISTRY when valid doc loaded", () => {
  const built = buildFridgeBuyerPathBatchPlanningRunRegistryDocumentV1({
    rootDir: REPO_ROOT,
  });
  assert.equal(built.ok, true);
  if (!built.ok) return;
  const resolved = resolveFridgeRunRegistryStatusV1({
    proposal: fridgeProposalFixture(),
    approval: fridgeApprovalFixture("owner_approved_for_next_planning_only"),
    registryLoad: {
      exists: true,
      planning: { valid: true, parse_errors: [], doc: built.doc },
      closed: null,
    },
  });
  assert.equal(resolved.status, "PROVEN_PLANNING_RUN_REGISTRY");
});

test("malformed fridge run-registry is MALFORMED_RUN_REGISTRY_NOT_MUTATION_READY", () => {
  const resolved = resolveFridgeRunRegistryStatusV1({
    proposal: fridgeProposalFixture(),
    approval: fridgeApprovalFixture("owner_approved_for_next_planning_only"),
    registryLoad: {
      exists: true,
      planning: {
        valid: false,
        parse_errors: ["closeout_complete must be false"],
        doc: null,
      },
      closed: null,
    },
  });
  assert.equal(resolved.status, "MALFORMED_RUN_REGISTRY_NOT_MUTATION_READY");
});

test("buildBatchRunRegistryIntakeReportV1 on repo when fridge planning registry exists", () => {
  const report = buildBatchRunRegistryIntakeReportV1({ rootDir: REPO_ROOT });
  assert.equal(report.contract, BATCH_RUN_REGISTRY_INTAKE_CONTRACT_V1);
  assert.equal(report.mutation_authorized, false);
  if (existsSync(path.join(REPO_ROOT, "data/air-purifier/batch-production/run-registry/ap-batch-v2-proven-run-v1.json"))) {
    const demandSelectedExists = existsSync(
      path.join(
        REPO_ROOT,
        "data/air-purifier/batch-production/run-registry/ap-demand-selected-batch-run-v1-2026-06-23.json",
      ),
    );
    assert.equal(
      report.ap_run_registry_status,
      demandSelectedExists ? "PROVEN_PRESENT_NOT_CLOSED" : "PROVEN_CLOSED",
    );
    if (demandSelectedExists) {
      assert.equal(report.ap_demand_selected_open_run_registry_status, "PROVEN_OPEN");
      assert.equal(
        report.ap_demand_selected_open_run_id,
        "ap-demand-selected-batch-run-v1-2026-06-23",
      );
    }
  }
  const fridgeRegistryAbs = path.join(REPO_ROOT, FRIDGE_REGISTRY_REL);
  if (existsSync(fridgeRegistryAbs)) {
    assert.equal(report.fridge_run_registry_status, "PROVEN_CLOSED");
    const fridgeRow = report.wedges.find((row) => row.wedge === "refrigerator_water");
    assert.equal(fridgeRow?.run_registry_status, "PROVEN_CLOSED");
    assert.equal(fridgeRow?.closeout_complete, true);
  } else if (existsSync(path.join(REPO_ROOT, "data/owner-decisions/fridge-buyer-path-batch-approval-v1.json"))) {
    assert.equal(report.fridge_run_registry_status, "APPROVED_FOR_PLANNING_BUT_RUN_REGISTRY_MISSING");
  }
});

test("temp fixture: valid planning registry yields PROVEN_PLANNING_RUN_REGISTRY", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "batch-intake-fridge-"));
  writeValidPlanningRegistry(dir);

  const report = buildBatchRunRegistryIntakeReportV1({
    rootDir: dir,
    buildFridgeProposal: () => fridgeProposalFixture(),
    buildFridgeApproval: () => fridgeApprovalFixture("owner_approved_for_next_planning_only"),
    apRunRegistryRelPath: "data/missing-ap.json",
    fileExists: (abs) => existsSync(abs),
    readText: (abs) => readFileSync(abs, "utf8"),
  });
  assert.equal(report.fridge_run_registry_status, "PROVEN_PLANNING_RUN_REGISTRY");
  assert.equal(report.mutation_authorized, false);
});

test("temp fixture: malformed registry is not mutation-ready", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "batch-intake-bad-"));
  const abs = path.join(dir, FRIDGE_REGISTRY_REL);
  mkdirSync(path.dirname(abs), { recursive: true });
  writeFileSync(
    abs,
    JSON.stringify({
      contract: FRIDGE_BUYER_PATH_BATCH_PLANNING_RUN_REGISTRY_CONTRACT_V1,
      closeout_complete: true,
      apply_mutation_authorized: true,
    }),
    "utf8",
  );

  const report = buildBatchRunRegistryIntakeReportV1({
    rootDir: dir,
    buildFridgeProposal: () => fridgeProposalFixture(),
    buildFridgeApproval: () => fridgeApprovalFixture("owner_approved_for_next_planning_only"),
    apRunRegistryRelPath: "data/missing-ap.json",
    fileExists: (absPath) => existsSync(absPath),
    readText: (absPath) => readFileSync(absPath, "utf8"),
  });
  assert.equal(report.fridge_run_registry_status, "MALFORMED_RUN_REGISTRY_NOT_MUTATION_READY");
  assert.equal(report.mutation_authorized, false);
});

test("sources avoid forbidden write/mutation imports in intake lib", () => {
  for (const source of [LIB_SOURCE, REPORT_SOURCE, CC_SOURCE]) {
    assert.ok(!source.includes("writeFileSync"));
    assert.ok(!source.includes("mkdirSync"));
    assert.ok(!/from ["'].*supabase/i.test(source));
    assert.ok(!source.includes("@netlify"));
  }
});
