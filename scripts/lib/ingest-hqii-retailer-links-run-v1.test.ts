import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, test } from "node:test";

import { HOMEKEEP_WEDGE_CATALOG } from "@/lib/catalog/identity";
import type { FounderDecisionRegistryRowV1 } from "../../src/lib/owner-dashboard/founder-decision-registry-v1";
import { INGEST_HQII_RETAILER_LINKS_IO_READ_INDEX_SUPABASE_BLOCKER_V1 } from "./ingest-hqii-retailer-links-mutation-gate-v1";
import { INGEST_HQII_RETAILER_LINKS_PLAN_REL_V1 } from "./ingest-hqii-retailer-links-mutation-gate-v1";
import {
  createIngestHqiiRetailerLinksLiveDepsV1,
  runIngestHqiiRetailerLinksV1,
  type IngestHqiiRetailerLinksDepsV1,
} from "./ingest-hqii-retailer-links-run-v1";
import type { FounderDecisionRowWithSlugCorrelationV1 } from "./founder-decision-slug-correlation-v1";
import { bindArtifactsAtHashesV1, loadTruthLedgerAppendEntriesV1 } from "./truth-ledger-v1";

const INPUT_REL_V1 = "fixtures/hqii-ingest-run-input-v1.json";

function approvedIngestRow(
  overrides: Partial<FounderDecisionRegistryRowV1> = {},
): FounderDecisionRegistryRowV1 {
  return {
    decision_id: "decision-ingest-hqii-fixture",
    source_queue_row_id: "queue-ingest-fixture",
    source_decision_packet_id: "packet-ingest-fixture",
    decided_at: "2026-06-10T12:00:00.000Z",
    decision_status: "approved",
    owner_note: "Approve HQII retailer link ingest.",
    allowed_next_scope: "owner_mutation_approved",
    evidence_required_before_mutation: true,
    prohibited_actions_still_apply: ["Do not ingest unbound input JSON."],
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
        filter_slug: "test-ap-filter",
        retailer_name: "Amazon",
        url: "https://www.amazon.com/dp/B00310NIU0",
      },
    ]),
    "utf8",
  );
  return bindArtifactsAtHashesV1({
    rootDir: root,
    artifacts: [{ artifact_rel_path: INPUT_REL_V1, entry_type: "apply_plan" }],
  });
}

type IngestMockTableDataV1 = Record<string, unknown[]>;

function createIngestMockSupabase(args: {
  tableData?: IngestMockTableDataV1;
}): { client: SupabaseClient; writes: string[] } {
  const writes: string[] = [];
  const tableData = args.tableData ?? {
    air_purifier_filters: [{ id: "filter-uuid-1", slug: "test-ap-filter" }],
    air_purifier_retailer_links: [],
  };

  const filterIn = (rows: unknown[], filters: Array<{ col: string; values: unknown[] }>) => {
    return rows.filter((row) =>
      filters.every(({ col, values }) =>
        values.length === 0 ? true : values.includes((row as Record<string, unknown>)[col]),
      ),
    );
  };

  const builder = (table?: string, inFilters: Array<{ col: string; values: unknown[] }> = []) => {
    const self = {
      select: () => builder(table, inFilters),
      in: (col: string, values: unknown[]) => builder(table, [...inFilters, { col, values }]),
      insert: () => {
        writes.push(`insert:${table}`);
        return Promise.resolve({ error: null });
      },
      upsert: () => {
        writes.push(`upsert:${table}`);
        return Promise.resolve({ error: null });
      },
      then: (
        resolve: (v: { data: unknown[]; error: null }) => void,
        reject?: (e: unknown) => void,
      ) => {
        const rows = filterIn(tableData[table ?? ""] ?? [], inFilters);
        return Promise.resolve({ data: rows, error: null }).then(resolve, reject);
      },
    };
    return self;
  };

  const client = {
    from: (table: string) => builder(table),
  } as unknown as SupabaseClient;

  return { client, writes };
}

function mockDeps(client: SupabaseClient): IngestHqiiRetailerLinksDepsV1 {
  return createIngestHqiiRetailerLinksLiveDepsV1(() => client);
}

describe("ingest-hqii-retailer-links-run-v1", () => {
  test("dry_run: no writes, no ledger entry", async () => {
    const root = mkdtempSync(path.join(tmpdir(), "ingest-run-dry-"));
    writeInputFixture(root);
    const { client, writes } = createIngestMockSupabase({});
    try {
      const result = await runIngestHqiiRetailerLinksV1({
        rootDir: root,
        inputPath: INPUT_REL_V1,
        write: false,
        wedgeArg: HOMEKEEP_WEDGE_CATALOG.air_purifier,
        allowUnknownRetailers: false,
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

  test("write + READ_INDEX: no Supabase writes, one blocked ledger entry", async () => {
    const root = mkdtempSync(path.join(tmpdir(), "ingest-run-read-index-"));
    writeInputFixture(root);
    const { client, writes } = createIngestMockSupabase({});
    try {
      const result = await runIngestHqiiRetailerLinksV1({
        rootDir: root,
        inputPath: INPUT_REL_V1,
        write: true,
        wedgeArg: HOMEKEEP_WEDGE_CATALOG.air_purifier,
        allowUnknownRetailers: false,
        io_capability: "READ_INDEX",
        deps: mockDeps(client),
        now: () => new Date("2026-06-10T12:00:00.000Z"),
      });
      assert.equal(result.exit_code, 1);
      assert.equal(result.report.apply_status, "BLOCKED");
      assert.equal(writes.length, 0);
      assert.ok(
        result.report.mutation_preflight_blockers?.includes(
          INGEST_HQII_RETAILER_LINKS_IO_READ_INDEX_SUPABASE_BLOCKER_V1,
        ),
      );
      const ledger = loadTruthLedgerAppendEntriesV1({ rootDir: root });
      assert.equal(ledger.length, 1);
      assert.equal(ledger[0]!.apply_outcome, "blocked");
      assert.equal(ledger[0]!.mutation_lane, "ingest_hqii_retailer_links_v1");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("write + MUTATION but no founder: no writes, one blocked ledger entry", async () => {
    const root = mkdtempSync(path.join(tmpdir(), "ingest-run-no-founder-"));
    const referenceTime = new Date("2026-06-10T12:00:00.000Z");
    writeInputFixture(root);
    writeTrustCurrencyClearFixture(root, referenceTime);
    const { client, writes } = createIngestMockSupabase({});
    try {
      const result = await runIngestHqiiRetailerLinksV1({
        rootDir: root,
        inputPath: INPUT_REL_V1,
        write: true,
        wedgeArg: HOMEKEEP_WEDGE_CATALOG.air_purifier,
        allowUnknownRetailers: false,
        io_capability: "MUTATION",
        deps: mockDeps(client),
        now: () => referenceTime,
        founderRows: [],
      });
      assert.equal(result.exit_code, 1);
      assert.equal(result.report.apply_status, "BLOCKED");
      assert.equal(writes.length, 0);
      const ledger = loadTruthLedgerAppendEntriesV1({ rootDir: root });
      assert.equal(ledger.length, 1);
      assert.equal(ledger[0]!.apply_outcome, "blocked");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("write + valid gate: performs insert, one applied ledger entry", async () => {
    const root = mkdtempSync(path.join(tmpdir(), "ingest-run-applied-"));
    const referenceTime = new Date("2026-06-10T12:00:00.000Z");
    const bound_artifacts_v1 = writeInputFixture(root);
    writeTrustCurrencyClearFixture(root, referenceTime);
    const founderRows = [
      loadedRow({
        row: approvedIngestRow({ bound_artifacts_v1 }),
        apply_plan_rel_paths: [INGEST_HQII_RETAILER_LINKS_PLAN_REL_V1],
      }),
    ];
    const { client, writes } = createIngestMockSupabase({});
    try {
      const result = await runIngestHqiiRetailerLinksV1({
        rootDir: root,
        inputPath: INPUT_REL_V1,
        write: true,
        wedgeArg: HOMEKEEP_WEDGE_CATALOG.air_purifier,
        allowUnknownRetailers: false,
        io_capability: "MUTATION",
        deps: mockDeps(client),
        now: () => referenceTime,
        founderRows,
      });
      assert.equal(result.exit_code, 0);
      assert.equal(result.report.apply_status, "APPLIED");
      assert.equal(result.report.mutation_authorized, true);
      assert.ok(writes.some((w) => w.startsWith("insert:")));
      const ledger = loadTruthLedgerAppendEntriesV1({ rootDir: root });
      assert.equal(ledger.length, 1);
      assert.equal(ledger[0]!.apply_outcome, "applied");
      assert.equal(ledger[0]!.founder_decision_id, "decision-ingest-hqii-fixture");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("ledger append failure forces blocked result", async () => {
    const root = mkdtempSync(path.join(tmpdir(), "ingest-run-ledger-fail-"));
    const referenceTime = new Date("2026-06-10T12:00:00.000Z");
    const bound_artifacts_v1 = writeInputFixture(root);
    writeTrustCurrencyClearFixture(root, referenceTime);
    const founderRows = [
      loadedRow({
        row: approvedIngestRow({ bound_artifacts_v1 }),
        apply_plan_rel_paths: [INGEST_HQII_RETAILER_LINKS_PLAN_REL_V1],
      }),
    ];
    const { client } = createIngestMockSupabase({});
    try {
      const result = await runIngestHqiiRetailerLinksV1({
        rootDir: root,
        inputPath: INPUT_REL_V1,
        write: true,
        wedgeArg: HOMEKEEP_WEDGE_CATALOG.air_purifier,
        allowUnknownRetailers: false,
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
});
