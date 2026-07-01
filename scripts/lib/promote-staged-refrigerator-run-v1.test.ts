import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, test } from "node:test";

import type { FounderDecisionRegistryRowV1 } from "../../src/lib/owner-dashboard/founder-decision-registry-v1";
import { PROMOTE_STAGED_REFRIGERATOR_IO_READ_INDEX_SUPABASE_BLOCKER_V1 } from "./promote-staged-refrigerator-mutation-gate-v1";
import { PROMOTE_STAGED_REFRIGERATOR_PLAN_REL_V1 } from "./promote-staged-refrigerator-mutation-gate-v1";
import {
  createPromoteStagedRefrigeratorLiveDepsV1,
  runPromoteStagedRefrigeratorV1,
  type PromoteStagedRefrigeratorDepsV1,
} from "./promote-staged-refrigerator-run-v1";
import type { FounderDecisionRowWithSlugCorrelationV1 } from "./founder-decision-slug-correlation-v1";
import {
  bindArtifactsAtHashesV1,
  loadTruthLedgerAppendEntriesV1,
} from "./truth-ledger-v1";

function approvedPromoteRow(
  overrides: Partial<FounderDecisionRegistryRowV1> = {},
): FounderDecisionRegistryRowV1 {
  return {
    decision_id: "decision-promote-staged-fixture",
    source_queue_row_id: "queue-promote-fixture",
    source_decision_packet_id: "packet-promote-fixture",
    decided_at: "2026-06-10T12:00:00.000Z",
    decision_status: "approved",
    owner_note: "Approve promote staged refrigerator live catalog.",
    allowed_next_scope: "owner_mutation_approved",
    evidence_required_before_mutation: true,
    prohibited_actions_still_apply: ["Do not promote other catalogs."],
    expires_at: "2027-06-01T00:00:00.000Z",
    ...overrides,
  };
}

function loadedRow(args: {
  row: FounderDecisionRegistryRowV1;
  apply_plan_rel_paths?: string[];
}): FounderDecisionRowWithSlugCorrelationV1 {
  return {
    row: args.row,
    apply_context_target_slugs: [],
    apply_context_apply_plan_rel_paths: args.apply_plan_rel_paths ?? [],
  };
}

function writeTrustCurrencyClearFixture(root: string, referenceTime: Date): void {
  const dir = path.join(root, "data/truth-integrity");
  mkdirSync(dir, { recursive: true });
  const nextReAudit = new Date(referenceTime.getTime() + 365 * 24 * 60 * 60 * 1000).toISOString();
  writeFileSync(
    path.join(dir, "truth-integrity-registry-v1.json"),
    JSON.stringify({
      contract: "truth_integrity_registry_v1",
      read_only: true,
      data_mutation: false,
      mutation_authorized: false,
      findings: [
        {
          finding_id: "fixture-truth-integrity",
          finding_code: "FIXTURE",
          title: "Fixture finding",
          status: "OPEN",
          severity: "high",
          truth_surface: "buy_path",
          summary: "fixture",
          proven_gap: "fixture",
          false_safety_risk: "fixture",
          smallest_safe_fix: "fixture",
          re_audit: {
            next_re_audit_after: nextReAudit,
            last_re_audit_at: referenceTime.toISOString(),
            cadence_days: 30,
            re_audit_owner: "test",
          },
          validation_commands: { prove_gap: ["npm test"] },
        },
      ],
    }),
  );
}

function writeBoundPromotePlanFixture(root: string): ReturnType<typeof bindArtifactsAtHashesV1> {
  mkdirSync(path.dirname(path.join(root, PROMOTE_STAGED_REFRIGERATOR_PLAN_REL_V1)), {
    recursive: true,
  });
  writeFileSync(
    path.join(root, PROMOTE_STAGED_REFRIGERATOR_PLAN_REL_V1),
    'export const promoteLane = "fixture";\n',
    "utf8",
  );
  return bindArtifactsAtHashesV1({
    rootDir: root,
    artifacts: [
      {
        artifact_rel_path: PROMOTE_STAGED_REFRIGERATOR_PLAN_REL_V1,
        entry_type: "apply_plan",
      },
    ],
  });
}

type PromoteMockTableDataV1 = Record<string, unknown[]>;

function createPromoteMockSupabase(args: {
  tableData?: PromoteMockTableDataV1;
}): { client: SupabaseClient; writes: string[] } {
  const writes: string[] = [];
  const tableData = args.tableData ?? {};

  const thenable = <T>(value: T) => {
    const promise = Promise.resolve(value);
    return Object.assign(promise, {
      select: () => builder(),
      eq: () => builder(),
      order: () => builder(),
      limit: () => promise,
      insert: () => {
        writes.push("insert");
        return Promise.resolve({ error: null });
      },
      update: () => ({
        eq: () => ({
          eq: () => {
            writes.push("update");
            return Promise.resolve({ error: null });
          },
        }),
      }),
      upsert: () => {
        writes.push("upsert");
        return Promise.resolve({ error: null });
      },
    });
  };

  const builder = (table?: string, filters: Record<string, unknown> = {}) => {
    const self = {
      select: () => builder(table, filters),
      eq: (col: string, val: unknown) => builder(table, { ...filters, [col]: val }),
      order: () => builder(table, filters),
      limit: async () => {
        if (!table) return { data: [], error: null };
        const rows = (tableData[table] ?? []).filter((row) =>
          Object.entries(filters).every(([col, val]) => (row as Record<string, unknown>)[col] === val),
        );
        return { data: rows, error: null };
      },
      insert: () => {
        writes.push(`insert:${table}`);
        return Promise.resolve({ error: null });
      },
      update: () => ({
        eq: (col: string, val: unknown) => ({
          eq: (col2: string, val2: unknown) => {
            writes.push(`update:${table}:${col}=${String(val)}:${col2}=${String(val2)}`);
            return Promise.resolve({ error: null });
          },
        }),
      }),
      upsert: () => {
        writes.push(`upsert:${table}`);
        return Promise.resolve({ error: null });
      },
      then: thenable({ data: [], error: null }).then.bind(thenable({ data: [], error: null })),
    };
    return self;
  };

  const client = {
    from: (table: string) => builder(table),
  } as unknown as SupabaseClient;

  return { client, writes };
}

function mockDeps(client: SupabaseClient): PromoteStagedRefrigeratorDepsV1 {
  return createPromoteStagedRefrigeratorLiveDepsV1(() => client);
}

describe("promote-staged-refrigerator-run-v1", () => {
  test("dry_run: no ledger entry", async () => {
    const root = mkdtempSync(path.join(tmpdir(), "promote-run-dry-"));
    const { client } = createPromoteMockSupabase({});
    try {
      const result = await runPromoteStagedRefrigeratorV1({
        rootDir: root,
        write: false,
        limit: 10,
        deps: mockDeps(client),
      });
      assert.equal(result.exit_code, 0);
      assert.equal(result.report.dry_run, true);
      assert.equal(loadTruthLedgerAppendEntriesV1({ rootDir: root }).length, 0);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("write + READ_INDEX: no Supabase writes, one blocked ledger entry", async () => {
    const root = mkdtempSync(path.join(tmpdir(), "promote-run-read-index-"));
    const { client, writes } = createPromoteMockSupabase({});
    try {
      const result = await runPromoteStagedRefrigeratorV1({
        rootDir: root,
        write: true,
        limit: 10,
        io_capability: "READ_INDEX",
        deps: mockDeps(client),
        now: () => new Date("2026-06-10T12:00:00.000Z"),
      });
      assert.equal(result.exit_code, 1);
      assert.equal(result.report.apply_status, "BLOCKED");
      assert.equal(writes.length, 0);
      assert.ok(
        result.report.mutation_preflight_blockers?.includes(
          PROMOTE_STAGED_REFRIGERATOR_IO_READ_INDEX_SUPABASE_BLOCKER_V1,
        ),
      );
      const ledger = loadTruthLedgerAppendEntriesV1({ rootDir: root });
      assert.equal(ledger.length, 1);
      assert.equal(ledger[0]!.apply_outcome, "blocked");
      assert.equal(ledger[0]!.mutation_lane, "promote_staged_refrigerator_v1");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("write + MUTATION but no founder: no Supabase writes, one blocked ledger entry", async () => {
    const root = mkdtempSync(path.join(tmpdir(), "promote-run-no-founder-"));
    const referenceTime = new Date("2026-06-10T12:00:00.000Z");
    const { client, writes } = createPromoteMockSupabase({});
    try {
      writeTrustCurrencyClearFixture(root, referenceTime);
      const result = await runPromoteStagedRefrigeratorV1({
        rootDir: root,
        write: true,
        limit: 10,
        io_capability: "MUTATION",
        deps: mockDeps(client),
        now: () => referenceTime,
        founderRows: [],
      });
      assert.equal(result.exit_code, 1);
      assert.equal(result.report.apply_status, "BLOCKED");
      assert.equal(writes.length, 0);
      assert.ok(
        result.report.mutation_preflight_blockers?.includes(
          "founder_owner_mutation_approved_missing_or_inactive",
        ),
      );
      const ledger = loadTruthLedgerAppendEntriesV1({ rootDir: root });
      assert.equal(ledger.length, 1);
      assert.equal(ledger[0]!.apply_outcome, "blocked");
      assert.equal(ledger[0]!.founder_decision_id, null);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("write + valid MUTATION + trust + founder fixture: mocked writes run, one applied ledger entry", async () => {
    const root = mkdtempSync(path.join(tmpdir(), "promote-run-applied-"));
    const referenceTime = new Date("2026-06-10T12:00:00.000Z");
    const bound_artifacts_v1 = writeBoundPromotePlanFixture(root);
    writeTrustCurrencyClearFixture(root, referenceTime);
    const founderRows = [
      loadedRow({
        row: approvedPromoteRow({ bound_artifacts_v1 }),
        apply_plan_rel_paths: [PROMOTE_STAGED_REFRIGERATOR_PLAN_REL_V1],
      }),
    ];
    const { client, writes } = createPromoteMockSupabase({
      tableData: {
        staged_alias_additions: [
          {
            id: 42,
            catalog: "refrigerator_water",
            status: "ready",
            target_kind: "model",
            target_record_id: "model-uuid-1",
            proposed_alias: "RF28",
          },
        ],
      },
    });
    try {
      const result = await runPromoteStagedRefrigeratorV1({
        rootDir: root,
        write: true,
        limit: 10,
        io_capability: "MUTATION",
        deps: mockDeps(client),
        now: () => referenceTime,
        founderRows,
      });
      assert.equal(result.exit_code, 0);
      assert.equal(result.report.apply_status, "APPLIED");
      assert.equal(result.report.mutation_authorized, true);
      assert.ok(writes.length > 0);
      const ledger = loadTruthLedgerAppendEntriesV1({ rootDir: root });
      assert.equal(ledger.length, 1);
      assert.equal(ledger[0]!.mutation_lane, "promote_staged_refrigerator_v1");
      assert.equal(ledger[0]!.apply_outcome, "applied");
      assert.equal(ledger[0]!.founder_decision_id, "decision-promote-staged-fixture");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("ledger append failure forces blocked result", async () => {
    const root = mkdtempSync(path.join(tmpdir(), "promote-run-ledger-fail-"));
    const referenceTime = new Date("2026-06-10T12:00:00.000Z");
    const bound_artifacts_v1 = writeBoundPromotePlanFixture(root);
    writeTrustCurrencyClearFixture(root, referenceTime);
    const founderRows = [
      loadedRow({
        row: approvedPromoteRow({ bound_artifacts_v1 }),
        apply_plan_rel_paths: [PROMOTE_STAGED_REFRIGERATOR_PLAN_REL_V1],
      }),
    ];
    const { client } = createPromoteMockSupabase({ tableData: {} });
    try {
      const result = await runPromoteStagedRefrigeratorV1({
        rootDir: root,
        write: true,
        limit: 10,
        io_capability: "MUTATION",
        deps: mockDeps(client),
        now: () => referenceTime,
        founderRows,
        recordTruthLedger: () => ({
          ok: false,
          blockers: ["truth_ledger_append_failed:fixture"],
        }),
      });
      assert.equal(result.exit_code, 1);
      assert.equal(result.report.apply_status, "BLOCKED");
      assert.ok(
        result.report.mutation_preflight_blockers?.includes("truth_ledger_append_failed:fixture"),
      );
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("founder_decision_id is included when present on blocked ledger entry", async () => {
    const root = mkdtempSync(path.join(tmpdir(), "promote-run-founder-blocked-"));
    const referenceTime = new Date("2026-06-10T12:00:00.000Z");
    writeTrustCurrencyClearFixture(root, referenceTime);
    const bound_artifacts_v1 = writeBoundPromotePlanFixture(root);
    const founderRows = [
      loadedRow({
        row: approvedPromoteRow({
          bound_artifacts_v1,
          expires_at: "2020-01-01T00:00:00.000Z",
        }),
        apply_plan_rel_paths: [PROMOTE_STAGED_REFRIGERATOR_PLAN_REL_V1],
      }),
    ];
    const { client } = createPromoteMockSupabase({});
    try {
      const result = await runPromoteStagedRefrigeratorV1({
        rootDir: root,
        write: true,
        limit: 10,
        io_capability: "MUTATION",
        deps: mockDeps(client),
        now: () => referenceTime,
        founderRows,
      });
      assert.equal(result.exit_code, 1);
      const ledger = loadTruthLedgerAppendEntriesV1({ rootDir: root });
      assert.equal(ledger.length, 1);
      assert.equal(ledger[0]!.apply_outcome, "blocked");
      assert.equal(ledger[0]!.founder_decision_id, null);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
