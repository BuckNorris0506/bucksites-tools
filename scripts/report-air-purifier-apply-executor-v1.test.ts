import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
  AP_RETAILER_LINKS_CSV_REL_V1,
  type AirPurifierApplyPlannerReportV1,
  type ApPlannedChangeV1,
} from "./lib/air-purifier-apply-planner-v1";
import {
  AIR_PURIFIER_APPLY_PLANNER_BATCH_V2_REPORT_NAME_V1,
} from "./lib/air-purifier-apply-planner-batch-v2-v1";
import {
  AP_APPLY_PLAN_BATCH_V2_DEFAULT_PATH_V1,
  AP_APPLY_RUN_DEFAULT_JSON_V1,
  AP_APPLY_RUN_DEFAULT_MD_V1,
  loadAirPurifierApplyPlanV1,
  resolveDefaultApplyRunPathsV1,
  rowMatchesSnapshotV1,
  runAirPurifierApplyExecutorV1,
  serializeRetailerLinksCsvV1,
  writeApplyRunArtifactsV1,
} from "./lib/air-purifier-apply-executor-v1";

const REPO_ROOT = process.cwd();
const CSV_HEADER =
  "filter_slug,retailer_name,affiliate_url,is_primary,retailer_key,retailer_slug,destination_url,browser_truth_classification,browser_truth_notes,browser_truth_checked_at";

function searchRow(slug: string): Record<string, string> {
  const url = `https://levoit.com/search?q=${slug.toUpperCase()}`;
  return {
    filter_slug: slug,
    retailer_name: "OEM / manufacturer catalog (keyword lookup)",
    affiliate_url: url,
    is_primary: "true",
    retailer_key: "oem-catalog",
    retailer_slug: "oem-catalog",
    destination_url: url,
    browser_truth_classification: "",
    browser_truth_notes: "",
    browser_truth_checked_at: "",
  };
}

function pdpAfterRow(slug: string, productPath: string): Record<string, string> {
  const url = `https://levoit.com/products/${productPath}`;
  return {
    filter_slug: slug,
    retailer_name: "OEM / manufacturer catalog (keyword lookup)",
    affiliate_url: url,
    is_primary: "true",
    retailer_key: "oem-catalog",
    retailer_slug: "oem-catalog",
    destination_url: url,
    browser_truth_classification: "direct_buyable",
    browser_truth_notes: "fixture evidence",
    browser_truth_checked_at: "2026-05-23T00:00:00.000Z",
  };
}

function plannedChange(slug: string, productPath: string): ApPlannedChangeV1 {
  return {
    filter_slug: slug,
    retailer_key: "oem-catalog",
    packet_id: "test-packet",
    final_url: `https://levoit.com/products/${productPath}`,
    before_row: searchRow(slug),
    after_row: pdpAfterRow(slug, productPath),
    changed_fields: [
      "destination_url",
      "affiliate_url",
      "browser_truth_classification",
      "browser_truth_notes",
      "browser_truth_checked_at",
    ],
    browser_truth_notes: "fixture evidence",
    browser_truth_checked_at: "2026-05-23T00:00:00.000Z",
    evidence_summary: "fixture",
  };
}

function writeFixtureTree(args: {
  dir: string;
  csvRows: Record<string, string>[];
  plan: AirPurifierApplyPlannerReportV1;
}): { csvPath: string; planPath: string } {
  const dataDir = path.join(args.dir, "data", "air-purifier");
  mkdirSync(dataDir, { recursive: true });
  const csvPath = path.join(dataDir, "retailer_links.csv");
  writeFileSync(
    csvPath,
    serializeRetailerLinksCsvV1(CSV_HEADER.split(","), args.csvRows),
    "utf8",
  );

  const planDir = path.join(args.dir, "data/air-purifier/batch-production/apply-plans");
  mkdirSync(planDir, { recursive: true });
  const planPath = path.join(planDir, "plan.json");
  writeFileSync(planPath, `${JSON.stringify(args.plan, null, 2)}\n`, "utf8");
  return { csvPath, planPath };
}

function minimalPlan(changes: ApPlannedChangeV1[]): AirPurifierApplyPlannerReportV1 {
  return {
    report_name: "air_purifier_apply_planner_v1",
    read_only: true,
    data_mutation: false,
    generated_at: "2026-05-23T00:00:00.000Z",
    source_review_path: "test/review.json",
    plan_status: "READY_FOR_OWNER_APPROVAL",
    planned_change_count: changes.length,
    planned_changes: changes,
    refused_changes: [],
    rollback_rows: changes.map((c) => ({ ...c.before_row })),
    projected_coverage_delta: {
      direct_buyable_plus: changes.length,
      official_reference_plus: 0,
      blocked_minus: changes.length,
    },
    owner_approval_required: true,
    apply_executor_available: false,
    recommended_next_action: "test",
    validation_checklist: [],
    notes: [],
  };
}

function minimalBatchV2Plan(changes: ApPlannedChangeV1[]): AirPurifierApplyPlannerReportV1 & {
  report_name: typeof AIR_PURIFIER_APPLY_PLANNER_BATCH_V2_REPORT_NAME_V1;
} {
  return {
    ...minimalPlan(changes),
    report_name: AIR_PURIFIER_APPLY_PLANNER_BATCH_V2_REPORT_NAME_V1,
  };
}

test("rejects unknown plan report_name", () => {
  const slug = "fixture-slug-unknown-report";
  const plan = minimalPlan([plannedChange(slug, "unknown-report")]) as AirPurifierApplyPlannerReportV1 & {
    report_name: string;
  };
  plan.report_name = "not_a_real_planner";

  const tmp = mkdtempSync(path.join(tmpdir(), "ap-exec-unknown-report-"));
  const { planPath } = writeFixtureTree({
    dir: tmp,
    csvRows: [searchRow(slug)],
    plan,
  });

  const report = runAirPurifierApplyExecutorV1({
    rootDir: tmp,
    mode: "dry_run",
    planPath: planPath,
  });

  assert.equal(report.apply_status, "BLOCKED");
  assert.ok(report.blocked_reasons.some((r) => r.includes("unexpected plan report_name")));
  rmSync(tmp, { recursive: true, force: true });
});

test("batch-v2 plan report_name is accepted in dry-run when plan is otherwise valid", () => {
  const report = runAirPurifierApplyExecutorV1({
    rootDir: REPO_ROOT,
    mode: "dry_run",
    planPath: AP_APPLY_PLAN_BATCH_V2_DEFAULT_PATH_V1,
  });
  assert.equal(report.apply_status, "DRY_RUN_READY");
  assert.equal(report.planned_change_count, 4);
  assert.equal(report.preflight.before_row_match_count, 4);
  assert.equal(report.data_mutation, false);
  assert.ok(!report.blocked_reasons.some((r) => r.includes("unexpected plan report_name")));
});

test("batch-v2 plan still refuses non-AP target file", () => {
  const slug = "fixture-slug-batch-v2-fridge-file";
  const plan = {
    ...minimalBatchV2Plan([plannedChange(slug, "batch-v2-fridge")]),
    target_csv_file: "data/retailer_links.csv",
  };

  const tmp = mkdtempSync(path.join(tmpdir(), "ap-exec-batch-v2-fridge-file-"));
  const { planPath } = writeFixtureTree({
    dir: tmp,
    csvRows: [searchRow(slug)],
    plan,
  });

  const report = runAirPurifierApplyExecutorV1({
    rootDir: tmp,
    mode: "dry_run",
    planPath: planPath,
  });

  assert.equal(report.apply_status, "BLOCKED");
  assert.ok(report.blocked_reasons.some((r) => r.includes("target_csv_file")));
  rmSync(tmp, { recursive: true, force: true });
});

test("batch-v2 plan still refuses stale before_row mismatch", () => {
  const tmp = mkdtempSync(path.join(tmpdir(), "ap-exec-batch-v2-mismatch-"));
  const slug = "fixture-slug-batch-v2-mismatch";
  const { planPath } = writeFixtureTree({
    dir: tmp,
    csvRows: [
      {
        ...searchRow(slug),
        affiliate_url: "https://levoit.com/search?q=CHANGED",
        destination_url: "https://levoit.com/search?q=CHANGED",
      },
    ],
    plan: minimalBatchV2Plan([plannedChange(slug, "batch-v2-mismatch")]),
  });

  const report = runAirPurifierApplyExecutorV1({
    rootDir: tmp,
    mode: "dry_run",
    planPath: planPath,
  });

  assert.equal(report.apply_status, "BLOCKED");
  assert.ok(
    report.blocked_reasons.some((r) => r.includes("does not match plan before_row")),
  );
  rmSync(tmp, { recursive: true, force: true });
});

test("resolveDefaultApplyRunPaths routes batch-v2 plan to batch-v2 apply-run artifacts", () => {
  const paths = resolveDefaultApplyRunPathsV1(AP_APPLY_PLAN_BATCH_V2_DEFAULT_PATH_V1);
  assert.ok(paths.jsonPath.includes("apply-runs-batch-v2"));
  assert.ok(paths.markdownPath.includes("apply-runs-batch-v2"));
  assert.equal(
    resolveDefaultApplyRunPathsV1("data/air-purifier/batch-production/apply-plans/ap-apply-plan-v1.json")
      .jsonPath,
    AP_APPLY_RUN_DEFAULT_JSON_V1,
  );
});

test("batch-v2 dry-run does not mutate live AP CSV", () => {
  const before = readFileSync(path.join(REPO_ROOT, AP_RETAILER_LINKS_CSV_REL_V1), "utf8");
  runAirPurifierApplyExecutorV1({
    rootDir: REPO_ROOT,
    mode: "dry_run",
    planPath: AP_APPLY_PLAN_BATCH_V2_DEFAULT_PATH_V1,
  });
  const after = readFileSync(path.join(REPO_ROOT, AP_RETAILER_LINKS_CSV_REL_V1), "utf8");
  assert.equal(before, after);
});

test("dry-run does not mutate CSV", () => {
  const tmp = mkdtempSync(path.join(tmpdir(), "ap-exec-dry-"));
  const slug = "fixture-slug-dry";
  const { csvPath, planPath } = writeFixtureTree({
    dir: tmp,
    csvRows: [searchRow(slug)],
    plan: minimalPlan([plannedChange(slug, "fixture-product")]),
  });
  const before = readFileSync(csvPath, "utf8");

  const report = runAirPurifierApplyExecutorV1({
    rootDir: tmp,
    mode: "dry_run",
    planPath: planPath,
  });

  assert.equal(report.apply_status, "DRY_RUN_READY");
  assert.equal(report.data_mutation, false);
  assert.equal(readFileSync(csvPath, "utf8"), before);
  rmSync(tmp, { recursive: true, force: true });
});

test("--apply mutates only planned rows in fixture", () => {
  const tmp = mkdtempSync(path.join(tmpdir(), "ap-exec-apply-"));
  const target = "fixture-slug-apply";
  const other = "fixture-slug-other";
  const { csvPath, planPath } = writeFixtureTree({
    dir: tmp,
    csvRows: [searchRow(target), searchRow(other)],
    plan: minimalPlan([plannedChange(target, "apply-product")]),
  });

  const report = runAirPurifierApplyExecutorV1({
    rootDir: tmp,
    mode: "apply",
    planPath: planPath,
  });

  assert.equal(report.apply_status, "APPLIED");
  assert.equal(report.applied_change_count, 1);
  assert.deepEqual(report.changed_slugs, [target]);

  const text = readFileSync(csvPath, "utf8");
  assert.ok(text.includes("/products/apply-product"));
  assert.ok(text.includes("search?q=FIXTURE-SLUG-OTHER"));
  assert.ok(!text.includes("search?q=FIXTURE-SLUG-APPLY"));
  rmSync(tmp, { recursive: true, force: true });
});

test("refuses if current CSV no longer matches before_row", () => {
  const tmp = mkdtempSync(path.join(tmpdir(), "ap-exec-mismatch-"));
  const slug = "fixture-slug-mismatch";
  const { csvPath, planPath } = writeFixtureTree({
    dir: tmp,
    csvRows: [
      {
        ...searchRow(slug),
        affiliate_url: "https://levoit.com/search?q=CHANGED",
        destination_url: "https://levoit.com/search?q=CHANGED",
      },
    ],
    plan: minimalPlan([plannedChange(slug, "mismatch-product")]),
  });

  const report = runAirPurifierApplyExecutorV1({
    rootDir: tmp,
    mode: "apply",
    planPath: planPath,
  });

  assert.equal(report.apply_status, "BLOCKED");
  assert.ok(report.blocked_reasons.some((r) => r.includes("does not match plan before_row")));
  assert.equal(readFileSync(csvPath, "utf8").includes("CHANGED"), true);
  rmSync(tmp, { recursive: true, force: true });
});

test("refuses non-AP target file via after_row search URL validation", () => {
  const change = plannedChange("fixture-slug-bad-url", "bad");
  change.after_row = {
    ...change.after_row,
    destination_url: "https://levoit.com/search?q=bad",
    affiliate_url: "https://levoit.com/search?q=bad",
    browser_truth_classification: "direct_buyable",
  };

  const tmp = mkdtempSync(path.join(tmpdir(), "ap-exec-bad-url-"));
  const { planPath } = writeFixtureTree({
    dir: tmp,
    csvRows: [searchRow("fixture-slug-bad-url")],
    plan: minimalPlan([change]),
  });

  const report = runAirPurifierApplyExecutorV1({
    rootDir: tmp,
    mode: "dry_run",
    planPath: planPath,
  });

  assert.equal(report.apply_status, "BLOCKED");
  assert.ok(report.blocked_reasons.some((r) => r.includes("search/category")));
  rmSync(tmp, { recursive: true, force: true });
});

test("refuses non-AP target file on plan", () => {
  const slug = "fixture-slug-fridge-file";
  const plan = minimalPlan([plannedChange(slug, "fridge-target")]) as AirPurifierApplyPlannerReportV1 & {
    target_csv_file: string;
  };
  plan.target_csv_file = "data/retailer_links.csv";

  const tmp = mkdtempSync(path.join(tmpdir(), "ap-exec-fridge-file-"));
  const { planPath } = writeFixtureTree({
    dir: tmp,
    csvRows: [searchRow(slug)],
    plan,
  });

  const report = runAirPurifierApplyExecutorV1({
    rootDir: tmp,
    mode: "dry_run",
    planPath: planPath,
  });

  assert.equal(report.apply_status, "BLOCKED");
  assert.ok(report.blocked_reasons.some((r) => r.includes("target_csv_file")));
  rmSync(tmp, { recursive: true, force: true });
});

test("refuses duplicate target rows", () => {
  const slug = "fixture-slug-dupe";
  const change = plannedChange(slug, "dupe-product");
  const plan = minimalPlan([change, { ...change }]);
  plan.planned_change_count = 2;

  const tmp = mkdtempSync(path.join(tmpdir(), "ap-exec-dupe-"));
  const { planPath } = writeFixtureTree({
    dir: tmp,
    csvRows: [searchRow(slug)],
    plan,
  });

  const report = runAirPurifierApplyExecutorV1({
    rootDir: tmp,
    mode: "dry_run",
    planPath: planPath,
  });

  assert.equal(report.apply_status, "BLOCKED");
  assert.ok(report.blocked_reasons.some((r) => r.includes("duplicate planned targets")));
  rmSync(tmp, { recursive: true, force: true });
});

test("preserves CSV columns/order", () => {
  const tmp = mkdtempSync(path.join(tmpdir(), "ap-exec-shape-"));
  const slug = "fixture-slug-shape";
  const { csvPath, planPath } = writeFixtureTree({
    dir: tmp,
    csvRows: [searchRow(slug)],
    plan: minimalPlan([plannedChange(slug, "shape-product")]),
  });

  runAirPurifierApplyExecutorV1({ rootDir: tmp, mode: "apply", planPath: planPath });
  const lines = readFileSync(csvPath, "utf8").trim().split("\n");
  assert.equal(lines[0], CSV_HEADER);
  assert.equal(lines.length, 2);
  rmSync(tmp, { recursive: true, force: true });
});

test("rollback_rows match plan rollback_rows", () => {
  const plan = loadAirPurifierApplyPlanV1(
    REPO_ROOT,
    "data/air-purifier/batch-production/apply-plans/ap-apply-plan-v1.json",
  );
  const report = runAirPurifierApplyExecutorV1({ rootDir: REPO_ROOT, mode: "dry_run" });
  assert.equal(report.rollback_rows.length, plan.rollback_rows.length);
  for (let i = 0; i < plan.rollback_rows.length; i++) {
    assert.ok(rowMatchesSnapshotV1(report.rollback_rows[i]!, plan.rollback_rows[i]!));
  }
});

test("writes apply-run report artifacts", () => {
  const tmp = mkdtempSync(path.join(tmpdir(), "ap-exec-artifacts-"));
  const slug = "fixture-slug-report";
  const { planPath } = writeFixtureTree({
    dir: tmp,
    csvRows: [searchRow(slug)],
    plan: minimalPlan([plannedChange(slug, "report-product")]),
  });

  const outDir = path.join(tmp, "data/air-purifier/batch-production/apply-runs");
  mkdirSync(outDir, { recursive: true });
  const jsonOut = path.join(outDir, "run.json");
  const mdOut = path.join(outDir, "run.md");

  const report = runAirPurifierApplyExecutorV1({
    rootDir: tmp,
    mode: "dry_run",
    planPath: planPath,
  });

  writeApplyRunArtifactsV1({
    report,
    outPath: jsonOut,
    markdownOutPath: mdOut,
    rootDir: tmp,
  });

  assert.ok(readFileSync(jsonOut, "utf8").includes("air_purifier_apply_executor_v1"));
  assert.ok(readFileSync(mdOut, "utf8").includes("Apply Run v1"));
  rmSync(tmp, { recursive: true, force: true });
});

const LIVE_APPLIED_SLUGS = [
  "levoit-rf-lv-h133",
  "levoit-rf-lv-h128",
  "levoit-vital100-rf",
] as const;

test("live dry-run matches repo apply state (DRY_RUN_READY pre-apply or BLOCKED post-apply)", () => {
  const report = runAirPurifierApplyExecutorV1({ rootDir: REPO_ROOT, mode: "dry_run" });
  assert.equal(report.planned_change_count, 3);

  if (report.preflight.before_row_match_count === 3) {
    assert.equal(report.apply_status, "DRY_RUN_READY");
    assert.equal(report.applied_change_count, 0);
    assert.equal(report.data_mutation, false);
    return;
  }

  assert.equal(report.apply_status, "BLOCKED");
  assert.equal(report.preflight.before_row_match_count, 0);
  assert.equal(report.applied_change_count, 0);
  assert.equal(report.data_mutation, false);
  for (const slug of LIVE_APPLIED_SLUGS) {
    assert.ok(
      report.blocked_reasons.some(
        (r) => r.startsWith(`${slug}:`) && r.includes("does not match plan before_row"),
      ),
      `expected before_row mismatch blocked reason for ${slug}`,
    );
  }
});

test("does not mutate CSV in dry-run against live repo", () => {
  const before = readFileSync(path.join(REPO_ROOT, AP_RETAILER_LINKS_CSV_REL_V1), "utf8");
  runAirPurifierApplyExecutorV1({ rootDir: REPO_ROOT, mode: "dry_run" });
  const after = readFileSync(path.join(REPO_ROOT, AP_RETAILER_LINKS_CSV_REL_V1), "utf8");
  assert.equal(before, after);
});
