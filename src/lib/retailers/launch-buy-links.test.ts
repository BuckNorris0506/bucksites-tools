import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buyLinkGateFailureKind,
  buyPathSortContextForFilter,
  filterRealBuyRetailerLinks,
  isCompatibleReplacementFilterPdp,
  isExplicitBuyableClassification,
  isKnownBrokenUrl,
  isKnownIndirectDiscoveryUrl,
  isSearchEngineDiscoveryUrl,
  isSearchPlaceholderBuyLink,
  selectBestVerifiedBuyLink,
  sortBestVerifiedBuyLinks,
  summarizeBuyPathGateSuppression,
} from "./launch-buy-links";

describe("isSearchEngineDiscoveryUrl (major search hosts)", () => {
  it("flags Google /search?q= for any retailer_key via isSearchPlaceholderBuyLink", () => {
    assert.equal(
      isSearchPlaceholderBuyLink(
        "amazon",
        "https://www.google.com/search?q=LT1000P+water+filter",
      ),
      true,
    );
  });

  it("flags Bing /search?q=", () => {
    assert.equal(
      isSearchEngineDiscoveryUrl("https://www.bing.com/search?q=LT1000P"),
      true,
    );
  });

  it("flags Yahoo search host /search (suffix match)", () => {
    assert.equal(
      isSearchEngineDiscoveryUrl("https://search.yahoo.com/search?p=LT1000P"),
      true,
    );
  });

  it("flags Google /url link-wrapper when q or url is present", () => {
    assert.equal(
      isSearchEngineDiscoveryUrl(
        "https://www.google.com/url?q=https%3A%2F%2Fwww.amazon.com%2Fdp%2FB00",
      ),
      true,
    );
    assert.equal(
      isSearchEngineDiscoveryUrl(
        "https://www.google.com/url?sa=t&url=https%3A%2F%2Fexample.com",
      ),
      true,
    );
  });

  it("flags DuckDuckGo /html/?q= (repo acquisition pattern)", () => {
    assert.equal(
      isSearchEngineDiscoveryUrl("https://duckduckgo.com/html/?q=LT1000P+filter"),
      true,
    );
  });

  it("flags DuckDuckGo /?q= on root path", () => {
    assert.equal(isSearchEngineDiscoveryUrl("https://duckduckgo.com/?q=foo"), true);
  });

  it("does not flag Google Search Console paths mistaken for SERP", () => {
    assert.equal(
      isSearchEngineDiscoveryUrl("https://search.google.com/search-console"),
      false,
    );
  });

  it("does not flag bare Google homepage", () => {
    assert.equal(isSearchEngineDiscoveryUrl("https://www.google.com/"), false);
  });
});

describe("isSearchPlaceholderBuyLink (OEM catalog + manufacturer site-search)", () => {
  it("flags oem-catalog + manufacturer /search?q= (air purifier CSV pattern)", () => {
    assert.equal(
      isSearchPlaceholderBuyLink(
        "oem-catalog",
        "https://levoit.com/search?q=LEVOIT-RF-RAR029",
      ),
      true,
    );
    assert.equal(
      isSearchPlaceholderBuyLink(
        "oem-catalog",
        "https://www.blueair.com/us/search?q=BLUEAIR-PART411",
      ),
      true,
    );
  });

  it("flags oem-parts-catalog + catalogsearch (audit / fridge pattern)", () => {
    assert.equal(
      isSearchPlaceholderBuyLink(
        "oem-parts-catalog",
        "https://www.frigidaire.com/en/catalogsearch/result/?q=WFCB",
      ),
      true,
    );
  });

  it("flags oem-parts-catalog + RepairClinic Search?SearchTerm=", () => {
    assert.equal(
      isSearchPlaceholderBuyLink(
        "oem-parts-catalog",
        "https://www.repairclinic.com/Search?SearchTerm=DA97-17376A",
      ),
      true,
    );
  });

  it("flags oem-parts-catalog + search.jsp?searchKeyword= (GE parts pattern)", () => {
    assert.equal(
      isSearchPlaceholderBuyLink(
        "oem-parts-catalog",
        "https://www.geapplianceparts.com/store/catalog/search.jsp?searchKeyword=XWFE",
      ),
      true,
    );
  });

  it("flags oem-parts-catalog + catalog.jsp?searchKeyword= (Whirlpool parts pattern)", () => {
    assert.equal(
      isSearchPlaceholderBuyLink(
        "oem-parts-catalog",
        "https://www.whirlpoolparts.com/catalog.jsp?search=stw=&path=&searchKeyword=46-9002",
      ),
      true,
    );
  });

  it("flags Austin Air homepage ?s= search URLs", () => {
    assert.equal(
      isSearchPlaceholderBuyLink(
        "oem-catalog",
        "https://austinair.com/?s=FR400",
      ),
      true,
    );
  });

  it("preserves oem-parts-catalog + direct LG PDP (fridge CSV)", () => {
    assert.equal(
      isSearchPlaceholderBuyLink(
        "oem-parts-catalog",
        "https://www.lg.com/us/appliances-accessories/lg-lt1000p-refrigerator-water-filter",
      ),
      false,
    );
  });

  it("preserves amazon retailer row (non-OEM slot)", () => {
    assert.equal(
      isSearchPlaceholderBuyLink(
        "amazon",
        "https://www.amazon.com/dp/B0DR6X4N35?tag=buckparts20-20",
      ),
      false,
    );
  });

  it("preserves oem-catalog + non-search manufacturer path (hypothetical PDP)", () => {
    assert.equal(
      isSearchPlaceholderBuyLink(
        "oem-catalog",
        "https://www.levoit.com/collections/replacement-filters",
      ),
      false,
    );
  });

  it("still flags google-search key regardless of URL", () => {
    assert.equal(isSearchPlaceholderBuyLink("google-search", "https://example.com/pdp"), true);
  });
});

describe("isKnownIndirectDiscoveryUrl", () => {
  it("flags the proven non-buyable Solventum AP810 product/details page", () => {
    assert.equal(
      isKnownIndirectDiscoveryUrl("https://www.solventum.com/en-us/home/v/v000075117/"),
      true,
    );
  });

  it("flags the proven non-buyable Kinetico dealer-network page", () => {
    assert.equal(
      isKnownIndirectDiscoveryUrl("https://www.kinetico.com/en-us/for-home/water-filtration/"),
      true,
    );
  });
});

describe("isKnownBrokenUrl", () => {
  it("flags the proven broken GE MWF destination", () => {
    assert.equal(
      isKnownBrokenUrl("https://www.geapplianceparts.com/store/parts/spec/MWF"),
      true,
    );
  });

  it("still flags GE MWF when path case, scheme, trailing slash, hash, or query drift", () => {
    const variants = [
      "https://www.geapplianceparts.com/store/parts/spec/mwf",
      "http://www.geapplianceparts.com/store/parts/spec/MWF",
      "https://www.geapplianceparts.com/store/parts/spec/MWF/",
      "https://www.geapplianceparts.com/store/parts/spec/MWF#section",
      "https://www.geapplianceparts.com/store/parts/spec/MWF?utm_source=x",
    ];
    for (const u of variants) {
      assert.equal(isKnownBrokenUrl(u), true, `expected broken for ${u}`);
    }
  });
});

describe("isExplicitBuyableClassification", () => {
  it("accepts direct_buyable only", () => {
    assert.equal(isExplicitBuyableClassification("direct_buyable"), true);
    assert.equal(isExplicitBuyableClassification("likely_valid"), false);
    assert.equal(isExplicitBuyableClassification("likely_not_found"), false);
    assert.equal(isExplicitBuyableClassification(null), false);
  });
});

describe("buyLinkGateFailureKind / summarizeBuyPathGateSuppression (aligned with filterRealBuyRetailerLinks)", () => {
  it("treats catalogsearch OEM slot as search_placeholder even with a live classification", () => {
    assert.equal(
      buyLinkGateFailureKind({
        retailer_key: "oem-parts-catalog",
        affiliate_url: "https://www.frigidaire.com/en/catalogsearch/result/?q=WF3CB",
        browser_truth_classification: "likely_valid",
      }),
      "search_placeholder",
    );
  });

  it("treats LG PDP without browser truth as missing_browser_truth", () => {
    assert.equal(
      buyLinkGateFailureKind({
        retailer_key: "oem-parts-catalog",
        affiliate_url: "https://www.lg.com/us/appliances-accessories/lg-lt1000p-refrigerator-water-filter",
        browser_truth_classification: null,
      }),
      "missing_browser_truth",
    );
  });

  it("treats likely_search_results as unsafe_browser_truth", () => {
    assert.equal(
      buyLinkGateFailureKind({
        retailer_key: "amazon",
        affiliate_url: "https://www.amazon.com/dp/B00EXAMPLE",
        browser_truth_classification: "likely_search_results",
      }),
      "unsafe_browser_truth",
    );
  });

  it("treats OEM likely_valid without explicit direct-buy proof as unsafe_browser_truth", () => {
    assert.equal(
      buyLinkGateFailureKind({
        retailer_key: "oem-catalog",
        affiliate_url: "https://www.honeywellstore.com/store/products/true-hepa-replacement-filter-r-hrf-r1.htm",
        browser_truth_classification: "likely_valid",
      }),
      "unsafe_browser_truth",
    );
  });

  it("allows OEM direct_buyable proof", () => {
    assert.equal(
      buyLinkGateFailureKind({
        retailer_key: "oem-catalog",
        affiliate_url: "https://www.honeywellstore.com/store/products/true-hepa-replacement-filter-r-hrf-r1.htm",
        browser_truth_classification: "direct_buyable",
      }),
      null,
    );
  });

  it("treats the proven Solventum AP810 product/details page as indirect_discovery", () => {
    assert.equal(
      buyLinkGateFailureKind({
        retailer_key: "oem-solventum-ap810-case-pdp",
        affiliate_url: "https://www.solventum.com/en-us/home/v/v000075117/",
        browser_truth_classification: "likely_valid",
      }),
      "indirect_discovery",
    );
  });

  it("treats the proven Kinetico dealer-network page as indirect_discovery", () => {
    assert.equal(
      buyLinkGateFailureKind({
        retailer_key: "oem-catalog",
        affiliate_url: "https://www.kinetico.com/en-us/for-home/water-filtration/",
        browser_truth_classification: "likely_valid",
      }),
      "indirect_discovery",
    );
  });

  it("treats the proven broken GE MWF destination as broken_destination", () => {
    assert.equal(
      buyLinkGateFailureKind({
        retailer_key: "oem-parts-catalog",
        affiliate_url: "https://www.geapplianceparts.com/store/parts/spec/MWF",
        browser_truth_classification: "likely_valid",
      }),
      "broken_destination",
    );
  });

  it("returns null when row would pass filterRealBuyRetailerLinks", () => {
    assert.equal(
      buyLinkGateFailureKind({
        retailer_key: "amazon",
        affiliate_url: "https://www.amazon.com/dp/B00EXAMPLE",
        browser_truth_classification: "direct_buyable",
      }),
      null,
    );
  });

  it("treats non-OEM likely_valid without explicit direct-buy proof as unsafe_browser_truth", () => {
    assert.equal(
      buyLinkGateFailureKind({
        retailer_key: "amazon",
        affiliate_url: "https://www.amazon.com/dp/B00EXAMPLE",
        browser_truth_classification: "likely_valid",
      }),
      "unsafe_browser_truth",
    );
  });

  it("summarize aggregates multiple failure kinds", () => {
    const s = summarizeBuyPathGateSuppression([
      {
        retailer_key: "oem-parts-catalog",
        affiliate_url: "https://www.frigidaire.com/en/catalogsearch/result/?q=WF3CB",
        browser_truth_classification: null,
      },
      {
        retailer_key: "oem-parts-catalog",
        affiliate_url: "https://www.lg.com/us/appliances-accessories/lg-lt1000p-refrigerator-water-filter",
        browser_truth_classification: null,
      },
      {
        retailer_key: "oem-solventum-ap810-case-pdp",
        affiliate_url: "https://www.solventum.com/en-us/home/v/v000075117/",
        browser_truth_classification: "likely_valid",
      },
      {
        retailer_key: "oem-parts-catalog",
        affiliate_url: "https://www.geapplianceparts.com/store/parts/spec/MWF",
        browser_truth_classification: "likely_valid",
      },
      {
        retailer_key: "amazon",
        affiliate_url: "https://www.amazon.com/dp/B00EXAMPLE",
        browser_truth_classification: "likely_not_found",
      },
    ]);
    assert.equal(s.hadSearchPlaceholderRows, true);
    assert.equal(s.hadIndirectDiscoveryRows, true);
    assert.equal(s.hadBrokenDestinationRows, true);
    assert.equal(s.hadMissingBrowserTruthRows, true);
    assert.equal(s.hadUnsafeBrowserTruthRows, true);
  });

  it("filterRealBuyRetailerLinks rejects placeholder rows", () => {
    assert.equal(
      filterRealBuyRetailerLinks([
        {
          retailer_key: "oem-parts-catalog",
          affiliate_url: "https://www.frigidaire.com/en/catalogsearch/result/?q=WF3CB",
          browser_truth_classification: "likely_valid",
        },
      ]).length,
      0,
    );
  });
});

describe("best-verified winner arbitration", () => {
  it("prefers exact product-like URL over is_primary/position", () => {
    const winner = selectBestVerifiedBuyLink([
      {
        id: "1",
        retailer_name: "OEM Catalog",
        is_primary: true,
        affiliate_url: "https://oem.example.com/search?q=wf3cb",
        browser_truth_checked_at: "2026-04-20T12:00:00.000Z",
      },
      {
        id: "2",
        retailer_name: "Retailer PDP",
        is_primary: false,
        affiliate_url: "https://store.example.com/product/wf3cb-filter",
        browser_truth_checked_at: "2026-04-20T12:00:00.000Z",
      },
    ]);
    assert.equal(winner?.id, "2");
  });

  it("uses most-recent browser truth timestamp when specificity ties", () => {
    const sorted = sortBestVerifiedBuyLinks([
      {
        id: "a",
        retailer_name: "Store A",
        affiliate_url: "https://shop.example.com/product/wf3cb",
        browser_truth_checked_at: "2026-04-20T01:00:00.000Z",
      },
      {
        id: "b",
        retailer_name: "Store B",
        affiliate_url: "https://shop.example.com/product/wf3cb",
        browser_truth_checked_at: "2026-04-20T09:00:00.000Z",
      },
    ]);
    assert.deepEqual(
      sorted.map((r) => r.id),
      ["b", "a"],
    );
  });

  it("uses deterministic lexical tie-breaks when signals are identical", () => {
    const sorted = sortBestVerifiedBuyLinks([
      {
        id: "b-id",
        retailer_name: "Zeta Store",
        affiliate_url: "https://shop.example.com/product/wf3cb",
        browser_truth_checked_at: "2026-04-20T09:00:00.000Z",
      },
      {
        id: "a-id",
        retailer_name: "Alpha Store",
        affiliate_url: "https://shop.example.com/product/wf3cb",
        browser_truth_checked_at: "2026-04-20T09:00:00.000Z",
      },
    ]);
    assert.deepEqual(
      sorted.map((r) => r.id),
      ["a-id", "b-id"],
    );
  });

  it("still reaches lexical tie-break when both browser truth timestamps are missing", () => {
    const sorted = sortBestVerifiedBuyLinks([
      {
        id: "b-id",
        retailer_name: "Zeta Store",
        affiliate_url: "https://shop.example.com/product/wf3cb",
      },
      {
        id: "a-id",
        retailer_name: "Alpha Store",
        affiliate_url: "https://shop.example.com/product/wf3cb",
      },
    ]);
    assert.deepEqual(
      sorted.map((r) => r.id),
      ["a-id", "b-id"],
    );
  });

  it("prefers verified Amazon when specificity and recency tie (exact-OEM PDP)", () => {
    const sorted = sortBestVerifiedBuyLinks(
      [
        {
          id: "aaa",
          retailer_key: "other",
          retailer_name: "AAA Parts",
          affiliate_url: "https://www.amazon.com/dp/B000AAAAAA",
          browser_truth_checked_at: "2026-04-20T12:00:00.000Z",
          browser_truth_classification: "direct_buyable",
        },
        {
          id: "amz",
          retailer_key: "amazon",
          retailer_name: "Amazon",
          affiliate_url: "https://www.amazon.com/dp/B000BBBBBB",
          browser_truth_checked_at: "2026-04-20T12:00:00.000Z",
          browser_truth_classification: "direct_buyable",
        },
      ],
      { exactOemCatalogPart: true },
    );
    assert.deepEqual(
      sorted.map((r) => r.id),
      ["amz", "aaa"],
    );
  });

  it("does not prefer Amazon when exactOemCatalogPart is false (compatible-style PDP)", () => {
    const sorted = sortBestVerifiedBuyLinks(
      [
        {
          id: "amz",
          retailer_key: "amazon",
          retailer_name: "Amazon",
          affiliate_url: "https://www.amazon.com/dp/B000AAAAAA",
          browser_truth_checked_at: "2026-04-20T12:00:00.000Z",
          browser_truth_classification: "direct_buyable",
        },
        {
          id: "aaa",
          retailer_key: "other",
          retailer_name: "AAA Parts",
          affiliate_url: "https://www.amazon.com/dp/B000BBBBBB",
          browser_truth_checked_at: "2026-04-20T12:00:00.000Z",
          browser_truth_classification: "direct_buyable",
        },
      ],
      { exactOemCatalogPart: false },
    );
    assert.deepEqual(
      sorted.map((r) => r.id),
      ["aaa", "amz"],
    );
  });

  it("prefers Amazon on exact-OEM PDP even when OEM URL shape is more specific", () => {
    const winner = selectBestVerifiedBuyLink(
      [
        {
          id: "deep",
          retailer_key: "oem",
          retailer_name: "Deep PDP",
          affiliate_url: "https://oem.example.com/store/parts/spec/WF3CB/extra",
          browser_truth_checked_at: "2026-04-20T12:00:00.000Z",
          browser_truth_classification: "direct_buyable",
        },
        {
          id: "amz",
          retailer_key: "amazon",
          retailer_name: "Amazon",
          affiliate_url: "https://www.amazon.com/dp/B000AAAAAA",
          browser_truth_checked_at: "2026-04-20T12:00:00.000Z",
          browser_truth_classification: "direct_buyable",
        },
      ],
      { exactOemCatalogPart: true },
    );
    assert.equal(winner?.id, "amz");
  });

  it("prefers Amazon over OEM multipack variant on same OEM intent (MWF vs MWFP3PK)", () => {
    const winner = selectBestVerifiedBuyLink(
      [
        {
          id: "ge-3pk",
          retailer_key: "ge-appliance-parts",
          retailer_name: "GE Appliance Parts",
          affiliate_url: "https://www.geapplianceparts.com/store/parts/spec/MWFP3PK",
          browser_truth_checked_at: "2026-04-20T12:00:00.000Z",
          browser_truth_classification: "direct_buyable",
        },
        {
          id: "amz-single",
          retailer_key: "amazon",
          retailer_name: "Amazon",
          affiliate_url: "https://www.amazon.com/dp/B000AST3AK",
          browser_truth_checked_at: "2026-04-20T12:00:00.000Z",
          browser_truth_classification: "direct_buyable",
        },
      ],
      { exactOemCatalogPart: true, expectedOemPartNumber: "MWF" },
    );
    assert.equal(winner?.id, "amz-single");
  });

  it("prefers Amazon over OEM single + multipack pages for MWF policy case", () => {
    const winner = selectBestVerifiedBuyLink(
      [
        {
          id: "ge-mwfp3pk",
          retailer_key: "ge-appliance-parts",
          retailer_name: "GE Appliance Parts",
          affiliate_url: "https://www.geapplianceparts.com/store/parts/spec/MWFP3PK",
          browser_truth_checked_at: "2026-04-20T12:00:00.000Z",
          browser_truth_classification: "direct_buyable",
        },
        {
          id: "ge-mwfp",
          retailer_key: "ge-appliance-parts",
          retailer_name: "GE Appliance Parts",
          affiliate_url: "https://www.geapplianceparts.com/store/parts/spec/MWFP",
          browser_truth_checked_at: "2026-04-20T12:00:00.000Z",
          browser_truth_classification: "direct_buyable",
        },
        {
          id: "amazon",
          retailer_key: "amazon",
          retailer_name: "Amazon",
          affiliate_url: "https://www.amazon.com/dp/B000AST3AK",
          browser_truth_checked_at: "2026-04-20T12:00:00.000Z",
          browser_truth_classification: "direct_buyable",
        },
      ],
      { exactOemCatalogPart: true, expectedOemPartNumber: "MWF" },
    );
    assert.equal(winner?.id, "amazon");
  });
});

describe("buyPathSortContextForFilter / isCompatibleReplacementFilterPdp", () => {
  it("flags LG certified-alternate rows as non-exact-OEM for sort context", () => {
    assert.equal(isCompatibleReplacementFilterPdp("lt1000pc", "LG LT1000PC (certified alternate listing)"), true);
    assert.equal(buyPathSortContextForFilter("lt1000pc", "LG LT1000PC (certified alternate listing)").exactOemCatalogPart, false);
  });

  it("treats canonical OEM filter rows as exact-OEM for sort context", () => {
    assert.equal(isCompatibleReplacementFilterPdp("mwf", "GE MWF"), false);
    assert.equal(buyPathSortContextForFilter("mwf", "GE MWF").exactOemCatalogPart, true);
  });
});
