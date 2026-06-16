import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildCore400sFlagshipBundleFromRepoRows } from "./core-400s-flagship-bundle";
import type { AirPurifierModelWithFilters } from "./models";

const model = {
  id: "model-core-400s",
  slug: "levoit-core-400s",
  brand_id: "brand-levoit",
  model_number: "Core 400S",
  title: "Levoit Core 400S Air Purifier",
  series: "Core 400",
  notes: null,
  brand: { id: "brand-levoit", slug: "levoit", name: "Levoit" },
  filters: [
    {
      id: "filter-rar040",
      slug: "levoit-rf-rar040",
      brand_id: "brand-levoit",
      oem_part_number: "LEVOIT-RF-RAR040",
      name: "Core 400 / Core 400S replacement filter",
      replacement_interval_months: 6,
      notes: "3-in-1 for Core 400 series",
      retailer_links: [],
      is_recommended_fit: true,
    },
  ],
} satisfies AirPurifierModelWithFilters;

describe("Core 400S flagship repo bundle", () => {
  it("builds family and also-fits from committed repo rows", () => {
    const bundle = buildCore400sFlagshipBundleFromRepoRows(model, {
      models: [
        {
          brand_slug: "levoit",
          slug: "levoit-core-400s",
          model_number: "Core 400S",
          title: "Levoit Core 400S Air Purifier",
          series: "Core 400",
          notes: "",
        },
        {
          brand_slug: "levoit",
          slug: "levoit-core-400s-rf",
          model_number: "Core 400S-RF",
          title: "Levoit Core 400S-RF Air Purifier",
          series: "Core 400",
          notes: "",
        },
        {
          brand_slug: "levoit",
          slug: "levoit-core-400-rf",
          model_number: "Core 400-RF",
          title: "Levoit Core 400-RF Air Purifier",
          series: "Core 400",
          notes: "",
        },
        {
          brand_slug: "levoit",
          slug: "levoit-lap-c401s-wusr",
          model_number: "LAP-C401S-WUSR",
          title: "Levoit LAP-C401S-WUSR Air Purifier",
          series: "Core 400",
          notes: "",
        },
        {
          brand_slug: "levoit",
          slug: "levoit-core-450s",
          model_number: "Core 450S",
          title: "Levoit Core 450S Air Purifier",
          series: "Core 400/600",
          notes: "",
        },
        {
          brand_slug: "levoit",
          slug: "levoit-lap-c451s-wusr",
          model_number: "LAP-C451S-WUSR",
          title: "Levoit LAP-C451S-WUSR Air Purifier",
          series: "Core 400/600",
          notes: "",
        },
      ],
      filters: [
        {
          brand_slug: "levoit",
          slug: "levoit-rf-rar040",
          oem_part_number: "LEVOIT-RF-RAR040",
          name: "Core 400 / Core 400S replacement filter",
          replacement_interval_months: "6",
          notes: "3-in-1 for Core 400 series",
        },
      ],
      compatibilityMappings: [
        { model_slug: "levoit-core-400s", filter_slug: "levoit-rf-rar040", is_recommended: "true" },
        { model_slug: "levoit-core-400s-rf", filter_slug: "levoit-rf-rar040", is_recommended: "true" },
        { model_slug: "levoit-core-400-rf", filter_slug: "levoit-rf-rar040", is_recommended: "true" },
        { model_slug: "levoit-lap-c401s-wusr", filter_slug: "levoit-rf-rar040", is_recommended: "true" },
        { model_slug: "levoit-core-450s", filter_slug: "levoit-rf-rar040", is_recommended: "true" },
        { model_slug: "levoit-lap-c451s-wusr", filter_slug: "levoit-rf-rar040", is_recommended: "true" },
      ],
    });

    assert.equal(bundle.familyModels.length, 4);
    assert.deepEqual(
      bundle.familyModels.map((row) => row.slug),
      [
        "levoit-core-400s",
        "levoit-core-400-rf",
        "levoit-core-400s-rf",
        "levoit-lap-c401s-wusr",
      ],
    );
    assert.equal(bundle.alsoFitsModels.length, 6);
    assert.ok(bundle.alsoFitsModels.some((row) => row.slug === "levoit-core-450s"));
  });
});
