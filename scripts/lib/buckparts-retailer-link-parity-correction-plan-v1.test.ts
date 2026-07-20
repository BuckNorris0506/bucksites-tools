import assert from "node:assert/strict";
import test from "node:test";

import {
  buildRetailerLinkParityCorrectionPlanV1,
  buildRetailerLinkParityRollbackPlanV1,
  hashRetailerLinkParityCorrectionPlanV1,
  PLAN_ROW_KEYS_V1,
  PLAN_TOP_LEVEL_KEYS_V1,
  SNAPSHOT_KEYS_V1,
  validateRetailerLinkParityCorrectionPlanSemanticsV1,
} from "./buckparts-retailer-link-parity-correction-plan-v1";
import type { BuckpartsRetailerLinkParityIssueIntakeReportV1 } from "./buckparts-retailer-link-parity-issue-intake-v1";

const NOW = () => new Date("2026-07-19T12:00:00.000Z");

function intake(overrides: Partial<BuckpartsRetailerLinkParityIssueIntakeReportV1> = {}): BuckpartsRetailerLinkParityIssueIntakeReportV1 {
  const candidate = {
    issue_id: "issue-a",
    lifecycle: "DISCOVERED" as const,
    defect_class: "CSV_HAS_WIN_SUPABASE_MISSING" as const,
    wedge: "refrigerator_water" as const,
    table: "public.retailer_links" as const,
    filter_slug: "filter-a",
    existing_row: {
      filter_slug: "filter-a",
      filter_id: "filter-id-a",
      supabase_link_id: "link-id-a",
      is_primary: true as const,
      current_affiliate_url: "https://old.example/a",
      current_retailer_key: "old",
      current_retailer_name: "Old",
      current_browser_truth_classification: "search_placeholder",
    },
    evidence_win_artifacts: ["data/evidence/a.json"],
    csv_primary_url: "https://new.example/a",
    csv_primary_retailer: "New",
    detector_status: "CSV_HAS_WIN_SUPABASE_MISSING" as const,
    operation: "UPDATE" as const,
    insert_delete_posture: "forbidden" as const,
  };
  return {
    contract: "buckparts_retailer_link_parity_issue_intake_v1",
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    generated_at: NOW().toISOString(),
    detected_count: 1,
    correctable_count: 1,
    unknown_count: 0,
    non_correctable_count: 0,
    blocked_count: 0,
    candidates: [candidate],
    blockers: [],
    proof_sources: [],
    recommended_next_action: "test",
    ...overrides,
  };
}

test("identical intake produces deterministic plan SHA-256", () => {
  const first = buildRetailerLinkParityCorrectionPlanV1({ intake: intake(), now: NOW });
  const second = buildRetailerLinkParityCorrectionPlanV1({ intake: intake(), now: NOW });
  assert.equal(first.plan_sha256, second.plan_sha256);
  assert.equal(first.row_count, 1);
  assert.equal(first.rows[0]?.operation, "UPDATE");
});

test("all bound row fields are hash-sensitive", () => {
  const p = buildRetailerLinkParityCorrectionPlanV1({ intake: intake(), now: NOW });
  for (const field of ["affiliate_url", "retailer_key", "retailer_name", "browser_truth_classification", "is_primary", "supabase_link_id", "filter_id", "filter_slug"] as const) {
    const clone = structuredClone(p);
    const target = field === "filter_slug" ? clone.rows[0]! : clone.rows[0]!.after_row;
    (target as Record<string, unknown>)[field] = field === "is_primary" ? false : `changed-${field}`;
    assert.notEqual(hashRetailerLinkParityCorrectionPlanV1(clone), p.plan_sha256, field);
  }
});

test("zero-row intake is refused", () => {
  const plan = buildRetailerLinkParityCorrectionPlanV1({ intake: intake({ candidates: [] }), now: NOW });
  assert.equal(plan.row_count, 0);
  assert.ok(plan.blockers.includes("zero_row_plan_refused"));
});

test("duplicate row identity is refused", () => {
  const base = intake();
  const duplicate = { ...base.candidates[0]!, issue_id: "issue-b" };
  const plan = buildRetailerLinkParityCorrectionPlanV1({
    intake: intake({ candidates: [base.candidates[0]!, duplicate] }),
    now: NOW,
  });
  assert.equal(plan.row_count, 1);
  assert.ok(plan.blockers.includes("duplicate_row_identity:issue-b"));
});

test("plan accepts only UPDATE candidates", () => {
  const candidate = { ...intake().candidates[0]!, operation: "INSERT" as "UPDATE" };
  const plan = buildRetailerLinkParityCorrectionPlanV1({
    intake: intake({ candidates: [candidate] }),
    now: NOW,
  });
  assert.equal(plan.row_count, 0);
  assert.ok(plan.blockers.includes("unsupported_mutation_direction:issue-a"));
});

test("rollback restores before row and produces a new hash", () => {
  const forward = buildRetailerLinkParityCorrectionPlanV1({ intake: intake(), now: NOW });
  const rollback = buildRetailerLinkParityRollbackPlanV1({ forwardPlan: forward, now: NOW });
  assert.equal(rollback.rows[0]?.approved_after.affiliate_url, forward.rows[0]?.before_row.affiliate_url);
  assert.equal(rollback.rows[0]?.expected_current.affiliate_url, forward.rows[0]?.after_row.affiliate_url);
  assert.ok(rollback.rows[0]?.source_evidence.includes("rollback_restore_before_row"));
  assert.notEqual(rollback.plan_sha256, forward.plan_sha256);
});

test("semantic validator rejects identity and snapshot drift", () => {
  const p = buildRetailerLinkParityCorrectionPlanV1({ intake: intake(), now: NOW });
  for (const field of ["supabase_link_id", "filter_slug", "filter_id"] as const) {
    const malformed = structuredClone(p);
    malformed.rows[0]!.approved_after = {
      ...malformed.rows[0]!.approved_after,
      [field]: `drift-${field}`,
    };
    const result = validateRetailerLinkParityCorrectionPlanSemanticsV1(malformed);
    assert.equal(result.ok, false, field);
    assert.ok(result.blockers.includes(`plan_identity_mismatch:${field}`), field);
  }
  const tableMismatch = structuredClone(p);
  tableMismatch.rows[0]!.table = "public.other" as never;
  assert.ok(
    validateRetailerLinkParityCorrectionPlanSemanticsV1(tableMismatch).blockers.includes(
      "plan_identity_mismatch:table",
    ),
  );
  const wedgeMismatch = structuredClone(p);
  wedgeMismatch.rows[0]!.wedge = "other" as never;
  assert.ok(
    validateRetailerLinkParityCorrectionPlanSemanticsV1(wedgeMismatch).blockers.includes(
      "plan_identity_mismatch:wedge",
    ),
  );
  const beforeMismatch = structuredClone(p);
  beforeMismatch.rows[0]!.before_row = {
    ...beforeMismatch.rows[0]!.before_row,
    affiliate_url: "https://drift-before.example",
  };
  assert.ok(
    validateRetailerLinkParityCorrectionPlanSemanticsV1(beforeMismatch).blockers.includes(
      "plan_before_snapshot_mismatch",
    ),
  );
  const afterMismatch = structuredClone(p);
  afterMismatch.rows[0]!.after_row = {
    ...afterMismatch.rows[0]!.after_row,
    affiliate_url: "https://drift-after.example",
  };
  assert.ok(
    validateRetailerLinkParityCorrectionPlanSemanticsV1(afterMismatch).blockers.includes(
      "plan_after_snapshot_mismatch",
    ),
  );
  const rollbackMismatch = structuredClone(p);
  rollbackMismatch.rows[0]!.rollback_restore_before_row = {
    ...rollbackMismatch.rows[0]!.rollback_restore_before_row,
    affiliate_url: "https://drift-rollback.example",
  };
  assert.ok(
    validateRetailerLinkParityCorrectionPlanSemanticsV1(rollbackMismatch).blockers.includes(
      "plan_rollback_snapshot_mismatch",
    ),
  );
  const unexpected = structuredClone(p);
  unexpected.rows[0]!.before_row = { ...unexpected.rows[0]!.before_row, extra: true } as never;
  assert.ok(
    validateRetailerLinkParityCorrectionPlanSemanticsV1(unexpected).blockers.includes(
      "plan_snapshot_unexpected_key:before_row:extra",
    ),
  );
});

test("semantic plan boundary admits only exact UPDATE plan, row, and snapshot shapes", () => {
  const p = buildRetailerLinkParityCorrectionPlanV1({ intake: intake(), now: NOW });
  assert.deepEqual(Object.keys(p).sort(), [...PLAN_TOP_LEVEL_KEYS_V1].sort());
  assert.deepEqual(Object.keys(p.rows[0]!).sort(), [...PLAN_ROW_KEYS_V1].sort());
  assert.deepEqual(Object.keys(p.rows[0]!.expected_current).sort(), [...SNAPSHOT_KEYS_V1].sort());

  for (const operation of ["DELETE", "INSERT", "UPSERT", "", undefined, 123] as const) {
    const malformed = structuredClone(p) as Record<string, unknown>;
    malformed.operation = operation;
    const result = validateRetailerLinkParityCorrectionPlanSemanticsV1(malformed as never);
    assert.equal(result.ok, false, String(operation));
    assert.ok(result.blockers.includes("plan_operation_not_update"), String(operation));
  }
  const rowExtra = structuredClone(p) as Record<string, unknown>;
  (rowExtra.rows as Array<Record<string, unknown>>)[0]!.foo = 1;
  assert.ok(validateRetailerLinkParityCorrectionPlanSemanticsV1(rowExtra as never).blockers.includes("plan_row_unexpected_key:foo"));
  const topExtra = structuredClone(p) as Record<string, unknown>;
  topExtra.foo = 1;
  assert.ok(validateRetailerLinkParityCorrectionPlanSemanticsV1(topExtra as never).blockers.includes("plan_unexpected_key:foo"));
  const missing = structuredClone(p) as Record<string, unknown>;
  delete missing.operation;
  assert.ok(validateRetailerLinkParityCorrectionPlanSemanticsV1(missing as never).blockers.includes("plan_required_key_missing:operation"));
});
