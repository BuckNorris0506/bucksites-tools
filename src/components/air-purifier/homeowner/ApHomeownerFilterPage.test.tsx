import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import type { BuyLinkRow } from "@/components/BuyLinks";
import type { PartTrustSummary } from "@/lib/trust/part-trust";

import { ApHomeownerFilterPage } from "./ApHomeownerFilterPage";

const verifiedLink: BuyLinkRow = {
  id: "link-oem",
  retailer_name: "OEM / manufacturer catalog (keyword lookup)",
  affiliate_url: "https://medifyair.com/products/ma-50-replacement-filter",
  is_primary: true,
  retailer_key: "oem-catalog",
  browser_truth_classification: "direct_buyable",
  browser_truth_checked_at: "2026-06-15T17:49:12.389Z",
};

const models = [
  {
    id: "model-ma50",
    slug: "medify-ma50",
    model_number: "MA-50",
    brand: { name: "Medify" },
  },
  {
    id: "model-ma-smart",
    slug: "medify-ma-smart",
    model_number: "MA-Smart",
    brand: { name: "Medify" },
  },
];

function trust(overrides: Partial<PartTrustSummary> = {}): PartTrustSummary {
  return {
    match_confidence: "high",
    match_basis: "compatibility_mapping",
    oem_or_compatible: "oem",
    compatible_risk_level: "low",
    evidence_notes: ["2 mapped compatible models in the repo"],
    requires_manual_verification: false,
    approved_retailer_links: 1,
    preferred_winner_link: verifiedLink,
    replacement_reasoning_summary: "",
    buyer_path_state: "show_confident_buy",
    ...overrides,
  };
}

describe("ApHomeownerFilterPage", () => {
  it("renders the Medify MA-50 homeowner filter page with verified CTA stack", () => {
    const html = renderToStaticMarkup(
      createElement(ApHomeownerFilterPage, {
        oemPartNumber: "MEDIFY-MA-50-RF",
        filterName: "MA-50 replacement HEPA filter",
        replacementIntervalMonths: 6,
        models,
        retailerLinks: [verifiedLink],
        trust: trust(),
        gateSuppressionSummary: {
          hadSearchPlaceholderRows: false,
          hadIndirectDiscoveryRows: false,
          hadBrokenDestinationRows: false,
          hadMissingBrowserTruthRows: false,
          hadUnsafeBrowserTruthRows: false,
        },
        buyPathSortContext: {
          exactOemCatalogPart: true,
          expectedOemPartNumber: "MEDIFY-MA-50-RF",
          waterdropExactProofSlice: false,
        },
      }),
    );

    assert.ok(html.includes("Medify MA-50 replacement filter"));
    assert.ok(html.includes("The filter for your Medify MA-50"));
    assert.ok(html.includes("MA-50 replacement HEPA filter"));
    assert.ok(html.includes("MEDIFY-MA-50-RF"));
    assert.ok(html.includes("Look for this code on the filter packaging."));
    assert.ok(html.includes("Replace about every 6 months"));
    assert.ok(html.includes("Exact match"));
    assert.ok(html.includes("Original part"));
    assert.ok(html.includes('href="/air-purifier/go/link-oem"'));
    assert.ok(html.includes("View official Medify replacement filter"));
    assert.ok(html.includes("If your purifier says MA-50, you&#x27;re in the right place."));
    assert.ok(html.includes("If you have a different Medify model, use search instead."));
    assert.ok(html.includes("Works with these purifiers"));
    assert.ok(html.includes("Medify MA-50"));
    assert.ok(html.includes('href="/air-purifier/model/medify-ma50"'));
    assert.ok(html.includes("checked against Medify&#x27;s official product listing."));
    assert.equal(html.includes("BuckParts Verified Link at at"), false);
    assert.equal(html.includes("OEM / manufacturer catalog (keyword lookup)"), false);
    assert.equal(html.includes("BuckParts Verified Links"), false);
    assert.equal(html.includes("verified Jun"), false);
    assert.equal(html.includes("2026-06-15"), false);
    assert.equal(html.includes("mapped compatible models in the repo"), false);
    assert.equal(html.includes("PartTruthPanel"), false);
    assert.equal(html.includes("reference data"), false);
    assert.equal(html.includes("Stay on schedule"), false);
    assert.equal(html.includes("Add your own"), false);
  });

  it("uses the suppress path when buyer_path_state is suppress_buy", () => {
    const html = renderToStaticMarkup(
      createElement(ApHomeownerFilterPage, {
        oemPartNumber: "MEDIFY-MA-50-RF",
        filterName: "MA-50 replacement HEPA filter",
        replacementIntervalMonths: 6,
        models,
        retailerLinks: [],
        trust: trust({
          buyer_path_state: "suppress_buy",
          approved_retailer_links: 0,
          preferred_winner_link: null,
        }),
        buyPathSortContext: {
          exactOemCatalogPart: true,
          expectedOemPartNumber: "MEDIFY-MA-50-RF",
          waterdropExactProofSlice: false,
        },
      }),
    );

    assert.equal(html.includes('href="/air-purifier/go/'), false);
    assert.ok(html.includes("No verified link right now"));
    assert.ok(html.includes("No checked buy link right now for this MA-50 filter."));
    assert.equal(html.includes("checked against Medify&#x27;s official product listing."), false);
  });
});
