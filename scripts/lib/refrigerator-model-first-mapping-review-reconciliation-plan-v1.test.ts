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

test("plan is read_only with all mutation gates false", () => {
  const plan = buildRefrigeratorModelFirstMappingReviewReconciliationPlanV1({
    rootDir: REPO_ROOT,
    manifestRelPath: MANIFEST_REL,
  });
  assert.equal(plan.contract, REFRIGERATOR_MODEL_FIRST_MAPPING_REVIEW_RECONCILIATION_PLAN_CONTRACT_V1);
  assert.equal(plan.read_only, true);
  assert.equal(plan.data_mutation, false);
  assert.equal(plan.csv_apply_authorized, false);
  assert.equal(plan.supabase_update_authorized, false);
  assert.equal(plan.buy_link_mutation_authorized, false);
  assert.equal(plan.public_page_change_authorized, false);
  assert.equal(plan.inspect_summary.mapping_review_model_count, 3);
  for (const row of plan.rows) {
    assert.equal(row.proposed_future_compat_changes.not_applied, true);
    assert.equal(row.csv_apply_authorized, false);
  }
});

test("lg-lrfxs3106s proposes remove lt600p/lt800p and add lt1000p only", () => {
  const plan = buildRefrigeratorModelFirstMappingReviewReconciliationPlanV1({
    rootDir: REPO_ROOT,
    manifestRelPath: MANIFEST_REL,
  });
  const row = plan.rows.find((r) => r.fridge_slug === "lg-lrfxs3106s");
  assert.ok(row);
  assert.equal(row!.official_filter_token_or_name, "LT1000P");
  assert.deepEqual(
    row!.legacy_mappings_look_wrong.map((r) => r.filter_slug).sort(),
    ["lt600p", "lt800p"],
  );
  assert.deepEqual(row!.legacy_mappings_look_correct, []);
  assert.deepEqual(row!.proposed_future_compat_changes.remove_rows.sort(), [
    "lg-lrfxs3106s,lt600p",
    "lg-lrfxs3106s,lt800p",
  ]);
  assert.deepEqual(row!.proposed_future_compat_changes.add_rows, ["lg-lrfxs3106s,lt1000p"]);
});

test("lg-lfxs28968s and lg-lfxs26973s keep lt1000p family and remove wrong mappings", () => {
  const plan = buildRefrigeratorModelFirstMappingReviewReconciliationPlanV1({
    rootDir: REPO_ROOT,
    manifestRelPath: MANIFEST_REL,
  });
  for (const slug of ["lg-lfxs28968s", "lg-lfxs26973s"]) {
    const row = plan.rows.find((r) => r.fridge_slug === slug);
    assert.ok(row, slug);
    assert.deepEqual(
      row!.legacy_mappings_look_correct.map((r) => r.filter_slug).sort(),
      ["lt1000p", "lt1000pc"],
    );
    assert.deepEqual(
      row!.legacy_mappings_look_wrong.map((r) => r.filter_slug).sort(),
      ["adq36006101", "adq74793502", "lt700p", "mdj64844601"],
    );
    assert.deepEqual(row!.proposed_future_compat_changes.add_rows, []);
    assert.equal(row!.proposed_future_compat_changes.keep_rows.length, 2);
    assert.equal(row!.proposed_future_compat_changes.remove_rows.length, 4);
  }
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
