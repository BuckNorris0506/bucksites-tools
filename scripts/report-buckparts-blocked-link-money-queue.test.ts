import assert from "node:assert/strict";
import test from "node:test";

import {
  buildBuckpartsBlockedLinkMoneyQueueReport,
  buildBuckpartsBlockedLinkMoneyQueueReportFromRows,
} from "./report-buckparts-blocked-link-money-queue";

test("report is read_only true and data_mutation false", async () => {
  const report = await buildBuckpartsBlockedLinkMoneyQueueReport({
    fetchCtaCoverageRows: async () => [],
  });
  assert.equal(report.read_only, true);
  assert.equal(report.data_mutation, false);
});

test("blocked states sorted by count then lexical", () => {
  const report = buildBuckpartsBlockedLinkMoneyQueueReportFromRows(
    [
      {
        retailer_key: "google-search",
        affiliate_url: "https://www.google.com/search?q=filter",
        browser_truth_classification: "direct_buyable",
      },
      {
        retailer_key: "google-search",
        affiliate_url: "https://www.google.com/search?q=filter2",
        browser_truth_classification: "direct_buyable",
      },
      {
        retailer_key: "oem-a",
        affiliate_url: "https://example.com/part/1",
        browser_truth_classification: null,
      },
      {
        retailer_key: "oem-b",
        affiliate_url: "https://example.com/part/2",
        browser_truth_classification: null,
      },
      {
        retailer_key: "oem-c",
        affiliate_url: "https://example.com/part/3",
        browser_truth_classification: "likely_valid",
      },
    ],
    () => new Date("2026-04-29T00:00:00.000Z"),
  );

  assert.deepEqual(report.top_blocked_states, [
    { state: "BLOCKED_BROWSER_TRUTH_MISSING", count: 2 },
    { state: "BLOCKED_SEARCH_OR_DISCOVERY", count: 2 },
    { state: "BLOCKED_BROWSER_TRUTH_UNSAFE", count: 1 },
  ]);
});

test("retailer key ranking uses blocked count then inferred importance then lexical", () => {
  const report = buildBuckpartsBlockedLinkMoneyQueueReportFromRows(
    [
      {
        retailer_key: "a-key",
        affiliate_url: "https://example.com/part/1",
        browser_truth_classification: "likely_valid",
      },
      {
        retailer_key: "b-key",
        affiliate_url: "https://example.com/part/2",
        browser_truth_classification: "likely_valid",
      },
      {
        retailer_key: "a-key",
        affiliate_url: "https://www.amazon.com/dp/B000000021",
        browser_truth_classification: "direct_buyable",
      },
      {
        retailer_key: "a-key",
        affiliate_url: "https://www.amazon.com/dp/B000000022",
        browser_truth_classification: "direct_buyable",
      },
    ],
    () => new Date("2026-04-29T00:00:00.000Z"),
  );

  assert.deepEqual(report.top_blocked_retailer_keys, [
    { retailer_key: "a-key", blocked_count: 1, inferred_importance_count: 3 },
    { retailer_key: "b-key", blocked_count: 1, inferred_importance_count: 1 },
  ]);
});

test("recommended action prefers OEM key when top key is oem-catalog", () => {
  const report = buildBuckpartsBlockedLinkMoneyQueueReportFromRows(
    [
      {
        retailer_key: "oem-catalog",
        affiliate_url: "https://example.com/search?q=abc",
        browser_truth_classification: null,
      },
    ],
    () => new Date("2026-04-29T00:00:00.000Z"),
  );
  assert.equal(
    report.recommended_first_action,
    "Replace OEM catalog/search-style rows with verified direct PDPs where exact-token proof exists.",
  );
});

test("recommended action uses unsafe top-state rule", () => {
  const report = buildBuckpartsBlockedLinkMoneyQueueReportFromRows(
    [
      {
        retailer_key: "retailer-x",
        affiliate_url: "https://example.com/part/unsafe",
        browser_truth_classification: "likely_valid",
      },
    ],
    () => new Date("2026-04-29T00:00:00.000Z"),
  );
  assert.equal(
    report.recommended_first_action,
    "Recheck browser-truth evidence for unsafe rows before promoting.",
  );
});

test("recommended action uses missing top-state rule", () => {
  const report = buildBuckpartsBlockedLinkMoneyQueueReportFromRows(
    [
      {
        retailer_key: "retailer-y",
        affiliate_url: "https://example.com/part/missing",
        browser_truth_classification: null,
      },
    ],
    () => new Date("2026-04-29T00:00:00.000Z"),
  );
  assert.equal(
    report.recommended_first_action,
    "Collect browser-truth evidence before CTA eligibility.",
  );
});

test("unknown output when CTA data unavailable", async () => {
  const report = await buildBuckpartsBlockedLinkMoneyQueueReport({
    fetchCtaCoverageRows: async () => {
      throw new Error("db unavailable");
    },
  });
  assert.equal(report.total_blocked_links, "UNKNOWN");
  assert.equal(report.top_blocked_states, "UNKNOWN");
  assert.equal(report.top_blocked_retailer_keys, "UNKNOWN");
});

