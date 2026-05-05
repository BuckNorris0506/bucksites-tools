import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { FridgeModelFilterSection } from "@/components/fridge/FridgeModelFilterSection";
import { VisualReplacementMatchCard } from "@/components/trust/VisualReplacementMatchCard";
import type { FridgeMappedFilterRow } from "@/lib/data/fridges";

const sampleFilter = {
  id: "filter-1",
  brand_id: "brand-1",
  slug: "lt1000p",
  name: "LG LT1000P",
  notes: "Use your old filter number as final check.",
  oem_part_number: "LT1000P",
  replacement_interval_months: 6,
  compatible_fridge_model_count: 20,
  retailer_links: [
    {
      id: "link-1",
      retailer_name: "Example Store",
      affiliate_url: "https://www.example.com/product/lt1000p",
      retailer_key: "amazon",
      browser_truth_classification: "direct_buyable",
      browser_truth_buyable_subtype: "SINGLE_UNIT_DIRECT_BUYABLE",
      browser_truth_checked_at: "2026-05-05T00:00:00.000Z",
    },
  ],
  retailer_links_raw_count: 1,
  also_known_as: [],
  buy_path_gate_suppression: {
    hadSearchPlaceholderRows: false,
    hadMissingBrowserTruthRows: false,
    hadUnsafeBrowserTruthRows: false,
  },
} as unknown as FridgeMappedFilterRow;

describe("FridgeModelFilterSection", () => {
  it("quarantine notice renders with no /go links", () => {
    const html = renderToStaticMarkup(
      createElement(FridgeModelFilterSection, {
        filters: [sampleFilter],
        quarantineMessage:
          "We're reviewing this model before recommending a replacement filter. Filter information for this model conflicts across sources, so we're not showing store buttons yet.",
      }),
    );
    assert.ok(html.includes("Filter guidance"));
    assert.ok(html.includes("not showing store buttons yet"));
    assert.ok(!html.includes('href="/go/'));
    assert.ok(!html.includes("Compatible filters"));
  });

  it("non-quarantined section renders normal mapped filter section and /go links", () => {
    const html = renderToStaticMarkup(
      createElement(FridgeModelFilterSection, {
        filters: [sampleFilter],
      }),
    );
    assert.ok(html.includes("Compatible filters"));
    assert.ok(html.includes("LT1000P"));
    assert.ok(html.includes("Where to buy"));
    assert.ok(html.includes('href="/go/'));
  });

  it("quarantine + generic homeowner card copy avoids internal jargon", () => {
    const cardHtml = renderToStaticMarkup(
      createElement(VisualReplacementMatchCard, {
        variant: "fridge_model",
        brandName: "LG",
        brandSlug: "lg",
        modelNumber: "LRFXS3106S",
        mappedFilterCount: 0,
        replacementIntervalHint: null,
      }),
    );
    const quarantineHtml = renderToStaticMarkup(
      createElement(FridgeModelFilterSection, {
        filters: [sampleFilter],
        quarantineMessage:
          "We're reviewing this model before recommending a replacement filter. Filter information for this model conflicts across sources, so we're not showing store buttons yet.",
      }),
    );
    const html = `${cardHtml}\n${quarantineHtml}`;
    assert.ok(cardHtml.includes("Where to look"));
    assert.ok(cardHtml.includes("How replacement usually works"));
    assert.ok(cardHtml.includes("What to compare before buying"));
    const banned = [/\bPDP\b/i, /\bbrowser truth\b/i, /\bdirect_buyable\b/i, /\bcanonical slug\b/i, /\btoken\b/i];
    for (const rx of banned) {
      assert.equal(rx.test(html), false, `unexpected internal term: ${rx}`);
    }
  });
});
