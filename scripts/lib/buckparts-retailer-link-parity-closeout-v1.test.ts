import assert from "node:assert/strict";
import test from "node:test";

import { buildRetailerLinkParityCloseoutV1, validateParityCloseoutDetectorFixtureV1 } from "./buckparts-retailer-link-parity-closeout-v1";
import {
  buildRetailerLinkParityCorrectionPlanV1,
  hashRetailerLinkParityCorrectionPlanV1,
} from "./buckparts-retailer-link-parity-correction-plan-v1";
import type { FridgeSupabaseVsCsvRetailerLinksDiffV1 } from "./fridge-supabase-vs-csv-retailer-links-diff-v1";
import type { BuckpartsRetailerLinkParityIssueIntakeReportV1 } from "./buckparts-retailer-link-parity-issue-intake-v1";

function plan() {
  const intake: BuckpartsRetailerLinkParityIssueIntakeReportV1 = {
    contract: "buckparts_retailer_link_parity_issue_intake_v1", read_only: true, data_mutation: false,
    mutation_authorized: false, generated_at: "2026-07-19T12:00:00.000Z", detected_count: 1,
    correctable_count: 1, unknown_count: 0, non_correctable_count: 0, blocked_count: 0,
    candidates: [{
      issue_id: "issue-a", lifecycle: "DISCOVERED", defect_class: "CSV_HAS_WIN_SUPABASE_MISSING",
      wedge: "refrigerator_water", table: "public.retailer_links", filter_slug: "filter-a",
      existing_row: { filter_slug: "filter-a", filter_id: "filter-a", supabase_link_id: "link-a", is_primary: true, current_affiliate_url: "https://old.example", current_retailer_key: "old", current_retailer_name: "Old", current_browser_truth_classification: "search_placeholder" },
      evidence_win_artifacts: ["data/evidence/a.json"], csv_primary_url: "https://new.example",
      csv_primary_retailer: "New", detector_status: "CSV_HAS_WIN_SUPABASE_MISSING", operation: "UPDATE",
      insert_delete_posture: "forbidden",
    }],
    blockers: [], proof_sources: [], recommended_next_action: "test",
  };
  return buildRetailerLinkParityCorrectionPlanV1({ intake, now: () => new Date("2026-07-19T12:00:00.000Z") });
}

function diff(status: "CHECKED" | "UNKNOWN_DB_UNAVAILABLE", matched = true): FridgeSupabaseVsCsvRetailerLinksDiffV1 {
  return {
    contract: "fridge_supabase_vs_csv_retailer_links_diff_v1", read_only: true, data_mutation: false,
    generated_at: "2026-07-19T12:00:00.000Z", exact_repo_paths_read: [], reconciliation_source_contract: "test",
    checked_slug_count: 1, checked_filter_slugs: ["filter-a"], supabase_truth_status: status,
    supabase_unavailable_reason: status === "CHECKED" ? null : "offline",
    supabase_has_win_csv_missing_count: 0, evidence_only_not_in_supabase_count: 0,
    csv_and_supabase_match_placeholder_count: 0, csv_has_win_supabase_missing_count: 0,
    unknown_status_count: status === "CHECKED" ? 0 : 1, recommended_next_action: "test",
    rows: [{
      filter_slug: "filter-a", csv_has_direct_buyable: matched, csv_primary_url: "https://new.example",
      csv_primary_retailer: "New", supabase_row_count: 1, supabase_direct_buyable_count: matched ? 1 : 0,
      supabase_safe_cta_count: 0, supabase_primary_url: "https://new.example", evidence_win_artifacts: [],
      status: status === "CHECKED" ? (matched ? "UNKNOWN" : "CSV_HAS_WIN_SUPABASE_MISSING") : "UNKNOWN",
    }],
    proven_facts: [], inferred_facts: [], unknown_facts: [],
  };
}

function binding(p = plan()) {
  return {
    expected_plan_sha256: p.plan_sha256,
    execution_identity: "execution-a",
    execution_receipt: {
      execution_id: "execution-a",
      plan_sha256: p.plan_sha256,
      apply_status: "APPLIED" as const,
      rows_updated: p.row_count,
      updated_link_ids: p.rows.map((row) => row.expected_current.supabase_link_id),
    },
    postLiveRows: new Map(p.rows.map((row) => [row.expected_current.supabase_link_id, row.approved_after])),
  };
}

test("both direct_buyable sides close VERIFIED", () => {
  const p = plan();
  const receipt = buildRetailerLinkParityCloseoutV1({ plan: p, postDiff: diff("CHECKED"), ...binding(p) });
  assert.equal(receipt.closeout_status, "VERIFIED");
  assert.equal(receipt.verified_count, 1);
  assert.equal(receipt.rollback_plan_sha256, null);
});

test("mismatched post-apply detector result is NOT_PROVEN", () => {
  const p = plan();
  const receipt = buildRetailerLinkParityCloseoutV1({ plan: p, postDiff: diff("CHECKED", false), ...binding(p) });
  assert.equal(receipt.closeout_status, "NOT_PROVEN");
  assert.ok(receipt.blockers.includes("post_apply_not_in_sync:filter-a:NOT_IN_SYNC"));
});

test("UNKNOWN detector result is NOT_PROVEN", () => {
  const p = plan();
  const receipt = buildRetailerLinkParityCloseoutV1({ plan: p, postDiff: diff("UNKNOWN_DB_UNAVAILABLE"), ...binding(p) });
  assert.equal(receipt.closeout_status, "NOT_PROVEN");
  assert.ok(receipt.blockers.includes("closeout_detector_unknown:offline"));
});

test("plan hash mismatch is NOT_PROVEN", () => {
  const p = plan();
  const receipt = buildRetailerLinkParityCloseoutV1({
    plan: p, postDiff: diff("CHECKED"), ...binding(p), expected_plan_sha256: "0".repeat(64),
  });
  assert.equal(receipt.closeout_status, "NOT_PROVEN");
  assert.ok(receipt.blockers.includes("closeout_plan_hash_mismatch"));
});

test("NOT_PROVEN receipt includes a rollback plan hash", () => {
  const p = plan();
  const receipt = buildRetailerLinkParityCloseoutV1({ plan: p, postDiff: diff("CHECKED", false), ...binding(p) });
  assert.match(receipt.rollback_plan_sha256 ?? "", /^[a-f0-9]{64}$/);
});

test("external hash and execution receipt are mandatory; contradictory fixture is refused", () => {
  const p = plan();
  const missing = buildRetailerLinkParityCloseoutV1({ plan: p, postDiff: diff("CHECKED") });
  assert.equal(missing.closeout_status, "NOT_PROVEN");
  assert.ok(missing.blockers.includes("closeout_expected_plan_sha256_missing"));
  assert.ok(missing.blockers.includes("closeout_execution_receipt_or_identity_missing"));
  const contradictory = diff("CHECKED").rows[0]!;
  contradictory.status = "CSV_HAS_WIN_SUPABASE_MISSING";
  assert.match(validateParityCloseoutDetectorFixtureV1(contradictory).join("\n"), /contradictory_detector_fixture/);
});

test("closeout requires externally bound receipt and exact post-write snapshot", () => {
  const p = plan();
  const missingIdentity = buildRetailerLinkParityCloseoutV1({
    plan: p, postDiff: diff("CHECKED"), expected_plan_sha256: p.plan_sha256,
    execution_receipt: binding(p).execution_receipt, postLiveRows: binding(p).postLiveRows,
  });
  assert.ok(missingIdentity.blockers.includes("closeout_execution_identity_missing"));
  const wrongPost = buildRetailerLinkParityCloseoutV1({
    plan: p, postDiff: diff("CHECKED"), ...binding(p),
    postLiveRows: new Map([["link-a", { ...p.rows[0]!.approved_after, affiliate_url: "https://wrong.example" }]]),
  });
  assert.equal(wrongPost.closeout_status, "NOT_PROVEN");
  assert.ok(wrongPost.blockers.includes("closeout_post_live_mismatch:filter-a:affiliate_url"));
});

test("both-buyable contradiction matrix rejects drift statuses but allows legal UNKNOWN", () => {
  for (const status of [
    "CSV_HAS_WIN_SUPABASE_MISSING",
    "SUPABASE_HAS_WIN_CSV_MISSING",
    "EVIDENCE_ONLY_NOT_IN_SUPABASE",
    "CSV_AND_SUPABASE_MATCH_PLACEHOLDER",
  ] as const) {
    const row = { ...diff("CHECKED").rows[0]!, status };
    assert.ok(validateParityCloseoutDetectorFixtureV1(row).length > 0, status);
  }
  for (const status of ["UNKNOWN"] as const) {
    const row = { ...diff("CHECKED").rows[0]!, status };
    assert.deepEqual(validateParityCloseoutDetectorFixtureV1(row), [], status);
  }
});

test("complete post-apply and receipt mismatch matrix refuses VERIFIED", () => {
  const p = plan();
  const b = binding(p);
  for (const field of [
    "supabase_link_id",
    "filter_slug",
    "filter_id",
    "retailer_key",
    "retailer_name",
    "browser_truth_classification",
    "affiliate_url",
  ] as const) {
    const receipt = buildRetailerLinkParityCloseoutV1({
      plan: p,
      postDiff: diff("CHECKED"),
      ...b,
      postLiveRows: new Map([
        ["link-a", { ...p.rows[0]!.approved_after, [field]: `wrong-${field}` }],
      ]),
    });
    assert.equal(receipt.closeout_status, "NOT_PROVEN", field);
    assert.ok(receipt.blockers.includes(`closeout_post_live_mismatch:filter-a:${field}`), field);
  }
  const wrongPrimary = buildRetailerLinkParityCloseoutV1({
    plan: p,
    postDiff: diff("CHECKED"),
    ...b,
    postLiveRows: new Map([
      ["link-a", { ...p.rows[0]!.approved_after, is_primary: false as never }],
    ]),
  });
  assert.equal(wrongPrimary.closeout_status, "NOT_PROVEN");
  assert.ok(wrongPrimary.blockers.some((x) => x.includes("is_primary")));

  for (const [name, postLiveRows, expected] of [
    ["missing row", new Map(), "closeout_post_live_row_missing:link-a"],
    ["extra row", new Map([["link-a", p.rows[0]!.approved_after], ["extra-link", p.rows[0]!.approved_after]]), "closeout_post_live_unexpected_row:extra-link"],
  ] as const) {
    const receipt = buildRetailerLinkParityCloseoutV1({ plan: p, postDiff: diff("CHECKED"), ...b, postLiveRows });
    assert.equal(receipt.closeout_status, "NOT_PROVEN", name);
    assert.ok(receipt.blockers.includes(expected), name);
  }

  const emptyIdentity = buildRetailerLinkParityCloseoutV1({
    plan: p, postDiff: diff("CHECKED"), ...b, execution_identity: "   ",
  });
  assert.ok(emptyIdentity.blockers.includes("closeout_execution_identity_missing"));

  const mismatchIdentity = buildRetailerLinkParityCloseoutV1({
    plan: p, postDiff: diff("CHECKED"), ...b, execution_identity: "execution-b",
  });
  assert.ok(mismatchIdentity.blockers.includes("closeout_execution_receipt_identity_mismatch"));

  const wrongCohort = buildRetailerLinkParityCloseoutV1({
    plan: p,
    postDiff: diff("CHECKED"),
    ...b,
    execution_receipt: { ...b.execution_receipt, updated_link_ids: ["other-link"] },
  });
  assert.ok(wrongCohort.blockers.includes("closeout_execution_receipt_cohort_mismatch"));

  const wrongCount = buildRetailerLinkParityCloseoutV1({
    plan: p,
    postDiff: diff("CHECKED"),
    ...b,
    execution_receipt: { ...b.execution_receipt, rows_updated: 2 },
  });
  assert.ok(wrongCount.blockers.includes("closeout_execution_receipt_row_count_mismatch"));

  for (const [name, execution_receipt, expected] of [
    ["zero count", { ...b.execution_receipt, rows_updated: 0 }, "closeout_execution_receipt_row_count_mismatch"],
    ["non applied", { ...b.execution_receipt, apply_status: "FAILED" }, "closeout_execution_receipt_not_applied"],
    ["wrong hash", { ...b.execution_receipt, plan_sha256: "0".repeat(64) }, "closeout_execution_receipt_plan_hash_mismatch"],
    ["missing receipt id", { ...b.execution_receipt, execution_id: "" }, "closeout_execution_receipt_or_identity_missing"],
  ] as const) {
    const receipt = buildRetailerLinkParityCloseoutV1({ plan: p, postDiff: diff("CHECKED"), ...b, execution_receipt: execution_receipt as never });
    assert.equal(receipt.closeout_status, "NOT_PROVEN", name);
    assert.ok(receipt.blockers.includes(expected), name);
  }

  const unexpectedLive = buildRetailerLinkParityCloseoutV1({
    plan: p,
    postDiff: diff("CHECKED"),
    ...b,
    postLiveRows: new Map([
      ["link-a", p.rows[0]!.approved_after],
      ["extra-link", p.rows[0]!.approved_after],
    ]),
  });
  assert.ok(unexpectedLive.blockers.includes("closeout_post_live_unexpected_row:extra-link"));

  // Production-consistent path: classifier UNKNOWN + both buyable + exact postLive → VERIFIED
  const unknownBoth = diff("CHECKED");
  unknownBoth.rows[0]!.status = "UNKNOWN";
  const verifiedUnknown = buildRetailerLinkParityCloseoutV1({
    plan: p, postDiff: unknownBoth, ...b,
  });
  assert.equal(verifiedUnknown.closeout_status, "VERIFIED");
});

test("semantic plan violations cannot close out VERIFIED", () => {
  const p = plan();
  const b = binding(p);
  const mutations: Array<(x: Record<string, unknown>) => void> = [
    ...(["DELETE", "INSERT", "UPSERT", "", undefined, 123] as const).map(
      (operation) => (x: Record<string, unknown>) => { x.operation = operation; },
    ),
    (x: Record<string, unknown>) => { ((x.rows as Array<Record<string, unknown>>)[0]!).foo = 1; },
    (x: Record<string, unknown>) => { (((x.rows as Array<Record<string, unknown>>)[0]!).expected_current as Record<string, unknown>).foo = 1; },
    (x: Record<string, unknown>) => { ((x.rows as Array<Record<string, unknown>>)[0]!).table = "public.other"; },
    (x: Record<string, unknown>) => { ((x.rows as Array<Record<string, unknown>>)[0]!).wedge = "other"; },
  ];
  for (const mutate of mutations) {
    const malformed = structuredClone(p) as Record<string, unknown>;
    mutate(malformed);
    malformed.plan_sha256 = hashRetailerLinkParityCorrectionPlanV1(malformed as never);
    const receipt = buildRetailerLinkParityCloseoutV1({
      plan: malformed as never,
      postDiff: diff("CHECKED"),
      ...b,
      expected_plan_sha256: malformed.plan_sha256 as string,
      execution_receipt: { ...b.execution_receipt, plan_sha256: malformed.plan_sha256 as string },
    });
    assert.equal(receipt.closeout_status, "NOT_PROVEN");
  }
});

test("missing and malformed execution receipts always remain NOT_PROVEN", () => {
  const p = plan();
  const b = binding(p);
  for (const receipt of [
    null,
    { execution_id: "execution-a" },
    { ...b.execution_receipt, updated_link_ids: undefined },
  ]) {
    const closeout = buildRetailerLinkParityCloseoutV1({
      plan: p, postDiff: diff("CHECKED"), ...b, execution_receipt: receipt as never,
    });
    assert.equal(closeout.closeout_status, "NOT_PROVEN");
  }
});
