import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { extractModelIntentToken } from "./model-intent-token";

describe("extractModelIntentToken", () => {
  it("extracts short alpha model prefix from brand+model query", () => {
    assert.equal(extractModelIntentToken("levoit lap"), "lap");
  });

  it("ignores generic filter words and returns null when no model token exists", () => {
    assert.equal(extractModelIntentToken("levoit filter"), null);
  });

  it("returns null for single-token queries", () => {
    assert.equal(extractModelIntentToken("lap-v102s-aasr"), null);
  });
});
