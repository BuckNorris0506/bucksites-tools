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

test("apply plan is blocked pending founder approval", () => {
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
  assert.match(plan.inspect_summary.recommended_next_action, /BLOCKED.*Founder approval/i);
});

test("planned removals and additions match reconciliation plan for 3 LG models", () => {
  const plan = buildRefrigeratorModelFirstMappingReviewCompatApplyPlanV1({
    rootDir: REPO_ROOT,
    manifestRelPath: MANIFEST_REL,
  });
  assert.equal(plan.rows.length, 3);

  const lrfxs = plan.rows.find((r) => r.fridge_slug === "lg-lrfxs3106s");
  assert.ok(lrfxs);
  assert.deepEqual(
    lrfxs!.planned_removals.map((r) => r.csv_row_key).sort(),
    ["lg-lrfxs3106s,lt600p", "lg-lrfxs3106s,lt800p"],
  );
  assert.deepEqual(lrfxs!.planned_additions.map((r) => r.csv_row_key), ["lg-lrfxs3106s,lt1000p"]);
  assert.equal(lrfxs!.planned_additions[0]!.exists_in_committed_csv, false);

  for (const slug of ["lg-lfxs28968s", "lg-lfxs26973s"]) {
    const row = plan.rows.find((r) => r.fridge_slug === slug);
    assert.ok(row, slug);
    assert.deepEqual(
      row!.planned_removals.map((r) => r.filter_slug).sort(),
      ["adq36006101", "adq74793502", "lt700p", "mdj64844601"],
    );
    assert.deepEqual(row!.planned_keeps.sort(), [`${slug},lt1000p`, `${slug},lt1000pc`].sort());
    assert.deepEqual(row!.planned_additions, []);
    for (const removal of row!.planned_removals) {
      assert.equal(removal.exists_in_committed_csv, true);
    }
  }
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
