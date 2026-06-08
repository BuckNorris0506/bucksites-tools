import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  SAMSUNG_HAF_QIN_WILDCARD_EXPANSION_REVIEW_CONTRACT_V1,
  buildSamsungHafQinWildcardExpansionReviewV1,
  isSupportedSuffixDoubleStarPatternV1,
  matchCatalogSlugsForPatternV1,
} from "./samsung-haf-qin-wildcard-expansion-review-v1";

const ROOT = process.cwd();

function catalogSlugRow(
  report: ReturnType<typeof buildSamsungHafQinWildcardExpansionReviewV1>,
  fridgeSlug: string,
) {
  const row = report.catalog_slug_rows.find((entry) => entry.fridge_slug === fridgeSlug);
  assert.ok(row, `missing catalog slug row: ${fridgeSlug}`);
  return row!;
}

test("suffix double-star support detection", () => {
  assert.equal(isSupportedSuffixDoubleStarPatternV1("RF28R7351**"), true);
  assert.equal(isSupportedSuffixDoubleStarPatternV1("RF70F23*E*"), false);
});

test("RF28R7351** matches known samsung finish variants", () => {
  const report = buildSamsungHafQinWildcardExpansionReviewV1({ rootDir: ROOT });
  const pattern = report.pattern_rows.find((row) => row.model_number_pattern === "RF28R7351**");
  assert.ok(pattern);
  assert.equal(pattern!.pattern_bucket, "HAS_CATALOG_MATCH");
  assert.ok(pattern!.matched_catalog_slugs.includes("samsung-rf28r7351sr"));
  assert.ok(pattern!.matched_catalog_slugs.includes("samsung-rf28r7351sg"));
});

test("v1 wildcard expansion review contract and inspect summary", () => {
  const report = buildSamsungHafQinWildcardExpansionReviewV1({ rootDir: ROOT });

  assert.equal(report.contract, SAMSUNG_HAF_QIN_WILDCARD_EXPANSION_REVIEW_CONTRACT_V1);
  assert.equal(report.read_only, true);
  assert.equal(report.data_mutation, false);
  assert.equal(report.mutation_blocked_until_owner_approval, true);
  assert.equal(report.mutation_authorized, false);
  assert.equal(report.catalog_row_creation_allowed, false);
  assert.equal(report.review_status, "READY_FOR_OWNER_REVIEW");

  assert.equal(report.inspect_summary.candidate_pattern_count, 109);
  assert.equal(report.inspect_summary.unique_model_number_count, 109);
  assert.equal(report.inspect_summary.wildcard_unsupported_pattern_count, 6);
  assert.equal(report.inspect_summary.no_catalog_match_pattern_count, 82);
  assert.equal(report.inspect_summary.has_catalog_match_pattern_count, 21);
  assert.equal(report.inspect_summary.matched_catalog_slug_count, 43);
  assert.equal(report.inspect_summary.catalog_slug_bucket_counts.COVERED, 8);
  assert.equal(report.inspect_summary.catalog_slug_bucket_counts.BLOCKED_HAF_CIN_CANONICAL, 1);
  assert.equal(report.inspect_summary.catalog_slug_bucket_counts.CANDIDATE_REVIEW, 8);
  assert.equal(report.inspect_summary.catalog_slug_bucket_counts.REVIEW_DA29_CONFLICT, 26);
});

test("page factory target and blocked HAF-CIN canonical slug classification", () => {
  const report = buildSamsungHafQinWildcardExpansionReviewV1({ rootDir: ROOT });

  const pageFactoryTarget = catalogSlugRow(report, "samsung-rf28r7351sr");
  assert.equal(pageFactoryTarget.bucket, "COVERED");
  assert.equal(pageFactoryTarget.page_factory_target, true);
  assert.deepEqual(pageFactoryTarget.warnings, []);

  const blocked = catalogSlugRow(report, "samsung-rf27t5501sr");
  assert.equal(blocked.bucket, "BLOCKED_HAF_CIN_CANONICAL");
  assert.ok(blocked.compat_filter_slugs.includes("da29-00020b"));
  assert.ok(blocked.compat_filter_slugs.includes("da29-00012b"));
});

test("COVERED slugs with da29-* emit DA29_COMPAT_PRESENT warning", () => {
  const report = buildSamsungHafQinWildcardExpansionReviewV1({ rootDir: ROOT });

  const dualFamily = catalogSlugRow(report, "samsung-rf18a5101sr");
  assert.equal(dualFamily.bucket, "COVERED");
  assert.deepEqual(dualFamily.warnings, ["DA29_COMPAT_PRESENT"]);
  assert.ok(dualFamily.compat_filter_slugs.includes("da97-17376b"));
  assert.ok(dualFamily.compat_filter_slugs.includes("da29-00003g"));

  assert.equal(report.inspect_summary.covered_with_da29_warning_count, 2);
});

test("lib source does not authorize catalog creation or CSV mutation", () => {
  const source = readFileSync(
    "scripts/lib/samsung-haf-qin-wildcard-expansion-review-v1.ts",
    "utf8",
  );
  assert.ok(!source.includes('writeFileSync(path.join(args.rootDir, "data/fridge_models.csv")'));
  assert.ok(!source.includes('writeFileSync(path.join(args.rootDir, "data/compatibility_mappings.csv")'));
  assert.equal(source.includes("catalog_row_creation_allowed: false"), true);
});

test("unsupported inline wildcard patterns do not match catalog", () => {
  const report = buildSamsungHafQinWildcardExpansionReviewV1({ rootDir: ROOT });
  const unsupported = report.pattern_rows.filter((row) => row.pattern_bucket === "WILDCARD_UNSUPPORTED");
  assert.equal(unsupported.length, 6);
  for (const row of unsupported) {
    assert.equal(row.matched_catalog_slugs.length, 0);
    assert.equal(row.expansion_rule, "unsupported");
  }
  assert.equal(
    matchCatalogSlugsForPatternV1("RF70F23*E*", [
      {
        fridge_slug: "samsung-rf70f23aesr",
        model_number: "RF70F23AESR",
        model_number_normalized: "RF70F23AESR",
      },
    ]).length,
    0,
  );
});
