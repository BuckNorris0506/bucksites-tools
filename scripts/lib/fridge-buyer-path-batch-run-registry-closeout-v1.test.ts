import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
  assessFridgeBuyerPathBatchRunRegistryCloseoutV1,
  buildFridgeBuyerPathBatchClosedRunRegistryDocumentV1,
  FRIDGE_BUYER_PATH_BATCH_CLOSEOUT_CANONICAL_REGISTRY_REL_V1,
  FRIDGE_BUYER_PATH_BATCH_CLOSEOUT_CANONICAL_RUN_ID_V1,
  FRIDGE_BUYER_PATH_BATCH_CLOSEOUT_LEARNING_PACKET_REL_V1,
  FRIDGE_BUYER_PATH_BATCH_CLOSED_RUN_REGISTRY_CONTRACT_V1,
  FRIDGE_BUYER_PATH_BATCH_CLOSED_RUN_REGISTRY_STAGE_V1,
  FRIDGE_BUYER_PATH_BATCH_CLOSEOUT_OWNER_CONFIRM_FLAG_V1,
  loadFridgeRunRegistryAtPathV1,
  parseFridgeCloseoutWriterCliArgsV1,
  validateFridgeBuyerPathBatchClosedRunRegistryDocumentV1,
} from "./fridge-buyer-path-batch-run-registry-closeout-v1";
import {
  buildFridgeBuyerPathBatchPlanningRunRegistryDocumentV1,
  FRIDGE_BUYER_PATH_BATCH_PLANNING_RUN_REGISTRY_CONTRACT_V1,
} from "./fridge-buyer-path-batch-run-registry-v1";
import type { FridgeBuyerPathBatchApprovalReportV1 } from "./fridge-buyer-path-batch-approval-v1";
import type { FridgeBuyerPathBatchProposalReportV1 } from "./fridge-buyer-path-batch-proposal-v1";
import {
  buildBatchRunRegistryIntakeReportV1,
  resolveFridgeRunRegistryStatusV1,
} from "./batch-run-registry-intake-v1";

const REPO_ROOT = process.cwd();
const FRIDGE_BATCH_ID = "fridge-buyer-path-batch-proposal-v1-0fec4a7b623a";
const SLUGS = [
  "4396710",
  "4396841",
  "46-9002",
  "8171413",
  "da29-00019a",
  "da97-15217d",
  "edr1rxd1",
  "edr2rxd1",
  "lt1000p",
  "lt1000pc",
  "lt600p",
  "lt700p",
  "lt800p",
  "mdj64844601",
];

function proposalFixture(): FridgeBuyerPathBatchProposalReportV1 {
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
    proposed_rows: SLUGS.map((slug, i) => ({
      proposal_rank: i + 1,
      slug,
      oem_token: slug,
      owner_review_ready: true,
    })),
    owner_approval_required: true,
    formal_batch_exists: false,
    recommended_next_action: "approve",
    proven_facts: [],
    unknown_facts: [],
  } as FridgeBuyerPathBatchProposalReportV1;
}

function approvalFixture(): FridgeBuyerPathBatchApprovalReportV1 {
  return {
    approval_status: "owner_approved_for_next_planning_only",
  } as FridgeBuyerPathBatchApprovalReportV1;
}

function writePlanningRegistry(dir: string): void {
  const built = buildFridgeBuyerPathBatchPlanningRunRegistryDocumentV1({
    rootDir: REPO_ROOT,
    buildProposal: () => proposalFixture(),
    buildApproval: () => approvalFixture(),
  });
  assert.equal(built.ok, true);
  if (!built.ok) return;
  const abs = path.join(dir, built.registry_rel_path);
  mkdirSync(path.dirname(abs), { recursive: true });
  writeFileSync(abs, JSON.stringify(built.doc, null, 2), "utf8");
}

function baseCli(overrides: Partial<ReturnType<typeof parseFridgeCloseoutWriterCliArgsV1>> = {}) {
  return {
    ownerConfirmCloseout: false,
    runId: FRIDGE_BUYER_PATH_BATCH_CLOSEOUT_CANONICAL_RUN_ID_V1,
    registryOut: null,
    allowProductionGoClickLogging: false,
    ...overrides,
  };
}

function assessOnRepo(
  cli: ReturnType<typeof parseFridgeCloseoutWriterCliArgsV1>,
  assessExecutor?: Parameters<typeof assessFridgeBuyerPathBatchRunRegistryCloseoutV1>[0]["assessExecutor"],
) {
  return assessFridgeBuyerPathBatchRunRegistryCloseoutV1({
    rootDir: REPO_ROOT,
    cli,
    assessExecutor,
  });
}

test("parseFridgeCloseoutWriterCliArgsV1 reads owner confirm and forbidden production go flag", () => {
  const cli = parseFridgeCloseoutWriterCliArgsV1([
    FRIDGE_BUYER_PATH_BATCH_CLOSEOUT_OWNER_CONFIRM_FLAG_V1,
    "--run-id",
    FRIDGE_BUYER_PATH_BATCH_CLOSEOUT_CANONICAL_RUN_ID_V1,
    "--registry-out",
    FRIDGE_BUYER_PATH_BATCH_CLOSEOUT_CANONICAL_REGISTRY_REL_V1,
    "--allow-production-go-click-logging",
  ]);
  assert.equal(cli.ownerConfirmCloseout, true);
  assert.equal(cli.runId, FRIDGE_BUYER_PATH_BATCH_CLOSEOUT_CANONICAL_RUN_ID_V1);
  assert.equal(cli.allowProductionGoClickLogging, true);
});

test("writer refuses without --owner-confirm-closeout when registry-out is set", () => {
  const assessment = assessOnRepo(
    baseCli({ registryOut: FRIDGE_BUYER_PATH_BATCH_CLOSEOUT_CANONICAL_REGISTRY_REL_V1 }),
  );
  assert.equal(assessment.would_write, false);
  assert.ok(assessment.blockers.some((b) => b.includes("missing_required_flag")));
});

test("writer refuses wrong run_id", () => {
  const assessment = assessOnRepo(
    baseCli({
      ownerConfirmCloseout: true,
      runId: "wrong-run-id",
      registryOut: FRIDGE_BUYER_PATH_BATCH_CLOSEOUT_CANONICAL_REGISTRY_REL_V1,
    }),
  );
  assert.ok(assessment.blockers.some((b) => b.startsWith("run_id_mismatch")));
});

test("writer refuses if guarded executor is not APPLIED_PARITY_PROVEN", () => {
  const assessment = assessOnRepo(baseCli(), () => ({ executor_status: "BLOCKED" }));
  assert.ok(assessment.blockers.some((b) => b.startsWith("executor_status_not_applied_parity_proven")));
});

test("writer refuses if closeout learning packet missing", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "fridge-closeout-no-packet-"));
  writePlanningRegistry(dir);
  const assessment = assessFridgeBuyerPathBatchRunRegistryCloseoutV1({
    rootDir: dir,
    cli: baseCli(),
    assessExecutor: () => ({ executor_status: "APPLIED_PARITY_PROVEN" }),
  });
  assert.ok(assessment.blockers.some((b) => b.includes("closeout_learning_packet_missing")));
});

test("writer refuses if closeout learning packet run_id mismatched", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "fridge-closeout-bad-packet-"));
  writePlanningRegistry(dir);
  const packetAbs = path.join(dir, FRIDGE_BUYER_PATH_BATCH_CLOSEOUT_LEARNING_PACKET_REL_V1);
  mkdirSync(path.dirname(packetAbs), { recursive: true });
  writeFileSync(
    packetAbs,
    JSON.stringify({
      contract: "fridge_buyer_path_batch_closeout_learning_packet_v1",
      run_id: "other-run",
    }),
    "utf8",
  );
  const assessment = assessFridgeBuyerPathBatchRunRegistryCloseoutV1({
    rootDir: dir,
    cli: baseCli(),
    assessExecutor: () => ({ executor_status: "APPLIED_PARITY_PROVEN" }),
  });
  assert.ok(assessment.blockers.some((b) => b.includes("closeout_learning_packet_run_id_mismatch")));
});

test("writer refuses if planning registry already closed", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "fridge-closeout-already-closed-"));
  const packetSrc = path.join(REPO_ROOT, FRIDGE_BUYER_PATH_BATCH_CLOSEOUT_LEARNING_PACKET_REL_V1);
  if (existsSync(packetSrc)) {
    const packetDst = path.join(dir, FRIDGE_BUYER_PATH_BATCH_CLOSEOUT_LEARNING_PACKET_REL_V1);
    mkdirSync(path.dirname(packetDst), { recursive: true });
    writeFileSync(packetDst, readFileSync(packetSrc, "utf8"), "utf8");
  }
  const built = buildFridgeBuyerPathBatchPlanningRunRegistryDocumentV1({
    rootDir: REPO_ROOT,
    buildProposal: () => proposalFixture(),
    buildApproval: () => approvalFixture(),
  });
  assert.equal(built.ok, true);
  if (!built.ok) return;
  const closed = buildFridgeBuyerPathBatchClosedRunRegistryDocumentV1({
    planning: built.doc,
    now: () => new Date("2026-06-02T00:00:00.000Z"),
  });
  const abs = path.join(dir, FRIDGE_BUYER_PATH_BATCH_CLOSEOUT_CANONICAL_REGISTRY_REL_V1);
  mkdirSync(path.dirname(abs), { recursive: true });
  writeFileSync(abs, JSON.stringify(closed, null, 2), "utf8");

  const assessment = assessFridgeBuyerPathBatchRunRegistryCloseoutV1({
    rootDir: dir,
    cli: baseCli({ ownerConfirmCloseout: true, registryOut: FRIDGE_BUYER_PATH_BATCH_CLOSEOUT_CANONICAL_REGISTRY_REL_V1 }),
    assessExecutor: () => ({ executor_status: "APPLIED_PARITY_PROVEN" }),
    fileExists: (p) => existsSync(p),
    readText: (p) => readFileSync(p, "utf8"),
  });
  assert.ok(assessment.blockers.includes("registry_already_closed"));
});

test("writer refuses production /go smoke authorization flag", () => {
  const assessment = assessOnRepo(baseCli({ allowProductionGoClickLogging: true }));
  assert.ok(assessment.blockers.some((b) => b.startsWith("forbidden_cli_flag")));
});

test("closed registry document validates under closed contract", () => {
  const built = buildFridgeBuyerPathBatchPlanningRunRegistryDocumentV1({
    rootDir: REPO_ROOT,
    buildProposal: () => proposalFixture(),
    buildApproval: () => approvalFixture(),
  });
  assert.equal(built.ok, true);
  if (!built.ok) return;
  const closed = buildFridgeBuyerPathBatchClosedRunRegistryDocumentV1({
    planning: built.doc,
    now: () => new Date("2026-06-02T12:00:00.000Z"),
  });
  const validated = validateFridgeBuyerPathBatchClosedRunRegistryDocumentV1(closed);
  assert.equal(validated.ok, true);
  if (!validated.ok) return;
  assert.equal(validated.doc.contract, FRIDGE_BUYER_PATH_BATCH_CLOSED_RUN_REGISTRY_CONTRACT_V1);
  assert.equal(validated.doc.stage, FRIDGE_BUYER_PATH_BATCH_CLOSED_RUN_REGISTRY_STAGE_V1);
  assert.equal(validated.doc.closeout_complete, true);
  assert.equal(validated.doc.production_go_first_hop_validation_status, "UNKNOWN_NOT_TESTED_NO_SAFE_NO_CLICK_PATH");
});

test("batch-run-registry-intake recognizes closed fridge registry", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "fridge-closeout-intake-"));
  const built = buildFridgeBuyerPathBatchPlanningRunRegistryDocumentV1({
    rootDir: REPO_ROOT,
    buildProposal: () => proposalFixture(),
    buildApproval: () => approvalFixture(),
  });
  assert.equal(built.ok, true);
  if (!built.ok) return;
  const closed = buildFridgeBuyerPathBatchClosedRunRegistryDocumentV1({
    planning: built.doc,
    now: () => new Date("2026-06-02T00:00:00.000Z"),
  });
  const registryAbs = path.join(dir, FRIDGE_BUYER_PATH_BATCH_CLOSEOUT_CANONICAL_REGISTRY_REL_V1);
  mkdirSync(path.dirname(registryAbs), { recursive: true });
  writeFileSync(registryAbs, JSON.stringify(closed, null, 2), "utf8");

  const load = loadFridgeRunRegistryAtPathV1({
    rootDir: dir,
    relPath: FRIDGE_BUYER_PATH_BATCH_CLOSEOUT_CANONICAL_REGISTRY_REL_V1,
  });
  const resolved = resolveFridgeRunRegistryStatusV1({
    proposal: proposalFixture(),
    approval: approvalFixture(),
    registryLoad: load,
  });
  assert.equal(resolved.status, "PROVEN_CLOSED");

  const report = buildBatchRunRegistryIntakeReportV1({
    rootDir: dir,
    buildFridgeProposal: () => proposalFixture(),
    buildFridgeApproval: () => approvalFixture(),
    apRunRegistryRelPath: "data/missing-ap.json",
    fileExists: (abs) => existsSync(abs),
    readText: (abs) => readFileSync(abs, "utf8"),
  });
  assert.equal(report.fridge_run_registry_status, "PROVEN_CLOSED");
  const fridgeWedge = report.wedges.find((w) => w.wedge === "refrigerator_water");
  assert.equal(fridgeWedge?.closeout_complete, true);
});

test("repo closeout assessment is ready when executor parity is proven", () => {
  if (!existsSync(path.join(REPO_ROOT, FRIDGE_BUYER_PATH_BATCH_CLOSEOUT_CANONICAL_REGISTRY_REL_V1))) {
    return;
  }
  const load = loadFridgeRunRegistryAtPathV1({
    rootDir: REPO_ROOT,
    relPath: FRIDGE_BUYER_PATH_BATCH_CLOSEOUT_CANONICAL_REGISTRY_REL_V1,
  });
  if (load.closed?.valid) {
    const assessment = assessOnRepo(
      baseCli({ ownerConfirmCloseout: true, registryOut: FRIDGE_BUYER_PATH_BATCH_CLOSEOUT_CANONICAL_REGISTRY_REL_V1 }),
    );
    assert.ok(assessment.blockers.includes("registry_already_closed"));
    return;
  }
  const assessment = assessOnRepo(baseCli());
  if (assessment.executor_status !== "APPLIED_PARITY_PROVEN") {
    assert.ok(assessment.blockers.some((b) => b.startsWith("executor_status_not_applied_parity_proven")));
    return;
  }
  assert.equal(assessment.closeout_ready, true);
  assert.equal(assessment.closed_doc?.closeout_complete, true);
});
