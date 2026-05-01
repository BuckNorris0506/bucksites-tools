import assert from "node:assert/strict";
import test from "node:test";

import {
  buildSearchMissAuditReport,
  classifyExpectedHit,
  generateQueryVariants,
  resolveConcurrency,
  type ModelSeedRow,
} from "./lib/search-miss-audit";
import {
  CATALOG_AIR_PURIFIER_FILTERS,
  CATALOG_REFRIGERATOR_WATER_FILTER,
  CATALOG_WHOLE_HOUSE_WATER_FILTERS,
} from "@/lib/catalog/constants";

const AP_SEED: ModelSeedRow = {
  catalog: "air_purifier",
  catalog_id: CATALOG_AIR_PURIFIER_FILTERS,
  slug: "levoit-lap-v102s-aasr",
  model_number: "LAP-V102S-AASR",
  model_number_norm: "lapv102saasr",
  brand_name: "Levoit",
  brand_slug: "levoit",
};

test("query variant generation includes brand + model-prefix style", () => {
  const variants = generateQueryVariants(AP_SEED);
  const queries = variants.map((v) => `${v.query_variant_type}:${v.query}`);
  assert.equal(queries.includes("brand_model_prefix:levoit lap"), true);
});

test("resolveConcurrency default/invalid/cap behavior", () => {
  assert.equal(resolveConcurrency(undefined), 3);
  assert.equal(resolveConcurrency(""), 3);
  assert.equal(resolveConcurrency("nope"), 3);
  assert.equal(resolveConcurrency(0), 3);
  assert.equal(resolveConcurrency(-2), 3);
  assert.equal(resolveConcurrency(3), 3);
  assert.equal(resolveConcurrency("7"), 7);
  assert.equal(resolveConcurrency(25), 10);
});

test("classifies expected hit as present when exact slug is returned", () => {
  const result = classifyExpectedHit({
    seed: AP_SEED,
    expectedKind: "model",
    hits: [
      {
        catalog: CATALOG_AIR_PURIFIER_FILTERS,
        kind: "model",
        slug: "levoit-lap-v102s-aasr",
        model_number: "LAP-V102S-AASR",
        brand_name: "Levoit",
        brand_slug: "levoit",
      },
    ],
  });
  assert.equal(result.classification, "HIT_PRESENT_EXPECTED");
  assert.equal(result.observed_expected_hit, true);
});

test("classifies zero-hit expected match as miss", () => {
  const result = classifyExpectedHit({
    seed: AP_SEED,
    expectedKind: "model",
    hits: [],
  });
  assert.equal(result.classification, "MISS_ZERO_HIT_EXPECTED_MATCH");
});

test("report ordering/schema prioritizes misses and keeps read-only contract", async () => {
  const fridgeSeed: ModelSeedRow = {
    catalog: "refrigerator_water",
    catalog_id: CATALOG_REFRIGERATOR_WATER_FILTER,
    slug: "samsung-rf28",
    model_number: "RF28R7351SG",
    model_number_norm: "rf28r7351sg",
    brand_name: "Samsung",
    brand_slug: "samsung",
  };
  const whwSeed: ModelSeedRow = {
    catalog: "whole_house_water",
    catalog_id: CATALOG_WHOLE_HOUSE_WATER_FILTERS,
    slug: "aquasana-eq-1000",
    model_number: "EQ-1000",
    model_number_norm: "eq1000",
    brand_name: "Aquasana",
    brand_slug: "aquasana",
  };

  const report = await buildSearchMissAuditReport({
    seeds: [AP_SEED, fridgeSeed, whwSeed],
    perCatalog: 3,
    runSearch: async (query) => {
      if (query === "levoit lap") return [];
      if (query.startsWith("samsung")) {
        return [
          {
            catalog: CATALOG_REFRIGERATOR_WATER_FILTER,
            kind: "fridge",
            slug: "samsung-rf28",
            model_number: "RF28R7351SG",
            brand_name: "Samsung",
            brand_slug: "samsung",
          },
        ];
      }
      return [
        {
          catalog: CATALOG_WHOLE_HOUSE_WATER_FILTERS,
          kind: "model",
          slug: "aquasana-eq-1000",
          model_number: "EQ-1000",
          brand_name: "Aquasana",
          brand_slug: "aquasana",
        },
      ];
    },
    now: () => new Date("2026-05-01T00:00:00.000Z"),
  });

  assert.equal(report.report_name, "buckparts_search_miss_audit_v1");
  assert.equal(report.read_only, true);
  assert.equal(report.data_mutation, false);
  assert.equal(report.parameters.concurrency, 3);
  assert.equal(Array.isArray(report.rows), true);
  assert.equal(Array.isArray(report.prioritized_fix_list), true);
  assert.equal(report.rows.length > 0, true);
  for (let i = 1; i < report.rows.length; i += 1) {
    assert.equal(report.rows[i - 1]!.priority_score >= report.rows[i]!.priority_score, true);
  }
  assert.equal(report.prioritized_fix_list.length > 0, true);
  assert.equal(report.summary.miss_rows > 0, true);
});

test("deterministic output remains stable across concurrency values", async () => {
  const seeds: ModelSeedRow[] = [
    AP_SEED,
    {
      catalog: "whole_house_water",
      catalog_id: CATALOG_WHOLE_HOUSE_WATER_FILTERS,
      slug: "aquasana-eq-1000",
      model_number: "EQ-1000",
      model_number_norm: "eq1000",
      brand_name: "Aquasana",
      brand_slug: "aquasana",
    },
  ];
  const runSearch = async (query: string) => {
    if (query.includes("lap")) return [];
    return [
      {
        catalog: CATALOG_WHOLE_HOUSE_WATER_FILTERS,
        kind: "model" as const,
        slug: "aquasana-eq-1000",
        model_number: "EQ-1000",
        brand_name: "Aquasana",
        brand_slug: "aquasana",
      },
    ];
  };

  const report1 = await buildSearchMissAuditReport({
    seeds,
    perCatalog: 2,
    concurrency: 1,
    runSearch,
    now: () => new Date("2026-05-01T00:00:00.000Z"),
  });
  const report3 = await buildSearchMissAuditReport({
    seeds,
    perCatalog: 2,
    concurrency: 3,
    runSearch,
    now: () => new Date("2026-05-01T00:00:00.000Z"),
  });

  assert.deepEqual(report1.rows, report3.rows);
  assert.deepEqual(report1.prioritized_fix_list, report3.prioritized_fix_list);
});
