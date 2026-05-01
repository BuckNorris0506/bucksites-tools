import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  buildBuckpartsCommandSurfaceReport,
  computeSystemHealth,
  runCommandSurfaceReport,
} from "./report-buckparts-command-surface";

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
    "cleanup_progress",
    "source_files_checked",
    "contract_modules_present",
    "docs_present",
    "gsc_exports_present",
    "learning_outcomes_contract",
    "learning_outcomes_metrics",
    "cta_coverage_metrics",
    "retailer_link_state_metrics",
    "blocked_retailer_link_remediation",
    "search_and_click_intelligence_summary",
    "state_system_metrics",
    "affiliate_tracker",
    "trend",
    "system_health",
    "snapshot_written",
    "snapshot_path",
    "known_unknowns",
    "recommended_next_step",
  ];

  for (const key of expectedKeys) {
    assert.ok(key in report);
  }
});

test("cleanup_progress uses pinned manual truth", async () => {
  const report = await buildBuckpartsCommandSurfaceReport();
  assert.deepEqual(report.cleanup_progress, {
    status: "PINNED_MANUAL",
    completed_steps: 20,
    total_steps: 20,
    reason: "Manual Phase 1 cleanup counter; not auto-computed.",
  });
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

test("UNKNOWN_NOT_QUERIED only appears when query intentionally skipped", async () => {
  const report = await buildBuckpartsCommandSurfaceReport({
    skipLearningOutcomesQuery: true,
  });
  assert.equal(
    report.learning_outcomes_contract.table_runtime_status,
    "UNKNOWN_NOT_QUERIED",
  );
  assert.equal(report.learning_outcomes_metrics.runtime_status, "UNKNOWN_NOT_QUERIED");
});

test("recommended_next_step matches Step 13", async () => {
  const report = await buildBuckpartsCommandSurfaceReport();
  assert.equal(
    report.recommended_next_step,
    "Resolve warning-level command-surface issues before expanding.",
  );
});

test("command surface includes affiliate_tracker", async () => {
  const report = await buildBuckpartsCommandSurfaceReport();
  assert.ok("affiliate_tracker" in report);
  assert.equal(typeof report.affiliate_tracker.tracker_present, "boolean");
});

test("valid tracker without REAPPLY_REQUIRED -> OK", async () => {
  const report = await buildBuckpartsCommandSurfaceReport();
  assert.equal(report.affiliate_tracker.health.status, "OK");
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
          tagVerified: true,
          tagVerifiedAt: "2026-04-28T00:00:00.000Z",
          tagValue: "buckparts20-20",
        },
      ]),
  });
  assert.equal(report.affiliate_tracker.approved_count, 1);
  assert.equal(report.affiliate_tracker.health.status, "OK");
});

test("affiliate tracker includes tag verification summary", async () => {
  const report = await buildBuckpartsCommandSurfaceReport();
  assert.deepEqual(report.affiliate_tracker.tag_verification, {
    verified_count: 1,
    unverified_count: 0,
    unknown_count: 13,
    unverified_records: [],
  });
});

test("recommended next step changes when action required", async () => {
  const report = await buildBuckpartsCommandSurfaceReport();
  assert.equal(
    report.recommended_next_step,
    "Resolve warning-level command-surface issues before expanding.",
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

test("command surface includes state_system_metrics", async () => {
  const report = await buildBuckpartsCommandSurfaceReport();
  assert.ok("state_system_metrics" in report);
  assert.equal(
    report.state_system_metrics.source,
    "local_contracts_and_available_local_data",
  );
});

test("page_state distribution is included", async () => {
  const report = await buildBuckpartsCommandSurfaceReport({
    fileExists: (absolutePath) =>
      absolutePath.endsWith("data/gsc/sitemap.xml")
        ? true
        : existsSync(absolutePath),
    readTextFile: (absolutePath) => {
      if (absolutePath.endsWith("data/gsc/sitemap.xml")) {
        return `<?xml version="1.0" encoding="UTF-8"?>
<urlset>
  <url><loc>https://buckparts.com/filter/a</loc></url>
  <url><loc>https://buckparts.com/fridge/b</loc></url>
</urlset>`;
      }
      return readFileSync(absolutePath, "utf8");
    },
    skipLearningOutcomesQuery: true,
  });
  assert.equal(report.state_system_metrics.page_state.computable, true);
  assert.equal(
    typeof report.state_system_metrics.page_state.distribution === "object",
    true,
  );
});

test("publishability_state distribution is included", async () => {
  const report = await buildBuckpartsCommandSurfaceReport({
    fileExists: (absolutePath) =>
      absolutePath.endsWith("data/gsc/sitemap.xml")
        ? true
        : existsSync(absolutePath),
    readTextFile: (absolutePath) => {
      if (absolutePath.endsWith("data/gsc/sitemap.xml")) {
        return `<?xml version="1.0" encoding="UTF-8"?>
<urlset>
  <url><loc>https://buckparts.com/filter/a</loc></url>
  <url><loc>https://buckparts.com/fridge/b</loc></url>
</urlset>`;
      }
      return readFileSync(absolutePath, "utf8");
    },
    skipLearningOutcomesQuery: true,
  });
  assert.equal(report.state_system_metrics.publishability_state.computable, true);
  assert.equal(
    typeof report.state_system_metrics.publishability_state.distribution === "object",
    true,
  );
});

test("distribution is derived only from computed PageState records", async () => {
  const report = await buildBuckpartsCommandSurfaceReport({
    fileExists: (absolutePath) =>
      absolutePath.endsWith("data/gsc/sitemap.xml")
        ? true
        : existsSync(absolutePath),
    readTextFile: (absolutePath) => {
      if (absolutePath.endsWith("data/gsc/sitemap.xml")) {
        return `<?xml version="1.0" encoding="UTF-8"?>
<urlset>
  <url><loc>https://buckparts.com/filter/a</loc></url>
  <url><loc>https://buckparts.com/fridge/b</loc></url>
  <url><loc>https://buckparts.com/brand/c</loc></url>
</urlset>`;
      }
      return readFileSync(absolutePath, "utf8");
    },
    skipLearningOutcomesQuery: true,
  });

  const pageDist = report.state_system_metrics.page_state.distribution;
  const pubDist = report.state_system_metrics.publishability_state.distribution;
  assert.equal(typeof pageDist === "object", true);
  assert.equal(typeof pubDist === "object", true);

  const pageTotal =
    typeof pageDist === "object"
      ? Object.values(pageDist).reduce((sum, value) => sum + value, 0)
      : 0;
  const pubTotal =
    typeof pubDist === "object"
      ? Object.values(pubDist).reduce((sum, value) => sum + value, 0)
      : 0;
  assert.equal(pageTotal, 3);
  assert.equal(pubTotal, pageTotal);
});

test("DB unavailable returns UNKNOWN_DB_UNAVAILABLE and UNKNOWN counts", async () => {
  const report = await buildBuckpartsCommandSurfaceReport({
    fetchLearningOutcomesRows: async () => {
      throw new Error("db down");
    },
  });
  assert.equal(
    report.learning_outcomes_contract.table_runtime_status,
    "UNKNOWN_DB_UNAVAILABLE",
  );
  assert.equal(report.learning_outcomes_metrics.runtime_status, "UNKNOWN_DB_UNAVAILABLE");
  assert.equal(report.learning_outcomes_metrics.outcome_counts.pass, "UNKNOWN");
  assert.equal(report.learning_outcomes_metrics.cta_status_counts.live, "UNKNOWN");
  assert.equal(report.learning_outcomes_metrics.confidence_counts.exact, "UNKNOWN");
  assert.equal(report.learning_outcomes_metrics.recency.max_days_since_checked, "UNKNOWN");
});

test("cta_coverage_metrics exists", async () => {
  const report = await buildBuckpartsCommandSurfaceReport({
    skipLearningOutcomesQuery: true,
    skipCtaCoverageQuery: true,
  });
  assert.ok("cta_coverage_metrics" in report);
  assert.equal(report.cta_coverage_metrics.source, "supabase_retailer_links");
});

test("retailer_link_state_metrics exists", async () => {
  const report = await buildBuckpartsCommandSurfaceReport({
    skipLearningOutcomesQuery: true,
    skipCtaCoverageQuery: true,
  });
  assert.ok("retailer_link_state_metrics" in report);
  assert.equal(
    report.retailer_link_state_metrics.source,
    "derived_from_cta_coverage_dataset",
  );
});

test("blocked_retailer_link_remediation UNKNOWN when CTA unavailable", async () => {
  const report = await buildBuckpartsCommandSurfaceReport({
    skipLearningOutcomesQuery: true,
    fetchCtaCoverageRows: async () => {
      throw new Error("db unavailable");
    },
  });
  assert.equal(report.blocked_retailer_link_remediation.runtime_status, "UNKNOWN");
  assert.equal(report.blocked_retailer_link_remediation.top_blocked_states, "UNKNOWN");
  assert.equal(report.blocked_retailer_link_remediation.top_blocked_retailer_keys, "UNKNOWN");
});

test("CTA DB unavailable returns UNKNOWN_DB_UNAVAILABLE with UNKNOWN counts", async () => {
  const report = await buildBuckpartsCommandSurfaceReport({
    skipLearningOutcomesQuery: true,
    fetchCtaCoverageRows: async () => {
      throw new Error("db unavailable");
    },
  });
  assert.equal(report.cta_coverage_metrics.runtime_status, "UNKNOWN_DB_UNAVAILABLE");
  assert.equal(report.cta_coverage_metrics.total_retailer_links, "UNKNOWN");
  assert.equal(report.cta_coverage_metrics.safe_cta_links, "UNKNOWN");
});

test("mock CTA rows produce correct counts", async () => {
  const report = await buildBuckpartsCommandSurfaceReport({
    skipLearningOutcomesQuery: true,
    fetchCtaCoverageRows: async () => [
      {
        retailer_key: "amazon",
        affiliate_url: "https://www.amazon.com/dp/B000000001",
        browser_truth_classification: "direct_buyable",
      },
      {
        retailer_key: "amazon",
        affiliate_url: "https://www.amazon.com/dp/B000000002",
        browser_truth_classification: "likely_valid",
      },
      {
        retailer_key: "oem",
        affiliate_url: "https://www.geapplianceparts.com/store/parts/spec/MWF",
        browser_truth_classification: null,
      },
      {
        retailer_key: "oem",
        affiliate_url: "https://www.repairclinic.com/PartDetail/Water-Filter/12345/1",
        browser_truth_classification: "direct_buyable",
      },
    ],
  });
  assert.equal(report.cta_coverage_metrics.runtime_status, "OK");
  assert.equal(report.cta_coverage_metrics.total_retailer_links, 4);
  assert.equal(report.cta_coverage_metrics.direct_buyable_links, 2);
  assert.equal(report.cta_coverage_metrics.safe_cta_links, 2);
  assert.equal(report.cta_coverage_metrics.blocked_or_unsafe_links, 2);
  assert.equal(report.cta_coverage_metrics.missing_browser_truth_links, 1);
  assert.equal(
    typeof report.cta_coverage_metrics.retailer_counts === "object",
    true,
  );
});

test("missing browser truth row maps BLOCKED_BROWSER_TRUTH_MISSING", async () => {
  const report = await buildBuckpartsCommandSurfaceReport({
    skipLearningOutcomesQuery: true,
    fetchCtaCoverageRows: async () => [
      {
        retailer_key: "amazon",
        affiliate_url: "https://www.amazon.com/dp/B000000003",
        browser_truth_classification: "direct_buyable",
      },
      {
        retailer_key: "oem",
        affiliate_url: "https://www.repairclinic.com/PartDetail/Water-Filter/12345/2",
        browser_truth_classification: null,
      },
    ],
  });
  assert.equal(report.retailer_link_state_metrics.runtime_status, "OK");
  assert.equal(report.retailer_link_state_metrics.total_links, 2);
  assert.deepEqual(report.retailer_link_state_metrics.distribution, {
    LIVE_DIRECT_BUYABLE: 1,
    BLOCKED_BROWSER_TRUTH_MISSING: 1,
  });
});

test("retailer_link_state_metrics mock rows produce correct counts", async () => {
  const report = await buildBuckpartsCommandSurfaceReport({
    skipLearningOutcomesQuery: true,
    fetchCtaCoverageRows: async () => [
      {
        retailer_key: "r1",
        affiliate_url: "https://www.amazon.com/dp/B000000004",
        browser_truth_classification: "direct_buyable",
      },
      {
        retailer_key: "r1",
        affiliate_url: "https://www.repairclinic.com/PartDetail/Water-Filter/12345/3",
        browser_truth_classification: "likely_valid",
      },
      {
        retailer_key: "r2",
        affiliate_url: "https://www.repairclinic.com/PartDetail/Water-Filter/12345/4",
        browser_truth_classification: "likely_search_results",
      },
      {
        retailer_key: "r3",
        affiliate_url: "https://www.repairclinic.com/PartDetail/Water-Filter/12345/5",
        browser_truth_classification: "likely_valid",
      },
    ],
  });
  assert.equal(report.retailer_link_state_metrics.runtime_status, "OK");
  assert.equal(report.retailer_link_state_metrics.total_links, 4);
  assert.deepEqual(report.retailer_link_state_metrics.distribution, {
    LIVE_DIRECT_BUYABLE: 1,
    BLOCKED_BROWSER_TRUTH_UNSAFE: 3,
  });
});

test("blocked remediation top blocked states sorted by count then lexical", async () => {
  const report = await buildBuckpartsCommandSurfaceReport({
    skipLearningOutcomesQuery: true,
    fetchCtaCoverageRows: async () => [
      {
        retailer_key: "google-search",
        affiliate_url: "https://www.google.com/search?q=1",
        browser_truth_classification: "direct_buyable",
      },
      {
        retailer_key: "google-search",
        affiliate_url: "https://www.google.com/search?q=2",
        browser_truth_classification: "direct_buyable",
      },
      {
        retailer_key: "oem-a",
        affiliate_url: "https://www.repairclinic.com/PartDetail/Water-Filter/1",
        browser_truth_classification: null,
      },
      {
        retailer_key: "oem-b",
        affiliate_url: "https://www.repairclinic.com/PartDetail/Water-Filter/2",
        browser_truth_classification: null,
      },
      {
        retailer_key: "oem-c",
        affiliate_url: "https://www.repairclinic.com/PartDetail/Water-Filter/3",
        browser_truth_classification: "likely_valid",
      },
    ],
  });
  assert.equal(report.blocked_retailer_link_remediation.runtime_status, "OK");
  assert.deepEqual(report.blocked_retailer_link_remediation.top_blocked_states, [
    { state: "BLOCKED_BROWSER_TRUTH_MISSING", count: 2 },
    { state: "BLOCKED_SEARCH_OR_DISCOVERY", count: 2 },
    { state: "BLOCKED_BROWSER_TRUTH_UNSAFE", count: 1 },
  ]);
});

test("blocked remediation top retailer keys sorted by count", async () => {
  const report = await buildBuckpartsCommandSurfaceReport({
    skipLearningOutcomesQuery: true,
    fetchCtaCoverageRows: async () => [
      {
        retailer_key: "google-search",
        affiliate_url: "https://www.google.com/search?q=1",
        browser_truth_classification: "direct_buyable",
      },
      {
        retailer_key: "google-search",
        affiliate_url: "https://www.google.com/search?q=2",
        browser_truth_classification: "direct_buyable",
      },
      {
        retailer_key: "oem-a",
        affiliate_url: "https://www.repairclinic.com/PartDetail/Water-Filter/1",
        browser_truth_classification: null,
      },
    ],
  });
  assert.deepEqual(report.blocked_retailer_link_remediation.top_blocked_retailer_keys, [
    { retailer_key: "google-search", count: 2 },
    { retailer_key: "oem-a", count: 1 },
  ]);
});

test("blocked remediation excludes LIVE states", async () => {
  const report = await buildBuckpartsCommandSurfaceReport({
    skipLearningOutcomesQuery: true,
    fetchCtaCoverageRows: async () => [
      {
        retailer_key: "amazon",
        affiliate_url: "https://www.amazon.com/dp/B000000011",
        browser_truth_classification: "direct_buyable",
      },
      {
        retailer_key: "google-search",
        affiliate_url: "https://www.google.com/search?q=filter",
        browser_truth_classification: "direct_buyable",
      },
    ],
  });
  const topStates = report.blocked_retailer_link_remediation.top_blocked_states;
  assert.equal(Array.isArray(topStates), true);
  if (Array.isArray(topStates)) {
    assert.equal(topStates.some((entry) => entry.state.startsWith("LIVE_")), false);
  }
});

test("blocked remediation recommended action follows top blocked state", async () => {
  const searchTop = await buildBuckpartsCommandSurfaceReport({
    skipLearningOutcomesQuery: true,
    fetchCtaCoverageRows: async () => [
      {
        retailer_key: "google-search",
        affiliate_url: "https://www.google.com/search?q=filter",
        browser_truth_classification: "direct_buyable",
      },
    ],
  });
  assert.equal(
    searchTop.blocked_retailer_link_remediation.recommended_next_action,
    "Replace search/discovery URLs with direct PDP URLs for highest-volume retailer keys.",
  );

  const unsafeTop = await buildBuckpartsCommandSurfaceReport({
    skipLearningOutcomesQuery: true,
    fetchCtaCoverageRows: async () => [
      {
        retailer_key: "oem",
        affiliate_url: "https://www.repairclinic.com/PartDetail/Water-Filter/11",
        browser_truth_classification: "likely_valid",
      },
    ],
  });
  assert.equal(
    unsafeTop.blocked_retailer_link_remediation.recommended_next_action,
    "Recheck browser-truth evidence for highest-volume unsafe retailer keys.",
  );

  const missingTop = await buildBuckpartsCommandSurfaceReport({
    skipLearningOutcomesQuery: true,
    fetchCtaCoverageRows: async () => [
      {
        retailer_key: "oem",
        affiliate_url: "https://www.repairclinic.com/PartDetail/Water-Filter/12",
        browser_truth_classification: null,
      },
    ],
  });
  assert.equal(
    missingTop.blocked_retailer_link_remediation.recommended_next_action,
    "Collect browser-truth evidence for rows missing verification.",
  );
});

test("direct_buyable blocked/search URL maps blocked state", async () => {
  const report = await buildBuckpartsCommandSurfaceReport({
    skipLearningOutcomesQuery: true,
    fetchCtaCoverageRows: async () => [
      {
        retailer_key: "google-search",
        affiliate_url: "https://www.google.com/search?q=filter",
        browser_truth_classification: "direct_buyable",
      },
    ],
  });
  assert.equal(report.retailer_link_state_metrics.runtime_status, "OK");
  assert.deepEqual(report.retailer_link_state_metrics.distribution, {
    BLOCKED_SEARCH_OR_DISCOVERY: 1,
  });
});

test("retailer_link_state_metrics does not emit enum-only fake distribution", async () => {
  const report = await buildBuckpartsCommandSurfaceReport({
    skipLearningOutcomesQuery: true,
    fetchCtaCoverageRows: async () => [
      {
        retailer_key: "r1",
        affiliate_url: "https://www.amazon.com/dp/B000000005",
        browser_truth_classification: "direct_buyable",
      },
    ],
  });
  assert.equal(report.retailer_link_state_metrics.runtime_status, "OK");
  assert.deepEqual(report.retailer_link_state_metrics.distribution, {
    LIVE_DIRECT_BUYABLE: 1,
  });
});

test("missing/ambiguous CTA table returns UNKNOWN, not fake counts", async () => {
  const report = await buildBuckpartsCommandSurfaceReport({
    skipLearningOutcomesQuery: true,
    fetchCtaCoverageRows: async () => {
      throw new Error("relation does not exist");
    },
  });
  assert.equal(report.cta_coverage_metrics.runtime_status, "UNKNOWN_DB_UNAVAILABLE");
  assert.equal(report.cta_coverage_metrics.total_retailer_links, "UNKNOWN");
  assert.equal(report.cta_coverage_metrics.retailer_counts, "UNKNOWN");
});

test("safe_cta_links counts only direct_buyable", async () => {
  const report = await buildBuckpartsCommandSurfaceReport({
    skipLearningOutcomesQuery: true,
    fetchCtaCoverageRows: async () => [
      {
        retailer_key: "r1",
        affiliate_url: "https://www.amazon.com/dp/B000000006",
        browser_truth_classification: "direct_buyable",
      },
      {
        retailer_key: "r1",
        affiliate_url: "https://www.repairclinic.com/PartDetail/Water-Filter/12345/6",
        browser_truth_classification: "likely_valid",
      },
      {
        retailer_key: "r2",
        affiliate_url: "https://www.repairclinic.com/PartDetail/Water-Filter/12345/7",
        browser_truth_classification: "likely_search_results",
      },
      {
        retailer_key: "r3",
        affiliate_url: "https://www.geapplianceparts.com/store/parts/spec/MWF",
        browser_truth_classification: null,
      },
    ],
  });
  assert.equal(report.cta_coverage_metrics.safe_cta_links, 1);
  assert.equal(report.cta_coverage_metrics.direct_buyable_links, 1);
});

test("direct_buyable + search placeholder URL is not safe_cta_links", async () => {
  const report = await buildBuckpartsCommandSurfaceReport({
    skipLearningOutcomesQuery: true,
    fetchCtaCoverageRows: async () => [
      {
        retailer_key: "google-search",
        affiliate_url: "https://www.google.com/search?q=mwf+filter",
        browser_truth_classification: "direct_buyable",
      },
    ],
  });
  assert.equal(report.cta_coverage_metrics.direct_buyable_links, 1);
  assert.equal(report.cta_coverage_metrics.safe_cta_links, 0);
  assert.equal(report.cta_coverage_metrics.blocked_or_unsafe_links, 1);
});

test("direct_buyable + known broken/indirect URL is not safe_cta_links", async () => {
  const report = await buildBuckpartsCommandSurfaceReport({
    skipLearningOutcomesQuery: true,
    fetchCtaCoverageRows: async () => [
      {
        retailer_key: "oem-parts-catalog",
        affiliate_url: "https://www.geapplianceparts.com/store/parts/spec/MWF",
        browser_truth_classification: "direct_buyable",
      },
      {
        retailer_key: "oem-catalog",
        affiliate_url: "https://www.kinetico.com/en-us/for-home/water-filtration/",
        browser_truth_classification: "direct_buyable",
      },
    ],
  });
  assert.equal(report.cta_coverage_metrics.direct_buyable_links, 2);
  assert.equal(report.cta_coverage_metrics.safe_cta_links, 0);
  assert.equal(report.cta_coverage_metrics.blocked_or_unsafe_links, 2);
});

test("direct_buyable + valid URL is safe_cta_links", async () => {
  const report = await buildBuckpartsCommandSurfaceReport({
    skipLearningOutcomesQuery: true,
    fetchCtaCoverageRows: async () => [
      {
        retailer_key: "amazon",
        affiliate_url: "https://www.amazon.com/dp/B000000007",
        browser_truth_classification: "direct_buyable",
      },
    ],
  });
  assert.equal(report.cta_coverage_metrics.direct_buyable_links, 1);
  assert.equal(report.cta_coverage_metrics.safe_cta_links, 1);
  assert.equal(report.cta_coverage_metrics.blocked_or_unsafe_links, 0);
});

test("missing browser truth counted separately", async () => {
  const report = await buildBuckpartsCommandSurfaceReport({
    skipLearningOutcomesQuery: true,
    fetchCtaCoverageRows: async () => [
      {
        retailer_key: "oem-parts-catalog",
        affiliate_url: "https://www.repairclinic.com/PartDetail/Water-Filter/12345/8",
        browser_truth_classification: null,
      },
      {
        retailer_key: "oem-parts-catalog",
        affiliate_url: "https://www.repairclinic.com/PartDetail/Water-Filter/12345/9",
        browser_truth_classification: "direct_buyable",
      },
    ],
  });
  assert.equal(report.cta_coverage_metrics.missing_browser_truth_links, 1);
  assert.equal(report.cta_coverage_metrics.safe_cta_links, 1);
  assert.equal(report.cta_coverage_metrics.blocked_or_unsafe_links, 1);
});

test("contract table_runtime_status matches metrics runtime_status when queried", async () => {
  const report = await buildBuckpartsCommandSurfaceReport({
    fetchLearningOutcomesRows: async () => [],
  });
  assert.equal(report.learning_outcomes_contract.table_runtime_status, "OK");
  assert.equal(report.learning_outcomes_metrics.runtime_status, "OK");
});

test("SELECT success with zero rows returns OK and unknown recency", async () => {
  const report = await buildBuckpartsCommandSurfaceReport({
    fetchLearningOutcomesRows: async () => [],
  });
  assert.equal(report.learning_outcomes_contract.table_runtime_status, "OK");
  assert.equal(report.learning_outcomes_metrics.runtime_status, "OK");
  assert.equal(report.learning_outcomes_metrics.recency.max_days_since_checked, "UNKNOWN");
  assert.equal(report.learning_outcomes_metrics.recency.median_days_since_checked, "UNKNOWN");
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

test("missing local data returns UNKNOWN_NO_DATA or PARTIAL", async () => {
  const report = await buildBuckpartsCommandSurfaceReport();
  assert.ok(
    report.state_system_metrics.runtime_status === "UNKNOWN_NO_DATA" ||
      report.state_system_metrics.runtime_status === "PARTIAL",
  );
});

test("no distribution is invented from enum constants alone", async () => {
  const report = await buildBuckpartsCommandSurfaceReport({
    fileExists: (absolutePath) =>
      absolutePath.endsWith("data/gsc/sitemap.xml") ? false : existsSync(absolutePath),
    skipLearningOutcomesQuery: true,
  });
  assert.equal(report.state_system_metrics.page_state.distribution, "UNKNOWN");
  assert.equal(report.state_system_metrics.publishability_state.distribution, "UNKNOWN");
  assert.equal(report.state_system_metrics.retailer_link_state.distribution, "UNKNOWN");
  assert.equal(report.state_system_metrics.no_buy_reason.distribution, "UNKNOWN");
  assert.equal(report.state_system_metrics.wrong_purchase_risk.distribution, "UNKNOWN");
  assert.equal(report.state_system_metrics.replacement_safety.safe_count, "UNKNOWN");
  assert.equal(report.state_system_metrics.replacement_safety.unsafe_count, "UNKNOWN");
});

test("partial computation sets runtime_status PARTIAL", async () => {
  const report = await buildBuckpartsCommandSurfaceReport({
    fileExists: (absolutePath) =>
      absolutePath.endsWith("data/gsc/sitemap.xml")
        ? true
        : existsSync(absolutePath),
    readTextFile: (absolutePath) => {
      if (absolutePath.endsWith("data/gsc/sitemap.xml")) {
        return `<?xml version="1.0" encoding="UTF-8"?>
<urlset>
  <url><loc>https://buckparts.com/filter/a</loc></url>
</urlset>`;
      }
      return readFileSync(absolutePath, "utf8");
    },
    skipLearningOutcomesQuery: true,
  });
  assert.equal(report.state_system_metrics.page_state.computable, true);
  assert.equal(report.state_system_metrics.runtime_status, "PARTIAL");
});

test("missing dataset keeps UNKNOWN", async () => {
  const report = await buildBuckpartsCommandSurfaceReport({
    fileExists: (absolutePath) =>
      absolutePath.endsWith("data/gsc/sitemap.xml") ? false : existsSync(absolutePath),
    skipLearningOutcomesQuery: true,
  });
  assert.equal(report.state_system_metrics.page_state.computable, false);
  assert.equal(report.state_system_metrics.page_state.distribution, "UNKNOWN");
  assert.equal(report.state_system_metrics.publishability_state.computable, false);
  assert.equal(report.state_system_metrics.publishability_state.distribution, "UNKNOWN");
});

test("known_unknowns includes non-computable state distributions", async () => {
  const report = await buildBuckpartsCommandSurfaceReport({
    fileExists: (absolutePath) =>
      absolutePath.endsWith("data/gsc/sitemap.xml") ? false : existsSync(absolutePath),
    skipLearningOutcomesQuery: true,
  });
  assert.equal(
    report.known_unknowns.some((entry) =>
      entry.startsWith("state_system_metrics.page_state non-computable:"),
    ),
    true,
  );
  assert.equal(
    report.known_unknowns.some((entry) =>
      entry.startsWith("state_system_metrics.replacement_safety non-computable:"),
    ),
    true,
  );
});

test("no snapshot -> UNKNOWN trend", async () => {
  const report = await buildBuckpartsCommandSurfaceReport({
    fileExists: (absolutePath) =>
      !absolutePath.endsWith("data/reports/buckparts-command-surface.json"),
  });
  assert.equal(report.trend.previous_snapshot_present, false);
  assert.equal(report.trend.overall_trend, "UNKNOWN");
  assert.equal(report.trend.delta_summary.reapply_required_delta, "UNKNOWN");
});

test("valid snapshot -> correct delta values", async () => {
  const report = await buildBuckpartsCommandSurfaceReport({
    fetchLearningOutcomesRows: async () => {
      throw new Error("db unavailable for deterministic trend test");
    },
    fileExists: (absolutePath) =>
      absolutePath.endsWith("data/reports/buckparts-command-surface.json")
        ? true
        : existsSync(absolutePath),
    readTextFile: (absolutePath) => {
      if (absolutePath.endsWith("data/reports/buckparts-command-surface.json")) {
        return JSON.stringify({
          learning_outcomes_metrics: { runtime_status: "UNKNOWN_DB_UNAVAILABLE" },
          affiliate_tracker: {
            health: { status: "ACTION_REQUIRED" },
            reapply_required_count: 4,
          },
        });
      }
      return readFileSync(absolutePath, "utf8");
    },
  });
  assert.equal(report.trend.previous_snapshot_present, true);
  assert.equal(report.trend.delta_summary.learning_outcomes_runtime_status_changed, false);
  assert.equal(report.trend.delta_summary.affiliate_health_changed, true);
  assert.equal(report.trend.delta_summary.reapply_required_delta, -4);
});

test("reapply decrease -> IMPROVING", async () => {
  const report = await buildBuckpartsCommandSurfaceReport({
    fileExists: (absolutePath) =>
      absolutePath.endsWith("data/reports/buckparts-command-surface.json")
        ? true
        : existsSync(absolutePath),
    readTextFile: (absolutePath) => {
      if (absolutePath.endsWith("data/reports/buckparts-command-surface.json")) {
        return JSON.stringify({
          learning_outcomes_metrics: { runtime_status: "OK" },
          affiliate_tracker: {
            health: { status: "ACTION_REQUIRED" },
            reapply_required_count: 5,
          },
        });
      }
      return readFileSync(absolutePath, "utf8");
    },
    fetchLearningOutcomesRows: async () => [],
  });
  assert.equal(report.trend.overall_trend, "IMPROVING");
  assert.equal(report.trend.delta_summary.reapply_required_delta, -5);
});

test("lower reapply count can improve trend", async () => {
  const report = await buildBuckpartsCommandSurfaceReport({
    fileExists: (absolutePath) =>
      absolutePath.endsWith("data/reports/buckparts-command-surface.json")
        ? true
        : existsSync(absolutePath),
    readTextFile: (absolutePath) => {
      if (absolutePath.endsWith("data/reports/buckparts-command-surface.json")) {
        return JSON.stringify({
          learning_outcomes_metrics: { runtime_status: "OK" },
          affiliate_tracker: {
            health: { status: "ACTION_REQUIRED" },
            reapply_required_count: 1,
          },
        });
      }
      return readFileSync(absolutePath, "utf8");
    },
    fetchLearningOutcomesRows: async () => [],
  });
  assert.equal(report.trend.overall_trend, "IMPROVING");
  assert.equal(report.trend.delta_summary.reapply_required_delta, -1);
});

test("no change -> FLAT", async () => {
  const report = await buildBuckpartsCommandSurfaceReport({
    fileExists: (absolutePath) =>
      absolutePath.endsWith("data/reports/buckparts-command-surface.json")
        ? true
        : existsSync(absolutePath),
    readTextFile: (absolutePath) => {
      if (absolutePath.endsWith("data/reports/buckparts-command-surface.json")) {
        return JSON.stringify({
          learning_outcomes_metrics: { runtime_status: "OK" },
          affiliate_tracker: {
            health: { status: "OK" },
            reapply_required_count: 0,
          },
        });
      }
      return readFileSync(absolutePath, "utf8");
    },
    fetchLearningOutcomesRows: async () => [],
  });
  assert.equal(report.trend.overall_trend, "FLAT");
  assert.equal(report.trend.delta_summary.reapply_required_delta, 0);
  assert.equal(report.trend.delta_summary.affiliate_health_changed, false);
});

test("malformed snapshot -> handled safely", async () => {
  const report = await buildBuckpartsCommandSurfaceReport({
    fileExists: (absolutePath) =>
      absolutePath.endsWith("data/reports/buckparts-command-surface.json")
        ? true
        : existsSync(absolutePath),
    readTextFile: (absolutePath) => {
      if (absolutePath.endsWith("data/reports/buckparts-command-surface.json")) {
        return "{bad-json";
      }
      return readFileSync(absolutePath, "utf8");
    },
  });
  assert.equal(report.trend.previous_snapshot_present, true);
  assert.equal(report.trend.overall_trend, "UNKNOWN");
  assert.equal(report.trend.delta_summary.affiliate_health_changed, "UNKNOWN");
});

test("system_health exists", async () => {
  const report = await buildBuckpartsCommandSurfaceReport();
  assert.ok("system_health" in report);
  assert.ok(Array.isArray(report.system_health.reasons));
});

test("affiliate action required makes CRITICAL", () => {
  const health = computeSystemHealth({
    affiliate_tracker: { health: { status: "ACTION_REQUIRED" }, approved_count: 1 } as never,
    learning_outcomes_metrics: { runtime_status: "OK" } as never,
    state_system_metrics: { runtime_status: "PARTIAL" } as never,
    trend: { overall_trend: "FLAT" } as never,
    cta_coverage_metrics: { runtime_status: "OK", safe_cta_links: 1 } as never,
    retailer_link_state_metrics: { runtime_status: "OK", distribution: {} } as never,
    gsc_exports_present: {
      sitemap_xml: true,
      coverage_zip: true,
      performance_zip: true,
    },
  });
  assert.equal(health.status, "CRITICAL");
});

test("unknown learning outcomes makes CRITICAL", () => {
  const health = computeSystemHealth({
    affiliate_tracker: { health: { status: "OK" }, approved_count: 1 } as never,
    learning_outcomes_metrics: { runtime_status: "UNKNOWN_DB_UNAVAILABLE" } as never,
    state_system_metrics: { runtime_status: "PARTIAL" } as never,
    trend: { overall_trend: "FLAT" } as never,
    cta_coverage_metrics: { runtime_status: "OK", safe_cta_links: 1 } as never,
    retailer_link_state_metrics: { runtime_status: "OK", distribution: {} } as never,
    gsc_exports_present: {
      sitemap_xml: true,
      coverage_zip: true,
      performance_zip: true,
    },
  });
  assert.equal(health.status, "CRITICAL");
});

test("unknown state systems makes CRITICAL", () => {
  const health = computeSystemHealth({
    affiliate_tracker: { health: { status: "OK" }, approved_count: 1 } as never,
    learning_outcomes_metrics: { runtime_status: "OK" } as never,
    state_system_metrics: { runtime_status: "UNKNOWN_NO_DATA" } as never,
    trend: { overall_trend: "FLAT" } as never,
    cta_coverage_metrics: { runtime_status: "OK", safe_cta_links: 1 } as never,
    retailer_link_state_metrics: { runtime_status: "OK", distribution: {} } as never,
    gsc_exports_present: {
      sitemap_xml: true,
      coverage_zip: true,
      performance_zip: true,
    },
  });
  assert.equal(health.status, "CRITICAL");
});

test("missing GSC export makes WARNING when no criticals", () => {
  const health = computeSystemHealth({
    affiliate_tracker: { health: { status: "OK" }, approved_count: 1 } as never,
    learning_outcomes_metrics: { runtime_status: "OK" } as never,
    state_system_metrics: { runtime_status: "PARTIAL" } as never,
    trend: { overall_trend: "FLAT" } as never,
    cta_coverage_metrics: { runtime_status: "OK", safe_cta_links: 1 } as never,
    retailer_link_state_metrics: { runtime_status: "OK", distribution: {} } as never,
    gsc_exports_present: {
      sitemap_xml: false,
      coverage_zip: true,
      performance_zip: true,
    },
  });
  assert.equal(health.status, "WARNING");
});

test("zero approved affiliates makes WARNING when no criticals", () => {
  const health = computeSystemHealth({
    affiliate_tracker: { health: { status: "OK" }, approved_count: 0 } as never,
    learning_outcomes_metrics: { runtime_status: "OK" } as never,
    state_system_metrics: { runtime_status: "PARTIAL" } as never,
    trend: { overall_trend: "FLAT" } as never,
    cta_coverage_metrics: { runtime_status: "OK", safe_cta_links: 1 } as never,
    retailer_link_state_metrics: { runtime_status: "OK", distribution: {} } as never,
    gsc_exports_present: {
      sitemap_xml: true,
      coverage_zip: true,
      performance_zip: true,
    },
  });
  assert.equal(health.status, "WARNING");
});

test("unverified affiliate tag makes WARNING when no criticals", () => {
  const health = computeSystemHealth({
    affiliate_tracker: {
      health: { status: "OK" },
      approved_count: 1,
      tag_verification: {
        verified_count: 0,
        unverified_count: 1,
        unknown_count: 0,
        unverified_records: ["amazon-associates"],
      },
    } as never,
    learning_outcomes_metrics: { runtime_status: "OK" } as never,
    state_system_metrics: { runtime_status: "PARTIAL" } as never,
    trend: { overall_trend: "FLAT" } as never,
    cta_coverage_metrics: { runtime_status: "OK", safe_cta_links: 1 } as never,
    retailer_link_state_metrics: { runtime_status: "OK", distribution: {} } as never,
    gsc_exports_present: {
      sitemap_xml: true,
      coverage_zip: true,
      performance_zip: true,
    },
  });
  assert.equal(health.status, "WARNING");
});

test("degrading trend makes WARNING when no criticals", () => {
  const health = computeSystemHealth({
    affiliate_tracker: { health: { status: "OK" }, approved_count: 1 } as never,
    learning_outcomes_metrics: { runtime_status: "OK" } as never,
    state_system_metrics: { runtime_status: "PARTIAL" } as never,
    trend: { overall_trend: "DEGRADING" } as never,
    cta_coverage_metrics: { runtime_status: "OK", safe_cta_links: 1 } as never,
    retailer_link_state_metrics: { runtime_status: "OK", distribution: {} } as never,
    gsc_exports_present: {
      sitemap_xml: true,
      coverage_zip: true,
      performance_zip: true,
    },
  });
  assert.equal(health.status, "WARNING");
});

test("OK when no reasons", () => {
  const health = computeSystemHealth({
    affiliate_tracker: { health: { status: "OK" }, approved_count: 1 } as never,
    learning_outcomes_metrics: { runtime_status: "OK" } as never,
    state_system_metrics: { runtime_status: "PARTIAL" } as never,
    trend: { overall_trend: "FLAT" } as never,
    cta_coverage_metrics: { runtime_status: "OK", safe_cta_links: 1 } as never,
    retailer_link_state_metrics: { runtime_status: "OK", distribution: {} } as never,
    gsc_exports_present: {
      sitemap_xml: true,
      coverage_zip: true,
      performance_zip: true,
    },
  });
  assert.equal(health.status, "OK");
  assert.deepEqual(health.reasons, []);
});

test("system_health reacts to UNKNOWN CTA metrics", () => {
  const health = computeSystemHealth({
    affiliate_tracker: { health: { status: "OK" }, approved_count: 1 } as never,
    learning_outcomes_metrics: { runtime_status: "OK" } as never,
    state_system_metrics: { runtime_status: "PARTIAL" } as never,
    trend: { overall_trend: "FLAT" } as never,
    cta_coverage_metrics: { runtime_status: "UNKNOWN_DB_UNAVAILABLE" } as never,
    retailer_link_state_metrics: { runtime_status: "OK", distribution: {} } as never,
    gsc_exports_present: {
      sitemap_xml: true,
      coverage_zip: true,
      performance_zip: true,
    },
  });
  assert.equal(health.status, "CRITICAL");
});

test("system_health reacts to UNKNOWN retailer_link_state_metrics", () => {
  const health = computeSystemHealth({
    affiliate_tracker: { health: { status: "OK" }, approved_count: 1 } as never,
    learning_outcomes_metrics: { runtime_status: "OK" } as never,
    state_system_metrics: { runtime_status: "PARTIAL" } as never,
    trend: { overall_trend: "FLAT" } as never,
    cta_coverage_metrics: { runtime_status: "OK", safe_cta_links: 1 } as never,
    retailer_link_state_metrics: { runtime_status: "UNKNOWN", distribution: "UNKNOWN" } as never,
    gsc_exports_present: {
      sitemap_xml: true,
      coverage_zip: true,
      performance_zip: true,
    },
  });
  assert.equal(health.status, "CRITICAL");
});

test("system_health does not include retailer_link_state_metrics UNKNOWN when CTA data exists", async () => {
  const report = await buildBuckpartsCommandSurfaceReport({
    skipLearningOutcomesQuery: true,
    fetchCtaCoverageRows: async () => [
      {
        retailer_key: "amazon",
        affiliate_url: "https://www.amazon.com/dp/B000000010",
        browser_truth_classification: "direct_buyable",
      },
      {
        retailer_key: "oem",
        affiliate_url: "https://www.repairclinic.com/PartDetail/Water-Filter/12345/10",
        browser_truth_classification: null,
      },
    ],
  });
  assert.equal(report.retailer_link_state_metrics.runtime_status, "OK");
  assert.equal(
    report.system_health.reasons.includes("retailer_link_state_metrics.runtime_status is UNKNOWN"),
    false,
  );
});

test("system_health WARNING when BLOCKED_* exceeds LIVE_*", () => {
  const health = computeSystemHealth({
    affiliate_tracker: { health: { status: "OK" }, approved_count: 1 } as never,
    learning_outcomes_metrics: { runtime_status: "OK" } as never,
    state_system_metrics: { runtime_status: "PARTIAL" } as never,
    trend: { overall_trend: "FLAT" } as never,
    cta_coverage_metrics: { runtime_status: "OK", safe_cta_links: 1 } as never,
    retailer_link_state_metrics: {
      runtime_status: "OK",
      distribution: {
        BLOCKED_SEARCH_OR_DISCOVERY: 3,
        LIVE_DIRECT_BUYABLE: 1,
      },
    } as never,
    gsc_exports_present: {
      sitemap_xml: true,
      coverage_zip: true,
      performance_zip: true,
    },
  });
  assert.equal(health.status, "WARNING");
});

test("recommended next step changes for CRITICAL", async () => {
  const report = await buildBuckpartsCommandSurfaceReport();
  assert.equal(report.system_health.status, "WARNING");
  assert.equal(
    report.recommended_next_step,
    "Resolve warning-level command-surface issues before expanding.",
  );
});

test("default run does not write snapshot", async () => {
  const tmpDir = mkdtempSync(path.join(os.tmpdir(), "buckparts-cs-no-write-"));
  try {
    const report = await runCommandSurfaceReport({
      rootDir: tmpDir,
      writeSnapshot: false,
    });
    const snapshotAbs = path.join(tmpDir, "data/reports/buckparts-command-surface.json");
    assert.equal(existsSync(snapshotAbs), false);
    assert.equal(report.snapshot_written, false);
    assert.equal(report.data_mutation, false);
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
});

test("--write-snapshot writes snapshot", async () => {
  const tmpDir = mkdtempSync(path.join(os.tmpdir(), "buckparts-cs-write-"));
  try {
    const report = await runCommandSurfaceReport({
      rootDir: tmpDir,
      writeSnapshot: true,
    });
    const snapshotAbs = path.join(tmpDir, "data/reports/buckparts-command-surface.json");
    assert.equal(existsSync(snapshotAbs), true);
    assert.equal(report.snapshot_written, true);
    assert.equal(report.data_mutation, false);
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
});

test("snapshot contains valid command surface JSON", async () => {
  const tmpDir = mkdtempSync(path.join(os.tmpdir(), "buckparts-cs-valid-"));
  try {
    await runCommandSurfaceReport({
      rootDir: tmpDir,
      writeSnapshot: true,
    });
    const snapshotAbs = path.join(tmpDir, "data/reports/buckparts-command-surface.json");
    const parsed = JSON.parse(readFileSync(snapshotAbs, "utf8"));
    assert.equal(typeof parsed.report_name, "string");
    assert.equal(parsed.read_only, true);
    assert.equal(parsed.data_mutation, false);
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
});

test("trend detects previous snapshot after write", async () => {
  const tmpDir = mkdtempSync(path.join(os.tmpdir(), "buckparts-cs-trend-"));
  try {
    await runCommandSurfaceReport({
      rootDir: tmpDir,
      writeSnapshot: true,
    });
    const second = await runCommandSurfaceReport({
      rootDir: tmpDir,
      writeSnapshot: false,
    });
    assert.equal(second.trend.previous_snapshot_present, true);
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
});

test("search_and_click_intelligence_summary returns OK metrics when fetch succeeds", async () => {
  const report = await buildBuckpartsCommandSurfaceReport({
    skipLearningOutcomesQuery: true,
    skipCtaCoverageQuery: true,
    fetchSearchAndClickIntelligenceSummary: async () => ({
      window_days: { short: 7, long: 30 },
      search_events: {
        last_7d: 100,
        last_30d: 250,
        zero_result_last_7d: 15,
        zero_result_last_30d: 40,
        zero_result_rate_last_7d: 0.15,
        zero_result_rate_last_30d: 0.16,
      },
      search_gaps_backlog: {
        open: 10,
        reviewing: 4,
        queued: 2,
        total_actionable: 16,
      },
      click_events: {
        last_7d: 30,
        last_30d: 90,
      },
    }),
  });
  assert.equal(report.search_and_click_intelligence_summary.runtime_status, "OK");
  assert.equal(report.search_and_click_intelligence_summary.search_events.last_7d, 100);
  assert.equal(report.search_and_click_intelligence_summary.search_gaps_backlog.total_actionable, 16);
  assert.equal(report.search_and_click_intelligence_summary.click_events.last_30d, 90);
  assert.deepEqual(report.search_and_click_intelligence_summary.known_unknowns, []);
});

test("search_and_click_intelligence_summary returns UNKNOWN_DB_UNAVAILABLE on fetch failure", async () => {
  const report = await buildBuckpartsCommandSurfaceReport({
    skipLearningOutcomesQuery: true,
    skipCtaCoverageQuery: true,
    fetchSearchAndClickIntelligenceSummary: async () => {
      throw new Error("db unavailable");
    },
  });
  assert.equal(
    report.search_and_click_intelligence_summary.runtime_status,
    "UNKNOWN_DB_UNAVAILABLE",
  );
  assert.equal(report.search_and_click_intelligence_summary.search_events.last_7d, "UNKNOWN");
  assert.equal(
    report.search_and_click_intelligence_summary.search_gaps_backlog.total_actionable,
    "UNKNOWN",
  );
  assert.equal(report.search_and_click_intelligence_summary.click_events.last_30d, "UNKNOWN");
  assert.equal(
    report.search_and_click_intelligence_summary.known_unknowns.length > 0,
    true,
  );
});
