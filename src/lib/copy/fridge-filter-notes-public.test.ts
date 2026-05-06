import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { publicFacingRefrigeratorFilterNotes } from "@/lib/copy/fridge-filter-notes-public";

describe("publicFacingRefrigeratorFilterNotes", () => {
  it("rewrites known OEM-style CSV boilerplate to homeowner copy", () => {
    const out = publicFacingRefrigeratorFilterNotes(
      "Published OEM-style part number; confirm year/trim with LG/Samsung/GE/Whirlpool/Frigidaire fit charts.",
    );
    assert.ok(out);
    assert.ok(!/OEM-style/i.test(out!));
    assert.ok(out!.includes("cartridge or housing"));
  });

  it("replaces notes that contain internal jargon", () => {
    const out = publicFacingRefrigeratorFilterNotes(
      "Some on-file retailer targets are manufacturer search URLs.",
    );
    assert.ok(out);
    assert.ok(!/manufacturer search/i.test(out!));
    assert.ok(!/retailer target/i.test(out!));
  });

  it("passes through safe custom notes", () => {
    assert.equal(
      publicFacingRefrigeratorFilterNotes("Check the twist direction before removing."),
      "Check the twist direction before removing.",
    );
  });

  it("returns null for empty input", () => {
    assert.equal(publicFacingRefrigeratorFilterNotes(null), null);
    assert.equal(publicFacingRefrigeratorFilterNotes("   "), null);
  });
});
