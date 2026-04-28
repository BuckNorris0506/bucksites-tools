import assert from "node:assert/strict";
import test from "node:test";

import { buildBuckpartsCommandSurfaceReport } from "./report-buckparts-command-surface";

test("report is read_only true and data_mutation false", async () => {
  const report = await buildBuckpartsCommandSurfaceReport();
  assert.equal(report.read_only, true);
  assert.equal(report.data_mutation, false);
});

test("all required top-level keys exist", async () => {
  const report = await buildBuckpartsCommandSurfaceReport();
  const expectedKeys = [
    "report_name",
    "generated_at",
    "read_only",
    "data_mutation",
    "completed_cleanup_steps",
    "total_cleanup_steps",
    "source_files_checked",
    "contract_modules_present",
    "docs_present",
    "gsc_exports_present",
    "learning_outcomes_contract",
    "learning_outcomes_metrics",
    "affiliate_tracker",
    "known_unknowns",
    "recommended_next_step",
  ];

  for (const key of expectedKeys) {
    assert.ok(key in report);
  }
});

test("detects present contract modules", async () => {
  const report = await buildBuckpartsCommandSurfaceReport();
  assert.equal(report.contract_modules_present.page_state, true);
  assert.equal(report.contract_modules_present.publishability_state, true);
  assert.equal(report.contract_modules_present.provenance_record, true);
  assert.equal(report.contract_modules_present.wrong_purchase_risk, true);
  assert.equal(report.contract_modules_present.replacement_chain, true);
  assert.equal(report.contract_modules_present.no_buy_reason, true);
  assert.equal(report.contract_modules_present.retailer_link_state, true);
});

test("detects docs", async () => {
  const report = await buildBuckpartsCommandSurfaceReport();
  assert.equal(report.docs_present.operating_map, true);
  assert.equal(report.docs_present.script_classification_manifest, true);
});

test("does not require GSC files to pass", async () => {
  const report = await buildBuckpartsCommandSurfaceReport({
    fileExists: (absolutePath) =>
      !absolutePath.endsWith("data/gsc/sitemap.xml") &&
      !absolutePath.endsWith("buckparts.com-Coverage-2026-04-28.zip") &&
      !absolutePath.endsWith("buckparts.com-Performance-on-Search-2026-04-28.zip"),
  });

  assert.equal(report.gsc_exports_present.sitemap_xml, false);
  assert.equal(report.gsc_exports_present.coverage_zip, false);
  assert.equal(report.gsc_exports_present.performance_zip, false);
  assert.equal(report.read_only, true);
  assert.equal(report.data_mutation, false);
});

test("learning_outcomes runtime status is UNKNOWN_NOT_QUERIED", async () => {
  const report = await buildBuckpartsCommandSurfaceReport();
  assert.equal(
    report.learning_outcomes_contract.table_runtime_status,
    "UNKNOWN_NOT_QUERIED",
  );
});

test("recommended_next_step matches Step 13", async () => {
  const report = await buildBuckpartsCommandSurfaceReport();
  assert.equal(
    report.recommended_next_step,
    "Resolve affiliate reapply-required blockers before expanding monetized link volume.",
  );
});

test("command surface includes affiliate_tracker", async () => {
  const report = await buildBuckpartsCommandSurfaceReport();
  assert.ok("affiliate_tracker" in report);
  assert.equal(typeof report.affiliate_tracker.tracker_present, "boolean");
});

test("valid tracker with REAPPLY_REQUIRED -> ACTION_REQUIRED", async () => {
  const report = await buildBuckpartsCommandSurfaceReport();
  assert.equal(report.affiliate_tracker.health.status, "ACTION_REQUIRED");
});

test("tracker missing -> UNKNOWN without crashing", async () => {
  const report = await buildBuckpartsCommandSurfaceReport({
    fileExists: (absolutePath) => !absolutePath.endsWith("data/affiliate/affiliate-application-tracker.json"),
  });
  assert.equal(report.affiliate_tracker.tracker_present, false);
  assert.equal(report.affiliate_tracker.health.status, "UNKNOWN");
  assert.equal(report.affiliate_tracker.record_count, null);
});

test("approved count is counted", async () => {
  const report = await buildBuckpartsCommandSurfaceReport({
    readTextFile: () =>
      JSON.stringify([
        {
          id: "approved-program",
          network: "Impact",
          retailer: "Example Retailer",
          programUrl: null,
          status: "APPROVED",
          submittedAt: null,
          lastStatusAt: null,
          decisionAt: null,
          rejectionReason: null,
          nextAction: "Monitor conversion quality",
          nextActionDueAt: null,
          notes: null,
        },
      ]),
  });
  assert.equal(report.affiliate_tracker.approved_count, 1);
  assert.equal(report.affiliate_tracker.health.status, "OK");
});

test("recommended next step changes when action required", async () => {
  const report = await buildBuckpartsCommandSurfaceReport();
  assert.equal(
    report.recommended_next_step,
    "Resolve affiliate reapply-required blockers before expanding monetized link volume.",
  );
});

test("report remains read_only true and data_mutation false", async () => {
  const report = await buildBuckpartsCommandSurfaceReport();
  assert.equal(report.read_only, true);
  assert.equal(report.data_mutation, false);
});

test("command surface includes learning_outcomes_metrics", async () => {
  const report = await buildBuckpartsCommandSurfaceReport();
  assert.ok("learning_outcomes_metrics" in report);
  assert.equal(report.learning_outcomes_metrics.source, "public.learning_outcomes");
});

test("DB unavailable returns UNKNOWN_DB_UNAVAILABLE and UNKNOWN counts", async () => {
  const report = await buildBuckpartsCommandSurfaceReport({
    fetchLearningOutcomesRows: async () => {
      throw new Error("db down");
    },
  });
  assert.equal(report.learning_outcomes_metrics.runtime_status, "UNKNOWN_DB_UNAVAILABLE");
  assert.equal(report.learning_outcomes_metrics.outcome_counts.pass, "UNKNOWN");
  assert.equal(report.learning_outcomes_metrics.cta_status_counts.live, "UNKNOWN");
  assert.equal(report.learning_outcomes_metrics.confidence_counts.exact, "UNKNOWN");
  assert.equal(report.learning_outcomes_metrics.recency.max_days_since_checked, "UNKNOWN");
});

test("mock rows produce correct outcome counts", async () => {
  const report = await buildBuckpartsCommandSurfaceReport({
    fetchLearningOutcomesRows: async () => [
      { outcome: "pass", cta_status: null, confidence: null, date_checked: null },
      { outcome: "pass", cta_status: null, confidence: null, date_checked: null },
      { outcome: "fail", cta_status: null, confidence: null, date_checked: null },
      { outcome: "blocked", cta_status: null, confidence: null, date_checked: null },
      { outcome: "unknown", cta_status: null, confidence: null, date_checked: null },
    ],
  });
  assert.equal(report.learning_outcomes_metrics.outcome_counts.pass, 2);
  assert.equal(report.learning_outcomes_metrics.outcome_counts.fail, 1);
  assert.equal(report.learning_outcomes_metrics.outcome_counts.blocked, 1);
  assert.equal(report.learning_outcomes_metrics.outcome_counts.unknown, 1);
});

test("mock rows produce correct cta status counts", async () => {
  const report = await buildBuckpartsCommandSurfaceReport({
    fetchLearningOutcomesRows: async () => [
      { outcome: null, cta_status: "live", confidence: null, date_checked: null },
      { outcome: null, cta_status: "live", confidence: null, date_checked: null },
      { outcome: null, cta_status: "not_live", confidence: null, date_checked: null },
      { outcome: null, cta_status: "blocked", confidence: null, date_checked: null },
    ],
  });
  assert.equal(report.learning_outcomes_metrics.cta_status_counts.live, 2);
  assert.equal(report.learning_outcomes_metrics.cta_status_counts.not_live, 1);
  assert.equal(report.learning_outcomes_metrics.cta_status_counts.blocked, 1);
});

test("mock rows produce correct confidence counts", async () => {
  const report = await buildBuckpartsCommandSurfaceReport({
    fetchLearningOutcomesRows: async () => [
      { outcome: null, cta_status: null, confidence: "exact", date_checked: null },
      { outcome: null, cta_status: null, confidence: "likely", date_checked: null },
      { outcome: null, cta_status: null, confidence: "likely", date_checked: null },
      { outcome: null, cta_status: null, confidence: "uncertain", date_checked: null },
    ],
  });
  assert.equal(report.learning_outcomes_metrics.confidence_counts.exact, 1);
  assert.equal(report.learning_outcomes_metrics.confidence_counts.likely, 2);
  assert.equal(report.learning_outcomes_metrics.confidence_counts.uncertain, 1);
});

test("mock rows produce recency values", async () => {
  const report = await buildBuckpartsCommandSurfaceReport({
    now: () => new Date("2026-04-28T00:00:00.000Z"),
    fetchLearningOutcomesRows: async () => [
      {
        outcome: null,
        cta_status: null,
        confidence: null,
        date_checked: "2026-04-27T00:00:00.000Z",
      },
      {
        outcome: null,
        cta_status: null,
        confidence: null,
        date_checked: "2026-04-25T00:00:00.000Z",
      },
      {
        outcome: null,
        cta_status: null,
        confidence: null,
        date_checked: "2026-04-21T00:00:00.000Z",
      },
    ],
  });
  assert.equal(report.learning_outcomes_metrics.recency.max_days_since_checked, 7);
  assert.equal(report.learning_outcomes_metrics.recency.median_days_since_checked, 3);
});
