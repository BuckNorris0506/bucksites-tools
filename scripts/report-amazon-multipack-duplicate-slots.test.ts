import assert from "node:assert/strict";
import test from "node:test";

import { buildAmazonMultipackDuplicateSlotsReport } from "./report-amazon-multipack-duplicate-slots";

const BATCH_JSON = JSON.stringify({
  staged_candidates: [
    {
      token: "ADQ36006101",
      canonical_dp_url: "https://www.amazon.com/dp/B00YD2IK1C",
      asin: "B00YD2IK1C",
    },
    {
      token: "DA29-00003G",
      canonical_dp_url: "https://www.amazon.com/dp/B00W0TO8WU",
      asin: "B00W0TO8WU",
    },
    {
      token: "DA29-00020A",
      canonical_dp_url: "https://www.amazon.com/dp/B085C8P86W",
      asin: "B085C8P86W",
    },
  ],
});

test("diagnoses duplicate slots with recommendations", async () => {
  const report = await buildAmazonMultipackDuplicateSlotsReport({
    now: () => new Date("2026-04-30T00:00:00.000Z"),
    readTextFile: () => BATCH_JSON,
    fetchFilters: async () => [
      { id: "f1", slug: "adq36006101", oem_part_number: "ADQ36006101" },
      { id: "f2", slug: "da29-00003g", oem_part_number: "DA29-00003G" },
      { id: "f3", slug: "da29-00020a", oem_part_number: "DA29-00020A" },
    ],
    fetchRetailerLinks: async () => ({
      buyableSubtypeColumnPresent: true,
      rows: [
        {
          id: "r1",
          filter_id: "f1",
          retailer_key: "amazon",
          affiliate_url: "https://www.amazon.com/dp/B000111111",
          browser_truth_classification: "direct_buyable",
          browser_truth_buyable_subtype: null,
          is_primary: true,
          status: "approved",
        },
        {
          id: "r2",
          filter_id: "f2",
          retailer_key: "amazon",
          affiliate_url: "https://www.amazon.com/dp/B00W0TO8WU",
          browser_truth_classification: "direct_buyable",
          browser_truth_buyable_subtype: "MULTIPACK_DIRECT_BUYABLE",
          is_primary: false,
          status: "approved",
        },
      ],
    }),
  });

  assert.equal(report.report_name, "buckparts_amazon_multipack_duplicate_slots_v1");
  assert.equal(report.generated_at, "2026-04-30T00:00:00.000Z");
  assert.equal(report.read_only, true);
  assert.equal(report.data_mutation, false);
  assert.equal(report.rows.length, 3);

  const adq = report.rows.find((row) => row.token === "ADQ36006101");
  assert.equal(adq?.recommendation, "UPDATE_EXISTING_SLOT_TO_MULTIPACK_SUBTYPE");

  const da3g = report.rows.find((row) => row.token === "DA29-00003G");
  assert.equal(da3g?.recommendation, "NOOP_EXISTING_SLOT_ALREADY_SAFE");

  const da20a = report.rows.find((row) => row.token === "DA29-00020A");
  assert.equal(da20a?.recommendation, "UNKNOWN_REVIEW_REQUIRED");
  assert.equal(da20a?.existing_link_id, "UNKNOWN");
});

test("records known unknown when subtype column missing", async () => {
  const report = await buildAmazonMultipackDuplicateSlotsReport({
    readTextFile: () => BATCH_JSON,
    fetchFilters: async () => [],
    fetchRetailerLinks: async () => ({ rows: [], buyableSubtypeColumnPresent: false }),
  });
  assert.equal(report.known_unknowns.some((item) => /buyable_subtype column not present/i.test(item)), true);
});
