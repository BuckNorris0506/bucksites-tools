import assert from "node:assert/strict";
import test from "node:test";

import { buildAmazonFalseNegativeRescuePreflightReport } from "./preflight-amazon-false-negative-rescue";

const STAGING_JSON = JSON.stringify({
  staged_candidates: [
    {
      token: "RFC-BBSA",
      canonical_dp_url: "https://www.amazon.com/dp/B000BQN6MM",
      asin: "B000BQN6MM",
    },
    {
      token: "AP810",
      canonical_dp_url: "https://www.amazon.com/dp/B000W0TTJQ",
      asin: "B000W0TTJQ",
    },
  ],
});

const TRACKER_JSON = JSON.stringify([
  {
    id: "amazon-associates",
    tagVerified: false,
  },
]);

test("maps staged candidates and reports CLEAR duplicate when absent", async () => {
  const report = await buildAmazonFalseNegativeRescuePreflightReport({
    readTextFile: (absPath) => {
      if (absPath.endsWith("amazon-false-negative-rescue-staging.2026-04-29.json")) return STAGING_JSON;
      return TRACKER_JSON;
    },
    fetchWholeHouseParts: async () => [
      { id: "p1", slug: "rfc-bbsa", oem_part_number: "RFC-BBSA" },
      { id: "p2", slug: "ap810", oem_part_number: "AP810" },
    ],
    fetchWholeHouseRetailerLinks: async () => [],
  });

  assert.equal(report.candidates.length, 2);
  assert.equal(report.candidates.every((c) => c.mapping_status === "OK"), true);
  assert.equal(report.candidates.every((c) => c.duplicate_status === "CLEAR"), true);
});

test("duplicate link marks DUPLICATE_FOUND", async () => {
  const report = await buildAmazonFalseNegativeRescuePreflightReport({
    readTextFile: (absPath) => {
      if (absPath.endsWith("amazon-false-negative-rescue-staging.2026-04-29.json")) return STAGING_JSON;
      return TRACKER_JSON;
    },
    fetchWholeHouseParts: async () => [
      { id: "p1", slug: "rfc-bbsa", oem_part_number: "RFC-BBSA" },
      { id: "p2", slug: "ap810", oem_part_number: "AP810" },
    ],
    fetchWholeHouseRetailerLinks: async () => [
      {
        id: "l1",
        retailer_key: "amazon",
        affiliate_url: "https://www.amazon.com/dp/B000BQN6MM",
        browser_truth_classification: "direct_buyable",
      },
    ],
  });
  const rfc = report.candidates.find((c) => c.token === "RFC-BBSA");
  assert.equal(rfc?.duplicate_status, "DUPLICATE_FOUND");
  assert.equal(rfc?.ready_for_sql_plan, false);
});

test("report is read-only and no mutation", async () => {
  const report = await buildAmazonFalseNegativeRescuePreflightReport({
    readTextFile: (absPath) => {
      if (absPath.endsWith("amazon-false-negative-rescue-staging.2026-04-29.json")) return STAGING_JSON;
      return TRACKER_JSON;
    },
    fetchWholeHouseParts: async () => [
      { id: "p1", slug: "rfc-bbsa", oem_part_number: "RFC-BBSA" },
      { id: "p2", slug: "ap810", oem_part_number: "AP810" },
    ],
    fetchWholeHouseRetailerLinks: async () => [],
  });
  assert.equal(report.read_only, true);
  assert.equal(report.data_mutation, false);
});

test("recommended action says verify mappings before SQL when blocked", async () => {
  const report = await buildAmazonFalseNegativeRescuePreflightReport({
    readTextFile: (absPath) => {
      if (absPath.endsWith("amazon-false-negative-rescue-staging.2026-04-29.json")) return STAGING_JSON;
      return TRACKER_JSON;
    },
    fetchWholeHouseParts: async () => [],
    fetchWholeHouseRetailerLinks: async () => [],
  });
  assert.equal(/verify mappings/i.test(report.recommended_next_action), true);
  assert.equal(report.all_ready_for_sql_plan, false);
});
