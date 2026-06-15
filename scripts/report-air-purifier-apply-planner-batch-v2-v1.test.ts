import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import { buyLinkGateFailureKind } from "@/lib/retailers/launch-buy-links";

import { buildAirPurifierAgentResultsAggregatorV1Report } from "./lib/air-purifier-agent-results-aggregator-v1";
import {
  AP_APPLY_PLAN_BATCH_V2_RESULTS_DIR_V1,
  AP_FRIDGE_RETAILER_LINKS_CSV_REL_V1,
  buildAirPurifierApplyPlannerBatchV2V1Report,
  proveV1PlannerBlockedOnBatchV2EvidenceV1,
} from "./lib/air-purifier-apply-planner-batch-v2-v1";
import {
  AP_RETAILER_LINKS_CSV_REL_V1,
  buildAirPurifierApplyPlannerV1Report,
  loadApRetailerLinksCsvV1,
} from "./lib/air-purifier-apply-planner-v1";

const REPO_ROOT = process.cwd();

test("PROVEN: v1 planner cannot plan batch-v2 auto_apply rows without recommended_csv_mutation", () => {
  const proof = proveV1PlannerBlockedOnBatchV2EvidenceV1({ rootDir: REPO_ROOT });
  assert.equal(proof.auto_apply_count, 15);
  assert.equal(proof.v1_planned_count, 0);
  assert.equal(proof.v1_blocked, true);
  assert.equal(proof.missing_mutation_refusals, 15);
});

test("batch-v2 bridge plans exactly 6 Medify direct-buy auto_apply_eligible slugs before apply, or blocks after apply when plan is spent", () => {
  const report = buildAirPurifierApplyPlannerBatchV2V1Report({ rootDir: REPO_ROOT });

  if (report.plan_status === "READY_FOR_OWNER_APPROVAL") {
    assert.equal(report.planned_change_count, 6);
    assert.deepEqual(report.planned_changes.map((change) => change.filter_slug), [
      "medify-ma18-rf",
      "medify-ma22-rf",
      "medify-ma25-rf",
      "medify-ma40-rf",
      "medify-ma50-rf",
      "medify-ma112-rf",
    ]);
    for (const slug of [
      "medify-ma18-rf",
      "medify-ma22-rf",
      "medify-ma25-rf",
      "medify-ma40-rf",
      "medify-ma50-rf",
      "medify-ma112-rf",
    ]) {
      assert.ok(report.synthesized_mutation_slugs.includes(slug), slug);
    }
    assert.equal(report.refused_changes.length, 21);
    return;
  }

  assert.equal(report.plan_status, "BLOCKED");
  assert.equal(report.planned_change_count, 0);
  assert.equal(report.planned_changes.length, 0);
  assert.ok(
    report.refused_changes.length >= 4,
    "spent post-apply plan should refuse rows instead of planning stale before_rows",
  );
});

test("excluded review groups are not in planned_changes", () => {
  const report = buildAirPurifierApplyPlannerBatchV2V1Report({ rootDir: REPO_ROOT });
  const plannedSlugs = new Set(report.planned_changes.map((c) => c.filter_slug));

  const aggregator = buildAirPurifierAgentResultsAggregatorV1Report({
    rootDir: REPO_ROOT,
    resultsDir: AP_APPLY_PLAN_BATCH_V2_RESULTS_DIR_V1,
  });

  for (const row of aggregator.review_groups.reference_eligible) {
    assert.ok(!plannedSlugs.has(row.slug), `reference ${row.slug} must be excluded`);
  }
  for (const row of aggregator.review_groups.owner_review_required) {
    assert.ok(!plannedSlugs.has(row.slug), `owner_review ${row.slug} must be excluded`);
  }
  for (const row of aggregator.review_groups.no_safe_path) {
    assert.ok(!plannedSlugs.has(row.slug), `no_safe_path ${row.slug} must be excluded`);
  }
  for (const row of aggregator.review_groups.rejected) {
    assert.ok(!plannedSlugs.has(row.slug), `rejected ${row.slug} must be excluded`);
  }
  for (const row of aggregator.review_groups.catalog_task_required) {
    assert.ok(!plannedSlugs.has(row.slug), `catalog_gap ${row.slug} must be excluded`);
  }

  assert.ok(report.refused_changes.some((r) => r.slug === "holmes-hapf30"));
  assert.ok(plannedSlugs.has("medify-ma25-rf"));
  assert.ok(!report.refused_changes.some((r) => r.slug === "medify-ma25-rf"));
  assert.ok(report.refused_changes.some((r) => r.slug === "levoit-rf-rar029"));
  assert.ok(report.refused_changes.some((r) => r.slug === "blueair-particle-411"));
});

test("before_row matches current AP retailer_links.csv primary oem-catalog row", () => {
  const csvRows = loadApRetailerLinksCsvV1(REPO_ROOT);
  const report = buildAirPurifierApplyPlannerBatchV2V1Report({ rootDir: REPO_ROOT });

  for (const change of report.planned_changes) {
    const live = csvRows.find(
      (r) =>
        r.filter_slug === change.filter_slug &&
        (r.retailer_key ?? "").toLowerCase() === "oem-catalog",
    );
    assert.ok(live, change.filter_slug);
    assert.equal(change.before_row.affiliate_url, live!.affiliate_url);
    assert.equal(change.before_row.destination_url, live!.destination_url);
    assert.equal(change.before_row.is_primary, live!.is_primary);
    assert.equal(change.before_row.retailer_key, live!.retailer_key);
    assert.ok(
      change.before_row.affiliate_url.includes("search?q="),
      `${change.filter_slug} before_row must be search placeholder`,
    );
  }
});

test("after_row passes direct_buyable gate for each planned change", () => {
  const report = buildAirPurifierApplyPlannerBatchV2V1Report({ rootDir: REPO_ROOT });
  for (const change of report.planned_changes) {
    assert.equal(change.after_row.browser_truth_classification, "direct_buyable");
    assert.ok(change.after_row.affiliate_url.includes("/product"));
    const gate = buyLinkGateFailureKind({
      retailer_key: change.after_row.retailer_key,
      affiliate_url: change.after_row.affiliate_url ?? "",
      browser_truth_classification: change.after_row.browser_truth_classification,
      browser_truth_buyable_subtype: null,
    });
    assert.equal(gate, null, `${change.filter_slug} gate=${gate}`);
  }
});

test("rollback_rows match before_row snapshots when plan is ready; spent post-apply plans have no rollback rows", () => {
  const report = buildAirPurifierApplyPlannerBatchV2V1Report({ rootDir: REPO_ROOT });

  if (report.plan_status === "READY_FOR_OWNER_APPROVAL") {
    assert.equal(report.rollback_rows.length, 6);
    assert.deepEqual(
      report.rollback_rows,
      report.planned_changes.map((change) => change.before_row),
    );
    return;
  }

  assert.equal(report.plan_status, "BLOCKED");
  assert.equal(report.rollback_rows.length, 0);
  assert.equal(report.planned_changes.length, 0);
});

test("does not mutate AP CSV or fridge retailer_links.csv", () => {
  const apBefore = readFileSync(path.join(REPO_ROOT, AP_RETAILER_LINKS_CSV_REL_V1), "utf8");
  const fridgeBefore = existsSync(path.join(REPO_ROOT, AP_FRIDGE_RETAILER_LINKS_CSV_REL_V1))
    ? readFileSync(path.join(REPO_ROOT, AP_FRIDGE_RETAILER_LINKS_CSV_REL_V1), "utf8")
    : null;

  buildAirPurifierApplyPlannerBatchV2V1Report({ rootDir: REPO_ROOT });

  const apAfter = readFileSync(path.join(REPO_ROOT, AP_RETAILER_LINKS_CSV_REL_V1), "utf8");
  assert.equal(apBefore, apAfter);

  if (fridgeBefore !== null) {
    const fridgeAfter = readFileSync(path.join(REPO_ROOT, AP_FRIDGE_RETAILER_LINKS_CSV_REL_V1), "utf8");
    assert.equal(fridgeBefore, fridgeAfter);
  }
});

test("v1 planner on synthesized aggregator review still requires explicit review JSON with mutations", () => {
  const aggregator = buildAirPurifierAgentResultsAggregatorV1Report({
    rootDir: REPO_ROOT,
    resultsDir: AP_APPLY_PLAN_BATCH_V2_RESULTS_DIR_V1,
  });
  const v1FromAgg = buildAirPurifierApplyPlannerV1Report({
    rootDir: REPO_ROOT,
    reviewPath: undefined,
  });
  assert.equal(v1FromAgg.planned_change_count, 0, "v1 default review is spent in current repo truth");

  const batchV2Bridge = buildAirPurifierApplyPlannerBatchV2V1Report({ rootDir: REPO_ROOT });
  assert.notEqual(batchV2Bridge.planned_change_count, v1FromAgg.planned_change_count);
});
