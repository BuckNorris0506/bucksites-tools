import assert from "node:assert/strict";
import test from "node:test";

import {
  buildOemCatalogNextMoneyCohortReport,
  buildOemCatalogNextMoneyCohortReportFromRows,
} from "./report-oem-catalog-next-money-cohort";

test("report is read_only true and data_mutation false", () => {
  const report = buildOemCatalogNextMoneyCohortReportFromRows([], () => new Date("2026-04-29T00:00:00.000Z"));
  assert.equal(report.read_only, true);
  assert.equal(report.data_mutation, false);
});

test("filters to blocked search/discovery OEM rows and excludes handled Frigidaire tokens", () => {
  const report = buildOemCatalogNextMoneyCohortReportFromRows(
    [
      {
        table: "retailer_links",
        rows: [
          {
            id: "keep-1",
            retailer_key: "oem-catalog",
            affiliate_url: "https://www.repairclinic.com/Search?SearchTerm=DA29-00020B",
            browser_truth_classification: null,
          },
          {
            id: "drop-frig",
            retailer_key: "oem-parts-catalog",
            affiliate_url: "https://www.frigidaire.com/en/catalogsearch/result/?q=242017801",
            browser_truth_classification: null,
          },
          {
            id: "drop-non-oem",
            retailer_key: "amazon",
            affiliate_url: "https://www.amazon.com/dp/B000000001",
            browser_truth_classification: null,
          },
          {
            id: "drop-not-blocked-search",
            retailer_key: "oem-catalog",
            affiliate_url: "https://www.repairclinic.com/PartDetail/123",
            browser_truth_classification: "direct_buyable",
          },
        ],
      },
    ],
    () => new Date("2026-04-29T00:00:00.000Z"),
  );

  assert.equal(report.total_remaining_rows, 1);
  assert.equal(Array.isArray(report.top_candidate_rows), true);
  if (Array.isArray(report.top_candidate_rows)) {
    assert.equal(report.top_candidate_rows.length, 1);
    assert.equal(report.top_candidate_rows[0]?.link_id, "keep-1");
    assert.equal(report.top_candidate_rows[0]?.detected_token, "DA29-00020B");
  }
});

test("domain ranking desc then lexical, candidate ranking prefers refrigerator table", () => {
  const report = buildOemCatalogNextMoneyCohortReportFromRows(
    [
      {
        table: "whole_house_water_retailer_links",
        rows: [
          {
            id: "wh-1",
            retailer_key: "oem-catalog",
            affiliate_url: "https://alpha.example.com/search?q=AAA1",
            browser_truth_classification: null,
          },
        ],
      },
      {
        table: "retailer_links",
        rows: [
          {
            id: "fr-1",
            retailer_key: "oem-catalog",
            affiliate_url: "https://beta.example.com/search?q=BBB1",
            browser_truth_classification: null,
          },
          {
            id: "fr-2",
            retailer_key: "oem-catalog",
            affiliate_url: "https://beta.example.com/search?q=BBB2",
            browser_truth_classification: null,
          },
        ],
      },
    ],
    () => new Date("2026-04-29T00:00:00.000Z"),
  );

  assert.equal(Array.isArray(report.top_domains), true);
  if (Array.isArray(report.top_domains)) {
    assert.deepEqual(report.top_domains, [
      { domain: "beta.example.com", blocked_count: 2 },
      { domain: "alpha.example.com", blocked_count: 1 },
    ]);
  }
  assert.equal(Array.isArray(report.top_candidate_rows), true);
  if (Array.isArray(report.top_candidate_rows)) {
    assert.equal(report.top_candidate_rows[0]?.table, "retailer_links");
  }
});

test("recommended cohort must be an actionable table-domain pair", () => {
  const report = buildOemCatalogNextMoneyCohortReportFromRows(
    [
      {
        table: "air_purifier_retailer_links",
        rows: [
          {
            id: "air-r1",
            retailer_key: "oem-catalog",
            affiliate_url: "https://www.repairclinic.com/Search?SearchTerm=AP1",
            browser_truth_classification: null,
          },
          {
            id: "air-r2",
            retailer_key: "oem-catalog",
            affiliate_url: "https://www.repairclinic.com/Search?SearchTerm=AP2",
            browser_truth_classification: null,
          },
        ],
      },
      {
        table: "retailer_links",
        rows: [
          {
            id: "fr-w1",
            retailer_key: "oem-catalog",
            affiliate_url: "https://www.whirlpoolparts.com/catalog.jsp?searchKeyword=W1",
            browser_truth_classification: null,
          },
          {
            id: "fr-w2",
            retailer_key: "oem-catalog",
            affiliate_url: "https://www.whirlpoolparts.com/catalog.jsp?searchKeyword=W2",
            browser_truth_classification: null,
          },
          {
            id: "fr-w3",
            retailer_key: "oem-catalog",
            affiliate_url: "https://www.whirlpoolparts.com/catalog.jsp?searchKeyword=W3",
            browser_truth_classification: null,
          },
        ],
      },
    ],
    () => new Date("2026-04-29T00:00:00.000Z"),
  );

  assert.equal(
    report.recommended_next_cohort.includes("retailer_links rows on domain www.whirlpoolparts.com"),
    true,
  );
  assert.equal(
    report.recommended_next_cohort.includes("air_purifier_retailer_links rows on domain www.whirlpoolparts.com"),
    false,
  );
});

test("top candidate rows limited to 25", () => {
  const rows = Array.from({ length: 40 }, (_, i) => ({
    id: `id-${i + 1}`,
    retailer_key: "oem-catalog",
    affiliate_url: `https://a.example.com/search?q=T${i + 1}`,
    browser_truth_classification: null as string | null,
  }));
  const report = buildOemCatalogNextMoneyCohortReportFromRows(
    [{ table: "retailer_links", rows }],
    () => new Date("2026-04-29T00:00:00.000Z"),
  );
  assert.equal(Array.isArray(report.top_candidate_rows), true);
  if (Array.isArray(report.top_candidate_rows)) {
    assert.equal(report.top_candidate_rows.length, 25);
  }
});

test("returns UNKNOWN payload when source data unavailable", async () => {
  const report = await buildOemCatalogNextMoneyCohortReport({
    fetchRows: async () => {
      throw new Error("db unavailable");
    },
  });
  assert.equal(report.total_remaining_rows, "UNKNOWN");
  assert.equal(report.top_domains, "UNKNOWN");
  assert.equal(report.top_tables, "UNKNOWN");
  assert.equal(report.top_candidate_rows, "UNKNOWN");
  assert.equal(report.known_unknowns.length > 0, true);
});

