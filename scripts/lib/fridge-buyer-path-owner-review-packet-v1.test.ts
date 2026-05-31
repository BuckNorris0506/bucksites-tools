import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  buildFridgeBuyerPathOwnerReviewPacketFromBridgeV1,
  buildFridgeBuyerPathOwnerReviewPacketV1,
  deriveFridgeBuyerPathOwnerReviewRowStatusV1,
  FRIDGE_BUYER_PATH_OWNER_REVIEW_PACKET_CONTRACT_V1,
  parseAmazonLiveOutcomeEvidenceArtifactV1,
} from "./fridge-buyer-path-owner-review-packet-v1";
import type { FridgeBuyerPathOwnerReviewBridgeReportV1 } from "./fridge-buyer-path-owner-review-bridge-v1";

const REPO_ROOT = process.cwd();

const REPORT_SCRIPT_SOURCE = readFileSync(
  path.join(REPO_ROOT, "scripts/report-fridge-buyer-path-owner-review-packet-v1.ts"),
  "utf8",
);

const LIB_SOURCE = readFileSync(
  path.join(REPO_ROOT, "scripts/lib/fridge-buyer-path-owner-review-packet-v1.ts"),
  "utf8",
);

test("fridge buyer-path owner review packet is read-only", () => {
  const report = buildFridgeBuyerPathOwnerReviewPacketV1({ rootDir: REPO_ROOT });
  assert.equal(report.contract, FRIDGE_BUYER_PATH_OWNER_REVIEW_PACKET_CONTRACT_V1);
  assert.equal(report.read_only, true);
  assert.equal(report.data_mutation, false);
  assert.equal(report.summary.apply_authorization_present, false);
  for (const row of report.rows) {
    assert.equal(row.apply_mutation_authorized, false);
    assert.equal(row.csv_apply_authorized, false);
  }
});

test("packet sources avoid forbidden write/mutation imports", () => {
  for (const source of [REPORT_SCRIPT_SOURCE, LIB_SOURCE]) {
    assert.ok(!source.includes("writeFileSync"));
    assert.ok(!source.includes("mkdirSync"));
    assert.ok(!/from ["'].*supabase/i.test(source));
    assert.ok(!source.includes("@netlify"));
    assert.ok(!/gsc/i.test(source));
  }
});

test("building packet read-only does not mutate retailer_links or evidence", () => {
  const csvPath = path.join(REPO_ROOT, "data/retailer_links.csv");
  const evidencePath = path.join(
    REPO_ROOT,
    "data/evidence/amazon-4396710-live-outcome.2026-05-04.json",
  );
  const csvBefore = readFileSync(csvPath, "utf8");
  const evidenceBefore = readFileSync(evidencePath, "utf8");

  buildFridgeBuyerPathOwnerReviewPacketV1({ rootDir: REPO_ROOT });

  assert.equal(readFileSync(csvPath, "utf8"), csvBefore);
  assert.equal(readFileSync(evidencePath, "utf8"), evidenceBefore);
});

test("packet expands all 14 current bridge rows", () => {
  const report = buildFridgeBuyerPathOwnerReviewPacketV1({ rootDir: REPO_ROOT });
  assert.equal(report.summary.cohort_count, 14);
  assert.equal(report.rows.length, 14);
  assert.equal(report.rows[0]?.slug, "4396710");
  assert.equal(report.rows[0]?.rank, 1);
});

test("rows with committed_live_row get normalized destination_url and affiliate_url", () => {
  const report = buildFridgeBuyerPathOwnerReviewPacketV1({ rootDir: REPO_ROOT });
  const row4396710 = report.rows.find((r) => r.slug === "4396710");
  assert.ok(row4396710);
  assert.equal(row4396710!.committed_live_row_present, true);
  assert.equal(row4396710!.destination_url, "https://www.amazon.com/dp/B087PDLZL9");
  assert.equal(
    row4396710!.affiliate_url,
    "https://www.amazon.com/dp/B087PDLZL9?tag=buckparts20-20",
  );
  assert.equal(row4396710!.browser_truth_classification, "direct_buyable");
  assert.equal(row4396710!.row_review_status, "READY_FOR_OWNER_REVIEW");
});

test("mutation authorization remains false and formal_batch_exists false", () => {
  const report = buildFridgeBuyerPathOwnerReviewPacketV1({ rootDir: REPO_ROOT });
  assert.equal(report.summary.mutation_ready_count, 0);
  assert.equal(report.summary.formal_batch_exists, false);
  assert.equal(report.summary.apply_mutation_authorized, false);
  assert.equal(report.summary.csv_apply_authorized, false);
});

test("parseAmazonLiveOutcomeEvidenceArtifactV1 extracts committed_live_row fields", () => {
  const evidenceText = readFileSync(
    path.join(REPO_ROOT, "data/evidence/amazon-4396710-live-outcome.2026-05-04.json"),
    "utf8",
  );
  const parsed = parseAmazonLiveOutcomeEvidenceArtifactV1(evidenceText);
  assert.equal(parsed.artifact_report_name, "buckparts_amazon_4396710_live_outcome_v1");
  assert.equal(parsed.asin, "B087PDLZL9");
  assert.ok(parsed.committed_live_row);
  assert.equal(
    (parsed.committed_live_row as { retailer_key?: string }).retailer_key,
    "amazon",
  );
});

test("deriveFridgeBuyerPathOwnerReviewRowStatusV1 classifies missing committed row", () => {
  const derived = deriveFridgeBuyerPathOwnerReviewRowStatusV1({
    committed_live_row_present: false,
    destination_url: null,
    affiliate_url: null,
  });
  assert.equal(derived.row_review_status, "MISSING_COMMITTED_ROW");
  assert.ok(derived.row_blockers.length > 0);
});

test("packet fixture row expansion uses evidence artifact only", () => {
  const bridgeFixture: FridgeBuyerPathOwnerReviewBridgeReportV1 = {
    contract: "fridge_buyer_path_owner_review_bridge_v1",
    report_name: "fridge_buyer_path_owner_review_bridge_v1",
    read_only: true,
    data_mutation: false,
    generated_at: "2026-05-31T00:00:00.000Z",
    wedge: "refrigerator_water",
    source_factory_report: "buckparts_large_batch_coverage_factory_v1",
    source_factory_state: "publishable_amazon_candidate",
    apply_authorization_present: false,
    rows: [
      {
        slug: "fixture-slug",
        oem_token: "FIX",
        brand: "whirlpool",
        factory_state: "publishable_amazon_candidate",
        priority_score: 850,
        evidence_artifact_paths: ["data/evidence/fixture-amazon-live-outcome.json"],
        live_outcome_status: "LIVE_OUTCOME_RECORDED",
        committed_buyer_path_status: "SEARCH_PLACEHOLDER",
        why_not_gated: "fixture",
        owner_review_ready: true,
        apply_mutation_authorized: false,
      },
    ],
    summary: {
      cohort_count: 1,
      owner_review_ready_count: 1,
      mutation_ready_count: 0,
      missing_evidence_count: 0,
      formal_batch_exists: false,
      formal_batch_registry_path: null,
      recommended_next_action: "fixture",
    },
    proven_facts: [],
    unknown_facts: [],
  };

  const evidenceJson = JSON.stringify({
    report_name: "fixture_live_outcome_v1",
    verdict: "LIVE_OUTCOME_RECORDED",
    asin: "B000FIXED",
    canonical_url: "https://www.amazon.com/dp/B000FIXED",
    committed_live_row: {
      filter_id: "filter-fix",
      link_id: "link-fix",
      retailer_key: "amazon",
      retailer_name: "Amazon",
      retailer_slug: "amazon",
      destination_url: "https://www.amazon.com/dp/B000FIXED",
      affiliate_url: "https://www.amazon.com/dp/B000FIXED?tag=buckparts20-20",
      status: "approved",
      source: "manual",
      is_primary: false,
      browser_truth_classification: "direct_buyable",
      browser_truth_buyable_subtype: "MULTIPACK_DIRECT_BUYABLE",
      browser_truth_notes: "fixture",
      browser_truth_checked_at: "2026-05-31T00:00:00.000Z",
    },
  });

  const report = buildFridgeBuyerPathOwnerReviewPacketFromBridgeV1({
    bridge: bridgeFixture,
    rootDir: REPO_ROOT,
    readTextFile: (abs) => {
      if (abs.endsWith("fixture-amazon-live-outcome.json")) return evidenceJson;
      throw new Error(`unexpected read: ${abs}`);
    },
    fileExists: (abs) => abs.endsWith("fixture-amazon-live-outcome.json"),
  });

  assert.equal(report.rows.length, 1);
  assert.equal(report.rows[0]?.destination_url, "https://www.amazon.com/dp/B000FIXED");
  assert.equal(report.rows[0]?.row_review_status, "READY_FOR_OWNER_REVIEW");
});
