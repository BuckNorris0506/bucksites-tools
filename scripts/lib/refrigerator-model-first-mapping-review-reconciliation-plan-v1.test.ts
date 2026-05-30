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

test("plan is read_only with all mutation gates false and covers all 20 mapping-review models", () => {
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
  assert.equal(plan.inspect_summary.mapping_review_model_count, 20);
  assert.equal(plan.rows.length, 20);
  assert.equal(plan.grouped_official_filter_families.length, 9);
  for (const row of plan.rows) {
    assert.equal(row.proposed_future_compat_changes.not_applied, true);
    assert.equal(row.csv_apply_authorized, false);
  }
});

test("LG LT1000P family: keep lt1000p/lt1000pc; remove non-LT1000P slugs", () => {
  const plan = buildRefrigeratorModelFirstMappingReviewReconciliationPlanV1({
    rootDir: REPO_ROOT,
    manifestRelPath: MANIFEST_REL,
  });
  const lrfxs = plan.rows.find((r) => r.fridge_slug === "lg-lrfxs3106s");
  assert.ok(lrfxs);
  assert.equal(lrfxs!.official_filter_token_or_name, "LT1000P");
  assert.deepEqual(
    lrfxs!.legacy_mappings_look_wrong.map((r) => r.filter_slug).sort(),
    ["lt600p", "lt800p"],
  );
  assert.deepEqual(lrfxs!.proposed_future_compat_changes.remove_rows.sort(), [
    "lg-lrfxs3106s,lt600p",
    "lg-lrfxs3106s,lt800p",
  ]);
  assert.deepEqual(lrfxs!.proposed_future_compat_changes.add_rows, ["lg-lrfxs3106s,lt1000p"]);

  for (const slug of [
    "lg-lfxs28968s",
    "lg-lfxs26973s",
    "lg-lrfvs3006s",
    "lg-lfxc22596s",
    "lg-lmxs28626s",
  ]) {
    const row = plan.rows.find((r) => r.fridge_slug === slug);
    assert.ok(row, slug);
    assert.deepEqual(
      row!.legacy_mappings_look_correct.map((r) => r.filter_slug).sort(),
      ["lt1000p", "lt1000pc"],
    );
    assert.deepEqual(row!.proposed_future_compat_changes.add_rows, []);
    assert.ok(row!.proposed_future_compat_changes.keep_rows.length >= 2);
    assert.ok(row!.proposed_future_compat_changes.remove_rows.length >= 3);
  }
});

test("Samsung HAF-QIN: keep da97-17376 family; remove HAF-CIN slugs", () => {
  const plan = buildRefrigeratorModelFirstMappingReviewReconciliationPlanV1({
    rootDir: REPO_ROOT,
    manifestRelPath: MANIFEST_REL,
  });
  const rf28r7351sg = plan.rows.find((r) => r.fridge_slug === "samsung-rf28r7351sg");
  assert.ok(rf28r7351sg);
  assert.deepEqual(
    rf28r7351sg!.legacy_mappings_look_correct.map((r) => r.filter_slug).sort(),
    ["da97-17376a", "da97-17376b"],
  );
  assert.deepEqual(
    rf28r7351sg!.legacy_mappings_look_wrong.map((r) => r.filter_slug).sort(),
    ["da29-00012b", "da29-00020b"],
  );
  assert.deepEqual(rf28r7351sg!.proposed_future_compat_changes.add_rows, []);

  const rf28r7201sr = plan.rows.find((r) => r.fridge_slug === "samsung-rf28r7201sr");
  assert.ok(rf28r7201sr);
  assert.deepEqual(
    rf28r7201sr!.legacy_mappings_look_wrong.map((r) => r.filter_slug).sort(),
    ["da29-00012b", "da29-00020b"],
  );
  assert.deepEqual(rf28r7201sr!.proposed_future_compat_changes.add_rows, [
    "samsung-rf28r7201sr,da97-17376b",
  ]);
});

test("Samsung HAF-CIN: keep/add da29-00020B family; remove HAF-QIN slugs", () => {
  const plan = buildRefrigeratorModelFirstMappingReviewReconciliationPlanV1({
    rootDir: REPO_ROOT,
    manifestRelPath: MANIFEST_REL,
  });
  const rf263 = plan.rows.find((r) => r.fridge_slug === "samsung-rf263beaesr");
  assert.ok(rf263);
  assert.deepEqual(
    rf263!.legacy_mappings_look_wrong.map((r) => r.filter_slug).sort(),
    ["da97-17376a", "da97-17376b"],
  );
  assert.deepEqual(rf263!.proposed_future_compat_changes.add_rows, [
    "samsung-rf263beaesr,da29-00020b",
  ]);

  const rf28n = plan.rows.find((r) => r.fridge_slug === "samsung-rf28nhedbsr");
  assert.ok(rf28n);
  assert.deepEqual(
    rf28n!.legacy_mappings_look_wrong.map((r) => r.filter_slug).sort(),
    ["da29-10105j", "da97-19467c"],
  );
  assert.deepEqual(rf28n!.proposed_future_compat_changes.add_rows, [
    "samsung-rf28nhedbsr,da29-00020b",
  ]);
});

test("GE RPWFE: keep/add RPWFE; remove MWF/MSWF/XWFE conflicts", () => {
  const plan = buildRefrigeratorModelFirstMappingReviewReconciliationPlanV1({
    rootDir: REPO_ROOT,
    manifestRelPath: MANIFEST_REL,
  });
  const gskss = plan.rows.find((r) => r.fridge_slug === "ge-gfe28gskss");
  assert.ok(gskss);
  assert.deepEqual(
    gskss!.legacy_mappings_look_wrong.map((r) => r.filter_slug).sort(),
    ["mswf", "mwf"],
  );
  assert.deepEqual(gskss!.proposed_future_compat_changes.add_rows, ["ge-gfe28gskss,rpwfe"]);

  const gmkes = plan.rows.find((r) => r.fridge_slug === "ge-gfe28gmkes");
  assert.ok(gmkes);
  assert.deepEqual(gmkes!.proposed_future_compat_changes.keep_rows, ["ge-gfe28gmkes,rpwfe"]);
  assert.deepEqual(gmkes!.proposed_future_compat_changes.remove_rows, ["ge-gfe28gmkes,mswf"]);

  const gynfs = plan.rows.find((r) => r.fridge_slug === "ge-gfe28gynfs");
  assert.ok(gynfs);
  assert.deepEqual(gynfs!.proposed_future_compat_changes.keep_rows, ["ge-gfe28gynfs,rpwfe"]);
  assert.deepEqual(gynfs!.proposed_future_compat_changes.remove_rows, ["ge-gfe28gynfs,xwfe"]);
});

test("Whirlpool: reconcile to EDR1RXD1 / EDR2RXD1 / EDR4RXD1 per official token", () => {
  const plan = buildRefrigeratorModelFirstMappingReviewReconciliationPlanV1({
    rootDir: REPO_ROOT,
    manifestRelPath: MANIFEST_REL,
  });
  const wrx735 = plan.rows.find((r) => r.fridge_slug === "whirlpool-wrx735sdhz");
  assert.ok(wrx735);
  assert.equal(wrx735!.official_filter_token_or_name, "EDR4RXD1");
  assert.deepEqual(wrx735!.proposed_future_compat_changes.add_rows, [
    "whirlpool-wrx735sdhz,edr4rxd1",
  ]);
  assert.ok(wrx735!.proposed_future_compat_changes.remove_rows.length >= 7);

  const wrx986 = plan.rows.find((r) => r.fridge_slug === "whirlpool-wrx986sihz");
  assert.ok(wrx986);
  assert.equal(wrx986!.official_filter_token_or_name, "EDR2RXD1");
  assert.deepEqual(wrx986!.proposed_future_compat_changes.add_rows, [
    "whirlpool-wrx986sihz,edr2rxd1",
  ]);
  assert.deepEqual(
    wrx986!.proposed_future_compat_changes.remove_rows.sort(),
    ["whirlpool-wrx986sihz,edr4rxd1", "whirlpool-wrx986sihz,ukf8001"].sort(),
  );

  const wrf540 = plan.rows.find((r) => r.fridge_slug === "whirlpool-wrf540cwhz");
  assert.ok(wrf540);
  assert.deepEqual(wrf540!.proposed_future_compat_changes.add_rows, [
    "whirlpool-wrf540cwhz,edr4rxd1",
  ]);

  const wrs325 = plan.rows.find((r) => r.fridge_slug === "whirlpool-wrs325sdhz");
  assert.ok(wrs325);
  assert.equal(wrs325!.official_filter_token_or_name, "EDR1RXD1");
  assert.deepEqual(wrs325!.proposed_future_compat_changes.add_rows, [
    "whirlpool-wrs325sdhz,edr1rxd1",
  ]);
  assert.deepEqual(wrs325!.proposed_future_compat_changes.remove_rows, [
    "whirlpool-wrs325sdhz,edr3rxd1",
  ]);
});

test("Frigidaire: reconcile to EPTWFU01 or ULTRAWF per official token", () => {
  const plan = buildRefrigeratorModelFirstMappingReviewReconciliationPlanV1({
    rootDir: REPO_ROOT,
    manifestRelPath: MANIFEST_REL,
  });
  const fghb = plan.rows.find((r) => r.fridge_slug === "frigidaire-fghb2868pf");
  assert.ok(fghb);
  assert.equal(fghb!.official_filter_token_or_name, "EPTWFU01");
  assert.deepEqual(fghb!.proposed_future_compat_changes.add_rows, [
    "frigidaire-fghb2868pf,eptwfu01",
  ]);
  assert.ok(fghb!.proposed_future_compat_changes.remove_rows.length >= 6);

  const ffhb = plan.rows.find((r) => r.fridge_slug === "frigidaire-ffhb2740ps");
  assert.ok(ffhb);
  assert.equal(ffhb!.official_filter_token_or_name, "ULTRAWF");
  assert.deepEqual(ffhb!.proposed_future_compat_changes.keep_rows, [
    "frigidaire-ffhb2740ps,ultrawf",
  ]);
  assert.deepEqual(ffhb!.proposed_future_compat_changes.remove_rows, [
    "frigidaire-ffhb2740ps,frig-242086201",
  ]);

  const fgsc = plan.rows.find((r) => r.fridge_slug === "frigidaire-fgsc2335tf");
  assert.ok(fgsc);
  assert.deepEqual(fgsc!.proposed_future_compat_changes.keep_rows, [
    "frigidaire-fgsc2335tf,eptwfu01",
  ]);
  assert.deepEqual(fgsc!.proposed_future_compat_changes.remove_rows, [
    "frigidaire-fgsc2335tf,frig-242294502",
  ]);
});

test("inspect summary totals match per-row proposed changes across all 20 models", () => {
  const plan = buildRefrigeratorModelFirstMappingReviewReconciliationPlanV1({
    rootDir: REPO_ROOT,
    manifestRelPath: MANIFEST_REL,
  });
  const removals = plan.rows.reduce(
    (sum, row) => sum + row.proposed_future_compat_changes.remove_rows.length,
    0,
  );
  const keeps = plan.rows.reduce(
    (sum, row) => sum + row.proposed_future_compat_changes.keep_rows.length,
    0,
  );
  const adds = plan.rows.reduce(
    (sum, row) => sum + row.proposed_future_compat_changes.add_rows.length,
    0,
  );
  assert.equal(plan.inspect_summary.total_proposed_removals, removals);
  assert.equal(plan.inspect_summary.total_proposed_keeps, keeps);
  assert.equal(plan.inspect_summary.total_proposed_adds, adds);
  assert.equal(removals, 53);
  assert.equal(keeps, 16);
  assert.equal(adds, 10);
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
