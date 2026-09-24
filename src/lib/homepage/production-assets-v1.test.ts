import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

import {
  FEATURED_FIT_ILLUSTRATION_PATH,
  FEATURED_FIT_ILLUSTRATION_PROVENANCE,
} from "@/lib/homepage/featured-fit-example";
import { resolveCustomerSearchRouteV1 } from "@/lib/search/customer-search-route-v1";
import { CATALOG_REFRIGERATOR_WATER_FILTER } from "@/lib/catalog/constants";
import type { SearchHit } from "@/lib/data/search";

const root = (...parts: string[]) => join(process.cwd(), ...parts);

describe("production homepage assets v1", () => {
  it("header uses founder-approved PNG logo, not review raster or legacy inline mark", () => {
    const header = readFileSync(root("src", "components", "SiteHeader.tsx"), "utf8");
    const logo = readFileSync(root("src", "components", "brand", "BuckPartsBrandLogo.tsx"), "utf8");
    assert.ok(logo.includes("BUCKPARTS_HORIZONTAL_LOGO_PATH"));
    assert.ok(header.includes("BuckPartsBrandHomeLink"));
    assert.ok(!header.includes("buckparts-horizontal-lockup-review.png"));
    assert.ok(!header.includes("BrandMark"));
    assert.ok(!/review raster/i.test(header));
    assert.ok(readFileSync(root("public", "brand", "buckparts-horizontal.png")).byteLength > 1000);
  });

  it("homepage example uses original illustration, not EveryDrop review PNG", () => {
    assert.equal(FEATURED_FIT_ILLUSTRATION_PATH, "/homepage/refrigerator-water-filter-cartridge-v1.svg");
    assert.ok(!FEATURED_FIT_ILLUSTRATION_PROVENANCE.toLowerCase().includes("review-preview"));
    assert.ok(!FEATURED_FIT_ILLUSTRATION_PROVENANCE.toLowerCase().includes("copied_image_allowed"));
    const example = readFileSync(root("src", "components", "homepage", "RealLookupExample.tsx"), "utf8");
    assert.ok(example.includes("FEATURED_FIT_ILLUSTRATION_PATH"));
    assert.ok(!example.includes("everydrop-filter-4-review-preview.png"));
    assert.ok(!example.includes("everydrop-filter4-photo"));
    const svg = readFileSync(root("public", "homepage", "refrigerator-water-filter-cartridge-v1.svg"), "utf8");
    assert.ok(!/<image\b/i.test(svg));
    assert.ok(!/everydrop|whirlpool/i.test(svg));
  });

  it("repo production paths do not reference review-preview filenames", () => {
    const paths = [
      root("src", "components", "SiteHeader.tsx"),
      root("src", "lib", "homepage", "featured-fit-example.ts"),
      root("src", "lib", "homepage", "homepage.test.ts"),
    ];
    for (const p of paths) {
      const src = readFileSync(p, "utf8");
      assert.ok(!src.includes("lockup-review.png"), `${p} still references review logo`);
      assert.ok(!src.includes("everydrop-filter-4-review-preview"), `${p} still references review product image`);
    }
  });

  it("exact customer search routing unchanged after asset swap", () => {
    const wrx: SearchHit = {
      catalog: CATALOG_REFRIGERATOR_WATER_FILTER,
      kind: "fridge",
      slug: "whirlpool-wrx735sdhz",
      model_number: "WRX735SDHZ",
      brand_name: "Whirlpool",
      brand_slug: "whirlpool",
      via: "model",
    };
    const edr: SearchHit = {
      catalog: CATALOG_REFRIGERATOR_WATER_FILTER,
      kind: "filter",
      slug: "edr4rxd1",
      oem_part_number: "EDR4RXD1",
      name: "EveryDrop Filter 4",
      brand_name: "Whirlpool",
      brand_slug: "whirlpool",
      via: "oem",
    };
    const modelRoute = resolveCustomerSearchRouteV1("WRX735SDHZ", [wrx]);
    assert.equal(modelRoute.kind, "direct_model");
    if (modelRoute.kind === "direct_model") {
      assert.equal(modelRoute.href, "/fridge/whirlpool-wrx735sdhz");
    }
    const partRoute = resolveCustomerSearchRouteV1("EDR4RXD1", [edr]);
    assert.equal(partRoute.kind, "direct_part");
    if (partRoute.kind === "direct_part") {
      assert.equal(partRoute.href, "/filter/edr4rxd1?fromSearch=1");
    }
  });
});
