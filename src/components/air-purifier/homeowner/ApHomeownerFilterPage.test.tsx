import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import type { BuyLinkRow } from "@/components/BuyLinks";
import { AP_HOMEOWNER_LEVOIT_RF_RAR040_COPY } from "@/lib/copy/ap-homeowner-levoit-rf-rar040-v1";
import { AP_HOMEOWNER_MEDIFY_MA50_RF_COPY } from "@/lib/copy/ap-homeowner-medify-ma50-rf-v1";
import type { PartTrustSummary } from "@/lib/trust/part-trust";

import { ApHomeownerFilterPage } from "./ApHomeownerFilterPage";

const medifyVerifiedLink: BuyLinkRow = {
  id: "link-oem",
  retailer_name: "OEM / manufacturer catalog (keyword lookup)",
  affiliate_url: "https://medifyair.com/products/ma-50-replacement-filter",
  is_primary: true,
  retailer_key: "oem-catalog",
  browser_truth_classification: "direct_buyable",
  browser_truth_checked_at: "2026-06-15T17:49:12.389Z",
};

const levoitVerifiedLink: BuyLinkRow = {
  id: "link-levoit-oem",
  retailer_name: "OEM / manufacturer catalog (keyword lookup)",
  affiliate_url: "https://levoit.com/products/core-400s-p-3-stage-replacement-filter",
  is_primary: true,
  retailer_key: "oem-catalog",
  browser_truth_classification: "direct_buyable",
  browser_truth_checked_at: "2026-06-12T22:15:23.992Z",
};

const medifyModels = [
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

const levoitModels = [
  {
    id: "model-core-400s",
    slug: "levoit-core-400s",
    model_number: "Core 400S",
    brand: { name: "Levoit" },
  },
  {
    id: "model-lap-c401s",
    slug: "levoit-lap-c401s-wusr",
    model_number: "LAP-C401S-WUSR",
    brand: { name: "Levoit" },
  },
  {
    id: "model-core-450s",
    slug: "levoit-core-450s",
    model_number: "Core 450S",
    brand: { name: "Levoit" },
  },
];

function trust(
  link: BuyLinkRow,
  overrides: Partial<PartTrustSummary> = {},
): PartTrustSummary {
  return {
    match_confidence: "high",
    match_basis: "compatibility_mapping",
    oem_or_compatible: "oem",
    compatible_risk_level: "low",
    evidence_notes: ["2 mapped compatible models in the repo"],
    requires_manual_verification: false,
    approved_retailer_links: 1,
    preferred_winner_link: link,
    replacement_reasoning_summary: "",
    buyer_path_state: "show_confident_buy",
    ...overrides,
  };
}

const buyPathSortContext = {
  exactOemCatalogPart: true,
  expectedOemPartNumber: "MEDIFY-MA-50-RF",
  waterdropExactProofSlice: false,
};

describe("ApHomeownerFilterPage", () => {
  it("renders the Medify MA-50 homeowner filter page with verified CTA stack", () => {
    const html = renderToStaticMarkup(
      createElement(ApHomeownerFilterPage, {
        copy: AP_HOMEOWNER_MEDIFY_MA50_RF_COPY,
        oemPartNumber: "MEDIFY-MA-50-RF",
        filterName: "MA-50 replacement HEPA filter",
        replacementIntervalMonths: 6,
        models: medifyModels,
        retailerLinks: [medifyVerifiedLink],
        trust: trust(medifyVerifiedLink),
        gateSuppressionSummary: {
          hadSearchPlaceholderRows: false,
          hadIndirectDiscoveryRows: false,
          hadBrokenDestinationRows: false,
          hadMissingBrowserTruthRows: false,
          hadUnsafeBrowserTruthRows: false,
        },
        buyPathSortContext,
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
    assert.ok(
      html.includes(
        "Other Medify models — MA-14, MA-15, MA-25, MA-35, MA-40, and MA-112 — use different filters.",
      ),
    );
    assert.ok(html.includes("If your unit says one of those, search that model instead."));
    assert.ok(html.includes("Works with these purifiers"));
    assert.ok(html.includes("Medify MA-50"));
    assert.ok(html.includes('href="/air-purifier/model/medify-ma50"'));
    assert.ok(html.includes("checked against Medify&#x27;s official product listing."));
    assert.ok(html.includes("re-checks listings periodically"));
    assert.ok(html.includes("Most recent listing check: Jun 15, 2026"));
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

  it("uses the Medify suppress path when buyer_path_state is suppress_buy", () => {
    const html = renderToStaticMarkup(
      createElement(ApHomeownerFilterPage, {
        copy: AP_HOMEOWNER_MEDIFY_MA50_RF_COPY,
        oemPartNumber: "MEDIFY-MA-50-RF",
        filterName: "MA-50 replacement HEPA filter",
        replacementIntervalMonths: 6,
        models: medifyModels,
        retailerLinks: [],
        trust: trust(medifyVerifiedLink, {
          buyer_path_state: "suppress_buy",
          approved_retailer_links: 0,
          preferred_winner_link: null,
        }),
        buyPathSortContext,
      }),
    );

    assert.equal(html.includes('href="/air-purifier/go/'), false);
    assert.ok(html.includes("No verified link right now"));
    assert.ok(html.includes("No checked buy link right now for this MA-50 filter."));
    assert.equal(html.includes("checked against Medify&#x27;s official product listing."), false);
  });

  it("renders the Levoit RAR040 homeowner filter page with verified CTA stack", () => {
    const html = renderToStaticMarkup(
      createElement(ApHomeownerFilterPage, {
        copy: AP_HOMEOWNER_LEVOIT_RF_RAR040_COPY,
        oemPartNumber: "LEVOIT-RF-RAR040",
        filterName: "Core 400 / Core 400S replacement filter",
        replacementIntervalMonths: 6,
        models: levoitModels,
        retailerLinks: [levoitVerifiedLink],
        trust: trust(levoitVerifiedLink),
        buyPathSortContext: {
          exactOemCatalogPart: true,
          expectedOemPartNumber: "LEVOIT-RF-RAR040",
          waterdropExactProofSlice: false,
        },
      }),
    );

    assert.ok(html.includes("Levoit Core 400 / Core 400S replacement filter"));
    assert.ok(html.includes("The filter for your Core 400 / Core 400S"));
    assert.ok(html.includes("LEVOIT-RF-RAR040"));
    assert.ok(html.includes("If your label says Core 400 or Core 400S, you&#x27;re in the right place."));
    assert.ok(
      html.includes(
        "Other Levoit Core families — Core 200, Core 300, and Core 600 — use different filters.",
      ),
    );
    assert.ok(html.includes("If your unit is one of those, search that model instead."));
    assert.ok(html.includes("View official Levoit replacement filter"));
    assert.ok(html.includes('href="/air-purifier/go/link-levoit-oem"'));
    assert.ok(html.includes("Levoit Core 400S"));
    assert.ok(html.includes("model code LAP-C401S-WUSR"));
    assert.ok(html.includes("checked against Levoit&#x27;s official product listing."));
    assert.ok(html.includes("Most recent listing check: Jun 12, 2026"));
    assert.equal(html.includes("OEM / manufacturer catalog (keyword lookup)"), false);
  });

  it("uses the Levoit suppress path when buyer_path_state is suppress_buy", () => {
    const html = renderToStaticMarkup(
      createElement(ApHomeownerFilterPage, {
        copy: AP_HOMEOWNER_LEVOIT_RF_RAR040_COPY,
        oemPartNumber: "LEVOIT-RF-RAR040",
        filterName: "Core 400 / Core 400S replacement filter",
        replacementIntervalMonths: 6,
        models: levoitModels,
        retailerLinks: [],
        trust: trust(levoitVerifiedLink, {
          buyer_path_state: "suppress_buy",
          approved_retailer_links: 0,
          preferred_winner_link: null,
        }),
        buyPathSortContext: {
          exactOemCatalogPart: true,
          expectedOemPartNumber: "LEVOIT-RF-RAR040",
          waterdropExactProofSlice: false,
        },
      }),
    );

    assert.equal(html.includes('href="/air-purifier/go/'), false);
    assert.ok(html.includes("No verified link right now"));
    assert.ok(html.includes("No checked buy link right now for this Core 400 / Core 400S filter."));
    assert.equal(html.includes("checked against Levoit&#x27;s official product listing."), false);
  });
});
