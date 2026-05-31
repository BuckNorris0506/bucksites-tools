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
  parseApProvenRunRegistryV1,
  resolveFridgeRunRegistryStatusV1,
} from "./batch-run-registry-intake-v1";
import type { FridgeBuyerPathBatchApprovalReportV1 } from "./fridge-buyer-path-batch-approval-v1";
import type { FridgeBuyerPathBatchProposalReportV1 } from "./fridge-buyer-path-batch-proposal-v1";

const REPO_ROOT = process.cwd();
const FRIDGE_BATCH_ID = "fridge-buyer-path-batch-proposal-v1-0fec4a7b623a";

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
    proposed_rows: [],
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
    proposed_slugs: ["slug-a"],
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
    runRegistryJsonNames: [],
  });
  assert.equal(resolved.status, "APPROVED_FOR_PLANNING_BUT_RUN_REGISTRY_MISSING");
  assert.equal(
    resolved.nextRequiredArtifact,
    buildFridgeRunRegistryArtifactRelPathV1(FRIDGE_BATCH_ID),
  );
});

test("buildBatchRunRegistryIntakeReportV1 on repo detects AP closed and fridge missing run-registry", () => {
  const report = buildBatchRunRegistryIntakeReportV1({ rootDir: REPO_ROOT });
  assert.equal(report.contract, BATCH_RUN_REGISTRY_INTAKE_CONTRACT_V1);
  assert.equal(report.read_only, true);
  assert.equal(report.data_mutation, false);
  assert.equal(report.mutation_authorized, false);
  if (existsSync(path.join(REPO_ROOT, "data/air-purifier/batch-production/run-registry/ap-batch-v2-proven-run-v1.json"))) {
    assert.equal(report.ap_run_registry_status, "PROVEN_CLOSED");
  }
  if (
    existsSync(path.join(REPO_ROOT, "data/owner-decisions/fridge-buyer-path-batch-approval-v1.json"))
  ) {
    assert.equal(report.fridge_approval_status, "owner_approved_for_next_planning_only");
    assert.equal(report.fridge_run_registry_status, "APPROVED_FOR_PLANNING_BUT_RUN_REGISTRY_MISSING");
    assert.match(report.fridge_next_required_artifact ?? "", /data\/fridge\/batch-production\/run-registry\//);
  }
});

test("temp fixture: fridge approval artifact yields planning-approved missing run-registry", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "batch-intake-fridge-"));
  const od = path.join(dir, "data", "owner-decisions");
  mkdirSync(od, { recursive: true });
  writeFileSync(
    path.join(od, "fridge-buyer-path-batch-approval-v1.json"),
    JSON.stringify({
      contract: FOUNDER_DECISION_REGISTRY_CONTRACT_V1,
      read_only: true,
      data_mutation: false,
      rows: [
        {
          decision_id: "d-fridge",
          source_queue_row_id: "queue-fridge",
          source_decision_packet_id: `fridge_buyer_path_batch_approval_v1:${FRIDGE_BATCH_ID}`,
          decided_at: "2026-05-31T06:33:19.430Z",
          decision_status: "approved",
          owner_note: "Planning only.",
          allowed_next_scope: "read_only_agent",
          evidence_required_before_mutation: false,
          prohibited_actions_still_apply: ["No Supabase."],
          fridge_buyer_path_batch_approval_context_v1: {
            review_packet_contract: "fridge_buyer_path_batch_approval_v1",
            founder_option_id: "approve_for_next_planning_only",
            proposed_batch_id: FRIDGE_BATCH_ID,
          },
        },
      ],
    }),
    "utf8",
  );

  const report = buildBatchRunRegistryIntakeReportV1({
    rootDir: dir,
    buildFridgeProposal: () => fridgeProposalFixture(),
    buildFridgeApproval: () => fridgeApprovalFixture("owner_approved_for_next_planning_only"),
    apRunRegistryRelPath: "data/missing-ap.json",
    fileExists: () => false,
    listRunRegistryJson: () => [],
  });
  assert.equal(report.fridge_approval_status, "owner_approved_for_next_planning_only");
  assert.equal(report.fridge_run_registry_status, "APPROVED_FOR_PLANNING_BUT_RUN_REGISTRY_MISSING");
  assert.equal(report.mutation_authorized, false);
});

test("sources avoid forbidden write/mutation imports", () => {
  for (const source of [LIB_SOURCE, REPORT_SOURCE, CC_SOURCE]) {
    assert.ok(!source.includes("writeFileSync"));
    assert.ok(!source.includes("mkdirSync"));
    assert.ok(!/from ["'].*supabase/i.test(source));
    assert.ok(!source.includes("@netlify"));
  }
});
