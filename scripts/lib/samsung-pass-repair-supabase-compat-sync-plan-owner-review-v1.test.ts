import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { SAMSUNG_PASS_PLANNED_FRIDGE_SLUGS_V1 } from "./samsung-pass-repair-apply-plan-v1";
import {
  buildSamsungPassRepairSupabaseCompatSyncPlanOwnerReviewV1,
  SAMSUNG_PASS_REPAIR_SUPABASE_COMPAT_SYNC_PLAN_ALLOWED_WRITE_REL_PATHS_V1,
  SAMSUNG_PASS_REPAIR_SUPABASE_COMPAT_SYNC_PLAN_CONTRACT_V1,
  SAMSUNG_PASS_REPAIR_SUPABASE_COMPAT_SYNC_PLAN_JSON_REL_V1,
  SAMSUNG_PASS_REPAIR_SUPABASE_COMPAT_SYNC_PLAN_MD_REL_V1,
  SAMSUNG_PASS_SUPABASE_COMPAT_SYNC_EXPECTED_COUNTS_V1,
  samsungPassSupabaseCompatSyncAllowedRemovalKeysV1,
  writeSamsungPassRepairSupabaseCompatSyncPlanOwnerReviewArtifactsV1,
} from "./samsung-pass-repair-supabase-compat-sync-plan-owner-review-v1";

const ROOT = process.cwd();
const LIB_SOURCE = readFileSync(
  "scripts/lib/samsung-pass-repair-supabase-compat-sync-plan-owner-review-v1.ts",
  "utf8",
);
const REPORT_SOURCE = readFileSync(
  "scripts/report-samsung-pass-repair-supabase-compat-sync-plan-owner-review-v1.ts",
  "utf8",
);
const FIXED_NOW = () => new Date("2026-07-13T00:00:00.000Z");

const LIVE_DIRTY: Record<string, string[]> = {
  "samsung-rf27t5201sr": ["da29-10105j"],
  "samsung-rf27t5501sr": ["da29-00012b", "da29-00020b"],
  "samsung-rf28r6301sr": ["da29-00019a"],
  "samsung-rf28t5101sr": ["da29-00019a"],
  "samsung-rs22t5201sg": ["da29-10105j"],
};

test("pending sync plan is read-only with exact 5/6/5 deltas", async () => {
  const plan = await buildSamsungPassRepairSupabaseCompatSyncPlanOwnerReviewV1({
    rootDir: ROOT,
    now: FIXED_NOW,
    loadSupabaseCompat: async (slug) => ({
      status: "CHECKED",
      supabase_filter_slugs: LIVE_DIRTY[slug] ?? [],
    }),
  });

  assert.equal(plan.contract, SAMSUNG_PASS_REPAIR_SUPABASE_COMPAT_SYNC_PLAN_CONTRACT_V1);
  assert.equal(plan.read_only, true);
  assert.equal(plan.data_mutation, false);
  assert.equal(plan.supabase_mutation_authorized, false);
  assert.equal(plan.csv_mutation_authorized, false);
  assert.equal(plan.buy_cta_authorized, false);
  assert.equal(plan.retailer_links_mutation_authorized, false);
  assert.equal(plan.apply_authorized, false);
  assert.equal(plan.plan_sync_state, "pending_sync");
  assert.equal(plan.planned_slug_count, 5);
  assert.equal(plan.planned_supabase_row_removals, 6);
  assert.equal(plan.planned_supabase_row_additions, 5);
  assert.equal(plan.classification_counts.SUPABASE_STILL_HAS_OLD_ROWS, 5);
  assert.deepEqual(
    plan.planned_supabase_removals.map((r) => r.row_key).sort(),
    samsungPassSupabaseCompatSyncAllowedRemovalKeysV1(),
  );
  assert.deepEqual(
    plan.planned_supabase_additions.map((r) => r.row_key).sort(),
    [...SAMSUNG_PASS_PLANNED_FRIDGE_SLUGS_V1]
      .map((slug) => `${slug},da97-17376b`)
      .sort(),
  );
  assert.equal(
    plan.planned_supabase_row_removals + plan.planned_supabase_row_additions,
    SAMSUNG_PASS_SUPABASE_COMPAT_SYNC_EXPECTED_COUNTS_V1.planned_row_deltas,
  );
});

test("already in-sync live mappings yield already_in_sync with zero deltas", async () => {
  const plan = await buildSamsungPassRepairSupabaseCompatSyncPlanOwnerReviewV1({
    rootDir: ROOT,
    now: FIXED_NOW,
    loadSupabaseCompat: async () => ({
      status: "CHECKED",
      supabase_filter_slugs: ["da97-17376b"],
    }),
  });
  assert.equal(plan.plan_sync_state, "already_in_sync");
  assert.equal(plan.classification_counts.IN_SYNC, 5);
  assert.equal(plan.planned_supabase_row_removals, 0);
  assert.equal(plan.planned_supabase_row_additions, 0);
});

test("write artifacts only to allowlisted draft paths", async () => {
  const tmp = mkdtempSync(path.join(tmpdir(), "samsung-pass-sync-plan-"));
  try {
    const plan = await buildSamsungPassRepairSupabaseCompatSyncPlanOwnerReviewV1({
      rootDir: ROOT,
      now: FIXED_NOW,
      loadSupabaseCompat: async (slug) => ({
        status: "CHECKED",
        supabase_filter_slugs: LIVE_DIRTY[slug] ?? [],
      }),
    });
    const written = writeSamsungPassRepairSupabaseCompatSyncPlanOwnerReviewArtifactsV1({
      rootDir: tmp,
      plan,
    });
    assert.deepEqual(
      [written.json_rel_path, written.md_rel_path],
      [...SAMSUNG_PASS_REPAIR_SUPABASE_COMPAT_SYNC_PLAN_ALLOWED_WRITE_REL_PATHS_V1],
    );
    assert.equal(existsSync(path.join(tmp, SAMSUNG_PASS_REPAIR_SUPABASE_COMPAT_SYNC_PLAN_JSON_REL_V1)), true);
    assert.equal(existsSync(path.join(tmp, SAMSUNG_PASS_REPAIR_SUPABASE_COMPAT_SYNC_PLAN_MD_REL_V1)), true);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("source forbids CSV/retailer/buy CTA/HQ mutation and uses tryLoadSupabaseCompatForModelV1", () => {
  assert.match(LIB_SOURCE, /tryLoadSupabaseCompatForModelV1/);
  assert.match(LIB_SOURCE, /csv_mutation_authorized: false/);
  assert.match(LIB_SOURCE, /buy_cta_authorized: false/);
  assert.match(LIB_SOURCE, /retailer_links_mutation_authorized: false/);
  assert.doesNotMatch(LIB_SOURCE, /BuckParts-HQ-HANDOFF/);
  assert.doesNotMatch(LIB_SOURCE, /retailer_links\.csv/);
  assert.doesNotMatch(REPORT_SOURCE, /--apply/);
});
