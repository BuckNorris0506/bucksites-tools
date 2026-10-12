import assert from "node:assert/strict";
import test from "node:test";

import {
  getAirPurifierModelReviewOverride,
  isAirPurifierModelUnderOwnerReview,
} from "@/lib/air-purifier/air-purifier-model-review-overrides";
import {
  filterCompatModelsForCustomerDisplayV1,
  filterPageCompatExclusionNoteV1,
} from "@/lib/air-purifier/air-purifier-compat-display-overrides-v1";

test("blueair-411a-max is under owner review for F4MAX vs PART411 conflict", () => {
  const override = getAirPurifierModelReviewOverride("blueair-411a-max");
  assert.ok(override);
  assert.equal(override.reason, "FILTER_MAPPING_CONFLICT");
  assert.match(override.public_message, /F4MAX/i);
  assert.match(override.public_message, /PART411/i);
  assert.equal(isAirPurifierModelUnderOwnerReview("blueair-411a-max"), true);
});

test("blueair-particle-411 hides 411a-max compat and surfaces caution note", () => {
  const note = filterPageCompatExclusionNoteV1("blueair-particle-411");
  assert.ok(note);
  assert.match(note!, /411a Max/i);
  const filtered = filterCompatModelsForCustomerDisplayV1("blueair-particle-411", [
    { slug: "blueair-411" },
    { slug: "blueair-411a-max" },
    { slug: "blueair-mini-max" },
  ]);
  assert.deepEqual(
    filtered.map((m) => m.slug),
    ["blueair-411", "blueair-mini-max"],
  );
});

test("HP302 customer display no longer special-cases the deleted stale parts", () => {
  const hp400Models = filterCompatModelsForCustomerDisplayV1("shark-hepa-hp400", [
    { slug: "shark-hp401" },
    { slug: "shark-hp302" },
  ]);
  assert.deepEqual(
    hp400Models.map((model) => model.slug),
    ["shark-hp401", "shark-hp302"],
  );
  assert.equal(filterPageCompatExclusionNoteV1("shark-hepa-hp400"), null);
  assert.equal(filterPageCompatExclusionNoteV1("shark-carbon-foam"), null);
});
