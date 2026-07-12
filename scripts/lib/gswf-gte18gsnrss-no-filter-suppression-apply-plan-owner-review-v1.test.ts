import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
  buildGswfGte18gsnrssNoFilterSuppressionApplyPlanOwnerReviewV1,
  GSWF_GTE18GSNRSS_NO_FILTER_SUPPRESSION_ALLOWED_WRITE_REL_PATHS_V1,
  GSWF_GTE18GSNRSS_NO_FILTER_SUPPRESSION_APPLY_PLAN_CONTRACT_V1,
  GSWF_GTE18GSNRSS_NO_FILTER_SUPPRESSION_APPLY_PLAN_JSON_REL_V1,
  GSWF_GTE18GSNRSS_NO_FILTER_SUPPRESSION_APPLY_PLAN_MD_REL_V1,
  GSWF_GTE18GSNRSS_NO_FILTER_TARGET_SLUG_V1,
  writeGswfGte18gsnrssNoFilterSuppressionApplyPlanArtifactsV1,
} from "./gswf-gte18gsnrss-no-filter-suppression-apply-plan-owner-review-v1";
import {
  GSWF_WRONG_PART_EXCLUDED_PARTIAL_SLUGS_V1,
  GSWF_WRONG_PART_PLANNED_FRIDGE_SLUGS_V1,
} from "./gswf-wrong-part-repair-apply-plan-owner-review-v1";

const ROOT = process.cwd();
const LIB_SOURCE = readFileSync(
  "scripts/lib/gswf-gte18gsnrss-no-filter-suppression-apply-plan-owner-review-v1.ts",
  "utf8",
);
const REPORT_SOURCE = readFileSync(
  "scripts/report-gswf-gte18gsnrss-no-filter-suppression-apply-plan-owner-review-v1.ts",
  "utf8",
);
const FIXED_NOW = () => new Date("2026-07-12T20:00:00.000Z");

test("read-only auth flags are all fail-closed", () => {
  const plan = buildGswfGte18gsnrssNoFilterSuppressionApplyPlanOwnerReviewV1({
    rootDir: ROOT,
    now: FIXED_NOW,
  });
  assert.equal(plan.contract, GSWF_GTE18GSNRSS_NO_FILTER_SUPPRESSION_APPLY_PLAN_CONTRACT_V1);
  assert.equal(plan.read_only, true);
  assert.equal(plan.data_mutation, false);
  assert.equal(plan.mutation_authorized, false);
  assert.equal(plan.csv_apply_authorized, false);
  assert.equal(plan.supabase_mutation_authorized, false);
  assert.equal(plan.buy_cta_authorized, false);
  assert.equal(plan.retailer_links_mutation_authorized, false);
  assert.equal(plan.sitemap_robots_mutation_authorized, false);
  assert.equal(plan.product_json_ld_mutation_authorized, false);
  assert.equal(plan.apply_authorized, false);
  assert.equal(plan.owner_approval_required, true);
});

test("scopes exactly one slug with two removals and zero additions", () => {
  const plan = buildGswfGte18gsnrssNoFilterSuppressionApplyPlanOwnerReviewV1({
    rootDir: ROOT,
    now: FIXED_NOW,
  });
  assert.equal(plan.planned_slug_count, 1);
  assert.equal(plan.target_fridge_slug, GSWF_GTE18GSNRSS_NO_FILTER_TARGET_SLUG_V1);
  assert.equal(plan.proposed_compat_action, "suppress_all_filter_mappings");
  assert.equal(plan.evidence_label, "PROVEN_NO_FILTER");
  assert.equal(plan.planned_compat_row_removals, 2);
  assert.equal(plan.planned_compat_row_additions, 0);
  assert.equal(plan.planned_csv_removals.length, 2);
  assert.equal(plan.planned_csv_additions.length, 0);
  assert.deepEqual(
    plan.planned_csv_removals.map((row) => row.row_key).sort(),
    ["ge-gte18gsnrss,gswf", "ge-gte18gsnrss,gswf2"],
  );
  assert.deepEqual(plan.before_mappings, ["gswf", "gswf2"]);
  assert.deepEqual(plan.after_mappings, []);
});

test("excludes PARTIAL 3 and GSWF 13 repaired slugs", () => {
  const plan = buildGswfGte18gsnrssNoFilterSuppressionApplyPlanOwnerReviewV1({
    rootDir: ROOT,
    now: FIXED_NOW,
  });
  assert.deepEqual(plan.excluded_partial_slugs, [...GSWF_WRONG_PART_EXCLUDED_PARTIAL_SLUGS_V1]);
  assert.deepEqual(plan.excluded_gswf_repaired_slugs, [...GSWF_WRONG_PART_PLANNED_FRIDGE_SLUGS_V1]);
  assert.equal(plan.excluded_partial_slugs.includes(plan.target_fridge_slug), false);
  assert.equal(plan.excluded_gswf_repaired_slugs.includes(plan.target_fridge_slug), false);
  for (const slug of GSWF_WRONG_PART_EXCLUDED_PARTIAL_SLUGS_V1) {
    assert.ok(!plan.planned_csv_removals.some((row) => row.fridge_slug === slug));
  }
  for (const slug of GSWF_WRONG_PART_PLANNED_FRIDGE_SLUGS_V1) {
    assert.ok(!plan.planned_csv_removals.some((row) => row.fridge_slug === slug));
  }
});

test("retailer_links / sitemap / robots / Product JSON-LD are out of scope", () => {
  const plan = buildGswfGte18gsnrssNoFilterSuppressionApplyPlanOwnerReviewV1({
    rootDir: ROOT,
    now: FIXED_NOW,
  });
  assert.ok(plan.out_of_scope.some((item) => /retailer_links/i.test(item)));
  assert.ok(plan.out_of_scope.some((item) => /sitemap|robots/i.test(item)));
  assert.ok(plan.out_of_scope.some((item) => /Product JSON-LD/i.test(item)));
  assert.ok(plan.out_of_scope.some((item) => /buy CTA/i.test(item)));
});

test("build does not mutate CSV and source forbids production writes", () => {
  const csvPath = path.join(ROOT, "data/compatibility_mappings.csv");
  const before = readFileSync(csvPath, "utf8");
  buildGswfGte18gsnrssNoFilterSuppressionApplyPlanOwnerReviewV1({
    rootDir: ROOT,
    now: FIXED_NOW,
  });
  assert.equal(readFileSync(csvPath, "utf8"), before);

  const forbidden = [
    'writeFileSync(path.join(args.rootDir, "data/compatibility_mappings.csv")',
    'writeFileSync(path.join(args.rootDir, "data/retailer_links.csv")',
    "supabase/",
    "docs/BuckParts-HQ-HANDOFF",
  ];
  for (const needle of forbidden) {
    assert.ok(!LIB_SOURCE.includes(needle), `lib must not include ${needle}`);
    assert.ok(!REPORT_SOURCE.includes(needle), `report must not include ${needle}`);
  }
});

test("write artifacts only to allowlisted draft paths", () => {
  const tmp = mkdtempSync(path.join(tmpdir(), "gte18-no-filter-plan-"));
  try {
    const plan = buildGswfGte18gsnrssNoFilterSuppressionApplyPlanOwnerReviewV1({
      rootDir: ROOT,
      now: FIXED_NOW,
    });
    const written = writeGswfGte18gsnrssNoFilterSuppressionApplyPlanArtifactsV1({
      rootDir: tmp,
      plan,
    });
    assert.equal(written.json_rel_path, GSWF_GTE18GSNRSS_NO_FILTER_SUPPRESSION_APPLY_PLAN_JSON_REL_V1);
    assert.equal(written.md_rel_path, GSWF_GTE18GSNRSS_NO_FILTER_SUPPRESSION_APPLY_PLAN_MD_REL_V1);
    assert.ok(
      (
        GSWF_GTE18GSNRSS_NO_FILTER_SUPPRESSION_ALLOWED_WRITE_REL_PATHS_V1 as readonly string[]
      ).includes(written.json_rel_path),
    );
    assert.ok(existsSync(path.join(tmp, written.json_rel_path)));
    assert.ok(existsSync(path.join(tmp, written.md_rel_path)));
    const md = readFileSync(path.join(tmp, written.md_rel_path), "utf8");
    assert.match(md, /mutation_authorized: \*\*false\*\*/);
    assert.match(md, /ge-gte18gsnrss,gswf/);
    assert.match(md, /ge-gte18gsnrss,gswf2/);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});
