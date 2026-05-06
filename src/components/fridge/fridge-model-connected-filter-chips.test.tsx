import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { FridgeModelConnectedFilterChips } from "@/components/fridge/FridgeModelConnectedFilterChips";
import type { FridgeMappedFilterRow } from "@/lib/data/fridges";

const row = {
  id: "f1",
  slug: "lt1000p",
  oem_part_number: "LT1000P",
} as unknown as FridgeMappedFilterRow;

describe("FridgeModelConnectedFilterChips", () => {
  it("renders compact chip links and non-ranked labeling", () => {
    const html = renderToStaticMarkup(
      createElement(FridgeModelConnectedFilterChips, { filters: [row] }),
    );
    assert.ok(html.includes("Numbers connected to this fridge"));
    assert.ok(html.includes("Not ranked"));
    assert.ok(html.includes("LT1000P"));
    assert.ok(html.includes('href="/filter/lt1000p"'));
    assert.equal(/\bOption\b/i.test(html), false);
  });

  it("returns null for empty filters", () => {
    const html = renderToStaticMarkup(createElement(FridgeModelConnectedFilterChips, { filters: [] }));
    assert.equal(html, "");
  });
});
