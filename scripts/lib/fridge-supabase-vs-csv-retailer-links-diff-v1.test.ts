import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  buildFridgeSupabaseVsCsvRetailerLinksDiffV1,
  classifyDiffRowStatus,
} from "./fridge-supabase-vs-csv-retailer-links-diff-v1";
import {
  FRIDGE_TRUTH_RECONCILIATION_CONTRACT_V1,
  type FridgeTruthReconciliationV1,
} from "./fridge-truth-reconciliation-v1";

const REPO_ROOT = process.cwd();

function minimalReconciliation(slugs: string[]): FridgeTruthReconciliationV1 {
  const winArtifacts = slugs.map((slug) => ({
    evidence_file: `data/evidence/amazon-${slug}-live-outcome.test.json`,
    filter_slug: slug,
    token: slug.toUpperCase(),
    scope: "refrigerator_water",
    win_signal: "live_outcome" as const,
    claims_supabase_commit: true,
    classification: "PROVEN" as const,
  }));
  return {
    contract: FRIDGE_TRUTH_RECONCILIATION_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    generated_at: "2026-01-01T00:00:00.000Z",
    exact_repo_paths_read: [],
    csv_truth_summary: {
      source_contract: "refrigerator_model_first_truth_audit_v1",
      total_refrigerator_models: 500,
      unique_linked_filter_slugs: 57,
      linked_filters_with_safe_direct_buyable_primary: 0,
      safe_buyer_path_verdict: "PROVEN_TRUE",
      filters_with_direct_buyable_anywhere_count: 0,
      primary_weak_reason_counts: { SEARCH_PLACEHOLDER_PRIMARY: 57 },
      exact_repo_paths_read: [],
    },
    evidence_truth_summary: {
      evidence_directory: "data/evidence",
      total_json_files_scanned: 1,
      fridge_related_artifact_count: slugs.length,
      win_artifact_count: slugs.length,
      win_artifacts: winArtifacts,
      additional_evidence_paths_scanned: [],
    },
    prior_win_artifact_summary: {
      live_outcome_json_count: slugs.length,
      linked_filter_slugs_with_evidence_win: slugs,
      prior_report_script_paths: [],
      prior_doc_references: [],
    },
    csv_vs_evidence_mismatch_summary: {
      linked_slugs_with_evidence_win_count: slugs.length,
      linked_slugs_with_csv_direct_buyable_count: 0,
      mismatch_count: slugs.length,
      classification: "PROVEN",
      explanation: "test",
    },
    suspected_unapplied_evidence_rows: slugs.map((slug) => ({
      evidence_file: `data/evidence/amazon-${slug}-live-outcome.test.json`,
      filter_slug: slug,
      evidence_win_signal: "live_outcome",
      csv_has_direct_buyable_row: false,
      csv_primary_weak_reason: "SEARCH_PLACEHOLDER_PRIMARY",
      likely_hypothesis: "B_EVIDENCE_APPLIED_SUPABASE_ONLY",
      hypothesis_classification: "INFERRED",
    })),
    slugs_with_evidence_win_but_csv_placeholder: slugs,
    slugs_with_csv_safe_but_no_evidence: [],
    live_or_supabase_truth_status: "NOT_CHECKED",
    root_cause_hypothesis: "B_EVIDENCE_APPLIED_SUPABASE_ONLY",
    root_cause_summary: "test",
    recommended_next_action: "test",
    proven_facts: [],
    inferred_facts: [],
    unknown_facts: [],
  };
}

test("report is read_only with data_mutation false", () => {
  const report = buildFridgeSupabaseVsCsvRetailerLinksDiffV1({
    rootDir: REPO_ROOT,
    deps: {
      buildReconciliation: () => minimalReconciliation(["ukf8001"]),
      loadSupabase: async () => ({
        status: "UNKNOWN_DB_UNAVAILABLE",
        reason: "test missing env",
      }),
    },
  });
  return report.then((r) => {
    assert.equal(r.contract, "fridge_supabase_vs_csv_retailer_links_diff_v1");
    assert.equal(r.read_only, true);
    assert.equal(r.data_mutation, false);
  });
});

test("tolerates unavailable Supabase as UNKNOWN_DB_UNAVAILABLE", async () => {
  const report = await buildFridgeSupabaseVsCsvRetailerLinksDiffV1({
    rootDir: REPO_ROOT,
    deps: {
      buildReconciliation: () => minimalReconciliation(["ukf8001"]),
      loadSupabase: async () => ({
        status: "UNKNOWN_DB_UNAVAILABLE",
        reason: "Missing SUPABASE_SERVICE_ROLE_KEY",
      }),
    },
  });
  assert.equal(report.supabase_truth_status, "UNKNOWN_DB_UNAVAILABLE");
  assert.equal(report.rows[0]!.status, "UNKNOWN");
  assert.equal(report.rows[0]!.supabase_row_count, null);
  assert.ok(report.unknown_facts.some((f) => f.includes("UNKNOWN")));
});

test("classifies mocked Supabase direct_buyable vs CSV placeholder as SUPABASE_HAS_WIN_CSV_MISSING", async () => {
  const report = await buildFridgeSupabaseVsCsvRetailerLinksDiffV1({
    rootDir: REPO_ROOT,
    deps: {
      buildReconciliation: () => minimalReconciliation(["ukf8001"]),
      loadSupabase: async () => ({
        status: "CHECKED",
        slug_to_filter_id: new Map([["ukf8001", "filter-id-ukf8001"]]),
        links_by_slug: new Map([
          [
            "ukf8001",
            [
              {
                filter_id: "filter-id-ukf8001",
                retailer_key: "amazon",
                affiliate_url: "https://www.amazon.com/dp/B07C8C2VBH",
                is_primary: false,
                browser_truth_classification: "direct_buyable",
                browser_truth_buyable_subtype: "COMPATIBLE_REPLACEMENT_DIRECT_BUYABLE",
              },
            ],
          ],
        ]),
      }),
    },
  });
  assert.equal(report.supabase_truth_status, "CHECKED");
  assert.equal(report.rows.length, 1);
  assert.equal(report.rows[0]!.filter_slug, "ukf8001");
  assert.equal(report.rows[0]!.csv_has_direct_buyable, false);
  assert.equal(report.rows[0]!.status, "SUPABASE_HAS_WIN_CSV_MISSING");
  assert.equal(report.rows[0]!.supabase_direct_buyable_count, 1);
  assert.ok(report.rows[0]!.csv_primary_url);
  assert.equal(report.rows[0]!.csv_has_direct_buyable, false);
  assert.equal(report.supabase_has_win_csv_missing_count, 1);
});

test("classifyDiffRowStatus unit cases", () => {
  assert.equal(
    classifyDiffRowStatus({
      csv_has_direct_buyable: false,
      csv_primary_is_placeholder: true,
      supabase_checked: true,
      supabase_has_direct_buyable: true,
      evidence_win_artifacts: ["data/evidence/x.json"],
    }),
    "SUPABASE_HAS_WIN_CSV_MISSING",
  );
  assert.equal(
    classifyDiffRowStatus({
      csv_has_direct_buyable: false,
      csv_primary_is_placeholder: true,
      supabase_checked: false,
      supabase_has_direct_buyable: false,
      evidence_win_artifacts: [],
    }),
    "UNKNOWN",
  );
});

test("recommended_next_action requires explicit founder approval before apply", async () => {
  const report = await buildFridgeSupabaseVsCsvRetailerLinksDiffV1({
    rootDir: REPO_ROOT,
    deps: {
      buildReconciliation: () => minimalReconciliation(["ukf8001"]),
      loadSupabase: async () => ({
        status: "CHECKED",
        slug_to_filter_id: new Map([["ukf8001", "id"]]),
        links_by_slug: new Map([
          [
            "ukf8001",
            [
              {
                filter_id: "id",
                retailer_key: "amazon",
                affiliate_url: "https://www.amazon.com/dp/B07",
                is_primary: false,
                browser_truth_classification: "direct_buyable",
              },
            ],
          ],
        ]),
      }),
    },
  });
  const action = report.recommended_next_action.toLowerCase();
  assert.ok(action.includes("founder") || action.includes("approval"));
  assert.equal(action.includes("apply now"), false);
  assert.equal(action.includes("authorized apply"), false);
});

test("integration uses reconciliation slugs and committed CSV", async () => {
  const report = await buildFridgeSupabaseVsCsvRetailerLinksDiffV1({ rootDir: REPO_ROOT });
  assert.ok(report.checked_slug_count >= 18);
  assert.ok(report.checked_filter_slugs.includes("ukf8001"));
  for (const row of report.rows) {
    assert.equal(row.csv_has_direct_buyable, false);
    assert.ok(row.evidence_win_artifacts.length > 0);
  }
});

test("read-only diff does not mutate product CSV Supabase dispatch batch-review or public UI files", async () => {
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

  await buildFridgeSupabaseVsCsvRetailerLinksDiffV1({ rootDir: REPO_ROOT });

  for (const [p, content] of before.entries()) {
    assert.equal(readFileSync(path.join(REPO_ROOT, p), "utf8"), content);
  }
});
