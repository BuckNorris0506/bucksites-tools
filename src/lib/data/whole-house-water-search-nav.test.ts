import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  pickCanonicalWholeHouseWaterModelSlug,
  pickCanonicalWholeHouseWaterPartSlug,
} from "./whole-house-water-search-nav";

describe("pickCanonicalWholeHouseWaterModelSlug", () => {
  it("keeps slug when it exists on a row", () => {
    const rows = [
      { slug: "aquasana-rhino-eq-600", model_number_norm: "eq600" },
      { slug: "other-model", model_number_norm: "abc123" },
    ];
    assert.equal(
      pickCanonicalWholeHouseWaterModelSlug(
        { slug: "aquasana-rhino-eq-600", model_number: "EQ-600" },
        rows,
      ),
      "aquasana-rhino-eq-600",
    );
  });

  it("maps slugified plate token to canonical slug via model_number_norm", () => {
    const rows = [{ slug: "aquasana-rhino-eq-600", model_number_norm: "eq600" }];
    assert.equal(
      pickCanonicalWholeHouseWaterModelSlug(
        { slug: "eq-600", model_number: "EQ-600" },
        rows,
      ),
      "aquasana-rhino-eq-600",
    );
  });

  it("returns null when norm matches multiple rows", () => {
    const rows = [
      { slug: "a", model_number_norm: "eq600" },
      { slug: "b", model_number_norm: "eq600" },
    ];
    assert.equal(
      pickCanonicalWholeHouseWaterModelSlug(
        { slug: "eq-600", model_number: "EQ-600" },
        rows,
      ),
      null,
    );
  });
});

describe("pickCanonicalWholeHouseWaterPartSlug", () => {
  it("maps slugified OEM token to canonical part slug", () => {
    const rows = [{ slug: "aquasana-eq600-replacement", oem_part_number_norm: "eq600r" }];
    assert.equal(
      pickCanonicalWholeHouseWaterPartSlug(
        { slug: "eq-600r", oem_part_number: "EQ-600R" },
        rows,
      ),
      "aquasana-eq600-replacement",
    );
  });
});
