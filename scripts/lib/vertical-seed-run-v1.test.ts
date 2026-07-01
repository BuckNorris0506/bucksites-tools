import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, test } from "node:test";

import { HOMEKEEP_WEDGE_CATALOG } from "@/lib/catalog/identity";
import type { FounderDecisionRegistryRowV1 } from "../../src/lib/owner-dashboard/founder-decision-registry-v1";
import {
  createVerticalSeedLiveDepsV1,
  runVerticalSeedV1,
  type VerticalSeedDepsV1,
} from "./vertical-seed-run-v1";
import {
  VERTICAL_SEED_IO_READ_INDEX_SUPABASE_BLOCKER_V1,
  VERTICAL_SEED_PLAN_REL_V1,
} from "./vertical-seed-mutation-gate-v1";
import type { FounderDecisionRowWithSlugCorrelationV1 } from "./founder-decision-slug-correlation-v1";
import { verticalSeedCsvRelPathsV1 } from "./seed-import-csv-paths-v1";
import { bindArtifactsAtHashesV1, loadTruthLedgerAppendEntriesV1 } from "./truth-ledger-v1";

function approvedVerticalRow(
  overrides: Partial<FounderDecisionRegistryRowV1> = {},
): FounderDecisionRegistryRowV1 {
  return {
    decision_id: "decision-vertical-seed-fixture",
    source_queue_row_id: "queue-vertical-fixture",
    source_decision_packet_id: "packet-vertical-fixture",
    decided_at: "2026-06-10T12:00:00.000Z",
    decision_status: "approved",
    owner_note: "Approve vertical seed import.",
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

function writeVerticalCsvFixtures(root: string, useSample: boolean) {
  const suffix = useSample ? ".sample.csv" : ".csv";
  const dir = path.join(root, "data/air-purifier");
  mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, `brands${suffix}`), "slug,name\nbrand-a,Brand A\n", "utf8");
  writeFileSync(
    path.join(dir, `filters${suffix}`),
    "brand_slug,slug,oem_part_number\nbrand-a,filter-a,OA-1\n",
    "utf8",
  );
  writeFileSync(
    path.join(dir, `models${suffix}`),
    "brand_slug,slug,model_number\nbrand-a,model-a,MODEL1\n",
    "utf8",
  );
  writeFileSync(
    path.join(dir, `compatibility_mappings${suffix}`),
    "model_slug,filter_slug\nmodel-a,filter-a\n",
    "utf8",
  );
  writeFileSync(
    path.join(dir, `retailer_links${suffix}`),
    "filter_slug,affiliate_url\nfilter-a,https://example.com/buy\n",
    "utf8",
  );
  const rels = verticalSeedCsvRelPathsV1({
    rootDir: root,
    verticalKey: HOMEKEEP_WEDGE_CATALOG.air_purifier,
    useSample,
  });
  return bindArtifactsAtHashesV1({
    rootDir: root,
    artifacts: rels.map((artifact_rel_path) => ({
      artifact_rel_path,
      entry_type: "apply_plan" as const,
    })),
  });
}

type MockTableDataV1 = Record<string, unknown[]>;

function createVerticalSeedMockSupabase(args: {
  tableData?: MockTableDataV1;
}): { client: SupabaseClient; writes: string[] } {
  const writes: string[] = [];
  const tableData = args.tableData ?? {
    brands: [{ id: "brand-1", slug: "brand-a", name: "Brand A" }],
    air_purifier_filters: [{ id: "filter-1", slug: "filter-a" }],
    air_purifier_models: [{ id: "model-1", slug: "model-a" }],
    air_purifier_retailer_links: [],
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
      in: (col: string, values: unknown[]) => builder(table, [...inFilters, { col, values }]),
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

function mockDeps(client: SupabaseClient): VerticalSeedDepsV1 {
  return createVerticalSeedLiveDepsV1(() => client);
}

describe("vertical-seed-run-v1", () => {
  test("dry_run: no writes, no ledger entry", async () => {
    const root = mkdtempSync(path.join(tmpdir(), "vertical-seed-run-dry-"));
    writeVerticalCsvFixtures(root, true);
    const { client, writes } = createVerticalSeedMockSupabase({});
    try {
      const result = await runVerticalSeedV1({
        rootDir: root,
        verticalKey: HOMEKEEP_WEDGE_CATALOG.air_purifier,
        useSample: true,
        write: false,
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
    const root = mkdtempSync(path.join(tmpdir(), "vertical-seed-run-read-index-"));
    writeVerticalCsvFixtures(root, true);
    const { client, writes } = createVerticalSeedMockSupabase({});
    try {
      const result = await runVerticalSeedV1({
        rootDir: root,
        verticalKey: HOMEKEEP_WEDGE_CATALOG.air_purifier,
        useSample: true,
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
          VERTICAL_SEED_IO_READ_INDEX_SUPABASE_BLOCKER_V1,
        ),
      );
      const ledger = loadTruthLedgerAppendEntriesV1({ rootDir: root });
      assert.equal(ledger.length, 1);
      assert.equal(ledger[0]!.apply_outcome, "blocked");
      assert.equal(ledger[0]!.mutation_lane, "vertical_seed_catalog_v1");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("write + valid gate: performs upserts, one applied ledger entry", async () => {
    const root = mkdtempSync(path.join(tmpdir(), "vertical-seed-run-applied-"));
    const referenceTime = new Date("2026-06-10T12:00:00.000Z");
    writeTrustCurrencyClearFixture(root, referenceTime);
    const bound_artifacts_v1 = writeVerticalCsvFixtures(root, true);
    const founderRows = [
      loadedRow({
        row: approvedVerticalRow({ bound_artifacts_v1 }),
        apply_plan_rel_paths: [VERTICAL_SEED_PLAN_REL_V1],
      }),
    ];
    const { client, writes } = createVerticalSeedMockSupabase({});
    try {
      const result = await runVerticalSeedV1({
        rootDir: root,
        verticalKey: HOMEKEEP_WEDGE_CATALOG.air_purifier,
        useSample: true,
        write: true,
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
      assert.equal(ledger[0]!.founder_decision_id, "decision-vertical-seed-fixture");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
