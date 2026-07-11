import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
  GSWF_WRONG_PART_EXCLUDED_NO_FILTER_SLUGS_V1,
  GSWF_WRONG_PART_EXCLUDED_PARTIAL_SLUGS_V1,
  GSWF_WRONG_PART_PLANNED_FRIDGE_SLUGS_V1,
} from "./gswf-wrong-part-repair-apply-plan-owner-review-v1";
import {
  buildGswfWrongPartRepairSupabaseCompatSyncPlanOwnerReviewV1,
  classifyGswfSupabaseCompatSyncSlugV1,
  GSWF_WRONG_PART_REPAIR_CSV_APPLY_COMMIT_V1,
  GSWF_WRONG_PART_REPAIR_SUPABASE_COMPAT_SYNC_PLAN_ALLOWED_WRITE_REL_PATHS_V1,
  GSWF_WRONG_PART_REPAIR_SUPABASE_COMPAT_SYNC_PLAN_CONTRACT_V1,
  GSWF_WRONG_PART_REPAIR_SUPABASE_COMPAT_SYNC_PLAN_JSON_REL_V1,
  GSWF_WRONG_PART_REPAIR_SUPABASE_COMPAT_SYNC_PLAN_MD_REL_V1,
  writeGswfWrongPartRepairSupabaseCompatSyncPlanOwnerReviewArtifactsV1,
} from "./gswf-wrong-part-repair-supabase-compat-sync-plan-owner-review-v1";

const ROOT = process.cwd();
const LIB_SOURCE = readFileSync(
  "scripts/lib/gswf-wrong-part-repair-supabase-compat-sync-plan-owner-review-v1.ts",
  "utf8",
);
const REPORT_SOURCE = readFileSync(
  "scripts/report-gswf-wrong-part-repair-supabase-compat-sync-plan-owner-review-v1.ts",
  "utf8",
);
const FIXED_NOW = () => new Date("2026-07-11T18:00:00.000Z");

test("classifier covers IN_SYNC / wrong-row pending / missing-add pending / conflict / read-failed", () => {
  assert.equal(
    classifyGswfSupabaseCompatSyncSlugV1({
      fridge_slug: "ge-cwe23sshww",
      csv_intent_mappings: ["rpwfe"],
      csv_current_mappings: ["rpwfe"],
      supabase: { status: "CHECKED", supabase_filter_slugs: ["rpwfe"] },
    }).classification,
    "IN_SYNC",
  );

  assert.equal(
    classifyGswfSupabaseCompatSyncSlugV1({
      fridge_slug: "ge-cwe23sshww",
      csv_intent_mappings: ["rpwfe"],
      csv_current_mappings: ["rpwfe"],
      supabase: { status: "CHECKED", supabase_filter_slugs: ["gswf", "gswf2", "rpwfe"] },
    }).classification,
    "SUPABASE_HAS_REMOVED_WRONG_ROWS_PENDING",
  );

  assert.equal(
    classifyGswfSupabaseCompatSyncSlugV1({
      fridge_slug: "ge-cwe23sshww",
      csv_intent_mappings: ["rpwfe"],
      csv_current_mappings: ["rpwfe"],
      supabase: { status: "CHECKED", supabase_filter_slugs: [] },
    }).classification,
    "SUPABASE_MISSING_ADDED_ROWS_PENDING",
  );

  assert.equal(
    classifyGswfSupabaseCompatSyncSlugV1({
      fridge_slug: "ge-cwe23sshww",
      csv_intent_mappings: ["rpwfe"],
      csv_current_mappings: ["rpwfe"],
      supabase: { status: "CHECKED", supabase_filter_slugs: ["gswf", "mwf"] },
    }).classification,
    "CONFLICT_REQUIRES_REVIEW",
  );

  const failed = classifyGswfSupabaseCompatSyncSlugV1({
    fridge_slug: "ge-cwe23sshww",
    csv_intent_mappings: ["rpwfe"],
    csv_current_mappings: ["rpwfe"],
    supabase: { status: "UNKNOWN_DB_UNAVAILABLE", reason: "missing service role" },
  });
  assert.equal(failed.classification, "UNKNOWN_READ_FAILED");
  assert.equal(failed.read_error, "missing service role");
  assert.equal(failed.supabase_mutation_authorized, false);
});

test("build report with injected supabase loader is read-only and excludes PARTIAL/no-filter", async () => {
  const report = await buildGswfWrongPartRepairSupabaseCompatSyncPlanOwnerReviewV1({
    rootDir: ROOT,
    now: FIXED_NOW,
    loadSupabaseCompat: async (slug) => {
      // Simulate pre-sync Supabase still on wrong family for first slug; others in sync with CSV intent.
      if (slug === "ge-cwe23sshww") {
        return { status: "CHECKED", supabase_filter_slugs: ["gswf", "gswf2"] };
      }
      // Return intent from apply plan via a second build path: empty means missing adds for others.
      // Use CHECKED with intent-like values by reading apply plan through the builder's own CSV intent —
      // for non-cwe rows return IN_SYNC by loading after_mappings from the report path is circular;
      // instead return a known synced set for a couple slugs and UNKNOWN for one.
      if (slug === "ge-gfe24jgkww") {
        return {
          status: "CHECKED",
          supabase_filter_slugs: ["smartwater-mwfp", "xwfe"],
        };
      }
      if (slug === "ge-gfe27jmkes") {
        return { status: "UNKNOWN_DB_UNAVAILABLE", reason: "simulated read failure" };
      }
      return { status: "CHECKED", supabase_filter_slugs: ["rpwfe"] };
    },
  });

  assert.equal(report.contract, GSWF_WRONG_PART_REPAIR_SUPABASE_COMPAT_SYNC_PLAN_CONTRACT_V1);
  assert.equal(report.read_only, true);
  assert.equal(report.data_mutation, false);
  assert.equal(report.supabase_mutation_authorized, false);
  assert.equal(report.apply_authorized, false);
  assert.equal(report.csv_apply_commit, GSWF_WRONG_PART_REPAIR_CSV_APPLY_COMMIT_V1);
  assert.equal(report.planned_slug_count, 13);
  assert.equal(report.rows.length, 13);
  assert.deepEqual(
    report.excluded_slugs_untouched.sort(),
    [...GSWF_WRONG_PART_EXCLUDED_PARTIAL_SLUGS_V1, ...GSWF_WRONG_PART_EXCLUDED_NO_FILTER_SLUGS_V1]
      .map((s) => s.toLowerCase())
      .sort(),
  );

  const bySlug = new Map(report.rows.map((row) => [row.fridge_slug, row]));
  for (const slug of GSWF_WRONG_PART_PLANNED_FRIDGE_SLUGS_V1) {
    assert.ok(bySlug.has(slug), `missing planned slug ${slug}`);
  }
  for (const slug of [
    ...GSWF_WRONG_PART_EXCLUDED_PARTIAL_SLUGS_V1,
    ...GSWF_WRONG_PART_EXCLUDED_NO_FILTER_SLUGS_V1,
  ]) {
    assert.equal(bySlug.has(slug), false);
  }

  assert.equal(bySlug.get("ge-cwe23sshww")!.classification, "CONFLICT_REQUIRES_REVIEW");
  assert.equal(bySlug.get("ge-gfe24jgkww")!.classification, "IN_SYNC");
  assert.equal(bySlug.get("ge-gfe27jmkes")!.classification, "UNKNOWN_READ_FAILED");
  assert.ok(report.classification_counts.UNKNOWN_READ_FAILED >= 1);
  assert.ok(report.classification_counts.IN_SYNC >= 1);
});

test("write artifacts only to allowlisted draft paths", async () => {
  const tmp = mkdtempSync(path.join(tmpdir(), "gswf-supabase-sync-plan-"));
  try {
    const report = await buildGswfWrongPartRepairSupabaseCompatSyncPlanOwnerReviewV1({
      rootDir: ROOT,
      now: FIXED_NOW,
      loadSupabaseCompat: async () => ({
        status: "UNKNOWN_DB_UNAVAILABLE",
        reason: "test fixture — no live supabase",
      }),
    });
    const written = writeGswfWrongPartRepairSupabaseCompatSyncPlanOwnerReviewArtifactsV1({
      rootDir: tmp,
      report,
    });
    assert.equal(written.json_rel_path, GSWF_WRONG_PART_REPAIR_SUPABASE_COMPAT_SYNC_PLAN_JSON_REL_V1);
    assert.equal(written.md_rel_path, GSWF_WRONG_PART_REPAIR_SUPABASE_COMPAT_SYNC_PLAN_MD_REL_V1);
    assert.ok(
      (
        GSWF_WRONG_PART_REPAIR_SUPABASE_COMPAT_SYNC_PLAN_ALLOWED_WRITE_REL_PATHS_V1 as readonly string[]
      ).includes(written.json_rel_path),
    );
    assert.ok(existsSync(path.join(tmp, written.json_rel_path)));
    assert.ok(existsSync(path.join(tmp, written.md_rel_path)));
    const md = readFileSync(path.join(tmp, written.md_rel_path), "utf8");
    assert.match(md, /supabase_mutation_authorized: \*\*false\*\*/);
    assert.match(md, /UNKNOWN_READ_FAILED/);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("source does not mutate CSV/Supabase/retailer_links/buy paths", () => {
  const forbidden = [
    'writeFileSync(path.join(args.rootDir, "data/compatibility_mappings.csv")',
    'writeFileSync(path.join(args.rootDir, "data/retailer_links.csv")',
    ".from(\"compatibility_mappings\").delete",
    ".from(\"compatibility_mappings\").insert",
    ".from(\"compatibility_mappings\").upsert",
    "--apply",
  ];
  for (const needle of forbidden) {
    assert.ok(!LIB_SOURCE.includes(needle), `lib must not include ${needle}`);
    assert.ok(!REPORT_SOURCE.includes(needle), `report must not include ${needle}`);
  }
  assert.ok(REPORT_SOURCE.includes("--write-artifacts"));
  assert.ok(LIB_SOURCE.includes("supabase_mutation_authorized: false"));
});
