import assert from "node:assert/strict";
import test from "node:test";

import {
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
  assert.equal(getVerticalLaunchState("air-purifier"), "LIVE");
  assert.equal(getVerticalLaunchState("whole-house-water"), "LIVE");
});

test("sitemap launch scope includes only LIVE verticals", () => {
  const live = getSitemapLaunchVerticals();
  assert.deepEqual(live.sort(), ["air-purifier", "refrigerator", "whole-house-water"]);
});

