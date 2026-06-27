import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  FRIDGE_SAFE_LINK_UKF8001_APPLY_PLAN_JSON_REL_V1,
  FRIDGE_SAFE_LINK_UKF8001_TARGET_SLUG_V1,
  buildFridgeSafeLinkUkf8001ApplyPlanProposalV1,
  proposedSlugSetFromReport,
  SUPABASE_CSV_PARITY_COVERAGE_FACTORY_CONTRACT_V1,
} from "./fridge-safe-link-ukf8001-apply-plan-proposal-v1";
import {
  FRIDGE_SAFE_LINK_UKF8001_EXECUTION_PLAN_REL_V1,
  FRIDGE_SAFE_LINK_UKF8001_GUARDED_APPLY_CONTRACT_V1,
  buildFridgeSafeLinkUkf8001UniversalExecutionPlanV1,
  runFridgeSafeLinkUkf8001GuardedApplyV1,
} from "./fridge-safe-link-ukf8001-guarded-apply-v1";
import { UNIVERSAL_BATCH_LIFECYCLE_APPLY_EXECUTION_PLAN_CONTRACT_V1 } from "./universal-batch-lifecycle-apply-execution-plan-v1";

const REPO_ROOT = process.cwd();

describe("fridge-safe-link-ukf8001-apply-plan-proposal-v1 (factory wrapper)", () => {
  test("proposal is read-only and targets ukf8001 only via generic factory", () => {
    const report = buildFridgeSafeLinkUkf8001ApplyPlanProposalV1({ rootDir: REPO_ROOT });
    assert.equal(report.read_only, true);
    assert.equal(report.data_mutation, false);
    assert.equal(report.mutation_authorized, false);
    assert.equal(report.target_slug, FRIDGE_SAFE_LINK_UKF8001_TARGET_SLUG_V1);
    assert.equal(report.factory_contract, SUPABASE_CSV_PARITY_COVERAGE_FACTORY_CONTRACT_V1);
    assert.deepEqual(proposedSlugSetFromReport(report), [FRIDGE_SAFE_LINK_UKF8001_TARGET_SLUG_V1]);
  });

  test("uses live-outcome evidence with PROVEN direct_buyable", () => {
    const report = buildFridgeSafeLinkUkf8001ApplyPlanProposalV1({ rootDir: REPO_ROOT });
    assert.equal(report.proposed_csv_row.browser_truth_classification, "direct_buyable");
    assert.match(report.proposed_csv_row.affiliate_url, /B07C8C2VBH/);
    const classification = report.proposed_retailer_link_row_fields.find(
      (f) => f.field === "browser_truth_classification",
    );
    assert.equal(classification?.proof_status, "PROVEN");
  });

  test("expected census delta is +1 SAFE_BUYER_PATH_PROVEN", () => {
    const report = buildFridgeSafeLinkUkf8001ApplyPlanProposalV1({ rootDir: REPO_ROOT });
    assert.equal(report.expected_census_delta?.before_classification, "SAFE_BUYER_PATH_SUPPRESSED_TRUST");
    assert.equal(report.expected_census_delta?.after_classification, "SAFE_BUYER_PATH_PROVEN");
    assert.equal(report.expected_census_delta?.safe_buyer_path_proven_count_delta, 1);
  });
});

test("buildFridgeSafeLinkUkf8001UniversalExecutionPlanV1 produces single-slug patch", () => {
  const applyPlan = buildFridgeSafeLinkUkf8001ApplyPlanProposalV1({ rootDir: REPO_ROOT });
  const built = buildFridgeSafeLinkUkf8001UniversalExecutionPlanV1({
    applyPlan,
    applyPlanRelPath: FRIDGE_SAFE_LINK_UKF8001_APPLY_PLAN_JSON_REL_V1,
  });
  assert.equal(built.execution_plan.contract, UNIVERSAL_BATCH_LIFECYCLE_APPLY_EXECUTION_PLAN_CONTRACT_V1);
  assert.equal(built.execution_plan.planned_change_count, 1);
  assert.equal(built.execution_plan.row_patch_preview[0]?.slug, FRIDGE_SAFE_LINK_UKF8001_TARGET_SLUG_V1);
  assert.equal(built.execution_plan_artifact_rel_path, FRIDGE_SAFE_LINK_UKF8001_EXECUTION_PLAN_REL_V1);
});

test("runFridgeSafeLinkUkf8001GuardedApplyV1 dry-run is DRY_RUN_READY without founder approval", async () => {
  const report = await runFridgeSafeLinkUkf8001GuardedApplyV1({ rootDir: REPO_ROOT, writeCsv: false });
  assert.equal(report.contract, FRIDGE_SAFE_LINK_UKF8001_GUARDED_APPLY_CONTRACT_V1);
  assert.equal(report.bridge_status, "DRY_RUN_READY");
  assert.equal(report.factory_contract, SUPABASE_CSV_PARITY_COVERAGE_FACTORY_CONTRACT_V1);
  assert.equal(report.guarded_executor_report?.executor_status, "PRE_APPLY_DRY_RUN_READY");
  assert.equal(report.guarded_executor_report?.row_patch_count, 1);
});

test("runFridgeSafeLinkUkf8001GuardedApplyV1 write mode blocked without founder approval", async () => {
  const report = await runFridgeSafeLinkUkf8001GuardedApplyV1({ rootDir: REPO_ROOT, writeCsv: true });
  assert.equal(report.write_csv_applied, false);
  assert.equal(report.bridge_status, "BLOCKED");
  assert.ok(report.blockers.some((b) => b.includes("founder")));
});
