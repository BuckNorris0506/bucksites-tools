import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
  assertOnlyCoverageBatchASlugsV1,
  buildCoverageBatchAFieldParityV1,
  buildCoverageBatchAFridgeRetailerLinksParityReportV1,
  COVERAGE_BATCH_A_FRIDGE_RETAILER_LINKS_ALLOWED_SLUGS_V1,
  COVERAGE_BATCH_A_FRIDGE_RETAILER_LINKS_COMPARE_FIELDS_V1,
  coverageBatchAFieldValuesMatchV1,
  normalizeUtcInstantForParityV1,
  planCoverageBatchAWriteOpsV1,
  selectCoverageBatchACsvPrimaryRowsV1,
  type CoverageBatchACsvPrimaryRowV1,
  type CoverageBatchASupabasePrimaryRowV1,
} from "./coverage-batch-a-fridge-retailer-links-supabase-parity-v1";

const REPO_ROOT = process.cwd();

const EDR3_URL =
  "https://www.whirlpool.com/accessories/kitchen-accessories/refrigerator/p.ice-and-water-refrigerator-filter-3.edr3rxd1.html";
const ULTRA_URL =
  "https://www.frigidaireapplianceparts.com/PartDetail/Water-Filter/ULTRAWF/1534529";

test("allowlist is exactly edr3rxd1 and ultrawf", () => {
  assert.deepEqual([...COVERAGE_BATCH_A_FRIDGE_RETAILER_LINKS_ALLOWED_SLUGS_V1], [
    "edr3rxd1",
    "ultrawf",
  ]);
});

test("assertOnlyCoverageBatchASlugsV1 rejects extras and incomplete sets", () => {
  assert.equal(assertOnlyCoverageBatchASlugsV1(["edr3rxd1", "ultrawf"]).ok, true);
  assert.equal(assertOnlyCoverageBatchASlugsV1(["edr3rxd1"]).ok, false);
  assert.ok(
    assertOnlyCoverageBatchASlugsV1(["edr3rxd1", "ultrawf", "wf3cb"]).blockers.some((b) =>
      b.includes("slug_not_in_coverage_batch_a_allowlist"),
    ),
  );
});

test("selectCoverageBatchACsvPrimaryRowsV1 returns only Batch A primaries from live CSV", () => {
  const rows = selectCoverageBatchACsvPrimaryRowsV1({ rootDir: REPO_ROOT });
  assert.equal(rows.length, 2);
  assert.deepEqual(
    rows.map((r) => r.filter_slug).sort(),
    ["edr3rxd1", "ultrawf"],
  );
  const edr3 = rows.find((r) => r.filter_slug === "edr3rxd1");
  const ultra = rows.find((r) => r.filter_slug === "ultrawf");
  assert.equal(edr3?.affiliate_url, EDR3_URL);
  assert.equal(edr3?.browser_truth_classification, "direct_buyable");
  assert.equal(ultra?.affiliate_url, ULTRA_URL);
  assert.equal(ultra?.browser_truth_classification, "direct_buyable");
  assert.ok(rows.every((r) => r.is_primary));
});

test("selectCoverageBatchACsvPrimaryRowsV1 ignores non-allowlist CSV rows", () => {
  const root = mkdtempSync(path.join(tmpdir(), "batch-a-csv-"));
  mkdirSync(path.join(root, "data"), { recursive: true });
  writeFileSync(
    path.join(root, "data/retailer_links.csv"),
    [
      "filter_slug,retailer_name,affiliate_url,is_primary,sort_order,retailer_key,browser_truth_classification,browser_truth_notes,browser_truth_checked_at",
      `edr3rxd1,Whirlpool,${EDR3_URL},true,0,oem-parts-catalog,direct_buyable,notes,2026-07-03T17:25:00.000Z`,
      `ultrawf,Frigidaire,${ULTRA_URL},true,0,oem-parts-catalog,direct_buyable,notes,2026-07-03T17:13:04.000Z`,
      "wf3cb,OEM,https://example.com/wf3cb,true,0,oem-parts-catalog,direct_buyable,notes,2026-07-03T17:13:04.000Z",
      "edr4rxd1,Whirlpool,https://example.com/edr4,true,0,oem-parts-catalog,direct_buyable,notes,2026-07-03T17:13:04.000Z",
    ].join("\n"),
    "utf8",
  );
  const rows = selectCoverageBatchACsvPrimaryRowsV1({ rootDir: root });
  assert.equal(rows.length, 2);
  assert.ok(rows.every((r) => r.filter_slug === "edr3rxd1" || r.filter_slug === "ultrawf"));
});

test("normalizeUtcInstantForParityV1 equates Z and +00:00 forms", () => {
  assert.equal(
    normalizeUtcInstantForParityV1("2026-07-03T17:25:00.000Z"),
    normalizeUtcInstantForParityV1("2026-07-03T17:25:00+00:00"),
  );
  assert.equal(
    coverageBatchAFieldValuesMatchV1(
      "browser_truth_checked_at",
      "2026-07-03T17:25:00.000Z",
      "2026-07-03T17:25:00+00:00",
    ),
    true,
  );
  assert.equal(
    coverageBatchAFieldValuesMatchV1(
      "browser_truth_checked_at",
      "2026-07-03T17:25:00.000Z",
      "2026-07-03T17:26:00+00:00",
    ),
    false,
  );
});

test("field parity treats equivalent UTC timestamps as match when other fields match", () => {
  const csv: CoverageBatchACsvPrimaryRowV1 = {
    filter_slug: "edr3rxd1",
    affiliate_url: EDR3_URL,
    retailer_name: "Whirlpool",
    browser_truth_classification: "direct_buyable",
    browser_truth_notes: "notes",
    browser_truth_checked_at: "2026-07-03T17:25:00.000Z",
    is_primary: true,
    retailer_key: "oem-parts-catalog",
  };
  const supabase: CoverageBatchASupabasePrimaryRowV1 = {
    id: "row-1",
    filter_id: "filter-1",
    affiliate_url: EDR3_URL,
    retailer_name: "Whirlpool",
    browser_truth_classification: "direct_buyable",
    browser_truth_notes: "notes",
    browser_truth_checked_at: "2026-07-03T17:25:00+00:00",
    is_primary: true,
    retailer_key: "oem-parts-catalog",
  };
  const parity = buildCoverageBatchAFieldParityV1({ csv, supabase });
  assert.equal(parity.every((f) => f.match), true);
  const checkedAt = parity.find((f) => f.field === "browser_truth_checked_at");
  assert.equal(checkedAt?.csv_value, "2026-07-03T17:25:00.000Z");
  assert.equal(checkedAt?.supabase_value, "2026-07-03T17:25:00+00:00");
  assert.equal(checkedAt?.match, true);
});

test("field parity detects stale supabase primary fields", () => {
  const csv: CoverageBatchACsvPrimaryRowV1 = {
    filter_slug: "edr3rxd1",
    affiliate_url: EDR3_URL,
    retailer_name: "Whirlpool",
    browser_truth_classification: "direct_buyable",
    browser_truth_notes: "notes",
    browser_truth_checked_at: "2026-07-03T17:25:00.000Z",
    is_primary: true,
    retailer_key: "oem-parts-catalog",
  };
  const supabase: CoverageBatchASupabasePrimaryRowV1 = {
    id: "row-1",
    filter_id: "filter-1",
    affiliate_url: "https://www.whirlpoolparts.com/catalog.jsp?searchKeyword=EDR3RXD1",
    retailer_name: "OEM parts catalog (keyword lookup)",
    browser_truth_classification: "",
    browser_truth_notes: "",
    browser_truth_checked_at: "",
    is_primary: true,
    retailer_key: "oem-parts-catalog",
  };
  const parity = buildCoverageBatchAFieldParityV1({ csv, supabase });
  assert.equal(parity.length, COVERAGE_BATCH_A_FRIDGE_RETAILER_LINKS_COMPARE_FIELDS_V1.length);
  const mismatched = parity.filter((f) => !f.match).map((f) => f.field);
  assert.ok(mismatched.includes("affiliate_url"));
  assert.ok(mismatched.includes("retailer_name"));
  assert.ok(mismatched.includes("browser_truth_classification"));
  assert.ok(mismatched.includes("browser_truth_notes"));
  assert.ok(mismatched.includes("browser_truth_checked_at"));
  assert.ok(!mismatched.includes("is_primary"));
  assert.ok(!mismatched.includes("retailer_key"));
});

test("equivalent timestamps alone do not plan an update", async () => {
  const csvRows = selectCoverageBatchACsvPrimaryRowsV1({ rootDir: REPO_ROOT });
  const edr3 = csvRows.find((r) => r.filter_slug === "edr3rxd1");
  const ultra = csvRows.find((r) => r.filter_slug === "ultrawf");
  assert.ok(edr3 && ultra);
  const report = await buildCoverageBatchAFridgeRetailerLinksParityReportV1({
    rootDir: REPO_ROOT,
    mode: "dry_run",
    loadSupabase: async () => ({
      status: "CHECKED",
      filter_id_by_slug: new Map([
        ["edr3rxd1", "fid-edr3"],
        ["ultrawf", "fid-ultra"],
      ]),
      by_slug: new Map([
        [
          "edr3rxd1",
          {
            id: "sid-edr3",
            filter_id: "fid-edr3",
            affiliate_url: edr3.affiliate_url,
            retailer_name: edr3.retailer_name,
            browser_truth_classification: edr3.browser_truth_classification,
            browser_truth_notes: edr3.browser_truth_notes,
            browser_truth_checked_at: edr3.browser_truth_checked_at.replace(".000Z", "+00:00"),
            is_primary: true,
            retailer_key: edr3.retailer_key,
          },
        ],
        [
          "ultrawf",
          {
            id: "sid-ultra",
            filter_id: "fid-ultra",
            affiliate_url: ultra.affiliate_url,
            retailer_name: ultra.retailer_name,
            browser_truth_classification: ultra.browser_truth_classification,
            browser_truth_notes: ultra.browser_truth_notes,
            browser_truth_checked_at: ultra.browser_truth_checked_at.replace(".000Z", "+00:00"),
            is_primary: true,
            retailer_key: ultra.retailer_key,
          },
        ],
      ]),
    }),
  });
  assert.equal(report.all_in_parity, true);
  assert.equal(report.row_count_planned, 0);
  assert.equal(planCoverageBatchAWriteOpsV1(report).length, 0);
});

test("planCoverageBatchAWriteOpsV1 only plans allowlist slugs and max two ops", async () => {
  const csvRows = selectCoverageBatchACsvPrimaryRowsV1({ rootDir: REPO_ROOT });
  const report = await buildCoverageBatchAFridgeRetailerLinksParityReportV1({
    rootDir: REPO_ROOT,
    mode: "dry_run",
    loadSupabase: async () => ({
      status: "CHECKED",
      filter_id_by_slug: new Map([
        ["edr3rxd1", "fid-edr3"],
        ["ultrawf", "fid-ultra"],
      ]),
      by_slug: new Map([
        [
          "edr3rxd1",
          {
            id: "sid-edr3",
            filter_id: "fid-edr3",
            affiliate_url: "https://old.example/edr3",
            retailer_name: "Old",
            browser_truth_classification: "",
            browser_truth_notes: "",
            browser_truth_checked_at: "",
            is_primary: true,
            retailer_key: "oem-parts-catalog",
          },
        ],
        ["ultrawf", null],
      ]),
    }),
  });

  const ops = planCoverageBatchAWriteOpsV1(report);
  assert.ok(ops.length <= 2);
  assert.ok(ops.every((o) => o.filter_slug === "edr3rxd1" || o.filter_slug === "ultrawf"));
  assert.ok(ops.some((o) => o.filter_slug === "edr3rxd1" && o.action === "update"));
  assert.ok(ops.some((o) => o.filter_slug === "ultrawf" && o.action === "insert"));
  assert.equal(
    ops.find((o) => o.filter_slug === "edr3rxd1")?.desired.affiliate_url,
    csvRows.find((r) => r.filter_slug === "edr3rxd1")?.affiliate_url,
  );
});

test("write mode without MUTATION is not authorized", async () => {
  const prev = process.env.BUCKPARTS_IO_CAPABILITY;
  delete process.env.BUCKPARTS_IO_CAPABILITY;
  try {
    const report = await buildCoverageBatchAFridgeRetailerLinksParityReportV1({
      rootDir: REPO_ROOT,
      mode: "write",
      loadSupabase: async () => ({
        status: "CHECKED",
        filter_id_by_slug: new Map([
          ["edr3rxd1", "fid-edr3"],
          ["ultrawf", "fid-ultra"],
        ]),
        by_slug: new Map([
          ["edr3rxd1", null],
          ["ultrawf", null],
        ]),
      }),
    });
    assert.equal(report.mutation_authorized, false);
    assert.ok(
      report.blockers.some((b) => b.includes("io_capability_read_index_cannot_mutate_supabase")),
    );
  } finally {
    if (prev === undefined) delete process.env.BUCKPARTS_IO_CAPABILITY;
    else process.env.BUCKPARTS_IO_CAPABILITY = prev;
  }
});
