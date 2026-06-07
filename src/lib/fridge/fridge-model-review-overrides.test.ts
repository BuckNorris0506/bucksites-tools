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

  it("detects samsung-rf28r7351sr wrong-family mapping quarantine", () => {
    const override = getFridgeModelReviewOverride("samsung-rf28r7351sr");
    assert.ok(override);
    assert.equal(override.fridge_model_slug, "samsung-rf28r7351sr");
    assert.equal(override.reason, "FILTER_MAPPING_CONFLICT");
    assert.equal(override.public_status, "owner_review_required");
    assert.ok(override.public_message.includes("wrong filter family"));
    assert.ok(override.public_message.includes("no buying options appear yet"));
    assert.equal(
      override.internal_evidence_doc,
      "data/fridge/batch-production/drafts/samsung-rf28r7351sr-page-1-draft-v1.md",
    );
    assert.equal(isFridgeModelUnderOwnerReview("samsung-rf28r7351sr"), true);
  });

  it("does not flag non-quarantined model", () => {
    assert.equal(getFridgeModelReviewOverride("lg-lfxs26973s"), null);
    assert.equal(isFridgeModelUnderOwnerReview("lg-lfxs26973s"), false);
  });
});
