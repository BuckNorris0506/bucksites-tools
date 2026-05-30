import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  REFRIGERATOR_MODEL_FIRST_BATCH_RESOLVER_CONTRACT_V1,
  buildRefrigeratorModelFirstBatchResolverV1,
  resolveRefrigeratorModelFirstSteeringOverrideV1,
} from "./refrigerator-model-first-batch-resolver-v1";

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
  assert.equal(report.inspect_summary.csv_apply_authorized, false);
  assert.equal(report.inspect_summary.supabase_update_authorized, false);
  assert.equal(report.inspect_summary.buy_link_mutation_authorized, false);
  assert.equal(report.inspect_summary.public_page_change_authorized, false);
});

test("manifest models resolve from repo CSV hypothesis only", () => {
  const report = buildRefrigeratorModelFirstBatchResolverV1({
    rootDir: REPO_ROOT,
    manifestRelPath: MANIFEST_REL,
  });
  assert.equal(report.inspect_summary.models_checked_count, 20);
  assert.ok(report.exact_repo_paths_read.includes("data/fridge_models.csv"));
  assert.ok(report.exact_repo_paths_read.includes("data/compatibility_mappings.csv"));
  assert.ok(report.exact_repo_paths_read.includes("data/filters.csv"));
  assert.ok(report.exact_repo_paths_read.includes("data/retailer_links.csv"));
  for (const row of report.model_rows) {
    assert.equal(row.product_data_mutation_allowed, false);
    assert.ok(row.current_legacy_buckparts_filter_slugs.length > 0);
  }
});

test("lg-lrfxs3106s is MAPPING_REVIEW_REQUIRED from discrepancy doc official LT1000P", () => {
  const report = buildRefrigeratorModelFirstBatchResolverV1({
    rootDir: REPO_ROOT,
    manifestRelPath: MANIFEST_REL,
  });
  const row = report.model_rows.find((r) => r.fridge_slug === "lg-lrfxs3106s");
  assert.ok(row);
  assert.equal(row!.confidence, "MAPPING_REVIEW_REQUIRED");
  assert.equal(row!.official_filter_token_or_name, "LT1000P");
  assert.deepEqual(row!.current_legacy_buckparts_filter_slugs.sort(), ["lt600p", "lt800p"]);
  assert.equal(row!.grouped_official_filter_family, "lg::LT1000P");
});

test("manual-evidence LG models with multi-filter legacy maps are not PROVEN from CSV alone", () => {
  const report = buildRefrigeratorModelFirstBatchResolverV1({
    rootDir: REPO_ROOT,
    manifestRelPath: MANIFEST_REL,
  });
  for (const slug of [
    "lg-lfxs28968s",
    "lg-lfxs26973s",
    "lg-lrfvs3006s",
    "lg-lfxc22596s",
    "lg-lmxs28626s",
  ]) {
    const row = report.model_rows.find((r) => r.fridge_slug === slug);
    assert.ok(row, slug);
    assert.equal(row!.confidence, "MAPPING_REVIEW_REQUIRED");
    assert.equal(row!.official_filter_token_or_name, "LT1000P");
    assert.ok(row!.current_legacy_buckparts_filter_slugs.length > 1);
    assert.equal(row!.grouped_official_filter_family, "lg::LT1000P");
  }
});

test("manual-evidence Samsung models with multi-filter legacy maps are not PROVEN from CSV alone", () => {
  const report = buildRefrigeratorModelFirstBatchResolverV1({
    rootDir: REPO_ROOT,
    manifestRelPath: MANIFEST_REL,
  });
  const hafQin = ["samsung-rf28r7351sg", "samsung-rf28r7201sr"] as const;
  const hafCin = ["samsung-rf263beaesr", "samsung-rf28nhedbsr"] as const;
  for (const slug of hafQin) {
    const row = report.model_rows.find((r) => r.fridge_slug === slug);
    assert.ok(row, slug);
    assert.equal(row!.confidence, "MAPPING_REVIEW_REQUIRED");
    assert.equal(row!.official_filter_token_or_name, "HAF-QIN");
    assert.ok(row!.current_legacy_buckparts_filter_slugs.length > 1);
    assert.equal(row!.grouped_official_filter_family, "samsung::HAFQIN");
  }
  for (const slug of hafCin) {
    const row = report.model_rows.find((r) => r.fridge_slug === slug);
    assert.ok(row, slug);
    assert.equal(row!.confidence, "MAPPING_REVIEW_REQUIRED");
    assert.equal(row!.official_filter_token_or_name, "HAF-CIN");
    assert.ok(row!.current_legacy_buckparts_filter_slugs.length > 1);
    assert.equal(row!.grouped_official_filter_family, "samsung::HAFCIN");
  }
});

test("manual-evidence GE GFE28G models with multi-filter legacy maps are not PROVEN from CSV alone", () => {
  const report = buildRefrigeratorModelFirstBatchResolverV1({
    rootDir: REPO_ROOT,
    manifestRelPath: MANIFEST_REL,
  });
  for (const slug of ["ge-gfe28gskss", "ge-gfe28gmkes", "ge-gfe28gynfs"]) {
    const row = report.model_rows.find((r) => r.fridge_slug === slug);
    assert.ok(row, slug);
    assert.equal(row!.confidence, "MAPPING_REVIEW_REQUIRED");
    assert.equal(row!.official_filter_token_or_name, "RPWFE");
    assert.ok(row!.current_legacy_buckparts_filter_slugs.length > 1);
    assert.equal(row!.grouped_official_filter_family, "ge::RPWFE");
  }
});

test("manual-evidence Whirlpool models with legacy map conflicts are not PROVEN from CSV alone", () => {
  const report = buildRefrigeratorModelFirstBatchResolverV1({
    rootDir: REPO_ROOT,
    manifestRelPath: MANIFEST_REL,
  });
  const edr4 = ["whirlpool-wrx735sdhz", "whirlpool-wrf540cwhz"] as const;
  for (const slug of edr4) {
    const row = report.model_rows.find((r) => r.fridge_slug === slug);
    assert.ok(row, slug);
    assert.equal(row!.confidence, "MAPPING_REVIEW_REQUIRED");
    assert.equal(row!.official_filter_token_or_name, "EDR4RXD1");
    assert.ok(row!.current_legacy_buckparts_filter_slugs.length > 0);
    assert.equal(row!.grouped_official_filter_family, "whirlpool::EDR4RXD1");
  }
  const edr2 = report.model_rows.find((r) => r.fridge_slug === "whirlpool-wrx986sihz");
  assert.ok(edr2);
  assert.equal(edr2!.confidence, "MAPPING_REVIEW_REQUIRED");
  assert.equal(edr2!.official_filter_token_or_name, "EDR2RXD1");
  assert.equal(edr2!.grouped_official_filter_family, "whirlpool::EDR2RXD1");
  const edr1 = report.model_rows.find((r) => r.fridge_slug === "whirlpool-wrs325sdhz");
  assert.ok(edr1);
  assert.equal(edr1!.confidence, "MAPPING_REVIEW_REQUIRED");
  assert.equal(edr1!.official_filter_token_or_name, "EDR1RXD1");
  assert.equal(edr1!.grouped_official_filter_family, "whirlpool::EDR1RXD1");
});

test("MAPPING_REVIEW_REQUIRED rows expose legacy and official fields for jq consumers", () => {
  const report = buildRefrigeratorModelFirstBatchResolverV1({
    rootDir: REPO_ROOT,
    manifestRelPath: MANIFEST_REL,
  });
  const reviewRows = report.model_rows.filter((r) => r.confidence === "MAPPING_REVIEW_REQUIRED");
  assert.equal(reviewRows.length, 17);
  for (const row of reviewRows) {
    assert.ok(row.current_legacy_buckparts_filter_slugs.length > 0);
    assert.ok(row.official_filter_token_or_name);
    assert.ok(row.grouped_official_filter_family);
  }
});

test("models without official proof default to UNKNOWN", () => {
  const report = buildRefrigeratorModelFirstBatchResolverV1({
    rootDir: REPO_ROOT,
    manifestRelPath: MANIFEST_REL,
  });
  const row = report.model_rows.find((r) => r.fridge_slug === "frigidaire-fghb2868pf");
  assert.ok(row);
  assert.equal(row!.confidence, "UNKNOWN");
  assert.equal(row!.official_filter_token_or_name, null);
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

test("steering override is ready when mapping review or unknown rows remain", () => {
  const report = buildRefrigeratorModelFirstBatchResolverV1({
    rootDir: REPO_ROOT,
    manifestRelPath: MANIFEST_REL,
  });
  const override = resolveRefrigeratorModelFirstSteeringOverrideV1({
    resolver: report,
    brainStopTheLine: false,
  });
  assert.ok(override);
  assert.ok(override!.next_best_action.startsWith("REFRIGERATOR MODEL-FIRST [READY]:"));
  assert.match(override!.next_best_action, /Resolve 17 mapping-review models/);
  assert.match(override!.next_best_action, /3 unknown refrigerator models/);
  assert.equal(override!.mutation_block_reasons.includes("csv_apply_authorized:false"), true);
});
