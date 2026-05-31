import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import { validateFounderDecisionRegistryRowV1 } from "../../src/lib/owner-dashboard/founder-decision-registry-v1";
import {
  buildFridgeBuyerPathBatchApprovalChecklistMarkdownV1,
  buildFridgeBuyerPathBatchApprovalReportV1,
  compileFridgeBuyerPathBatchApprovalRegistryExportV1,
  FRIDGE_BUYER_PATH_BATCH_APPROVAL_CONTRACT_V1,
  parseFridgeBuyerPathBatchApprovalDecisionsFromMarkdownV1,
  resolveFridgeBuyerPathBatchApprovalStatusV1,
} from "./fridge-buyer-path-batch-approval-v1";
import type { FridgeBuyerPathBatchProposalReportV1 } from "./fridge-buyer-path-batch-proposal-v1";

const REPO_ROOT = process.cwd();
const GENERATED_AT = "2026-05-31T12:00:00.000Z";

const REPORT_SCRIPT_SOURCE = readFileSync(
  path.join(REPO_ROOT, "scripts/report-fridge-buyer-path-batch-approval-v1.ts"),
  "utf8",
);

const LIB_SOURCE = readFileSync(
  path.join(REPO_ROOT, "scripts/lib/fridge-buyer-path-batch-approval-v1.ts"),
  "utf8",
);

function proposalFixture(
  rows: FridgeBuyerPathBatchProposalReportV1["proposed_rows"],
): FridgeBuyerPathBatchProposalReportV1 {
  return {
    contract: "fridge_buyer_path_batch_proposal_v1",
    report_name: "fridge_buyer_path_batch_proposal_v1",
    read_only: true,
    data_mutation: false,
    generated_at: GENERATED_AT,
    wedge: "refrigerator_water",
    source_packet_report: "fridge_buyer_path_owner_review_packet_v1",
    source_packet_contract: "fridge_buyer_path_owner_review_packet_v1",
    proposed_batch_id: "fridge-buyer-path-batch-proposal-v1-testdigest",
    proposed_run_id: "fridge-buyer-path-batch-proposal-v1-testdigest",
    proposed_row_count: rows.length,
    proposed_rows: rows,
    owner_approval_required: true,
    apply_authorization_present: false,
    apply_mutation_authorized: false,
    csv_apply_authorized: false,
    retailer_links_mutation_authorized: false,
    supabase_mutation_authorized: false,
    public_ui_mutation_authorized: false,
    buy_link_mutation_authorized: false,
    formal_batch_exists: false,
    formal_batch_registry_path: null,
    required_pre_apply_checks: [],
    forbidden_mutations: [],
    recommended_next_action: "fixture",
    proven_facts: [],
    unknown_facts: [],
  };
}

test("fridge buyer-path batch approval report is read-only by default", () => {
  const report = buildFridgeBuyerPathBatchApprovalReportV1({ rootDir: REPO_ROOT });
  assert.equal(report.contract, FRIDGE_BUYER_PATH_BATCH_APPROVAL_CONTRACT_V1);
  assert.equal(report.read_only, true);
  assert.equal(report.data_mutation, false);
  assert.equal(report.approval_status, "awaiting_owner_approval");
});

test("sources avoid forbidden product/supabase/netlify mutation imports in lib", () => {
  assert.ok(!LIB_SOURCE.includes("@netlify"));
  assert.ok(!LIB_SOURCE.includes("writeFileSync"));
  assert.ok(!LIB_SOURCE.includes("mkdirSync"));
});

test("report script only writes with explicit --registry-out under owner-decisions", () => {
  assert.ok(REPORT_SCRIPT_SOURCE.includes("--registry-out"));
  assert.ok(REPORT_SCRIPT_SOURCE.includes("data/owner-decisions"));
  assert.ok(REPORT_SCRIPT_SOURCE.includes("writeFileSync"));
});

test("proposal id and row count pulled from proposal not hardcoded", () => {
  const proposal = proposalFixture([
    {
      proposal_rank: 1,
      slug: "slug-a",
      oem_token: "A",
      brand: "whirlpool",
      evidence_artifact_path: "data/evidence/amazon-slug-a-live-outcome.json",
      destination_url: "https://example.com/a",
      affiliate_url: "https://example.com/a?tag=x",
      retailer_key: "amazon",
      retailer_name: "Amazon",
      browser_truth_classification: "direct_buyable",
      committed_buyer_path_status: "SEARCH_PLACEHOLDER",
      apply_mutation_authorized: false,
      csv_apply_authorized: false,
    },
    {
      proposal_rank: 2,
      slug: "slug-b",
      oem_token: "B",
      brand: "whirlpool",
      evidence_artifact_path: "data/evidence/amazon-slug-b-live-outcome.json",
      destination_url: "https://example.com/b",
      affiliate_url: "https://example.com/b?tag=x",
      retailer_key: "amazon",
      retailer_name: "Amazon",
      browser_truth_classification: "direct_buyable",
      committed_buyer_path_status: "SEARCH_PLACEHOLDER",
      apply_mutation_authorized: false,
      csv_apply_authorized: false,
    },
  ]);
  const report = buildFridgeBuyerPathBatchApprovalReportV1({
    rootDir: REPO_ROOT,
    buildProposalReport: () => proposal,
    readRegistryFiles: () => [],
  });
  assert.equal(report.proposed_batch_id, "fridge-buyer-path-batch-proposal-v1-testdigest");
  assert.equal(report.proposed_row_count, 2);
  assert.deepEqual(report.proposed_slugs, ["slug-a", "slug-b"]);
});

test("repo truth: 14 rows from live proposal at HEAD", () => {
  const report = buildFridgeBuyerPathBatchApprovalReportV1({ rootDir: REPO_ROOT });
  assert.equal(report.proposed_row_count, 14);
  assert.equal(report.proposed_slugs[0], "4396710");
});

test("no mutation authorization fields are true", () => {
  const report = buildFridgeBuyerPathBatchApprovalReportV1({ rootDir: REPO_ROOT });
  assert.equal(report.apply_mutation_authorized, false);
  assert.equal(report.csv_apply_authorized, false);
  assert.equal(report.retailer_links_mutation_authorized, false);
  assert.equal(report.supabase_mutation_authorized, false);
  assert.equal(report.public_ui_mutation_authorized, false);
  assert.equal(report.buy_link_mutation_authorized, false);
});

test("planning approval compile uses read_only_agent not owner_mutation_approved", () => {
  const proposal = proposalFixture([
    {
      proposal_rank: 1,
      slug: "4396710",
      oem_token: "4396710",
      brand: "whirlpool",
      evidence_artifact_path: null,
      destination_url: "https://example.com",
      affiliate_url: "https://example.com?tag=x",
      retailer_key: "amazon",
      retailer_name: "Amazon",
      browser_truth_classification: "direct_buyable",
      committed_buyer_path_status: "SEARCH_PLACEHOLDER",
      apply_mutation_authorized: false,
      csv_apply_authorized: false,
    },
  ]);
  const markdown = buildFridgeBuyerPathBatchApprovalChecklistMarkdownV1(proposal).replace(
    `founder_decision: _choose_one_`,
    "founder_decision: approve_for_next_planning_only",
  ).replace("owner_note:", "owner_note: Approved for planning only.");
  const compiled = compileFridgeBuyerPathBatchApprovalRegistryExportV1({
    proposal,
    decisionsMarkdown: markdown,
    decided_at: GENERATED_AT,
  });
  assert.equal(compiled.ok, true);
  if (!compiled.ok) return;
  assert.equal(compiled.row.allowed_next_scope, "read_only_agent");
  assert.equal(compiled.row.evidence_required_before_mutation, false);
  assert.notEqual(compiled.row.allowed_next_scope, "owner_mutation_approved");
  const validated = validateFounderDecisionRegistryRowV1(compiled.row);
  assert.equal(validated.ok, true);
});

test("resolveFridgeBuyerPathBatchApprovalStatusV1 maps reject to owner_rejected", () => {
  const status = resolveFridgeBuyerPathBatchApprovalStatusV1({
    matched_row: {
      decision_id: "x",
      source_queue_row_id: "q",
      source_decision_packet_id: "fridge_buyer_path_batch_approval_v1:batch",
      decided_at: GENERATED_AT,
      decision_status: "rejected",
      owner_note: "no",
      allowed_next_scope: "none",
      evidence_required_before_mutation: false,
      prohibited_actions_still_apply: ["no mutate"],
      fridge_buyer_path_batch_approval_context_v1: {
        review_packet_contract: "fridge_buyer_path_batch_approval_v1",
        founder_option_id: "reject",
        proposed_batch_id: "batch",
      },
    },
    validation_errors: [],
  });
  assert.equal(status, "owner_rejected");
});

test("parse decisions rejects _choose_one_", () => {
  const proposal = proposalFixture([]);
  const parsed = parseFridgeBuyerPathBatchApprovalDecisionsFromMarkdownV1({
    markdown: buildFridgeBuyerPathBatchApprovalChecklistMarkdownV1(proposal),
    expected_proposed_batch_id: proposal.proposed_batch_id,
  });
  assert.ok(parsed.parse_errors.length > 0);
  assert.equal(parsed.founder_option_id, null);
});
