import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { NextRequest } from "next/server";

import {
  GO_LINK_UUID_RE,
  buildGoClickEventInsertRow,
  goFallbackRedirect,
  logClickEventForGoRoute,
  nextResponseRedirectAffiliateIfSafe,
} from "@/lib/retailers/go-affiliate-route-handler";
import { setMonitoringClientForTests } from "@/lib/monitoring/error-monitoring";
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

/** Keys the Supabase `click_events` table must accept for PostgREST inserts from /go (fridge wedge shape). */
const FRIDGE_CLICK_EVENTS_INSERT_KEYS = [
  "filter_id",
  "retailer_slug",
  "page_type",
  "page_slug",
  "target_url",
  "user_agent",
  "referrer",
] as const;

describe("buildGoClickEventInsertRow", () => {
  it("emits the click_events insert contract keys required for PostgREST (target_url must exist on table)", () => {
    const go = nextResponseRedirectAffiliateIfSafe(
      "amazon",
      "https://www.amazon.com/dp/B00CONTRACT",
      "direct_buyable",
    );
    assert.ok(go);
    const row = buildGoClickEventInsertRow(
      go,
      {
        filter_id: "d8d2fdea-90c0-42e2-a63a-53002a0e5d42",
        retailer_slug: "oem-test",
        page_type: "refrigerator_filter",
        page_slug: "lt1000p",
      },
      requestAt("https://buckparts.com/go/x", { "user-agent": "Mozilla/5.0 (contract)", referer: "https://buckparts.com/" }),
    );
    for (const k of FRIDGE_CLICK_EVENTS_INSERT_KEYS) {
      assert.ok(Object.prototype.hasOwnProperty.call(row, k), `missing contract key: ${k}`);
    }
    assert.equal(typeof row.target_url, "string");
    assert.ok(row.target_url.length > 0, "target_url must be non-empty for logged outbound");
  });

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

describe("logClickEventForGoRoute monitoring", () => {
  it("captures insert exceptions without changing the redirect result", async () => {
    const previousDsn = process.env.SENTRY_DSN;
    const previousUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const previousAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    process.env.SENTRY_DSN = "https://example.invalid/1";
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    const contexts: unknown[] = [];
    const restore = setMonitoringClientForTests({
      captureException: (_error, context) => {
        contexts.push(context);
      },
      captureMessage: () => {},
    });
    try {
      const go = nextResponseRedirectAffiliateIfSafe(
        "amazon",
        "https://www.amazon.com/dp/B00SAFELOG?tag=raw-tag",
        "direct_buyable",
      );
      assert.ok(go);

      await assert.doesNotReject(() =>
        logClickEventForGoRoute(
          requestAt("https://buckparts.com/go/x"),
          go,
          {
            filter_id: "filter-1",
            retailer_slug: "amazon",
            page_type: "refrigerator_filter",
            page_slug: "lt1000p",
          },
          "[go/test]",
        ),
      );

      assert.equal(go.response.headers.get("location"), go.outboundUrl);
      assert.equal(contexts.length, 1);
      assert.deepEqual(contexts[0], {
        tags: { area: "go_click_events_insert_exception" },
        extra: {
          log_prefix: "[go/test]",
          target_url: "https://www.amazon.com/dp/B00SAFELOG",
          page_type: "refrigerator_filter",
          page_slug: "lt1000p",
          retailer_slug: "amazon",
        },
      });
    } finally {
      restore();
      if (previousDsn == null) delete process.env.SENTRY_DSN;
      else process.env.SENTRY_DSN = previousDsn;
      if (previousUrl == null) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      else process.env.NEXT_PUBLIC_SUPABASE_URL = previousUrl;
      if (previousAnon == null) delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      else process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = previousAnon;
    }
  });
});

describe("fridge /go unsafe fallback", () => {
  it("redirects to /go-unavailable instead of home when id, row, or gate blocks outbound", () => {
    const abs = path.join(process.cwd(), "src/app/go/[linkId]/route.ts");
    const src = fs.readFileSync(abs, "utf8");
    assert.ok(
      !src.includes('goFallbackRedirect(request, "/")'),
      "fridge wedge go must not silently fall back to homepage",
    );
    const fallbacks = src.match(/goFallbackRedirect\(\s*request\s*,\s*"([^"]+)"\s*\)/g) ?? [];
    assert.equal(fallbacks.length, 4, "expected four goFallbackRedirect calls");
    assert.ok(
      fallbacks.every((line) => line.includes('"/go-unavailable"')),
      `all fridge go fallbacks must target /go-unavailable: ${fallbacks.join(" | ")}`,
    );
  });

  it("serves go-unavailable page with search and home links", () => {
    const abs = path.join(process.cwd(), "src/app/go-unavailable/page.tsx");
    const src = fs.readFileSync(abs, "utf8");
    assert.ok(src.includes('href="/search"'));
    assert.ok(src.includes('href="/"'));
    assert.ok(src.includes("BuckParts could not safely open that store listing"));
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
