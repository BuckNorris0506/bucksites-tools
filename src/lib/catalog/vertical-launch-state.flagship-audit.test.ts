import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { getSitemapLaunchVerticals } from "@/lib/catalog/vertical-launch-state";

/**
 * Baseline before “fridge-first” deprioritization of other LIVE wedges.
 * When air purifier / whole-house are demoted from sitemap + homepage, update this test and
 * `docs/fridge-flagship-wedge-exposure.md`.
 */
describe("fridge flagship — wedge exposure baseline", () => {
  it("documents LIVE verticals included in sitemap launch set today", () => {
    const live = new Set(getSitemapLaunchVerticals());
    assert.ok(live.has("refrigerator"), "refrigerator must remain LIVE for flagship");
    assert.ok(live.has("air-purifier"), "baseline: air-purifier currently LIVE (deprioritize later)");
    assert.ok(
      live.has("whole-house-water"),
      "baseline: whole-house-water currently LIVE (deprioritize later)",
    );
  });
});
