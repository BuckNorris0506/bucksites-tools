import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { OfficialProductReferenceLinks } from "@/components/trust/OfficialProductReferenceLinks";
import { isAffiliateUrlSafeForGoRedirect } from "@/lib/retailers/go-redirect-gate";
import {
  filterOfficialReferenceRetailerLinks,
  filterRealBuyRetailerLinks,
  isOfficialReferencePdpUrl,
  OFFICIAL_REFERENCE_RETAILER_KEYS,
} from "@/lib/retailers/launch-buy-links";

const SHARK_PDP =
  "https://www.sharkninja.com/hp150-hepa-filter/HE15FKPET.html";
const SHARK_SEARCH = "https://www.sharkclean.com/search?q=SHARK-HEPA-HP100";

function sharkLikelyValid(overrides: Record<string, string | null> = {}) {
  return {
    id: "shark-1",
    retailer_key: "shark-official",
    affiliate_url: SHARK_PDP,
    retailer_name: "Shark — official replacement filter (product page)",
    browser_truth_classification: "likely_valid",
    browser_truth_notes:
      "Playwright: PDP HE15FKPET; Notify me only; not search/404; wrong-family not dominant",
    browser_truth_checked_at: "2026-05-23T00:00:00.000Z",
    ...overrides,
  };
}

describe("isOfficialReferencePdpUrl", () => {
  it("accepts sharkninja product PDP paths", () => {
    assert.equal(isOfficialReferencePdpUrl(SHARK_PDP), true);
  });

  it("rejects manufacturer site search URLs", () => {
    assert.equal(isOfficialReferencePdpUrl(SHARK_SEARCH), false);
    assert.equal(
      isOfficialReferencePdpUrl("https://levoit.com/search?q=LEVOIT-RF-RAR029"),
      false,
    );
  });
});

describe("filterOfficialReferenceRetailerLinks", () => {
  it("includes allowlisted likely_valid Shark PDP with proof fields", () => {
    const rows = filterOfficialReferenceRetailerLinks([sharkLikelyValid()]);
    assert.equal(rows.length, 1);
    assert.equal(rows[0]?.retailer_key, "shark-official");
  });

  it("excludes likely_valid without proof notes/checked_at", () => {
    const rows = filterOfficialReferenceRetailerLinks([
      sharkLikelyValid({ browser_truth_notes: null, browser_truth_checked_at: null }),
    ]);
    assert.equal(rows.length, 0);
  });

  it("excludes non-allowlisted likely_valid retailer keys", () => {
    const rows = filterOfficialReferenceRetailerLinks([
      sharkLikelyValid({ retailer_key: "amazon" }),
    ]);
    assert.equal(rows.length, 0);
  });

  it("excludes likely_valid search URLs", () => {
    const rows = filterOfficialReferenceRetailerLinks([
      sharkLikelyValid({ affiliate_url: SHARK_SEARCH }),
    ]);
    assert.equal(rows.length, 0);
  });

  it("excludes direct_buyable rows from reference path", () => {
    const rows = filterOfficialReferenceRetailerLinks([
      {
        id: "hw-1",
        retailer_key: "oem-catalog",
        affiliate_url:
          "https://www.honeywellstore.com/store/products/true-hepa-replacement-filter-r-hrf-r3.htm",
        browser_truth_classification: "direct_buyable",
        browser_truth_notes: "Add to Cart visible",
        browser_truth_checked_at: "2026-05-22T00:00:00.000Z",
      },
    ]);
    assert.equal(rows.length, 0);
  });

  it("does not overlap filterRealBuyRetailerLinks for likely_valid Shark", () => {
    const row = sharkLikelyValid();
    assert.equal(filterRealBuyRetailerLinks([row]).length, 0);
    assert.equal(filterOfficialReferenceRetailerLinks([row]).length, 1);
  });
});

describe("official reference vs /go and buy gates", () => {
  it("blocks likely_valid Shark from /go", () => {
    const row = sharkLikelyValid();
    assert.equal(
      isAffiliateUrlSafeForGoRedirect(row.retailer_key, row.affiliate_url, "likely_valid"),
      false,
    );
  });

  it("allows direct_buyable through /go (unchanged)", () => {
    assert.equal(
      isAffiliateUrlSafeForGoRedirect(
        "oem-catalog",
        "https://www.honeywellstore.com/store/products/true-hepa-replacement-filter-r-hrf-r3.htm",
        "direct_buyable",
      ),
      true,
    );
  });
});

describe("OfficialProductReferenceLinks UI", () => {
  it("renders reference section without Buy/Shop/Purchase wording", () => {
    const html = renderToStaticMarkup(
      createElement(OfficialProductReferenceLinks, {
        links: [
          {
            id: "ref-1",
            retailer_name: "Shark — official replacement filter (product page)",
            affiliate_url: SHARK_PDP,
            retailer_key: "shark-official",
            browser_truth_classification: "likely_valid",
          },
        ],
      }),
    );
    assert.match(html, /Official product reference/);
    assert.match(html, /not a confirmed buy path/i);
    assert.match(html, new RegExp(SHARK_PDP.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    assert.doesNotMatch(html, /\/air-purifier\/go\//);
    assert.doesNotMatch(html, /Buy this part|Buy online|Add to cart/i);
    assert.doesNotMatch(html, /\bShop now\b/i);
    assert.doesNotMatch(html, /\bPurchase\b/i);
  });
});

describe("OFFICIAL_REFERENCE_RETAILER_KEYS", () => {
  it("starts narrow with shark-official only", () => {
    assert.deepEqual(Array.from(OFFICIAL_REFERENCE_RETAILER_KEYS), ["shark-official"]);
  });
});
