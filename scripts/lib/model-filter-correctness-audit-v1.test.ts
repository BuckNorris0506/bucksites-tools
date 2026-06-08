import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  MODEL_FILTER_CORRECTNESS_AUDIT_ALLOWED_WRITE_REL_PATHS_V1,
  MODEL_FILTER_CORRECTNESS_AUDIT_CONTRACT_V1,
  buildModelFilterCorrectnessAuditV1,
  writeModelFilterCorrectnessAuditArtifactsV1,
} from "./model-filter-correctness-audit-v1";

const ROOT = process.cwd();
const LIB_SOURCE = readFileSync("scripts/lib/model-filter-correctness-audit-v1.ts", "utf8");
const REPORT_SOURCE = readFileSync(
  "scripts/report-model-filter-correctness-audit-v1.ts",
  "utf8",
);

function rowForSlug(
  report: ReturnType<typeof buildModelFilterCorrectnessAuditV1>,
  slug: string,
) {
  const row = report.model_rows.find((entry) => entry.fridge_slug === slug);
  assert.ok(row, `missing model row for ${slug}`);
  return row!;
}

test("contract and read-only flags", () => {
  const report = buildModelFilterCorrectnessAuditV1({ rootDir: ROOT });
  assert.equal(report.contract, MODEL_FILTER_CORRECTNESS_AUDIT_CONTRACT_V1);
  assert.equal(report.read_only, true);
  assert.equal(report.data_mutation, false);
  assert.equal(report.mutation_blocked_until_owner_approval, true);
  assert.equal(report.mutation_authorized, false);
});

test("total model count is 500", () => {
  const report = buildModelFilterCorrectnessAuditV1({ rootDir: ROOT });
  assert.equal(report.total_models, 500);
  assert.equal(report.model_rows.length, 500);
});

test("samsung-rf28r7351sr is PROVEN_CORRECT via page-quality-gate aligned evidence", () => {
  const report = buildModelFilterCorrectnessAuditV1({ rootDir: ROOT });
  const row = rowForSlug(report, "samsung-rf28r7351sr");
  assert.equal(row.classification, "PROVEN_CORRECT");
  assert.ok(row.evidence_status.startsWith("PROVEN_"));
  assert.ok(
    row.per_filter_proof.every((entry) => entry.proof_status === "PROVEN_ALIGNED"),
  );
});

test("samsung-rf27t5501sr is wrong-family risk", () => {
  const report = buildModelFilterCorrectnessAuditV1({ rootDir: ROOT });
  const row = rowForSlug(report, "samsung-rf27t5501sr");
  assert.ok(row.classification === "WRONG_PART_RISK" || row.classification === "BLOCKED");
  assert.ok(row.blockers.includes("wildcard:BLOCKED_HAF_CIN_CANONICAL"));
});

test("samsung-rf28r7351ww is not safe for factory scaling", () => {
  const report = buildModelFilterCorrectnessAuditV1({ rootDir: ROOT });
  const row = rowForSlug(report, "samsung-rf28r7351ww");
  assert.notEqual(row.classification, "PROVEN_CORRECT");
});

test("lg-lrfxs3106s is BLOCKED while quarantine override is active", () => {
  const report = buildModelFilterCorrectnessAuditV1({ rootDir: ROOT });
  const row = rowForSlug(report, "lg-lrfxs3106s");
  assert.equal(row.classification, "BLOCKED");
  assert.ok(row.blockers.some((blocker) => blocker.startsWith("quarantine:")));
});

test("LG LT1000P + LT1000PC co-map is flagged as wrong-part risk", () => {
  const report = buildModelFilterCorrectnessAuditV1({ rootDir: ROOT });
  const row = rowForSlug(report, "lg-lfxs28968s");
  assert.equal(row.classification, "WRONG_PART_RISK");
  assert.ok(
    row.blockers.some((blocker) => blocker.includes("Multiple LG LT filter generations")),
  );
  assert.ok(
    row.per_filter_proof.some(
      (entry) =>
        (entry.filter_slug === "lt1000p" || entry.filter_slug === "lt1000pc") &&
        entry.proof_status === "WRONG_FAMILY_RISK",
    ),
  );
});

test("read-only guard prevents writes to compat, retailer links, sitemap, robots, Supabase paths", () => {
  const forbiddenWrites = [
    'writeFileSync(path.join(args.rootDir, "data/compatibility_mappings.csv")',
    'writeFileSync(path.join(args.rootDir, "data/retailer_links.csv")',
    'writeFileSync(path.join(args.rootDir, "data/fridge_models.csv")',
    'writeFileSync(path.join(args.rootDir, "data/filters.csv")',
    "supabase/",
    'writeFileSync(path.join(args.rootDir, "src/app/fridge/',
    'writeFileSync(path.join(args.rootDir, "public/robots',
    'writeFileSync(path.join(args.rootDir, "public/sitemap',
  ];

  for (const needle of forbiddenWrites) {
    assert.equal(LIB_SOURCE.includes(needle), false, `lib must not write ${needle}`);
    assert.equal(REPORT_SOURCE.includes(needle), false, `report must not write ${needle}`);
  }

  for (const allowed of MODEL_FILTER_CORRECTNESS_AUDIT_ALLOWED_WRITE_REL_PATHS_V1) {
    assert.ok(
      LIB_SOURCE.includes(allowed) || LIB_SOURCE.includes(path.basename(allowed)),
      `lib must reference allowed write path ${allowed}`,
    );
  }
});

test("write-artifacts only writes allowed audit paths", () => {
  const report = buildModelFilterCorrectnessAuditV1({ rootDir: ROOT });
  const paths = writeModelFilterCorrectnessAuditArtifactsV1({ rootDir: ROOT, report });
  assert.ok(existsSync(path.join(ROOT, paths.jsonRelPath)));
  assert.ok(existsSync(path.join(ROOT, paths.mdRelPath)));
  assert.ok(paths.csvRelPath && existsSync(path.join(ROOT, paths.csvRelPath)));
});

test("top 50 risk pages and confusion summary are populated", () => {
  const report = buildModelFilterCorrectnessAuditV1({ rootDir: ROOT });
  assert.equal(report.top_50_risk_pages.length, 50);
  assert.ok(report.confusion_family_summary.lg_lt_generation_mixes > 0);
  assert.ok(report.factory_scaling.dangerous > 0);
});
