import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
  AP_RETAILER_LINKS_CSV_REL_V1,
  buildAirPurifierApplyPlannerV1Report,
  validateAutoApplyRowForPlannerV1,
} from "./lib/air-purifier-apply-planner-v1";
import type { ApAggregatedReviewRowV1 } from "./lib/air-purifier-agent-results-aggregator-v1";

const REPO_ROOT = process.cwd();

function autoApplyRow(overrides: Partial<ApAggregatedReviewRowV1> = {}): ApAggregatedReviewRowV1 {
  return {
    slug: "levoit-rf-lv-h133",
    packet_id: "ap-levoit-oem-discovery-v1",
    decision: "PASS_DIRECT_BUYABLE",
    review_group: "auto_apply_eligible",
    review_reasons: ["passes_auto_apply_validation"],
    final_url: "https://levoit.com/products/lv-h133-air-purifier-tower-replacement-filter",
    browser_truth_classification: "direct_buyable",
    exact_tokens_seen: ["LV-H133"],
    wrong_family_tokens_seen: [],
    buy_action_seen: true,
    recommended_csv_mutation: {
      file: "data/air-purifier/retailer_links.csv",
      filter_slug: "levoit-rf-lv-h133",
      retailer_key: "oem-catalog",
      fields: {
        destination_url: "https://levoit.com/products/lv-h133-air-purifier-tower-replacement-filter",
        affiliate_url: "https://levoit.com/products/lv-h133-air-purifier-tower-replacement-filter",
      },
      note: "test mutation",
    },
    owner_review_required: false,
    source_file: "test.json",
    evidence_notes: "test evidence notes",
    ...overrides,
  };
}

function writeReviewFixture(dir: string, review: unknown): string {
  const file = path.join(dir, "review.json");
  writeFileSync(file, `${JSON.stringify(review, null, 2)}\n`, "utf8");
  return file;
}

test("plans only auto_apply_eligible rows from review fixture", () => {
  const tmp = mkdtempSync(path.join(tmpdir(), "ap-apply-plan-"));
  const reviewPath = writeReviewFixture(tmp, {
    report_name: "air_purifier_agent_results_aggregator_v1",
    generated_at: "2026-05-23T00:00:00.000Z",
    review_groups: {
      auto_apply_eligible: [autoApplyRow()],
      owner_review_required: [
        autoApplyRow({
          slug: "medify-ma25-rf",
          review_group: "owner_review_required",
          owner_review_required: true,
        }),
      ],
      reference_eligible: [],
      rejected: [],
      catalog_task_required: [],
      no_safe_path: [],
    },
  });

  const report = buildAirPurifierApplyPlannerV1Report({
    rootDir: REPO_ROOT,
    reviewPath,
  });

  assert.equal(report.planned_change_count, 1);
  assert.equal(report.planned_changes[0]!.filter_slug, "levoit-rf-lv-h133");
  assert.ok(
    report.refused_changes.some(
      (r) => r.slug === "medify-ma25-rf" && r.reasons.some((x) => x.includes("not_auto_apply_eligible")),
    ),
  );
  rmSync(tmp, { recursive: true, force: true });
});

test("refuses owner_review rows — not in planned_changes", () => {
  const tmp = mkdtempSync(path.join(tmpdir(), "ap-apply-plan-"));
  const reviewPath = writeReviewFixture(tmp, {
    generated_at: "2026-05-23T00:00:00.000Z",
    review_groups: {
      auto_apply_eligible: [],
      owner_review_required: [
        autoApplyRow({
          slug: "winix-hepa-115115",
          review_group: "owner_review_required",
          wrong_family_tokens_seen: ["116130"],
        }),
      ],
      reference_eligible: [],
      rejected: [],
      catalog_task_required: [],
      no_safe_path: [],
    },
  });

  const report = buildAirPurifierApplyPlannerV1Report({
    rootDir: REPO_ROOT,
    reviewPath,
  });
  assert.equal(report.planned_change_count, 0);
  assert.equal(report.plan_status, "EMPTY");
  rmSync(tmp, { recursive: true, force: true });
});

test("refuses missing CSV row", () => {
  const tmp = mkdtempSync(path.join(tmpdir(), "ap-apply-plan-"));
  const reviewPath = writeReviewFixture(tmp, {
    generated_at: "2026-05-23T00:00:00.000Z",
    review_groups: {
      auto_apply_eligible: [
        autoApplyRow({
          slug: "nonexistent-filter-slug-xyz",
          recommended_csv_mutation: {
            file: "data/air-purifier/retailer_links.csv",
            filter_slug: "nonexistent-filter-slug-xyz",
            retailer_key: "oem-catalog",
            fields: {
              affiliate_url: "https://levoit.com/products/test",
              destination_url: "https://levoit.com/products/test",
            },
            note: "x",
          },
        }),
      ],
      owner_review_required: [],
      reference_eligible: [],
      rejected: [],
      catalog_task_required: [],
      no_safe_path: [],
    },
  });

  const report = buildAirPurifierApplyPlannerV1Report({
    rootDir: REPO_ROOT,
    reviewPath,
  });
  assert.equal(report.planned_change_count, 0);
  assert.ok(
    report.refused_changes.some((r) =>
      r.reasons.some((x) => x.includes("csv_row_missing")),
    ),
  );
  rmSync(tmp, { recursive: true, force: true });
});

test("refuses wrong target file on mutation", () => {
  const reasons = validateAutoApplyRowForPlannerV1(
    autoApplyRow({
      recommended_csv_mutation: {
        file: "data/retailer_links.csv",
        filter_slug: "levoit-rf-lv-h133",
        retailer_key: "oem-catalog",
        fields: {
          affiliate_url: "https://levoit.com/products/x",
        },
        note: "fridge file",
      },
    }),
  );
  assert.ok(reasons.includes("mutation_target_file_not_ap_retailer_links"));
});

test("preserves CSV shape and sets browser truth on after row", () => {
  const report = buildAirPurifierApplyPlannerV1Report({
    rootDir: REPO_ROOT,
    reviewPath: path.join(
      REPO_ROOT,
      "data/air-purifier/batch-production/batch-review/ap-agent-results-review-v1.json",
    ),
  });
  const planned = report.planned_changes.find((c) => c.filter_slug === "levoit-rf-lv-h133");
  assert.ok(planned);
  assert.equal(planned!.before_row.retailer_name, planned!.after_row.retailer_name);
  assert.equal(planned!.before_row.is_primary, planned!.after_row.is_primary);
  assert.equal(planned!.after_row.browser_truth_classification, "direct_buyable");
  assert.ok(planned!.after_row.affiliate_url.includes("/products/"));
});

test("includes rollback rows matching planned changes", () => {
  const report = buildAirPurifierApplyPlannerV1Report({
    rootDir: REPO_ROOT,
    reviewPath: path.join(
      REPO_ROOT,
      "data/air-purifier/batch-production/batch-review/ap-agent-results-review-v1.json",
    ),
  });
  assert.equal(report.rollback_rows.length, report.planned_change_count);
  assert.equal(report.rollback_rows.length, 3);
  for (const rb of report.rollback_rows) {
    assert.ok(rb.affiliate_url.includes("search?q=") || rb.destination_url.includes("search?q="));
  }
});

test("does not mutate CSVs", () => {
  const before = readFileSync(path.join(REPO_ROOT, AP_RETAILER_LINKS_CSV_REL_V1), "utf8");
  buildAirPurifierApplyPlannerV1Report({
    rootDir: REPO_ROOT,
    reviewPath: path.join(
      REPO_ROOT,
      "data/air-purifier/batch-production/batch-review/ap-agent-results-review-v1.json",
    ),
  });
  const after = readFileSync(path.join(REPO_ROOT, AP_RETAILER_LINKS_CSV_REL_V1), "utf8");
  assert.equal(before, after);
});

test("live review produces READY_FOR_OWNER_APPROVAL with 3 planned changes", () => {
  const report = buildAirPurifierApplyPlannerV1Report({ rootDir: REPO_ROOT });
  assert.equal(report.plan_status, "READY_FOR_OWNER_APPROVAL");
  assert.equal(report.planned_change_count, 3);
  assert.equal(report.apply_executor_available, false);
  for (const slug of ["levoit-rf-lv-h133", "levoit-rf-lv-h128", "levoit-vital100-rf"]) {
    assert.ok(report.planned_changes.some((c) => c.filter_slug === slug), slug);
  }
});
