import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  buildFridgeBuyerPathBatchPlanningRunRegistryDocumentV1,
  FRIDGE_BUYER_PATH_BATCH_PLANNING_RUN_REGISTRY_CONTRACT_V1,
  FRIDGE_BUYER_PATH_BATCH_PLANNING_RUN_REGISTRY_STAGE_V1,
  validateFridgeBuyerPathBatchPlanningRunRegistryDocumentV1,
} from "./fridge-buyer-path-batch-run-registry-v1";
import type { FridgeBuyerPathBatchApprovalReportV1 } from "./fridge-buyer-path-batch-approval-v1";
import type { FridgeBuyerPathBatchProposalReportV1 } from "./fridge-buyer-path-batch-proposal-v1";

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

const LIB_SOURCE = readFileSync(
  path.join(REPO_ROOT, "scripts/lib/fridge-buyer-path-batch-run-registry-v1.ts"),
  "utf8",
);
const REPORT_SOURCE = readFileSync(
  path.join(REPO_ROOT, "scripts/report-fridge-buyer-path-batch-run-registry-v1.ts"),
  "utf8",
);

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

test("buildFridgeBuyerPathBatchPlanningRunRegistryDocumentV1 includes 14 slugs and mutation flags false", () => {
  const built = buildFridgeBuyerPathBatchPlanningRunRegistryDocumentV1({
    rootDir: REPO_ROOT,
    now: () => new Date("2026-05-31T12:00:00.000Z"),
    buildProposal: () => proposalFixture(),
    buildApproval: () => approvalFixture(),
  });
  assert.equal(built.ok, true);
  if (!built.ok) return;
  assert.equal(built.doc.contract, FRIDGE_BUYER_PATH_BATCH_PLANNING_RUN_REGISTRY_CONTRACT_V1);
  assert.equal(built.doc.stage, FRIDGE_BUYER_PATH_BATCH_PLANNING_RUN_REGISTRY_STAGE_V1);
  assert.equal(built.doc.closeout_complete, false);
  assert.equal(built.doc.proposed_row_count, 14);
  assert.deepEqual(built.doc.proposed_slugs, SLUGS);
  assert.equal(built.doc.owner_approval_artifact_rel_path, "data/owner-decisions/fridge-buyer-path-batch-approval-v1.json");
  assert.equal(built.doc.apply_mutation_authorized, false);
  assert.equal(built.doc.csv_apply_authorized, false);
  assert.equal(built.doc.retailer_links_mutation_authorized, false);
  assert.equal(built.doc.supabase_mutation_authorized, false);
  assert.equal(built.doc.public_ui_mutation_authorized, false);
  assert.equal(built.doc.buy_link_mutation_authorized, false);
  assert.equal(built.doc.evidence_write_authorized, false);
  assert.equal(built.doc.netlify_api_authorized, false);
  assert.equal(
    built.registry_rel_path,
    "data/fridge/batch-production/run-registry/fridge-buyer-path-batch-run-v1-0fec4a7b623a.json",
  );
});

test("malformed planning run-registry with closeout_complete true is rejected", () => {
  const built = buildFridgeBuyerPathBatchPlanningRunRegistryDocumentV1({
    rootDir: REPO_ROOT,
    buildProposal: () => proposalFixture(),
    buildApproval: () => approvalFixture(),
  });
  assert.equal(built.ok, true);
  if (!built.ok) return;
  const malformed = { ...built.doc, closeout_complete: true };
  const v = validateFridgeBuyerPathBatchPlanningRunRegistryDocumentV1(malformed);
  assert.equal(v.ok, false);
});

test("sources avoid forbidden product/CSV/Supabase/Netlify writes in lib (report may write with explicit --registry-out)", () => {
  assert.ok(!LIB_SOURCE.includes("@netlify"));
  assert.ok(!/from ["'].*supabase/i.test(LIB_SOURCE));
  assert.ok(!LIB_SOURCE.includes("retailer_links.csv"));
  assert.ok(REPORT_SOURCE.includes("--registry-out"));
});
