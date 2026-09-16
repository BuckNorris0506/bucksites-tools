import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

function read(rel: string): string {
  return readFileSync(join(process.cwd(), rel), "utf8");
}

test("global search uses Core 300 same-filter grouping without changing catalog imports", () => {
  const src = read("src/app/search/page.tsx");
  assert.match(src, /layoutCore300SameFilterSearchHitsV1/);
  assert.match(src, /Core300OriginalFilterAnswerCard/);
  assert.match(src, /CATALOG_AIR_PURIFIER_FILTERS/);
  assert.doesNotMatch(src, /compatibility_mappings/);
  assert.doesNotMatch(src, /retailer_links/);
});

test("air purifier search uses the same Core 300 grouping helper", () => {
  const src = read("src/app/air-purifier/search/page.tsx");
  assert.match(src, /layoutCore300SameFilterSearchHitsV1/);
  assert.match(src, /Core300IdentityFamilyCard/);
  assert.match(src, /otherListingsLabel/);
});
