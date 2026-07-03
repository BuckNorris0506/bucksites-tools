import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  BUYABLE_SUBTYPES,
  buyLinkGateFailureKind,
  buyPathSortContextForFilter,
  filterRealBuyRetailerLinks,
  MULTIPACK_FALLBACK_COPY,
  shouldShowMultipackFallbackCopy,
  isCompatibleReplacementFilterPdp,
  isExplicitBuyableClassification,
  isHardDeniedBrowserTruthNotes,
  isKnownBrokenUrl,
  isKnownIndirectDiscoveryUrl,
  passesDirectBuyableGate,
  isSearchEngineDiscoveryUrl,
  isSearchPlaceholderBuyLink,
  selectBestVerifiedBuyLink,
  sortBestVerifiedBuyLinks,
  summarizeBuyPathGateSuppression,
  staleBrowserTruthShadowClassification,
  summarizeStaleBrowserTruthShadowCounts,
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

describe("buyable subtype foundation (strict direct_buyable gate)", () => {
  const freshCheckedAt = "2026-05-01T00:00:00.000Z";

  it("direct_buyable without subtype still passes when checked_at is fresh", () => {
    assert.equal(
      passesDirectBuyableGate({
        browser_truth_classification: "direct_buyable",
      }),
      true,
    );
    assert.equal(
      buyLinkGateFailureKind({
        retailer_key: "amazon",
        affiliate_url: "https://www.amazon.com/dp/B00EXAMPLE",
        browser_truth_classification: "direct_buyable",
        browser_truth_checked_at: freshCheckedAt,
      }),
      null,
    );
  });

  it("MULTIPACK_DIRECT_BUYABLE passes only with direct_buyable classification", () => {
    assert.equal(
      passesDirectBuyableGate({
        browser_truth_classification: "direct_buyable",
        browser_truth_buyable_subtype: BUYABLE_SUBTYPES.MULTIPACK_DIRECT_BUYABLE,
      }),
      true,
    );
    assert.equal(
      passesDirectBuyableGate({
        browser_truth_classification: "likely_valid",
        browser_truth_buyable_subtype: BUYABLE_SUBTYPES.MULTIPACK_DIRECT_BUYABLE,
      }),
      false,
    );
  });

  it("BLOCKED_UNSAFE fails even when classification says direct_buyable", () => {
    assert.equal(
      passesDirectBuyableGate({
        browser_truth_classification: "direct_buyable",
        browser_truth_buyable_subtype: BUYABLE_SUBTYPES.BLOCKED_UNSAFE,
      }),
      false,
    );
    assert.equal(
      buyLinkGateFailureKind({
        retailer_key: "amazon",
        affiliate_url: "https://www.amazon.com/dp/B00EXAMPLE",
        browser_truth_classification: "direct_buyable",
        browser_truth_buyable_subtype: BUYABLE_SUBTYPES.BLOCKED_UNSAFE,
      }),
      "unsafe_browser_truth",
    );
  });
});

describe("isHardDeniedBrowserTruthNotes (explicit status tokens only)", () => {
  it("hard-denies explicit HARD_DO_NOT_USE and WRONG_FAMILY status labels", () => {
    assert.equal(isHardDeniedBrowserTruthNotes("HARD_DO_NOT_USE"), true);
    assert.equal(isHardDeniedBrowserTruthNotes("HARD_DO_NOT_USE wrong-family token mismatch"), true);
    assert.equal(isHardDeniedBrowserTruthNotes("WRONG_FAMILY: model mismatch"), true);
    assert.equal(isHardDeniedBrowserTruthNotes("WRONG-FAMILY: model mismatch"), true);
    assert.equal(isHardDeniedBrowserTruthNotes("BLOCKED_WRONG_FAMILY_RISK"), true);
    assert.equal(isHardDeniedBrowserTruthNotes("WRONG_FAMILY"), true);
  });

  it("does not hard-deny clearance or observational wrong-family prose", () => {
    const safeNotes = [
      "wrong_family_tokens_seen []",
      "PROVEN: wrong_family_tokens_seen [] in primary buy box.",
      "WRONG_FAMILY tokens cleared",
      "no wrong-family tokens detected",
      "no forbidden wrong-family tokens detected",
      "prior wrong-family flag cleared",
      "not wrong-family in primary product area",
      "model-first wrong-family proof",
      "Wrong-family LV-H132/LV-H134 not in primary",
      "wrong-family R1/R2 not dominant",
      "(Filter B / FLT4825 wrong-family) and phantom AC4225",
    ];
    for (const notes of safeNotes) {
      assert.equal(isHardDeniedBrowserTruthNotes(notes), false, notes);
    }
  });

  it("buyLinkGateFailureKind does not hard-deny direct_buyable rows with clearance prose", () => {
    const freshCheckedAt = "2026-05-01T00:00:00.000Z";
    assert.equal(
      buyLinkGateFailureKind({
        retailer_key: "oem-catalog",
        affiliate_url: "https://levoit.com/products/core-300-air-purifier-replacement-filter",
        browser_truth_classification: "direct_buyable",
        browser_truth_checked_at: freshCheckedAt,
        browser_truth_notes:
          "Official PDP; Add to Cart present. PROVEN: wrong_family_tokens_seen [] in primary buy box.",
      }),
      null,
    );
  });

  it("buyLinkGateFailureKind still hard-denies explicit WRONG_FAMILY status on direct_buyable", () => {
    const freshCheckedAt = "2026-05-01T00:00:00.000Z";
    assert.equal(
      buyLinkGateFailureKind({
        retailer_key: "amazon",
        affiliate_url: "https://www.amazon.com/dp/B00EXAMPLE",
        browser_truth_classification: "direct_buyable",
        browser_truth_checked_at: freshCheckedAt,
        browser_truth_notes: "WRONG_FAMILY: model mismatch",
      }),
      "hard_denied_browser_truth",
    );
  });
});

describe("buyLinkGateFailureKind / summarizeBuyPathGateSuppression (aligned with filterRealBuyRetailerLinks)", () => {
  const freshCheckedAt = "2026-05-01T00:00:00.000Z";
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

  it("allows OEM direct_buyable proof with fresh checked_at", () => {
    assert.equal(
      buyLinkGateFailureKind({
        retailer_key: "oem-catalog",
        affiliate_url: "https://www.honeywellstore.com/store/products/true-hepa-replacement-filter-r-hrf-r1.htm",
        browser_truth_classification: "direct_buyable",
        browser_truth_checked_at: freshCheckedAt,
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
        browser_truth_checked_at: freshCheckedAt,
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
  it("single-unit ranks before multipack when both are verified", () => {
    const winner = selectBestVerifiedBuyLink([
      {
        id: "mp",
        retailer_name: "Multipack PDP",
        affiliate_url: "https://www.amazon.com/dp/B000AAAAAA",
        browser_truth_classification: "direct_buyable",
        browser_truth_buyable_subtype: BUYABLE_SUBTYPES.MULTIPACK_DIRECT_BUYABLE,
      },
      {
        id: "su",
        retailer_name: "Single PDP",
        affiliate_url: "https://www.amazon.com/dp/B000BBBBBB",
        browser_truth_classification: "direct_buyable",
        browser_truth_buyable_subtype: BUYABLE_SUBTYPES.SINGLE_UNIT_DIRECT_BUYABLE,
      },
    ]);
    assert.equal(winner?.id, "su");
  });

  it("multipack may be primary fallback when no single-unit subtype exists", () => {
    const winner = selectBestVerifiedBuyLink([
      {
        id: "mp",
        retailer_name: "Multipack PDP",
        affiliate_url: "https://www.amazon.com/dp/B000AAAAAA",
        browser_truth_classification: "direct_buyable",
        browser_truth_buyable_subtype: BUYABLE_SUBTYPES.MULTIPACK_DIRECT_BUYABLE,
      },
      {
        id: "compat",
        retailer_name: "Compatible PDP",
        affiliate_url: "https://www.example.com/product/compatible-pack",
        browser_truth_classification: "direct_buyable",
        browser_truth_buyable_subtype: BUYABLE_SUBTYPES.COMPATIBLE_REPLACEMENT_DIRECT_BUYABLE,
      },
    ]);
    assert.equal(winner?.id, "mp");
  });

  it("compatible replacement does not outrank exact single/multipack subtypes", () => {
    const sorted = sortBestVerifiedBuyLinks([
      {
        id: "compat",
        retailer_name: "Compatible PDP",
        affiliate_url: "https://www.example.com/product/compatible-pack",
        browser_truth_classification: "direct_buyable",
        browser_truth_buyable_subtype: BUYABLE_SUBTYPES.COMPATIBLE_REPLACEMENT_DIRECT_BUYABLE,
      },
      {
        id: "mp",
        retailer_name: "Multipack PDP",
        affiliate_url: "https://www.example.com/product/multipack",
        browser_truth_classification: "direct_buyable",
        browser_truth_buyable_subtype: BUYABLE_SUBTYPES.MULTIPACK_DIRECT_BUYABLE,
      },
      {
        id: "su",
        retailer_name: "Single PDP",
        affiliate_url: "https://www.example.com/product/single",
        browser_truth_classification: "direct_buyable",
        browser_truth_buyable_subtype: BUYABLE_SUBTYPES.SINGLE_UNIT_DIRECT_BUYABLE,
      },
    ]);
    assert.deepEqual(sorted.map((r) => r.id), ["su", "mp", "compat"]);
  });

  it("rows without subtype preserve prior ordering behavior", () => {
    const sorted = sortBestVerifiedBuyLinks([
      {
        id: "b",
        retailer_name: "Store B",
        affiliate_url: "https://shop.example.com/product/wf3cb",
        browser_truth_checked_at: "2026-04-20T09:00:00.000Z",
        browser_truth_classification: "direct_buyable",
      },
      {
        id: "a",
        retailer_name: "Store A",
        affiliate_url: "https://shop.example.com/product/wf3cb",
        browser_truth_checked_at: "2026-04-20T01:00:00.000Z",
        browser_truth_classification: "direct_buyable",
      },
    ]);
    assert.deepEqual(sorted.map((r) => r.id), ["b", "a"]);
  });

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

describe("multipack fallback copy helper", () => {
  it("appears only when no single-unit subtype and at least one multipack subtype exists", () => {
    assert.equal(
      shouldShowMultipackFallbackCopy([
        { browser_truth_buyable_subtype: BUYABLE_SUBTYPES.MULTIPACK_DIRECT_BUYABLE },
      ]),
      true,
    );
    assert.equal(
      shouldShowMultipackFallbackCopy([
        { browser_truth_buyable_subtype: BUYABLE_SUBTYPES.SINGLE_UNIT_DIRECT_BUYABLE },
        { browser_truth_buyable_subtype: BUYABLE_SUBTYPES.MULTIPACK_DIRECT_BUYABLE },
      ]),
      false,
    );
    assert.equal(
      shouldShowMultipackFallbackCopy([
        { browser_truth_buyable_subtype: BUYABLE_SUBTYPES.COMPATIBLE_REPLACEMENT_DIRECT_BUYABLE },
      ]),
      false,
    );
    assert.equal(MULTIPACK_FALLBACK_COPY.length > 0, true);
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

  it("sets waterdropExactProofSlice only for committed proof-slice slugs", () => {
    assert.equal(buyPathSortContextForFilter("da29-00020b", "Samsung DA29-00020B / HAF-CIN family").waterdropExactProofSlice, true);
    assert.equal(buyPathSortContextForFilter("lt800p", "LG LT800P", "LT800P").waterdropExactProofSlice, true);
    assert.equal(buyPathSortContextForFilter("mwf", "GE MWF").waterdropExactProofSlice, false);
    assert.equal(buyPathSortContextForFilter("ukf8001", "KitchenAid UKF8001 (EveryDrop Filter 4 compatible)").waterdropExactProofSlice, false);
  });

  it("propagated sort context changes winner ordering for compatible replacement PDPs", () => {
    const links = [
      {
        id: "amazon",
        retailer_key: "amazon",
        retailer_name: "Amazon",
        affiliate_url: "https://www.amazon.com/dp/B00LP8LJUG",
        browser_truth_checked_at: "2026-04-20T12:00:00.000Z",
        browser_truth_classification: "direct_buyable",
      },
      {
        id: "oem-compat",
        retailer_key: "ge-appliance-parts",
        retailer_name: "GE Appliance Parts",
        affiliate_url: "https://www.geapplianceparts.com/store/parts/spec/MWFP",
        browser_truth_checked_at: "2026-04-20T12:00:00.000Z",
        browser_truth_classification: "direct_buyable",
      },
    ] as const;

    const exactCtx = buyPathSortContextForFilter("mwf", "GE MWF");
    const compatibleCtx = buyPathSortContextForFilter("lt1000pc", "LG LT1000PC (certified alternate listing)");

    assert.equal(selectBestVerifiedBuyLink(links, exactCtx)?.id, "amazon");
    assert.equal(selectBestVerifiedBuyLink(links, compatibleCtx)?.id, "oem-compat");
  });
});

describe("Waterdrop exact-proof purchase-option priority", () => {
  const DA29_WATERDROP_URL =
    "https://click.linksynergy.com/link?id=GTFBcFcCW48&offerid=1888875&type=2&murl=https%3a%2f%2fwww.waterdropfilter.com%2fproducts%2fwaterdrop-replacement-for-samsung-da29-00020b-fridge-water-filter";
  const DA29_AMAZON_URL = "https://www.amazon.com/dp/B004UB1NRY";
  const LT800P_WATERDROP_URL =
    "https://click.linksynergy.com/link?id=GTFBcFcCW48&offerid=1888875.539507420827021633352815&type=15&murl=https%3A%2F%2Fwww.waterdropfilter.com%2Fproducts%2Flg-lt800p-water-filter-replacement-by-waterdrop%3Fvariant%3D39389060792402";
  const LT800P_AMAZON_URL = "https://www.amazon.com/dp/B00X3DWMS4";

  it("verified Waterdrop ranks before verified Amazon on lt800p proof slice", () => {
    const ctx = buyPathSortContextForFilter("lt800p", "LG LT800P", "LT800P");
    const sorted = sortBestVerifiedBuyLinks(
      [
        {
          id: "8fb8189c-6c29-46c9-ae95-d3e26be05add",
          retailer_key: "waterdrop",
          retailer_name: "Waterdrop Filter",
          affiliate_url: LT800P_WATERDROP_URL,
          browser_truth_checked_at: "2026-05-18T00:00:00+00",
          browser_truth_classification: "direct_buyable",
          browser_truth_buyable_subtype: BUYABLE_SUBTYPES.COMPATIBLE_REPLACEMENT_DIRECT_BUYABLE,
        },
        {
          id: "6bbf8586-a87e-46de-932c-2bc341587619",
          retailer_key: "amazon",
          retailer_name: "Amazon",
          affiliate_url: LT800P_AMAZON_URL,
          browser_truth_checked_at: "2026-05-03T12:00:00.000Z",
          browser_truth_classification: "direct_buyable",
        },
      ],
      ctx,
    );
    assert.deepEqual(sorted.map((r) => r.id), [
      "8fb8189c-6c29-46c9-ae95-d3e26be05add",
      "6bbf8586-a87e-46de-932c-2bc341587619",
    ]);
  });

  it("verified Waterdrop ranks before verified Amazon on da29-00020b proof slice", () => {
    const ctx = buyPathSortContextForFilter("da29-00020b", "Samsung DA29-00020B / HAF-CIN family", "DA29-00020B");
    const sorted = sortBestVerifiedBuyLinks(
      [
        {
          id: "d4cbad0c-4bab-4854-89bf-59e6d6492c6b",
          retailer_key: "waterdrop",
          retailer_name: "Waterdrop Filter",
          affiliate_url: DA29_WATERDROP_URL,
          browser_truth_checked_at: "2026-05-20T20:00:00+00",
          browser_truth_classification: "direct_buyable",
          browser_truth_buyable_subtype: BUYABLE_SUBTYPES.COMPATIBLE_REPLACEMENT_DIRECT_BUYABLE,
        },
        {
          id: "amazon-da29",
          retailer_key: "amazon",
          retailer_name: "Amazon",
          affiliate_url: DA29_AMAZON_URL,
          browser_truth_checked_at: "2026-05-20T12:00:00.000Z",
          browser_truth_classification: "direct_buyable",
        },
      ],
      ctx,
    );
    assert.deepEqual(sorted.map((r) => r.id), ["d4cbad0c-4bab-4854-89bf-59e6d6492c6b", "amazon-da29"]);
  });

  it("documents prior ranking: Amazon won before Waterdrop boost on exact-OEM PDP", () => {
    const ctx = buyPathSortContextForFilter("da29-00020b", "Samsung DA29-00020B / HAF-CIN family", "DA29-00020B");
    const links = [
      {
        id: "wd",
        retailer_key: "waterdrop",
        retailer_name: "Waterdrop Filter",
        affiliate_url: DA29_WATERDROP_URL,
        browser_truth_checked_at: "2026-05-20T20:00:00+00",
        browser_truth_classification: "direct_buyable",
        browser_truth_buyable_subtype: BUYABLE_SUBTYPES.COMPATIBLE_REPLACEMENT_DIRECT_BUYABLE,
      },
      {
        id: "amz",
        retailer_key: "amazon",
        retailer_name: "Amazon",
        affiliate_url: DA29_AMAZON_URL,
        browser_truth_checked_at: "2026-05-20T12:00:00.000Z",
        browser_truth_classification: "direct_buyable",
      },
    ] as const;
    assert.equal(selectBestVerifiedBuyLink(links, ctx)?.id, "wd");
    const withoutProofSlice = { ...ctx, waterdropExactProofSlice: false };
    assert.equal(selectBestVerifiedBuyLink(links, withoutProofSlice)?.id, "amz");
  });

  it("unsafe or missing-browser-truth Waterdrop does not appear in gated buy links", () => {
    assert.equal(
      filterRealBuyRetailerLinks([
        {
          retailer_key: "waterdrop",
          affiliate_url: DA29_WATERDROP_URL,
          browser_truth_classification: null,
        },
        {
          retailer_key: "waterdrop",
          affiliate_url: DA29_WATERDROP_URL,
          browser_truth_classification: "direct_buyable",
          browser_truth_buyable_subtype: BUYABLE_SUBTYPES.BLOCKED_UNSAFE,
        },
      ]).length,
      0,
    );
  });

  it("non-Waterdrop compatible replacement does not outrank Amazon on exact-OEM PDP", () => {
    const ctx = buyPathSortContextForFilter("mwf", "GE MWF", "MWF");
    const sorted = sortBestVerifiedBuyLinks(
      [
        {
          id: "compat",
          retailer_key: "other",
          retailer_name: "Compatible Store",
          affiliate_url: "https://shop.example.com/product/compatible-mwf",
          browser_truth_checked_at: "2026-05-20T12:00:00.000Z",
          browser_truth_classification: "direct_buyable",
          browser_truth_buyable_subtype: BUYABLE_SUBTYPES.COMPATIBLE_REPLACEMENT_DIRECT_BUYABLE,
        },
        {
          id: "amz",
          retailer_key: "amazon",
          retailer_name: "Amazon",
          affiliate_url: "https://www.amazon.com/dp/B000AST3AK",
          browser_truth_checked_at: "2026-05-20T12:00:00.000Z",
          browser_truth_classification: "direct_buyable",
        },
      ],
      ctx,
    );
    assert.deepEqual(sorted.map((r) => r.id), ["amz", "compat"]);
  });

  it("Waterdrop without proof slice slug does not outrank Amazon", () => {
    const ctx = buyPathSortContextForFilter("mwf", "GE MWF", "MWF");
    const sorted = sortBestVerifiedBuyLinks(
      [
        {
          id: "wd",
          retailer_key: "waterdrop",
          retailer_name: "Waterdrop Filter",
          affiliate_url: "https://www.waterdropfilter.com/products/some-filter",
          browser_truth_checked_at: "2026-05-20T20:00:00+00",
          browser_truth_classification: "direct_buyable",
          browser_truth_buyable_subtype: BUYABLE_SUBTYPES.COMPATIBLE_REPLACEMENT_DIRECT_BUYABLE,
        },
        {
          id: "amz",
          retailer_key: "amazon",
          retailer_name: "Amazon",
          affiliate_url: "https://www.amazon.com/dp/B000AST3AK",
          browser_truth_checked_at: "2026-05-20T12:00:00.000Z",
          browser_truth_classification: "direct_buyable",
        },
      ],
      ctx,
    );
    assert.deepEqual(sorted.map((r) => r.id), ["amz", "wd"]);
  });

  it("Amazon remains primary on lt800p when Waterdrop is missing or not direct_buyable", () => {
    const ctx = buyPathSortContextForFilter("lt800p", "LG LT800P", "LT800P");
    const amazonLink = {
      id: "6bbf8586-a87e-46de-932c-2bc341587619",
      retailer_key: "amazon",
      retailer_name: "Amazon",
      affiliate_url: LT800P_AMAZON_URL,
      browser_truth_checked_at: "2026-05-03T12:00:00.000Z",
      browser_truth_classification: "direct_buyable",
    } as const;

    assert.equal(selectBestVerifiedBuyLink([amazonLink], ctx)?.id, "6bbf8586-a87e-46de-932c-2bc341587619");

    const unsafeWaterdropLink = {
      id: "8fb8189c-6c29-46c9-ae95-d3e26be05add",
      retailer_key: "waterdrop",
      retailer_name: "Waterdrop Filter",
      affiliate_url: LT800P_WATERDROP_URL,
      browser_truth_checked_at: "2026-05-18T00:00:00+00",
      browser_truth_classification: "direct_buyable",
      browser_truth_buyable_subtype: BUYABLE_SUBTYPES.BLOCKED_UNSAFE,
    } as const;

    assert.equal(
      selectBestVerifiedBuyLink([unsafeWaterdropLink, amazonLink], ctx)?.id,
      "6bbf8586-a87e-46de-932c-2bc341587619",
    );
    assert.deepEqual(
      filterRealBuyRetailerLinks([unsafeWaterdropLink, amazonLink]).map((r) => r.id),
      ["6bbf8586-a87e-46de-932c-2bc341587619"],
    );
  });
});

describe("staleBrowserTruthShadowClassification (diagnostics after live gate enforcement)", () => {
  const now = new Date("2026-06-10T12:00:00.000Z");
  const freshCheckedAt = "2026-05-01T00:00:00.000Z";
  const staleCheckedAt = "2026-01-01T00:00:00.000Z";

  it("buyLinkGateFailureKind blocks stale direct_buyable rows", () => {
    const now = new Date("2026-06-10T12:00:00.000Z");
    assert.equal(
      buyLinkGateFailureKind({
        retailer_key: "amazon",
        affiliate_url: "https://www.amazon.com/dp/B00EXAMPLE",
        browser_truth_classification: "direct_buyable",
        browser_truth_checked_at: staleCheckedAt,
      }, { now }),
      "stale_browser_truth_checked_at",
    );
  });

  it("filterRealBuyRetailerLinks excludes stale direct_buyable rows", () => {
    const links = filterRealBuyRetailerLinks([
      {
        retailer_key: "amazon",
        affiliate_url: "https://www.amazon.com/dp/B00EXAMPLE",
        browser_truth_classification: "direct_buyable",
        browser_truth_checked_at: staleCheckedAt,
      },
    ]);
    assert.equal(links.length, 0);
  });

  it("returns null for missing checked_at because buyLinkGateFailureKind enforces at gate", () => {
    const shadow = staleBrowserTruthShadowClassification(
      {
        retailer_key: "amazon",
        affiliate_url: "https://www.amazon.com/dp/B00EXAMPLE",
        browser_truth_classification: "direct_buyable",
        browser_truth_checked_at: null,
      },
      { now },
    );
    assert.equal(shadow, null);
    assert.equal(
      buyLinkGateFailureKind({
        retailer_key: "amazon",
        affiliate_url: "https://www.amazon.com/dp/B00EXAMPLE",
        browser_truth_classification: "direct_buyable",
        browser_truth_checked_at: null,
      }, { now }),
      "missing_browser_truth_checked_at",
    );
  });

  it("returns null for stale checked_at because buyLinkGateFailureKind enforces at gate", () => {
    const shadow = staleBrowserTruthShadowClassification(
      {
        retailer_key: "amazon",
        affiliate_url: "https://www.amazon.com/dp/B00EXAMPLE",
        browser_truth_classification: "direct_buyable",
        browser_truth_checked_at: staleCheckedAt,
      },
      { now },
    );
    assert.equal(shadow, null);
    assert.equal(
      buyLinkGateFailureKind({
        retailer_key: "amazon",
        affiliate_url: "https://www.amazon.com/dp/B00EXAMPLE",
        browser_truth_classification: "direct_buyable",
        browser_truth_checked_at: staleCheckedAt,
      }, { now }),
      "stale_browser_truth_checked_at",
    );
  });

  it("returns null for fresh direct_buyable rows", () => {
    assert.equal(
      staleBrowserTruthShadowClassification(
        {
          retailer_key: "amazon",
          affiliate_url: "https://www.amazon.com/dp/B00EXAMPLE",
          browser_truth_classification: "direct_buyable",
          browser_truth_checked_at: freshCheckedAt,
        },
        { now },
      ),
      null,
    );
  });

  it("summarizeStaleBrowserTruthShadowCounts separates fresh and stale live links", () => {
    const summary = summarizeStaleBrowserTruthShadowCounts(
      [
        {
          retailer_key: "amazon",
          affiliate_url: "https://www.amazon.com/dp/B00FRESH",
          browser_truth_classification: "direct_buyable",
          browser_truth_checked_at: freshCheckedAt,
        },
        {
          retailer_key: "amazon",
          affiliate_url: "https://www.amazon.com/dp/B00STALE",
          browser_truth_classification: "direct_buyable",
          browser_truth_checked_at: staleCheckedAt,
        },
        {
          retailer_key: "google-search",
          affiliate_url: "https://www.google.com/search?q=filter",
          browser_truth_classification: "direct_buyable",
          browser_truth_checked_at: staleCheckedAt,
        },
      ],
      { now },
    );

    assert.equal(summary.live_direct_buyable_count, 1);
    assert.equal(summary.stale_shadow_count, 0);
    assert.equal(summary.fresh_direct_buyable_count, 1);
  });
});
