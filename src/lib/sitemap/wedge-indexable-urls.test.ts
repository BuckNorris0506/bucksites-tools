import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  getSitemapLaunchVerticals,
  isVerticalLive,
  VERTICAL_SLUGS_WITH_HOMEKEEP_SITEMAP_DISCOVERY,
} from "@/lib/catalog/vertical-launch-state";
import { isAirPurifierModelUnderOwnerReview } from "@/lib/air-purifier/air-purifier-model-review-overrides";
import { resolveFridgeCustomerSafetyV1 } from "@/lib/fridge/fridge-learned-failure-customer-guard-v1";
import { resolveFridgeModelPdpCustomerSafetyV1 } from "@/lib/fridge/fridge-model-pdp-customer-safety-v1";
import { __test_only__ } from "@/lib/sitemap/wedge-indexable-urls";

const REPO_ROOT = path.resolve(path.join(path.dirname(fileURLToPath(import.meta.url)), "../../.."));

test("static sitemap paths include only LIVE wedge hubs from vertical-launch-state", () => {
  const previousSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  process.env.NEXT_PUBLIC_SITE_URL = "https://buckparts.com";
  try {
    const live = new Set(getSitemapLaunchVerticals());
    const staticPaths = __test_only__.liveStaticPaths(new Date("2026-04-28T00:00:00.000Z"));
    const urls = staticPaths.map((row) => row.url);

    assert.equal(urls.some((url) => url.includes("/vacuum")), false);
    assert.equal(urls.some((url) => url.includes("/humidifier")), false);
    assert.equal(urls.some((url) => url.includes("/appliance-air")), false);
    assert.equal(
      urls.some((url) => url.includes("/whole-house-water")),
      live.has("whole-house-water"),
    );
    assert.equal(urls.some((url) => url.includes("/air-purifier")), live.has("air-purifier"));
    assert.equal(isVerticalLive("air-purifier"), true);
  } finally {
    if (previousSiteUrl === undefined) {
      delete process.env.NEXT_PUBLIC_SITE_URL;
    } else {
      process.env.NEXT_PUBLIC_SITE_URL = previousSiteUrl;
    }
  }
});

test("dynamic sitemap URL emission includes only LIVE operational wedges", () => {
  const verticals = __test_only__.getSitemapDynamicUrlVerticals();
  const expected = VERTICAL_SLUGS_WITH_HOMEKEEP_SITEMAP_DISCOVERY.filter((vertical) =>
    isVerticalLive(vertical),
  ).sort();
  assert.deepEqual(verticals.sort(), expected);
  assert.ok(expected.includes("air-purifier"));
  assert.ok(expected.includes("refrigerator"));
});

test("AP owner-review model blueair-411a-max is not sitemap-indexable", () => {
  assert.equal(isAirPurifierModelUnderOwnerReview("blueair-411a-max"), true);
  assert.equal(__test_only__.isApModelSitemapIndexable("blueair-411a-max", true), false);
});

test("AP indexable model with mapped filters remains sitemap-indexable", () => {
  assert.equal(__test_only__.isApModelSitemapIndexable("shark-hp150", true), true);
});

test("zero-mapping models are excluded for AP and fridge sitemap indexability", () => {
  assert.equal(__test_only__.isApModelSitemapIndexable("shark-hp150", false), false);
  assert.equal(__test_only__.isFridgeModelSitemapIndexable("samsung-rf28r7351sr", false), false);
});

test("fridge quarantine and prefer_noindex safety gates are reused for sitemap indexability", () => {
  const quarantined = resolveFridgeCustomerSafetyV1({ fridgeModelSlug: "samsung-rf18hfenbww" });
  assert.equal(quarantined.quarantine, true);
  assert.equal(__test_only__.isFridgeModelSitemapIndexable("samsung-rf18hfenbww", true), false);

  const preferNoindex = resolveFridgeModelPdpCustomerSafetyV1({
    fridgeModelSlug: "frigidaire-fghb2868pf",
    rootDir: REPO_ROOT,
  });
  assert.equal(preferNoindex.prefer_noindex, true);
  assert.equal(__test_only__.isFridgeModelSitemapIndexable("frigidaire-fghb2868pf", true), false);

  assert.equal(__test_only__.isFridgeModelSitemapIndexable("samsung-rf28r7351sr", true), true);
});

test("filter URL emission still uses useful-id gates only", () => {
  const src = readFileSync(
    path.join(REPO_ROOT, "src/lib/sitemap/wedge-indexable-urls.ts"),
    "utf8",
  );
  assert.match(src, /filterSlugsByIds\("filters", usefulFridge\)/);
  assert.match(src, /filterSlugsByIds\("air_purifier_filters", usefulAp\)/);
  assert.match(src, /loadRefrigeratorUsefulFilterIds\(\)/);
  assert.match(src, /loadAirPurifierUsefulFilterIds\(\)/);
  assert.doesNotMatch(src, /allSlugsFromTable\("filters"\)/);
  assert.doesNotMatch(src, /allSlugsFromTable\("air_purifier_filters"\)/);
});
