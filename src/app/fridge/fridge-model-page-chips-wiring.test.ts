import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

describe("fridge model page chip wiring", () => {
  it("passes connected filters into hero card and gates chips under review override", () => {
    const src = readFileSync(join(process.cwd(), "src/app/fridge/[slug]/page.tsx"), "utf8");
    assert.ok(src.includes("connectedFilters={reviewOverride ? [] : fridge.filters}"));
    assert.ok(!src.includes("<FridgeModelConnectedFilterChips"));
  });
});
