import assert from "node:assert/strict";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import { HOMEKEEP_WEDGE_CATALOG } from "@/lib/catalog/identity";

import {
  buildPublicWedgeReadinessAndEasiestWinsV1,
  computeEasiestTruthfulWinScore,
  computePublicOpeningRecommendation,
  PUBLIC_WEDGE_READINESS_AND_EASIEST_WINS_CONTRACT_V1,
} from "./public-wedge-readiness-and-easiest-wins-v1";

const REPO_ROOT = process.cwd();

test("report is read_only with data_mutation false", () => {
  const report = buildPublicWedgeReadinessAndEasiestWinsV1({ rootDir: REPO_ROOT });
  assert.equal(report.contract, PUBLIC_WEDGE_READINESS_AND_EASIEST_WINS_CONTRACT_V1);
  assert.equal(report.read_only, true);
  assert.equal(report.data_mutation, false);
});

test("report does not mutate product CSVs, Supabase, or public UI paths", () => {
  const watchPaths = [
    "data/retailer_links.csv",
    "data/air-purifier/retailer_links.csv",
    "src/app/air-purifier/page.tsx",
  ];
  const before = new Map(watchPaths.map((p) => [p, readFileSync(path.join(REPO_ROOT, p), "utf8")]));
  buildPublicWedgeReadinessAndEasiestWinsV1({ rootDir: REPO_ROOT });
  for (const [p, content] of before.entries()) {
    assert.equal(readFileSync(path.join(REPO_ROOT, p), "utf8"), content);
  }
});

test("no wedge is OPEN_NOW without safe gated buyer-path proof", () => {
  const report = buildPublicWedgeReadinessAndEasiestWinsV1({ rootDir: REPO_ROOT });
  for (const row of report.wedge_rows) {
    if (row.public_opening_recommendation !== "OPEN_NOW_TRUTH_GATED") continue;
    if (row.wedge === HOMEKEEP_WEDGE_CATALOG.refrigerator_water) {
      assert.equal(row.currently_public_facing_status, "LIVE");
      continue;
    }
    assert.ok(
      row.linked_filters_with_safe_gated_buy_path > 0 && row.safe_cta_count > 0,
      `${row.wedge} marked OPEN_NOW without CSV safe proof`,
    );
  }
});

test("row count alone cannot create high easiest_truthful_win_score", () => {
  const highRowsOnly = computeEasiestTruthfulWinScore({
    wedge: HOMEKEEP_WEDGE_CATALOG.air_purifier,
    csvSource: "committed_csv",
    buyerPathStatus: "ZERO_SAFE_ROWS",
    linkedSafe: 0,
    linkedZeroSafe: 500,
    mappedFilterCount: 500,
    modelCount: 5000,
    publicFacing: "PREVIEW_ONLY",
    routesPresent: true,
    searchPlaceholderCount: 400,
    retailerLinkCount: 500,
  });
  assert.ok(highRowsOnly <= 25, `score ${highRowsOnly} should be capped without safe paths`);
});

test("affiliate links are second to truth in report notes", () => {
  const report = buildPublicWedgeReadinessAndEasiestWinsV1({ rootDir: REPO_ROOT });
  assert.ok(report.truth_first_notes.some((n) => /Affiliate links remain second to truth/i.test(n)));
  assert.ok(!report.recommended_next_action.toLowerCase().includes("affiliate first"));
});

test("fridge rebuild is not recommended", () => {
  const report = buildPublicWedgeReadinessAndEasiestWinsV1({ rootDir: REPO_ROOT });
  const fridge = report.wedge_rows.find((r) => r.wedge === HOMEKEEP_WEDGE_CATALOG.refrigerator_water);
  assert.ok(fridge);
  assert.ok(fridge!.reason.toLowerCase().includes("do not rebuild"));
  assert.ok(report.recommended_next_action.toLowerCase().includes("do not redo fridge"));
  assert.ok(
    report.proven_facts.some((f) => f.toLowerCase().includes("fridge rebuild") && f.toLowerCase().includes("not recommended")),
  );
});

test("air_purifier is LIVE after truth-gated public opening", () => {
  const report = buildPublicWedgeReadinessAndEasiestWinsV1({ rootDir: REPO_ROOT });
  const ap = report.wedge_rows.find((r) => r.wedge === HOMEKEEP_WEDGE_CATALOG.air_purifier);
  assert.ok(ap);
  assert.equal(ap!.currently_public_facing_status, "LIVE");
  assert.equal(ap!.public_opening_recommendation, "OPEN_NOW_TRUTH_GATED");
});

test("whole_house_water and sample wedges remain not open", () => {
  const report = buildPublicWedgeReadinessAndEasiestWinsV1({ rootDir: REPO_ROOT });
  const whw = report.wedge_rows.find((r) => r.wedge === HOMEKEEP_WEDGE_CATALOG.whole_house_water);
  assert.ok(whw);
  assert.equal(whw!.public_opening_recommendation, "NEEDS_MORE_PROOF");
  assert.equal(whw!.safe_cta_count, 2);
  assert.equal(whw!.linked_filters_with_safe_gated_buy_path, 2);
  assert.match(whw!.reason, /not sufficient WHW wedge coverage/i);
  for (const wedge of [
    HOMEKEEP_WEDGE_CATALOG.vacuum,
    HOMEKEEP_WEDGE_CATALOG.humidifier,
    HOMEKEEP_WEDGE_CATALOG.appliance_air,
  ]) {
    const row = report.wedge_rows.find((r) => r.wedge === wedge);
    assert.ok(row);
    assert.equal(row!.public_opening_recommendation, "DO_NOT_OPEN_YET");
  }
});

test("AP data boundary still uses filterRealBuyRetailerLinks after public opening", () => {
  const src = readFileSync(
    path.join(REPO_ROOT, "src/lib/data/air-purifier/filters.ts"),
    "utf8",
  );
  assert.match(src, /filterRealBuyRetailerLinks/);
  assert.match(src, /retailer_links:\s*filterRealBuyRetailerLinks/);
});

test("KPI definitions are present and truth-based", () => {
  const report = buildPublicWedgeReadinessAndEasiestWinsV1({ rootDir: REPO_ROOT });
  assert.ok(report.kpi_definitions.proven_model_replacement_safe_buy_path_count.includes("safe gated"));
  assert.ok(report.kpi_definitions.safe_public_wedge_count.includes("not raw row counts"));
  assert.equal(typeof report.kpi_snapshot.proven_model_replacement_safe_buy_path_count, "number");
  assert.equal(typeof report.kpi_snapshot.search_placeholder_debt_count, "number");
});

test("computePublicOpeningRecommendation rejects preview wedge without safe proof", () => {
  const rec = computePublicOpeningRecommendation({
    row: {
      wedge: HOMEKEEP_WEDGE_CATALOG.whole_house_water,
      vertical_slug: "whole-house-water",
      public_routes_present: true,
      currently_public_facing_status: "PREVIEW_ONLY",
      csv_data_source: "committed_csv",
      model_count: 10,
      filter_count: 10,
      compatibility_mapping_count: 10,
      safe_cta_count: 0,
      direct_buyable_count: 0,
      search_placeholder_count: 10,
      linked_filters_with_safe_gated_buy_path: 0,
      linked_filters_with_zero_safe_buy_path: 5,
      buyer_path_truth_status: "ZERO_SAFE_ROWS",
      mapping_truth_status: "IMPLIED_ONLY",
      easiest_candidate_families_or_brands: [],
    },
  });
  assert.notEqual(rec.recommendation, "OPEN_NOW_TRUTH_GATED");
});

test("mocked CSV with safe row can recommend OPEN_NOW for preview wedge", () => {
  const tmpDir = path.join(REPO_ROOT, "tmp-public-wedge-readiness-test");
  const apDir = path.join(tmpDir, "data/air-purifier");
  const appDir = path.join(tmpDir, "src/app/air-purifier");
  mkdirSync(apDir, { recursive: true });
  mkdirSync(appDir, { recursive: true });
  writeFileSync(path.join(appDir, "page.tsx"), "export default function Page() { return null; }");
  writeFileSync(
    path.join(apDir, "models.csv"),
    "slug,brand_slug,model_number,title\nwin-test,win,100,Win\n",
  );
  writeFileSync(path.join(apDir, "filters.csv"), "slug,name\nwin-f,Filter\n");
  writeFileSync(
    path.join(apDir, "compatibility_mappings.csv"),
    "model_slug,filter_slug,is_recommended\nwin-test,win-f,true\n",
  );
  writeFileSync(
    path.join(apDir, "retailer_links.csv"),
    [
      "filter_slug,retailer_key,affiliate_url,is_primary,browser_truth_classification,browser_truth_buyable_subtype",
      "win-f,amazon,https://www.amazon.com/dp/B07,true,direct_buyable,",
    ].join("\n"),
  );

  try {
    const report = buildPublicWedgeReadinessAndEasiestWinsV1({
      rootDir: tmpDir,
      fileExists: (abs) => existsSync(abs),
      readText: (abs) => readFileSync(abs, "utf8"),
    });
    const ap = report.wedge_rows.find((r) => r.wedge === HOMEKEEP_WEDGE_CATALOG.air_purifier);
    assert.ok(ap);
    assert.equal(ap!.public_opening_recommendation, "OPEN_NOW_TRUTH_GATED");
    assert.equal(ap!.safe_cta_count, 1);
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
});
