import assert from "node:assert/strict";
import test from "node:test";

import { CATALOG_HUB_LAUNCH_CATEGORIES } from "@/lib/catalog/catalog-availability";
import { buildPublicCategoryHubCards } from "@/lib/catalog/public-category-hub";

test("CATALOG_HUB_LAUNCH_CATEGORIES remains fridge-only LIVE discovery", () => {
  assert.deepEqual(CATALOG_HUB_LAUNCH_CATEGORIES, ["refrigerator_water"]);
});

test("/catalog hub surfaces all wedge categories with customer-facing titles", () => {
  const titles = buildPublicCategoryHubCards().map((c) => c.title);
  assert.ok(titles.includes("Refrigerator water filters"));
  assert.ok(titles.includes("Air purifier filters"));
  assert.ok(titles.includes("Whole-house water filters"));
  assert.ok(!titles.some((t) => /Fridge-water|^Air purifiers$|^Whole-house water$/i.test(t)));
});
