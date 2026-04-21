import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  AMAZON_AFFILIATE_TAG,
  isAffiliateUrlSafeForGoRedirect,
  isHttpOrHttpsUrl,
  nextResponseRedirectAffiliateIfSafe,
} from "@/lib/retailers/go-redirect-gate";

describe("go-redirect-gate", () => {
  describe("isHttpOrHttpsUrl", () => {
    it("accepts https and http", () => {
      assert.equal(isHttpOrHttpsUrl("https://example.com/p"), true);
      assert.equal(isHttpOrHttpsUrl("http://example.com/p"), true);
    });
    it("rejects non-http(s) schemes used for XSS / exfil", () => {
      assert.equal(isHttpOrHttpsUrl("javascript:alert(1)"), false);
      assert.equal(isHttpOrHttpsUrl("data:text/html,hi"), false);
    });
    it("rejects malformed URLs", () => {
      assert.equal(isHttpOrHttpsUrl("not a url"), false);
    });
  });

  describe("isAffiliateUrlSafeForGoRedirect", () => {
    it("allows a normal retailer PDP", () => {
      assert.equal(
        isAffiliateUrlSafeForGoRedirect(
          "amazon",
          "https://www.amazon.com/dp/B00EXAMPLE",
          "direct_buyable",
        ),
        true,
      );
    });

    it("blocks web-search placeholder keys", () => {
      assert.equal(
        isAffiliateUrlSafeForGoRedirect(
          "google-search",
          "https://www.amazon.com/dp/B00EXAMPLE",
        ),
        false,
      );
    });

    it("blocks generic Google SERP URLs even with benign retailer_key", () => {
      assert.equal(
        isAffiliateUrlSafeForGoRedirect(
          "amazon",
          "https://www.google.com/search?q=water+filter",
        ),
        false,
      );
    });

    it("blocks OEM catalog slot + manufacturer site-search URL shape", () => {
      assert.equal(
        isAffiliateUrlSafeForGoRedirect(
          "oem-catalog",
          "https://parts.example.com/search?q=filter&catalog=1",
        ),
        false,
      );
    });

    it("blocks OEM catalog slot + 3M-style Ntt site search URLs", () => {
      assert.equal(
        isAffiliateUrlSafeForGoRedirect(
          "oem-catalog",
          "https://www.3m.com/3M/en_US/water-filtration-us/search/?Ntt=AP810",
          "likely_valid",
        ),
        false,
      );
    });

    it("blocks OEM likely_valid rows until direct-buy proof exists", () => {
      assert.equal(
        isAffiliateUrlSafeForGoRedirect(
          "oem-catalog",
          "https://www.honeywellstore.com/store/products/true-hepa-replacement-filter-r-hrf-r1.htm",
          "likely_valid",
        ),
        false,
      );
    });

    it("allows OEM rows with direct_buyable proof", () => {
      assert.equal(
        isAffiliateUrlSafeForGoRedirect(
          "oem-catalog",
          "https://www.honeywellstore.com/store/products/true-hepa-replacement-filter-r-hrf-r1.htm",
          "direct_buyable",
        ),
        true,
      );
    });

    it("blocks Austin Air homepage ?s= search URLs", () => {
      assert.equal(
        isAffiliateUrlSafeForGoRedirect(
          "oem-catalog",
          "https://austinair.com/?s=FR400",
          "likely_valid",
        ),
        false,
      );
    });

    it("blocks the proven Solventum AP810 product/details page", () => {
      assert.equal(
        isAffiliateUrlSafeForGoRedirect(
          "oem-solventum-ap810-case-pdp",
          "https://www.solventum.com/en-us/home/v/v000075117/",
          "likely_valid",
        ),
        false,
      );
    });

    it("blocks the proven Kinetico dealer-network page", () => {
      assert.equal(
        isAffiliateUrlSafeForGoRedirect(
          "oem-catalog",
          "https://www.kinetico.com/en-us/for-home/water-filtration/",
          "likely_valid",
        ),
        false,
      );
    });

    it("blocks the proven broken GE MWF destination", () => {
      assert.equal(
        isAffiliateUrlSafeForGoRedirect(
          "oem-parts-catalog",
          "https://www.geapplianceparts.com/store/parts/spec/MWF",
          "likely_valid",
        ),
        false,
      );
    });

    it("rejects empty target", () => {
      assert.equal(isAffiliateUrlSafeForGoRedirect("amazon", ""), false);
      assert.equal(isAffiliateUrlSafeForGoRedirect("amazon", "   "), false);
    });

    it("blocks browser-truth search-results classifications", () => {
      assert.equal(
        isAffiliateUrlSafeForGoRedirect(
          "amazon",
          "https://www.amazon.com/dp/B00EXAMPLE",
          "likely_search_results",
        ),
        false,
      );
    });

    it("blocks browser-truth not-found classifications", () => {
      assert.equal(
        isAffiliateUrlSafeForGoRedirect(
          "amazon",
          "https://www.amazon.com/dp/B00EXAMPLE",
          "likely_not_found",
        ),
        false,
      );
    });

    it("blocks browser-truth blocked classifications", () => {
      assert.equal(
        isAffiliateUrlSafeForGoRedirect(
          "amazon",
          "https://www.amazon.com/dp/B00EXAMPLE",
          "likely_blocked",
        ),
        false,
      );
    });

    it("blocks browser-truth timeout classifications", () => {
      assert.equal(
        isAffiliateUrlSafeForGoRedirect(
          "amazon",
          "https://www.amazon.com/dp/B00EXAMPLE",
          "timeout",
        ),
        false,
      );
    });

    it("blocks browser-truth browser_error classifications", () => {
      assert.equal(
        isAffiliateUrlSafeForGoRedirect(
          "amazon",
          "https://www.amazon.com/dp/B00EXAMPLE",
          "browser_error",
        ),
        false,
      );
    });

    it("allows direct_buyable browser-truth classification", () => {
      assert.equal(
        isAffiliateUrlSafeForGoRedirect(
          "amazon",
          "https://www.amazon.com/dp/B00EXAMPLE",
          "direct_buyable",
        ),
        true,
      );
    });

    it("blocks non-OEM likely_valid rows until explicit buy proof exists", () => {
      assert.equal(
        isAffiliateUrlSafeForGoRedirect(
          "amazon",
          "https://www.amazon.com/dp/B00EXAMPLE",
          "likely_valid",
        ),
        false,
      );
    });

    it("blocks missing browser-truth classification", () => {
      assert.equal(
        isAffiliateUrlSafeForGoRedirect(
          "amazon",
          "https://www.amazon.com/dp/B00EXAMPLE",
        ),
        false,
      );
    });
  });

  describe("nextResponseRedirectAffiliateIfSafe", () => {
    it("returns response + outboundUrl; Location matches outboundUrl exactly (Amazon tag)", () => {
      const url = "https://www.amazon.com/dp/B00EXAMPLE";
      const expected = `https://www.amazon.com/dp/B00EXAMPLE?tag=${AMAZON_AFFILIATE_TAG}`;
      const r = nextResponseRedirectAffiliateIfSafe("amazon", url, "direct_buyable");
      assert.ok(r);
      assert.equal(r.outboundUrl, expected);
      assert.equal(r.response.status, 302);
      assert.equal(r.response.headers.get("location"), r.outboundUrl);
    });

    it("trims affiliate URL for both outboundUrl and Location", () => {
      const url = "https://www.amazon.com/dp/B00EXAMPLE";
      const expected = `https://www.amazon.com/dp/B00EXAMPLE?tag=${AMAZON_AFFILIATE_TAG}`;
      const r = nextResponseRedirectAffiliateIfSafe("amazon", `  ${url}  `, "direct_buyable");
      assert.ok(r);
      assert.equal(r.outboundUrl, expected);
      assert.equal(r.response.headers.get("location"), expected);
    });

    it("returns null when the URL would not be safe to redirect", () => {
      assert.equal(
        nextResponseRedirectAffiliateIfSafe(
          "google-search",
          "https://www.amazon.com/dp/x",
          undefined,
        ),
        null,
      );
    });

    it("returns null when browser-truth classification is not live-safe", () => {
      assert.equal(
        nextResponseRedirectAffiliateIfSafe(
          "amazon",
          "https://www.amazon.com/dp/x",
          "likely_search_results",
        ),
        null,
      );
    });

    it("returns null when browser-truth classification is missing", () => {
      assert.equal(
        nextResponseRedirectAffiliateIfSafe(
          "amazon",
          "https://www.amazon.com/dp/x",
          undefined,
        ),
        null,
      );
    });
  });
});
