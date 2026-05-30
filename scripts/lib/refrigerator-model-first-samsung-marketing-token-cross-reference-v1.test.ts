import assert from "node:assert/strict";
import test from "node:test";

import {
  isSamsungRefrigeratorMarketingTokenV1,
  legacyFilterSlugsMatchOfficialTokenV1,
  samsungRefrigeratorLegacySlugMatchesMarketingTokenV1,
} from "./refrigerator-model-first-samsung-marketing-token-cross-reference-v1";

const FILTER_OEM_BY_SLUG = new Map<string, string>([
  ["da97-17376a", "DA97-17376A"],
  ["da97-17376b", "DA97-17376B"],
  ["da29-00020b", "DA29-00020B"],
  ["da29-00020a", "DA29-00020A"],
  ["lt1000p", "LT1000P"],
  ["lt600p", "LT600P"],
  ["rpwfe", "RPWFE"],
  ["mwf", "MWF"],
]);

test("HAF-QIN validates DA97-17376A and DA97-17376B family slugs", () => {
  assert.equal(isSamsungRefrigeratorMarketingTokenV1("HAF-QIN"), true);
  assert.equal(
    samsungRefrigeratorLegacySlugMatchesMarketingTokenV1({
      officialToken: "HAF-QIN",
      filterSlug: "da97-17376a",
    }),
    true,
  );
  assert.equal(
    samsungRefrigeratorLegacySlugMatchesMarketingTokenV1({
      officialToken: "HAF-QIN",
      filterSlug: "da97-17376b",
    }),
    true,
  );
  assert.equal(
    legacyFilterSlugsMatchOfficialTokenV1({
      brandSlug: "samsung",
      officialToken: "HAF-QIN",
      legacyFilterSlugs: ["da97-17376a", "da97-17376b"],
      filterOemBySlug: FILTER_OEM_BY_SLUG,
    }),
    true,
  );
  assert.equal(
    legacyFilterSlugsMatchOfficialTokenV1({
      brandSlug: "samsung",
      officialToken: "HAF-QIN",
      legacyFilterSlugs: ["da97-17376b"],
      filterOemBySlug: FILTER_OEM_BY_SLUG,
    }),
    true,
  );
});

test("HAF-CIN validates DA29-00020B family slug only", () => {
  assert.equal(isSamsungRefrigeratorMarketingTokenV1("HAF-CIN"), true);
  assert.equal(
    samsungRefrigeratorLegacySlugMatchesMarketingTokenV1({
      officialToken: "HAF-CIN",
      filterSlug: "da29-00020b",
    }),
    true,
  );
  assert.equal(
    legacyFilterSlugsMatchOfficialTokenV1({
      brandSlug: "samsung",
      officialToken: "HAF-CIN",
      legacyFilterSlugs: ["da29-00020b"],
      filterOemBySlug: FILTER_OEM_BY_SLUG,
    }),
    true,
  );
});

test("wrong-family Samsung slugs still fail cross-reference", () => {
  assert.equal(
    samsungRefrigeratorLegacySlugMatchesMarketingTokenV1({
      officialToken: "HAF-QIN",
      filterSlug: "da29-00020b",
    }),
    false,
  );
  assert.equal(
    samsungRefrigeratorLegacySlugMatchesMarketingTokenV1({
      officialToken: "HAF-CIN",
      filterSlug: "da97-17376b",
    }),
    false,
  );
  assert.equal(
    legacyFilterSlugsMatchOfficialTokenV1({
      brandSlug: "samsung",
      officialToken: "HAF-QIN",
      legacyFilterSlugs: ["da97-17376b", "da29-00020b"],
      filterOemBySlug: FILTER_OEM_BY_SLUG,
    }),
    false,
  );
  assert.equal(
    legacyFilterSlugsMatchOfficialTokenV1({
      brandSlug: "samsung",
      officialToken: "HAF-CIN",
      legacyFilterSlugs: ["da29-00020a"],
      filterOemBySlug: FILTER_OEM_BY_SLUG,
    }),
    false,
  );
});

test("non-Samsung brands keep strict exact-token gates", () => {
  assert.equal(isSamsungRefrigeratorMarketingTokenV1("LT1000P"), false);
  assert.equal(
    legacyFilterSlugsMatchOfficialTokenV1({
      brandSlug: "lg",
      officialToken: "LT1000P",
      legacyFilterSlugs: ["lt1000p"],
      filterOemBySlug: FILTER_OEM_BY_SLUG,
    }),
    true,
  );
  assert.equal(
    legacyFilterSlugsMatchOfficialTokenV1({
      brandSlug: "lg",
      officialToken: "LT1000P",
      legacyFilterSlugs: ["lt600p"],
      filterOemBySlug: FILTER_OEM_BY_SLUG,
    }),
    false,
  );
  assert.equal(
    legacyFilterSlugsMatchOfficialTokenV1({
      brandSlug: "ge",
      officialToken: "RPWFE",
      legacyFilterSlugs: ["mwf"],
      filterOemBySlug: FILTER_OEM_BY_SLUG,
    }),
    false,
  );
});

test("Samsung cross-reference does not apply to non-marketing Samsung OEM tokens", () => {
  assert.equal(
    legacyFilterSlugsMatchOfficialTokenV1({
      brandSlug: "samsung",
      officialToken: "DA97-17376B",
      legacyFilterSlugs: ["da97-17376b"],
      filterOemBySlug: FILTER_OEM_BY_SLUG,
    }),
    true,
  );
  assert.equal(
    legacyFilterSlugsMatchOfficialTokenV1({
      brandSlug: "samsung",
      officialToken: "DA97-17376B",
      legacyFilterSlugs: ["da97-17376a"],
      filterOemBySlug: FILTER_OEM_BY_SLUG,
    }),
    false,
  );
});
