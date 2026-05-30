import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  REFRIGERATOR_MODEL_FIRST_MAPPING_REVIEW_COMPAT_APPLY_PLAN_CONTRACT_V1,
  buildRefrigeratorModelFirstMappingReviewCompatApplyPlanV1,
} from "./refrigerator-model-first-mapping-review-compat-apply-plan-v1";

const REPO_ROOT = process.cwd();

const MANIFEST_REL =
  "data/fridge/batch-production/model-first-input-v1/fridge-models-batch-v1.json";

test("apply plan is blocked pending founder approval for all 20 models", () => {
  const plan = buildRefrigeratorModelFirstMappingReviewCompatApplyPlanV1({
    rootDir: REPO_ROOT,
    manifestRelPath: MANIFEST_REL,
  });
  assert.equal(plan.contract, REFRIGERATOR_MODEL_FIRST_MAPPING_REVIEW_COMPAT_APPLY_PLAN_CONTRACT_V1);
  assert.equal(plan.read_only, true);
  assert.equal(plan.data_mutation, false);
  assert.equal(plan.apply_authorized, false);
  assert.equal(plan.founder_approval_required, true);
  assert.equal(plan.founder_approval_status, "pending");
  assert.equal(plan.waiting_for_founder_approval, true);
  assert.equal(plan.csv_apply_authorized, false);
  assert.equal(plan.supabase_update_authorized, false);
  assert.equal(plan.buy_link_mutation_authorized, false);
  assert.equal(plan.public_page_change_authorized, false);
  assert.equal(plan.rows.length, 20);
  assert.equal(plan.inspect_summary.mapping_review_model_count, 20);
  assert.match(plan.inspect_summary.recommended_next_action, /BLOCKED.*Founder approval/i);
  for (const row of plan.rows) {
    assert.equal(row.not_applied, true);
  }
});

test("planned removals and additions match reconciliation plan across all brands", () => {
  const plan = buildRefrigeratorModelFirstMappingReviewCompatApplyPlanV1({
    rootDir: REPO_ROOT,
    manifestRelPath: MANIFEST_REL,
  });

  const lrfxs = plan.rows.find((r) => r.fridge_slug === "lg-lrfxs3106s");
  assert.ok(lrfxs);
  assert.deepEqual(
    lrfxs!.planned_removals.map((r) => r.csv_row_key).sort(),
    ["lg-lrfxs3106s,lt600p", "lg-lrfxs3106s,lt800p"],
  );
  assert.deepEqual(lrfxs!.planned_additions.map((r) => r.csv_row_key), ["lg-lrfxs3106s,lt1000p"]);
  assert.equal(lrfxs!.planned_additions[0]!.exists_in_committed_csv, false);

  const samsungQin = plan.rows.find((r) => r.fridge_slug === "samsung-rf28r7351sg");
  assert.ok(samsungQin);
  assert.deepEqual(
    samsungQin!.planned_keeps.sort(),
    ["samsung-rf28r7351sg,da97-17376a", "samsung-rf28r7351sg,da97-17376b"].sort(),
  );
  assert.deepEqual(samsungQin!.planned_additions, []);

  const samsungCin = plan.rows.find((r) => r.fridge_slug === "samsung-rf263beaesr");
  assert.ok(samsungCin);
  assert.deepEqual(samsungCin!.planned_additions.map((r) => r.csv_row_key), [
    "samsung-rf263beaesr,da29-00020b",
  ]);

  const ge = plan.rows.find((r) => r.fridge_slug === "ge-gfe28gskss");
  assert.ok(ge);
  assert.deepEqual(ge!.planned_additions.map((r) => r.csv_row_key), ["ge-gfe28gskss,rpwfe"]);

  const whirlpool = plan.rows.find((r) => r.fridge_slug === "whirlpool-wrx735sdhz");
  assert.ok(whirlpool);
  assert.deepEqual(whirlpool!.planned_additions.map((r) => r.csv_row_key), [
    "whirlpool-wrx735sdhz,edr4rxd1",
  ]);

  const frigidaire = plan.rows.find((r) => r.fridge_slug === "frigidaire-fghb2868pf");
  assert.ok(frigidaire);
  assert.deepEqual(frigidaire!.planned_additions.map((r) => r.csv_row_key), [
    "frigidaire-fghb2868pf,eptwfu01",
  ]);
});

test("inspect summary totals match flattened planned changes for all 20 models", () => {
  const plan = buildRefrigeratorModelFirstMappingReviewCompatApplyPlanV1({
    rootDir: REPO_ROOT,
    manifestRelPath: MANIFEST_REL,
  });
  const totalKeeps = plan.rows.reduce((sum, row) => sum + row.planned_keeps.length, 0);
  assert.equal(plan.inspect_summary.total_planned_removals, plan.planned_compat_csv_row_removals.length);
  assert.equal(plan.inspect_summary.total_planned_additions, plan.planned_compat_csv_row_additions.length);
  assert.equal(plan.inspect_summary.total_planned_keeps, totalKeeps);
  assert.equal(plan.inspect_summary.total_planned_removals, 53);
  assert.equal(plan.inspect_summary.total_planned_additions, 10);
  assert.equal(plan.inspect_summary.total_planned_keeps, 16);
  assert.equal(plan.inspect_summary.apply_authorized, false);
  assert.equal(plan.inspect_summary.founder_approval_required, true);
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
