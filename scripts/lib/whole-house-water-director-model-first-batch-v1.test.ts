import assert from "node:assert/strict";
import { existsSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import { getVerticalLaunchState } from "@/lib/catalog/vertical-launch-state";
import { isManufacturerSiteSearchUrl } from "@/lib/retailers/launch-buy-links";
import { buildWholeHouseWaterBatchProductionDirectorV1 } from "./whole-house-water-batch-production-director-v1";
import {
  WHW_DIRECTOR_MODEL_FIRST_BATCH_CONTRACT_V1,
  WHW_DIRECTOR_MODEL_FIRST_BATCH_V1_RESULT_REL_V1,
  buildWholeHouseWaterDirectorModelFirstBatchV1,
  directorModelFirstBatchParkedFilterSlugsV1,
  loadWhwDirectorModelFirstBatchV1,
  loadWhwRepoContextV1,
  mappingStatsForFilterV1,
  selectDirectorModelFirstBatchItemsV1,
  writeWholeHouseWaterDirectorModelFirstBatchV1,
} from "./whole-house-water-director-model-first-batch-v1";
import { loadWhwModelFirstEvidenceResultV1 } from "./whole-house-water-model-first-evidence-result-v1";

const REPO_ROOT = process.cwd();

const BATCH_ARTIFACT_ABS = path.join(
  REPO_ROOT,
  WHW_DIRECTOR_MODEL_FIRST_BATCH_V1_RESULT_REL_V1,
);

test.before(() => {
  rmSync(BATCH_ARTIFACT_ABS, { force: true });
});

test.after(() => {
  rmSync(BATCH_ARTIFACT_ABS, { force: true });
});

const EXPECTED_ACTIVE_SLUGS = [
  "3m-ap910r",
  "3m-ap917hd-s",
  "culligan-cw5-bb",
  "ge-fxhsc",
  "ge-fxwpc",
  "pentek-dgd-5005",
  "pentek-p5-slim",
  "springwell-cf1-sediment",
  "watts-w50pehd",
  "whirlpool-whkf-gd05",
];

const FORBIDDEN_MUTATION_PATHS = [
  "data/whole-house-water/retailer_links.csv",
  "src/lib/catalog/vertical-launch-state.ts",
];

test("report is read_only and data_mutation false", () => {
  const report = buildWholeHouseWaterDirectorModelFirstBatchV1({ rootDir: REPO_ROOT });
  assert.equal(report.contract, WHW_DIRECTOR_MODEL_FIRST_BATCH_CONTRACT_V1);
  assert.equal(report.read_only, true);
  assert.equal(report.data_mutation, false);
  assert.equal(report.csv_apply_authorized, false);
  assert.equal(report.supabase_update_authorized, false);
  assert.equal(report.whw_public_opening_authorized, false);
});

test("batch processes multiple director MODEL_FIRST_READY filters not AP910R-only", () => {
  const director = buildWholeHouseWaterBatchProductionDirectorV1({ rootDir: REPO_ROOT });
  const active = selectDirectorModelFirstBatchItemsV1(director);
  assert.equal(active.length, 10);
  const slugs = active.map((item) => item.filter_slug).sort();
  assert.deepEqual(slugs, [...EXPECTED_ACTIVE_SLUGS].sort());

  const report = buildWholeHouseWaterDirectorModelFirstBatchV1({ rootDir: REPO_ROOT, director });
  assert.equal(report.batch_size, 10);
  assert.equal(report.source_batch_head_filter_slug, "3m-ap910r");
  assert.equal(report.filters_checked.length, 10);
  assert.notEqual(
    report.filters_checked.filter((row) => row.filter_slug !== "3m-ap910r").length,
    0,
  );
});

test("PASS requires real fit evidence — no PASS from row count or search placeholders", () => {
  const report = buildWholeHouseWaterDirectorModelFirstBatchV1({ rootDir: REPO_ROOT });
  assert.equal(report.evidence_status_counts.PASS, 0);

  for (const row of report.filters_checked) {
    if (row.search_placeholder_primary) {
      assert.notEqual(row.evidence_status, "PASS");
    }
    for (const ref of row.source_refs) {
      if (ref.startsWith("http")) {
        assert.equal(isManufacturerSiteSearchUrl(ref), false);
      }
    }
  }
});

test("ge-fxhsc is BLOCKED mapping_review; other filters park UNKNOWN", () => {
  const report = buildWholeHouseWaterDirectorModelFirstBatchV1({ rootDir: REPO_ROOT });
  const fxhsc = report.filters_checked.find((row) => row.filter_slug === "ge-fxhsc");
  assert.ok(fxhsc);
  assert.equal(fxhsc!.evidence_status, "BLOCKED");
  assert.equal(fxhsc!.next_recommended_lane, "mapping_review");
  assert.equal(fxhsc!.compat_only_mapping, true);

  const unknownRows = report.filters_checked.filter((row) => row.filter_slug !== "ge-fxhsc");
  assert.equal(unknownRows.length, 9);
  for (const row of unknownRows) {
    assert.equal(row.evidence_status, "UNKNOWN");
    assert.equal(row.next_recommended_lane, "skip_for_now");
  }

  assert.equal(report.buyer_path_proof_targets.length, 0);
  assert.equal(report.parked_filter_slugs.length, 10);
});

test("WHW remains closed and no CSV Supabase or public opening authorized", () => {
  const report = buildWholeHouseWaterDirectorModelFirstBatchV1({ rootDir: REPO_ROOT });
  assert.equal(getVerticalLaunchState("whole-house-water"), "NOINDEX_UNPROVEN");
  assert.equal(report.whw_public_opening_authorized, false);
  assert.equal(report.csv_apply_authorized, false);
  assert.equal(report.supabase_update_authorized, false);
  assert.notEqual(report.supabase_update_authorized, null);
  assert.equal(report.do_not_open_public, true);
});

test("loadWhwDirectorModelFirstBatchV1 coerces null supabase_update_authorized to explicit false", () => {
  const batchAbs = path.join(REPO_ROOT, WHW_DIRECTOR_MODEL_FIRST_BATCH_V1_RESULT_REL_V1);
  const hadBatch = existsSync(batchAbs);
  const prior = hadBatch ? readFileSync(batchAbs, "utf8") : null;

  const report = buildWholeHouseWaterDirectorModelFirstBatchV1({ rootDir: REPO_ROOT });
  writeWholeHouseWaterDirectorModelFirstBatchV1({
    rootDir: REPO_ROOT,
    result: report,
    writePerFilterArtifacts: false,
  });

  const raw = JSON.parse(readFileSync(batchAbs, "utf8")) as Record<string, unknown>;
  raw.supabase_update_authorized = null;
  writeFileSync(batchAbs, `${JSON.stringify(raw, null, 2)}\n`, "utf8");

  try {
    const loaded = loadWhwDirectorModelFirstBatchV1({ rootDir: REPO_ROOT });
    assert.ok(loaded);
    assert.equal(loaded!.supabase_update_authorized, false);
    assert.notEqual(loaded!.supabase_update_authorized, null);
  } finally {
    if (prior !== null) {
      writeFileSync(batchAbs, prior, "utf8");
    } else {
      rmSync(batchAbs, { force: true });
    }
  }
});

test("--write creates batch and per-filter artifacts under agent-results-model-first-v1", () => {
  const report = buildWholeHouseWaterDirectorModelFirstBatchV1({ rootDir: REPO_ROOT });
  const batchAbs = path.join(REPO_ROOT, WHW_DIRECTOR_MODEL_FIRST_BATCH_V1_RESULT_REL_V1);
  const hadBatch = existsSync(batchAbs);

  const written = writeWholeHouseWaterDirectorModelFirstBatchV1({
    rootDir: REPO_ROOT,
    result: report,
    writePerFilterArtifacts: true,
  });
  assert.equal(written.batchRel, WHW_DIRECTOR_MODEL_FIRST_BATCH_V1_RESULT_REL_V1);
  assert.equal(written.perFilterRels.length, 10);

  const loaded = loadWhwDirectorModelFirstBatchV1({ rootDir: REPO_ROOT });
  assert.ok(loaded);
  assert.equal(loaded!.batch_size, 10);
  assert.equal(loaded!.director_batch_cycle_sealed, true);
  assert.equal(loaded!.supabase_update_authorized, false);
  assert.strictEqual(
    JSON.parse(readFileSync(batchAbs, "utf8")).supabase_update_authorized,
    false,
  );

  const ap910Artifact = loadWhwModelFirstEvidenceResultV1({
    rootDir: REPO_ROOT,
    relPath: written.perFilterRels.find((rel) => rel.includes("3m-ap910r"))!,
  });
  assert.ok(ap910Artifact);
  assert.equal(ap910Artifact!.recommended_csv_mutation, null);

  if (!hadBatch) rmSync(batchAbs, { force: true });
  for (const rel of written.perFilterRels) {
    rmSync(path.join(REPO_ROOT, rel), { force: true });
  }
});

test("director excludes parked filters after committed director batch artifact exists", () => {
  const report = buildWholeHouseWaterDirectorModelFirstBatchV1({ rootDir: REPO_ROOT });
  const batchAbs = path.join(REPO_ROOT, WHW_DIRECTOR_MODEL_FIRST_BATCH_V1_RESULT_REL_V1);
  const hadBatch = existsSync(batchAbs);

  writeWholeHouseWaterDirectorModelFirstBatchV1({
    rootDir: REPO_ROOT,
    result: report,
    writePerFilterArtifacts: false,
  });

  try {
    const parked = directorModelFirstBatchParkedFilterSlugsV1({ rootDir: REPO_ROOT });
    assert.equal(parked.size, 10);
    assert.ok(parked.has("3m-ap910r"));

    const directorAfter = buildWholeHouseWaterBatchProductionDirectorV1({ rootDir: REPO_ROOT });
    const activeSlugs = directorAfter.inspect_summary.active_filter_slugs;
    assert.equal(activeSlugs.includes("3m-ap910r"), false);
    assert.equal(activeSlugs.length, 0);
    assert.equal(directorAfter.current_batch_head, null);
  } finally {
    if (!hadBatch) rmSync(batchAbs, { force: true });
  }
});

test("read-only build does not mutate forbidden paths", () => {
  const before = new Map(
    FORBIDDEN_MUTATION_PATHS.map((p) => [p, readFileSync(path.join(REPO_ROOT, p), "utf8")]),
  );
  const mtimesBefore = new Map(
    FORBIDDEN_MUTATION_PATHS.map((p) => [p, statSync(path.join(REPO_ROOT, p)).mtimeMs]),
  );

  buildWholeHouseWaterDirectorModelFirstBatchV1({ rootDir: REPO_ROOT });

  for (const [p, content] of before) {
    assert.equal(readFileSync(path.join(REPO_ROOT, p), "utf8"), content);
    assert.equal(statSync(path.join(REPO_ROOT, p)).mtimeMs, mtimesBefore.get(p));
  }
});

test("mappingStatsForFilterV1 reflects committed CSV", () => {
  const repo = loadWhwRepoContextV1(REPO_ROOT);
  const ap910 = mappingStatsForFilterV1(repo, "3m-ap910r");
  assert.ok(ap910.recommended.includes("3m-aquapure-ap903"));
  const fxhsc = mappingStatsForFilterV1(repo, "ge-fxhsc");
  assert.equal(fxhsc.recommended.length, 0);
  assert.equal(fxhsc.compatOnly, true);
});
