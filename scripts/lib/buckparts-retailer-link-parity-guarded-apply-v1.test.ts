import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
  buildRetailerLinkParityCorrectionPlanV1,
  hashRetailerLinkParityCorrectionPlanV1,
} from "./buckparts-retailer-link-parity-correction-plan-v1";
import {
  applyRetailerLinkParityGuardedWriteV1,
  buildRetailerLinkParityGuardedApplyReportV1,
  BUCKPARTS_RETAILER_LINK_PARITY_OWNER_APPROVAL_JSON_REL_V1,
  type BuckpartsRetailerLinkParityLiveRowV1,
} from "./buckparts-retailer-link-parity-guarded-apply-v1";
import type { BuckpartsRetailerLinkParityIssueIntakeReportV1 } from "./buckparts-retailer-link-parity-issue-intake-v1";

const NOW = () => new Date("2026-07-19T12:00:00.000Z");

function plan() {
  const intake: BuckpartsRetailerLinkParityIssueIntakeReportV1 = {
    contract: "buckparts_retailer_link_parity_issue_intake_v1",
    read_only: true, data_mutation: false, mutation_authorized: false, generated_at: NOW().toISOString(),
    detected_count: 1, correctable_count: 1, unknown_count: 0, non_correctable_count: 0, blocked_count: 0,
    candidates: [{
      issue_id: "issue-a", lifecycle: "DISCOVERED", defect_class: "CSV_HAS_WIN_SUPABASE_MISSING",
      wedge: "refrigerator_water", table: "public.retailer_links", filter_slug: "filter-a",
      existing_row: {
        filter_slug: "filter-a", filter_id: "filter-id-a", supabase_link_id: "link-id-a", is_primary: true,
        current_affiliate_url: "https://old.example/a", current_retailer_key: "old",
        current_retailer_name: "Old", current_browser_truth_classification: "search_placeholder",
      },
      evidence_win_artifacts: ["data/evidence/a.json"], csv_primary_url: "https://new.example/a",
      csv_primary_retailer: "New", detector_status: "CSV_HAS_WIN_SUPABASE_MISSING",
      operation: "UPDATE", insert_delete_posture: "forbidden",
    }],
    blockers: [], proof_sources: [], recommended_next_action: "test",
  };
  return buildRetailerLinkParityCorrectionPlanV1({ intake, now: NOW });
}

function liveRow(p = plan()): BuckpartsRetailerLinkParityLiveRowV1 {
  return { ...p.rows[0]!.expected_current };
}

function fixture(options: {
  expires_at?: string;
  plan_sha256?: string;
  approved_table?: string;
  approved_wedge?: string;
  approved_updates?: number;
  review_after?: string;
  issued_at?: string;
  approved_at?: string;
  decision_id?: string;
  decision_status?: string;
  allowed_next_scope?: string;
  writeApproval?: boolean;
} = {}) {
  const rootDir = mkdtempSync(path.join(tmpdir(), "retailer-link-parity-"));
  const p = plan();
  if (options.writeApproval !== false) {
    const boundRel = "data/owner-decisions/bound-plan.json";
    const boundText = "{\"bound\":true}\n";
    const boundPath = path.join(rootDir, boundRel);
    mkdirSync(path.dirname(boundPath), { recursive: true });
    writeFileSync(boundPath, boundText);
    const approval = {
      rows: [{
        decision_id: options.decision_id ?? "decision-a",
        decision_status: options.decision_status ?? "approved",
        allowed_next_scope: options.allowed_next_scope ?? "owner_mutation_approved",
        expires_at: options.expires_at ?? "2026-07-20T12:00:00.000Z",
        review_after: options.review_after,
        issued_at: options.issued_at,
        approved_at: options.approved_at,
        bound_artifacts_v1: [{
          artifact_rel_path: boundRel,
          sha256_at_binding: createHash("sha256").update(boundText).digest("hex"),
        }],
        buckparts_retailer_link_parity_correction_owner_approval_context_v1: {
          plan_sha256: options.plan_sha256 ?? p.plan_sha256,
          approved_table: options.approved_table ?? "public.retailer_links",
          approved_wedge: options.approved_wedge ?? "refrigerator_water",
          approved_updates: options.approved_updates ?? p.row_count,
          approved_inserts: 0, approved_deletes: 0, operation: "UPDATE",
        },
      }],
    };
    const approvalPath = path.join(rootDir, BUCKPARTS_RETAILER_LINK_PARITY_OWNER_APPROVAL_JSON_REL_V1);
    mkdirSync(path.dirname(approvalPath), { recursive: true });
    writeFileSync(approvalPath, JSON.stringify(approval));
  }
  return { rootDir, plan: p };
}

async function report(args: ReturnType<typeof fixture>, overrides: Parameters<typeof buildRetailerLinkParityGuardedApplyReportV1>[0] = {} as never) {
  return buildRetailerLinkParityGuardedApplyReportV1({
    rootDir: args.rootDir, plan: args.plan, mode: "write", now: NOW, ioCapability: "MUTATION",
    loadLiveRows: async () => ({ status: "CHECKED" as const, by_link_id: new Map([["link-id-a", liveRow(args.plan)]]) }),
    ...overrides,
  });
}

async function assertBlocked(
  options: Parameters<typeof fixture>[0],
  expected: string,
  overrides: Parameters<typeof buildRetailerLinkParityGuardedApplyReportV1>[0] = {} as never,
) {
  const f = fixture(options);
  try {
    const result = await report(f, overrides);
    assert.equal(result.mutation_authorized, false);
    assert.ok(result.blockers.includes(expected), result.blockers.join("\n"));
  } finally {
    rmSync(f.rootDir, { recursive: true, force: true });
  }
}

test("missing approval prevents all writer calls", () =>
  assertBlocked({ writeApproval: false }, `founder_approval_missing:${BUCKPARTS_RETAILER_LINK_PARITY_OWNER_APPROVAL_JSON_REL_V1}`));
test("expired approval prevents all writer calls", () =>
  assertBlocked({ expires_at: "2026-07-19T11:59:59.000Z" }, "founder_approval_expired_or_unbounded"));
test("approval plan-hash mismatch prevents all writer calls", () =>
  assertBlocked({ plan_sha256: "0".repeat(64) }, "founder_approval_plan_sha256_mismatch"));
test("approval table and wedge mismatches prevent all writer calls", async () => {
  await assertBlocked({ approved_table: "public.other" }, "founder_approval_table_mismatch:public.other");
  await assertBlocked({ approved_wedge: "other" }, "founder_approval_wedge_mismatch:other");
});
test("approval row-count mismatch prevents all writer calls", () =>
  assertBlocked({ approved_updates: 2 }, "founder_approval_row_count_mismatch:approved=2 plan=1"));
test("malformed approval timestamps prevent all writer calls", async () => {
  await assertBlocked({ expires_at: "not-a-date" }, "founder_approval_expires_at_malformed");
  await assertBlocked({ review_after: "not-a-date" }, "founder_approval_review_after_malformed");
  await assertBlocked({ issued_at: "not-a-date" }, "founder_approval_issued_at_malformed");
  await assertBlocked({ approved_at: "not-a-date" }, "founder_approval_approved_at_malformed");
});
test("approval identity, status, and scope failures prevent all writer calls", async () => {
  await assertBlocked({ decision_id: "" }, "founder_approval_decision_id_missing");
  await assertBlocked({ decision_status: "pending" }, "founder_approval_not_approved:pending");
  await assertBlocked({ allowed_next_scope: "wrong_scope" }, "founder_approval_scope_mismatch:wrong_scope");
});

test("every approval defect is rechecked at final writer boundary", async () => {
  const cases: Array<[Parameters<typeof fixture>[0], string]> = [
    [{ approved_at: "not-a-date" }, "founder_approval_approved_at_malformed"],
    [{ issued_at: "not-a-date" }, "founder_approval_issued_at_malformed"],
    [{ expires_at: "not-a-date" }, "founder_approval_expires_at_malformed"],
    [{ review_after: "not-a-date" }, "founder_approval_review_after_malformed"],
    [{ decision_id: "" }, "founder_approval_decision_id_missing"],
    [{ plan_sha256: "0".repeat(64) }, "founder_approval_plan_sha256_mismatch"],
    [{ expires_at: "2026-07-19T11:59:59.000Z" }, "founder_approval_expired_or_unbounded"],
    [{ decision_status: "pending" }, "founder_approval_not_approved:pending"],
    [{ allowed_next_scope: "wrong_scope" }, "founder_approval_scope_mismatch:wrong_scope"],
  ];
  for (const [options, blocker] of cases) {
    const f = fixture(options);
    try {
      const refused = await report(f);
      assert.ok(refused.blockers.includes(blocker), blocker);
      let writer_calls = 0;
      await assert.rejects(
        applyRetailerLinkParityGuardedWriteV1({
          rootDir: f.rootDir, plan: f.plan,
          report: { ...refused, mutation_authorized: true, plan_sha256: f.plan.plan_sha256 },
          now: NOW, ioCapability: "MUTATION",
          loadLiveRows: async () => ({ status: "CHECKED" as const, by_link_id: new Map([["link-id-a", liveRow(f.plan)]]) }),
          getSupabaseAdmin: () => ({ from: () => ({ update: () => ({ eq: () => ({ eq: () => ({ eq: async () => { writer_calls += 1; return { error: null, count: 1 }; } }) }) }) }) }),
        }),
        new RegExp(blocker),
      );
      assert.equal(writer_calls, 0, blocker);
    } finally {
      rmSync(f.rootDir, { recursive: true, force: true });
    }
  }
});

test("duplicate planned row prevents all writer calls", async () => {
  const f = fixture();
  try {
    const duplicated = { ...f.plan, rows: [f.plan.rows[0]!, f.plan.rows[0]!], row_count: 2 };
    const result = await report(f, { plan: duplicated });
    assert.ok(result.blockers.includes("duplicate_row:link-id-a"));
  } finally { rmSync(f.rootDir, { recursive: true, force: true }); }
});

test("missing live row and drift fail closed", async () => {
  const f = fixture();
  try {
    const missing = await report(f, { loadLiveRows: async () => ({ status: "CHECKED" as const, by_link_id: new Map() }) });
    assert.ok(missing.blockers.includes("missing_live_row:link-id-a"));
    const drift = await report(f, { loadLiveRows: async () => ({ status: "CHECKED" as const, by_link_id: new Map([["link-id-a", { ...liveRow(f.plan), affiliate_url: "https://drift.example" }]]) }) });
    assert.ok(drift.blockers.includes("live_current_value_drift:filter-a:affiliate_url"));
  } finally { rmSync(f.rootDir, { recursive: true, force: true }); }
});

test("unexpected live fields and missing MUTATION fail closed", async () => {
  const f = fixture();
  try {
    const unexpected = await report(f, {
      loadLiveRows: async () => ({
        status: "CHECKED" as const,
        by_link_id: new Map([["link-id-a", { ...liveRow(f.plan), unexpected: true }]]),
      }),
    });
    assert.ok(unexpected.blockers.includes("unexpected_field:filter-a:unexpected"));
    const noMutation = await report(f, { ioCapability: "READ_INDEX" });
    assert.equal(noMutation.mutation_authorized, false);
    assert.ok(noMutation.blockers.length > 0);
  } finally { rmSync(f.rootDir, { recursive: true, force: true }); }
});

test("MUTATION without matching approval stays unauthorized", () =>
  assertBlocked({ writeApproval: false }, `founder_approval_missing:${BUCKPARTS_RETAILER_LINK_PARITY_OWNER_APPROVAL_JSON_REL_V1}`));

test("Supabase unavailability fails closed", async () => {
  const f = fixture();
  try {
    const result = await report(f, { loadLiveRows: async () => ({ status: "UNKNOWN_DB_UNAVAILABLE" as const, reason: "offline" }) });
    assert.ok(result.blockers.includes("supabase_unavailable:offline"));
  } finally { rmSync(f.rootDir, { recursive: true, force: true }); }
});

test("valid bounded control authorizes and writes once", async () => {
  const f = fixture();
  const prior = process.env.BUCKPARTS_IO_CAPABILITY;
  try {
    const ready = await report(f);
    assert.equal(
      ready.mutation_authorized,
      true,
      `expected authorized; blockers=${JSON.stringify(ready.blockers)} plan_blockers=${JSON.stringify(f.plan.blockers)}`,
    );
    let writer_calls = 0;
    process.env.BUCKPARTS_IO_CAPABILITY = "MUTATION";
    const applied = await applyRetailerLinkParityGuardedWriteV1({
      rootDir: f.rootDir, plan: f.plan, report: ready,
      now: NOW, ioCapability: "MUTATION",
      loadLiveRows: async () => ({ status: "CHECKED" as const, by_link_id: new Map([["link-id-a", liveRow(f.plan)]]) }),
      getSupabaseAdmin: () => ({
        from: () => ({
          update: () => ({
            eq: () => ({
              eq: () => ({
                eq: async () => { writer_calls += 1; return { error: null, count: 1 }; },
              }),
            }),
          }),
        }),
      }),
    });
    assert.equal(applied.rows_updated, 1);
    assert.ok(writer_calls >= 1);
  } finally {
    if (prior === undefined) delete process.env.BUCKPARTS_IO_CAPABILITY;
    else process.env.BUCKPARTS_IO_CAPABILITY = prior;
    rmSync(f.rootDir, { recursive: true, force: true });
  }
});

test("non-unit update count throws and never reports completion", async () => {
  const f = fixture();
  const prior = process.env.BUCKPARTS_IO_CAPABILITY;
  try {
    process.env.BUCKPARTS_IO_CAPABILITY = "MUTATION";
    const ready = { ...(await report(f)), mutation_authorized: true };
    await assert.rejects(
      applyRetailerLinkParityGuardedWriteV1({
        rootDir: f.rootDir, plan: f.plan, report: ready,
        now: NOW, ioCapability: "MUTATION",
        loadLiveRows: async () => ({ status: "CHECKED" as const, by_link_id: new Map([["link-id-a", liveRow(f.plan)]]) }),
        getSupabaseAdmin: () => ({ from: () => ({ update: () => ({ eq: () => ({ eq: () => ({ eq: async () => ({ error: null, count: 0 }) }) }) }) }) }),
      }),
      /Expected exactly 1 updated row/,
    );
  } finally {
    if (prior === undefined) delete process.env.BUCKPARTS_IO_CAPABILITY;
    else process.env.BUCKPARTS_IO_CAPABILITY = prior;
    rmSync(f.rootDir, { recursive: true, force: true });
  }
});

test("each expected-current field drift and report-A/plan-B refuse before writer", async () => {
  const f = fixture();
  const prior = process.env.BUCKPARTS_IO_CAPABILITY;
  try {
    const ready = await report(f);
    for (const field of ["supabase_link_id", "filter_slug", "filter_id", "retailer_key", "retailer_name", "affiliate_url", "is_primary", "browser_truth_classification"] as const) {
      const changed = { ...liveRow(f.plan), [field]: field === "is_primary" ? false : `drift-${field}` };
      const result = await report(f, { loadLiveRows: async () => ({ status: "CHECKED" as const, by_link_id: new Map([["link-id-a", changed]]) }) });
      assert.equal(result.mutation_authorized, false, field);
      assert.ok(result.blockers.some((blocker) => blocker.includes(field)), field);
      let writer_calls = 0;
      process.env.BUCKPARTS_IO_CAPABILITY = "MUTATION";
      await assert.rejects(
        applyRetailerLinkParityGuardedWriteV1({
          rootDir: f.rootDir, plan: f.plan, report: ready, now: NOW, ioCapability: "MUTATION",
          loadLiveRows: async () => ({ status: "CHECKED" as const, by_link_id: new Map([["link-id-a", changed]]) }),
          getSupabaseAdmin: () => ({ from: () => ({ update: () => ({ eq: () => ({ eq: () => ({ eq: async () => { writer_calls += 1; return { error: null, count: 1 }; } }) }) }) }) }),
        }),
        new RegExp(field),
      );
      assert.equal(writer_calls, 0, field);
    }
    process.env.BUCKPARTS_IO_CAPABILITY = "MUTATION";
    const planB = structuredClone(f.plan);
    planB.rows[0]!.after_row.affiliate_url = "https://plan-b.example";
    let writer_calls = 0;
    await assert.rejects(applyRetailerLinkParityGuardedWriteV1({
      rootDir: f.rootDir, plan: planB, report: ready, now: NOW, ioCapability: "MUTATION",
      loadLiveRows: async () => ({ status: "CHECKED" as const, by_link_id: new Map([["link-id-a", liveRow(f.plan)]]) }),
      getSupabaseAdmin: () => ({ from: () => ({ update: () => ({ eq: () => ({ eq: () => ({ eq: async () => { writer_calls += 1; return { error: null, count: 1 }; } }) }) }) }) }),
    }), /REPORT_PLAN_SHA256_MISMATCH/);
    assert.equal(writer_calls, 0);
  } finally {
    if (prior === undefined) delete process.env.BUCKPARTS_IO_CAPABILITY;
    else process.env.BUCKPARTS_IO_CAPABILITY = prior;
    rmSync(f.rootDir, { recursive: true, force: true });
  }
});

test("approved-after identity drift refuses before writer", async () => {
  const f = fixture();
  try {
    const malformed = structuredClone(f.plan);
    malformed.rows[0]!.approved_after.supabase_link_id = "link-id-b";
    malformed.plan_sha256 = (await import("./buckparts-retailer-link-parity-correction-plan-v1"))
      .hashRetailerLinkParityCorrectionPlanV1(malformed);
    const result = await report(f, { plan: malformed });
    assert.equal(result.mutation_authorized, false);
    assert.ok(result.blockers.includes("plan_identity_mismatch:supabase_link_id"));
  } finally {
    rmSync(f.rootDir, { recursive: true, force: true });
  }
});

test("non-UPDATE plan operations and unexpected row keys cannot cross report or writer boundary", async () => {
  const f = fixture();
  try {
    for (const operation of ["DELETE", "INSERT", "UPSERT", "", undefined, 123] as const) {
      const malformed = structuredClone(f.plan) as Record<string, unknown>;
      malformed.operation = operation;
      malformed.plan_sha256 = hashRetailerLinkParityCorrectionPlanV1(malformed as never);
      const refused = await report(f, { plan: malformed as never });
      assert.equal(refused.mutation_authorized, false, String(operation));
      assert.ok(refused.blockers.includes("plan_operation_not_update"), String(operation));
      let writer_calls = 0;
      await assert.rejects(
        applyRetailerLinkParityGuardedWriteV1({
          rootDir: f.rootDir, plan: malformed as never,
          report: { ...refused, plan_sha256: malformed.plan_sha256 as string, mutation_authorized: true },
          now: NOW, ioCapability: "MUTATION",
          loadLiveRows: async () => ({ status: "CHECKED" as const, by_link_id: new Map([["link-id-a", liveRow(f.plan)]]) }),
          getSupabaseAdmin: () => ({ from: () => ({ update: () => ({ eq: () => ({ eq: () => ({ eq: async () => { writer_calls += 1; return { error: null, count: 1 }; } }) }) }) }) }),
        }),
        /PLAN_SEMANTICS_INVALID.*plan_operation_not_update/,
      );
      assert.equal(writer_calls, 0, String(operation));
    }
    const malformed = structuredClone(f.plan) as Record<string, unknown>;
    ((malformed.rows as Array<Record<string, unknown>>)[0]!).foo = 1;
    malformed.plan_sha256 = hashRetailerLinkParityCorrectionPlanV1(malformed as never);
    const refused = await report(f, { plan: malformed as never });
    assert.equal(refused.mutation_authorized, false);
    assert.ok(refused.blockers.includes("plan_row_unexpected_key:foo"));
    let writer_calls = 0;
    await assert.rejects(
      applyRetailerLinkParityGuardedWriteV1({
        rootDir: f.rootDir, plan: malformed as never,
        report: { ...refused, mutation_authorized: true, plan_sha256: malformed.plan_sha256 as string },
        now: NOW, ioCapability: "MUTATION",
        loadLiveRows: async () => ({ status: "CHECKED" as const, by_link_id: new Map([["link-id-a", liveRow(f.plan)]]) }),
        getSupabaseAdmin: () => ({ from: () => ({ update: () => ({ eq: () => ({ eq: () => ({ eq: async () => { writer_calls += 1; return { error: null, count: 1 }; } }) }) }) }) }),
      }),
      /plan_row_unexpected_key:foo/,
    );
    assert.equal(writer_calls, 0);
  } finally {
    rmSync(f.rootDir, { recursive: true, force: true });
  }
});

test("multi-row plan refuses before any writer call under single-row v1 cap", async () => {
  const f = fixture();
  const prior = process.env.BUCKPARTS_IO_CAPABILITY;
  try {
    process.env.BUCKPARTS_IO_CAPABILITY = "MUTATION";
    const row2 = structuredClone(f.plan.rows[0]!);
    row2.issue_id = "issue-b";
    row2.filter_slug = "filter-b";
    row2.expected_current = { ...row2.expected_current, filter_slug: "filter-b", supabase_link_id: "link-id-b", filter_id: "filter-id-b" };
    row2.approved_after = { ...row2.approved_after, filter_slug: "filter-b", supabase_link_id: "link-id-b", filter_id: "filter-id-b" };
    row2.before_row = row2.expected_current;
    row2.after_row = row2.approved_after;
    row2.rollback_restore_before_row = row2.expected_current;
    const multi = {
      ...f.plan,
      apply_model: "single_row_apply_v1" as const,
      rows: [f.plan.rows[0]!, row2],
      row_count: 2,
      blockers: [] as string[],
      plan_sha256: "",
    };
    const { hashRetailerLinkParityCorrectionPlanV1 } = await import("./buckparts-retailer-link-parity-correction-plan-v1");
    multi.plan_sha256 = hashRetailerLinkParityCorrectionPlanV1(multi);
    let writer_calls = 0;
    const unauthorized = await buildRetailerLinkParityGuardedApplyReportV1({
      rootDir: f.rootDir,
      plan: multi,
      mode: "write",
      now: NOW,
      ioCapability: "MUTATION",
      loadLiveRows: async () => ({
        status: "CHECKED" as const,
        by_link_id: new Map([
          ["link-id-a", liveRow(f.plan)],
          ["link-id-b", { ...liveRow(f.plan), filter_slug: "filter-b", supabase_link_id: "link-id-b", filter_id: "filter-id-b" }],
        ]),
      }),
    });
    assert.equal(unauthorized.mutation_authorized, false);
    assert.ok(unauthorized.blockers.some((b) => b.includes("single_row") || b.includes("max_rows") || b.includes("APPLY_MAX")));
    await assert.rejects(
      applyRetailerLinkParityGuardedWriteV1({
        rootDir: f.rootDir,
        plan: multi,
        report: { ...unauthorized, mutation_authorized: true, plan_sha256: multi.plan_sha256 },
        now: NOW,
        ioCapability: "MUTATION",
        loadLiveRows: async () => ({
          status: "CHECKED" as const,
          by_link_id: new Map([
            ["link-id-a", liveRow(f.plan)],
            ["link-id-b", { ...liveRow(f.plan), filter_slug: "filter-b", supabase_link_id: "link-id-b", filter_id: "filter-id-b" }],
          ]),
        }),
        getSupabaseAdmin: () => ({
          from: () => ({
            update: () => ({
              eq: () => ({
                eq: () => ({
                  eq: async () => {
                    writer_calls += 1;
                    return { error: null, count: 1 };
                  },
                }),
              }),
            }),
          }),
        }),
      }),
      /SINGLE_ROW|MAX_EXCEEDED|NOT_AUTHORIZED|PLAN_SEMANTICS_INVALID/,
    );
    assert.equal(writer_calls, 0);
  } finally {
    if (prior === undefined) delete process.env.BUCKPARTS_IO_CAPABILITY;
    else process.env.BUCKPARTS_IO_CAPABILITY = prior;
    rmSync(f.rootDir, { recursive: true, force: true });
  }
});

test("write payload never includes destination_url", async () => {
  const f = fixture();
  const prior = process.env.BUCKPARTS_IO_CAPABILITY;
  try {
    process.env.BUCKPARTS_IO_CAPABILITY = "MUTATION";
    const ready = await report(f);
    let captured: Record<string, unknown> | null = null;
    await applyRetailerLinkParityGuardedWriteV1({
      rootDir: f.rootDir,
      plan: f.plan,
      report: ready,
      now: NOW,
      ioCapability: "MUTATION",
      loadLiveRows: async () => ({ status: "CHECKED" as const, by_link_id: new Map([["link-id-a", liveRow(f.plan)]]) }),
      getSupabaseAdmin: () => ({
        from: () => ({
          update: (payload: Record<string, unknown>) => {
            captured = payload;
            return {
              eq: () => ({
                eq: () => ({
                  eq: async () => ({ error: null, count: 1 }),
                }),
              }),
            };
          },
        }),
      }),
    });
    assert.ok(captured);
    assert.equal(Object.prototype.hasOwnProperty.call(captured, "destination_url"), false);
    assert.deepEqual(Object.keys(captured!).sort(), [
      "affiliate_url",
      "browser_truth_classification",
      "is_primary",
      "retailer_key",
      "retailer_name",
    ]);
  } finally {
    if (prior === undefined) delete process.env.BUCKPARTS_IO_CAPABILITY;
    else process.env.BUCKPARTS_IO_CAPABILITY = prior;
    rmSync(f.rootDir, { recursive: true, force: true });
  }
});
