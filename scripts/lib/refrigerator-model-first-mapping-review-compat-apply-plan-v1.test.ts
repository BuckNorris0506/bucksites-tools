import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  REFRIGERATOR_MODEL_FIRST_MAPPING_REVIEW_COMPAT_APPLY_PLAN_CONTRACT_V1,
  buildRefrigeratorModelFirstMappingReviewCompatApplyPlanV1,
} from "./refrigerator-model-first-mapping-review-compat-apply-plan-v1";
import {
  REFRIGERATOR_MODEL_FIRST_QA_COMPAT_APPLY_APPROVAL_PHRASE_V1,
  runRefrigeratorModelFirstCompatApplyExecutorV1,
} from "./refrigerator-model-first-mapping-review-compat-apply-executor-v1";
import { REFRIGERATOR_MODEL_FIRST_QA_BATCH_APPLIED_COUNTS_V1 } from "./refrigerator-model-first-qa-batch-post-apply-v1";

const REPO_ROOT = process.cwd();

const MANIFEST_REL =
  "data/fridge/batch-production/model-first-input-v1/fridge-models-batch-v1.json";

test("apply plan reflects post-apply batch complete with no pending CSV changes", () => {
  const plan = buildRefrigeratorModelFirstMappingReviewCompatApplyPlanV1({
    rootDir: REPO_ROOT,
    manifestRelPath: MANIFEST_REL,
  });
  assert.equal(plan.contract, REFRIGERATOR_MODEL_FIRST_MAPPING_REVIEW_COMPAT_APPLY_PLAN_CONTRACT_V1);
  assert.equal(plan.rows.length, 0);
  assert.equal(plan.inspect_summary.mapping_review_model_count, 0);
  assert.equal(plan.inspect_summary.batch_qa_cleanup_applied, true);
  assert.equal(plan.inspect_summary.batch_qa_cleanup_status, "applied_batch_complete");
  assert.equal(plan.inspect_summary.removals_applied, REFRIGERATOR_MODEL_FIRST_QA_BATCH_APPLIED_COUNTS_V1.removals_applied);
  assert.equal(plan.inspect_summary.proven_model_count, 20);
  assert.equal(plan.inspect_summary.remaining_mapping_review_count, 0);
  assert.equal(plan.inspect_summary.samsung_marketing_token_cross_reference_resolved, true);
  assert.equal(plan.inspect_summary.total_planned_removals, 0);
  assert.equal(plan.inspect_summary.total_planned_additions, 0);
  assert.match(plan.inspect_summary.recommended_next_action, /All 20 models PROVEN/i);
});

test("apply executor is idempotent ALREADY_APPLIED after post-apply re-run with approval", () => {
  const csvPath = path.join(REPO_ROOT, "data/compatibility_mappings.csv");
  const before = readFileSync(csvPath, "utf8");
  const result = runRefrigeratorModelFirstCompatApplyExecutorV1({
    rootDir: REPO_ROOT,
    manifestRelPath: MANIFEST_REL,
    mode: "apply",
    approvalPhrase: REFRIGERATOR_MODEL_FIRST_QA_COMPAT_APPLY_APPROVAL_PHRASE_V1,
  });
  assert.equal(result.apply_status, "ALREADY_APPLIED");
  assert.equal(result.data_mutation, false);
  assert.equal(result.post_apply_resolver_inspect_summary?.confidence_counts.PROVEN, 20);
  assert.equal(
    result.post_apply_resolver_inspect_summary?.confidence_counts.MAPPING_REVIEW_REQUIRED,
    0,
  );
  assert.equal(readFileSync(csvPath, "utf8"), before);
});

test("apply plan does not mutate compatibility_mappings.csv", () => {
  const csvPath = path.join(REPO_ROOT, "data/compatibility_mappings.csv");
  const before = readFileSync(csvPath, "utf8");
  buildRefrigeratorModelFirstMappingReviewCompatApplyPlanV1({
    rootDir: REPO_ROOT,
    manifestRelPath: MANIFEST_REL,
  });
  assert.equal(readFileSync(csvPath, "utf8"), before);
});
