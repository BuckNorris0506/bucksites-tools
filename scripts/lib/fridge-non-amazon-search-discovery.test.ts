import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";

import {
  dedupeByNormalizedUrl,
  discoverFridgeNonAmazonCandidates,
  shouldAcceptSearchUrl,
} from "./fridge-non-amazon-search-discovery";

test("search_discovered URLs reject category/search and Amazon", () => {
  assert.equal(shouldAcceptSearchUrl("https://www.amazon.com/dp/B000TEST"), false);
  assert.equal(shouldAcceptSearchUrl("https://www.partselect.com/Search?SearchTerm=lt1000p"), false);
  assert.equal(shouldAcceptSearchUrl("https://www.partselect.com/LT1000P-Refrigerator-Water-Filter.htm"), true);
});

test("discovery dedupes by normalized URL", () => {
  const deduped = dedupeByNormalizedUrl([
    { url: "https://www.partselect.com/LT1000P-Refrigerator-Water-Filter.htm/" },
    { url: "https://www.partselect.com/LT1000P-Refrigerator-Water-Filter.htm" },
  ]);
  assert.equal(deduped.length, 1);
});

test("discovery returns search_discovered candidates from allowed retailer domains", async () => {
  const candidates = await discoverFridgeNonAmazonCandidates({
    slug: "lt1000p",
    maxCandidates: 3,
    searchImpl: async () => [
      {
        url: "https://www.partselect.com/LT1000P-Refrigerator-Water-Filter.htm",
        snippet: "Exact LT1000P available in stock",
      },
    ],
  });
  assert.equal(candidates.length, 1);
  assert.equal(candidates[0].source, "search_discovered");
  assert.equal(candidates[0].retailer_key, "partselect");
});

test("search discovery has no write side effects", async () => {
  const original = fs.writeFileSync;
  let writeCalled = false;
  const fakeWrite: typeof fs.writeFileSync = ((...args: Parameters<typeof fs.writeFileSync>) => {
    writeCalled = true;
    return original(...args);
  }) as typeof fs.writeFileSync;
  fs.writeFileSync = fakeWrite;
  try {
    await discoverFridgeNonAmazonCandidates({
      slug: "lt1000p",
      maxCandidates: 1,
      searchImpl: async () => [],
    });
    assert.equal(writeCalled, false);
  } finally {
    fs.writeFileSync = original;
  }
});
