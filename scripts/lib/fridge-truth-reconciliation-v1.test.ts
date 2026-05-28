import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import { buildFridgeTruthReconciliationV1 } from "./fridge-truth-reconciliation-v1";
import { buildRefrigeratorModelFirstTruthAuditV1 } from "./refrigerator-model-first-truth-audit-v1";

const REPO_ROOT = process.cwd();

test("report is read_only with data_mutation false", () => {
  const report = buildFridgeTruthReconciliationV1({ rootDir: REPO_ROOT });
  assert.equal(report.contract, "fridge_truth_reconciliation_v1");
  assert.equal(report.read_only, true);
  assert.equal(report.data_mutation, false);
});

test("csv truth matches refrigerator_model_first_truth_audit_v1", () => {
  const audit = buildRefrigeratorModelFirstTruthAuditV1({ rootDir: REPO_ROOT });
  const report = buildFridgeTruthReconciliationV1({ rootDir: REPO_ROOT });
  assert.equal(report.csv_truth_summary.total_refrigerator_models, audit.total_refrigerator_models);
  assert.equal(report.csv_truth_summary.unique_linked_filter_slugs, audit.unique_linked_filter_slugs);
  assert.equal(
    report.csv_truth_summary.linked_filters_with_safe_direct_buyable_primary,
    audit.linked_filters_with_safe_direct_buyable_primary,
  );
  assert.equal(report.csv_truth_summary.safe_buyer_path_verdict, audit.safe_buyer_path_verdict);
  assert.equal(
    report.csv_truth_summary.filters_with_direct_buyable_anywhere_count,
    audit.diagnostic_crosscheck_summary.filters_with_direct_buyable_anywhere_count,
  );
});

test("finds fridge evidence win artifacts when present", () => {
  const report = buildFridgeTruthReconciliationV1({ rootDir: REPO_ROOT });
  assert.ok(report.evidence_truth_summary.total_json_files_scanned > 0);
  assert.ok(report.evidence_truth_summary.win_artifact_count > 0);
  assert.ok(report.prior_win_artifact_summary.linked_filter_slugs_with_evidence_win.length > 0);
  assert.ok(
    report.prior_win_artifact_summary.linked_filter_slugs_with_evidence_win.includes("ukf8001"),
  );
});

test("does not claim live or supabase truth without direct proof", () => {
  const report = buildFridgeTruthReconciliationV1({ rootDir: REPO_ROOT });
  assert.equal(report.live_or_supabase_truth_status, "NOT_CHECKED");
  assert.ok(report.unknown_facts.some((f) => f.includes("Supabase")));
  for (const f of report.proven_facts) {
    assert.equal(f.toLowerCase().includes("supabase holds"), false);
  }
});

test("csv vs evidence mismatch and root cause classifications are present", () => {
  const report = buildFridgeTruthReconciliationV1({ rootDir: REPO_ROOT });
  assert.equal(report.csv_truth_summary.filters_with_direct_buyable_anywhere_count, 0);
  assert.ok(report.csv_vs_evidence_mismatch_summary.mismatch_count > 0);
  assert.equal(report.csv_vs_evidence_mismatch_summary.classification, "PROVEN");
  assert.ok(
    report.slugs_with_evidence_win_but_csv_placeholder.length > 0,
  );
  assert.deepEqual(report.slugs_with_csv_safe_but_no_evidence, []);
  assert.ok(
    ["A_EVIDENCE_NOT_APPLIED_TO_CSV", "B_EVIDENCE_APPLIED_SUPABASE_ONLY", "E_UNKNOWN"].includes(
      report.root_cause_hypothesis,
    ),
  );
  assert.ok(report.proven_facts.some((f) => f.startsWith("PROVEN:")));
  assert.ok(report.inferred_facts.some((f) => f.startsWith("INFERRED:")));
  assert.ok(report.unknown_facts.some((f) => f.startsWith("UNKNOWN:") || f.includes("UNKNOWN")));
});

test("read-only reconciliation does not mutate product CSV Supabase dispatch batch-review or public UI files", () => {
  const guardedPaths = [
    "data/filters.csv",
    "data/retailer_links.csv",
    "data/fridge_models.csv",
    "data/compatibility_mappings.csv",
    "supabase/schema.sql",
    "data/air-purifier/batch-production/run-registry/ap-batch-v3-proposed-run-v1.json",
    "data/air-purifier/batch-production/batch-review/ap-agent-results-review-v1.json",
    "src/app/page.tsx",
  ];
  const before = new Map(
    guardedPaths.map((p) => [p, readFileSync(path.join(REPO_ROOT, p), "utf8")]),
  );

  buildFridgeTruthReconciliationV1({ rootDir: REPO_ROOT });

  for (const [p, content] of before.entries()) {
    assert.equal(readFileSync(path.join(REPO_ROOT, p), "utf8"), content);
  }
});
