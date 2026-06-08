import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  PROVEN_COHORT_CLONE_ANCHOR_SLUG_V1,
  PROVEN_COHORT_PAGE_FACTORY_MANIFEST_ALLOWED_WRITE_REL_PATHS_V1,
  PROVEN_COHORT_PAGE_FACTORY_MANIFEST_CONTRACT_V1,
  buildProvenCohortPageFactoryManifestV1,
  writeProvenCohortPageFactoryManifestArtifactsV1,
} from "./proven-cohort-page-factory-manifest-v1";

const ROOT = process.cwd();
const LIB_SOURCE = readFileSync(
  "scripts/lib/proven-cohort-page-factory-manifest-v1.ts",
  "utf8",
);
const REPORT_SOURCE = readFileSync(
  "scripts/report-proven-cohort-page-factory-manifest-v1.ts",
  "utf8",
);

const EXCLUDED_CLASSIFICATIONS = [
  "WRONG_PART_RISK",
  "BLOCKED",
  "UNKNOWN",
  "LIKELY_CORRECT_NEEDS_EVIDENCE",
] as const;

test("contract and read-only flags", () => {
  const report = buildProvenCohortPageFactoryManifestV1({ rootDir: ROOT });
  assert.equal(report.contract, PROVEN_COHORT_PAGE_FACTORY_MANIFEST_CONTRACT_V1);
  assert.equal(report.read_only, true);
  assert.equal(report.data_mutation, false);
  assert.equal(report.mutation_blocked_until_owner_approval, true);
  assert.equal(report.mutation_authorized, false);
});

test("exactly 15 PROVEN_CORRECT slugs included", () => {
  const report = buildProvenCohortPageFactoryManifestV1({ rootDir: ROOT });
  assert.equal(report.proven_correct_slug_count, 15);
  assert.equal(report.cohort_rows.length, 15);
  assert.ok(report.cohort_rows.every((row) => row.audit_classification === "PROVEN_CORRECT"));
});

test("excludes WRONG_PART_RISK, BLOCKED, UNKNOWN, LIKELY_CORRECT_NEEDS_EVIDENCE", () => {
  const report = buildProvenCohortPageFactoryManifestV1({ rootDir: ROOT });
  const audit = JSON.parse(
    readFileSync("data/fridge/batch-production/audits/model-filter-correctness-audit-v1.json", "utf8"),
  ) as { model_rows: Array<{ fridge_slug: string; classification: string }> };

  const cohortSlugs = new Set(report.cohort_rows.map((row) => row.fridge_slug));
  for (const classification of EXCLUDED_CLASSIFICATIONS) {
    const excluded = audit.model_rows.filter((row) => row.classification === classification);
    for (const row of excluded) {
      assert.equal(
        cohortSlugs.has(row.fridge_slug),
        false,
        `${row.fridge_slug} with ${classification} must not be in cohort`,
      );
    }
  }
});

test("samsung-rf28r7351sr is marked already registered", () => {
  const report = buildProvenCohortPageFactoryManifestV1({ rootDir: ROOT });
  const row = report.cohort_rows.find((entry) => entry.fridge_slug === "samsung-rf28r7351sr");
  assert.ok(row);
  assert.equal(row.already_in_page_factory_registry, true);
  assert.ok(row.registry_target);
  assert.ok(row.quality_gate_status);
});

test("every included slug has manual evidence path on disk", () => {
  const report = buildProvenCohortPageFactoryManifestV1({ rootDir: ROOT });
  for (const row of report.cohort_rows) {
    assert.match(row.manual_evidence_path, /^data\/manual-evidence\/refrigerator\/[a-z0-9-]+\.json$/);
    assert.ok(
      existsSync(path.join(ROOT, row.manual_evidence_path)),
      `missing manual evidence for ${row.fridge_slug}`,
    );
  }
});

test("read-only guard protects compat, retailer links, sitemap, robots, Supabase paths", () => {
  const forbiddenWrites = [
    'writeFileSync(path.join(args.rootDir, "data/compatibility_mappings.csv")',
    'writeFileSync(path.join(args.rootDir, "data/retailer_links.csv")',
    'writeFileSync(path.join(args.rootDir, "data/fridge_models.csv")',
    'writeFileSync(path.join(args.rootDir, "data/filters.csv")',
    'writeFileSync(path.join(args.rootDir, "data/fridge/batch-production/page-factory-targets-v1.csv")',
    "supabase/",
    'writeFileSync(path.join(args.rootDir, "src/app/fridge/',
    'writeFileSync(path.join(args.rootDir, "public/robots',
    'writeFileSync(path.join(args.rootDir, "public/sitemap',
  ];

  for (const needle of forbiddenWrites) {
    assert.equal(LIB_SOURCE.includes(needle), false, `lib must not write ${needle}`);
    assert.equal(REPORT_SOURCE.includes(needle), false, `report must not write ${needle}`);
  }

  for (const allowed of PROVEN_COHORT_PAGE_FACTORY_MANIFEST_ALLOWED_WRITE_REL_PATHS_V1) {
    assert.ok(LIB_SOURCE.includes(allowed), `lib must reference allowed write path ${allowed}`);
  }
});

test("clone anchor slug is samsung-rf28r7351sr", () => {
  const report = buildProvenCohortPageFactoryManifestV1({ rootDir: ROOT });
  assert.equal(report.clone_anchor_slug, PROVEN_COHORT_CLONE_ANCHOR_SLUG_V1);
  assert.equal(report.clone_anchor_slug, "samsung-rf28r7351sr");
});

test("write-artifacts only writes allowed manifest paths", () => {
  const report = buildProvenCohortPageFactoryManifestV1({ rootDir: ROOT });
  const paths = writeProvenCohortPageFactoryManifestArtifactsV1({ rootDir: ROOT, report });
  assert.ok(existsSync(path.join(ROOT, paths.jsonRelPath)));
  assert.ok(existsSync(path.join(ROOT, paths.mdRelPath)));
});
