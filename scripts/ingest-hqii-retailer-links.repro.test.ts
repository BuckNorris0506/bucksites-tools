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
