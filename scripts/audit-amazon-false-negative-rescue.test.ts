import assert from "node:assert/strict";
import test from "node:test";

import * as enrichmentModuleNs from "./lib/discovery-candidate-enrichment";
import { buildAmazonFalseNegativeRescueAudit } from "./audit-amazon-false-negative-rescue";

const enrichmentModule =
  (enrichmentModuleNs as { default?: unknown }).default ?? enrichmentModuleNs;
const { canonicalAmazonDpUrl } = enrichmentModule as {
  canonicalAmazonDpUrl: typeof import("./lib/discovery-candidate-enrichment").canonicalAmazonDpUrl;
};

test("manual URLs canonicalize to /dp/<ASIN>", () => {
  assert.equal(
    canonicalAmazonDpUrl(
      "https://www.amazon.com/Pentek-EP-20BB-Carbon-Cartridge-Microns/dp/B00310Y9KI",
    ),
    "https://www.amazon.com/dp/B00310Y9KI",
  );
  assert.equal(
    canonicalAmazonDpUrl(
      "https://www.amazon.com/Culligan-RFC-BBSA-Premium-Filter-Gallons/dp/B000BQN6MM",
    ),
    "https://www.amazon.com/dp/B000BQN6MM",
  );
  assert.equal(
    canonicalAmazonDpUrl(
      "https://www.amazon.com/Aqua-Pure-Whole-House-Replacement-Filter/dp/B000W0TTJQ",
    ),
    "https://www.amazon.com/dp/B000W0TTJQ",
  );
});

test("absent DB row becomes ABSENT_FROM_DB", async () => {
  const report = await buildAmazonFalseNegativeRescueAudit({
    fetchRetailerRows: async () => [],
    fetchTitleByCanonicalUrl: async () => null,
  });
  assert.equal(report.findings.length, 3);
  assert.equal(report.findings.every((item) => item.false_negative_type === "ABSENT_FROM_DB"), true);
});

test("present blocked row becomes PRESENT_BUT_BLOCKED", async () => {
  const report = await buildAmazonFalseNegativeRescueAudit({
    fetchRetailerRows: async () => [
      {
        table: "whole_house_water_retailer_links",
        id: "row-1",
        retailer_key: "amazon",
        affiliate_url: "https://www.amazon.com/dp/B00310Y9KI",
        browser_truth_classification: "likely_valid",
        status: "approved",
      },
    ],
    fetchTitleByCanonicalUrl: async () => "Pentek EP-20BB Carbon",
  });
  const target = report.findings.find((item) => item.asin === "B00310Y9KI");
  assert.equal(Boolean(target), true);
  assert.equal(target?.false_negative_type, "PRESENT_BUT_BLOCKED");
});

test("report is read-only", async () => {
  const report = await buildAmazonFalseNegativeRescueAudit({
    fetchRetailerRows: async () => [],
    fetchTitleByCanonicalUrl: async () => null,
  });
  assert.equal(report.read_only, true);
  assert.equal(report.data_mutation, false);
});

test("required_system_change emitted when false negative exists", async () => {
  const report = await buildAmazonFalseNegativeRescueAudit({
    fetchRetailerRows: async () => [],
    fetchTitleByCanonicalUrl: async () => null,
  });
  assert.equal(report.system_failure_summary.did_system_miss_valid_amazon_pdps, true);
  assert.equal(report.required_system_change.trim().length > 0, true);
});
