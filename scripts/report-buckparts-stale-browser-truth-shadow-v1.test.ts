import assert from "node:assert/strict";
import test from "node:test";

import { R1_SHADOW_STALE_BROWSER_TRUTH_MAX_AGE_MS } from "@/lib/retailers/launch-buy-links";

import {
  buildBuckpartsStaleBrowserTruthShadowReportFromRows,
} from "./lib/buckparts-stale-browser-truth-shadow-report-v1";

const NOW = () => new Date("2026-06-10T12:00:00.000Z");
const FRESH_CHECKED_AT = "2026-05-01T00:00:00.000Z";
const STALE_CHECKED_AT = "2026-01-01T00:00:00.000Z";

test("report is read_only, non-mutating, and non-enforcing", () => {
  const report = buildBuckpartsStaleBrowserTruthShadowReportFromRows([], NOW);
  assert.equal(report.read_only, true);
  assert.equal(report.data_mutation, false);
  assert.equal(report.enforce, false);
  assert.equal(report.max_age_ms, R1_SHADOW_STALE_BROWSER_TRUTH_MAX_AGE_MS);
});

test("counts stale shadow rows among live direct_buyable links only", () => {
  const report = buildBuckpartsStaleBrowserTruthShadowReportFromRows(
    [
      {
        source_table: "retailer_links",
        retailer_key: "amazon",
        affiliate_url: "https://www.amazon.com/dp/B00FRESH",
        browser_truth_classification: "direct_buyable",
        browser_truth_checked_at: FRESH_CHECKED_AT,
      },
      {
        source_table: "retailer_links",
        retailer_key: "amazon",
        affiliate_url: "https://www.amazon.com/dp/B00STALE",
        browser_truth_classification: "direct_buyable",
        browser_truth_checked_at: STALE_CHECKED_AT,
      },
      {
        source_table: "retailer_links",
        retailer_key: "amazon",
        affiliate_url: "https://www.amazon.com/dp/B00MISSING",
        browser_truth_classification: "direct_buyable",
        browser_truth_checked_at: null,
      },
      {
        source_table: "retailer_links",
        retailer_key: "google-search",
        affiliate_url: "https://www.google.com/search?q=filter",
        browser_truth_classification: "direct_buyable",
        browser_truth_checked_at: STALE_CHECKED_AT,
      },
      {
        source_table: "air_purifier_retailer_links",
        retailer_key: "amazon",
        affiliate_url: "https://www.amazon.com/dp/B00LIKELY",
        browser_truth_classification: "likely_valid",
        browser_truth_checked_at: STALE_CHECKED_AT,
      },
    ],
    NOW,
  );

  assert.equal(report.totals.live_direct_buyable_count, 3);
  assert.equal(report.totals.stale_shadow_count, 2);
  assert.equal(report.totals.missing_browser_truth_checked_at_count, 1);
  assert.equal(report.totals.stale_browser_truth_checked_at_count, 1);
  assert.equal(report.totals.fresh_direct_buyable_count, 1);
  assert.equal(report.by_shadow_kind.missing_browser_truth_checked_at, 1);
  assert.equal(report.by_shadow_kind.stale_browser_truth_checked_at, 1);
  assert.equal(report.by_source_table.retailer_links.live_direct_buyable_count, 3);
  assert.equal(report.by_source_table.air_purifier_retailer_links.live_direct_buyable_count, 0);
});
