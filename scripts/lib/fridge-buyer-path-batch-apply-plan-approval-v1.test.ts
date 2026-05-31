import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  validateFounderDecisionRegistryRowV1,
} from "../../src/lib/owner-dashboard/founder-decision-registry-v1";
import {
  buildFridgeBuyerPathBatchApplyPlanApprovalChecklistMarkdownV1,
  buildFridgeBuyerPathBatchApplyPlanApprovalReportV1,
  compileFridgeBuyerPathBatchApplyPlanApprovalRegistryExportV1,
  FRIDGE_BUYER_PATH_BATCH_APPLY_PLAN_APPROVAL_CANONICAL_APPLY_PLAN_REL_V1,
  FRIDGE_BUYER_PATH_BATCH_APPLY_PLAN_APPROVAL_CONTRACT_V1,
  FRIDGE_BUYER_PATH_BATCH_APPLY_PLAN_APPROVAL_DEFAULT_REGISTRY_REL_V1,
  parseFridgeBuyerPathBatchApplyPlanApprovalDecisionsFromMarkdownV1,
  type FridgeBuyerPathBatchApplyPlanArtifactV1,
} from "./fridge-buyer-path-batch-apply-plan-approval-v1";

const REPO_ROOT = process.cwd();
const GENERATED_AT = "2026-05-31T12:00:00.000Z";

const REPORT_SCRIPT_SOURCE = readFileSync(
  path.join(REPO_ROOT, "scripts/report-fridge-buyer-path-batch-apply-plan-approval-v1.ts"),
  "utf8",
);

const LIB_SOURCE = readFileSync(
  path.join(REPO_ROOT, "scripts/lib/fridge-buyer-path-batch-apply-plan-approval-v1.ts"),
  "utf8",
);

function applyPlanFixture(
  overrides: Partial<FridgeBuyerPathBatchApplyPlanArtifactV1> = {},
): FridgeBuyerPathBatchApplyPlanArtifactV1 {
  return {
    contract: "fridge_buyer_path_batch_apply_plan_proposal_v1",
    source_apply_plan_artifact_rel_path:
      FRIDGE_BUYER_PATH_BATCH_APPLY_PLAN_APPROVAL_CANONICAL_APPLY_PLAN_REL_V1,
    proposed_batch_id: "fridge-buyer-path-batch-proposal-v1-testdigest",
    run_id: "fridge-buyer-path-batch-run-v1-testdigest",
    plan_status: "READY_FOR_OWNER_REVIEW",
    owner_review_status: "OWNER_REVIEW_READY",
    planned_change_count: 2,
    planned_changes: [{ slug: "slug-a" }, { slug: "slug-b" }],
    ...overrides,
  };
}

function approvedMarkdown(applyPlan: FridgeBuyerPathBatchApplyPlanArtifactV1, note = "Planning only."): string {
  return buildFridgeBuyerPathBatchApplyPlanApprovalChecklistMarkdownV1(applyPlan).replace(
    "founder_decision: _choose_one_",
    "founder_decision: approve_for_next_planning_only",
  ).replace(
    "owner_note:",
    `owner_note: ${note}`,
  );
}

test("fridge buyer-path apply-plan approval report is read-only by default", () => {
  const applyPlanAbs = path.join(REPO_ROOT, FRIDGE_BUYER_PATH_BATCH_APPLY_PLAN_APPROVAL_CANONICAL_APPLY_PLAN_REL_V1);
  if (!existsSync(applyPlanAbs)) return;

  const report = buildFridgeBuyerPathBatchApplyPlanApprovalReportV1({
    rootDir: REPO_ROOT,
    readRegistryFiles: () => [],
  });
  assert.equal(report.contract, FRIDGE_BUYER_PATH_BATCH_APPLY_PLAN_APPROVAL_CONTRACT_V1);
  assert.equal(report.read_only, true);
  assert.equal(report.data_mutation, false);
  assert.equal(report.approval_status, "awaiting_owner_approval");
  assert.equal(report.planned_change_count, 14);
  assert.equal(report.apply_mutation_authorized, false);
  assert.equal(report.csv_apply_authorized, false);
  assert.equal(report.evidence_write_authorized, false);
  assert.equal(report.netlify_api_authorized, false);
});

test("sources avoid forbidden product/supabase/netlify mutation imports in lib", () => {
  assert.ok(!LIB_SOURCE.includes("@netlify"));
  assert.ok(!LIB_SOURCE.includes("writeFileSync"));
  assert.ok(!LIB_SOURCE.includes("mkdirSync"));
});

test("report script writes only with explicit --registry-out under owner-decisions", () => {
  assert.ok(REPORT_SCRIPT_SOURCE.includes("--registry-out"));
  assert.ok(REPORT_SCRIPT_SOURCE.includes(FRIDGE_BUYER_PATH_BATCH_APPLY_PLAN_APPROVAL_DEFAULT_REGISTRY_REL_V1));
  assert.ok(REPORT_SCRIPT_SOURCE.includes("writeFileSync"));
});

test("parses valid approve_for_next_planning_only decision", () => {
  const applyPlan = applyPlanFixture();
  const markdown = approvedMarkdown(applyPlan);
  const parsed = parseFridgeBuyerPathBatchApplyPlanApprovalDecisionsFromMarkdownV1({
    markdown,
    expected_apply_plan_artifact_rel_path: applyPlan.source_apply_plan_artifact_rel_path,
    expected_planned_change_count: applyPlan.planned_change_count,
  });
  assert.deepEqual(parsed.parse_errors, []);
  assert.equal(parsed.founder_option_id, "approve_for_next_planning_only");
  assert.equal(parsed.owner_note, "Planning only.");

  const compiled = compileFridgeBuyerPathBatchApplyPlanApprovalRegistryExportV1({
    applyPlan,
    decisionsMarkdown: markdown,
    decided_at: GENERATED_AT,
  });
  assert.equal(compiled.ok, true);
  if (!compiled.ok) return;
  assert.equal(
    compiled.row.fridge_buyer_path_batch_apply_plan_approval_context_v1?.founder_option_id,
    "approve_for_next_planning_only",
  );
  assert.equal(compiled.row.allowed_next_scope, "read_only_agent");
});

test("rejects _choose_one_", () => {
  const applyPlan = applyPlanFixture();
  const markdown = buildFridgeBuyerPathBatchApplyPlanApprovalChecklistMarkdownV1(applyPlan);
  const parsed = parseFridgeBuyerPathBatchApplyPlanApprovalDecisionsFromMarkdownV1({
    markdown,
    expected_apply_plan_artifact_rel_path: applyPlan.source_apply_plan_artifact_rel_path,
    expected_planned_change_count: applyPlan.planned_change_count,
  });
  assert.ok(parsed.parse_errors.some((error) => error.includes("_choose_one_")));
});

test("rejects owner_mutation_approved scope via founder registry validator", () => {
  const applyPlan = applyPlanFixture();
  const markdown = approvedMarkdown(applyPlan);
  const compiled = compileFridgeBuyerPathBatchApplyPlanApprovalRegistryExportV1({
    applyPlan,
    decisionsMarkdown: markdown,
    decided_at: GENERATED_AT,
  });
  assert.equal(compiled.ok, true);
  if (!compiled.ok) return;
  const invalid = validateFounderDecisionRegistryRowV1({
    ...compiled.row,
    allowed_next_scope: "owner_mutation_approved",
    evidence_required_before_mutation: true,
  });
  assert.equal(invalid.ok, false);
});

test("rejects wrong apply-plan artifact path or mismatched planned_change_count", () => {
  const applyPlan = applyPlanFixture();
  const markdownPath = approvedMarkdown(applyPlan).replace(
    `apply_plan_artifact_rel_path: ${applyPlan.source_apply_plan_artifact_rel_path}`,
    "apply_plan_artifact_rel_path: data/fridge/batch-production/apply-plans/wrong.json",
  );
  const parsedPath = parseFridgeBuyerPathBatchApplyPlanApprovalDecisionsFromMarkdownV1({
    markdown: markdownPath,
    expected_apply_plan_artifact_rel_path: applyPlan.source_apply_plan_artifact_rel_path,
    expected_planned_change_count: applyPlan.planned_change_count,
  });
  assert.ok(parsedPath.parse_errors.some((error) => error.includes("apply_plan_artifact_rel_path")));

  const markdownCount = approvedMarkdown(applyPlan).replace(
    "planned_change_count: 2",
    "planned_change_count: 99",
  );
  const parsedCount = parseFridgeBuyerPathBatchApplyPlanApprovalDecisionsFromMarkdownV1({
    markdown: markdownCount,
    expected_apply_plan_artifact_rel_path: applyPlan.source_apply_plan_artifact_rel_path,
    expected_planned_change_count: applyPlan.planned_change_count,
  });
  assert.ok(parsedCount.parse_errors.some((error) => error.includes("planned_change_count")));
});

test("all mutation flags false on report", () => {
  const report = buildFridgeBuyerPathBatchApplyPlanApprovalReportV1({
    rootDir: REPO_ROOT,
    loadApplyPlanArtifact: () => applyPlanFixture(),
    readRegistryFiles: () => [],
    now: () => new Date(GENERATED_AT),
  });
  assert.equal(report.apply_mutation_authorized, false);
  assert.equal(report.csv_apply_authorized, false);
  assert.equal(report.retailer_links_mutation_authorized, false);
  assert.equal(report.supabase_mutation_authorized, false);
  assert.equal(report.public_ui_mutation_authorized, false);
  assert.equal(report.buy_link_mutation_authorized, false);
  assert.equal(report.evidence_write_authorized, false);
  assert.equal(report.netlify_api_authorized, false);
});
