import assert from "node:assert/strict";
import test from "node:test";

import { buildAmazonMultipackConversionBatchPreflightReport } from "./preflight-amazon-multipack-conversion-batch";

const BATCH_JSON = JSON.stringify({
  staged_candidates: [
    {
      token: "ADQ36006101",
      canonical_dp_url: "https://www.amazon.com/dp/B00YD2IK1C",
      asin: "B00YD2IK1C",
      buyable_subtype: "MULTIPACK_DIRECT_BUYABLE",
      browser_truth_classification_candidate: "direct_buyable",
      confidence: "exact",
      mutation_status: "NOT_APPLIED",
    },
    {
      token: "DA29-00003G",
      canonical_dp_url: "https://www.amazon.com/dp/B00W0TO8WU",
      asin: "B00W0TO8WU",
      buyable_subtype: "MULTIPACK_DIRECT_BUYABLE",
      browser_truth_classification_candidate: "direct_buyable",
      confidence: "exact",
      mutation_status: "NOT_APPLIED",
    },
  ],
});

const TRACKER_VERIFIED = JSON.stringify([
  {
    id: "amazon-associates",
    tagVerified: true,
  },
]);

const TRACKER_UNVERIFIED = JSON.stringify([
  {
    id: "amazon-associates",
    tagVerified: false,
  },
]);

test("candidates are ready when mapping clear, no duplicates, gate passes, and tag is verified", async () => {
  const report = await buildAmazonMultipackConversionBatchPreflightReport({
    readTextFile: (absPath) => {
      if (absPath.endsWith("amazon-multipack-conversion-batch.2026-04-30.json")) return BATCH_JSON;
      return TRACKER_VERIFIED;
    },
    fetchFilters: async () => [
      { id: "f1", slug: "adq36006101", oem_part_number: "ADQ36006101" },
      { id: "f2", slug: "da29-00003g", oem_part_number: "DA29-00003G" },
    ],
    fetchRetailerLinks: async () => [],
  });

  assert.equal(report.candidates.length, 2);
  assert.equal(report.candidates.every((candidate) => candidate.mapping_status === "OK"), true);
  assert.equal(report.candidates.every((candidate) => candidate.duplicate_status === "CLEAR"), true);
  assert.equal(report.candidates.every((candidate) => candidate.gate_status === "PASS"), true);
  assert.equal(report.candidates.every((candidate) => candidate.ready_for_sql_plan), true);
  assert.equal(report.all_ready_for_sql_plan, true);
});

test("duplicate slot blocks readiness", async () => {
  const report = await buildAmazonMultipackConversionBatchPreflightReport({
    readTextFile: (absPath) => {
      if (absPath.endsWith("amazon-multipack-conversion-batch.2026-04-30.json")) return BATCH_JSON;
      return TRACKER_VERIFIED;
    },
    fetchFilters: async () => [
      { id: "f1", slug: "adq36006101", oem_part_number: "ADQ36006101" },
      { id: "f2", slug: "da29-00003g", oem_part_number: "DA29-00003G" },
    ],
    fetchRetailerLinks: async () => [
      {
        id: "r1",
        filter_id: "f1",
        retailer_key: "amazon",
        affiliate_url: "https://www.amazon.com/dp/B00YD2IK1C",
        browser_truth_classification: "direct_buyable",
      },
    ],
  });

  const candidate = report.candidates.find((row) => row.token === "ADQ36006101");
  assert.equal(candidate?.duplicate_status, "DUPLICATE_FOUND");
  assert.equal(candidate?.ready_for_sql_plan, false);
  assert.equal(report.all_ready_for_sql_plan, false);
});

test("unverified tag blocks readiness and keeps report read-only", async () => {
  const report = await buildAmazonMultipackConversionBatchPreflightReport({
    readTextFile: (absPath) => {
      if (absPath.endsWith("amazon-multipack-conversion-batch.2026-04-30.json")) return BATCH_JSON;
      return TRACKER_UNVERIFIED;
    },
    fetchFilters: async () => [
      { id: "f1", slug: "adq36006101", oem_part_number: "ADQ36006101" },
      { id: "f2", slug: "da29-00003g", oem_part_number: "DA29-00003G" },
    ],
    fetchRetailerLinks: async () => [],
  });

  assert.equal(report.read_only, true);
  assert.equal(report.data_mutation, false);
  assert.equal(report.all_ready_for_sql_plan, false);
  assert.equal(report.candidates.every((candidate) => candidate.amazon_tag_verified === false), true);
  assert.equal(
    report.candidates.every((candidate) => candidate.blockers.includes("amazon tag not verified")),
    true,
  );
});
