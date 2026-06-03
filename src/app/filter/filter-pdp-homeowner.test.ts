import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { TrustAwareBuySection } from "@/components/trust/TrustAwareBuySection";
import { VisualReplacementMatchCard } from "@/components/trust/VisualReplacementMatchCard";
import type { PartTrustSummary } from "@/lib/trust/part-trust";

const bannedInPublicFilterHtml = [
  /\bOEM\b/i,
  /\bCTA\b/i,
  /\bPDP\b/i,
  /\bSERP\b/i,
  /\bSKU\b/i,
  /\bcanonical\b/i,
  /\baffiliate-ready\b/i,
  /\btoken\b/i,
  /\bdirect_buyable\b/i,
  /\bcompatibility mapping\b/i,
  /OEM-style/i,
  /manufacturer search/i,
  /discovery URL/i,
  /buy-link/i,
  /retailer target/i,
  /checkout deep/i,
  /fully vetted/i,
  /guaranteed/i,
  /safe to buy/i,
  /completely trust/i,
  /finished our listing review/i,
  /pass BuckParts checks/i,
  /store links/i,
  /store buttons/i,
  /checkout deep link/i,
  /retailer targets/i,
];

function baseTrust(over: Partial<PartTrustSummary>): PartTrustSummary {
  return {
    match_confidence: "high",
    match_basis: "compatibility_mapping",
    oem_or_compatible: "oem",
    compatible_risk_level: "low",
    evidence_notes: [],
    requires_manual_verification: false,
    approved_retailer_links: 0,
    preferred_winner_link: null,
    replacement_reasoning_summary: "",
    buyer_path_state: "suppress_buy",
    ...over,
  };
}

describe("refrigerator filter PDP homeowner trust copy", () => {
  it("hero renders next steps, no clipart visual block, and no internal jargon", () => {
    const html = renderToStaticMarkup(
      createElement(VisualReplacementMatchCard, {
        variant: "fridge_filter",
        brandName: "LG",
        brandSlug: "lg",
        oemPartNumber: "LT1000P",
        productName: "Example cartridge",
        aliases: ["ALT-1"],
        intervalLabel: "About every 6 months",
        compatibleModelCount: 3,
        storePlainStatus: "options_after_checks",
      }),
    );
    assert.ok(html.includes("We found this filter"));
    assert.ok(html.includes("Next steps"));
    assert.ok(html.includes("Compare this number to the one printed on your old filter."));
    assert.ok(html.includes("If it matches, use this page."));
    assert.ok(html.includes("If you’re not sure, check your owner’s manual or a refrigerator model page below."));
    assert.ok(
      html.includes(
        "When a BuckParts Verified Link appears below, we checked that retailer product page against this part number. Compare it with your old filter before ordering.",
      ),
    );
    assert.ok(!html.includes("data-filter-visual="));
    assert.ok(!html.includes("<svg"));
    for (const rx of bannedInPublicFilterHtml) {
      assert.ok(!rx.test(html), `unexpected jargon matching ${rx}`);
    }
  });

  it("suppress path shows plain homeowner copy, gate hints, and no /go links", () => {
    const html = renderToStaticMarkup(
      createElement(TrustAwareBuySection, {
        trust: baseTrust({ buyer_path_state: "suppress_buy" }),
        links: [
          {
            id: "link-1",
            retailer_name: "Example",
            affiliate_url: "https://www.example.com/p/1",
            retailer_key: "amazon",
            browser_truth_classification: "direct_buyable",
            browser_truth_buyable_subtype: "SINGLE_UNIT_DIRECT_BUYABLE",
          },
        ],
        goBase: "/go",
        primaryCtaLabel: "Buy at",
        suppressMessage:
          "No BuckParts Verified Link yet for this filter number. We haven’t found a retailer product page we’re comfortable showing.",
        gateSuppressionSummary: {
          hadSearchPlaceholderRows: true,
          hadIndirectDiscoveryRows: false,
          hadBrokenDestinationRows: false,
          hadMissingBrowserTruthRows: true,
          hadUnsafeBrowserTruthRows: true,
        },
      }),
    );
    assert.ok(!html.includes('href="/go/'));
    assert.ok(
      html.includes(
        "No BuckParts Verified Link yet for this filter number. We haven’t found a retailer product page we’re comfortable showing.",
      ),
    );
    for (const rx of bannedInPublicFilterHtml) {
      assert.ok(!rx.test(html), `unexpected jargon matching ${rx}`);
    }
  });

  it("buyable path still renders primary /go link through TieredBuyLinks", () => {
    const html = renderToStaticMarkup(
      createElement(TrustAwareBuySection, {
        trust: baseTrust({
          buyer_path_state: "show_confident_buy",
          approved_retailer_links: 1,
        }),
        links: [
          {
            id: "go-primary",
            retailer_name: "Example Store",
            affiliate_url: "https://www.amazon.com/dp/B0TESTEXAM",
            retailer_key: "amazon",
            browser_truth_classification: "direct_buyable",
            browser_truth_buyable_subtype: "SINGLE_UNIT_DIRECT_BUYABLE",
            browser_truth_checked_at: "2026-05-04T15:00:00.000Z",
          },
        ],
        goBase: "/go",
        primaryCtaLabel: "Buy at",
        suppressMessage: "n/a",
      }),
    );
    assert.ok(html.includes('href="/go/go-primary"'));
    assert.ok(html.includes("2026-05-04"));
  });

  it("vertical filter default suppress message uses verified-link wording", () => {
    const src = readFileSync(
      join(process.cwd(), "src/components/vertical/VerticalFilterPageContent.tsx"),
      "utf8",
    );
    assert.ok(src.includes("BUCKPARTS_VERIFIED_LINK_SUPPRESS_DEFAULT"));
    assert.ok(!/store button/i.test(src));
  });
});
