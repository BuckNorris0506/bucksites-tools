import assert from "node:assert/strict";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  BATCH_OWNER_SCREENSHOT_FACTS_TEMPLATE_DRAFT_DEFAULT_RELATIVE_V1,
  BATCH_OWNER_SCREENSHOT_FACTS_TEMPLATE_DRAFT_WRITE_CONTRACT_V1,
  buildOwnerScreenshotFactsDraftFilePayloadV1,
  ownerScreenshotFactsDraftWriteGrantsProductionWrite,
  OwnerScreenshotFactsDraftOverwriteErrorV1,
  OwnerScreenshotFactsDraftPathErrorV1,
  validateOwnerScreenshotFactsDraftOutputPathV1,
  writeOwnerScreenshotFactsTemplateDraftV1,
} from "../src/lib/owner-dashboard/batch-owner-screenshot-facts-template-draft-write-v1";
import { buildBatchOwnerScreenshotFactsTemplateV1 } from "../src/lib/owner-dashboard/batch-owner-screenshot-facts-template-v1";
import { BATCH_AMAZON_RESCUE_DEFAULT_COHORT_TOKENS_V1 } from "../src/lib/owner-dashboard/batch-production-amazon-rescue-source-v1";
import { buildBatchEvidenceCollectionPlanV1 } from "../src/lib/owner-dashboard/batch-evidence-collection-plan-v1";
import {
  buildBatchProductionReviewReportV1,
  type BatchProductionReviewReportRowV1,
} from "../src/lib/owner-dashboard/batch-production-lane-v1";
import { runWriteBatchOwnerScreenshotFactsTemplateDraftV1 } from "./write-batch-owner-screenshot-facts-template-draft";

const REPO_ROOT = process.cwd();
const TEST_DRAFT_REL =
  "data/batch-production/drafts/test-owner-screenshot-facts-template.write-test.json";

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

test("validateOwnerScreenshotFactsDraftOutputPathV1 refuses data/evidence", () => {
  assert.throws(
    () =>
      validateOwnerScreenshotFactsDraftOutputPathV1(
        REPO_ROOT,
        "data/evidence/amazon-w10413645a-draft.json",
      ),
    OwnerScreenshotFactsDraftPathErrorV1,
  );
});

test("validateOwnerScreenshotFactsDraftOutputPathV1 refuses data/owner-decisions", () => {
  assert.throws(
    () =>
      validateOwnerScreenshotFactsDraftOutputPathV1(
        REPO_ROOT,
        "data/owner-decisions/foo.json",
      ),
    OwnerScreenshotFactsDraftPathErrorV1,
  );
});

test("writeOwnerScreenshotFactsTemplateDraftV1 refuses overwrite without --force", () => {
  const template = amazonRescueTemplate();
  const abs = path.resolve(REPO_ROOT, TEST_DRAFT_REL);
  const fs = mockFs(true);
  assert.throws(
    () =>
      writeOwnerScreenshotFactsTemplateDraftV1({
        repoRoot: REPO_ROOT,
        outArg: TEST_DRAFT_REL,
        template,
        force: false,
        fs,
      }),
    OwnerScreenshotFactsDraftOverwriteErrorV1,
  );
  assert.equal(fs.files.has(abs), false);
});

test("writeOwnerScreenshotFactsTemplateDraftV1 --force permits overwrite", () => {
  const template = amazonRescueTemplate();
  const fs = mockFs(true);
  const result = writeOwnerScreenshotFactsTemplateDraftV1({
    repoRoot: REPO_ROOT,
    outArg: TEST_DRAFT_REL,
    template,
    force: true,
    fs,
  });
  assert.equal(result.summary.wrote_draft_file, true);
  assert.ok(fs.files.size > 0);
});

test("draft payload has facts array shape with W104 browser fields", () => {
  const template = amazonRescueTemplate();
  const payload = buildOwnerScreenshotFactsDraftFilePayloadV1(template);
  assert.ok(Array.isArray(payload.facts));
  assert.equal(payload.facts.length, 5);
  const w104 = payload.facts.find((f) => f.row_id === "w10413645a");
  assert.ok(w104);
  assert.equal(w104!.browser_evidence.token_searched, "W10413645A");
  assert.equal(w104!.browser_evidence.asin, "");
  assert.equal(w104!.screenshot_sources[0]!.committed_to_repo, false);
});

test("write summary keeps Layer 6 NOT_PROVEN and no production write authority", () => {
  const template = amazonRescueTemplate();
  const fs = mockFs(false);
  const { summary } = writeOwnerScreenshotFactsTemplateDraftV1({
    repoRoot: REPO_ROOT,
    outArg: TEST_DRAFT_REL,
    template,
    force: false,
    fs,
  });
  assert.equal(summary.contract, BATCH_OWNER_SCREENSHOT_FACTS_TEMPLATE_DRAFT_WRITE_CONTRACT_V1);
  assert.equal(summary.layer_6_founder_only_approval, "NOT_PROVEN");
  assert.equal(summary.may_write_production_evidence, false);
  assert.equal(ownerScreenshotFactsDraftWriteGrantsProductionWrite(summary), false);
  for (const row of template.rows) {
    assert.equal(row.may_write_evidence, false);
    assert.equal(row.may_mutate, false);
  }
});

test("default source writes under data/batch-production/drafts/", () => {
  const outRel = BATCH_OWNER_SCREENSHOT_FACTS_TEMPLATE_DRAFT_DEFAULT_RELATIVE_V1;
  const abs = path.resolve(REPO_ROOT, outRel);
  try {
    rmSync(abs, { force: true });
    const summary = runWriteBatchOwnerScreenshotFactsTemplateDraftV1({
      argv: ["--source", "amazon-rescue-default"],
      repoRoot: REPO_ROOT,
      readFile: (p) => readFileSync(p, "utf8"),
    });
    assert.equal(summary.output_path, outRel);
    assert.ok(summary.template_row_count >= 5);
    const written = JSON.parse(readFileSync(abs, "utf8"));
    assert.ok(Array.isArray(written.facts));
    mkdirSync(path.dirname(abs), { recursive: true });
  } finally {
    rmSync(abs, { force: true });
  }
});

test("integration: written draft file is accepted by draft packet CLI shape", () => {
  const outRel = TEST_DRAFT_REL;
  const abs = path.resolve(REPO_ROOT, outRel);
  mkdirSync(path.dirname(abs), { recursive: true });
  try {
    writeFileSync(
      abs,
      `${JSON.stringify(buildOwnerScreenshotFactsDraftFilePayloadV1(amazonRescueTemplate()), null, 2)}\n`,
    );
    const parsed = JSON.parse(readFileSync(abs, "utf8"));
    assert.equal(parsed.facts.length, 5);
    assert.equal(
      parsed.facts.find((f: { row_id: string }) => f.row_id === "w10413645a")!.browser_evidence
        .token_searched,
      "W10413645A",
    );
  } finally {
    rmSync(abs, { force: true });
  }
});
