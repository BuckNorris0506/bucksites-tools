import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { TrustAwareBuySection } from "@/components/trust/TrustAwareBuySection";
import {
  buyPathSortContextForFilter,
  sortBestVerifiedBuyLinks,
} from "@/lib/retailers/launch-buy-links";
import { BUYABLE_SUBTYPES } from "@/lib/retailers/launch-buy-links";
import type { PartTrustSummary } from "@/lib/trust/part-trust";

import {
  checkExpectedPrimaryPurchaseOptionCta,
  extractPurchaseOptionCtaOrderFromHtml,
} from "./purchase-option-cta-order-proof-v1";

const WATERDROP_ID = "d4cbad0c-4bab-4854-89bf-59e6d6492c6b";
const AMAZON_ID = "055f383a-4d14-4997-a19f-894afe56721e";

const DA29_LINKS = [
  {
    id: AMAZON_ID,
    retailer_key: "amazon",
    retailer_name: "Amazon",
    affiliate_url: "https://www.amazon.com/dp/B004UB1NRY",
    browser_truth_classification: "direct_buyable",
    browser_truth_buyable_subtype: null,
    browser_truth_checked_at: "2026-05-20T12:00:00.000Z",
  },
  {
    id: WATERDROP_ID,
    retailer_key: "waterdrop",
    retailer_name: "Waterdrop Filter",
    affiliate_url:
      "https://click.linksynergy.com/link?id=GTFBcFcCW48&offerid=1888875&type=2&murl=https%3a%2f%2fwww.waterdropfilter.com%2fproducts%2fwaterdrop-replacement-for-samsung-da29-00020b-fridge-water-filter",
    browser_truth_classification: "direct_buyable",
    browser_truth_buyable_subtype: BUYABLE_SUBTYPES.COMPATIBLE_REPLACEMENT_DIRECT_BUYABLE,
    browser_truth_checked_at: "2026-05-20T20:00:00+00",
  },
] as const;

function trustShowBuy(): PartTrustSummary {
  return {
    match_confidence: "high",
    match_basis: "compatibility_mapping",
    oem_or_compatible: "oem",
    compatible_risk_level: "low",
    evidence_notes: [],
    requires_manual_verification: false,
    approved_retailer_links: 2,
    preferred_winner_link: null,
    replacement_reasoning_summary: "",
    buyer_path_state: "show_confident_buy",
  };
}

describe("purchase-option CTA order proof v1", () => {
  it("local render at HEAD orders Waterdrop primary before Amazon for da29-00020b", () => {
    const buyPathSortContext = buyPathSortContextForFilter(
      "da29-00020b",
      "Samsung DA29-00020B / HAF-CIN family",
      "DA29-00020B",
    );
    const sorted = sortBestVerifiedBuyLinks([...DA29_LINKS], buyPathSortContext);
    assert.equal(sorted[0]?.id, WATERDROP_ID);

    const html = renderToStaticMarkup(
      createElement(TrustAwareBuySection, {
        trust: trustShowBuy(),
        links: [...DA29_LINKS],
        goBase: "/go",
        primaryCtaLabel: "Buy this part at",
        suppressMessage: "n/a",
        buyPathSortContext,
      }),
    );

    const proof = extractPurchaseOptionCtaOrderFromHtml(html);
    assert.equal(proof.primary?.link_id, WATERDROP_ID);
    assert.deepEqual(
      proof.cta_order.map((e) => e.link_id),
      [WATERDROP_ID, AMAZON_ID],
    );

    const check = checkExpectedPrimaryPurchaseOptionCta(html, WATERDROP_ID);
    assert.equal(check.ok, true);
  });

  it("extractPurchaseOptionCtaOrder ignores document Amazon before buying-options block", () => {
    const html = `<div>Amazon mentioned in unrelated copy</div>
      <p class="text-xs">Buying options</p>
      <a href="/go/${WATERDROP_ID}">Waterdrop Filter→</a>
      <p>Other options</p>
      <a href="/go/${AMAZON_ID}">Amazon→</a>`;
    const proof = extractPurchaseOptionCtaOrderFromHtml(html);
    assert.equal(proof.raw_text_index_amazon, 5);
    assert.equal(proof.primary?.link_id, WATERDROP_ID);
    assert.equal(proof.cta_order[1]?.link_id, AMAZON_ID);
  });

  it("checkExpectedPrimary fails when primary is Amazon but Waterdrop expected", () => {
    const html = `<p>Buying options</p>
      <a href="/go/${AMAZON_ID}"><span class="sr-only">Buy at </span>Amazon→</a>
      <p>Other options</p>
      <a href="/go/${WATERDROP_ID}">Waterdrop Filter→</a>`;
    const check = checkExpectedPrimaryPurchaseOptionCta(html, WATERDROP_ID);
    assert.equal(check.ok, false);
    assert.match(check.reason, /Primary CTA is Amazon/);
  });
});
