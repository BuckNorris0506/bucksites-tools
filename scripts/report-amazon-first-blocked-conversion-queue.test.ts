import assert from "node:assert/strict";
import test from "node:test";

import {
  buildAmazonFirstBlockedConversionQueueReportFromData,
  extractBlockedOemToken,
  resolveRecommendedNextAction,
} from "./report-amazon-first-blocked-conversion-queue";

test("report flags read_only and no data mutation", () => {
  const report = buildAmazonFirstBlockedConversionQueueReportFromData({
    links: [],
    filters: [],
    now: () => new Date("2026-04-30T00:00:00.000Z"),
    amazonAffiliateReady: true,
  });
  assert.equal(report.read_only, true);
  assert.equal(report.data_mutation, false);
  assert.equal(report.selection_table, "retailer_links");
});

test("extractBlockedOemToken prefers query param", () => {
  assert.equal(
    extractBlockedOemToken("https://www.repairclinic.com/Search?SearchTerm=DA29-00020B"),
    "DA29-00020B",
  );
});

test("excludes handled tokens, Frigidaire dead OEM URLs, and non-OEM rows", () => {
  const deadFrig = "https://www.frigidaire.com/en/catalogsearch/result/?q=242017801";
  const report = buildAmazonFirstBlockedConversionQueueReportFromData({
    links: [
      {
        id: "keep-1",
        filter_id: "f1",
        retailer_key: "oem-catalog",
        affiliate_url: "https://www.repairclinic.com/Search?SearchTerm=DA29-00020B",
        browser_truth_classification: null,
        is_primary: false,
      },
      {
        id: "drop-token",
        filter_id: "f2",
        retailer_key: "oem-catalog",
        affiliate_url: "https://www.repairclinic.com/Search?SearchTerm=DA29-00019A",
        browser_truth_classification: null,
        is_primary: false,
      },
      {
        id: "drop-frig",
        filter_id: "f3",
        retailer_key: "oem-parts-catalog",
        affiliate_url: deadFrig,
        browser_truth_classification: null,
        is_primary: false,
      },
      {
        id: "drop-amazon",
        filter_id: "f4",
        retailer_key: "amazon",
        affiliate_url: "https://www.amazon.com/s?k=TEST",
        browser_truth_classification: null,
        is_primary: false,
      },
    ],
    filters: [
      { id: "f1", slug: "slug-1", oem_part_number: "DA29-00020B" },
      { id: "f2", slug: "slug-2", oem_part_number: null },
      { id: "f3", slug: "slug-3", oem_part_number: null },
      { id: "f4", slug: "slug-4", oem_part_number: null },
    ],
    now: () => new Date("2026-04-30T00:00:00.000Z"),
    amazonAffiliateReady: true,
  });
  assert.equal(report.total_pool_rows, 1);
  assert.equal(Array.isArray(report.top_candidates), true);
  if (Array.isArray(report.top_candidates)) {
    assert.equal(report.top_candidates.length, 1);
    assert.equal(report.top_candidates[0]?.link_id, "keep-1");
    assert.equal(report.top_candidates[0]?.recommended_next_action, "SEARCH_AMAZON_EXACT_TOKEN");
  }
});

test("NOOP when filter already has gate-ok live Amazon", () => {
  const report = buildAmazonFirstBlockedConversionQueueReportFromData({
    links: [
      {
        id: "blocked-oem",
        filter_id: "f1",
        retailer_key: "oem-catalog",
        affiliate_url: "https://www.repairclinic.com/Search?SearchTerm=XYZ1",
        browser_truth_classification: null,
        is_primary: false,
      },
      {
        id: "amazon-live",
        filter_id: "f1",
        retailer_key: "amazon",
        affiliate_url: "https://www.amazon.com/dp/B012345678",
        browser_truth_classification: "direct_buyable",
        is_primary: true,
      },
    ],
    filters: [{ id: "f1", slug: "has-amazon", oem_part_number: "XYZ1" }],
    now: () => new Date("2026-04-30T00:00:00.000Z"),
    amazonAffiliateReady: true,
  });
  assert.equal(report.total_pool_rows, 1);
  assert.equal(report.already_live_noop_count, 1);
  assert.equal(report.needs_amazon_search_count, 0);
  assert.equal(Array.isArray(report.top_candidates), true);
  if (Array.isArray(report.top_candidates)) {
    assert.equal(report.top_candidates.length, 0);
  }
});

test("HOLD_AFFILIATE_NOT_READY when Amazon program not ready", () => {
  const report = buildAmazonFirstBlockedConversionQueueReportFromData({
    links: [
      {
        id: "blocked-oem",
        filter_id: "f1",
        retailer_key: "oem-catalog",
        affiliate_url: "https://www.repairclinic.com/Search?SearchTerm=ZZZ1",
        browser_truth_classification: null,
        is_primary: false,
      },
    ],
    filters: [{ id: "f1", slug: "no-amazon", oem_part_number: null }],
    now: () => new Date("2026-04-30T00:00:00.000Z"),
    amazonAffiliateReady: false,
  });
  assert.equal(report.needs_amazon_search_count, 0);
  if (Array.isArray(report.top_candidates) && report.top_candidates[0]) {
    assert.equal(report.top_candidates[0].recommended_next_action, "HOLD_AFFILIATE_NOT_READY");
  }
});

test("extractBlockedOemToken returns UNKNOWN for invalid URLs", () => {
  assert.equal(extractBlockedOemToken("not-a-valid-url"), "UNKNOWN");
});

test("resolveRecommendedNextAction maps UNKNOWN token to review", () => {
  assert.equal(
    resolveRecommendedNextAction({
      token: "UNKNOWN",
      noop: false,
      amazonAffiliateReady: true,
    }),
    "UNKNOWN_REVIEW_REQUIRED",
  );
});
