import assert from "node:assert/strict";
import { describe, test } from "node:test";

import type { FounderDecisionRegistryRowV1 } from "../../src/lib/owner-dashboard/founder-decision-registry-v1";
import {
  extractSupabaseCsvParityApplyContextCorrelationV1,
  findActiveFounderDecisionForSupabaseCsvParitySlug,
  loadFounderDecisionRowsForSupabaseCsvParityV1,
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
  test("4396508 registry file is discovered, validates, and active approval matches slug", () => {
    const loaded = loadFounderDecisionRowsForSupabaseCsvParityV1(process.cwd());
    const row439 = loaded.find((entry) =>
      entry.row.decision_id.includes("4396508"),
    );
    assert.ok(row439, "fridge-safe-link-4396508-owner-approval-v1.json row must load");
    assert.equal(row439.row.decision_status, "approved");
    assert.equal(row439.row.allowed_next_scope, "owner_mutation_approved");
    assert.deepEqual(row439.apply_context_target_slugs, ["4396508"]);
    assert.ok(
      row439.apply_context_apply_plan_rel_paths.includes(APPLY_PLAN_4396508.toLowerCase()),
    );

    const active = findActiveFounderDecisionForSupabaseCsvParitySlug({
      slug: "4396508",
      applyPlanRel: APPLY_PLAN_4396508,
      founderRows: loaded,
      nowIso: "2026-06-28T20:00:00.000Z",
    });
    assert.equal(active?.decision_id, row439.row.decision_id);
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
    });
    assert.equal(active, null);
  });

  test("approved owner_mutation_approved decisions are accepted via apply_context", () => {
    const active = findActiveFounderDecisionForSupabaseCsvParitySlug({
      slug: "4396508",
      applyPlanRel: APPLY_PLAN_4396508,
      founderRows: [
        loadedRow({
          row: approved4396508Row({
            decision_id: "decision-minimal",
            owner_note: "Approved.",
          }),
          target_slugs: ["4396508"],
          apply_plan_rel_paths: [APPLY_PLAN_4396508],
        }),
      ],
      nowIso: "2026-06-27T20:00:00.000Z",
    });
    assert.equal(active?.decision_id, "decision-minimal");
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
