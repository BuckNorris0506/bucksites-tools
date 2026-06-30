import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, test } from "node:test";

import type { FounderDecisionRegistryRowV1 } from "../../src/lib/owner-dashboard/founder-decision-registry-v1";
import { founderRegistryRowPassesMutationApprovalGateV1 } from "./founder-mutation-approval-gate-v1";
import { bindArtifactsAtHashesV1 } from "./truth-ledger-v1";
import {
  extractSupabaseCsvParityApplyContextCorrelationV1,
  findActiveFounderDecisionForSupabaseCsvParitySlug,
  loadFounderDecisionRowsForSupabaseCsvParityV1,
  runSupabaseCsvParityGuardedApplyV1,
  supabaseCsvParityFounderRowMatchesSlugAndApplyPlanV1,
  type SupabaseCsvParityFounderDecisionLoadedRowV1,
} from "./supabase-csv-parity-guarded-apply-v1";

const APPLY_PLAN_4396508 =
  "data/fridge/batch-production/drafts/fridge-safe-link-4396508-apply-plan-proposal-v1.json";

function approved4396508Row(
  overrides: Partial<FounderDecisionRegistryRowV1> = {},
): FounderDecisionRegistryRowV1 {
  return {
    decision_id: "decision-test-4396508",
    source_queue_row_id: "queue-test",
    source_decision_packet_id: "packet-test",
    decided_at: "2026-06-10T12:00:00.000Z",
    decision_status: "approved",
    owner_note: "Approve 4396508 guarded apply.",
    allowed_next_scope: "owner_mutation_approved",
    evidence_required_before_mutation: true,
    prohibited_actions_still_apply: ["Do not batch apply other slugs."],
    expires_at: "2027-06-01T00:00:00.000Z",
    ...overrides,
  };
}

function loadedRow(args: {
  row: FounderDecisionRegistryRowV1;
  target_slugs?: string[];
  apply_plan_rel_paths?: string[];
}): SupabaseCsvParityFounderDecisionLoadedRowV1 {
  return {
    row: args.row,
    apply_context_target_slugs: args.target_slugs ?? [],
    apply_context_apply_plan_rel_paths: args.apply_plan_rel_paths ?? [],
  };
}

describe("supabase-csv-parity-guarded-apply founder activation", () => {
  test("4396508 committed registry row without expires_at is not loaded (fail-closed)", () => {
    const loaded = loadFounderDecisionRowsForSupabaseCsvParityV1(process.cwd());
    const row439 = loaded.find((entry) =>
      entry.row.decision_id.includes("4396508"),
    );
    assert.equal(
      row439,
      undefined,
      "committed owner_mutation_approved rows without expires_at must not validate into loaded founder rows",
    );

    const active = findActiveFounderDecisionForSupabaseCsvParitySlug({
      slug: "4396508",
      applyPlanRel: APPLY_PLAN_4396508,
      founderRows: loaded,
      nowIso: "2026-06-28T20:00:00.000Z",
      rootDir: process.cwd(),
    });
    assert.equal(active, null);
  });

  test("deferred decisions are rejected even with apply_context correlation", () => {
    const active = findActiveFounderDecisionForSupabaseCsvParitySlug({
      slug: "4396508",
      applyPlanRel: APPLY_PLAN_4396508,
      founderRows: [
        loadedRow({
          row: approved4396508Row({ decision_status: "deferred", allowed_next_scope: "none" }),
          target_slugs: ["4396508"],
          apply_plan_rel_paths: [APPLY_PLAN_4396508],
        }),
      ],
      nowIso: "2026-06-27T20:00:00.000Z",
      rootDir: process.cwd(),
    });
    assert.equal(active, null);
  });

  test("approved owner_mutation_approved with bound artifacts accepted via apply_context", () => {
    const root = mkdtempSync(path.join(tmpdir(), "supabase-founder-"));
    try {
      mkdirSync(path.dirname(path.join(root, APPLY_PLAN_4396508)), { recursive: true });
      writeFileSync(path.join(root, APPLY_PLAN_4396508), '{"apply_plan":true}\n', "utf8");
      const bound_artifacts_v1 = bindArtifactsAtHashesV1({
        rootDir: root,
        artifacts: [{ artifact_rel_path: APPLY_PLAN_4396508, entry_type: "apply_plan" }],
      });
      const active = findActiveFounderDecisionForSupabaseCsvParitySlug({
        slug: "4396508",
        applyPlanRel: APPLY_PLAN_4396508,
        founderRows: [
          loadedRow({
            row: approved4396508Row({
              decision_id: "decision-minimal",
              owner_note: "Approved.",
              bound_artifacts_v1,
            }),
            target_slugs: ["4396508"],
            apply_plan_rel_paths: [APPLY_PLAN_4396508],
          }),
        ],
        nowIso: "2026-06-27T20:00:00.000Z",
        rootDir: root,
      });
      assert.equal(active?.decision_id, "decision-minimal");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("unrelated approved decisions cannot authorize another slug", () => {
    const ukf8001Loaded = loadedRow({
      row: approved4396508Row({
        decision_id: "decision-ukf8001-only",
        owner_note: "Approve ukf8001 only.",
      }),
      target_slugs: ["ukf8001"],
      apply_plan_rel_paths: [
        "data/fridge/batch-production/drafts/fridge-safe-link-ukf8001-apply-plan-proposal-v1.json",
      ],
    });

    const active = findActiveFounderDecisionForSupabaseCsvParitySlug({
      slug: "4396508",
      applyPlanRel: APPLY_PLAN_4396508,
      founderRows: [ukf8001Loaded],
      nowIso: "2026-06-27T20:00:00.000Z",
      rootDir: process.cwd(),
    });
    assert.equal(active, null);
    assert.equal(
      supabaseCsvParityFounderRowMatchesSlugAndApplyPlanV1({
        slug: "4396508",
        applyPlanRel: APPLY_PLAN_4396508,
        loaded: ukf8001Loaded,
      }),
      false,
    );
  });

  test("extractSupabaseCsvParityApplyContextCorrelationV1 reads slug-scoped context blobs", () => {
    const correlation = extractSupabaseCsvParityApplyContextCorrelationV1({
      decision_id: "x",
      "4396508_apply_context_v1": {
        target_slug: "4396508",
        apply_plan_rel_path: APPLY_PLAN_4396508,
      },
    });
    assert.deepEqual(correlation.apply_context_target_slugs, ["4396508"]);
    assert.deepEqual(correlation.apply_context_apply_plan_rel_paths, [
      APPLY_PLAN_4396508.toLowerCase(),
    ]);
  });
});

describe("supabase-csv-parity-guarded-apply committed evidence freshness", () => {
  test("4396508 write mode fails closed when evidence exceeds 45-day window", async () => {
    const report = await runSupabaseCsvParityGuardedApplyV1({
      rootDir: process.cwd(),
      slug: "4396508",
      now: () => new Date("2026-06-28T15:10:03.187Z"),
      writeCsv: true,
    });
    assert.ok(report.blockers.includes("committed_evidence_stale_beyond_max_age"));
    assert.equal(report.write_csv_applied, false);
    assert.equal(report.committed_evidence_freshness?.fresh, false);
  });

  test("ukf8001 write mode fails closed when evidence exceeds 45-day window", async () => {
    const report = await runSupabaseCsvParityGuardedApplyV1({
      rootDir: process.cwd(),
      slug: "ukf8001",
      now: () => new Date("2026-06-27T06:00:22.901Z"),
      writeCsv: true,
    });
    assert.ok(report.blockers.includes("committed_evidence_stale_beyond_max_age"));
    assert.equal(report.write_csv_applied, false);
    assert.equal(report.committed_evidence_freshness?.fresh, false);
  });
});
