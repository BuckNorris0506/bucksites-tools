import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

describe("fridge model page chip wiring", () => {
  it("renders connected filter chips only when not quarantined and filters exist", () => {
    const src = readFileSync(join(process.cwd(), "src/app/fridge/[slug]/page.tsx"), "utf8");
    assert.ok(src.includes("FridgeModelConnectedFilterChips"));
    assert.ok(src.includes("!reviewOverride && fridge.filters.length > 0"));
    const chipIdx = src.indexOf("<FridgeModelConnectedFilterChips");
    const condIdx = src.lastIndexOf("!reviewOverride && fridge.filters.length > 0", chipIdx);
    assert.ok(condIdx >= 0, "chips must be gated on review override and mapped filters");
  });
});
