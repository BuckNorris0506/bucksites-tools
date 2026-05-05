import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import type { Metadata } from "next";

import { metadata as airPurifierMetadata } from "@/app/air-purifier/layout";
import { metadata as applianceAirMetadata } from "@/app/appliance-air/layout";
import { metadata as humidifierMetadata } from "@/app/humidifier/layout";
import { metadata as vacuumMetadata } from "@/app/vacuum/layout";
import { metadata as wholeHouseWaterMetadata } from "@/app/whole-house-water/layout";
import { NON_LIVE_WEDGE_ROBOTS } from "@/lib/catalog/non-live-wedge-robots";
import {
  VERTICAL_LAUNCH_STATES,
  isVerticalLive,
  type VerticalSlug,
} from "@/lib/catalog/vertical-launch-state";

/** Segment layouts that apply `NON_LIVE_WEDGE_ROBOTS` for each non-LIVE `VerticalSlug`. */
const NOINDEX_LAYOUT_BY_VERTICAL: Partial<Record<VerticalSlug, Metadata>> = {
  "air-purifier": airPurifierMetadata,
  "whole-house-water": wholeHouseWaterMetadata,
  vacuum: vacuumMetadata,
  humidifier: humidifierMetadata,
  "appliance-air": applianceAirMetadata,
};

test("NON_LIVE_WEDGE_ROBOTS is noindex/follow", () => {
  assert.equal(NON_LIVE_WEDGE_ROBOTS.robots?.index, false);
  assert.equal(NON_LIVE_WEDGE_ROBOTS.robots?.follow, true);
});

test("every NOINDEX_UNPROVEN vertical exposes layout-level noindex metadata", () => {
  for (const vertical of Object.keys(VERTICAL_LAUNCH_STATES) as VerticalSlug[]) {
    if (isVerticalLive(vertical)) continue;
    const layoutMeta = NOINDEX_LAYOUT_BY_VERTICAL[vertical];
    assert.ok(
      layoutMeta,
      `${vertical}: add or map src/app/${vertical}/layout.tsx with NON_LIVE_WEDGE_ROBOTS`,
    );
    assert.equal(layoutMeta.robots?.index, false, vertical);
    assert.equal(layoutMeta.robots?.follow, true, vertical);
  }
});

test("refrigerator wedge stays LIVE and is not wrapped by a segment noindex layout", () => {
  assert.ok(isVerticalLive("refrigerator"));
  assert.equal(NOINDEX_LAYOUT_BY_VERTICAL.refrigerator, undefined);
  const root = process.cwd();
  assert.equal(existsSync(join(root, "src/app/fridge/layout.tsx")), false);
  assert.equal(existsSync(join(root, "src/app/filter/layout.tsx")), false);
  assert.equal(existsSync(join(root, "src/app/refrigerator/layout.tsx")), false);
});
