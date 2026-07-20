import assert from "node:assert/strict";
import test from "node:test";

import type {
  FridgeRetailerLinksDiffRowV1,
  FridgeSupabaseVsCsvRetailerLinksDiffV1,
} from "./fridge-supabase-vs-csv-retailer-links-diff-v1";
import {
  buildRetailerLinkParityIssueIdV1,
  buildRetailerLinkParityIssueIntakeV1,
  type BuckpartsRetailerLinkParityExistingRowIdentityV1,
} from "./buckparts-retailer-link-parity-issue-intake-v1";

const NOW = () => new Date("2026-07-19T12:00:00.000Z");

function row(
  filter_slug: string,
  status: FridgeRetailerLinksDiffRowV1["status"],
  overrides: Partial<FridgeRetailerLinksDiffRowV1> = {},
): FridgeRetailerLinksDiffRowV1 {
  return {
    filter_slug,
    status,
    csv_has_direct_buyable: true,
    csv_primary_url: "https://retailer.example/product",
    csv_primary_retailer: "Retailer",
    supabase_row_count: 1,
    supabase_direct_buyable_count: 0,
    supabase_safe_cta_count: 0,
    supabase_primary_url: "https://old.example/product",
    evidence_win_artifacts: ["data/evidence/win.json"],
    ...overrides,
  };
}

function diff(rows: FridgeRetailerLinksDiffRowV1[]): FridgeSupabaseVsCsvRetailerLinksDiffV1 {
  return {
    contract: "fridge_supabase_vs_csv_retailer_links_diff_v1",
    read_only: true,
    data_mutation: false,
    generated_at: NOW().toISOString(),
    exact_repo_paths_read: [],
    reconciliation_source_contract: "test",
    checked_slug_count: rows.length,
    checked_filter_slugs: rows.map((r) => r.filter_slug),
    supabase_truth_status: "CHECKED",
    supabase_unavailable_reason: null,
    supabase_has_win_csv_missing_count: 0,
    evidence_only_not_in_supabase_count: 0,
    csv_and_supabase_match_placeholder_count: 0,
    csv_has_win_supabase_missing_count: 0,
    unknown_status_count: rows.filter((r) => r.status === "UNKNOWN").length,
    recommended_next_action: "test",
    rows,
    proven_facts: [],
    inferred_facts: [],
    unknown_facts: [],
  };
}

function existing(filter_slug: string): BuckpartsRetailerLinkParityExistingRowIdentityV1 {
  return {
    filter_slug,
    filter_id: `filter-${filter_slug}`,
    supabase_link_id: `link-${filter_slug}`,
    is_primary: true,
    current_affiliate_url: "https://old.example/product",
    current_retailer_key: "old",
    current_retailer_name: "Old",
    current_browser_truth_classification: "search_placeholder",
  };
}

async function intake(rows: FridgeRetailerLinksDiffRowV1[], bySlug?: Map<string, BuckpartsRetailerLinkParityExistingRowIdentityV1 | null>) {
  return buildRetailerLinkParityIssueIntakeV1({
    rootDir: process.cwd(),
    now: NOW,
    diffBuilder: async () => diff(rows),
    loadExistingRows: async () => ({
      status: "CHECKED" as const,
      by_slug: bySlug ?? new Map(rows.map((r) => [r.filter_slug, existing(r.filter_slug)])),
    }),
  });
}

test("correctable statuses create deterministic DISCOVERED UPDATE candidates", async () => {
  const report = await intake([
    row("z-filter", "CSV_HAS_WIN_SUPABASE_MISSING"),
    row("a-filter", "EVIDENCE_ONLY_NOT_IN_SUPABASE"),
  ]);

  assert.equal(report.correctable_count, 2);
  assert.deepEqual(report.candidates.map((c) => c.lifecycle), ["DISCOVERED", "DISCOVERED"]);
  assert.ok(report.candidates.every((c) => c.operation === "UPDATE"));
  assert.ok(report.candidates.every((c) => c.insert_delete_posture === "forbidden"));
  assert.deepEqual(report.candidates.map((c) => c.issue_id), [...report.candidates.map((c) => c.issue_id)].sort());
});

test("UNKNOWN detector result and unavailable database fail closed without candidates", async () => {
  const unknown = await intake([row("unknown-filter", "UNKNOWN")]);
  assert.equal(unknown.candidates.length, 0);
  assert.deepEqual(unknown.blockers, ["unknown_or_db_unavailable:unknown-filter:UNKNOWN"]);

  const unavailable = await buildRetailerLinkParityIssueIntakeV1({
    rootDir: process.cwd(),
    now: NOW,
    diffBuilder: async () => ({ ...diff([row("x", "CSV_HAS_WIN_SUPABASE_MISSING")]), supabase_truth_status: "UNKNOWN_DB_UNAVAILABLE", supabase_unavailable_reason: "offline" }),
  });
  assert.equal(unavailable.candidates.length, 0);
  assert.deepEqual(unavailable.blockers, ["unknown_or_db_unavailable:detector:offline"]);
});

test("reruns are idempotent and same slug with distinct defects has distinct IDs", async () => {
  const sameRows = [row("filter-a", "CSV_HAS_WIN_SUPABASE_MISSING")];
  const first = await intake(sameRows);
  const second = await intake(sameRows);
  assert.deepEqual(first.candidates.map((c) => c.issue_id), second.candidates.map((c) => c.issue_id));

  const distinct = await intake([
    row("filter-a", "CSV_HAS_WIN_SUPABASE_MISSING"),
    row("filter-a", "EVIDENCE_ONLY_NOT_IN_SUPABASE"),
  ]);
  assert.equal(new Set(distinct.candidates.map((c) => c.issue_id)).size, 2);
});

test("missing existing row is blocked as an insert-required correction", async () => {
  const report = await intake(
    [row("missing", "CSV_HAS_WIN_SUPABASE_MISSING")],
    new Map([["missing", null]]),
  );
  assert.equal(report.candidates.length, 0);
  assert.deepEqual(report.blockers, ["insert_required_or_missing_existing_row:missing"]);
});

test("EVIDENCE_ONLY without a CSV URL is blocked", async () => {
  const report = await intake([
    row("evidence-only", "EVIDENCE_ONLY_NOT_IN_SUPABASE", { csv_primary_url: null }),
  ]);
  assert.equal(report.candidates.length, 0);
  assert.deepEqual(report.blockers, ["evidence_only_requires_csv_or_bound_url:evidence-only"]);
});

test("issue identity binds table and wedge; duplicate detector identity fails closed", async () => {
  const base = { defect_class: "CSV_HAS_WIN_SUPABASE_MISSING", table: "public.retailer_links", wedge: "refrigerator_water", filter_slug: "filter-a", link_id: "link-a" };
  const first = buildRetailerLinkParityIssueIdV1(base);
  assert.equal(first.ok, true);
  assert.equal(buildRetailerLinkParityIssueIdV1({ ...base, table: "public.other" }).ok, false);
  assert.equal(buildRetailerLinkParityIssueIdV1({ ...base, wedge: "other" }).ok, true);
  for (const field of ["defect_class", "table", "wedge", "filter_slug", "link_id"] as const) {
    assert.equal(buildRetailerLinkParityIssueIdV1({ ...base, [field]: "  " }).ok, false, `whitespace:${field}`);
    assert.equal(buildRetailerLinkParityIssueIdV1({ ...base, [field]: "" }).ok, false, `empty:${field}`);
    assert.equal(buildRetailerLinkParityIssueIdV1({ ...base, [field]: undefined }).ok, false, `missing:${field}`);
    assert.equal(buildRetailerLinkParityIssueIdV1({ ...base, [field]: 123 as never }).ok, false, `non-string:${field}`);
  }
  const valid = buildRetailerLinkParityIssueIdV1(base);
  assert.equal(valid.ok, true);
  if (valid.ok) assert.match(valid.issue_id, /^[a-f0-9]{32}$/);
  const report = await intake([row("same", "CSV_HAS_WIN_SUPABASE_MISSING"), row("same", "CSV_HAS_WIN_SUPABASE_MISSING")]);
  assert.equal(report.candidates.length, 0);
  assert.match(report.blockers.join("\n"), /^duplicate_intake_identity:/);
});
