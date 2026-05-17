import assert from "node:assert/strict";
import test from "node:test";

import { BATCH_AMAZON_RESCUE_DEFAULT_COHORT_TOKENS_V1 } from "./batch-production-amazon-rescue-source-v1";
import {
  BATCH_EVIDENCE_COLLECTION_PLAN_CONTRACT_V1,
  BATCH_EVIDENCE_COLLECTION_RECOMMENDED_ACTION_V1,
  BATCH_EVIDENCE_COLLECTION_REQUIRED_CHECKS_V1,
  BATCH_EVIDENCE_REQUIRED_CHECK_IDS_V1,
  batchEvidenceCollectionPlanGrantsWriteAuthority,
  buildAmazonSelfPrefixEvidencePathV1,
  buildBatchEvidenceCollectionPlanV1,
  candidateNeedsEvidenceCollectionPlanV1,
} from "./batch-evidence-collection-plan-v1";
import {
  BATCH_MISSING_EVIDENCE_AMAZON_SELF_PREFIX_V1,
  BATCH_MISSING_EVIDENCE_UNKNOWN_BUYER_PATH_V1,
  buildBatchProductionReviewReportV1,
  type BatchProductionReviewReportRowV1,
} from "./batch-production-lane-v1";

function reviewRow(
  partial: Partial<BatchProductionReviewReportRowV1> & { row_id: string },
): BatchProductionReviewReportRowV1 {
  return {
    row_id: partial.row_id,
    token: partial.token ?? "TOKEN",
    slug: partial.slug ?? null,
    url: partial.url ?? null,
    source_queue_row_id: partial.source_queue_row_id ?? "queue-amazon-agent",
    title: partial.title ?? null,
    candidate_kind: partial.candidate_kind ?? "rescue_target",
    classification: partial.classification ?? "needs_more_evidence",
    buyer_path_safety: partial.buyer_path_safety ?? "unknown",
    wrong_purchase_risk: partial.wrong_purchase_risk ?? "unknown",
    recommended_next_action: partial.recommended_next_action ?? "review",
    missing_evidence: partial.missing_evidence ?? [
      ...BATCH_MISSING_EVIDENCE_UNKNOWN_BUYER_PATH_V1,
      BATCH_MISSING_EVIDENCE_AMAZON_SELF_PREFIX_V1,
    ],
    stop_reason: partial.stop_reason ?? "buyer_path_unknown",
    requires_owner_approval_before_mutation: true,
    may_mutate: false,
  };
}

test("buildAmazonSelfPrefixEvidencePathV1 uses lowercase slug", () => {
  assert.equal(
    buildAmazonSelfPrefixEvidencePathV1("DA97-08006B"),
    "data/evidence/amazon-da97-08006b-",
  );
});

test("plan rows are read-only with may_write_evidence and may_mutate false", () => {
  const reviewReport = buildBatchProductionReviewReportV1({
    rows: [
      {
        row_id: "x",
        token: "T",
        slug: "x",
        url: "https://example.com/x",
        candidate_kind: "rescue_target",
        buyer_path_safety: "unknown",
        read_only_rationale: "PROVEN: test row.",
      },
    ],
    generated_at: "t",
  });
  const plan = buildBatchEvidenceCollectionPlanV1({
    reviewReport,
    generated_at: "t",
  });
  assert.equal(plan.contract, BATCH_EVIDENCE_COLLECTION_PLAN_CONTRACT_V1);
  assert.equal(plan.read_only, true);
  assert.equal(plan.data_mutation, false);
  assert.equal(plan.may_write_evidence, false);
  assert.equal(plan.layer_6_founder_only_approval, "NOT_PROVEN");
  assert.equal(batchEvidenceCollectionPlanGrantsWriteAuthority(plan), false);
  for (const row of plan.rows) {
    assert.equal(row.may_write_evidence, false);
    assert.equal(row.may_mutate, false);
    assert.equal(row.owner_browser_required, true);
    assert.equal(row.screenshot_needed, true);
    assert.equal(row.recommended_next_action, BATCH_EVIDENCE_COLLECTION_RECOMMENDED_ACTION_V1);
  }
});

test("required checks include token PDP buyability ASIN OEM-vs-compatible", () => {
  const plan = buildBatchEvidenceCollectionPlanV1({
    reviewReport: buildBatchProductionReviewReportV1({
      rows: [reviewRow({ row_id: "a", slug: "a" })],
      generated_at: "t",
    }),
    generated_at: "t",
  });
  const ids = plan.rows[0]!.required_checks.map((c) => c.check_id);
  for (const id of BATCH_EVIDENCE_REQUIRED_CHECK_IDS_V1) {
    assert.ok(ids.includes(id), `missing check ${id}`);
  }
  assert.equal(plan.rows[0]!.required_checks.length, BATCH_EVIDENCE_COLLECTION_REQUIRED_CHECKS_V1.length);
});

test("evidence_prefix correct for default amazon-rescue cohort slugs", () => {
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
  assert.equal(plan.plan_row_count, 5);
  for (const slug of slugs) {
    const row = plan.rows.find((r) => r.slug === slug);
    assert.ok(row, `missing plan row for ${slug}`);
    assert.equal(row!.evidence_prefix, `data/evidence/amazon-${slug}-`);
  }
});

test("safe row with no missing evidence gaps is omitted from plan", () => {
  const reviewReport = buildBatchProductionReviewReportV1({
    rows: [
      {
        row_id: "safe-1",
        token: "SAFE1",
        slug: "safe-1",
        url: "https://example.com/safe",
        candidate_kind: "link",
        buyer_path_safety: "safe",
        wrong_purchase_risk: "low",
        read_only_rationale: "PROVEN: complete signals.",
      },
    ],
    generated_at: "t",
  });
  const row = reviewReport.candidates[0]!;
  assert.equal(candidateNeedsEvidenceCollectionPlanV1(row), false);
  const plan = buildBatchEvidenceCollectionPlanV1({
    reviewReport,
    generated_at: "t",
  });
  assert.equal(plan.plan_row_count, 0);
});
