import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { REFRIGERATOR_MODEL_FIRST_QA_BATCH_FRIDGE_SLUGS_V1 } from "./refrigerator-model-first-qa-batch-supabase-compat-parity-owner-review-v1";
import {
  buildRefrigeratorModelFirstQaBatchSupabaseCompatSyncPlanOwnerReviewV1,
  REFRIGERATOR_MODEL_FIRST_QA_BATCH_SUPABASE_COMPAT_SYNC_ALLOWED_REMOVALS_V1,
  REFRIGERATOR_MODEL_FIRST_QA_BATCH_SUPABASE_COMPAT_SYNC_EXPECTED_COUNTS_V1,
  REFRIGERATOR_MODEL_FIRST_QA_BATCH_SUPABASE_COMPAT_SYNC_PLAN_ALLOWED_WRITE_REL_PATHS_V1,
  REFRIGERATOR_MODEL_FIRST_QA_BATCH_SUPABASE_COMPAT_SYNC_PLAN_CONTRACT_V1,
  REFRIGERATOR_MODEL_FIRST_QA_BATCH_SUPABASE_COMPAT_SYNC_PLAN_JSON_REL_V1,
  REFRIGERATOR_MODEL_FIRST_QA_BATCH_SUPABASE_COMPAT_SYNC_PLAN_MD_REL_V1,
  refrigeratorModelFirstQaBatchSupabaseCompatSyncAllowedRemovalKeysV1,
  writeRefrigeratorModelFirstQaBatchSupabaseCompatSyncPlanOwnerReviewArtifactsV1,
} from "./refrigerator-model-first-qa-batch-supabase-compat-sync-plan-owner-review-v1";

const ROOT = process.cwd();
const LIB_SOURCE = readFileSync(
  "scripts/lib/refrigerator-model-first-qa-batch-supabase-compat-sync-plan-owner-review-v1.ts",
  "utf8",
);
const FIXED_NOW = () => new Date("2026-07-14T04:00:00.000Z");

import { parse } from "csv-parse/sync";

function buildLiveDirtyFromCsvAndAllowlist(): Record<string, string[]> {
  const rows = parse(readFileSync("data/compatibility_mappings.csv", "utf8"), {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
  }) as Array<{ fridge_slug?: string; filter_slug?: string }>;
  const out: Record<string, string[]> = {};
  for (const slug of REFRIGERATOR_MODEL_FIRST_QA_BATCH_FRIDGE_SLUGS_V1) {
    const csv = [
      ...new Set(
        rows
          .filter((r) => (r.fridge_slug ?? "").toLowerCase() === slug)
          .map((r) => (r.filter_slug ?? "").toLowerCase())
          .filter(Boolean),
      ),
    ].sort();
    const old = REFRIGERATOR_MODEL_FIRST_QA_BATCH_SUPABASE_COMPAT_SYNC_ALLOWED_REMOVALS_V1.filter(
      (r) => r.fridge_slug === slug,
    ).map((r) => r.filter_slug);
    out[slug] = [...new Set([...csv, ...old])].sort();
  }
  return out;
}

const LIVE_DIRTY = buildLiveDirtyFromCsvAndAllowlist();

function csvIntentBySlug(): Map<string, string[]> {
  const rows = parse(readFileSync("data/compatibility_mappings.csv", "utf8"), {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
  }) as Array<{ fridge_slug?: string; filter_slug?: string }>;
  const map = new Map<string, string[]>();
  for (const slug of REFRIGERATOR_MODEL_FIRST_QA_BATCH_FRIDGE_SLUGS_V1) {
    map.set(
      slug,
      [
        ...new Set(
          rows
            .filter((r) => (r.fridge_slug ?? "").toLowerCase() === slug)
            .map((r) => (r.filter_slug ?? "").toLowerCase())
            .filter(Boolean),
        ),
      ].sort(),
    );
  }
  return map;
}

test("pending sync plan is read-only with exact 20/53/0 deltas", async () => {
  const plan = await buildRefrigeratorModelFirstQaBatchSupabaseCompatSyncPlanOwnerReviewV1({
    rootDir: ROOT,
    now: FIXED_NOW,
    loadSupabaseCompat: async (slug) => ({
      status: "CHECKED",
      supabase_filter_slugs: LIVE_DIRTY[slug] ?? [],
    }),
  });

  assert.equal(plan.contract, REFRIGERATOR_MODEL_FIRST_QA_BATCH_SUPABASE_COMPAT_SYNC_PLAN_CONTRACT_V1);
  assert.equal(plan.read_only, true);
  assert.equal(plan.data_mutation, false);
  assert.equal(plan.mutation_authorized, false);
  assert.equal(plan.supabase_mutation_authorized, false);
  assert.equal(plan.csv_mutation_authorized, false);
  assert.equal(plan.buy_cta_authorized, false);
  assert.equal(plan.retailer_links_mutation_authorized, false);
  assert.equal(plan.sitemap_robots_mutation_authorized, false);
  assert.equal(plan.product_json_ld_mutation_authorized, false);
  assert.equal(plan.apply_authorized, false);
  assert.equal(plan.plan_sync_state, "pending_sync");
  assert.equal(plan.planned_slug_count, 20);
  assert.equal(plan.planned_supabase_row_removals, 53);
  assert.equal(plan.planned_supabase_row_additions, 0);
  assert.equal(plan.classification_counts.SUPABASE_STILL_HAS_OLD_ROWS, 20);
  assert.deepEqual(
    plan.planned_supabase_removals.map((r) => r.row_key).sort(),
    refrigeratorModelFirstQaBatchSupabaseCompatSyncAllowedRemovalKeysV1(),
  );
  assert.equal(plan.planned_supabase_additions.length, 0);
  assert.equal(
    plan.planned_supabase_row_removals + plan.planned_supabase_row_additions,
    REFRIGERATOR_MODEL_FIRST_QA_BATCH_SUPABASE_COMPAT_SYNC_EXPECTED_COUNTS_V1.planned_row_deltas,
  );
  assert.equal(plan.rows.length, 20);
  assert.deepEqual(
    plan.rows.map((r) => r.fridge_slug).sort(),
    [...REFRIGERATOR_MODEL_FIRST_QA_BATCH_FRIDGE_SLUGS_V1].sort(),
  );
});

test("already in-sync live mappings yield already_in_sync with zero deltas", async () => {
  const csvBySlug = csvIntentBySlug();
  const plan = await buildRefrigeratorModelFirstQaBatchSupabaseCompatSyncPlanOwnerReviewV1({
    rootDir: ROOT,
    now: FIXED_NOW,
    loadSupabaseCompat: async (slug) => ({
      status: "CHECKED",
      supabase_filter_slugs: csvBySlug.get(slug) ?? [],
    }),
  });
  assert.equal(plan.plan_sync_state, "already_in_sync");
  assert.equal(plan.classification_counts.IN_SYNC, 20);
  assert.equal(plan.planned_supabase_row_removals, 0);
  assert.equal(plan.planned_supabase_row_additions, 0);
});

test("write artifacts only to allowlisted draft paths; no CSV mutation surface", async () => {
  const tmp = mkdtempSync(path.join(tmpdir(), "qa-sync-plan-"));
  try {
    const plan = await buildRefrigeratorModelFirstQaBatchSupabaseCompatSyncPlanOwnerReviewV1({
      rootDir: ROOT,
      now: FIXED_NOW,
      loadSupabaseCompat: async (slug) => ({
        status: "CHECKED",
        supabase_filter_slugs: LIVE_DIRTY[slug] ?? [],
      }),
    });
    const written = writeRefrigeratorModelFirstQaBatchSupabaseCompatSyncPlanOwnerReviewArtifactsV1({
      rootDir: tmp,
      plan,
    });
    assert.equal(written.json_rel_path, REFRIGERATOR_MODEL_FIRST_QA_BATCH_SUPABASE_COMPAT_SYNC_PLAN_JSON_REL_V1);
    assert.equal(written.md_rel_path, REFRIGERATOR_MODEL_FIRST_QA_BATCH_SUPABASE_COMPAT_SYNC_PLAN_MD_REL_V1);
    assert.deepEqual(
      [...REFRIGERATOR_MODEL_FIRST_QA_BATCH_SUPABASE_COMPAT_SYNC_PLAN_ALLOWED_WRITE_REL_PATHS_V1].sort(),
      [
        REFRIGERATOR_MODEL_FIRST_QA_BATCH_SUPABASE_COMPAT_SYNC_PLAN_JSON_REL_V1,
        REFRIGERATOR_MODEL_FIRST_QA_BATCH_SUPABASE_COMPAT_SYNC_PLAN_MD_REL_V1,
      ].sort(),
    );
    assert.ok(existsSync(path.join(tmp, written.json_rel_path)));
    assert.ok(existsSync(path.join(tmp, written.md_rel_path)));
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("plan lib does not authorize CSV/retailer/buy/sitemap/json-ld mutation", () => {
  assert.match(LIB_SOURCE, /csv_mutation_authorized: false/);
  assert.match(LIB_SOURCE, /buy_cta_authorized: false/);
  assert.match(LIB_SOURCE, /retailer_links_mutation_authorized: false/);
  assert.match(LIB_SOURCE, /sitemap_robots_mutation_authorized: false/);
  assert.match(LIB_SOURCE, /product_json_ld_mutation_authorized: false/);
  assert.doesNotMatch(LIB_SOURCE, /writeFileSync\([^)]*compatibility_mappings\.csv/);
  assert.doesNotMatch(LIB_SOURCE, /retailer_links\.csv/);
});
