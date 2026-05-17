import assert from "node:assert/strict";
import test from "node:test";

import { BATCH_AMAZON_RESCUE_DEFAULT_COHORT_TOKENS_V1 } from "./batch-production-amazon-rescue-source-v1";
import { buildBatchEvidenceCollectionPlanV1 } from "./batch-evidence-collection-plan-v1";
import { normalizeBatchOwnerScreenshotFactsRowV1 } from "./batch-owner-screenshot-draft-packet-v1";
import {
  BATCH_OWNER_SCREENSHOT_FACTS_FILL_IN_INSTRUCTIONS_V1,
  BATCH_OWNER_SCREENSHOT_FACTS_TEMPLATE_CONTRACT_V1,
  batchOwnerScreenshotFactsTemplateGrantsWriteAuthority,
  buildBatchOwnerScreenshotFactsTemplateV1,
  parseBatchEvidenceCollectionPlanForTemplateV1,
} from "./batch-owner-screenshot-facts-template-v1";
import {
  buildBatchProductionReviewReportV1,
  type BatchProductionReviewReportRowV1,
} from "./batch-production-lane-v1";

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

function amazonRescuePlanFiveRows() {
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
  return buildBatchEvidenceCollectionPlanV1({ reviewReport: report, generated_at: "t" });
}

test("amazon rescue plan produces 5 template rows with prefilled token", () => {
  const plan = amazonRescuePlanFiveRows();
  const template = buildBatchOwnerScreenshotFactsTemplateV1({ plan, generated_at: "t" });
  assert.equal(template.template_row_count, 5);
  assert.equal(template.rows.length, 5);
  const w104 = template.rows.find((r) => r.row_id === "w10413645a");
  assert.ok(w104);
  assert.equal(w104!.token, "W10413645A");
  assert.equal(w104!.facts_template.browser_evidence.token_searched, "W10413645A");
});

test("each row includes nested facts_template shape for draft normalizer", () => {
  const template = buildBatchOwnerScreenshotFactsTemplateV1({
    plan: amazonRescuePlanFiveRows(),
    generated_at: "t",
  });
  for (const row of template.rows) {
    const ft = row.facts_template;
    assert.equal(ft.filter_id, null);
    assert.ok(Array.isArray(ft.screenshot_sources));
    assert.equal(ft.screenshot_sources[0]!.committed_to_repo, false);
    assert.ok(ft.page_observation);
    assert.ok(ft.buyability_observation);
    assert.ok(ft.seller_observation);
    assert.ok(ft.product_relationship);
    assert.ok(ft.browser_evidence);
    const normalized = normalizeBatchOwnerScreenshotFactsRowV1(ft);
    assert.equal(normalized.row_id, row.row_id);
    if (row.token) {
      assert.equal(normalized.token, row.token);
    }
  }
});

test("template envelope is read-only with may_write_evidence false and Layer 6 NOT_PROVEN", () => {
  const template = buildBatchOwnerScreenshotFactsTemplateV1({
    plan: amazonRescuePlanFiveRows(),
    generated_at: "t",
  });
  assert.equal(template.contract, BATCH_OWNER_SCREENSHOT_FACTS_TEMPLATE_CONTRACT_V1);
  assert.equal(template.read_only, true);
  assert.equal(template.data_mutation, false);
  assert.equal(template.may_write_evidence, false);
  assert.equal(template.layer_6_founder_only_approval, "NOT_PROVEN");
  assert.equal(batchOwnerScreenshotFactsTemplateGrantsWriteAuthority(template), false);
});

test("no template row is mutation-capable or marked ready", () => {
  const template = buildBatchOwnerScreenshotFactsTemplateV1({
    plan: amazonRescuePlanFiveRows(),
    generated_at: "t",
  });
  for (const row of template.rows) {
    assert.equal(row.may_write_evidence, false);
    assert.equal(row.may_mutate, false);
    assert.equal("draft_ready_for_owner_review" in row, false);
    assert.equal("mutation_ready" in row, false);
    assert.equal(row.fill_in_instructions.length, BATCH_OWNER_SCREENSHOT_FACTS_FILL_IN_INSTRUCTIONS_V1.length);
  }
});

test("invalid or missing plan fails closed", () => {
  assert.throws(() => parseBatchEvidenceCollectionPlanForTemplateV1(null), /plan must be/);
  assert.throws(
    () => parseBatchEvidenceCollectionPlanForTemplateV1({ contract: "wrong" }),
    /plan must be/,
  );
});

test("W104 template has blank ASIN and uncommitted screenshot", () => {
  const template = buildBatchOwnerScreenshotFactsTemplateV1({
    plan: amazonRescuePlanFiveRows(),
    generated_at: "t",
  });
  const w104 = template.rows.find((r) => r.row_id === "w10413645a")!;
  assert.equal(w104.facts_template.browser_evidence.asin, "");
  assert.equal(w104.facts_template.screenshot_sources[0]!.committed_to_repo, false);
});
