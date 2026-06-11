import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  isFridgeModelSingleFilterFamilyAmbiguousV1,
  resetSingleFilterFamilyAmbiguityGuardIndexCacheForTestsV1,
  setLearnedFailureGuardsAuditUnavailableForTestsV1,
} from "@/lib/fridge/fridge-single-filter-family-ambiguity-v1";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

test("detects GSWF GE model single_filter_family WARN ambiguity", () => {
  resetSingleFilterFamilyAmbiguityGuardIndexCacheForTestsV1();
  assert.equal(
    isFridgeModelSingleFilterFamilyAmbiguousV1({
      fridgeModelSlug: "ge-gfe28gmkbb",
      rootDir: ROOT,
    }),
    true,
  );
});

test("PASS single-family samsung model is not ambiguous", () => {
  resetSingleFilterFamilyAmbiguityGuardIndexCacheForTestsV1();
  assert.equal(
    isFridgeModelSingleFilterFamilyAmbiguousV1({
      fridgeModelSlug: "samsung-rf28r7351sr",
      rootDir: ROOT,
    }),
    false,
  );
});

test("BLOCK samsung model is not classified as single_filter_family ambiguous", () => {
  resetSingleFilterFamilyAmbiguityGuardIndexCacheForTestsV1();
  assert.equal(
    isFridgeModelSingleFilterFamilyAmbiguousV1({
      fridgeModelSlug: "samsung-rf18hfenbww",
      rootDir: ROOT,
    }),
    false,
  );
});

test("missing guard audit data fails closed as ambiguous", () => {
  resetSingleFilterFamilyAmbiguityGuardIndexCacheForTestsV1();
  setLearnedFailureGuardsAuditUnavailableForTestsV1(true);
  assert.equal(
    isFridgeModelSingleFilterFamilyAmbiguousV1({ fridgeModelSlug: "samsung-rf28r7351sr" }),
    true,
  );
  setLearnedFailureGuardsAuditUnavailableForTestsV1(false);
});
