import assert from "node:assert/strict";
import {
  copyFileSync,
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

import { REFRIGERATOR_MODEL_FIRST_DEFAULT_MANIFEST_REL_V1 } from "./refrigerator-model-first-batch-resolver-v1";
import {
  buildRefrigeratorModelFirstQaBatchSupabaseCompatParityOwnerReviewV1,
  classifyRefrigeratorModelFirstQaBatchSupabaseParitySlugV1,
  REFRIGERATOR_MODEL_FIRST_QA_BATCH_FRIDGE_SLUGS_V1,
  REFRIGERATOR_MODEL_FIRST_QA_BATCH_SUPABASE_COMPAT_PARITY_ALLOWED_WRITE_REL_PATHS_V1,
  REFRIGERATOR_MODEL_FIRST_QA_BATCH_SUPABASE_COMPAT_PARITY_JSON_REL_V1,
  REFRIGERATOR_MODEL_FIRST_QA_BATCH_SUPABASE_COMPAT_PARITY_MD_REL_V1,
  writeRefrigeratorModelFirstQaBatchSupabaseCompatParityArtifactsV1,
} from "./refrigerator-model-first-qa-batch-supabase-compat-parity-owner-review-v1";

const ROOT = process.cwd();
const LIB_SOURCE = readFileSync(
  "scripts/lib/refrigerator-model-first-qa-batch-supabase-compat-parity-owner-review-v1.ts",
  "utf8",
);
const FIXED_NOW = () => new Date("2026-07-13T23:50:00.000Z");

function seedQaBatchFixture(root: string, csvExtraLines?: string[]): void {
  mkdirSync(path.join(root, "data/fridge/batch-production/drafts"), { recursive: true });
  mkdirSync(path.join(root, "data/fridge/batch-production/model-first-input-v1"), {
    recursive: true,
  });
  mkdirSync(path.join(root, "data"), { recursive: true });
  copyFileSync(
    path.join(ROOT, REFRIGERATOR_MODEL_FIRST_DEFAULT_MANIFEST_REL_V1),
    path.join(root, REFRIGERATOR_MODEL_FIRST_DEFAULT_MANIFEST_REL_V1),
  );
  const lines = ["fridge_slug,filter_slug"];
  for (const slug of REFRIGERATOR_MODEL_FIRST_QA_BATCH_FRIDGE_SLUGS_V1) {
    if (slug.startsWith("lg-")) {
      lines.push(`${slug},lt1000p`);
      if (slug !== "lg-lrfxs3106s") lines.push(`${slug},lt1000pc`);
    } else if (slug === "samsung-rf28r7351sg") {
      lines.push(`${slug},da97-17376a`);
      lines.push(`${slug},da97-17376b`);
    } else if (slug === "samsung-rf28r7201sr") {
      lines.push(`${slug},da97-17376b`);
    } else if (slug.startsWith("samsung-")) {
      lines.push(`${slug},da29-00020b`);
    } else if (slug.startsWith("ge-")) {
      lines.push(`${slug},rpwfe`);
    } else if (slug === "frigidaire-ffhb2740ps") {
      lines.push(`${slug},ultrawf`);
    } else if (slug.startsWith("frigidaire-")) {
      lines.push(`${slug},eptwfu01`);
    } else if (slug === "whirlpool-wrs325sdhz") {
      lines.push(`${slug},edr1rxd1`);
    } else if (slug === "whirlpool-wrx986sihz") {
      lines.push(`${slug},edr2rxd1`);
    } else {
      lines.push(`${slug},edr4rxd1`);
    }
  }
  if (csvExtraLines) lines.push(...csvExtraLines);
  writeFileSync(path.join(root, "data/compatibility_mappings.csv"), `${lines.join("\n")}\n`, "utf8");
}

test("classify IN_SYNC when supabase equals CSV mappings", () => {
  const result = classifyRefrigeratorModelFirstQaBatchSupabaseParitySlugV1({
    fridge_slug: "lg-lrfxs3106s",
    csv_current_mappings: ["lt1000p"],
    supabase: { status: "CHECKED", supabase_filter_slugs: ["lt1000p"] },
  });
  assert.equal(result.classification, "IN_SYNC");
  assert.deepEqual(result.supabase_mappings, ["lt1000p"]);
});

test("classify SUPABASE_STILL_HAS_OLD_ROWS when supabase has extras", () => {
  const result = classifyRefrigeratorModelFirstQaBatchSupabaseParitySlugV1({
    fridge_slug: "lg-lfxs26973s",
    csv_current_mappings: ["lt1000p", "lt1000pc"],
    supabase: {
      status: "CHECKED",
      supabase_filter_slugs: ["lt1000p", "lt1000pc", "lt700p"],
    },
  });
  assert.equal(result.classification, "SUPABASE_STILL_HAS_OLD_ROWS");
  assert.deepEqual(result.old_rows_still_in_supabase, ["lt700p"]);
});

test("classify SUPABASE_MISSING_TARGET when CSV filters absent from supabase", () => {
  const result = classifyRefrigeratorModelFirstQaBatchSupabaseParitySlugV1({
    fridge_slug: "ge-gfe28gskss",
    csv_current_mappings: ["rpwfe"],
    supabase: { status: "CHECKED", supabase_filter_slugs: [] },
  });
  assert.equal(result.classification, "SUPABASE_MISSING_TARGET");
  assert.deepEqual(result.missing_from_supabase, ["rpwfe"]);
});

test("classify CONFLICT when supabase has extras and is missing CSV targets", () => {
  const result = classifyRefrigeratorModelFirstQaBatchSupabaseParitySlugV1({
    fridge_slug: "whirlpool-wrx735sdhz",
    csv_current_mappings: ["edr4rxd1"],
    supabase: {
      status: "CHECKED",
      supabase_filter_slugs: ["edr1rxd1", "edr2rxd1"],
    },
  });
  assert.equal(result.classification, "CONFLICT");
  assert.deepEqual(result.old_rows_still_in_supabase, ["edr1rxd1", "edr2rxd1"]);
  assert.deepEqual(result.missing_from_supabase, ["edr4rxd1"]);
});

test("classify UNKNOWN_READ_FAILED when supabase loader fails", () => {
  const result = classifyRefrigeratorModelFirstQaBatchSupabaseParitySlugV1({
    fridge_slug: "frigidaire-fgsc2335tf",
    csv_current_mappings: ["eptwfu01"],
    supabase: { status: "UNKNOWN_DB_UNAVAILABLE", reason: "no credentials" },
  });
  assert.equal(result.classification, "UNKNOWN_READ_FAILED");
  assert.equal(result.read_error, "no credentials");
  assert.equal(result.supabase_mappings, null);
});

test("build report with injected loader is read-only for exact 20 QA slugs", async () => {
  const tmp = mkdtempSync(path.join(tmpdir(), "qa-batch-parity-"));
  try {
    seedQaBatchFixture(tmp);
    const report = await buildRefrigeratorModelFirstQaBatchSupabaseCompatParityOwnerReviewV1({
      rootDir: tmp,
      now: FIXED_NOW,
      loadSupabaseCompat: async (slug) => {
        if (slug === "lg-lrfxs3106s") {
          return { status: "CHECKED", supabase_filter_slugs: ["lt1000p"] };
        }
        if (slug === "lg-lfxs26973s") {
          return {
            status: "CHECKED",
            supabase_filter_slugs: ["lt1000p", "lt1000pc", "lt700p"],
          };
        }
        if (slug === "ge-gfe28gskss") {
          return { status: "CHECKED", supabase_filter_slugs: [] };
        }
        if (slug === "whirlpool-wrx735sdhz") {
          return {
            status: "CHECKED",
            supabase_filter_slugs: ["edr1rxd1", "edr2rxd1"],
          };
        }
        // Match seeded CSV intent for remaining slugs → IN_SYNC
        if (slug.startsWith("lg-")) {
          return { status: "CHECKED", supabase_filter_slugs: ["lt1000p", "lt1000pc"] };
        }
        if (slug === "samsung-rf28r7351sg") {
          return {
            status: "CHECKED",
            supabase_filter_slugs: ["da97-17376a", "da97-17376b"],
          };
        }
        if (slug === "samsung-rf28r7201sr") {
          return { status: "CHECKED", supabase_filter_slugs: ["da97-17376b"] };
        }
        if (slug.startsWith("samsung-")) {
          return { status: "CHECKED", supabase_filter_slugs: ["da29-00020b"] };
        }
        if (slug.startsWith("ge-")) {
          return { status: "CHECKED", supabase_filter_slugs: ["rpwfe"] };
        }
        if (slug === "frigidaire-ffhb2740ps") {
          return { status: "CHECKED", supabase_filter_slugs: ["ultrawf"] };
        }
        if (slug.startsWith("frigidaire-")) {
          return { status: "CHECKED", supabase_filter_slugs: ["eptwfu01"] };
        }
        if (slug === "whirlpool-wrs325sdhz") {
          return { status: "CHECKED", supabase_filter_slugs: ["edr1rxd1"] };
        }
        if (slug === "whirlpool-wrx986sihz") {
          return { status: "CHECKED", supabase_filter_slugs: ["edr2rxd1"] };
        }
        return { status: "CHECKED", supabase_filter_slugs: ["edr4rxd1"] };
      },
    });
    assert.equal(report.read_only, true);
    assert.equal(report.data_mutation, false);
    assert.equal(report.supabase_mutation_authorized, false);
    assert.equal(report.csv_mutation_authorized, false);
    assert.equal(report.buy_cta_authorized, false);
    assert.equal(report.retailer_links_mutation_authorized, false);
    assert.equal(report.sitemap_robots_mutation_authorized, false);
    assert.equal(report.product_json_ld_mutation_authorized, false);
    assert.equal(report.planned_slug_count, 20);
    assert.equal(report.csv_apply_commit, "a2b5bc7");
    assert.equal(report.rows.length, 20);
    assert.deepEqual(
      report.rows.map((r) => r.fridge_slug),
      [...REFRIGERATOR_MODEL_FIRST_QA_BATCH_FRIDGE_SLUGS_V1],
    );
    assert.equal(report.classification_counts.IN_SYNC, 17);
    assert.equal(report.classification_counts.SUPABASE_STILL_HAS_OLD_ROWS, 1);
    assert.equal(report.classification_counts.SUPABASE_MISSING_TARGET, 1);
    assert.equal(report.classification_counts.CONFLICT, 1);
    assert.equal(report.classification_counts.UNKNOWN_READ_FAILED, 0);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("write artifacts only to allowlisted draft paths", async () => {
  const tmp = mkdtempSync(path.join(tmpdir(), "qa-batch-parity-art-"));
  try {
    seedQaBatchFixture(tmp);
    const report = await buildRefrigeratorModelFirstQaBatchSupabaseCompatParityOwnerReviewV1({
      rootDir: tmp,
      now: FIXED_NOW,
      loadSupabaseCompat: async () => ({
        status: "CHECKED",
        supabase_filter_slugs: ["lt1000p"],
      }),
    });
    const written = writeRefrigeratorModelFirstQaBatchSupabaseCompatParityArtifactsV1({
      rootDir: tmp,
      report,
    });
    assert.equal(
      written.json_rel_path,
      REFRIGERATOR_MODEL_FIRST_QA_BATCH_SUPABASE_COMPAT_PARITY_JSON_REL_V1,
    );
    assert.equal(
      written.md_rel_path,
      REFRIGERATOR_MODEL_FIRST_QA_BATCH_SUPABASE_COMPAT_PARITY_MD_REL_V1,
    );
    assert.ok(
      (
        REFRIGERATOR_MODEL_FIRST_QA_BATCH_SUPABASE_COMPAT_PARITY_ALLOWED_WRITE_REL_PATHS_V1 as readonly string[]
      ).includes(written.json_rel_path),
    );
    assert.ok(existsSync(path.join(tmp, written.json_rel_path)));
    assert.ok(existsSync(path.join(tmp, written.md_rel_path)));
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
      path.join(
        ROOT,
        "scripts/report-refrigerator-model-first-qa-batch-supabase-compat-parity-owner-review-v1.ts",
      ),
    ),
  );
});
