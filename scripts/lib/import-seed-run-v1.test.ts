import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, test } from "node:test";

import type { FounderDecisionRegistryRowV1 } from "../../src/lib/owner-dashboard/founder-decision-registry-v1";
import {
  createImportSeedLiveDepsV1,
  runImportSeedV1,
  type ImportSeedDepsV1,
} from "./import-seed-run-v1";
import {
  IMPORT_SEED_IO_READ_INDEX_SUPABASE_BLOCKER_V1,
  IMPORT_SEED_PLAN_REL_V1,
  IMPORT_SEED_PRUNE_FRIDGE_CATALOG_BLOCKED_V1,
} from "./import-seed-mutation-gate-v1";
import type { FounderDecisionRowWithSlugCorrelationV1 } from "./founder-decision-slug-correlation-v1";
import { importSeedCsvRelPathsV1 } from "./seed-import-csv-paths-v1";
import { bindArtifactsAtHashesV1, loadTruthLedgerAppendEntriesV1 } from "./truth-ledger-v1";

function approvedImportRow(
  overrides: Partial<FounderDecisionRegistryRowV1> = {},
): FounderDecisionRegistryRowV1 {
  return {
    decision_id: "decision-import-seed-fixture",
    source_queue_row_id: "queue-import-fixture",
    source_decision_packet_id: "packet-import-fixture",
    decided_at: "2026-06-10T12:00:00.000Z",
    decision_status: "approved",
    owner_note: "Approve fridge seed import.",
    allowed_next_scope: "owner_mutation_approved",
    evidence_required_before_mutation: true,
    prohibited_actions_still_apply: ["Do not import unbound CSV pack."],
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

function writeFridgeCsvFixtures(root: string, useSample: boolean) {
  const suffix = useSample ? ".sample.csv" : ".csv";
  mkdirSync(path.join(root, "data"), { recursive: true });
  writeFileSync(path.join(root, `data/brands${suffix}`), "slug,name\nbrand-a,Brand A\n", "utf8");
  writeFileSync(
    path.join(root, `data/filters${suffix}`),
    "brand_slug,slug,oem_part_number\nbrand-a,filter-a,OA-1\n",
    "utf8",
  );
  writeFileSync(
    path.join(root, `data/fridge_models${suffix}`),
    "brand_slug,slug,model_number\nbrand-a,fridge-a,MODEL1\n",
    "utf8",
  );
  writeFileSync(
    path.join(root, `data/compatibility_mappings${suffix}`),
    "fridge_slug,filter_slug\nfridge-a,filter-a\n",
    "utf8",
  );
  writeFileSync(
    path.join(root, `data/retailer_links${suffix}`),
    "filter_slug,affiliate_url\nfilter-a,https://example.com/buy\n",
    "utf8",
  );
  const rels = importSeedCsvRelPathsV1({ rootDir: root, useSample });
  return bindArtifactsAtHashesV1({
    rootDir: root,
    artifacts: rels.map((artifact_rel_path) => ({
      artifact_rel_path,
      entry_type: "apply_plan" as const,
    })),
  });
}

type MockTableDataV1 = Record<string, unknown[]>;

function createImportSeedMockSupabase(args: {
  tableData?: MockTableDataV1;
}): { client: SupabaseClient; writes: string[] } {
  const writes: string[] = [];
  const tableData = args.tableData ?? {
    brands: [{ id: "brand-1", slug: "brand-a", name: "Brand A" }],
    filters: [{ id: "filter-1", slug: "filter-a" }],
    fridge_models: [{ id: "fridge-1", slug: "fridge-a" }],
    retailer_links: [],
  };

  const filterIn = (rows: unknown[], filters: Array<{ col: string; values: unknown[] }>) =>
    rows.filter((row) =>
      filters.every(({ col, values }) =>
        values.length === 0 ? true : values.includes((row as Record<string, unknown>)[col]),
      ),
    );

  const builder = (table?: string, inFilters: Array<{ col: string; values: unknown[] }> = []) => {
    const self = {
      select: () => builder(table, inFilters),
      not: () => builder(table, inFilters),
      in: (col: string, values: unknown[]) => builder(table, [...inFilters, { col, values }]),
      delete: () => {
        writes.push(`delete:${table}`);
        return Promise.resolve({ error: null });
      },
      upsert: () => {
        writes.push(`upsert:${table}`);
        return Promise.resolve({ error: null });
      },
      insert: () => {
        writes.push(`insert:${table}`);
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

function mockDeps(client: SupabaseClient): ImportSeedDepsV1 {
  return createImportSeedLiveDepsV1(() => client);
}

describe("import-seed-run-v1", () => {
  test("dry_run: no writes, no ledger entry", async () => {
    const root = mkdtempSync(path.join(tmpdir(), "import-seed-run-dry-"));
    writeFridgeCsvFixtures(root, true);
    const { client, writes } = createImportSeedMockSupabase({});
    try {
      const result = await runImportSeedV1({
        rootDir: root,
        write: false,
        useSample: true,
        pruneFridgeCatalog: false,
        deps: mockDeps(client),
      });
      assert.equal(result.exit_code, 0);
      assert.equal(result.report.dry_run, true);
      assert.equal(writes.length, 0);
      assert.equal(loadTruthLedgerAppendEntriesV1({ rootDir: root }).length, 0);
      assert.ok(result.report.phases.some((p) => p.action === "would_upsert"));
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("write + READ_INDEX: no Supabase writes, one blocked ledger entry", async () => {
    const root = mkdtempSync(path.join(tmpdir(), "import-seed-run-read-index-"));
    writeFridgeCsvFixtures(root, true);
    const { client, writes } = createImportSeedMockSupabase({});
    try {
      const result = await runImportSeedV1({
        rootDir: root,
        write: true,
        useSample: true,
        pruneFridgeCatalog: false,
        io_capability: "READ_INDEX",
        deps: mockDeps(client),
        now: () => new Date("2026-06-10T12:00:00.000Z"),
      });
      assert.equal(result.exit_code, 1);
      assert.equal(result.report.apply_status, "BLOCKED");
      assert.equal(writes.length, 0);
      assert.ok(
        result.report.mutation_preflight_blockers?.includes(
          IMPORT_SEED_IO_READ_INDEX_SUPABASE_BLOCKER_V1,
        ),
      );
      const ledger = loadTruthLedgerAppendEntriesV1({ rootDir: root });
      assert.equal(ledger.length, 1);
      assert.equal(ledger[0]!.apply_outcome, "blocked");
      assert.equal(ledger[0]!.mutation_lane, "import_seed_fridge_catalog_v1");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("write + prune: blocked without deletes", async () => {
    const root = mkdtempSync(path.join(tmpdir(), "import-seed-run-prune-"));
    const referenceTime = new Date("2026-06-10T12:00:00.000Z");
    writeTrustCurrencyClearFixture(root, referenceTime);
    const bound_artifacts_v1 = writeFridgeCsvFixtures(root, false);
    const founderRows = [
      loadedRow({
        row: approvedImportRow({ bound_artifacts_v1 }),
        apply_plan_rel_paths: [IMPORT_SEED_PLAN_REL_V1],
      }),
    ];
    const { client, writes } = createImportSeedMockSupabase({
      tableData: {
        brands: [{ id: "brand-1", slug: "brand-a", name: "Brand A" }],
        filters: [
          { id: "filter-1", slug: "filter-a" },
          { id: "filter-orphan", slug: "orphan-filter" },
        ],
        fridge_models: [{ id: "fridge-1", slug: "fridge-a" }],
        retailer_links: [],
      },
    });
    try {
      const result = await runImportSeedV1({
        rootDir: root,
        write: true,
        useSample: false,
        pruneFridgeCatalog: true,
        io_capability: "MUTATION",
        deps: mockDeps(client),
        now: () => referenceTime,
        founderRows,
      });
      assert.equal(result.exit_code, 1);
      assert.equal(result.report.apply_status, "BLOCKED");
      assert.ok(
        result.report.mutation_preflight_blockers?.includes(
          IMPORT_SEED_PRUNE_FRIDGE_CATALOG_BLOCKED_V1,
        ),
      );
      assert.equal(writes.length, 0);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("write + valid gate: performs upserts, one applied ledger entry", async () => {
    const root = mkdtempSync(path.join(tmpdir(), "import-seed-run-applied-"));
    const referenceTime = new Date("2026-06-10T12:00:00.000Z");
    writeTrustCurrencyClearFixture(root, referenceTime);
    const bound_artifacts_v1 = writeFridgeCsvFixtures(root, true);
    const founderRows = [
      loadedRow({
        row: approvedImportRow({ bound_artifacts_v1 }),
        apply_plan_rel_paths: [IMPORT_SEED_PLAN_REL_V1],
      }),
    ];
    const { client, writes } = createImportSeedMockSupabase({});
    try {
      const result = await runImportSeedV1({
        rootDir: root,
        write: true,
        useSample: true,
        pruneFridgeCatalog: false,
        io_capability: "MUTATION",
        deps: mockDeps(client),
        now: () => referenceTime,
        founderRows,
      });
      assert.equal(result.exit_code, 0);
      assert.equal(result.report.apply_status, "APPLIED");
      assert.equal(result.report.mutation_authorized, true);
      assert.ok(writes.some((w) => w.startsWith("upsert:")));
      const ledger = loadTruthLedgerAppendEntriesV1({ rootDir: root });
      assert.equal(ledger.length, 1);
      assert.equal(ledger[0]!.apply_outcome, "applied");
      assert.equal(ledger[0]!.founder_decision_id, "decision-import-seed-fixture");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
