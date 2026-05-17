import assert from "node:assert/strict";
import test from "node:test";

import {
  BATCH_PRODUCTION_V1_BATCH_SIZE_CAP,
  BatchProductionReviewCliParseErrorV1,
  batchProductionReviewReportGrantsMutationAuthority,
  buildBatchProductionReviewReportV1,
  normalizeBatchProductionLaneCliRowV1,
  parseBatchProductionReviewCliInputV1,
  validateBatchProductionLaneInputRowV1,
} from "./batch-production-lane-v1";

const baseRow = {
  row_id: "row-1",
  slug: "whirlpool-filter-x",
  url: "https://example.com/p/1",
  candidate_kind: "link",
  buyer_path_safety: "safe",
  wrong_purchase_risk: "low",
  read_only_rationale: "PROVEN: surfaced from queue snapshot.",
};

test("empty input blocks with NO_CANDIDATES", () => {
  const report = buildBatchProductionReviewReportV1({ rows: [], generated_at: "t" });
  assert.equal(report.overall_status, "NO_CANDIDATES");
  assert.equal(report.batch_size, 0);
  assert.equal(report.stopped, true);
  assert.ok(report.stop_reasons.includes("EMPTY_INPUT"));
  assert.equal(report.layer_6_founder_only_approval, "NOT_PROVEN");
  assert.equal(report.candidates.length, 0);
});

test("more than 10 rows stops with zero emitted candidates", () => {
  const rows = Array.from({ length: 11 }, (_, i) => ({
    ...baseRow,
    row_id: `row-${i}`,
  }));
  const report = buildBatchProductionReviewReportV1({ rows, generated_at: "t" });
  assert.equal(report.overall_status, "STOPPED");
  assert.equal(report.stopped, true);
  assert.equal(report.batch_size, 0);
  assert.equal(report.candidates.length, 0);
  assert.ok(
    report.stop_reasons.some((r) => r.startsWith("BATCH_SIZE_EXCEEDS_CAP")),
  );
  assert.equal(BATCH_PRODUCTION_V1_BATCH_SIZE_CAP, 10);
});

test("every row has may_mutate false and requires owner approval", () => {
  const report = buildBatchProductionReviewReportV1({
    rows: [
      baseRow,
      {
        ...baseRow,
        row_id: "row-2",
        buyer_path_safety: "unsafe",
        wrong_purchase_risk: "high",
      },
    ],
    generated_at: "t",
  });
  assert.equal(report.batch_size, 2);
  for (const c of report.candidates) {
    assert.equal(c.may_mutate, false);
    assert.equal(c.requires_owner_approval_before_mutation, true);
  }
});

test("report never grants mutation authority", () => {
  const report = buildBatchProductionReviewReportV1({
    rows: [baseRow],
    generated_at: "t",
  });
  assert.equal(batchProductionReviewReportGrantsMutationAuthority(report), false);
  assert.equal(report.data_mutation, false);
  assert.equal(report.automation_input, false);
  assert.ok(report.no_mutation_attestation.includes("NOT_PROVEN"));
});

test("unsafe and unknown buyer_path_safety are never classified as safe paths", () => {
  const unsafe = buildBatchProductionReviewReportV1({
    rows: [{ ...baseRow, row_id: "u1", buyer_path_safety: "unsafe" }],
    generated_at: "t",
  });
  assert.equal(unsafe.candidates[0]!.buyer_path_safety, "unsafe");
  assert.notEqual(unsafe.candidates[0]!.classification, "ready_for_founder_review");
  assert.equal(unsafe.candidates[0]!.stop_reason, "buyer_path_unsafe");

  const unknown = buildBatchProductionReviewReportV1({
    rows: [
      {
        row_id: "u2",
        candidate_kind: "link",
        buyer_path_safety: "unknown",
        read_only_rationale: "missing locator",
      },
    ],
    generated_at: "t",
  });
  assert.equal(unknown.candidates[0]!.buyer_path_safety, "unknown");
  assert.notEqual(unknown.candidates[0]!.classification, "ready_for_founder_review");
});

test("malformed rows are blocked not promoted to safe", () => {
  const report = buildBatchProductionReviewReportV1({
    rows: [{ row_id: "", buyer_path_safety: "safe" }, baseRow],
    generated_at: "t",
  });
  assert.equal(report.candidates[0]!.classification, "blocked_malformed_input");
  assert.equal(report.candidates[0]!.buyer_path_safety, "unknown");
  assert.equal(report.overall_status, "PARTIAL");
  assert.ok(report.stop_reasons.includes("CONTAINS_MALFORMED_INPUT_ROWS"));
});

test("invalid buyer_path_safety enum fails validation", () => {
  const v = validateBatchProductionLaneInputRowV1({
    row_id: "bad-enum",
    buyer_path_safety: "definitely_safe",
  });
  assert.equal(v.ok, false);
});

test("Layer 6 remains NOT_PROVEN on report", () => {
  const report = buildBatchProductionReviewReportV1({
    rows: [baseRow],
    generated_at: "t",
    context: { layer_six_readiness_status: "informational_ready" },
  });
  assert.equal(report.layer_6_founder_only_approval, "NOT_PROVEN");
});

test("batch policy stop when failure pattern unguarded", () => {
  const report = buildBatchProductionReviewReportV1({
    rows: [baseRow],
    generated_at: "t",
    context: { failure_pattern_unguarded_count: 1 },
  });
  assert.equal(report.stopped, true);
  assert.equal(report.overall_status, "STOPPED");
  assert.equal(report.candidates[0]!.classification, "blocked_batch_policy");
});

test("registry blocked queue id blocks row scope", () => {
  const report = buildBatchProductionReviewReportV1({
    rows: [{ ...baseRow, source_queue_row_id: "queue-amazon-agent" }],
    generated_at: "t",
    context: { registry_blocked_source_queue_row_ids: ["queue-amazon-agent"] },
  });
  assert.equal(report.candidates[0]!.classification, "blocked_registry_scope");
});

test("CLI stdin raw JSON array with operator aliases yields batch_size 1", () => {
  const raw = JSON.stringify([
    {
      row_id: "sample-1",
      part_token: "W10413645A",
      candidate_url: "https://example.com/sample",
      source_reason: "contract smoke only",
    },
  ]);
  const input = parseBatchProductionReviewCliInputV1(raw);
  assert.equal(input.rows?.length, 1);
  const report = buildBatchProductionReviewReportV1({
    rows: input.rows ?? [],
    generated_at: "t",
  });
  assert.equal(report.batch_size, 1);
  assert.equal(report.candidates.length, 1);
  assert.equal(report.candidates[0]!.row_id, "sample-1");
  assert.equal(report.candidates[0]!.token, "W10413645A");
  assert.equal(report.candidates[0]!.url, "https://example.com/sample");
  assert.equal(report.candidates[0]!.may_mutate, false);
  assert.equal(report.candidates[0]!.requires_owner_approval_before_mutation, true);
});

test("CLI stdin wrapper object still works", () => {
  const raw = JSON.stringify({
    rows: [{ ...baseRow, row_id: "wrap-1" }],
    context: { layer_six_readiness_status: "informational_ready" },
  });
  const input = parseBatchProductionReviewCliInputV1(raw);
  const report = buildBatchProductionReviewReportV1({
    rows: input.rows ?? [],
    context: input.context,
    generated_at: "t",
  });
  assert.equal(report.batch_size, 1);
  assert.equal(report.candidates[0]!.row_id, "wrap-1");
});

test("empty stdin string parses to NO_CANDIDATES input", () => {
  const input = parseBatchProductionReviewCliInputV1("");
  assert.deepEqual(input, { rows: [] });
  const report = buildBatchProductionReviewReportV1({ rows: [], generated_at: "t" });
  assert.equal(report.overall_status, "NO_CANDIDATES");
});

test("invalid JSON fails closed", () => {
  assert.throws(
    () => parseBatchProductionReviewCliInputV1("{not-json"),
    BatchProductionReviewCliParseErrorV1,
  );
});

test("normalizeBatchProductionLaneCliRowV1 maps operator aliases", () => {
  const n = normalizeBatchProductionLaneCliRowV1({
    row_id: "x",
    part_token: "T",
    candidate_url: "https://a",
    source_reason: "why",
  }) as Record<string, unknown>;
  assert.equal(n.token, "T");
  assert.equal(n.url, "https://a");
  assert.equal(n.read_only_rationale, "why");
});
