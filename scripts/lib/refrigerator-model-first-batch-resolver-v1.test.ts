import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  REFRIGERATOR_MODEL_FIRST_BATCH_RESOLVER_CONTRACT_V1,
  buildRefrigeratorModelFirstBatchResolverV1,
  resolveRefrigeratorModelFirstSteeringOverrideV1,
} from "./refrigerator-model-first-batch-resolver-v1";
import { REFRIGERATOR_MODEL_FIRST_POST_APPLY_CONFIDENCE_COUNTS_V1 } from "./refrigerator-model-first-qa-batch-post-apply-v1";

const REPO_ROOT = process.cwd();

const MANIFEST_REL =
  "data/fridge/batch-production/model-first-input-v1/fridge-models-batch-v1.json";

const FORBIDDEN_MUTATION_PATHS = [
  "data/filters.csv",
  "data/retailer_links.csv",
  "data/fridge_models.csv",
  "data/compatibility_mappings.csv",
  "data/filter_aliases.csv",
  "src/app/fridge/[slug]/page.tsx",
  "src/lib/retailers/launch-buy-links.ts",
];

const BATCH_SLUGS = [
  "lg-lrfxs3106s",
  "lg-lfxs28968s",
  "lg-lfxs26973s",
  "lg-lrfvs3006s",
  "lg-lfxc22596s",
  "lg-lmxs28626s",
  "samsung-rf28r7351sg",
  "samsung-rf263beaesr",
  "samsung-rf28nhedbsr",
  "samsung-rf28r7201sr",
  "ge-gfe28gskss",
  "ge-gfe28gmkes",
  "ge-gfe28gynfs",
  "whirlpool-wrx735sdhz",
  "whirlpool-wrx986sihz",
  "whirlpool-wrf540cwhz",
  "whirlpool-wrs325sdhz",
  "frigidaire-fghb2868pf",
  "frigidaire-ffhb2740ps",
  "frigidaire-fgsc2335tf",
] as const;

test("report is read_only true and data_mutation false", () => {
  const report = buildRefrigeratorModelFirstBatchResolverV1({
    rootDir: REPO_ROOT,
    manifestRelPath: MANIFEST_REL,
  });
  assert.equal(report.contract, REFRIGERATOR_MODEL_FIRST_BATCH_RESOLVER_CONTRACT_V1);
  assert.equal(report.read_only, true);
  assert.equal(report.data_mutation, false);
});

test("hard gates remain false", () => {
  const report = buildRefrigeratorModelFirstBatchResolverV1({
    rootDir: REPO_ROOT,
    manifestRelPath: MANIFEST_REL,
  });
  assert.equal(report.csv_apply_authorized, false);
  assert.equal(report.supabase_update_authorized, false);
  assert.equal(report.buy_link_mutation_authorized, false);
  assert.equal(report.public_page_change_authorized, false);
});

test("manifest models resolve from repo CSV hypothesis only", () => {
  const report = buildRefrigeratorModelFirstBatchResolverV1({
    rootDir: REPO_ROOT,
    manifestRelPath: MANIFEST_REL,
  });
  assert.equal(report.inspect_summary.models_checked_count, 20);
  for (const row of report.model_rows) {
    assert.equal(row.product_data_mutation_allowed, false);
    assert.ok(row.current_legacy_buckparts_filter_slugs.length > 0);
  }
});

test("post-apply batch with Samsung cross-reference reports 20 PROVEN, 0 UNKNOWN, 0 MAPPING_REVIEW_REQUIRED", () => {
  const report = buildRefrigeratorModelFirstBatchResolverV1({
    rootDir: REPO_ROOT,
    manifestRelPath: MANIFEST_REL,
  });
  const expected = REFRIGERATOR_MODEL_FIRST_POST_APPLY_CONFIDENCE_COUNTS_V1;
  assert.equal(report.inspect_summary.confidence_counts.UNKNOWN, expected.UNKNOWN);
  assert.equal(report.inspect_summary.confidence_counts.PROVEN, expected.PROVEN);
  assert.equal(
    report.inspect_summary.confidence_counts.MAPPING_REVIEW_REQUIRED,
    expected.MAPPING_REVIEW_REQUIRED,
  );
  assert.match(
    report.inspect_summary.recommended_next_action,
    /Batch v1 fit mapping PROVEN for all manifest models/i,
  );
});

test("Samsung HAF-QIN models are PROVEN via DA97-17376 family cross-reference", () => {
  const report = buildRefrigeratorModelFirstBatchResolverV1({
    rootDir: REPO_ROOT,
    manifestRelPath: MANIFEST_REL,
  });
  const rf28r7351sg = report.model_rows.find((r) => r.fridge_slug === "samsung-rf28r7351sg");
  assert.ok(rf28r7351sg);
  assert.equal(rf28r7351sg!.confidence, "PROVEN");
  assert.equal(rf28r7351sg!.official_filter_token_or_name, "HAF-QIN");
  assert.deepEqual(rf28r7351sg!.current_legacy_buckparts_filter_slugs.sort(), [
    "da97-17376a",
    "da97-17376b",
  ]);
  assert.match(rf28r7351sg!.plain_english_next_action, /DA97\/DA29 part-number-family cross-reference/i);

  const rf28r7201sr = report.model_rows.find((r) => r.fridge_slug === "samsung-rf28r7201sr");
  assert.ok(rf28r7201sr);
  assert.equal(rf28r7201sr!.confidence, "PROVEN");
  assert.deepEqual(rf28r7201sr!.current_legacy_buckparts_filter_slugs, ["da97-17376b"]);
});

test("Samsung HAF-CIN models are PROVEN via DA29-00020B family cross-reference", () => {
  const report = buildRefrigeratorModelFirstBatchResolverV1({
    rootDir: REPO_ROOT,
    manifestRelPath: MANIFEST_REL,
  });
  for (const slug of ["samsung-rf263beaesr", "samsung-rf28nhedbsr"] as const) {
    const row = report.model_rows.find((r) => r.fridge_slug === slug);
    assert.ok(row, slug);
    assert.equal(row!.confidence, "PROVEN");
    assert.equal(row!.official_filter_token_or_name, "HAF-CIN");
    assert.deepEqual(row!.current_legacy_buckparts_filter_slugs, ["da29-00020b"]);
  }
});

test("all 20 batch models are PROVEN with no MAPPING_REVIEW_REQUIRED rows", () => {
  const report = buildRefrigeratorModelFirstBatchResolverV1({
    rootDir: REPO_ROOT,
    manifestRelPath: MANIFEST_REL,
  });
  assert.equal(report.model_rows.filter((r) => r.confidence === "MAPPING_REVIEW_REQUIRED").length, 0);
  for (const slug of BATCH_SLUGS) {
    const row = report.model_rows.find((r) => r.fridge_slug === slug);
    assert.ok(row, slug);
    assert.equal(row!.confidence, "PROVEN");
  }
});

test("lg-lrfxs3106s remains PROVEN under strict non-Samsung exact-token gates", () => {
  const report = buildRefrigeratorModelFirstBatchResolverV1({
    rootDir: REPO_ROOT,
    manifestRelPath: MANIFEST_REL,
  });
  const row = report.model_rows.find((r) => r.fridge_slug === "lg-lrfxs3106s");
  assert.ok(row);
  assert.equal(row!.confidence, "PROVEN");
  assert.equal(row!.official_filter_token_or_name, "LT1000P");
  assert.deepEqual(row!.current_legacy_buckparts_filter_slugs, ["lt1000p"]);
});

test("read-only resolver does not mutate product CSV or public routes", () => {
  const before = new Map(
    FORBIDDEN_MUTATION_PATHS.map((p) => [p, readFileSync(path.join(REPO_ROOT, p), "utf8")]),
  );

  buildRefrigeratorModelFirstBatchResolverV1({
    rootDir: REPO_ROOT,
    manifestRelPath: MANIFEST_REL,
  });

  for (const [p, content] of before.entries()) {
    assert.equal(readFileSync(path.join(REPO_ROOT, p), "utf8"), content);
  }
});

test("steering override is inactive when batch is fully PROVEN", () => {
  const report = buildRefrigeratorModelFirstBatchResolverV1({
    rootDir: REPO_ROOT,
    manifestRelPath: MANIFEST_REL,
  });
  const override = resolveRefrigeratorModelFirstSteeringOverrideV1({
    resolver: report,
    brainStopTheLine: false,
  });
  assert.equal(override, null);
});

test("steering override mentions Samsung cross-reference when mapping review remains with zero unknown", () => {
  const override = resolveRefrigeratorModelFirstSteeringOverrideV1({
    resolver: {
      inspect_summary: {
        models_checked_count: 20,
        confidence_counts: { PROVEN: 16, UNKNOWN: 0, MAPPING_REVIEW_REQUIRED: 4 },
      },
      source_contract: "test",
      manifest_path: MANIFEST_REL,
    },
    brainStopTheLine: false,
  });
  assert.ok(override);
  assert.match(override!.next_best_action, /Samsung HAF-QIN\/HAF-CIN marketing-token to DA97\/DA29/i);
  assert.doesNotMatch(override!.next_best_action, /0 unknown refrigerator models/i);
});
