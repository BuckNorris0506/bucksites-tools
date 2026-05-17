import assert from "node:assert/strict";
import test from "node:test";

import { BATCH_AMAZON_RESCUE_DEFAULT_COHORT_TOKENS_V1 } from "./batch-production-amazon-rescue-source-v1";
import { buildBatchEvidenceCollectionPlanV1 } from "./batch-evidence-collection-plan-v1";
import {
  BATCH_OWNER_SCREENSHOT_CAPTURE_WORKSHEET_DEFAULT_RELATIVE_V1,
  BATCH_OWNER_SCREENSHOT_CAPTURE_WORKSHEET_WRITE_CONTRACT_V1,
  buildBatchOwnerScreenshotCaptureWorksheetMarkdownV1,
  ownerScreenshotCaptureWorksheetWriteGrantsProductionWrite,
  validateOwnerScreenshotCaptureWorksheetOutputPathV1,
  writeOwnerScreenshotCaptureWorksheetV1,
} from "./batch-owner-screenshot-capture-worksheet-v1";
import { buildBatchOwnerScreenshotFactsTemplateV1 } from "./batch-owner-screenshot-facts-template-v1";
import { OwnerScreenshotFactsDraftOverwriteErrorV1, OwnerScreenshotFactsDraftPathErrorV1 } from "./batch-owner-screenshot-facts-template-draft-write-v1";
import {
  buildBatchProductionReviewReportV1,
  type BatchProductionReviewReportRowV1,
} from "./batch-production-lane-v1";

const REPO_ROOT = process.cwd();
const TEST_OUT = "data/batch-production/drafts/test-owner-screenshot-capture-worksheet.md";

function reviewRow(
  partial: Partial<BatchProductionReviewReportRowV1> & { row_id: string },
): BatchProductionReviewReportRowV1 {
  return {
    row_id: partial.row_id,
    token: partial.token ?? "TOKEN",
    slug: partial.slug ?? partial.row_id,
    url: partial.url ?? null,
    source_queue_row_id: partial.source_queue_row_id ?? "queue-amazon-agent",
    title: partial.title ?? null,
    candidate_kind: partial.candidate_kind ?? "rescue_target",
    classification: partial.classification ?? "needs_more_evidence",
    buyer_path_safety: partial.buyer_path_safety ?? "unknown",
    wrong_purchase_risk: partial.wrong_purchase_risk ?? "unknown",
    recommended_next_action: partial.recommended_next_action ?? "review",
    missing_evidence: partial.missing_evidence ?? [],
    stop_reason: partial.stop_reason ?? "buyer_path_unknown",
    requires_owner_approval_before_mutation: true,
    may_mutate: false,
  };
}

function amazonRescueTemplate() {
  const slugs = ["adq75795101", "da97-08006b", "da97-17376a", "da97-19467c", "w10413645a"];
  const report = buildBatchProductionReviewReportV1({
    rows: slugs.map((slug, i) =>
      reviewRow({
        row_id: slug,
        slug,
        token: BATCH_AMAZON_RESCUE_DEFAULT_COHORT_TOKENS_V1[i] ?? slug,
      }),
    ),
    generated_at: "t",
  });
  const plan = buildBatchEvidenceCollectionPlanV1({ reviewReport: report, generated_at: "t" });
  return buildBatchOwnerScreenshotFactsTemplateV1({ plan, generated_at: "t" });
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

test("worksheet markdown includes 5 rows and W104 search text", () => {
  const md = buildBatchOwnerScreenshotCaptureWorksheetMarkdownV1(amazonRescueTemplate());
  assert.match(md, /W10413645A/);
  assert.match(md, /Suggested Amazon exact search text.*W10413645A/);
  assert.match(md, /Row 5: W10413645A/);
  assert.equal((md.match(/^## Row /gm) ?? []).length, 5);
});

test("worksheet states read_only and Layer 6 NOT_PROVEN", () => {
  const md = buildBatchOwnerScreenshotCaptureWorksheetMarkdownV1(amazonRescueTemplate());
  assert.match(md, /read_only.*true/i);
  assert.match(md, /data_mutation.*false/i);
  assert.match(md, /may_write_production_evidence.*false/i);
  assert.match(md, /NOT_PROVEN/);
  assert.match(md, /Worksheet only/);
});

test("worksheet lists allowed enum values and JSON field paths", () => {
  const md = buildBatchOwnerScreenshotCaptureWorksheetMarkdownV1(amazonRescueTemplate());
  assert.match(md, /product_detail_page/);
  assert.match(md, /compatible_aftermarket/);
  assert.match(md, /page_observation\.page_kind/);
  assert.match(md, /product_relationship\.oem_or_aftermarket/);
});

test("validateOwnerScreenshotCaptureWorksheetOutputPathV1 refuses data/evidence", () => {
  assert.throws(
    () =>
      validateOwnerScreenshotCaptureWorksheetOutputPathV1(
        REPO_ROOT,
        "data/evidence/worksheet.md",
      ),
    OwnerScreenshotFactsDraftPathErrorV1,
  );
});

test("validateOwnerScreenshotCaptureWorksheetOutputPathV1 requires .md under drafts", () => {
  assert.throws(
    () =>
      validateOwnerScreenshotCaptureWorksheetOutputPathV1(
        REPO_ROOT,
        "data/batch-production/drafts/foo.json",
      ),
    OwnerScreenshotFactsDraftPathErrorV1,
  );
});

test("writeOwnerScreenshotCaptureWorksheetV1 refuses overwrite without force", () => {
  assert.throws(
    () =>
      writeOwnerScreenshotCaptureWorksheetV1({
        repoRoot: REPO_ROOT,
        outArg: TEST_OUT,
        template: amazonRescueTemplate(),
        force: false,
        fs: mockFs(true),
      }),
    OwnerScreenshotFactsDraftOverwriteErrorV1,
  );
});

test("write summary does not grant production write", () => {
  const fs = mockFs(false);
  const { summary } = writeOwnerScreenshotCaptureWorksheetV1({
    repoRoot: REPO_ROOT,
    outArg: TEST_OUT,
    template: amazonRescueTemplate(),
    force: false,
    fs,
  });
  assert.equal(summary.contract, BATCH_OWNER_SCREENSHOT_CAPTURE_WORKSHEET_WRITE_CONTRACT_V1);
  assert.equal(ownerScreenshotCaptureWorksheetWriteGrantsProductionWrite(summary), false);
  assert.equal(summary.may_write_production_evidence, false);
});

test("default path constant matches amazon-rescue-default convention", () => {
  assert.equal(
    BATCH_OWNER_SCREENSHOT_CAPTURE_WORKSHEET_DEFAULT_RELATIVE_V1,
    "data/batch-production/drafts/owner-screenshot-capture-worksheet.amazon-rescue-default.md",
  );
});
