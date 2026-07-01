import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, test } from "node:test";

import type { FounderDecisionRegistryRowV1 } from "../../src/lib/owner-dashboard/founder-decision-registry-v1";
import { HQII_CANDIDATE_QUEUE_UPSERT_IO_READ_INDEX_SUPABASE_BLOCKER_V1 } from "./hqii-candidate-queue-upsert-mutation-gate-v1";
import { HQII_CANDIDATE_QUEUE_UPSERT_PLAN_REL_V1 } from "./hqii-candidate-queue-upsert-mutation-gate-v1";
import {
  createHqiiCandidateQueueUpsertLiveDepsV1,
  runHqiiCandidateQueueUpsertV1,
  type HqiiCandidateQueueUpsertDepsV1,
} from "./hqii-candidate-queue-upsert-run-v1";
import type { FounderDecisionRowWithSlugCorrelationV1 } from "./founder-decision-slug-correlation-v1";
import { bindArtifactsAtHashesV1, loadTruthLedgerAppendEntriesV1 } from "./truth-ledger-v1";

const INPUT_REL_V1 = "fixtures/hqii-queue-run-input-v1.json";

function approvedHqiiRow(
  overrides: Partial<FounderDecisionRegistryRowV1> = {},
): FounderDecisionRegistryRowV1 {
  return {
    decision_id: "decision-hqii-queue-fixture",
    source_queue_row_id: "queue-hqii-fixture",
    source_decision_packet_id: "packet-hqii-fixture",
    decided_at: "2026-06-10T12:00:00.000Z",
    decision_status: "approved",
    owner_note: "Approve HQII candidate queue upsert.",
    allowed_next_scope: "owner_mutation_approved",
    evidence_required_before_mutation: true,
    prohibited_actions_still_apply: ["Do not upsert unbound input JSON."],
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

function writeInputFixture(root: string): ReturnType<typeof bindArtifactsAtHashesV1> {
  mkdirSync(path.dirname(path.join(root, INPUT_REL_V1)), { recursive: true });
  writeFileSync(
    path.join(root, INPUT_REL_V1),
    JSON.stringify([
      {
        filter_slug: "pentek-cbc-10bb",
        wedge: "refrigerator_water",
        url: "https://www.amazon.com/dp/B00310NIU0",
        token_evidence_ok: true,
      },
    ]),
    "utf8",
  );
  return bindArtifactsAtHashesV1({
    rootDir: root,
    artifacts: [{ artifact_rel_path: INPUT_REL_V1, entry_type: "apply_plan" }],
  });
}

type HqiiMockTableDataV1 = Record<string, unknown[]>;

function createHqiiMockSupabase(args: {
  tableData?: HqiiMockTableDataV1;
}): { client: SupabaseClient; writes: string[] } {
  const writes: string[] = [];
  const tableData = args.tableData ?? {
    filters: [{ id: "entity-uuid-1", slug: "pentek-cbc-10bb" }],
    retailer_offer_candidates: [],
  };

  const filterEq = (rows: unknown[], filters: Record<string, unknown>) =>
    rows.filter((row) =>
      Object.entries(filters).every(
        ([col, val]) => (row as Record<string, unknown>)[col] === val,
      ),
    );

  const builder = (table?: string, eqFilters: Record<string, unknown> = {}) => {
    const self = {
      select: () => builder(table, eqFilters),
      in: (col: string, values: unknown[]) => {
        const rows = (tableData[table ?? ""] ?? []).filter((row) =>
          values.includes((row as Record<string, unknown>)[col]),
        );
        return Promise.resolve({ data: rows, error: null });
      },
      eq: (col: string, val: unknown) => builder(table, { ...eqFilters, [col]: val }),
      limit: async () => {
        const rows = filterEq(tableData[table ?? ""] ?? [], eqFilters);
        return { data: rows, error: null };
      },
      insert: () => {
        writes.push(`insert:${table}`);
        return Promise.resolve({ error: null });
      },
      update: () => ({
        eq: () => {
          writes.push(`update:${table}`);
          return Promise.resolve({ error: null });
        },
      }),
    };
    return self;
  };

  const client = {
    from: (table: string) => builder(table),
  } as unknown as SupabaseClient;

  return { client, writes };
}

function mockDeps(client: SupabaseClient): HqiiCandidateQueueUpsertDepsV1 {
  return createHqiiCandidateQueueUpsertLiveDepsV1(() => client);
}

describe("hqii-candidate-queue-upsert-run-v1", () => {
  test("dry_run: no writes, no ledger entry", async () => {
    const root = mkdtempSync(path.join(tmpdir(), "hqii-run-dry-"));
    writeInputFixture(root);
    const { client, writes } = createHqiiMockSupabase({});
    try {
      const result = await runHqiiCandidateQueueUpsertV1({
        rootDir: root,
        inputPath: INPUT_REL_V1,
        write: false,
        deps: mockDeps(client),
      });
      assert.equal(result.exit_code, 0);
      assert.equal(result.report.dry_run, true);
      assert.equal(writes.length, 0);
      assert.equal(loadTruthLedgerAppendEntriesV1({ rootDir: root }).length, 0);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("write + READ_INDEX: no writes, one blocked ledger entry", async () => {
    const root = mkdtempSync(path.join(tmpdir(), "hqii-run-read-index-"));
    writeInputFixture(root);
    const { client, writes } = createHqiiMockSupabase({});
    try {
      const result = await runHqiiCandidateQueueUpsertV1({
        rootDir: root,
        inputPath: INPUT_REL_V1,
        write: true,
        io_capability: "READ_INDEX",
        deps: mockDeps(client),
        now: () => new Date("2026-06-10T12:00:00.000Z"),
      });
      assert.equal(result.exit_code, 1);
      assert.equal(result.report.apply_status, "BLOCKED");
      assert.equal(writes.length, 0);
      assert.ok(
        result.report.mutation_preflight_blockers?.includes(
          HQII_CANDIDATE_QUEUE_UPSERT_IO_READ_INDEX_SUPABASE_BLOCKER_V1,
        ),
      );
      const ledger = loadTruthLedgerAppendEntriesV1({ rootDir: root });
      assert.equal(ledger.length, 1);
      assert.equal(ledger[0]!.mutation_lane, "hqii_candidate_queue_upsert_v1");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("write + valid gate: performs insert, one applied ledger entry", async () => {
    const root = mkdtempSync(path.join(tmpdir(), "hqii-run-applied-"));
    const referenceTime = new Date("2026-06-10T12:00:00.000Z");
    const bound_artifacts_v1 = writeInputFixture(root);
    writeTrustCurrencyClearFixture(root, referenceTime);
    const founderRows = [
      loadedRow({
        row: approvedHqiiRow({ bound_artifacts_v1 }),
        apply_plan_rel_paths: [HQII_CANDIDATE_QUEUE_UPSERT_PLAN_REL_V1],
      }),
    ];
    const { client, writes } = createHqiiMockSupabase({});
    try {
      const result = await runHqiiCandidateQueueUpsertV1({
        rootDir: root,
        inputPath: INPUT_REL_V1,
        write: true,
        io_capability: "MUTATION",
        deps: mockDeps(client),
        now: () => referenceTime,
        founderRows,
      });
      assert.equal(result.exit_code, 0);
      assert.equal(result.report.apply_status, "APPLIED");
      assert.equal(result.report.inserted, 1);
      assert.ok(writes.some((w) => w.startsWith("insert:")));
      const ledger = loadTruthLedgerAppendEntriesV1({ rootDir: root });
      assert.equal(ledger.length, 1);
      assert.equal(ledger[0]!.apply_outcome, "applied");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("ledger append failure forces blocked result", async () => {
    const root = mkdtempSync(path.join(tmpdir(), "hqii-run-ledger-fail-"));
    const referenceTime = new Date("2026-06-10T12:00:00.000Z");
    const bound_artifacts_v1 = writeInputFixture(root);
    writeTrustCurrencyClearFixture(root, referenceTime);
    const founderRows = [
      loadedRow({
        row: approvedHqiiRow({ bound_artifacts_v1 }),
        apply_plan_rel_paths: [HQII_CANDIDATE_QUEUE_UPSERT_PLAN_REL_V1],
      }),
    ];
    const { client } = createHqiiMockSupabase({});
    try {
      const result = await runHqiiCandidateQueueUpsertV1({
        rootDir: root,
        inputPath: INPUT_REL_V1,
        write: true,
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
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
