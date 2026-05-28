import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import { buildRefrigeratorModelFirstTruthAuditV1 } from "./refrigerator-model-first-truth-audit-v1";

const REPO_ROOT = process.cwd();

test("report is read-only with data_mutation false", () => {
  const report = buildRefrigeratorModelFirstTruthAuditV1({ rootDir: REPO_ROOT });
  assert.equal(report.read_only, true);
  assert.equal(report.data_mutation, false);
  assert.equal(report.runtime_status, "OK");
});

test("counts are derived from repository files", () => {
  const report = buildRefrigeratorModelFirstTruthAuditV1({ rootDir: REPO_ROOT });
  assert.ok(report.total_refrigerator_models > 0);
  assert.ok(report.models_with_linked_filter > 0);
  assert.ok(report.unique_linked_filter_slugs > 0);
  assert.ok(report.exact_repo_paths_read.includes("data/fridge_models.csv"));
  assert.ok(report.exact_repo_paths_read.includes("data/compatibility_mappings.csv"));
  assert.ok(report.exact_repo_paths_read.includes("data/filters.csv"));
  assert.ok(report.exact_repo_paths_read.includes("data/retailer_links.csv"));
});

test("root safe_buyer_path_verdict and diagnostic_crosscheck_summary are populated", () => {
  const report = buildRefrigeratorModelFirstTruthAuditV1({ rootDir: REPO_ROOT });
  assert.notEqual(report.safe_buyer_path_verdict, null);
  assert.notEqual(report.diagnostic_crosscheck_summary, null);
  assert.equal(report.safe_buyer_path_verdict, "PROVEN_TRUE");
  const x = report.diagnostic_crosscheck_summary;
  assert.equal(x.filters_with_any_retailer_link_count, report.unique_linked_filter_slugs);
  assert.equal(x.filters_with_primary_link_count, report.unique_linked_filter_slugs);
  assert.equal(x.filters_with_safe_direct_buyable_primary_count, 0);
  assert.equal(x.filters_with_direct_buyable_anywhere_count, 0);
  assert.equal(x.filters_with_filter_real_buy_any_count, 0);
  assert.equal(x.filters_with_buy_gate_pass_any_count, 0);
  assert.equal(x.audit_vs_publishability_mismatch_count, 0);
  assert.equal(x.primary_weak_reason_counts.SEARCH_PLACEHOLDER_PRIMARY, report.unique_linked_filter_slugs);
  assert.deepEqual(x.sample_safe_or_expected_safe_filters, []);
  assert.ok(x.classification_explanation.includes("0/57"));
});

test("root diagnostic fields mirror buyer_path_diagnostics nested slice", () => {
  const report = buildRefrigeratorModelFirstTruthAuditV1({ rootDir: REPO_ROOT });
  const d = report.buyer_path_diagnostics;
  assert.equal(report.safe_buyer_path_verdict, d.safe_cta_crosscheck_summary.safe_buyer_path_verdict);
  assert.equal(
    report.diagnostic_crosscheck_summary.filters_with_any_retailer_link_count,
    d.filters_with_any_retailer_link_count,
  );
  assert.equal(
    report.diagnostic_crosscheck_summary.audit_vs_publishability_mismatch_count,
    d.safe_cta_crosscheck_summary.audit_vs_publishability_mismatch_count,
  );
  assert.ok(d.buyer_path_truth_source_paths.includes("src/lib/retailers/launch-buy-links.ts"));
});

test("recommended action exists and remains read-only only", () => {
  const report = buildRefrigeratorModelFirstTruthAuditV1({ rootDir: REPO_ROOT });
  assert.ok(report.recommended_next_action_read_only.length > 0);
  assert.ok(report.recommended_next_action_read_only.toLowerCase().includes("read-only"));
  assert.equal(report.recommended_next_action_read_only.toLowerCase().includes("supabase apply"), false);
  assert.equal(report.recommended_next_action_read_only.toLowerCase().includes("csv apply"), false);
});

test("no unavailable claim unless proven by repo", () => {
  const report = buildRefrigeratorModelFirstTruthAuditV1({ rootDir: REPO_ROOT });
  for (const f of report.proven_facts) {
    assert.equal(f.toLowerCase().includes("unavailable"), false);
  }
});

test("read-only audit does not mutate product CSV Supabase dispatch batch-review or public UI files", () => {
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

  const report = buildRefrigeratorModelFirstTruthAuditV1({ rootDir: REPO_ROOT });
  assert.ok(report.top_20_model_first_audit_candidates.length <= 20);

  for (const [p, content] of before.entries()) {
    assert.equal(readFileSync(path.join(REPO_ROOT, p), "utf8"), content);
  }
});

