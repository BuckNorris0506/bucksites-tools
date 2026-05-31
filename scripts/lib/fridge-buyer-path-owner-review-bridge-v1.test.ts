import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import type { LargeBatchCoverageFactoryReportV1 } from "@/lib/coverage/large-batch-coverage-factory-v1";

import {
  buildFridgeBuyerPathOwnerReviewBridgeV1,
  findAmazonLiveOutcomeEvidencePathsV1,
  FRIDGE_BATCH_PRODUCTION_RUN_REGISTRY_DIR_REL_V1,
  FRIDGE_BUYER_PATH_OWNER_REVIEW_BRIDGE_CONTRACT_V1,
  FRIDGE_BUYER_PATH_OWNER_REVIEW_BRIDGE_SOURCE_FACTORY_STATE_V1,
  parseAmazonLiveOutcomeStatusV1,
} from "./fridge-buyer-path-owner-review-bridge-v1";

const REPO_ROOT = process.cwd();

const REPORT_SCRIPT_SOURCE = readFileSync(
  path.join(REPO_ROOT, "scripts/report-fridge-buyer-path-owner-review-bridge-v1.ts"),
  "utf8",
);

const LIB_SOURCE = readFileSync(
  path.join(REPO_ROOT, "scripts/lib/fridge-buyer-path-owner-review-bridge-v1.ts"),
  "utf8",
);

test("fridge buyer-path owner-review bridge report is read-only", () => {
  const report = buildFridgeBuyerPathOwnerReviewBridgeV1({ rootDir: REPO_ROOT });
  assert.equal(report.contract, FRIDGE_BUYER_PATH_OWNER_REVIEW_BRIDGE_CONTRACT_V1);
  assert.equal(report.read_only, true);
  assert.equal(report.data_mutation, false);
  assert.equal(report.apply_authorization_present, false);
  for (const row of report.rows) {
    assert.equal(row.apply_mutation_authorized, false);
  }
});

test("report and lib sources avoid forbidden write/mutation imports", () => {
  for (const source of [REPORT_SCRIPT_SOURCE, LIB_SOURCE]) {
    assert.ok(!source.includes("writeFileSync"));
    assert.ok(!source.includes("mkdirSync"));
    assert.ok(!/from ["'].*supabase/i.test(source));
    assert.ok(!source.includes("@netlify"));
  }
  assert.ok(!REPORT_SCRIPT_SOURCE.includes("--write"));
});

test("building bridge read-only does not mutate retailer_links or evidence", () => {
  const csvPath = path.join(REPO_ROOT, "data/retailer_links.csv");
  const evidencePath = path.join(
    REPO_ROOT,
    "data/evidence/amazon-4396710-live-outcome.2026-05-04.json",
  );
  const csvBefore = readFileSync(csvPath, "utf8");
  const evidenceBefore = readFileSync(evidencePath, "utf8");

  buildFridgeBuyerPathOwnerReviewBridgeV1({ rootDir: REPO_ROOT });

  assert.equal(readFileSync(csvPath, "utf8"), csvBefore);
  assert.equal(readFileSync(evidencePath, "utf8"), evidenceBefore);
});

test("top cohort starts with 4396710 from current repo truth", () => {
  const report = buildFridgeBuyerPathOwnerReviewBridgeV1({ rootDir: REPO_ROOT });
  assert.ok(report.rows.length >= 14);
  assert.equal(report.rows[0]?.slug, "4396710");
  assert.equal(
    report.rows[0]?.factory_state,
    FRIDGE_BUYER_PATH_OWNER_REVIEW_BRIDGE_SOURCE_FACTORY_STATE_V1,
  );
});

test("mutation_ready_count is 0 without apply authorization", () => {
  const report = buildFridgeBuyerPathOwnerReviewBridgeV1({ rootDir: REPO_ROOT });
  assert.equal(report.summary.mutation_ready_count, 0);
  assert.equal(report.apply_authorization_present, false);
});

test("formal_batch_exists is false — not invented when run-registry absent", () => {
  const report = buildFridgeBuyerPathOwnerReviewBridgeV1({ rootDir: REPO_ROOT });
  assert.equal(report.summary.formal_batch_exists, false);
  assert.equal(report.summary.formal_batch_registry_path, null);
  assert.ok(
    report.proven_facts.some((f) =>
      f.includes(FRIDGE_BATCH_PRODUCTION_RUN_REGISTRY_DIR_REL_V1),
    ),
  );
});

test("findAmazonLiveOutcomeEvidencePathsV1 returns live-outcome paths only", () => {
  const paths = findAmazonLiveOutcomeEvidencePathsV1("4396710", [
    "amazon-4396710-live-outcome.2026-05-04.json",
    "amazon-4396710-oem-pdp-evidence.2026-05-04.json",
  ]);
  assert.deepEqual(paths, ["data/evidence/amazon-4396710-live-outcome.2026-05-04.json"]);
});

test("parseAmazonLiveOutcomeStatusV1 reads verdict and mutation_ready", () => {
  const parsed = parseAmazonLiveOutcomeStatusV1(
    JSON.stringify({
      verdict: "LIVE_OUTCOME_RECORDED",
      mutation_ready: false,
      browser_evidence: { browser_verdict: "PASS_AS_AFTERMARKET_COMPATIBLE_DIRECT_BUYABLE" },
    }),
  );
  assert.equal(parsed.live_outcome_status, "LIVE_OUTCOME_RECORDED");
  assert.equal(parsed.evidence_mutation_ready, false);
});

test("parseAmazonLiveOutcomeStatusV1 reads legacy committed_live_row shape", () => {
  const parsed = parseAmazonLiveOutcomeStatusV1(
    JSON.stringify({
      final_amazon_cta_state_proven: true,
      post_commit_audit: { status: "PASS" },
      committed_live_row: { browser_truth_classification: "direct_buyable" },
    }),
  );
  assert.equal(parsed.live_outcome_status, "POST_COMMIT_AUDIT_PASS");
});

test("cohort is selected from factory state not hardcoded slug list", () => {
  const factoryFixture: LargeBatchCoverageFactoryReportV1 = {
    report_name: "buckparts_large_batch_coverage_factory_v1",
    read_only: true,
    data_mutation: false,
    generated_at: "2026-05-31T00:00:00.000Z",
    candidate_count: 3,
    top_candidates_limit: 100,
    top_candidates: [
      {
        candidate_key: "zzz-slug",
        slug: "zzz-slug",
        oem_part_number: "ZZZ",
        brand_slug: "whirlpool",
        factory_state: "publishable_no_buy_page",
        priority_score: 900,
        block_reason: null,
        rationale: [],
        sources: [],
        is_live_catalog_row: true,
        is_bulk_catalog_row: true,
        has_gated_buyable_link: false,
        has_search_placeholder_only_links: true,
        waterdrop_recommended: false,
        has_amazon_live_evidence: false,
      },
      {
        candidate_key: "fixture-amazon",
        slug: "fixture-amazon",
        oem_part_number: "FIXTURE",
        brand_slug: "lg",
        factory_state: "publishable_amazon_candidate",
        priority_score: 850,
        block_reason: null,
        rationale: ["fixture"],
        sources: [],
        is_live_catalog_row: true,
        is_bulk_catalog_row: true,
        has_gated_buyable_link: false,
        has_search_placeholder_only_links: true,
        waterdrop_recommended: false,
        has_amazon_live_evidence: true,
      },
    ],
    state_counts: {
      existing_live_product: 0,
      new_product_candidate: 0,
      alias_collision_candidate: 0,
      publishable_no_buy_page: 1,
      publishable_amazon_candidate: 1,
      publishable_waterdrop_candidate: 0,
      evidence_needed: 0,
      blocked_do_not_publish: 1,
    },
    blocked_counts: { total: 1, by_reason: {} },
    source_summary: {} as LargeBatchCoverageFactoryReportV1["source_summary"],
    notes: [],
  };

  const report = buildFridgeBuyerPathOwnerReviewBridgeV1({
    rootDir: REPO_ROOT,
    buildFactoryReport: () => factoryFixture,
    listEvidenceFilenames: () => [],
  });

  assert.equal(report.rows.length, 1);
  assert.equal(report.rows[0]?.slug, "fixture-amazon");
  assert.notEqual(report.rows[0]?.slug, "zzz-slug");
});
