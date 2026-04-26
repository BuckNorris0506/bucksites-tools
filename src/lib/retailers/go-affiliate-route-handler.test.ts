import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { NextRequest } from "next/server";

import {
  GO_LINK_UUID_RE,
  buildGoClickEventInsertRow,
  goFallbackRedirect,
  nextResponseRedirectAffiliateIfSafe,
} from "@/lib/retailers/go-affiliate-route-handler";
import {
  AMAZON_AFFILIATE_TAG,
  applyAmazonAffiliateRedirectUrl,
} from "@/lib/retailers/go-redirect-gate";

function requestAt(url: string, headers?: Record<string, string>): NextRequest {
  return new NextRequest(url, { headers: new Headers(headers ?? {}) });
}

describe("GO_LINK_UUID_RE", () => {
  it("accepts standard lowercase UUID link ids", () => {
    assert.ok(GO_LINK_UUID_RE.test("550e8400-e29b-41d4-a716-446655440000"));
  });
  it("accepts uppercase hex UUIDs", () => {
    assert.ok(GO_LINK_UUID_RE.test("550E8400-E29B-41D4-A716-446655440000"));
  });
  it("rejects non-UUID strings", () => {
    assert.ok(!GO_LINK_UUID_RE.test("not-a-uuid"));
    assert.ok(!GO_LINK_UUID_RE.test("550e8400-e29b-41d4-a716")); // too short
    assert.ok(!GO_LINK_UUID_RE.test("550e8400-e29b-41d4-a716-446655440000-extra"));
  });
});

describe("goFallbackRedirect", () => {
  it("returns 302 to request origin + wedge path", () => {
    const r = goFallbackRedirect(
      requestAt("https://shop.example.com/vacuum/go/abc"),
      "/vacuum",
    );
    assert.equal(r.status, 302);
    assert.equal(r.headers.get("location"), "https://shop.example.com/vacuum");
  });
  it("preserves request origin (including non-default port) for fallback Location", () => {
    const url = "http://127.0.0.1:3000/air-purifier/go/x";
    const req = requestAt(url);
    const origin = new URL(req.url).origin;
    const r = goFallbackRedirect(req, "/air-purifier");
    assert.equal(r.headers.get("location"), `${origin}/air-purifier`);
  });
});

describe("buildGoClickEventInsertRow", () => {
  it("sets target_url to go.outboundUrl (canonical), not raw affiliate from wedge keys", () => {
    const go = nextResponseRedirectAffiliateIfSafe(
      "amazon",
      "https://www.amazon.com/dp/B00CANON",
      "direct_buyable",
    );
    assert.ok(go);
    const row = buildGoClickEventInsertRow(
      go,
      {
        vacuum_retailer_link_id: "550e8400-e29b-41d4-a716-446655440000",
        affiliate_url: "https://www.amazon.com/dp/B00WRONG",
      },
      requestAt("https://x.test/go/y", { "user-agent": "UA", referer: "https://ref/" }),
    );
    assert.equal(
      row.target_url,
      `https://www.amazon.com/dp/B00CANON?tag=${AMAZON_AFFILIATE_TAG}`,
    );
    assert.equal(row.vacuum_retailer_link_id, "550e8400-e29b-41d4-a716-446655440000");
    assert.equal(row.affiliate_url, "https://www.amazon.com/dp/B00WRONG");
    assert.equal(row.user_agent, "UA");
    assert.equal(row.referrer, "https://ref/");
  });
  it("overwrites poisoned target_url in wedgeKeys with canonical outbound", () => {
    const go = nextResponseRedirectAffiliateIfSafe(
      "amazon",
      "https://www.amazon.com/dp/B00SAFE",
      "direct_buyable",
    );
    assert.ok(go);
    const row = buildGoClickEventInsertRow(
      go,
      { target_url: "https://evil.example/phish" },
      requestAt("https://x.test/go/y"),
    );
    assert.equal(
      row.target_url,
      `https://www.amazon.com/dp/B00SAFE?tag=${AMAZON_AFFILIATE_TAG}`,
    );
  });
  it("uses trimmed outbound from gate (matches Location)", () => {
    const go = nextResponseRedirectAffiliateIfSafe(
      "amazon",
      "  https://www.amazon.com/dp/B00TRIM  ",
      "direct_buyable",
    );
    assert.ok(go);
    const row = buildGoClickEventInsertRow(go, { id: "1" }, requestAt("https://x.test/"));
    assert.equal(
      row.target_url,
      `https://www.amazon.com/dp/B00TRIM?tag=${AMAZON_AFFILIATE_TAG}`,
    );
    assert.equal(go.response.headers.get("location"), row.target_url);
  });
});

describe("nextResponseRedirectAffiliateIfSafe (re-export path)", () => {
  it("returns null for unsafe retailer hop (handler consumers rely on this)", () => {
    assert.equal(
      nextResponseRedirectAffiliateIfSafe("google-search", "https://www.amazon.com/dp/x"),
      null,
    );
  });
  it("returns response whose Location matches outboundUrl (includes Amazon tag)", () => {
    const u = "https://www.amazon.com/dp/B00X";
    const go = nextResponseRedirectAffiliateIfSafe("amazon", u, "direct_buyable");
    assert.ok(go);
    const expected = `https://www.amazon.com/dp/B00X?tag=${AMAZON_AFFILIATE_TAG}`;
    assert.equal(go.outboundUrl, expected);
    assert.equal(go.response.headers.get("location"), expected);
  });
});

describe("applyAmazonAffiliateRedirectUrl", () => {
  it("normalizes /dp/{ASIN} on subdomains to www + uppercase ASIN and preserves query", () => {
    const out = applyAmazonAffiliateRedirectUrl(
      "https://smile.amazon.com/dp/b000ast3ak/ref=nos?psc=1",
    );
    const u = new URL(out);
    assert.equal(u.origin, "https://www.amazon.com");
    assert.equal(u.pathname, "/dp/B000AST3AK");
    assert.equal(u.searchParams.get("psc"), "1");
    assert.equal(u.searchParams.get("tag"), AMAZON_AFFILIATE_TAG);
  });

  it("normalizes SEO slug + /dp/{ASIN} on www.amazon.com to canonical /dp + tag (Pentek CFB-PLUS10BB repro)", () => {
    const out = applyAmazonAffiliateRedirectUrl(
      "https://www.amazon.com/Pentek-CFB-PLUS10BB-Fibredyne-Modified-Carbon/dp/B00LP8LJUG/",
    );
    assert.equal(out, `https://www.amazon.com/dp/B00LP8LJUG?tag=${AMAZON_AFFILIATE_TAG}`);
  });

  it("does not duplicate tag (overwrites existing)", () => {
    const out = applyAmazonAffiliateRedirectUrl(
      `https://www.amazon.com/dp/B000AST3AK?tag=other&psc=1`,
    );
    const u = new URL(out);
    assert.equal(u.searchParams.get("tag"), AMAZON_AFFILIATE_TAG);
    assert.equal(u.searchParams.get("psc"), "1");
  });

  it("leaves non-Amazon URLs unchanged", () => {
    const u = "https://www.homedepot.com/p/foo/123";
    assert.equal(applyAmazonAffiliateRedirectUrl(u), u);
  });

  it("does not tag amazon.co.uk", () => {
    const u = "https://www.amazon.co.uk/dp/B000AST3AK";
    assert.equal(applyAmazonAffiliateRedirectUrl(u), u);
  });
});
