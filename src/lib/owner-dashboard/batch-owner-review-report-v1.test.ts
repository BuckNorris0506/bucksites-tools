import assert from "node:assert/strict";
import test from "node:test";

import { BATCH_NON_AMAZON_PDP_QUEUE_ROW_ID_V1 } from "./batch-production-non-amazon-pdp-source-v1";
import {
  BATCH_EVIDENCE_COLLECTION_PLAN_CONTRACT_V1,
  type BatchEvidenceCollectionPlanV1,
} from "./batch-evidence-collection-plan-v1";
import {
  BATCH_OWNER_SCREENSHOT_DRAFT_PACKET_CONTRACT_V1,
  buildBatchOwnerScreenshotDraftPacketV1,
  type BatchOwnerScreenshotDraftPacketV1,
} from "./batch-owner-screenshot-draft-packet-v1";
import {
  BATCH_OWNER_DECISION_OPTIONS_V1,
  BATCH_OWNER_REVIEW_REPORT_CONTRACT_V1,
  BATCH_OWNER_REVIEW_REPORT_WRITE_CONTRACT_V1,
  batchOwnerReviewReportWriteGrantsProductionWrite,
  buildBatchOwnerReviewReportMarkdownV1,
  summarizeBatchOwnerReviewReportV1,
  validateBatchOwnerReviewReportOutputPathV1,
  writeBatchOwnerReviewReportV1,
} from "./batch-owner-review-report-v1";
import {
  OwnerScreenshotFactsDraftOverwriteErrorV1,
  OwnerScreenshotFactsDraftPathErrorV1,
} from "./batch-owner-screenshot-facts-template-draft-write-v1";
import { runReportBatchOwnerReviewV1 } from "../../../scripts/report-batch-owner-review";

const REPO_ROOT = process.cwd();
const TEST_OUT = "data/batch-production/drafts/test-owner-review-report.md";

const NON_AMAZON_ROWS = [
  {
    row_id: "da97-08006b",
    token: "DA97-08006B",
    url: "https://samsungparts.com/products/da97-08006b",
    notes: "Samsung Parts PDP; exact token in title.",
  },
  {
    row_id: "da97-15217d",
    token: "DA97-15217D",
    url: "https://samsungparts.com/products/da97-15217d-refrigerator-ice-maker",
    notes: "Ice maker assembly PDP.",
  },
  {
    row_id: "da29-00012b",
    token: "DA29-00012B",
    url: "https://www.appliancepartspros.com/part/da29-00012b",
    notes: "APP PDP observation.",
  },
  {
    row_id: "adq75795101",
    token: "ADQ75795101",
    url: "https://www.allfilters.com/lg-adq75795101-refrigerator-water-filter",
    notes: "AllFilters PDP observation.",
  },
  {
    row_id: "rpwfe",
    token: "RPWFE",
    url: "https://www.geapplianceparts.com/store/parts/spec/RPWFE",
    notes: "GE spec PDP observation.",
  },
] as const;

function nonAmazonPlan(): BatchEvidenceCollectionPlanV1 {
  return {
    contract: BATCH_EVIDENCE_COLLECTION_PLAN_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    may_write_evidence: false,
    automation_input: false,
    generated_at: "t",
    source_review_contract: "batch_production_review_report_v1",
    source_review_generated_at: "t",
    plan_row_count: NON_AMAZON_ROWS.length,
    layer_6_founder_only_approval: "NOT_PROVEN",
    no_evidence_write_attestation: "x",
    rows: NON_AMAZON_ROWS.map((r) => ({
      row_id: r.row_id,
      token: r.token,
      slug: r.row_id,
      source_queue_row_id: BATCH_NON_AMAZON_PDP_QUEUE_ROW_ID_V1,
      evidence_prefix: `data/evidence/amazon-${r.row_id}-`,
      required_checks: [],
      screenshot_needed: true,
      owner_browser_required: true,
      may_write_evidence: false,
      may_mutate: false,
      recommended_next_action: "owner_browser_capture_required",
      review_classification: "needs_more_evidence",
      review_missing_evidence: [],
    })),
    proven_facts: [],
    unknown_facts: [],
  };
}

function nonAmazonReadyFacts() {
  return NON_AMAZON_ROWS.map((r) => ({
    row_id: r.row_id,
    token: r.token,
    filter_slug: r.row_id,
    screenshot_sources: [
      { label: "agent browser observation", path: "", committed_to_repo: false },
    ],
    page_kind: "product_detail_page" as const,
    token_visible_in_pdp_title: true,
    token_visible_elsewhere_on_page: true,
    seller_controlled_pdp_identity: true,
    buy_path_visible: true,
    stock_status: "in_stock",
    price_visible_usd: 99.99,
    sold_by: "Retailer",
    oem_or_aftermarket: "oem_official" as const,
    relationship_notes: r.notes,
    asin: null,
    canonical_url: r.url,
    seller_title_visible: `${r.token} product title`,
  }));
}

function fiveRowReadyReviewFixture(): BatchOwnerScreenshotDraftPacketV1 {
  return buildBatchOwnerScreenshotDraftPacketV1({
    plan: nonAmazonPlan(),
    factsInput: { facts: nonAmazonReadyFacts() },
    generated_at: "2026-05-17T12:00:00.000Z",
  });
}

function mockFs(initialExists = false) {
  const files = new Map<string, string>();
  return {
    exists: (p: string) => files.has(p) || initialExists,
    mkdir: () => {},
    writeFile: (p: string, content: string) => {
      files.set(p, content);
    },
    files,
  };
}

test("markdown includes all 5 owner-review-ready rows", () => {
  const review = fiveRowReadyReviewFixture();
  const md = buildBatchOwnerReviewReportMarkdownV1(review);
  const summary = summarizeBatchOwnerReviewReportV1(review);

  assert.equal(summary.total_rows, 5);
  assert.equal(summary.owner_review_ready_rows, 5);
  assert.equal(summary.mutation_ready_rows, 0);
  assert.equal(summary.blocked_rows, 0);

  for (const row of NON_AMAZON_ROWS) {
    assert.match(md, new RegExp(row.token));
    assert.match(md, new RegExp(row.row_id));
  }
  assert.match(md, /oem_official \| yes \|/);
  assert.match(md, /DIRECT_BUYABLE_EXACT_TOKEN_OEM/);
});

test("boundary box and Layer 6 NOT_PROVEN are explicit", () => {
  const md = buildBatchOwnerReviewReportMarkdownV1(fiveRowReadyReviewFixture());
  assert.match(md, /read_only.*true/i);
  assert.match(md, /data_mutation.*false/i);
  assert.match(md, /may_mutate.*false/i);
  assert.match(md, /NOT_PROVEN/);
  assert.match(md, /does not write `data\/evidence\//);
});

test("owner decision options do not grant mutation authority", () => {
  const md = buildBatchOwnerReviewReportMarkdownV1(fiveRowReadyReviewFixture());
  for (const opt of BATCH_OWNER_DECISION_OPTIONS_V1) {
    assert.match(md, new RegExp(opt));
  }
  assert.match(md, /does not authorize.*Supabase/i);
  assert.match(md, /retailer_links.*mutation/i);
  assert.match(md, /mutation_ready.*false/i);
  assert.match(md, /approve_for_next_planning_only.*not.*production mutation/i);
});

test("validateBatchOwnerReviewReportOutputPathV1 refuses forbidden prefixes", () => {
  const forbidden = [
    "data/evidence/report.md",
    "data/retailer_links/report.md",
    "data/owner-decisions/report.md",
    "src/report.md",
    "scripts/report.md",
    ".github/report.md",
  ];
  for (const p of forbidden) {
    assert.throws(
      () => validateBatchOwnerReviewReportOutputPathV1(REPO_ROOT, p),
      OwnerScreenshotFactsDraftPathErrorV1,
    );
  }
});

test("validateBatchOwnerReviewReportOutputPathV1 requires .md under drafts", () => {
  assert.throws(
    () =>
      validateBatchOwnerReviewReportOutputPathV1(
        REPO_ROOT,
        "data/batch-production/drafts/foo.json",
      ),
    OwnerScreenshotFactsDraftPathErrorV1,
  );
  const ok = validateBatchOwnerReviewReportOutputPathV1(REPO_ROOT, TEST_OUT);
  assert.ok(ok.repoRelativePosix.endsWith(".md"));
});

test("stdout mode returns markdown without writing", () => {
  const review = fiveRowReadyReviewFixture();
  const json = JSON.stringify(review);
  const result = runReportBatchOwnerReviewV1({
    argv: ["--review", "/tmp/review.json"],
    repoRoot: REPO_ROOT,
    readFile: () => json,
  });
  assert.equal(result.mode, "stdout");
  if (result.mode !== "stdout") return;
  assert.match(result.markdown, /Batch Production Lane — Owner Review Report/);
  assert.equal(result.review_row_count, 5);
});

test("writeBatchOwnerReviewReportV1 writes only under drafts and summary is read-only", () => {
  const fs = mockFs(false);
  const review = fiveRowReadyReviewFixture();
  const { summary, markdown } = writeBatchOwnerReviewReportV1({
    repoRoot: REPO_ROOT,
    outArg: TEST_OUT,
    review,
    force: false,
    fs,
  });
  assert.equal(summary.contract, BATCH_OWNER_REVIEW_REPORT_WRITE_CONTRACT_V1);
  assert.equal(batchOwnerReviewReportWriteGrantsProductionWrite(summary), false);
  assert.equal(summary.wrote_review_file, true);
  assert.match(markdown, new RegExp(BATCH_OWNER_REVIEW_REPORT_CONTRACT_V1));
  const { absolutePath } = validateBatchOwnerReviewReportOutputPathV1(REPO_ROOT, TEST_OUT);
  assert.ok(fs.files.has(absolutePath));
});

test("write refuses overwrite without force", () => {
  assert.throws(
    () =>
      writeBatchOwnerReviewReportV1({
        repoRoot: REPO_ROOT,
        outArg: TEST_OUT,
        review: fiveRowReadyReviewFixture(),
        force: false,
        fs: mockFs(true),
      }),
    OwnerScreenshotFactsDraftOverwriteErrorV1,
  );
});

test("fixture review contract is batch_owner_screenshot_draft_packet_v1", () => {
  const review = fiveRowReadyReviewFixture();
  assert.equal(review.contract, BATCH_OWNER_SCREENSHOT_DRAFT_PACKET_CONTRACT_V1);
  assert.equal(review.may_write_production_evidence, false);
});
