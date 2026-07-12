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
  buildGswfGte18gsnrssNoFilterSupabaseCompatParityOwnerReviewV1,
  classifyGte18NoFilterSupabaseParityV1,
  GSWF_GTE18GSNRSS_NO_FILTER_SUPABASE_COMPAT_PARITY_ALLOWED_WRITE_REL_PATHS_V1,
  GSWF_GTE18GSNRSS_NO_FILTER_SUPABASE_COMPAT_PARITY_JSON_REL_V1,
  GSWF_GTE18GSNRSS_NO_FILTER_SUPABASE_COMPAT_PARITY_MD_REL_V1,
  writeGswfGte18gsnrssNoFilterSupabaseCompatParityArtifactsV1,
} from "./gswf-gte18gsnrss-no-filter-supabase-compat-parity-owner-review-v1";

const ROOT = process.cwd();
const LIB_SOURCE = readFileSync(
  "scripts/lib/gswf-gte18gsnrss-no-filter-supabase-compat-parity-owner-review-v1.ts",
  "utf8",
);
const FIXED_NOW = () => new Date("2026-07-12T23:00:00.000Z");

function seedEmptyCompatCsv(root: string): void {
  mkdirSync(path.join(root, "data"), { recursive: true });
  writeFileSync(
    path.join(root, "data/compatibility_mappings.csv"),
    "fridge_slug,filter_slug\nge-other,gswf\n",
    "utf8",
  );
}

test("classify IN_SYNC when supabase mappings empty", () => {
  const result = classifyGte18NoFilterSupabaseParityV1({
    csv_current_mappings: [],
    supabase: { status: "CHECKED", supabase_filter_slugs: [] },
  });
  assert.equal(result.classification, "IN_SYNC");
  assert.deepEqual(result.supabase_mappings, []);
});

test("classify SUPABASE_STILL_HAS_GSWF_FAMILY when gswf/gswf2 remain", () => {
  const result = classifyGte18NoFilterSupabaseParityV1({
    csv_current_mappings: [],
    supabase: { status: "CHECKED", supabase_filter_slugs: ["gswf2", "gswf"] },
  });
  assert.equal(result.classification, "SUPABASE_STILL_HAS_GSWF_FAMILY");
  assert.deepEqual(result.gswf_family_still_in_supabase, ["gswf", "gswf2"]);
});

test("classify CONFLICT when only non-gswf mappings remain", () => {
  const result = classifyGte18NoFilterSupabaseParityV1({
    csv_current_mappings: [],
    supabase: { status: "CHECKED", supabase_filter_slugs: ["rpwfe"] },
  });
  assert.equal(result.classification, "CONFLICT");
  assert.deepEqual(result.unexpected_in_supabase, ["rpwfe"]);
});

test("classify UNKNOWN_READ_FAILED when supabase loader fails", () => {
  const result = classifyGte18NoFilterSupabaseParityV1({
    csv_current_mappings: [],
    supabase: { status: "UNKNOWN_DB_UNAVAILABLE", reason: "no credentials" },
  });
  assert.equal(result.classification, "UNKNOWN_READ_FAILED");
  assert.equal(result.read_error, "no credentials");
  assert.equal(result.supabase_mappings, null);
});

test("build report with injected loader is read-only and targets only ge-gte18gsnrss", async () => {
  const tmp = mkdtempSync(path.join(tmpdir(), "gte18-parity-"));
  try {
    seedEmptyCompatCsv(tmp);
    const report = await buildGswfGte18gsnrssNoFilterSupabaseCompatParityOwnerReviewV1({
      rootDir: tmp,
      now: FIXED_NOW,
      loadSupabaseCompat: async () => ({
        status: "CHECKED",
        supabase_filter_slugs: ["gswf", "gswf2"],
      }),
    });
    assert.equal(report.read_only, true);
    assert.equal(report.data_mutation, false);
    assert.equal(report.supabase_mutation_authorized, false);
    assert.equal(report.csv_mutation_authorized, false);
    assert.equal(report.buy_cta_authorized, false);
    assert.equal(report.retailer_links_mutation_authorized, false);
    assert.equal(report.target_fridge_slug, "ge-gte18gsnrss");
    assert.deepEqual(report.csv_intent_mappings, []);
    assert.deepEqual(report.csv_current_mappings, []);
    assert.equal(report.classification, "SUPABASE_STILL_HAS_GSWF_FAMILY");
    assert.deepEqual(report.supabase_mappings, ["gswf", "gswf2"]);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("write artifacts only to allowlisted draft paths", async () => {
  const tmp = mkdtempSync(path.join(tmpdir(), "gte18-parity-art-"));
  try {
    seedEmptyCompatCsv(tmp);
    const report = await buildGswfGte18gsnrssNoFilterSupabaseCompatParityOwnerReviewV1({
      rootDir: tmp,
      now: FIXED_NOW,
      loadSupabaseCompat: async () => ({ status: "CHECKED", supabase_filter_slugs: [] }),
    });
    const written = writeGswfGte18gsnrssNoFilterSupabaseCompatParityArtifactsV1({
      rootDir: tmp,
      report,
    });
    assert.equal(written.json_rel_path, GSWF_GTE18GSNRSS_NO_FILTER_SUPABASE_COMPAT_PARITY_JSON_REL_V1);
    assert.equal(written.md_rel_path, GSWF_GTE18GSNRSS_NO_FILTER_SUPABASE_COMPAT_PARITY_MD_REL_V1);
    assert.ok(
      (
        GSWF_GTE18GSNRSS_NO_FILTER_SUPABASE_COMPAT_PARITY_ALLOWED_WRITE_REL_PATHS_V1 as readonly string[]
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
  assert.ok(existsSync(path.join(ROOT, "scripts/report-gswf-gte18gsnrss-no-filter-supabase-compat-parity-owner-review-v1.ts")));
});
