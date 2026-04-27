import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";

import {
  buildFridgeNonAmazonCandidates,
  buildFridgeNonAmazonCandidatesWithDiscovery,
  inferredBrandPrefixForSlug,
} from "./fridge-non-amazon-candidate-generator";

test("adq75795101 does not generate samsung-prefixed AppliancePartsPros guess", () => {
  const candidates = buildFridgeNonAmazonCandidates("adq75795101");
  assert.equal(candidates.length, 1);
  assert.equal(candidates[0].url.includes("samsung-adq75795101"), false);
  assert.equal(candidates[0].url, "https://www.appliancepartspros.com/lg-adq75795101.html");
  assert.equal(candidates[0].source, "unverified_url_guess");
});

test("unknown brand slug does not generate brand-prefixed guessed URL", () => {
  const candidates = buildFridgeNonAmazonCandidates("mwf");
  assert.deepEqual(candidates, []);
  assert.equal(inferredBrandPrefixForSlug("mwf"), null);
});

test("samsung DA slugs still generate samsung unverified_url_guess", () => {
  const candidates = buildFridgeNonAmazonCandidates("da29-00019a");
  assert.equal(candidates.length, 1);
  assert.equal(candidates[0].url, "https://www.appliancepartspros.com/samsung-da29-00019a.html");
  assert.equal(candidates[0].source, "unverified_url_guess");
});

test("candidate generator has no write side effects", () => {
  const original = fs.writeFileSync;
  let writeCalled = false;
  const fakeWrite: typeof fs.writeFileSync = ((...args: Parameters<typeof fs.writeFileSync>) => {
    writeCalled = true;
    return original(...args);
  }) as typeof fs.writeFileSync;
  fs.writeFileSync = fakeWrite;
  try {
    const candidates = buildFridgeNonAmazonCandidates("da97-17376a");
    assert.equal(candidates.length, 1);
    assert.equal(writeCalled, false);
  } finally {
    fs.writeFileSync = original;
  }
});

test("search_discovered URL included and labeled correctly", async () => {
  const candidates = await buildFridgeNonAmazonCandidatesWithDiscovery({
    slug: "lt1000p",
    searchImpl: async () => [
      {
        url: "https://www.partselect.com/LT1000P-Refrigerator-Water-Filter.htm",
        snippet: "LT1000P refrigerator water filter in stock",
      },
    ],
  });
  assert.equal(candidates.length, 1);
  assert.equal(candidates[0].source, "search_discovered");
  assert.equal(candidates[0].retailer_key, "partselect");
});

test("search/category and amazon URLs are filtered out", async () => {
  const candidates = await buildFridgeNonAmazonCandidatesWithDiscovery({
    slug: "lt1000p",
    searchImpl: async () => [
      { url: "https://www.partselect.com/Search?SearchTerm=LT1000P", snippet: "search page" },
      { url: "https://www.amazon.com/dp/B000TEST", snippet: "amazon listing" },
    ],
  });
  assert.equal(candidates.length, 1);
  assert.equal(candidates[0].source, "unverified_url_guess");
});
