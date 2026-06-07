import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  getFridgeModelReviewOverride,
  isFridgeModelUnderOwnerReview,
} from "@/lib/fridge/fridge-model-review-overrides";

describe("fridge-model-review-overrides", () => {
  it("detects lrfxs3106s quarantine override", () => {
    const override = getFridgeModelReviewOverride("lg-lrfxs3106s");
    assert.ok(override);
    assert.equal(override.fridge_model_slug, "lg-lrfxs3106s");
    assert.equal(override.reason, "FILTER_MAPPING_CONFLICT");
    assert.equal(override.public_status, "owner_review_required");
    assert.ok(
      override.public_message.includes("no buying options appear yet"),
      "public message should explain suppressed buying options",
    );
    assert.equal(
      override.internal_evidence_doc,
      "docs/fridge-model-filter-mapping-discrepancies.md",
    );
    assert.equal(isFridgeModelUnderOwnerReview("lg-lrfxs3106s"), true);
  });

  it("does not quarantine samsung-rf28r7351sr after HAF-QIN mapping reconciliation", () => {
    assert.equal(getFridgeModelReviewOverride("samsung-rf28r7351sr"), null);
    assert.equal(isFridgeModelUnderOwnerReview("samsung-rf28r7351sr"), false);
  });

  it("does not flag non-quarantined model", () => {
    assert.equal(getFridgeModelReviewOverride("lg-lfxs26973s"), null);
    assert.equal(isFridgeModelUnderOwnerReview("lg-lfxs26973s"), false);
  });
});
