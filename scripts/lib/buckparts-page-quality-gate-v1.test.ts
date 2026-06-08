import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { PAGE_STATES } from "@/lib/page-state/page-state";

import {
  BUCKPARTS_PAGE_QUALITY_GATE_CONTRACT_V1,
  PAGE_QUALITY_GATE_ALLOWED_WRITE_REL_PATHS_V1,
  buildPageQualityGateBatchReportV1,
  buildPageQualityGateReportV1,
  classifyPageQualityV1,
  deriveQualityIndexRecommendations,
  writePageQualityGateArtifactsV1,
} from "./buckparts-page-quality-gate-v1";

const ROOT = process.cwd();
const LIB_SOURCE = readFileSync("scripts/lib/buckparts-page-quality-gate-v1.ts", "utf8");
const REPORT_SOURCE = readFileSync(
  "scripts/report-buckparts-page-quality-gate-v1.ts",
  "utf8",
);

function gateStatus(
  report: Awaited<ReturnType<typeof buildPageQualityGateReportV1>>,
  gateId: string,
) {
  const gate = report.gates.find((g) => g.gate_id === gateId);
  assert.ok(gate, `missing gate ${gateId}`);
  return gate!;
}

test("contract and read-only flags on samsung-rf28r7351sr", async () => {
  const report = await buildPageQualityGateReportV1({
    rootDir: ROOT,
    fridgeSlug: "samsung-rf28r7351sr",
  });

  assert.equal(report.contract, BUCKPARTS_PAGE_QUALITY_GATE_CONTRACT_V1);
  assert.equal(report.read_only, true);
  assert.equal(report.data_mutation, false);
  assert.equal(report.mutation_blocked_until_owner_approval, true);
  assert.equal(report.mutation_authorized, false);
  assert.equal(report.target_source, "page_factory_registry");
});

test("samsung-rf28r7351sr is INDEXABLE_NO_BUY_LINK with publication authorized", async () => {
  const report = await buildPageQualityGateReportV1({
    rootDir: ROOT,
    fridgeSlug: "samsung-rf28r7351sr",
  });

  assert.equal(report.quality_classification, "INDEXABLE_NO_BUY_LINK");
  assert.equal(report.publication_authorized, true);
  assert.equal(report.recommended_sitemap_include, true);
  assert.equal(report.recommended_page_state, PAGE_STATES.INDEXABLE_BUY_SUPPRESSED_TRUST);
  assert.equal(report.recommended_robots.index, true);
  assert.equal(gateStatus(report, "model_existence_confirmed").status, "PASS");
  assert.equal(gateStatus(report, "model_specific_evidence").status, "PASS");
  assert.equal(gateStatus(report, "buyer_path").status, "WARN");
  assert.ok(report.preflight_gates && report.preflight_gates.length > 0);
});

test("samsung-rf28r7351ww is NOINDEX_REVIEW and not publication authorized", async () => {
  const report = await buildPageQualityGateReportV1({
    rootDir: ROOT,
    fridgeSlug: "samsung-rf28r7351ww",
  });

  assert.equal(report.quality_classification, "NOINDEX_REVIEW");
  assert.equal(report.publication_authorized, false);
  assert.equal(report.recommended_sitemap_include, false);
  assert.equal(report.recommended_robots.index, false);
  assert.equal(report.target_source, "inferred_catalog_wildcard");
  assert.equal(gateStatus(report, "model_existence_confirmed").status, "WARN");
  assert.equal(report.clone_packet?.clone_status, "NEEDS_TARGET_EVIDENCE");
});

test("samsung-rf27t5501sr is BLOCKED", async () => {
  const report = await buildPageQualityGateReportV1({
    rootDir: ROOT,
    fridgeSlug: "samsung-rf27t5501sr",
  });

  assert.equal(report.quality_classification, "BLOCKED");
  assert.equal(report.publication_authorized, false);
  assert.equal(gateStatus(report, "wrong_part_risk").status, "BLOCKED");
  assert.equal(gateStatus(report, "compat_proof_forbidden_absent").status, "BLOCKED");
});

test("deriveQualityIndexRecommendations maps INDEXABLE_VERIFIED to buy-ready", () => {
  const rec = deriveQualityIndexRecommendations({
    classification: "INDEXABLE_VERIFIED",
    verified_buy_link_count: 2,
  });
  assert.equal(rec.publication_authorized, true);
  assert.equal(rec.recommended_page_state, PAGE_STATES.INDEXABLE_BUY_READY);
  assert.equal(rec.recommended_robots.index, true);
});

test("classifyPageQualityV1 treats clone NEEDS_TARGET_EVIDENCE as NOINDEX_REVIEW", () => {
  const classification = classifyPageQualityV1({
    gates: [
      {
        gate_id: "model_existence_confirmed",
        status: "WARN",
        blockers: [],
        proof_paths_read: [],
      },
      {
        gate_id: "model_specific_evidence",
        status: "WARN",
        blockers: [],
        proof_paths_read: [],
      },
    ],
    clone_status: "NEEDS_TARGET_EVIDENCE",
    verified_buy_link_count: 0,
  });
  assert.equal(classification, "NOINDEX_REVIEW");
});

test("write artifacts under allowed paths only", async () => {
  const report = await buildPageQualityGateReportV1({
    rootDir: ROOT,
    fridgeSlug: "samsung-rf28r7351sr",
  });
  const sandbox = mkdtempSync(path.join(tmpdir(), "page-quality-gate-write-"));
  try {
    const paths = writePageQualityGateArtifactsV1({ rootDir: sandbox, report });
    assert.ok(existsSync(path.join(sandbox, paths.jsonRelPath)));
    assert.ok(existsSync(path.join(sandbox, paths.mdRelPath)));
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});

test("batch mode rollup from manifest", async () => {
  const manifestRel =
    "data/fridge/batch-production/page-factory/evidence-clone-batch-v1/haf-qin-fixture-v1-manifest-v1.json";
  const manifestAbs = path.join(ROOT, manifestRel);
  mkdirSync(path.dirname(manifestAbs), { recursive: true });
  writeFileSync(
    manifestAbs,
    `${JSON.stringify(
      {
        batch_id: "haf-qin-fixture-v1",
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

  try {
    const batch = await buildPageQualityGateBatchReportV1({
      rootDir: ROOT,
      batchId: "haf-qin-fixture-v1",
    });

    assert.equal(batch.pair_reports.length, 3);
    assert.equal(
      batch.inspect_summary.quality_classification_counts.INDEXABLE_NO_BUY_LINK,
      1,
    );
    assert.equal(batch.inspect_summary.quality_classification_counts.NOINDEX_REVIEW, 1);
    assert.equal(batch.inspect_summary.quality_classification_counts.BLOCKED, 1);
  } finally {
    rmSync(manifestAbs, { force: true });
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

  for (const allowed of PAGE_QUALITY_GATE_ALLOWED_WRITE_REL_PATHS_V1) {
    assert.ok(LIB_SOURCE.includes(allowed.replace("*", "")) || LIB_SOURCE.includes("quality-gate-v1"));
  }
});
