import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  assertionBlocksCasePassV1,
  buildProductionTruthApReportV1,
  countRawSafeCtaRowsV1,
  loadCsvPrimaryAuthorityForFilterV1,
} from "./buckparts-production-truth-ap-v1";
import { PRODUCTION_TRUTH_GOLDEN_CASES_AP_V1 } from "./buckparts-production-truth-golden-cases-ap-v1";
import type { AirPurifierFilterWithModels } from "@/lib/data/air-purifier/filters";
import type { AirPurifierModelWithFilters } from "@/lib/data/air-purifier/models";

function mockWinixFilter(): AirPurifierFilterWithModels {
  return {
    id: "winix-filter-id",
    slug: "winix-filter-h-116130",
    brand_id: "b1",
    oem_part_number: "116130",
    name: "Filter H",
    replacement_interval_months: 6,
    notes: null,
    brand: { slug: "winix", name: "Winix" },
    models: [],
    retailer_links: [
      {
        id: "link-1",
        air_purifier_filter_id: "winix-filter-id",
        retailer_name: "OEM",
        affiliate_url: "https://www.winixamerica.com/product/filter-h-116130/",
        is_primary: true,
        retailer_key: "oem-catalog",
        browser_truth_classification: "direct_buyable",
        browser_truth_buyable_subtype: "SINGLE_UNIT_DIRECT_BUYABLE",
        browser_truth_notes: "proof",
        browser_truth_checked_at: "2026-06-12T18:47:54.123Z",
      },
    ],
    official_reference_links: [],
    buy_path_gate_suppression: {
      total_approved_rows: 1,
      gated_out_count: 0,
      by_failure_kind: {},
    },
    also_known_as: [],
  };
}

function mockHolmesFilterSuppressed(): AirPurifierFilterWithModels {
  return {
    id: "holmes-filter-id",
    slug: "holmes-hapf30",
    brand_id: "b2",
    oem_part_number: "HOLMES-HAPF30",
    name: "HAPF30",
    replacement_interval_months: 6,
    notes: null,
    brand: { slug: "holmes", name: "Holmes" },
    models: [],
    retailer_links: [],
    official_reference_links: [],
    buy_path_gate_suppression: {
      total_approved_rows: 1,
      gated_out_count: 1,
      by_failure_kind: { search_placeholder: 1 },
    },
    also_known_as: [],
  };
}

function mockBlueairDriftFilter(): AirPurifierFilterWithModels {
  return {
    id: "blueair-filter-id",
    slug: "blueair-f2-211",
    brand_id: "b3",
    oem_part_number: "BLUEAIR-F2-211",
    name: "Blue Pure 211+",
    replacement_interval_months: 6,
    notes: null,
    brand: { slug: "blueair", name: "Blueair" },
    models: [],
    retailer_links: [],
    official_reference_links: [],
    buy_path_gate_suppression: {
      total_approved_rows: +2,
      gated_out_count: 2,
      by_failure_kind: { unsafe_browser_truth: 1, missing_browser_truth: 1 },
    },
    also_known_as: [],
  };
}

function mockWinixModel(): AirPurifierModelWithFilters {
  return {
    id: "m1",
    slug: "winix-5500-2",
    brand_id: "b1",
    model_number: "5500-2",
    title: "Winix 5500-2",
    series: null,
    notes: null,
    brand: { id: "b1", slug: "winix", name: "Winix" },
    filters: [
      {
        id: "winix-filter-id",
        slug: "winix-filter-h-116130",
        brand_id: "b1",
        oem_part_number: "116130",
        name: "Filter H",
        replacement_interval_months: 6,
        notes: null,
        retailer_links: mockWinixFilter().retailer_links,
        is_recommended_fit: true,
      },
    ],
  };
}

describe("loadCsvPrimaryAuthorityForFilterV1", () => {
  it("reads winix CSV primary as direct_buyable", () => {
    const row = loadCsvPrimaryAuthorityForFilterV1(process.cwd(), "winix-filter-h-116130");
    assert.ok(row);
    assert.equal(row.csv_safe_direct_buyable, true);
    assert.match(row.affiliate_url, /filter-h-116130/i);
  });

  it("reads blueair CSV primary as direct_buyable official PDP", () => {
    const row = loadCsvPrimaryAuthorityForFilterV1(process.cwd(), "blueair-f2-211");
    assert.ok(row);
    assert.equal(row.csv_safe_direct_buyable, true);
    assert.match(row.affiliate_url, /blue-pure-211-plus-particle-carbon/i);
  });
});

describe("buildProductionTruthApReportV1 (mocked runtime)", () => {
  it("passes safe winix golden case with mocked Supabase loader", async () => {
    const report = await buildProductionTruthApReportV1({
      supabaseConfigured: () => true,
      getFilterBySlug: async (slug) => {
        if (slug === "winix-filter-h-116130") return mockWinixFilter();
        if (slug === "holmes-hapf30") return mockHolmesFilterSuppressed();
        if (slug === "blueair-f2-211") return mockBlueairDriftFilter();
        return null;
      },
      getModelBySlug: async (slug) => (slug === "winix-5500-2" ? mockWinixModel() : null),
      fetchRawApprovedLinks: async () => [],
    });

    const winix = report.cases.find((c) => c.case_id === "ap-safe-winix-filter-h-116130");
    assert.ok(winix);
    assert.equal(winix.status, "PASS");

    const holmes = report.cases.find((c) => c.case_id === "ap-suppressed-holmes-hapf30");
    assert.ok(holmes);
    assert.equal(holmes.status, "PASS");
    assert.equal(holmes.customer_safety_status, "PASS");

    const drift = report.cases.find((c) => c.case_id === "ap-drift-blueair-f2-211");
    assert.ok(drift);
    assert.equal(drift.status, "FAIL");

    const compat = report.cases.find((c) => c.case_id === "ap-compat-winix-5500-2");
    assert.ok(compat);
    assert.equal(compat.status, "PASS");
  });

  it("passes holmes with inventory warning when raw OEM search primary remains", async () => {
    const report = await buildProductionTruthApReportV1({
      supabaseConfigured: () => true,
      getFilterBySlug: async (slug) =>
        slug === "holmes-hapf30" ? mockHolmesFilterSuppressed() : null,
      getModelBySlug: async () => null,
      fetchRawApprovedLinks: async (filterId) => {
        if (filterId !== "holmes-filter-id") return [];
        return [
          {
            id: "oem-primary-id",
            affiliate_url: "https://www.holmesproducts.com/search?q=holmes-hapf30",
            is_primary: true,
            retailer_key: "oem-catalog",
            browser_truth_classification: "likely_search_results",
          },
        ];
      },
    });

    const holmes = report.cases.find((c) => c.case_id === "ap-suppressed-holmes-hapf30");
    assert.ok(holmes);
    assert.equal(holmes.status, "PASS");
    assert.equal(holmes.customer_safety_status, "PASS");
    assert.equal(holmes.inventory_warnings.length, 1);
    assert.equal(holmes.inventory_warnings[0]?.assertion_id, "no_search_primary_win");

    const safe = holmes.assertions.find((a) => a.assertion_id === "safe_cta_absent");
    assert.ok(safe);
    assert.equal(safe.status, "PASS");
    assert.equal(safe.blocks_case_pass, true);

    const search = holmes.assertions.find((a) => a.assertion_id === "no_search_primary_win");
    assert.ok(search);
    assert.equal(search.status, "FAIL");
    assert.equal(search.blocks_case_pass, false);

    assert.equal(report.summary.pass, 1);
    assert.equal(report.summary.fail, 0);
    assert.equal(report.summary.pass_with_inventory_warnings, 1);
    assert.equal(report.summary.inventory_warning_count, 1);
  });

  it("passes go_redirect_gate_safe when selected buy link has fresh browser truth recency", async () => {
    const report = await buildProductionTruthApReportV1({
      now: () => new Date("2026-07-07T00:00:00.000Z"),
      supabaseConfigured: () => true,
      getFilterBySlug: async (slug) => (slug === "winix-filter-h-116130" ? mockWinixFilter() : null),
      getModelBySlug: async () => null,
      fetchRawApprovedLinks: async () => [],
    });

    const winix = report.cases.find((c) => c.case_id === "ap-safe-winix-filter-h-116130");
    assert.ok(winix);
    const goGate = winix.assertions.find((a) => a.assertion_id === "go_gate_safe");
    assert.ok(goGate);
    assert.equal(goGate.status, "PASS");
    assert.equal(goGate.actual, true);
  });

  it("fails go_redirect_gate_safe when browser_truth_checked_at is missing (fail closed)", async () => {
    const filter = mockWinixFilter();
    filter.retailer_links[0]!.browser_truth_checked_at = null;

    const report = await buildProductionTruthApReportV1({
      now: () => new Date("2026-07-07T00:00:00.000Z"),
      supabaseConfigured: () => true,
      getFilterBySlug: async () => filter,
      getModelBySlug: async () => null,
      fetchRawApprovedLinks: async () => [],
    });

    const winix = report.cases.find((c) => c.case_id === "ap-safe-winix-filter-h-116130");
    assert.ok(winix);
    const goGate = winix.assertions.find((a) => a.assertion_id === "go_gate_safe");
    assert.ok(goGate);
    assert.equal(goGate.status, "FAIL");
    assert.match(goGate.detail, /missing_browser_truth_checked_at/);
  });

  it("fails go_redirect_gate_safe when browser_truth_checked_at is stale", async () => {
    const filter = mockWinixFilter();
    filter.retailer_links[0]!.browser_truth_checked_at = "2026-01-01T00:00:00.000Z";

    const report = await buildProductionTruthApReportV1({
      now: () => new Date("2026-07-07T00:00:00.000Z"),
      supabaseConfigured: () => true,
      getFilterBySlug: async () => filter,
      getModelBySlug: async () => null,
      fetchRawApprovedLinks: async () => [],
    });

    const winix = report.cases.find((c) => c.case_id === "ap-safe-winix-filter-h-116130");
    assert.ok(winix);
    const goGate = winix.assertions.find((a) => a.assertion_id === "go_gate_safe");
    assert.ok(goGate);
    assert.equal(goGate.status, "FAIL");
    assert.match(goGate.detail, /stale_browser_truth_checked_at/);
  });

  it("marks holmes no_search_primary_win as non-blocking in golden contract", () => {
    const holmes = PRODUCTION_TRUTH_GOLDEN_CASES_AP_V1.find(
      (c) => c.case_id === "ap-suppressed-holmes-hapf30",
    );
    assert.ok(holmes);
    const search = holmes.assertions.find((a) => a.assertion_id === "no_search_primary_win");
    assert.ok(search);
    assert.equal(assertionBlocksCasePassV1(search), false);
  });

  it("skips all cases when Supabase is not configured", async () => {
    const report = await buildProductionTruthApReportV1({
      supabaseConfigured: () => false,
    });
    assert.equal(report.summary.skip, report.summary.total_cases);
    assert.equal(report.supabase_configured, false);
  });
});

describe("countRawSafeCtaRowsV1", () => {
  it("counts direct_buyable rows passing gate", () => {
    const n = countRawSafeCtaRowsV1([
      {
        affiliate_url: "https://www.winixamerica.com/product/filter-h-116130/",
        retailer_key: "oem-catalog",
        browser_truth_classification: "direct_buyable",
        browser_truth_checked_at: "2026-06-12T18:47:54.123Z",
        browser_truth_notes: "proof",
      },
      {
        affiliate_url: "https://www.holmesproducts.com/search?q=HOLMES-HAPF30",
        retailer_key: "oem-catalog",
        browser_truth_classification: null,
      },
    ]);
    assert.equal(n, 1);
  });
});
