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
  buildSamsungPassRepairSupabaseCompatParityOwnerReviewV1,
  classifySamsungPassSupabaseParitySlugV1,
  SAMSUNG_PASS_REPAIR_SUPABASE_COMPAT_PARITY_ALLOWED_WRITE_REL_PATHS_V1,
  SAMSUNG_PASS_REPAIR_SUPABASE_COMPAT_PARITY_JSON_REL_V1,
  SAMSUNG_PASS_REPAIR_SUPABASE_COMPAT_PARITY_MD_REL_V1,
  writeSamsungPassRepairSupabaseCompatParityArtifactsV1,
} from "./samsung-pass-repair-supabase-compat-parity-owner-review-v1";
import {
  SAMSUNG_PASS_PLANNED_FRIDGE_SLUGS_V1,
  SAMSUNG_PASS_REPAIR_APPLY_PLAN_JSON_REL_V1,
} from "./samsung-pass-repair-apply-plan-v1";

const ROOT = process.cwd();
const LIB_SOURCE = readFileSync(
  "scripts/lib/samsung-pass-repair-supabase-compat-parity-owner-review-v1.ts",
  "utf8",
);
const FIXED_NOW = () => new Date("2026-07-12T23:50:00.000Z");

function seedPassCompatAndPlan(root: string, csvExtraLines?: string[]): void {
  mkdirSync(path.join(root, "data/fridge/batch-production/drafts"), { recursive: true });
  mkdirSync(path.join(root, "data"), { recursive: true });
  const lines = ["fridge_slug,filter_slug"];
  for (const slug of SAMSUNG_PASS_PLANNED_FRIDGE_SLUGS_V1) {
    lines.push(`${slug},da97-17376b`);
  }
  if (csvExtraLines) lines.push(...csvExtraLines);
  writeFileSync(path.join(root, "data/compatibility_mappings.csv"), `${lines.join("\n")}\n`, "utf8");
  writeFileSync(
    path.join(root, SAMSUNG_PASS_REPAIR_APPLY_PLAN_JSON_REL_V1),
    readFileSync(path.join(ROOT, SAMSUNG_PASS_REPAIR_APPLY_PLAN_JSON_REL_V1), "utf8"),
  );
}

test("classify IN_SYNC when supabase equals da97-17376b only", () => {
  const result = classifySamsungPassSupabaseParitySlugV1({
    fridge_slug: "samsung-rf27t5201sr",
    csv_current_mappings: ["da97-17376b"],
    removed_filter_slugs: ["da29-10105j"],
    supabase: { status: "CHECKED", supabase_filter_slugs: ["da97-17376b"] },
  });
  assert.equal(result.classification, "IN_SYNC");
  assert.deepEqual(result.supabase_mappings, ["da97-17376b"]);
  assert.equal(result.csv_matches_intent, true);
});

test("classify SUPABASE_STILL_HAS_OLD_ROWS when da29 remains", () => {
  const result = classifySamsungPassSupabaseParitySlugV1({
    fridge_slug: "samsung-rf27t5501sr",
    csv_current_mappings: ["da97-17376b"],
    removed_filter_slugs: ["da29-00012b", "da29-00020b"],
    supabase: {
      status: "CHECKED",
      supabase_filter_slugs: ["da97-17376b", "da29-00012b"],
    },
  });
  assert.equal(result.classification, "SUPABASE_STILL_HAS_OLD_ROWS");
  assert.deepEqual(result.old_rows_still_in_supabase, ["da29-00012b"]);
});

test("classify SUPABASE_MISSING_TARGET when da97-17376b absent", () => {
  const result = classifySamsungPassSupabaseParitySlugV1({
    fridge_slug: "samsung-rf28r6301sr",
    csv_current_mappings: ["da97-17376b"],
    removed_filter_slugs: ["da29-00019a"],
    supabase: { status: "CHECKED", supabase_filter_slugs: [] },
  });
  assert.equal(result.classification, "SUPABASE_MISSING_TARGET");
  assert.deepEqual(result.missing_from_supabase, ["da97-17376b"]);
});

test("classify CONFLICT when unexpected non-old mapping remains", () => {
  const result = classifySamsungPassSupabaseParitySlugV1({
    fridge_slug: "samsung-rs22t5201sg",
    csv_current_mappings: ["da97-17376b"],
    removed_filter_slugs: ["da29-10105j"],
    supabase: {
      status: "CHECKED",
      supabase_filter_slugs: ["da97-17376b", "hafcin"],
    },
  });
  assert.equal(result.classification, "CONFLICT");
  assert.deepEqual(result.unexpected_in_supabase, ["hafcin"]);
});

test("classify UNKNOWN_READ_FAILED when supabase loader fails", () => {
  const result = classifySamsungPassSupabaseParitySlugV1({
    fridge_slug: "samsung-rf28t5101sr",
    csv_current_mappings: ["da97-17376b"],
    removed_filter_slugs: ["da29-00019a"],
    supabase: { status: "UNKNOWN_DB_UNAVAILABLE", reason: "no credentials" },
  });
  assert.equal(result.classification, "UNKNOWN_READ_FAILED");
  assert.equal(result.read_error, "no credentials");
  assert.equal(result.supabase_mappings, null);
});

test("build report with injected loader is read-only for exact 5 PASS slugs", async () => {
  const tmp = mkdtempSync(path.join(tmpdir(), "samsung-pass-parity-"));
  try {
    seedPassCompatAndPlan(tmp);
    const report = await buildSamsungPassRepairSupabaseCompatParityOwnerReviewV1({
      rootDir: tmp,
      now: FIXED_NOW,
      loadSupabaseCompat: async (slug) => {
        if (slug === "samsung-rf27t5201sr") {
          return { status: "CHECKED", supabase_filter_slugs: ["da97-17376b"] };
        }
        if (slug === "samsung-rf27t5501sr") {
          return {
            status: "CHECKED",
            supabase_filter_slugs: ["da29-00020b", "da97-17376b"],
          };
        }
        return { status: "CHECKED", supabase_filter_slugs: [] };
      },
    });
    assert.equal(report.read_only, true);
    assert.equal(report.data_mutation, false);
    assert.equal(report.supabase_mutation_authorized, false);
    assert.equal(report.csv_mutation_authorized, false);
    assert.equal(report.buy_cta_authorized, false);
    assert.equal(report.retailer_links_mutation_authorized, false);
    assert.equal(report.planned_slug_count, 5);
    assert.equal(report.target_filter_slug, "da97-17376b");
    assert.equal(report.rows.length, 5);
    assert.deepEqual(
      report.rows.map((r) => r.fridge_slug).sort(),
      [...SAMSUNG_PASS_PLANNED_FRIDGE_SLUGS_V1].sort(),
    );
    assert.equal(report.classification_counts.IN_SYNC, 1);
    assert.equal(report.classification_counts.SUPABASE_STILL_HAS_OLD_ROWS, 1);
    assert.equal(report.classification_counts.SUPABASE_MISSING_TARGET, 3);
    assert.ok(report.rows.every((r) => r.csv_matches_intent));
    assert.ok(report.rows.every((r) => r.csv_old_rows_still_present.length === 0));
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("CSV old da29 rows are reported when still present", async () => {
  const tmp = mkdtempSync(path.join(tmpdir(), "samsung-pass-csv-old-"));
  try {
    seedPassCompatAndPlan(tmp, ["samsung-rf27t5201sr,da29-10105j"]);
    const report = await buildSamsungPassRepairSupabaseCompatParityOwnerReviewV1({
      rootDir: tmp,
      now: FIXED_NOW,
      loadSupabaseCompat: async () => ({
        status: "CHECKED",
        supabase_filter_slugs: ["da97-17376b"],
      }),
    });
    const row = report.rows.find((r) => r.fridge_slug === "samsung-rf27t5201sr");
    assert.ok(row);
    assert.equal(row!.csv_matches_intent, false);
    assert.deepEqual(row!.csv_old_rows_still_present, ["da29-10105j"]);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("write artifacts only to allowlisted draft paths", async () => {
  const tmp = mkdtempSync(path.join(tmpdir(), "samsung-pass-parity-art-"));
  try {
    seedPassCompatAndPlan(tmp);
    const report = await buildSamsungPassRepairSupabaseCompatParityOwnerReviewV1({
      rootDir: tmp,
      now: FIXED_NOW,
      loadSupabaseCompat: async () => ({
        status: "CHECKED",
        supabase_filter_slugs: ["da97-17376b"],
      }),
    });
    const written = writeSamsungPassRepairSupabaseCompatParityArtifactsV1({
      rootDir: tmp,
      report,
    });
    assert.equal(written.json_rel_path, SAMSUNG_PASS_REPAIR_SUPABASE_COMPAT_PARITY_JSON_REL_V1);
    assert.equal(written.md_rel_path, SAMSUNG_PASS_REPAIR_SUPABASE_COMPAT_PARITY_MD_REL_V1);
    assert.ok(
      (
        SAMSUNG_PASS_REPAIR_SUPABASE_COMPAT_PARITY_ALLOWED_WRITE_REL_PATHS_V1 as readonly string[]
      ).includes(written.json_rel_path),
    );
    assert.ok(existsSync(path.join(tmp, written.json_rel_path)));
    assert.ok(existsSync(path.join(tmp, written.md_rel_path)));
    assert.match(readFileSync(path.join(tmp, written.md_rel_path), "utf8"), /IN_SYNC/);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("source forbids retailer_links / HQ writes and imports tryLoadSupabaseCompatForModelV1", () => {
  assert.ok(LIB_SOURCE.includes("tryLoadSupabaseCompatForModelV1"));
  assert.ok(LIB_SOURCE.includes('from "./buckparts-page-factory-preflight-v1"'));
  assert.ok(!LIB_SOURCE.includes('writeFileSync(path.join(args.rootDir, "data/retailer_links.csv")'));
  assert.ok(!LIB_SOURCE.includes("docs/BuckParts-HQ-HANDOFF"));
  assert.ok(
    existsSync(
      path.join(ROOT, "scripts/report-samsung-pass-repair-supabase-compat-parity-owner-review-v1.ts"),
    ),
  );
});
