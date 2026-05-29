import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { getSitemapLaunchVerticals } from "@/lib/catalog/vertical-launch-state";

describe("fridge flagship — live launch wedge", () => {
  it("keeps refrigerator LIVE and opens air-purifier truth-gated public discovery", () => {
    const live = new Set(getSitemapLaunchVerticals());
    assert.ok(live.has("refrigerator"), "refrigerator must remain LIVE for flagship");
    assert.ok(live.has("air-purifier"), "air-purifier is LIVE with truth-gated buyer paths");
    assert.equal(
      live.has("whole-house-water"),
      false,
      "whole-house-water should not be LIVE until safe buyer-path proof exists",
    );
  });
});
