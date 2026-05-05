import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { getSitemapLaunchVerticals } from "@/lib/catalog/vertical-launch-state";

describe("fridge flagship — live launch wedge", () => {
  it("keeps refrigerator as the only LIVE sitemap launch wedge", () => {
    const live = new Set(getSitemapLaunchVerticals());
    assert.ok(live.has("refrigerator"), "refrigerator must remain LIVE for flagship");
    assert.equal(live.has("air-purifier"), false, "air-purifier should not be LIVE in fridge-only phase");
    assert.equal(
      live.has("whole-house-water"),
      false,
      "whole-house-water should not be LIVE in fridge-only phase",
    );
  });
});
