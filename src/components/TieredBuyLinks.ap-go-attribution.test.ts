import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import type { BuyLinkRow } from "@/components/BuyLinks";
import { TieredBuyLinks } from "@/components/TieredBuyLinks";
import {
  buildAirPurifierFilterGoAttribution,
  buildAirPurifierModelGoAttribution,
} from "@/lib/retailers/ap-go-attribution-v1";

const gatedLink: BuyLinkRow = {
  id: "550e8400-e29b-41d4-a716-446655440000",
  retailer_name: "Amazon",
  affiliate_url: "https://www.amazon.com/dp/B0DR6X4N35",
  is_primary: true,
  retailer_key: "amazon",
  browser_truth_classification: "direct_buyable",
};

describe("TieredBuyLinks AP go attribution", () => {
  it("survives model-page attribution on primary CTA href", () => {
    const html = renderToStaticMarkup(
      createElement(TieredBuyLinks, {
        links: [gatedLink],
        goBase: "/air-purifier/go",
        goAttribution: buildAirPurifierModelGoAttribution("levoit-core-300"),
      }),
    );
    assert.match(
      html,
      /href="\/air-purifier\/go\/550e8400-e29b-41d4-a716-446655440000\?page_type=air_purifier_model&amp;page_slug=levoit-core-300"/,
    );
  });

  it("survives filter-page attribution on primary CTA href", () => {
    const html = renderToStaticMarkup(
      createElement(TieredBuyLinks, {
        links: [gatedLink],
        goBase: "/air-purifier/go",
        goAttribution: buildAirPurifierFilterGoAttribution("levoit-rf-rar029"),
      }),
    );
    assert.match(
      html,
      /href="\/air-purifier\/go\/550e8400-e29b-41d4-a716-446655440000\?page_type=air_purifier_filter&amp;page_slug=levoit-rf-rar029"/,
    );
  });
});
