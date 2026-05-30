import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  REFRIGERATOR_MODEL_FIRST_MAPPING_REVIEW_RECONCILIATION_PLAN_CONTRACT_V1,
  buildRefrigeratorModelFirstMappingReviewReconciliationPlanV1,
} from "./refrigerator-model-first-mapping-review-reconciliation-plan-v1";

const REPO_ROOT = process.cwd();

const MANIFEST_REL =
  "data/fridge/batch-production/model-first-input-v1/fridge-models-batch-v1.json";

const FORBIDDEN_MUTATION_PATHS = [
  "data/filters.csv",
  "data/retailer_links.csv",
  "data/fridge_models.csv",
  "data/compatibility_mappings.csv",
];

test("plan is read_only with all mutation gates false and no remaining mapping-review models after Samsung cross-reference", () => {
  const plan = buildRefrigeratorModelFirstMappingReviewReconciliationPlanV1({
    rootDir: REPO_ROOT,
    manifestRelPath: MANIFEST_REL,
  });
  assert.equal(plan.contract, REFRIGERATOR_MODEL_FIRST_MAPPING_REVIEW_RECONCILIATION_PLAN_CONTRACT_V1);
  assert.equal(plan.read_only, true);
  assert.equal(plan.data_mutation, false);
  assert.equal(plan.inspect_summary.mapping_review_model_count, 0);
  assert.equal(plan.rows.length, 0);
});

test("read-only plan does not mutate product CSVs", () => {
  const before = new Map(
    FORBIDDEN_MUTATION_PATHS.map((p) => [p, readFileSync(path.join(REPO_ROOT, p), "utf8")]),
  );

  buildRefrigeratorModelFirstMappingReviewReconciliationPlanV1({
    rootDir: REPO_ROOT,
    manifestRelPath: MANIFEST_REL,
  });

  for (const [p, content] of before.entries()) {
    assert.equal(readFileSync(path.join(REPO_ROOT, p), "utf8"), content);
  }
});
