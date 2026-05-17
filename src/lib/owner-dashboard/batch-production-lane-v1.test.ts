import assert from "node:assert/strict";
import test from "node:test";

import {
  BATCH_MISSING_EVIDENCE_AMAZON_SELF_PREFIX_V1,
  BATCH_MISSING_EVIDENCE_UNKNOWN_BUYER_PATH_V1,
  BATCH_PRODUCTION_V1_BATCH_SIZE_CAP,
  BatchProductionReviewCliParseErrorV1,
  batchProductionReviewReportGrantsMutationAuthority,
  buildBatchProductionMissingEvidenceV1,
  buildBatchProductionReviewReportV1,
  normalizeBatchProductionLaneCliRowV1,
  parseBatchProductionReviewCliInputV1,
  rationaleMentionsMissingAmazonEvidenceV1,
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

test("unknown buyer_path_safety produces non-empty missing_evidence with PDP gaps", () => {
  const report = buildBatchProductionReviewReportV1({
    rows: [
      {
        row_id: "pilot-1",
        token: "ADQ75795101",
        url: "https://www.repairclinic.com/Search?SearchTerm=ADQ75795101",
        candidate_kind: "rescue_target",
        buyer_path_safety: "unknown",
        read_only_rationale: "PROVEN: queue row; Amazon PDP not established.",
      },
    ],
    generated_at: "t",
  });
  const missing = report.candidates[0]!.missing_evidence;
  assert.ok(missing.length > 0);
  for (const item of BATCH_MISSING_EVIDENCE_UNKNOWN_BUYER_PATH_V1) {
    assert.ok(missing.includes(item), `expected ${item}`);
  }
});

test("rescue_target with missing Amazon evidence in rationale includes self-prefix gap", () => {
  const report = buildBatchProductionReviewReportV1({
    rows: [
      {
        row_id: "adq75795101",
        token: "ADQ75795101",
        candidate_kind: "rescue_target",
        buyer_path_safety: "unknown",
        read_only_rationale:
          "PROVEN: no data/evidence/amazon-adq75795101-*.json; FROZEN_OPERATOR_HOLD.",
      },
    ],
    generated_at: "t",
  });
  assert.ok(
    report.candidates[0]!.missing_evidence.includes(BATCH_MISSING_EVIDENCE_AMAZON_SELF_PREFIX_V1),
  );
  assert.ok(rationaleMentionsMissingAmazonEvidenceV1("no amazon-adq75795101-* evidence"));
});

test("safe row with complete signals does not get unknown-path missing_evidence filler", () => {
  const report = buildBatchProductionReviewReportV1({
    rows: [baseRow],
    generated_at: "t",
  });
  assert.equal(report.candidates[0]!.buyer_path_safety, "safe");
  assert.equal(report.candidates[0]!.classification, "ready_for_founder_review");
  assert.deepEqual(report.candidates[0]!.missing_evidence, []);
});

test("mutation flags unchanged after missing_evidence enrichment", () => {
  const report = buildBatchProductionReviewReportV1({
    rows: [
      {
        row_id: "x",
        candidate_kind: "rescue_target",
        buyer_path_safety: "unknown",
        read_only_rationale: "no amazon-w10413645a-* evidence",
      },
    ],
    generated_at: "t",
  });
  assert.equal(report.candidates[0]!.may_mutate, false);
  assert.equal(report.candidates[0]!.requires_owner_approval_before_mutation, true);
  assert.ok(report.candidates[0]!.missing_evidence.length >= 3);
  assert.equal(batchProductionReviewReportGrantsMutationAuthority(report), false);
});

test("buildBatchProductionMissingEvidenceV1 is exported for row-level checks", () => {
  const list = buildBatchProductionMissingEvidenceV1(
    {
      row_id: "r",
      candidate_kind: "rescue_target",
      buyer_path_safety: "unknown",
      read_only_rationale: "missing amazon evidence file",
    },
    "unknown",
  );
  assert.ok(list.length >= BATCH_MISSING_EVIDENCE_UNKNOWN_BUYER_PATH_V1.length);
});
