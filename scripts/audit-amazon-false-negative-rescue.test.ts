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
    fetchWholeHouseParts: async () => [],
    fetchTitleByCanonicalUrl: async () => null,
  });
  assert.equal(report.findings.length, 3);
  assert.equal(report.findings.every((item) => item.false_negative_type === "ABSENT_FROM_DB"), true);
});

test("exact URL present and direct_buyable becomes EXACT_URL_PRESENT", async () => {
  const report = await buildAmazonFalseNegativeRescueAudit({
    fetchWholeHouseParts: async () => [{ id: "part-ep", slug: "ep-20bb", oem_part_number: "EP-20BB" }],
    fetchRetailerRows: async () => [
      {
        table: "whole_house_water_retailer_links",
        id: "row-1",
        whole_house_water_part_id: "part-ep",
        retailer_key: "amazon",
        affiliate_url: "https://www.amazon.com/dp/B00310Y9KI",
        browser_truth_classification: "direct_buyable",
        status: "approved",
      },
    ],
    fetchTitleByCanonicalUrl: async () => "Pentek EP-20BB Carbon",
  });
  const target = report.findings.find((item) => item.asin === "B00310Y9KI");
  assert.equal(Boolean(target), true);
  assert.equal(target?.false_negative_type, "EXACT_URL_PRESENT");
  assert.equal(target?.alternate_manual_amazon_pdp, false);
});

test("same part amazon slot direct_buyable becomes SAME_PART_AMAZON_SLOT_PRESENT_DIRECT_BUYABLE", async () => {
  const report = await buildAmazonFalseNegativeRescueAudit({
    fetchWholeHouseParts: async () => [{ id: "part-rfc", slug: "culligan-rfc-bbsa", oem_part_number: "RFC-BBSA" }],
    fetchRetailerRows: async () => [
      {
        table: "whole_house_water_retailer_links",
        id: "row-rfc",
        whole_house_water_part_id: "part-rfc",
        retailer_key: "amazon",
        affiliate_url: "https://www.amazon.com/dp/B074DQP3ZL",
        browser_truth_classification: "direct_buyable",
        status: "approved",
      },
    ],
    fetchTitleByCanonicalUrl: async () => "RFC-BBSA compatible",
  });
  const target = report.findings.find((item) => item.token === "RFC-BBSA");
  assert.equal(Boolean(target), true);
  assert.equal(target?.false_negative_type, "SAME_PART_AMAZON_SLOT_PRESENT_DIRECT_BUYABLE");
  assert.equal(target?.alternate_manual_amazon_pdp, true);
});

test("same part slot blocked becomes PRESENT_BUT_BLOCKED", async () => {
  const report = await buildAmazonFalseNegativeRescueAudit({
    fetchWholeHouseParts: async () => [{ id: "part-ep", slug: "ep-20bb", oem_part_number: "EP-20BB" }],
    fetchRetailerRows: async () => [
      {
        table: "whole_house_water_retailer_links",
        id: "row-1",
        whole_house_water_part_id: "part-ep",
        retailer_key: "amazon",
        affiliate_url: "https://www.amazon.com/dp/B000BQN6MM",
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
    fetchWholeHouseParts: async () => [],
    fetchTitleByCanonicalUrl: async () => null,
  });
  assert.equal(report.read_only, true);
  assert.equal(report.data_mutation, false);
});

test("required_system_change emitted when false negative exists", async () => {
  const report = await buildAmazonFalseNegativeRescueAudit({
    fetchRetailerRows: async () => [],
    fetchWholeHouseParts: async () => [],
    fetchTitleByCanonicalUrl: async () => null,
  });
  assert.equal(report.system_failure_summary.did_system_miss_valid_amazon_pdps, true);
  assert.equal(report.required_system_change.trim().length > 0, true);
  assert.equal(/part\+amazon-slot/i.test(report.required_system_change), true);
});
