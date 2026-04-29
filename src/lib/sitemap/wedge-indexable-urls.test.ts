import assert from "node:assert/strict";
import test from "node:test";

import { __test_only__ } from "@/lib/sitemap/wedge-indexable-urls";

test("static sitemap paths do not include unfinished noindex wedges", () => {
  const previousSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  process.env.NEXT_PUBLIC_SITE_URL = "https://buckparts.com";
  try {
    const staticPaths = __test_only__.liveStaticPaths(new Date("2026-04-28T00:00:00.000Z"));
    const urls = staticPaths.map((row) => row.url);

    assert.equal(urls.some((url) => url.includes("/vacuum")), false);
    assert.equal(urls.some((url) => url.includes("/humidifier")), false);
    assert.equal(urls.some((url) => url.includes("/appliance-air")), false);
  } finally {
    if (previousSiteUrl === undefined) {
      delete process.env.NEXT_PUBLIC_SITE_URL;
    } else {
      process.env.NEXT_PUBLIC_SITE_URL = previousSiteUrl;
    }
  }
});

