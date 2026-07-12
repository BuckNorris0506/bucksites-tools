import assert from "node:assert/strict";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
  buildGswfGte18gsnrssNoFilterSupabaseRemovalApplyPlanOwnerReviewV1,
  writeGswfGte18gsnrssNoFilterSupabaseRemovalApplyPlanArtifactsV1,
  GSWF_GTE18GSNRSS_NO_FILTER_SUPABASE_REMOVAL_APPLY_PLAN_JSON_REL_V1,
} from "./gswf-gte18gsnrss-no-filter-supabase-removal-apply-plan-owner-review-v1";

const FIXED_NOW = () => new Date("2026-07-12T23:30:00.000Z");

function seedEmptyCompatCsv(root: string): void {
  mkdirSync(path.join(root, "data"), { recursive: true });
  writeFileSync(
    path.join(root, "data/compatibility_mappings.csv"),
    "fridge_slug,filter_slug\nge-other,gswf\n",
    "utf8",
  );
}

test("pending removal plan is read-only with exact 2 removals / 0 additions", async () => {
  const tmp = mkdtempSync(path.join(tmpdir(), "gte18-sb-plan-pending-"));
  try {
    seedEmptyCompatCsv(tmp);
    const plan = await buildGswfGte18gsnrssNoFilterSupabaseRemovalApplyPlanOwnerReviewV1({
      rootDir: tmp,
      now: FIXED_NOW,
      loadSupabaseCompat: async () => ({
        status: "CHECKED",
        supabase_filter_slugs: ["gswf", "gswf2"],
      }),
    });
    assert.equal(plan.read_only, true);
    assert.equal(plan.data_mutation, false);
    assert.equal(plan.supabase_mutation_authorized, false);
    assert.equal(plan.csv_mutation_authorized, false);
    assert.equal(plan.buy_cta_authorized, false);
    assert.equal(plan.plan_sync_state, "pending_removal");
    assert.equal(plan.classification, "SUPABASE_STILL_HAS_GSWF_FAMILY");
    assert.equal(plan.planned_slug_count, 1);
    assert.equal(plan.planned_supabase_row_removals, 2);
    assert.equal(plan.planned_supabase_row_additions, 0);
    assert.deepEqual(
      plan.planned_supabase_removals.map((r) => r.row_key),
      ["ge-gte18gsnrss,gswf", "ge-gte18gsnrss,gswf2"],
    );
    assert.deepEqual(plan.planned_supabase_additions, []);
    assert.deepEqual(plan.csv_current_mappings, []);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("empty supabase mappings produce already_applied plan", async () => {
  const tmp = mkdtempSync(path.join(tmpdir(), "gte18-sb-plan-sync-"));
  try {
    seedEmptyCompatCsv(tmp);
    const plan = await buildGswfGte18gsnrssNoFilterSupabaseRemovalApplyPlanOwnerReviewV1({
      rootDir: tmp,
      now: FIXED_NOW,
      loadSupabaseCompat: async () => ({ status: "CHECKED", supabase_filter_slugs: [] }),
    });
    assert.equal(plan.plan_sync_state, "already_applied");
    assert.equal(plan.classification, "IN_SYNC");
    assert.equal(plan.planned_supabase_row_removals, 0);
    assert.deepEqual(plan.planned_supabase_removals, []);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("write apply-plan artifacts only to allowlisted draft paths", async () => {
  const tmp = mkdtempSync(path.join(tmpdir(), "gte18-sb-plan-art-"));
  try {
    seedEmptyCompatCsv(tmp);
    const plan = await buildGswfGte18gsnrssNoFilterSupabaseRemovalApplyPlanOwnerReviewV1({
      rootDir: tmp,
      now: FIXED_NOW,
      loadSupabaseCompat: async () => ({
        status: "CHECKED",
        supabase_filter_slugs: ["gswf2", "gswf"],
      }),
    });
    const written = writeGswfGte18gsnrssNoFilterSupabaseRemovalApplyPlanArtifactsV1({
      rootDir: tmp,
      plan,
    });
    assert.equal(written.json_rel_path, GSWF_GTE18GSNRSS_NO_FILTER_SUPABASE_REMOVAL_APPLY_PLAN_JSON_REL_V1);
    assert.ok(existsSync(path.join(tmp, written.json_rel_path)));
    assert.ok(existsSync(path.join(tmp, written.md_rel_path)));
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});
