import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  loadFridgeFormFactorEvidenceForModel,
  validateFridgeFormFactorEvidencePublicReady,
} from "@/lib/fridge/fridge-form-factor-evidence";

describe("fridge form-factor evidence", () => {
  it("loads public-ready french-door evidence for proven LG models", async () => {
    const slugs = ["lg-lfxs26973s", "lg-lfxs28968s", "lg-lrfvs3006s", "lg-lrfxs3106s"];
    for (const slug of slugs) {
      const evidence = await loadFridgeFormFactorEvidenceForModel(slug);
      assert.ok(evidence, `missing evidence for ${slug}`);
      assert.equal(evidence?.form_factor, "french_door_bottom_freezer");
      assert.equal(evidence?.copied_image_allowed, false);
      assert.equal(evidence?.operator_reviewed, true);
      assert.ok(!/amazon|lowes/i.test(evidence?.source_url ?? ""));
    }
  });

  it("rejects copied-image enabled evidence", () => {
    const result = validateFridgeFormFactorEvidencePublicReady({
      fridge_model_slug: "lg-sample",
      form_factor: "french_door_bottom_freezer",
      source_type: "manufacturer_support",
      source_url: "https://www.lg.com/us/example",
      source_title: "Example",
      confidence: "medium",
      operator_reviewed: true,
      copied_image_allowed: true,
    });
    assert.equal(result.ok, false);
    assert.ok(result.errors.some((e) => e.includes("copied_image_allowed")));
  });
});
