import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  buildDeterministicFridgeBuyerPathBatchProposalIdV1,
  buildFridgeBuyerPathBatchProposalFromPacketV1,
  buildFridgeBuyerPathBatchProposalV1,
  FRIDGE_BUYER_PATH_BATCH_PROPOSAL_CONTRACT_V1,
  isFridgeBuyerPathBatchProposalEligibleRowV1,
} from "./fridge-buyer-path-batch-proposal-v1";
import type { FridgeBuyerPathOwnerReviewPacketReportV1 } from "./fridge-buyer-path-owner-review-packet-v1";

const REPO_ROOT = process.cwd();

const REPORT_SCRIPT_SOURCE = readFileSync(
  path.join(REPO_ROOT, "scripts/report-fridge-buyer-path-batch-proposal-v1.ts"),
  "utf8",
);

const LIB_SOURCE = readFileSync(
  path.join(REPO_ROOT, "scripts/lib/fridge-buyer-path-batch-proposal-v1.ts"),
  "utf8",
);

function packetFixtureRow(
  partial: Partial<FridgeBuyerPathOwnerReviewPacketReportV1["rows"][number]> &
    Pick<FridgeBuyerPathOwnerReviewPacketReportV1["rows"][number], "slug">,
): FridgeBuyerPathOwnerReviewPacketReportV1["rows"][number] {
  return {
    rank: 1,
    oem_token: partial.slug.toUpperCase(),
    brand: "whirlpool",
    factory_state: "publishable_amazon_candidate",
    priority_score: 850,
    evidence_artifact_paths: [`data/evidence/amazon-${partial.slug}-live-outcome.json`],
    evidence_file_exists: true,
    primary_evidence_artifact_path: `data/evidence/amazon-${partial.slug}-live-outcome.json`,
    artifact_contract: null,
    artifact_report_name: "fixture",
    live_outcome_status: "LIVE_OUTCOME_RECORDED",
    committed_buyer_path_status: "SEARCH_PLACEHOLDER",
    why_not_gated: "fixture",
    owner_review_ready: true,
    committed_live_row_present: true,
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
    browser_truth_buyable_subtype: null,
    browser_truth_notes: null,
    browser_truth_checked_at: null,
    asin: "B000FIXED",
    canonical_url: null,
    evidence_mutation_ready: false,
    apply_mutation_authorized: false,
    csv_apply_authorized: false,
    row_review_status: "READY_FOR_OWNER_REVIEW",
    row_blockers: [],
    ...partial,
  };
}

function packetFixture(
  rows: FridgeBuyerPathOwnerReviewPacketReportV1["rows"],
): FridgeBuyerPathOwnerReviewPacketReportV1 {
  return {
    contract: "fridge_buyer_path_owner_review_packet_v1",
    report_name: "fridge_buyer_path_owner_review_packet_v1",
    read_only: true,
    data_mutation: false,
    generated_at: "2026-05-31T00:00:00.000Z",
    wedge: "refrigerator_water",
    source_bridge_report: "fridge_buyer_path_owner_review_bridge_v1",
    summary: {
      cohort_count: rows.length,
      owner_review_ready_count: rows.filter((r) => r.owner_review_ready).length,
      row_review_ready_count: rows.filter((r) => r.row_review_status === "READY_FOR_OWNER_REVIEW").length,
      missing_committed_live_row_count: 0,
      missing_destination_url_count: 0,
      missing_affiliate_url_count: 0,
      mutation_ready_count: 0,
      formal_batch_exists: false,
      formal_batch_registry_path: null,
      apply_authorization_present: false,
      apply_mutation_authorized: false,
      csv_apply_authorized: false,
      retailer_links_mutation_authorized: false,
      supabase_mutation_authorized: false,
      public_ui_mutation_authorized: false,
      buy_link_mutation_authorized: false,
      recommended_next_action: "fixture",
    },
    rows,
    proven_facts: [],
    unknown_facts: [],
  };
}

test("fridge buyer-path batch proposal is read-only", () => {
  const report = buildFridgeBuyerPathBatchProposalV1({ rootDir: REPO_ROOT });
  assert.equal(report.contract, FRIDGE_BUYER_PATH_BATCH_PROPOSAL_CONTRACT_V1);
  assert.equal(report.read_only, true);
  assert.equal(report.data_mutation, false);
  assert.equal(report.owner_approval_required, true);
  for (const row of report.proposed_rows) {
    assert.equal(row.apply_mutation_authorized, false);
    assert.equal(row.csv_apply_authorized, false);
  }
});

test("proposal sources avoid forbidden write/mutation imports", () => {
  for (const source of [REPORT_SCRIPT_SOURCE, LIB_SOURCE]) {
    assert.ok(!source.includes("writeFileSync"));
    assert.ok(!source.includes("mkdirSync"));
    assert.ok(!/from ["'].*supabase/i.test(source));
    assert.ok(!source.includes("@netlify"));
  }
});

test("proposal builds from packet rows not hardcoded slug list", () => {
  const packet = packetFixture([
    packetFixtureRow({ slug: "eligible-a", rank: 1 }),
    packetFixtureRow({
      slug: "ineligible-b",
      rank: 2,
      owner_review_ready: false,
      row_review_status: "MISSING_COMMITTED_ROW",
      committed_live_row_present: false,
      destination_url: null,
      affiliate_url: null,
    }),
    packetFixtureRow({ slug: "eligible-c", rank: 3 }),
  ]);
  const proposal = buildFridgeBuyerPathBatchProposalFromPacketV1(packet);
  assert.equal(proposal.proposed_row_count, 2);
  assert.deepEqual(
    proposal.proposed_rows.map((r) => r.slug),
    ["eligible-a", "eligible-c"],
  );
  assert.ok(!proposal.proposed_rows.some((r) => r.slug === "ineligible-b"));
});

test("proposed_row_count matches current packet-ready rows at repo truth", () => {
  const report = buildFridgeBuyerPathBatchProposalV1({ rootDir: REPO_ROOT });
  assert.equal(report.proposed_row_count, 14);
  assert.equal(report.proposed_rows.length, 14);
  assert.equal(report.proposed_rows[0]?.slug, "4396710");
});

test("all mutation authorization fields remain false", () => {
  const report = buildFridgeBuyerPathBatchProposalV1({ rootDir: REPO_ROOT });
  assert.equal(report.apply_authorization_present, false);
  assert.equal(report.apply_mutation_authorized, false);
  assert.equal(report.csv_apply_authorized, false);
  assert.equal(report.retailer_links_mutation_authorized, false);
  assert.equal(report.supabase_mutation_authorized, false);
  assert.equal(report.public_ui_mutation_authorized, false);
  assert.equal(report.buy_link_mutation_authorized, false);
  assert.equal(report.formal_batch_exists, false);
});

test("owner_approval_required is true", () => {
  const report = buildFridgeBuyerPathBatchProposalV1({ rootDir: REPO_ROOT });
  assert.equal(report.owner_approval_required, true);
  assert.ok(report.required_pre_apply_checks.length > 0);
  assert.ok(report.forbidden_mutations.length > 0);
});

test("deterministic proposed_batch_id from slug set", () => {
  const idA = buildDeterministicFridgeBuyerPathBatchProposalIdV1(["b", "a"]);
  const idB = buildDeterministicFridgeBuyerPathBatchProposalIdV1(["a", "b"]);
  assert.equal(idA, idB);
  assert.match(idA, /^fridge-buyer-path-batch-proposal-v1-[0-9a-f]{12}$/);
});

test("isFridgeBuyerPathBatchProposalEligibleRowV1 requires ready review and URLs", () => {
  const ready = packetFixtureRow({ slug: "ready" });
  assert.equal(isFridgeBuyerPathBatchProposalEligibleRowV1(ready), true);
  const missingUrl = packetFixtureRow({
    slug: "missing",
    affiliate_url: null,
    row_review_status: "MISSING_AFFILIATE_URL",
  });
  assert.equal(isFridgeBuyerPathBatchProposalEligibleRowV1(missingUrl), false);
});
