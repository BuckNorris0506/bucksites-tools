import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  ALL_PRODUCT_SAFE_BUYER_PATH_CENSUS_CONTRACT_V1,
  buildAllProductSafeBuyerPathCensusV1,
} from "./all-product-safe-buyer-path-census-v1";
import { HOMEKEEP_WEDGE_CATALOG } from "@/lib/catalog/identity";

const REPO_ROOT = process.cwd();

test("census contract and read-only flags", () => {
  const report = buildAllProductSafeBuyerPathCensusV1({ rootDir: REPO_ROOT });
  assert.equal(report.contract, ALL_PRODUCT_SAFE_BUYER_PATH_CENSUS_CONTRACT_V1);
  assert.equal(report.read_only, true);
  assert.equal(report.data_mutation, false);
  assert.equal(report.mutation_authorized, false);
  for (const row of report.products) {
    assert.equal(row.mutation_authorized, false);
  }
});

test("census includes refrigerator and air purifier committed inventory", () => {
  const report = buildAllProductSafeBuyerPathCensusV1({ rootDir: REPO_ROOT });
  const fridge = report.wedge_coverage.find((w) => w.wedge === HOMEKEEP_WEDGE_CATALOG.refrigerator_water);
  const ap = report.wedge_coverage.find((w) => w.wedge === HOMEKEEP_WEDGE_CATALOG.air_purifier);
  assert.ok(fridge);
  assert.ok(ap);
  assert.equal(fridge?.csv_inventory_source, "committed_csv");
  assert.equal(ap?.csv_inventory_source, "committed_csv");
  assert.ok((fridge?.product_page_count ?? 0) > 0);
  assert.ok((ap?.product_page_count ?? 0) > 0);
});

test("sample-csv wedges excluded from product rows", () => {
  const report = buildAllProductSafeBuyerPathCensusV1({ rootDir: REPO_ROOT });
  const vacuum = report.wedge_coverage.find((w) => w.wedge === HOMEKEEP_WEDGE_CATALOG.vacuum);
  assert.equal(vacuum?.csv_inventory_source, "sample_csv_only");
  assert.ok(!report.products.some((p) => p.wedge === HOMEKEEP_WEDGE_CATALOG.vacuum));
});

test("whole-house-water products labeled NOINDEX_UNPROVEN", () => {
  const report = buildAllProductSafeBuyerPathCensusV1({ rootDir: REPO_ROOT });
  const whwRows = report.products.filter((p) => p.wedge === HOMEKEEP_WEDGE_CATALOG.whole_house_water);
  assert.ok(whwRows.length > 0);
  assert.ok(whwRows.every((p) => p.page_classification === "NOINDEX_UNPROVEN"));
  assert.equal(whwRows[0]?.vertical_launch_state, "NOINDEX_UNPROVEN");
});

test("top rescue queue only includes suppressed or noindex products", () => {
  const report = buildAllProductSafeBuyerPathCensusV1({ rootDir: REPO_ROOT });
  assert.ok(report.top_20_rescue_queue.length > 0);
  for (const row of report.top_20_rescue_queue) {
    assert.ok(
      row.page_classification === "SAFE_BUYER_PATH_SUPPRESSED_TRUST" ||
        row.page_classification === "NOINDEX_UNPROVEN",
    );
    assert.ok(row.recommended_next_safe_action.length > 0);
  }
});

test("census does not mutate protected CSV paths", () => {
  const csvBefore = readFileSync(path.join(REPO_ROOT, "data/retailer_links.csv"), "utf8");
  buildAllProductSafeBuyerPathCensusV1({ rootDir: REPO_ROOT });
  assert.equal(readFileSync(path.join(REPO_ROOT, "data/retailer_links.csv"), "utf8"), csvBefore);
});

test("Command Center wiring includes census lane import", () => {
  const cc = readFileSync(path.join(REPO_ROOT, "scripts/report-buckparts-command-center.ts"), "utf8");
  assert.ok(cc.includes("all_product_safe_buyer_path_census_v1"));
  assert.ok(cc.includes("buildAllProductSafeBuyerPathCensusV1Report"));
});

test("package script exists for standalone census", () => {
  const pkg = JSON.parse(readFileSync(path.join(REPO_ROOT, "package.json"), "utf8")) as {
    scripts: Record<string, string>;
  };
  assert.ok(pkg.scripts["buckparts:all-product-safe-buyer-path-census"]);
});
