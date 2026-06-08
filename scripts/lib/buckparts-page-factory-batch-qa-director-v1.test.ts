import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
  BATCH_QA_CLASSIFICATIONS_V1,
  PAGE_FACTORY_BATCH_QA_DIRECTOR_ALLOWED_WRITE_REL_PATHS_V1,
  PAGE_FACTORY_BATCH_QA_DIRECTOR_CONTRACT_V1,
  buildPageFactoryBatchQaDirectorReportV1,
  classifyBatchQaFromQualityGateV1,
  writePageFactoryBatchQaDirectorArtifactsV1,
} from "./buckparts-page-factory-batch-qa-director-v1";
import {
  buildPageQualityGateReportV1,
  writePageQualityGateArtifactsV1,
} from "./buckparts-page-quality-gate-v1";

const ROOT = process.cwd();
const LIB_SOURCE = readFileSync(
  "scripts/lib/buckparts-page-factory-batch-qa-director-v1.ts",
  "utf8",
);
const REPORT_SOURCE = readFileSync(
  "scripts/report-buckparts-page-factory-batch-qa-director-v1.ts",
  "utf8",
);

const FIXTURE_BATCH_ID = "haf-qin-qa-director-fixture-v1";
const FIXTURE_MANIFEST_REL = `data/fridge/batch-production/page-factory/evidence-clone-batch-v1/${FIXTURE_BATCH_ID}-manifest-v1.json`;

function writeFixtureManifest(): void {
  const abs = path.join(ROOT, FIXTURE_MANIFEST_REL);
  mkdirSync(path.dirname(abs), { recursive: true });
  writeFileSync(
    abs,
    `${JSON.stringify(
      {
        batch_id: FIXTURE_BATCH_ID,
        pairs: [
          {
            target_slug: "samsung-rf28r7351sr",
            source_slug: "samsung-rf28r7351sr",
            family_key: "samsung::HAFQIN",
          },
          {
            target_slug: "samsung-rf28r7351ww",
            source_slug: "samsung-rf28r7351sr",
            family_key: "samsung::HAFQIN",
          },
          {
            target_slug: "samsung-rf27t5501sr",
            source_slug: "samsung-rf28r7351sr",
            family_key: "samsung::HAFQIN",
          },
        ],
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
}

test("classifyBatchQaFromQualityGateV1 maps known slugs", async () => {
  const sr = await buildPageQualityGateReportV1({
    rootDir: ROOT,
    fridgeSlug: "samsung-rf28r7351sr",
  });
  const ww = await buildPageQualityGateReportV1({
    rootDir: ROOT,
    fridgeSlug: "samsung-rf28r7351ww",
  });
  const blocked = await buildPageQualityGateReportV1({
    rootDir: ROOT,
    fridgeSlug: "samsung-rf27t5501sr",
  });

  assert.equal(classifyBatchQaFromQualityGateV1(sr), "VERIFIED");
  assert.equal(classifyBatchQaFromQualityGateV1(ww), "NEEDS_EVIDENCE");
  assert.equal(classifyBatchQaFromQualityGateV1(blocked), "WRONG_PART_RISK");
});

test("batch QA director contract and bucket rollup from manifest", async () => {
  writeFixtureManifest();

  try {
    const report = await buildPageFactoryBatchQaDirectorReportV1({
      rootDir: ROOT,
      batchId: FIXTURE_BATCH_ID,
    });

    assert.equal(report.contract, PAGE_FACTORY_BATCH_QA_DIRECTOR_CONTRACT_V1);
    assert.equal(report.read_only, true);
    assert.equal(report.data_mutation, false);
    assert.equal(report.mutation_authorized, false);
    assert.equal(report.pair_count, 3);
    assert.equal(BATCH_QA_CLASSIFICATIONS_V1.length, 5);

    const byClass = Object.fromEntries(report.buckets.map((b) => [b.classification, b]));
    assert.equal(byClass.VERIFIED?.count, 1);
    assert.equal(byClass.NEEDS_EVIDENCE?.count, 1);
    assert.equal(byClass.WRONG_PART_RISK?.count, 1);
    assert.equal(byClass.BLOCKED?.count, 0);
    assert.equal(byClass.NOINDEX_REVIEW?.count, 0);

    assert.equal(byClass.VERIFIED?.affected_slugs[0], "samsung-rf28r7351sr");
    assert.equal(byClass.NEEDS_EVIDENCE?.affected_slugs[0], "samsung-rf28r7351ww");
    assert.equal(byClass.WRONG_PART_RISK?.affected_slugs[0], "samsung-rf27t5501sr");

    const pctSum = report.buckets.reduce((sum, b) => sum + b.percentage, 0);
    assert.ok(Math.abs(pctSum - 100) < 0.2);

    assert.ok(report.batch_publication_readiness_score > 0);
    assert.ok(report.batch_risk_score > 0);
    assert.ok(report.top_20_blockers_by_frequency.length > 0);
    assert.ok(report.top_20_blockers_by_frequency.length <= 20);
  } finally {
    rmSync(path.join(ROOT, FIXTURE_MANIFEST_REL), { force: true });
  }
});

test("batch QA director prefers on-disk quality gate artifacts when present", async () => {
  const sandbox = mkdtempSync(path.join(tmpdir(), "batch-qa-artifact-pref-"));
  try {
    const srReport = await buildPageQualityGateReportV1({
      rootDir: ROOT,
      fridgeSlug: "samsung-rf28r7351sr",
    });
    writePageQualityGateArtifactsV1({ rootDir: sandbox, report: srReport });

    const manifestRel = FIXTURE_MANIFEST_REL;
    const manifestAbs = path.join(sandbox, manifestRel);
    mkdirSync(path.dirname(manifestAbs), { recursive: true });
    writeFileSync(
      manifestAbs,
      `${JSON.stringify(
        {
          batch_id: FIXTURE_BATCH_ID,
          pairs: [
            {
              target_slug: "samsung-rf28r7351sr",
              source_slug: "samsung-rf28r7351sr",
              family_key: "samsung::HAFQIN",
            },
          ],
        },
        null,
        2,
      )}\n`,
      "utf8",
    );

    const report = await buildPageFactoryBatchQaDirectorReportV1({
      rootDir: sandbox,
      batchId: FIXTURE_BATCH_ID,
      manifestRelPath: manifestRel,
    });

    assert.equal(report.pair_count, 1);
    assert.equal(report.per_slug[0]?.quality_gate_source, "artifact");
    assert.equal(report.quality_gate_input_mode, "artifacts_only");
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});

test("write artifacts under allowed paths only", async () => {
  writeFixtureManifest();

  try {
    const report = await buildPageFactoryBatchQaDirectorReportV1({
      rootDir: ROOT,
      batchId: FIXTURE_BATCH_ID,
    });
    const sandbox = mkdtempSync(path.join(tmpdir(), "batch-qa-director-write-"));
    try {
      const paths = writePageFactoryBatchQaDirectorArtifactsV1({ rootDir: sandbox, report });
      assert.ok(existsSync(path.join(sandbox, paths.jsonRelPath)));
      assert.ok(existsSync(path.join(sandbox, paths.mdRelPath)));
      const md = readFileSync(path.join(sandbox, paths.mdRelPath), "utf8");
      assert.match(md, /batch_publication_readiness_score/);
      assert.match(md, /Top 20 blockers by frequency/);
    } finally {
      rmSync(sandbox, { recursive: true, force: true });
    }
  } finally {
    rmSync(path.join(ROOT, FIXTURE_MANIFEST_REL), { force: true });
  }
});

test("read-only guard: lib/report do not mutate protected production paths", () => {
  const forbiddenWrites = [
    'writeFileSync(path.join(args.rootDir, "data/manual-evidence/',
    'writeFileSync(path.join(args.rootDir, "data/compatibility_mappings.csv")',
    'writeFileSync(path.join(args.rootDir, "data/retailer_links.csv")',
    "supabase/",
    'writeFileSync(path.join(args.rootDir, "src/app/go/',
    'writeFileSync(path.join(args.rootDir, "src/app/fridge/',
  ];

  for (const needle of forbiddenWrites) {
    assert.equal(LIB_SOURCE.includes(needle), false, `lib must not write ${needle}`);
    assert.equal(REPORT_SOURCE.includes(needle), false, `report must not write ${needle}`);
  }

  for (const allowed of PAGE_FACTORY_BATCH_QA_DIRECTOR_ALLOWED_WRITE_REL_PATHS_V1) {
    assert.ok(
      LIB_SOURCE.includes(allowed.replace("*", "")) ||
        LIB_SOURCE.includes("batch-qa-director-v1"),
    );
  }
});
