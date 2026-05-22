import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

import {
  buildWaterdropCatalogIntelligenceReport,
  feedContainsRpwfeRelatedTokens,
  loadWaterdropCatalogInput,
  shouldBlockRpwfeCrossFamilyMatch,
  WATERDROP_CATALOG_INTELLIGENCE_REPORT_NAME,
} from "./lib/waterdrop-catalog-intelligence-v1";
import { WATERDROP_RAKUTEN_OPERATOR_INPUT_CONTRACT_V1 } from "../src/lib/retailers/waterdrop-operator-input-v1";

const REPO_ROOT = path.resolve(path.join(path.dirname(fileURLToPath(import.meta.url)), ".."));

function writeFixtureInput(
  dir: string,
  entries: Record<string, unknown>[],
): string {
  const file = path.join(dir, "waterdrop-fixture.json");
  writeFileSync(
    file,
    JSON.stringify(
      {
        contract: WATERDROP_RAKUTEN_OPERATOR_INPUT_CONTRACT_V1,
        entries,
      },
      null,
      2,
    ),
    "utf8",
  );
  return file;
}

const DA29_AFFILIATE =
  "https://click.linksynergy.com/link?id=GTFBcFcCW48&offerid=1888875.539508551730292149506115&type=2&murl=https%3a%2f%2fwww.waterdropfilter.com%2fproducts%2fwaterdrop-replacement-for-samsung-da29-00020b-fridge-water-filter%3fvariant%3d33108474495058";

const LT800P_AFFILIATE =
  "https://click.linksynergy.com/link?id=GTFBcFcCW48&offerid=1888875.539507420827021633352815&type=15&murl=https%3A%2F%2Fwww.waterdropfilter.com%2Fproducts%2Fwaterdrop-replacement-for-lg-lt800p-refrigerator-water-filter%3Fvariant%3D39389060792402";

const UKF8001_AFFILIATE =
  "https://click.linksynergy.com/link?id=GTFBcFcCW48&offerid=1888875.539504086758822420944441&type=15&murl=https%3A%2F%2Fwww.waterdropfilter.com%2Fproducts%2Fwaterdrop-replacement-for-whirlpool-everydrop-filter-4-ukf8001%3Fvariant%3D32984277844050";

describe("report-waterdrop-catalog-intelligence-v1", () => {
  it("parses ProductSearch-like fixture and maps DA29-00020B, LT800P, UKF8001", () => {
    const tmp = mkdtempSync(path.join(tmpdir(), "wd-catalog-"));
    const fixturePath = writeFixtureInput(tmp, [
      {
        id: "rakuten-da29",
        affiliate_url: DA29_AFFILIATE,
        visible_title: "Waterdrop WDP-F27 Replacement for Samsung DA29-00020B Fridge Water Filter",
        image_url: null,
        metadata: { sku: "33108474495058", linkid: "539508551730292149506115" },
      },
      {
        id: "rakuten-lt800p",
        affiliate_url: LT800P_AFFILIATE,
        visible_title: "Waterdrop Replacement for LG LT800P Refrigerator Water Filter",
        image_url: null,
        metadata: { sku: "39389060792402", linkid: "539507420827021633352815" },
      },
      {
        id: "rakuten-ukf8001",
        affiliate_url: UKF8001_AFFILIATE,
        visible_title: "Waterdrop Replacement for Whirlpool UKF8001 EveryDrop Filter 4",
        image_url: null,
        metadata: { sku: "32984277844050", linkid: "539504086758822420944441" },
      },
    ]);

    const loaded = loadWaterdropCatalogInput({
      absolutePath: fixturePath,
      relativePath: path.relative(REPO_ROOT, fixturePath),
      isSample: false,
    });
    const report = buildWaterdropCatalogIntelligenceReport({
      rootDir: REPO_ROOT,
      resolved: loaded,
    });

    assert.equal(report.report_name, WATERDROP_CATALOG_INTELLIGENCE_REPORT_NAME);
    assert.equal(report.read_only, true);
    assert.equal(report.data_mutation, false);
    assert.equal(report.source_status, "PROVEN");
    assert.equal(report.product_count, 3);
    assert.equal(report.mapped_count, 3);
    assert.ok(report.by_slug["da29-00020b"]);
    assert.ok(report.by_slug["lt800p"]);
    assert.ok(report.by_slug["ukf8001"]);
    assert.equal(report.exact_match_count, 3);
    assert.equal(report.unique_mapped_slug_count, 3);
    assert.equal(report.review_queue[0]?.recommended_route_label, "Compatible replacement");
    assert.equal(report.review_queue[0]?.is_official_oem, false);
  });

  it("RPWFE-negative fixture returns PROVEN_ABSENT when tokens absent", () => {
    const tmp = mkdtempSync(path.join(tmpdir(), "wd-catalog-"));
    const fixturePath = writeFixtureInput(tmp, [
      {
        id: "rakuten-da29-only",
        affiliate_url: DA29_AFFILIATE,
        visible_title: "Waterdrop DA29-00020B Fridge Water Filter",
        image_url: null,
      },
    ]);

    const loaded = loadWaterdropCatalogInput({
      absolutePath: fixturePath,
      relativePath: "fixture.json",
      isSample: false,
    });
    const report = buildWaterdropCatalogIntelligenceReport({
      rootDir: REPO_ROOT,
      resolved: loaded,
    });

    assert.equal(report.rpwfe_status.status, "PROVEN_ABSENT");
    assert.equal(report.rpwfe_status.present_in_feed, false);
    assert.equal(report.rpwfe_status.mapped_slug, null);
    assert.equal(feedContainsRpwfeRelatedTokens(loaded.input!.entries), false);
  });

  it("XWFE primary title maps to xwfe, not rpwfe", () => {
    const tmp = mkdtempSync(path.join(tmpdir(), "wd-catalog-"));
    const xwfeUrl =
      "https://click.linksynergy.com/link?id=GTFBcFcCW48&offerid=1888875.539599999999999999999999&type=15&murl=https%3A%2F%2Fwww.waterdropfilter.com%2Fproducts%2Fwaterdrop-replacement-for-ge-xwfe-refrigerator-water-filter%3Fvariant%3D123";
    const fixturePath = writeFixtureInput(tmp, [
      {
        id: "rakuten-xwfe",
        affiliate_url: xwfeUrl,
        visible_title: "Waterdrop Replacement for GE XWFE Refrigerator Water Filter",
        image_url: null,
      },
    ]);

    const loaded = loadWaterdropCatalogInput({
      absolutePath: fixturePath,
      relativePath: "fixture.json",
      isSample: false,
    });
    const report = buildWaterdropCatalogIntelligenceReport({
      rootDir: REPO_ROOT,
      resolved: loaded,
    });

    assert.ok(report.by_slug["xwfe"]);
    assert.equal(report.by_slug["rpwfe"], undefined);
    assert.equal(
      shouldBlockRpwfeCrossFamilyMatch(
        "Waterdrop GE XWFE filter also mentions RPWFE in fine print",
        "rpwfe",
        "XWFE",
      ),
      true,
    );
  });

  it("MWF/MWFP cross-family block does not assign rpwfe slug", () => {
    const tmp = mkdtempSync(path.join(tmpdir(), "wd-catalog-"));
    const mwfUrl =
      "https://click.linksynergy.com/link?id=GTFBcFcCW48&offerid=1888875.539588888888888888888888&type=15&murl=https%3A%2F%2Fwww.waterdropfilter.com%2Fproducts%2Fwaterdrop-mwf-refrigerator-water-filter%3Fvariant%3D456";
    const fixturePath = writeFixtureInput(tmp, [
      {
        id: "rakuten-mwf",
        affiliate_url: mwfUrl,
        visible_title: "Waterdrop Replacement for GE MWF SmartWater Refrigerator Filter",
        image_url: null,
      },
    ]);

    const loaded = loadWaterdropCatalogInput({
      absolutePath: fixturePath,
      relativePath: "fixture.json",
      isSample: false,
    });
    const report = buildWaterdropCatalogIntelligenceReport({
      rootDir: REPO_ROOT,
      resolved: loaded,
    });

    assert.ok(report.by_slug["mwf"]);
    assert.equal(report.by_slug["rpwfe"], undefined);
  });

  it("report shape is stable and includes required top-level keys", () => {
    const tmp = mkdtempSync(path.join(tmpdir(), "wd-catalog-"));
    const fixturePath = writeFixtureInput(tmp, [
      {
        id: "rakuten-ukf8001",
        affiliate_url: UKF8001_AFFILIATE,
        visible_title: "Waterdrop UKF8001 filter",
        image_url: null,
      },
    ]);

    const loaded = loadWaterdropCatalogInput({
      absolutePath: fixturePath,
      relativePath: "fixture.json",
      isSample: false,
    });
    const report = buildWaterdropCatalogIntelligenceReport({
      rootDir: REPO_ROOT,
      resolved: loaded,
      reviewQueueLimit: 5,
    });

    const required = [
      "report_name",
      "generated_at",
      "source_path",
      "source_status",
      "source_contract",
      "product_count",
      "mapped_count",
      "unmapped_count",
      "unique_mapped_slug_count",
      "exact_match_count",
      "alias_match_count",
      "rpwfe_status",
      "proof_slice_status",
      "by_slug",
      "review_queue",
      "blocked_examples",
      "notes",
    ];
    for (const key of required) {
      assert.ok(key in report, `missing key: ${key}`);
    }
    assert.equal(report.review_queue.length, 1);
    assert.equal(report.review_queue[0]?.rank, 1);
  });

  it("does not mutate production CSV files", () => {
    const filtersBefore = readFileSync(path.join(REPO_ROOT, "data/filters.csv"), "utf8");
    const aliasesBefore = readFileSync(path.join(REPO_ROOT, "data/filter_aliases.csv"), "utf8");
    const retailerBefore = readFileSync(path.join(REPO_ROOT, "data/retailer_links.csv"), "utf8");

    const tmp = mkdtempSync(path.join(tmpdir(), "wd-catalog-"));
    const fixturePath = writeFixtureInput(tmp, [
      {
        id: "rakuten-da29",
        affiliate_url: DA29_AFFILIATE,
        visible_title: "Waterdrop DA29-00020B",
        image_url: null,
      },
    ]);
    buildWaterdropCatalogIntelligenceReport({
      rootDir: REPO_ROOT,
      resolved: loadWaterdropCatalogInput({
        absolutePath: fixturePath,
        relativePath: "fixture.json",
        isSample: false,
      }),
    });

    assert.equal(readFileSync(path.join(REPO_ROOT, "data/filters.csv"), "utf8"), filtersBefore);
    assert.equal(readFileSync(path.join(REPO_ROOT, "data/filter_aliases.csv"), "utf8"), aliasesBefore);
    assert.equal(readFileSync(path.join(REPO_ROOT, "data/retailer_links.csv"), "utf8"), retailerBefore);
  });
});
