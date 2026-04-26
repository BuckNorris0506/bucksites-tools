/**
 * Authoritative repro for HQII ingestion URL hygiene (repo truth: `normalizeUrl` +
 * `urlLooksLikeProductLevel` in `ingest-hqii-retailer-links.ts`).
 *
 * Trust invariant we lock here:
 * - Valid Amazon PDP paths with `/dp/{ASIN}` canonicalize to `https://www.amazon.com/dp/{ASIN}` and pass product-level gate.
 * - Amazon browse/search on `/s` (with or without query) is NOT product-level and must be rejected by the gate.
 *
 * Note: `normalizeUrl` does NOT strip generic `/s?...` query parameters (only tracking/utm keys). Tests must not
 * require bare `/s` unless production code is changed to do that.
 */
import assert from "node:assert/strict";
import test from "node:test";

import { __testables } from "./ingest-hqii-retailer-links";

test("repro fixture: valid Amazon Pentek PDP normalizes to canonical /dp URL", () => {
  const raw =
    "https://www.amazon.com/Pentek-CFB-PLUS10BB-Fibredyne-Modified-Carbon/dp/B00LP8LJUG/";
  const normalized = __testables.normalizeUrl(raw);
  assert.equal(normalized, "https://www.amazon.com/dp/B00LP8LJUG");
  assert.equal(__testables.urlLooksLikeProductLevel(normalized ?? ""), true);
});

test("repro fixture: Amazon /s search URL is not product-level (query may be preserved)", () => {
  const raw = "https://www.amazon.com/s?k=B00LP8LJUG";
  const normalized = __testables.normalizeUrl(raw);
  assert.ok(normalized);
  const u = new URL(normalized);
  assert.equal(u.hostname, "www.amazon.com");
  assert.equal(u.pathname, "/s");
  assert.ok(u.search.includes("k="), "expected search query to survive non-tracking normalization");
  assert.equal(__testables.urlLooksLikeProductLevel(normalized), false);
});

test("repro fixture: Amazon /s category-style URL is not product-level (query may be preserved)", () => {
  const raw =
    "https://www.amazon.com/s?i=tools&rh=n%3A228013%2Cp_89%3APentek";
  const normalized = __testables.normalizeUrl(raw);
  assert.ok(normalized);
  const u = new URL(normalized);
  assert.equal(u.pathname, "/s");
  assert.equal(__testables.urlLooksLikeProductLevel(normalized), false);
});

test("repro fixture: bare Amazon /s path is not product-level", () => {
  const raw = "https://www.amazon.com/s";
  const normalized = __testables.normalizeUrl(raw);
  assert.equal(normalized, "https://www.amazon.com/s");
  assert.equal(__testables.urlLooksLikeProductLevel(normalized ?? ""), false);
});

test("appliancepartspros PDP .html URL is product-level", () => {
  const raw =
    "https://www.appliancepartspros.com/samsung-assy-case-filter-da97-08006b-ap4578378.html";
  const normalized = __testables.normalizeUrl(raw);
  assert.equal(
    normalized,
    "https://www.appliancepartspros.com/samsung-assy-case-filter-da97-08006b-ap4578378.html",
  );
  assert.equal(__testables.urlLooksLikeProductLevel(normalized ?? ""), true);
});

test("appliancepartspros search/category-style URLs are not product-level", () => {
  const searchRaw = "https://www.appliancepartspros.com/search.aspx?model=rf4287hars";
  const categoryRaw = "https://www.appliancepartspros.com/refrigerator-parts";
  const searchNormalized = __testables.normalizeUrl(searchRaw);
  const categoryNormalized = __testables.normalizeUrl(categoryRaw);
  assert.equal(searchNormalized, "https://www.appliancepartspros.com/search.aspx?model=rf4287hars");
  assert.equal(categoryNormalized, "https://www.appliancepartspros.com/refrigerator-parts");
  assert.equal(__testables.urlLooksLikeProductLevel(searchNormalized ?? ""), false);
  assert.equal(__testables.urlLooksLikeProductLevel(categoryNormalized ?? ""), false);
});

test("existing accepted non-Amazon product URL patterns still pass", () => {
  const raw = "https://www.example.com/products/filter-abc";
  const normalized = __testables.normalizeUrl(raw);
  assert.equal(normalized, "https://www.example.com/products/filter-abc");
  assert.equal(__testables.urlLooksLikeProductLevel(normalized ?? ""), true);
});

test("existing rejected non-product URL patterns still fail", () => {
  const raw = "https://www.example.com/collections/refrigerator-filters";
  const normalized = __testables.normalizeUrl(raw);
  assert.equal(normalized, "https://www.example.com/collections/refrigerator-filters");
  assert.equal(__testables.urlLooksLikeProductLevel(normalized ?? ""), false);
});

test("appliancepartspros PDP with exact-token evidence classifies direct_buyable", () => {
  const url = "https://www.appliancepartspros.com/samsung-assy-case-filter-da97-08006b-ap4578378.html";
  const notes =
    "Replacement listing (reseller PDP). Exact token DA97-08006B present on PDP. Cross-reference explicit.";
  assert.equal(__testables.classifyDiscovery("appliancepartspros", url, notes), "direct_buyable");
});

test("appliancepartspros search/category URLs never classify direct_buyable", () => {
  const notes = "Exact token DA97-08006B present on PDP.";
  assert.equal(
    __testables.classifyDiscovery(
      "appliancepartspros",
      "https://www.appliancepartspros.com/search.aspx?model=rf4287hars",
      notes,
    ),
    "likely_valid",
  );
  assert.equal(
    __testables.classifyDiscovery(
      "appliancepartspros",
      "https://www.appliancepartspros.com/refrigerator-parts",
      notes,
    ),
    "likely_valid",
  );
});

test("generic unknown non-Amazon retailers stay conservative", () => {
  const notes = "Exact token DA97-08006B present on PDP.";
  assert.equal(
    __testables.classifyDiscovery("unknown-shop", "https://www.unknown-shop.com/product/da97-08006b", notes),
    "likely_valid",
  );
});

test("existing Amazon and official retailer classification stays unchanged", () => {
  assert.equal(
    __testables.classifyDiscovery("amazon", "https://www.amazon.com/dp/B00LP8LJUG", "anything"),
    "direct_buyable",
  );
  assert.equal(
    __testables.classifyDiscovery("oem-samsung", "https://www.example.com/product/xyz", null),
    "direct_buyable",
  );
});
