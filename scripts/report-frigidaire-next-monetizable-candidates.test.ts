import assert from "node:assert/strict";
import test from "node:test";

import {
  buildFrigidaireNextMonetizableCandidatesReport,
  buildFrigidaireNextMonetizableCandidatesReportFromData,
} from "./report-frigidaire-next-monetizable-candidates";

test("report is read_only true and data_mutation false", () => {
  const report = buildFrigidaireNextMonetizableCandidatesReportFromData(
    { filters: [], links: [] },
    () => new Date("2026-04-29T00:00:00.000Z"),
  );
  assert.equal(report.runtime_status, "OK");
  assert.equal(report.read_only, true);
  assert.equal(report.data_mutation, false);
});

test("excludes proven-dead target tokens from candidates", () => {
  const report = buildFrigidaireNextMonetizableCandidatesReportFromData(
    {
      filters: [
        {
          id: "f-1",
          slug: "frig-242017801",
          oem_part_number: "242017801",
          brand_id: "b-frigidaire",
        },
      ],
      links: [
        {
          filter_id: "f-1",
          retailer_key: "oem-parts-catalog",
          affiliate_url: "https://www.frigidaire.com/en/catalogsearch/result/?q=242017801",
          browser_truth_classification: "likely_not_found",
        },
        {
          filter_id: "f-1",
          retailer_key: "amazon",
          affiliate_url: "https://www.amazon.com/dp/B000TEST01",
          browser_truth_classification: "direct_buyable",
        },
      ],
    },
    () => new Date("2026-04-29T00:00:00.000Z"),
  );
  assert.equal(report.candidates.length, 0);
});

test("includes candidate with blocked oem and non-oem rows", () => {
  const report = buildFrigidaireNextMonetizableCandidatesReportFromData(
    {
      filters: [
        {
          id: "f-2",
          slug: "wf3cb",
          oem_part_number: "WF3CB",
          brand_id: "b-frigidaire",
        },
      ],
      links: [
        {
          filter_id: "f-2",
          retailer_key: "oem-parts-catalog",
          affiliate_url: "https://www.frigidaire.com/en/catalogsearch/result/?q=WF3CB",
          browser_truth_classification: "likely_not_found",
        },
        {
          filter_id: "f-2",
          retailer_key: "amazon",
          affiliate_url: "https://www.amazon.com/dp/B000WF3CB1",
          browser_truth_classification: "direct_buyable",
        },
      ],
    },
    () => new Date("2026-04-29T00:00:00.000Z"),
  );

  assert.equal(report.candidates.length, 1);
  const row = report.candidates[0];
  assert.ok(row);
  assert.equal(row?.token_or_slug, "WF3CB");
  assert.equal(row?.filter_slug, "wf3cb");
  assert.equal(row?.blocked_oem_count, 1);
  assert.equal(row?.non_oem_link_count, 1);
  assert.equal(row?.direct_buyable_non_oem_count, 1);
  assert.equal(
    row?.recommended_action,
    "Review and promote an existing direct_buyable non-OEM link to primary CTA for this filter.",
  );
});

test("does not claim immediate CTA improvement when direct_buyable non-oem is zero", () => {
  const report = buildFrigidaireNextMonetizableCandidatesReportFromData(
    {
      filters: [
        {
          id: "f-3",
          slug: "ultrawf",
          oem_part_number: "ULTRAWF",
          brand_id: "b-frigidaire",
        },
      ],
      links: [
        {
          filter_id: "f-3",
          retailer_key: "oem-parts-catalog",
          affiliate_url: "https://www.frigidaire.com/en/catalogsearch/result/?q=ULTRAWF",
          browser_truth_classification: "likely_not_found",
        },
        {
          filter_id: "f-3",
          retailer_key: "amazon",
          affiliate_url: "https://www.amazon.com/dp/B000ULTRA1",
          browser_truth_classification: "likely_valid",
        },
      ],
    },
    () => new Date("2026-04-29T00:00:00.000Z"),
  );
  assert.equal(report.candidates.length, 1);
  assert.equal(report.candidates[0]?.direct_buyable_non_oem_count, 0);
  assert.equal(
    report.candidates[0]?.recommended_action,
    "Collect browser-truth evidence on existing non-OEM links; promote only after direct_buyable proof.",
  );
  assert.equal(
    report.recommended_next_action,
    "No immediate safe-CTA uplift candidates are proven; gather browser-truth evidence for non-OEM links first.",
  );
});

test("unknown payload when source query fails", async () => {
  const report = await buildFrigidaireNextMonetizableCandidatesReport({
    fetchData: async () => {
      throw new Error("db unavailable");
    },
  });
  assert.equal(report.runtime_status, "UNKNOWN_DB_UNAVAILABLE");
  assert.equal(report.candidates.length, 0);
  assert.equal(report.known_unknowns.length > 0, true);
});

test("empty but readable dataset returns OK with no known unknowns", () => {
  const report = buildFrigidaireNextMonetizableCandidatesReportFromData(
    { filters: [], links: [] },
    () => new Date("2026-04-29T00:00:00.000Z"),
  );
  assert.equal(report.runtime_status, "OK");
  assert.equal(report.candidates.length, 0);
  assert.deepEqual(report.known_unknowns, []);
  assert.equal(
    report.recommended_next_action,
    "No Frigidaire candidate with blocked OEM plus non-OEM link exists in current data.",
  );
});

