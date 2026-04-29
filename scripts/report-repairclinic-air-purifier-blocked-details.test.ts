import assert from "node:assert/strict";
import test from "node:test";

import { buildRepairClinicAirPurifierBlockedDetailsReport } from "./report-repairclinic-air-purifier-blocked-details";

test("report is read_only true and data_mutation false", async () => {
  const report = await buildRepairClinicAirPurifierBlockedDetailsReport({
    fetchRows: async () => [],
  });
  assert.equal(report.read_only, true);
  assert.equal(report.data_mutation, false);
});

test("includes only repairclinic blocked search OEM rows", async () => {
  const report = await buildRepairClinicAirPurifierBlockedDetailsReport({
    now: () => new Date("2026-04-29T00:00:00.000Z"),
    fetchRows: async () => [
      {
        id: "keep-1",
        retailer_key: "oem-catalog",
        affiliate_url: "https://www.repairclinic.com/Search?SearchTerm=115115",
        browser_truth_classification: null,
      },
      {
        id: "drop-domain",
        retailer_key: "oem-catalog",
        affiliate_url: "https://www.example.com/Search?SearchTerm=115115",
        browser_truth_classification: null,
      },
      {
        id: "drop-key",
        retailer_key: "amazon",
        affiliate_url: "https://www.repairclinic.com/Search?SearchTerm=115115",
        browser_truth_classification: null,
      },
      {
        id: "drop-state",
        retailer_key: "oem-parts-catalog",
        affiliate_url: "https://www.repairclinic.com/PartDetail/123",
        browser_truth_classification: "direct_buyable",
      },
    ],
  });

  assert.equal(report.total_rows, 1);
  assert.equal(Array.isArray(report.sample_rows), true);
  if (Array.isArray(report.sample_rows)) {
    assert.equal(report.sample_rows.length, 1);
    assert.equal(report.sample_rows[0]?.link_id, "keep-1");
    assert.equal(report.sample_rows[0]?.detected_token, "115115");
    assert.equal(report.sample_rows[0]?.blocked_state, "BLOCKED_SEARCH_OR_DISCOVERY");
  }
});

test("sample rows limited to 25", async () => {
  const rows = Array.from({ length: 40 }, (_, i) => ({
    id: `id-${i + 1}`,
    retailer_key: "oem-catalog",
    affiliate_url: `https://www.repairclinic.com/Search?SearchTerm=T${i + 1}`,
    browser_truth_classification: null as string | null,
  }));
  const report = await buildRepairClinicAirPurifierBlockedDetailsReport({
    fetchRows: async () => rows,
  });
  assert.equal(Array.isArray(report.sample_rows), true);
  if (Array.isArray(report.sample_rows)) {
    assert.equal(report.sample_rows.length, 25);
  }
});

test("returns UNKNOWN payload when data unavailable", async () => {
  const report = await buildRepairClinicAirPurifierBlockedDetailsReport({
    fetchRows: async () => {
      throw new Error("db unavailable");
    },
  });
  assert.equal(report.total_rows, "UNKNOWN");
  assert.equal(report.sample_rows, "UNKNOWN");
  assert.equal(report.known_unknowns.length > 0, true);
});

