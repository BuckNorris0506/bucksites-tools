import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, test } from "node:test";

import type { FounderDecisionRegistryRowV1 } from "../../src/lib/owner-dashboard/founder-decision-registry-v1";
import { runRemoveDemoWedgeBrandsV1 } from "./remove-demo-wedge-brands-run-v1";
import {
  REMOVE_DEMO_WEDGE_BRANDS_IO_READ_INDEX_SUPABASE_BLOCKER_V1,
  REMOVE_DEMO_WEDGE_BRANDS_PLAN_REL_V1,
} from "./remove-demo-wedge-brands-mutation-gate-v1";
import type { FounderDecisionRowWithSlugCorrelationV1 } from "./founder-decision-slug-correlation-v1";
import { bindArtifactsAtHashesV1, loadTruthLedgerAppendEntriesV1 } from "./truth-ledger-v1";

function approvedRow(
  overrides: Partial<FounderDecisionRegistryRowV1> = {},
): FounderDecisionRegistryRowV1 {
  return {
    decision_id: "decision-remove-demo-run-fixture",
    source_queue_row_id: "queue-remove-demo-run-fixture",
    source_decision_packet_id: "packet-remove-demo-run-fixture",
    decided_at: "2026-06-10T12:00:00.000Z",
    decision_status: "approved",
    owner_note: "Approve demo wedge brand removal.",
    allowed_next_scope: "owner_mutation_approved",
    evidence_required_before_mutation: true,
    prohibited_actions_still_apply: ["Do not delete non-demo brands."],
    expires_at: "2027-06-01T00:00:00.000Z",
    ...overrides,
  };
}

function loadedRow(row: FounderDecisionRegistryRowV1): FounderDecisionRowWithSlugCorrelationV1 {
  return {
    row,
    apply_context_target_slugs: ["purebrand", "poewat"],
    apply_context_apply_plan_rel_paths: [REMOVE_DEMO_WEDGE_BRANDS_PLAN_REL_V1],
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

function writeBoundRemoveDemoPlanFixture(root: string): ReturnType<typeof bindArtifactsAtHashesV1> {
  mkdirSync(path.dirname(path.join(root, REMOVE_DEMO_WEDGE_BRANDS_PLAN_REL_V1)), {
    recursive: true,
  });
  writeFileSync(
    path.join(root, REMOVE_DEMO_WEDGE_BRANDS_PLAN_REL_V1),
    'export const removeDemoLane = "fixture";\n',
    "utf8",
  );
  return bindArtifactsAtHashesV1({
    rootDir: root,
    artifacts: [
      {
        artifact_rel_path: REMOVE_DEMO_WEDGE_BRANDS_PLAN_REL_V1,
        entry_type: "apply_plan",
      },
    ],
  });
}

function createMockSupabase(): { client: SupabaseClient; getDeleteCalls: () => number } {
  let deleteCalls = 0;
  const client = {
    from: () => ({
      select: () => ({
        in: async () => ({ data: [{ slug: "purebrand" }], error: null }),
      }),
      delete: () => {
        deleteCalls += 1;
        return { in: () => ({ select: async () => ({ data: [], error: null }) }) };
      },
    }),
  } as unknown as SupabaseClient;
  return { client, getDeleteCalls: () => deleteCalls };
}

describe("remove-demo-wedge-brands-run-v1", () => {
  test("dry-run selects but does not delete", async () => {
    const root = mkdtempSync(path.join(tmpdir(), "remove-demo-run-"));
    try {
      const mock = createMockSupabase({ existingSlugs: ["purebrand"] });
      let deleteCalls = 0;
      const client = {
        from: () => ({
          select: () => ({
            in: async () => ({ data: [{ slug: "purebrand" }], error: null }),
          }),
          delete: () => {
            deleteCalls += 1;
            return { in: () => ({ select: async () => ({ data: [], error: null }) }) };
          },
        }),
      } as unknown as SupabaseClient;
      const { report, exit_code } = await runRemoveDemoWedgeBrandsV1({
        rootDir: root,
        write: false,
        deps: { getSupabaseAdmin: () => client },
      });
      assert.equal(exit_code, 0);
      assert.equal(report.dry_run, true);
      assert.deepEqual(report.would_delete_slugs, ["purebrand"]);
      assert.equal(deleteCalls, 0);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("blocked write does not delete and appends ledger", async () => {
    const root = mkdtempSync(path.join(tmpdir(), "remove-demo-run-blocked-"));
    try {
      let deleteCalls = 0;
      const client = {
        from: () => ({
          select: () => ({
            in: async () => ({ data: [{ slug: "purebrand" }], error: null }),
          }),
          delete: () => {
            deleteCalls += 1;
            return { in: () => ({ select: async () => ({ data: [], error: null }) }) };
          },
        }),
      } as unknown as SupabaseClient;
      const { report, exit_code } = await runRemoveDemoWedgeBrandsV1({
        rootDir: root,
        write: true,
        allowFrozen: true,
        io_capability: "READ_INDEX",
        founderRows: [],
        deps: { getSupabaseAdmin: () => client },
      });
      assert.equal(exit_code, 1);
      assert.equal(report.apply_status, "BLOCKED");
      assert.equal(deleteCalls, 0);
      assert.ok(
        report.mutation_preflight_blockers?.includes(
          REMOVE_DEMO_WEDGE_BRANDS_IO_READ_INDEX_SUPABASE_BLOCKER_V1,
        ),
      );
      const entries = loadTruthLedgerAppendEntriesV1({ rootDir: root });
      assert.equal(entries[0]!.apply_outcome, "blocked");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("authorized write deletes and appends applied ledger", async () => {
    const root = mkdtempSync(path.join(tmpdir(), "remove-demo-run-applied-"));
    try {
      const referenceTime = new Date("2026-06-10T12:00:00.000Z");
      writeTrustCurrencyClearFixture(root, referenceTime);
      const bound_artifacts_v1 = writeBoundRemoveDemoPlanFixture(root);
      let deleteCalls = 0;
      const client = {
        from: () => ({
          select: () => ({
            in: async () => ({ data: [{ slug: "purebrand" }, { slug: "poewat" }], error: null }),
          }),
          delete: () => ({
            in: () => ({
              select: async () => {
                deleteCalls += 1;
                return {
                  data: [{ slug: "purebrand" }, { slug: "poewat" }],
                  error: null,
                };
              },
            }),
          }),
        }),
      } as unknown as SupabaseClient;
      const { report, exit_code } = await runRemoveDemoWedgeBrandsV1({
        rootDir: root,
        write: true,
        allowFrozen: true,
        io_capability: "MUTATION",
        now: () => referenceTime,
        founderRows: [loadedRow(approvedRow({ bound_artifacts_v1 }))],
        deps: { getSupabaseAdmin: () => client },
      });
      assert.equal(exit_code, 0);
      assert.equal(deleteCalls, 1);
      assert.equal(report.apply_status, "APPLIED");
      assert.deepEqual(report.deleted_slugs, ["purebrand", "poewat"]);
      const entries = loadTruthLedgerAppendEntriesV1({ rootDir: root });
      assert.equal(entries[0]!.apply_outcome, "applied");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
