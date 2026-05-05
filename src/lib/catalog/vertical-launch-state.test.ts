import assert from "node:assert/strict";
import test from "node:test";

import {
  VERTICAL_SLUGS_WITH_HOMEKEEP_SITEMAP_DISCOVERY,
  getSitemapLaunchVerticals,
  getVerticalLaunchState,
} from "@/lib/catalog/vertical-launch-state";

test("unfinished verticals are NOINDEX_UNPROVEN", () => {
  assert.equal(getVerticalLaunchState("vacuum"), "NOINDEX_UNPROVEN");
  assert.equal(getVerticalLaunchState("humidifier"), "NOINDEX_UNPROVEN");
  assert.equal(getVerticalLaunchState("appliance-air"), "NOINDEX_UNPROVEN");
});

test("live verticals are LIVE", () => {
  assert.equal(getVerticalLaunchState("refrigerator"), "LIVE");
  assert.equal(getVerticalLaunchState("air-purifier"), "NOINDEX_UNPROVEN");
  assert.equal(getVerticalLaunchState("whole-house-water"), "NOINDEX_UNPROVEN");
});

test("sitemap launch scope includes only LIVE verticals", () => {
  const live = getSitemapLaunchVerticals();
  assert.deepEqual(live.sort(), ["refrigerator"]);
});

test("homekeep sitemap discovery verticals list matches fridge + two monetization wedges", () => {
  assert.deepEqual([...VERTICAL_SLUGS_WITH_HOMEKEEP_SITEMAP_DISCOVERY].sort(), [
    "air-purifier",
    "refrigerator",
    "whole-house-water",
  ]);
});

