import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
  buildLargeBatchCoverageFactoryReportV1,
  classifyLargeBatchCandidateV1,
  LARGE_BATCH_COVERAGE_FACTORY_STATES_V1,
} from "@/lib/coverage/large-batch-coverage-factory-v1";
import {
  FRIDGE_HOMEKEEP_BULK_EXPANSION_DEMOTED_V1,
  FRIDGE_HOMEKEEP_BULK_EXPANSION_ONLY_V1,
  listFridgeHomekeepBulkFilterRowsV1,
} from "@/lib/coverage/fridge-homekeep-bulk-catalog-v1";
import { loadBuckpartsFridgeFilterIndexFromRepo } from "@/lib/retailers/buckparts-fridge-filter-index-v1";
import { buyLinkGateFailureKind } from "@/lib/retailers/launch-buy-links";

const REPO_ROOT = process.cwd();

function writeMinimalFixtureRoot(args: {
  filtersCsv: string;
  aliasesCsv?: string;
  retailerLinksCsv?: string;
  waterdropJson?: string;
}): string {
  const root = mkdtempSync(path.join(tmpdir(), "lbcf-fixture-"));
  mkdirSync(path.join(root, "data"), { recursive: true });
  mkdirSync(path.join(root, "data/evidence"), { recursive: true });
  mkdirSync(path.join(root, "data/ops"), { recursive: true });
  mkdirSync(path.join(root, "data/waterdrop/operator-input"), { recursive: true });
  writeFileSync(path.join(root, "data/filters.csv"), args.filtersCsv, "utf8");
  if (args.aliasesCsv) {
    writeFileSync(path.join(root, "data/filter_aliases.csv"), args.aliasesCsv, "utf8");
  }
  if (args.retailerLinksCsv) {
    writeFileSync(path.join(root, "data/retailer_links.csv"), args.retailerLinksCsv, "utf8");
  }
  if (args.waterdropJson) {
    writeFileSync(
      path.join(root, "data/waterdrop/operator-input/waterdrop-rakuten-links.v1.json"),
      args.waterdropJson,
      "utf8",
    );
  }
  writeFileSync(
    path.join(root, "data/ops/amazon-rescue-token-controls.json"),
    JSON.stringify({ entries: [] }),
    "utf8",
  );
  return root;
}

test("existing live slug classifies as existing_live_product when no stronger signal", () => {
  const root = writeMinimalFixtureRoot({
    filtersCsv:
      "brand_slug,slug,oem_part_number,name,replacement_interval_months,notes\nlg,lt800p,LT800P,Test filter,6,\n",
    aliasesCsv: "filter_slug,alias\n",
    retailerLinksCsv:
      "filter_slug,retailer_name,affiliate_url,is_primary,sort_order,retailer_key,browser_truth_classification,browser_truth_buyable_subtype\nlt800p,Waterdrop,https://www.waterdropfilter.com/products/lt800p,true,0,waterdrop,direct_buyable,COMPATIBLE_REPLACEMENT_DIRECT_BUYABLE\n",
  });
  const report = buildLargeBatchCoverageFactoryReportV1({
    rootDir: root,
    topCandidatesLimit: 10,
    listBulkRows: () => [],
  });
  const row = report.top_candidates.find((c) => c.slug === "lt800p");
  assert.ok(row);
  assert.equal(row!.factory_state, "existing_live_product");
  assert.equal(row!.is_live_catalog_row, true);
});

test("bulk-only token classifies as new_product_candidate", () => {
  const root = writeMinimalFixtureRoot({
    filtersCsv: "brand_slug,slug,oem_part_number,name,replacement_interval_months,notes\n",
    aliasesCsv: "filter_slug,alias\n",
  });
  const report = buildLargeBatchCoverageFactoryReportV1({
    rootDir: root,
    topCandidatesLimit: 50,
    listBulkRows: () => [
      {
        brand_slug: "lg",
        slug: "lt700p",
        oem_part_number: "LT700P",
        name: "LG LT700P",
      },
    ],
  });
  const row = report.top_candidates.find((c) => c.slug === "lt700p");
  assert.ok(row);
  assert.equal(row!.factory_state, "new_product_candidate");
  assert.equal(row!.is_bulk_catalog_row, true);
  assert.equal(row!.is_live_catalog_row, false);
});

test("alias collision classifies as alias_collision_candidate", () => {
  const root = writeMinimalFixtureRoot({
    filtersCsv:
      "brand_slug,slug,oem_part_number,name,replacement_interval_months,notes\nlg,lt1000p,LT1000P,Filter A,6,\nlg,lt1000pc,LT1000PC,Filter B,6,\n",
    aliasesCsv: "filter_slug,alias\nlt1000p,LT1000PC\nlt1000pc,LT1000PC\n",
  });
  const report = buildLargeBatchCoverageFactoryReportV1({
    rootDir: root,
    topCandidatesLimit: 50,
    listBulkRows: () => [],
  });
  const collisionRows = report.top_candidates.filter(
    (c) => c.factory_state === "alias_collision_candidate",
  );
  assert.ok(collisionRows.length >= 1);
});

test("Waterdrop candidate when operator source present", () => {
  const da29Affiliate =
    "https://click.linksynergy.com/link?id=GTFBcFcCW48&offerid=1888875.539508551730292149506115&type=2&murl=https%3a%2f%2fwww.waterdropfilter.com%2fproducts%2fwaterdrop-replacement-for-samsung-da29-00003g-fridge-water-filter%3fvariant%3d1";
  const root = writeMinimalFixtureRoot({
    filtersCsv:
      "brand_slug,slug,oem_part_number,name,replacement_interval_months,notes\nsamsung,da29-00003g,DA29-00003G,Test,6,\n",
    aliasesCsv: "filter_slug,alias\n",
    waterdropJson: JSON.stringify({
      contract: "waterdrop_rakuten_operator_input_v1",
      entries: [
        {
          id: "da29-00003g-fixture",
          affiliate_url: da29Affiliate,
          visible_title: "Waterdrop Replacement for Samsung DA29-00003G",
        },
      ],
    }),
  });
  const report = buildLargeBatchCoverageFactoryReportV1({
    rootDir: root,
    topCandidatesLimit: 50,
    listBulkRows: () => [],
  });
  assert.equal(report.source_summary.waterdrop_operator_input.status, "PROVEN");
  const row = report.top_candidates.find((c) => c.slug === "da29-00003g");
  assert.ok(row);
  assert.equal(row!.factory_state, "publishable_waterdrop_candidate");
});

test("missing Waterdrop operator input degrades gracefully", () => {
  const root = writeMinimalFixtureRoot({
    filtersCsv: "brand_slug,slug,oem_part_number,name,replacement_interval_months,notes\nlg,lt800p,LT800P,Test,6,\n",
    aliasesCsv: "filter_slug,alias\n",
  });
  const report = buildLargeBatchCoverageFactoryReportV1({
    rootDir: root,
    topCandidatesLimit: 10,
    waterdropOperatorInputPath: null,
    listBulkRows: () => [],
  });
  assert.equal(report.source_summary.waterdrop_operator_input.status, "UNKNOWN");
  assert.equal(report.source_summary.waterdrop_operator_input.entry_count, 0);
});

test("search-placeholder-only does not classify as amazon or waterdrop buy-ready", () => {
  const classified = classifyLargeBatchCandidateV1({
    slug: "lt1000p",
    oem_part_number: "LT1000P",
    brand_slug: "lg",
    is_live: true,
    is_bulk: false,
    alias_collision: false,
    links: [
      {
        filter_slug: "lt1000p",
        retailer_key: "oem-parts-catalog",
        affiliate_url: "https://www.repairclinic.com/Search?SearchTerm=LT1000P",
        browser_truth_classification: null,
        browser_truth_buyable_subtype: null,
      },
    ],
    waterdrop: null,
    amazon_control: null,
    evidence_filenames: [],
  });
  assert.notEqual(classified.factory_state, "publishable_amazon_candidate");
  assert.notEqual(classified.factory_state, "publishable_waterdrop_candidate");
  assert.equal(classified.factory_state, "publishable_no_buy_page");
  assert.equal(
    buyLinkGateFailureKind({
      retailer_key: "oem-parts-catalog",
      affiliate_url: "https://www.repairclinic.com/Search?SearchTerm=LT1000P",
      browser_truth_classification: null,
      browser_truth_buyable_subtype: null,
    }),
    "search_placeholder",
  );
});

test("report is read_only and data_mutation false", () => {
  const report = buildLargeBatchCoverageFactoryReportV1({
    rootDir: REPO_ROOT,
    topCandidatesLimit: 5,
  });
  assert.equal(report.read_only, true);
  assert.equal(report.data_mutation, false);
  assert.equal(report.report_name, "buckparts_large_batch_coverage_factory_v1");
});

test("state_counts are deterministic for fixed fixture", () => {
  const root = writeMinimalFixtureRoot({
    filtersCsv:
      "brand_slug,slug,oem_part_number,name,replacement_interval_months,notes\nlg,da29-00020b,DA29-00020B,Live,6,\n",
    aliasesCsv: "filter_slug,alias\n",
  });
  const deps = {
    rootDir: root,
    now: () => new Date("2026-05-18T12:00:00.000Z"),
    topCandidatesLimit: 100,
    listBulkRows: () => [
      { brand_slug: "lg", slug: "lt700p", oem_part_number: "LT700P", name: "Bulk only" },
    ],
  };
  const a = buildLargeBatchCoverageFactoryReportV1(deps);
  const b = buildLargeBatchCoverageFactoryReportV1(deps);
  assert.deepEqual(a.state_counts, b.state_counts);
  const sum = Object.values(a.state_counts).reduce((n, v) => n + v, 0);
  assert.equal(sum, a.candidate_count);
  for (const state of LARGE_BATCH_COVERAGE_FACTORY_STATES_V1) {
    assert.equal(typeof a.state_counts[state], "number");
  }
});

test("top_candidates respects --limit while candidate_count is full set", () => {
  const root = writeMinimalFixtureRoot({
    filtersCsv: "brand_slug,slug,oem_part_number,name,replacement_interval_months,notes\n",
    aliasesCsv: "filter_slug,alias\n",
  });
  const report = buildLargeBatchCoverageFactoryReportV1({
    rootDir: root,
    topCandidatesLimit: 2,
    listBulkRows: () => [
      { brand_slug: "lg", slug: "lt1000p", oem_part_number: "LT1000P", name: "A" },
      { brand_slug: "lg", slug: "lt700p", oem_part_number: "LT700P", name: "B" },
      { brand_slug: "lg", slug: "lt600p", oem_part_number: "LT600P", name: "C" },
    ],
  });
  assert.equal(report.top_candidates.length, 2);
  assert.equal(report.candidate_count, 3);
  assert.equal(report.top_candidates_limit, 2);
});

test("full repo report builds without Supabase", () => {
  const report = buildLargeBatchCoverageFactoryReportV1({
    rootDir: REPO_ROOT,
    topCandidatesLimit: 5,
  });
  assert.ok(report.candidate_count > 50);
  assert.ok(report.top_candidates.length === 5);
});

test("bulk expansion slugs are absent from committed data/filters.csv", () => {
  const liveSlugs = new Set(
    loadBuckpartsFridgeFilterIndexFromRepo(REPO_ROOT).filters.map((f) => f.slug),
  );
  for (const row of FRIDGE_HOMEKEEP_BULK_EXPANSION_ONLY_V1) {
    assert.equal(liveSlugs.has(row.slug), false, `expected ${row.slug} not in live catalog`);
  }
});

const FIRST_FRIDGE_EXPANSION_DEMOTED_SLUGS_V1 = [
  "4396702",
  "edr5rxd1",
  "adq73613404",
  "da29-00003b",
  "da97-15217b",
] as const;

test("lt120f is excluded from refrigerator-water bulk expansion (wrong-wedge air filter)", () => {
  assert.ok(
    !FRIDGE_HOMEKEEP_BULK_EXPANSION_ONLY_V1.some((r) => r.slug === "lt120f"),
    "lt120f must not be in FRIDGE_HOMEKEEP_BULK_EXPANSION_ONLY_V1",
  );
  assert.ok(
    FRIDGE_HOMEKEEP_BULK_EXPANSION_DEMOTED_V1.some((r) => r.slug === "lt120f"),
    "lt120f must be in demoted registry for learning history",
  );
  assert.ok(
    !listFridgeHomekeepBulkFilterRowsV1().some((r) => r.slug === "lt120f"),
    "lt120f must not appear in listFridgeHomekeepBulkFilterRowsV1",
  );
  const report = buildLargeBatchCoverageFactoryReportV1({
    rootDir: REPO_ROOT,
    topCandidatesLimit: 500,
  });
  assert.equal(
    report.top_candidates.find((c) => c.slug === "lt120f"),
    undefined,
    "factory must not surface lt120f after removal from bulk catalog",
  );
});

test("active bulk expansion queue is empty after first fridge evidence triage", () => {
  assert.equal(FRIDGE_HOMEKEEP_BULK_EXPANSION_ONLY_V1.length, 0);
});

test("failed first fridge expansion slugs are demoted not new_product_candidate", () => {
  const liveCount = loadBuckpartsFridgeFilterIndexFromRepo(REPO_ROOT).filters.length;
  const bulkCount = listFridgeHomekeepBulkFilterRowsV1().length;
  assert.equal(bulkCount, liveCount);
  assert.equal(FRIDGE_HOMEKEEP_BULK_EXPANSION_ONLY_V1.length, 0);

  for (const slug of FIRST_FRIDGE_EXPANSION_DEMOTED_SLUGS_V1) {
    assert.ok(
      FRIDGE_HOMEKEEP_BULK_EXPANSION_DEMOTED_V1.some((r) => r.slug === slug),
      `${slug} must be in demoted registry`,
    );
    assert.ok(
      !listFridgeHomekeepBulkFilterRowsV1().some((r) => r.slug === slug),
      `${slug} must not be in active bulk row list`,
    );
  }

  const report = buildLargeBatchCoverageFactoryReportV1({
    rootDir: REPO_ROOT,
    topCandidatesLimit: 500,
  });
  assert.equal(report.candidate_count, 57);
  assert.equal(report.state_counts.new_product_candidate, 0);
  assert.equal(report.read_only, true);
  assert.equal(report.data_mutation, false);

  for (const slug of FIRST_FRIDGE_EXPANSION_DEMOTED_SLUGS_V1) {
    assert.equal(
      report.top_candidates.find((c) => c.slug === slug),
      undefined,
      `${slug} must not appear as factory candidate after demotion`,
    );
  }
});

test("risky bulk sample hafcin is not a safe publishable candidate", () => {
  const classified = classifyLargeBatchCandidateV1({
    slug: "hafcin",
    oem_part_number: "HAFCIN",
    brand_slug: "samsung",
    is_live: false,
    is_bulk: true,
    alias_collision: false,
    links: [],
    waterdrop: null,
    amazon_control: null,
    evidence_filenames: [],
  });
  assert.equal(classified.factory_state, "new_product_candidate");
  assert.equal(classified.signals.has_gated_buyable_link, false);
  assert.notEqual(classified.factory_state, "publishable_amazon_candidate");
  assert.notEqual(classified.factory_state, "publishable_waterdrop_candidate");

  const withCollision = classifyLargeBatchCandidateV1({
    slug: "hafcin",
    oem_part_number: "HAFCIN",
    brand_slug: "samsung",
    is_live: false,
    is_bulk: true,
    alias_collision: true,
    links: [],
    waterdrop: null,
    amazon_control: null,
    evidence_filenames: [],
  });
  assert.equal(withCollision.factory_state, "alias_collision_candidate");
});

test("rejected bulk sample rows are blocked or not buy-ready publishable", () => {
  const fpuresource3 = classifyLargeBatchCandidateV1({
    slug: "fpuresource3",
    oem_part_number: "WF3CB",
    brand_slug: "frigidaire",
    is_live: false,
    is_bulk: true,
    alias_collision: false,
    links: [],
    waterdrop: null,
    amazon_control: null,
    evidence_filenames: [],
  });
  assert.notEqual(fpuresource3.factory_state, "publishable_amazon_candidate");
  assert.notEqual(fpuresource3.factory_state, "publishable_waterdrop_candidate");
  assert.equal(fpuresource3.signals.has_gated_buyable_link, false);

  const fpuresourceultra = classifyLargeBatchCandidateV1({
    slug: "fpuresourceultra",
    oem_part_number: "EPTWFU01",
    brand_slug: "frigidaire",
    is_live: false,
    is_bulk: true,
    alias_collision: false,
    links: [],
    waterdrop: null,
    amazon_control: null,
    evidence_filenames: [],
  });
  assert.equal(fpuresourceultra.factory_state, "blocked_do_not_publish");
  assert.equal(fpuresourceultra.block_reason, "excluded_frigidaire_routing_token");
});
