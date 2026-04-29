import assert from "node:assert/strict";
import test from "node:test";

import { buildBuckpartsOemCatalogBlockedDetailsReport } from "./report-buckparts-oem-catalog-blocked-details";

test("report is read_only true and data_mutation false", async () => {
  const report = await buildBuckpartsOemCatalogBlockedDetailsReport({
    fetchRows: async () => [],
  });
  assert.equal(report.read_only, true);
  assert.equal(report.data_mutation, false);
});

test("filters only OEM keys with BLOCKED_* states", async () => {
  const report = await buildBuckpartsOemCatalogBlockedDetailsReport({
    now: () => new Date("2026-04-29T00:00:00.000Z"),
    fetchRows: async () => [
      {
        table: "retailer_links",
        rows: [
          {
            id: "r1",
            retailer_key: "oem-catalog",
            affiliate_url: "https://www.kinetico.com/en-us/for-home/water-filtration/",
            browser_truth_classification: "direct_buyable",
          },
          {
            id: "r2",
            retailer_key: "oem-parts-catalog",
            affiliate_url: "https://example.com/pdp/1",
            browser_truth_classification: null,
          },
          {
            id: "r3",
            retailer_key: "amazon",
            affiliate_url: "https://www.amazon.com/dp/B000000031",
            browser_truth_classification: "direct_buyable",
          },
        ],
      },
    ],
  });

  assert.equal(report.total_rows, 2);
  assert.deepEqual(report.rows_by_table, { retailer_links: 2 });
  assert.deepEqual(report.rows_by_blocked_state, {
    BLOCKED_SEARCH_OR_DISCOVERY: 1,
    BLOCKED_BROWSER_TRUTH_MISSING: 1,
  });
  assert.equal(Array.isArray(report.sample_rows), true);
  if (Array.isArray(report.sample_rows)) {
    assert.equal(report.sample_rows.length, 2);
    assert.equal(report.sample_rows.every((row) => row.retailer_key.startsWith("oem-")), true);
    assert.equal(report.sample_rows.every((row) => row.blocked_state.startsWith("BLOCKED_")), true);
  }
});

test("sample rows limited to 25", async () => {
  const rows = Array.from({ length: 40 }, (_, i) => ({
    id: `id-${i + 1}`,
    retailer_key: "oem-catalog",
    affiliate_url: `https://example.com/search?q=${i + 1}`,
    browser_truth_classification: null as string | null,
  }));
  const report = await buildBuckpartsOemCatalogBlockedDetailsReport({
    fetchRows: async () => [{ table: "retailer_links", rows }],
  });
  assert.equal(report.total_rows, 40);
  assert.equal(Array.isArray(report.sample_rows), true);
  if (Array.isArray(report.sample_rows)) {
    assert.equal(report.sample_rows.length, 25);
  }
});

test("returns UNKNOWN payload when source data unavailable", async () => {
  const report = await buildBuckpartsOemCatalogBlockedDetailsReport({
    fetchRows: async () => {
      throw new Error("db unavailable");
    },
  });
  assert.equal(report.total_rows, "UNKNOWN");
  assert.equal(report.rows_by_table, "UNKNOWN");
  assert.equal(report.rows_by_blocked_state, "UNKNOWN");
  assert.equal(report.sample_rows, "UNKNOWN");
  assert.equal(report.known_unknowns.length > 0, true);
});

