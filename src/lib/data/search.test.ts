import assert from "node:assert/strict";
import test from "node:test";

import { fridgeFlexibleSearchInput } from "./search";

test("fridgeFlexibleSearchInput extracts model token for `ge cfe28t`", () => {
  assert.equal(fridgeFlexibleSearchInput("ge cfe28t"), "cfe28t");
});

test("fridgeFlexibleSearchInput extracts model token for `frigidaire crss26`", () => {
  assert.equal(fridgeFlexibleSearchInput("frigidaire crss26"), "crss26");
});

test("fridgeFlexibleSearchInput keeps existing filter-word behavior", () => {
  assert.equal(
    fridgeFlexibleSearchInput("samsung rf30bb6600ql water filter"),
    "RF30BB6600QL",
  );
});

test("fridgeFlexibleSearchInput does not over-trigger generic brand query", () => {
  assert.equal(fridgeFlexibleSearchInput("ge refrigerator"), "ge refrigerator");
});
