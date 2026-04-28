import assert from "node:assert/strict";
import test from "node:test";

import { buildBuckpartsCommandSurfaceReport } from "./report-buckparts-command-surface";

test("report is read_only true and data_mutation false", () => {
  const report = buildBuckpartsCommandSurfaceReport();
  assert.equal(report.read_only, true);
  assert.equal(report.data_mutation, false);
});

test("all required top-level keys exist", () => {
  const report = buildBuckpartsCommandSurfaceReport();
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
    "affiliate_tracker",
    "known_unknowns",
    "recommended_next_step",
  ];

  for (const key of expectedKeys) {
    assert.ok(key in report);
  }
});

test("detects present contract modules", () => {
  const report = buildBuckpartsCommandSurfaceReport();
  assert.equal(report.contract_modules_present.page_state, true);
  assert.equal(report.contract_modules_present.publishability_state, true);
  assert.equal(report.contract_modules_present.provenance_record, true);
  assert.equal(report.contract_modules_present.wrong_purchase_risk, true);
  assert.equal(report.contract_modules_present.replacement_chain, true);
  assert.equal(report.contract_modules_present.no_buy_reason, true);
  assert.equal(report.contract_modules_present.retailer_link_state, true);
});

test("detects docs", () => {
  const report = buildBuckpartsCommandSurfaceReport();
  assert.equal(report.docs_present.operating_map, true);
  assert.equal(report.docs_present.script_classification_manifest, true);
});

test("does not require GSC files to pass", () => {
  const report = buildBuckpartsCommandSurfaceReport({
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

test("learning_outcomes runtime status is UNKNOWN_NOT_QUERIED", () => {
  const report = buildBuckpartsCommandSurfaceReport();
  assert.equal(
    report.learning_outcomes_contract.table_runtime_status,
    "UNKNOWN_NOT_QUERIED",
  );
});

test("recommended_next_step matches Step 13", () => {
  const report = buildBuckpartsCommandSurfaceReport();
  assert.equal(
    report.recommended_next_step,
    "Resolve affiliate reapply-required blockers before expanding monetized link volume.",
  );
});

test("command surface includes affiliate_tracker", () => {
  const report = buildBuckpartsCommandSurfaceReport();
  assert.ok("affiliate_tracker" in report);
  assert.equal(typeof report.affiliate_tracker.tracker_present, "boolean");
});

test("valid tracker with REAPPLY_REQUIRED -> ACTION_REQUIRED", () => {
  const report = buildBuckpartsCommandSurfaceReport();
  assert.equal(report.affiliate_tracker.health.status, "ACTION_REQUIRED");
});

test("tracker missing -> UNKNOWN without crashing", () => {
  const report = buildBuckpartsCommandSurfaceReport({
    fileExists: (absolutePath) => !absolutePath.endsWith("data/affiliate/affiliate-application-tracker.json"),
  });
  assert.equal(report.affiliate_tracker.tracker_present, false);
  assert.equal(report.affiliate_tracker.health.status, "UNKNOWN");
  assert.equal(report.affiliate_tracker.record_count, null);
});

test("approved count is counted", () => {
  const report = buildBuckpartsCommandSurfaceReport({
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

test("recommended next step changes when action required", () => {
  const report = buildBuckpartsCommandSurfaceReport();
  assert.equal(
    report.recommended_next_step,
    "Resolve affiliate reapply-required blockers before expanding monetized link volume.",
  );
});

test("report remains read_only true and data_mutation false", () => {
  const report = buildBuckpartsCommandSurfaceReport();
  assert.equal(report.read_only, true);
  assert.equal(report.data_mutation, false);
});
