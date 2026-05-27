import assert from "node:assert/strict";
import test from "node:test";

import { HOMEKEEP_WEDGE_CATALOG_ORDER } from "@/lib/catalog/identity";
import {
  PUBLIC_CATEGORY_HUB_BROWSE_DISCLAIMER,
  PUBLIC_CATEGORY_HUB_ORDER,
  buildPublicCategoryHubCards,
} from "@/lib/catalog/public-category-hub";

test("public category hub lists every wedge with a route tree", () => {
  assert.deepEqual(PUBLIC_CATEGORY_HUB_ORDER, HOMEKEEP_WEDGE_CATALOG_ORDER);
  const cards = buildPublicCategoryHubCards();
  assert.equal(cards.length, 6);
  assert.deepEqual(
    cards.map((c) => c.title),
    [
      "Refrigerator water filters",
      "Air purifier filters",
      "Vacuum filters",
      "Humidifier filters",
      "Appliance air filters",
      "Whole-house water filters",
    ],
  );
});

test("only refrigerator is LIVE on the public hub", () => {
  const cards = buildPublicCategoryHubCards();
  const live = cards.filter((c) => c.isLive);
  assert.equal(live.length, 1);
  assert.equal(live[0]!.category, "refrigerator_water");
  assert.equal(live[0]!.statusLabel, null);
});

test("unproven wedges show honest browse-preview status", () => {
  const cards = buildPublicCategoryHubCards().filter((c) => !c.isLive);
  assert.equal(cards.length, 5);
  for (const card of cards) {
    assert.equal(card.statusLabel, "Being verified");
    assert.match(card.statusNote ?? "", /Browse preview/i);
    assert.match(card.statusNote ?? "", /part-page checks pass/i);
  }
});

test("browse disclaimer negates bestseller and sales-chart claims", () => {
  assert.match(PUBLIC_CATEGORY_HUB_BROWSE_DISCLAIMER, /not a popularity ranking/i);
  assert.match(PUBLIC_CATEGORY_HUB_BROWSE_DISCLAIMER, /not a .*bestseller list/i);
});
