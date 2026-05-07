import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { FridgeModelFilterSection } from "@/components/fridge/FridgeModelFilterSection";
import { VisualReplacementMatchCard } from "@/components/trust/VisualReplacementMatchCard";
import type { FridgeMappedFilterRow } from "@/lib/data/fridges";

function baseLink(overrides: Partial<FridgeMappedFilterRow["retailer_links"][0]> = {}) {
  return {
    id: "link-1",
    retailer_name: "Example Store",
    affiliate_url: "https://www.example.com/product/lt1000p",
    retailer_key: "amazon",
    browser_truth_classification: "direct_buyable",
    browser_truth_buyable_subtype: "SINGLE_UNIT_DIRECT_BUYABLE",
    browser_truth_checked_at: "2026-05-05T00:00:00.000Z",
    ...overrides,
  };
}

const sampleFilter = {
  id: "filter-1",
  brand_id: "brand-1",
  slug: "lt1000p",
  name: "LG LT1000P",
  notes: "Use your old filter number as final check.",
  oem_part_number: "LT1000P",
  replacement_interval_months: 6,
  compatible_fridge_model_count: 20,
  retailer_links: [baseLink()],
  retailer_links_raw_count: 1,
  also_known_as: ["ADQ74793501"],
  buy_path_gate_suppression: {
    hadSearchPlaceholderRows: false,
    hadMissingBrowserTruthRows: false,
    hadUnsafeBrowserTruthRows: false,
  },
} as unknown as FridgeMappedFilterRow;

const sampleFilter2 = {
  ...sampleFilter,
  id: "filter-2",
  slug: "lt800p",
  name: "LG LT800P",
  oem_part_number: "LT800P",
  also_known_as: [],
  retailer_links: [baseLink({ id: "link-2" })],
} as unknown as FridgeMappedFilterRow;

describe("FridgeModelFilterSection", () => {
  it("quarantine notice renders with no /go links and no filter list section", () => {
    const html = renderToStaticMarkup(
      createElement(FridgeModelFilterSection, {
        filters: [sampleFilter],
        quarantineMessage:
          "We're reviewing this model before recommending a replacement filter. Filter information for this model conflicts across sources, so no buying options appear yet.",
      }),
    );
    assert.ok(html.includes("Filter guidance"));
    assert.ok(html.includes("no buying options appear yet"));
    assert.ok(!html.includes('href="/go/'));
    assert.ok(!html.includes("Full detail for each number"));
    assert.ok(!html.includes("Open a verified listing"));
    assert.ok(!html.includes("Numbers to compare"));
  });

  it("non-quarantined section uses short intro and anti-ranking language", () => {
    const html = renderToStaticMarkup(
      createElement(FridgeModelFilterSection, {
        filters: [sampleFilter, sampleFilter2],
      }),
    );
    assert.ok(html.includes("Full detail for each number"));
    assert.ok(html.includes("chips above"));
    assert.ok(html.includes("Not a ranked list"));
    assert.equal(/\bOption\s*1\b/i.test(html), false);
    assert.equal(/\bOption\s*2\b/i.test(html), false);
    assert.ok(html.includes("LT1000P"));
    assert.ok(html.includes("Open filter details"));
    assert.ok(html.includes("Open a verified listing"));
    assert.ok(html.includes("Buying options (secondary"));
    assert.ok(html.includes('href="/go/'));
    assert.ok(!html.includes("Do not pick by order"));
  });

  it("store navigation uses /go hop, not raw affiliate URLs in primary anchors", () => {
    const html = renderToStaticMarkup(
      createElement(FridgeModelFilterSection, {
        filters: [sampleFilter],
      }),
    );
    assert.ok(html.includes('href="/go/link-1"'));
    assert.ok(!html.includes('href="https://www.example.com/product/lt1000p"'));
  });

  it("multiple mapped filters preserve OEM sort order in markup without option labels", () => {
    const html = renderToStaticMarkup(
      createElement(FridgeModelFilterSection, {
        filters: [sampleFilter, sampleFilter2],
      }),
    );
    const lt1000 = html.indexOf("LT1000P");
    const lt800 = html.indexOf("LT800P");
    assert.ok(lt1000 >= 0 && lt800 >= 0 && lt1000 < lt800);
    assert.equal(/\bOption\b/i.test(html), false);
  });

  it("copy avoids unsupported guarantees and internal jargon", () => {
    const html = renderToStaticMarkup(
      createElement(FridgeModelFilterSection, {
        filters: [sampleFilter],
      }),
    );
    assert.equal(/\bguaranteed\b/i.test(html), false);
    assert.equal(/\b100%\b/.test(html), false);
    const banned = [
      /\bPDP\b/i,
      /\bbrowser truth\b/i,
      /\bdirect_buyable\b/i,
      /\bcanonical slug\b/i,
      /Published OEM-style/i,
      /store links/i,
      /store buttons/i,
      /buy-link/i,
      /checkout deep link/i,
      /retailer targets/i,
      /finished our listing review/i,
      /pass BuckParts checks/i,
      /fully vetted/i,
      /guaranteed/i,
      /safe to buy/i,
    ];
    for (const rx of banned) {
      assert.equal(rx.test(html), false, `unexpected internal term: ${rx}`);
    }
  });

  it("sanitizes nested filter notes for homeowner-safe rendering", () => {
    const html = renderToStaticMarkup(
      createElement(FridgeModelFilterSection, {
        filters: [
          {
            ...sampleFilter,
            notes:
              "Published OEM-style part number; confirm year/trim with LG/Samsung/GE/Whirlpool/Frigidaire fit charts.",
          } as unknown as FridgeMappedFilterRow,
        ],
      }),
    );
    assert.ok(!html.includes("Published OEM-style part number"));
    assert.ok(
      html.includes("Compare the number printed on your cartridge or housing to the number on this page."),
    );
  });

  it("quarantine + generic homeowner card copy avoids internal jargon", () => {
    const cardHtml = renderToStaticMarkup(
      createElement(VisualReplacementMatchCard, {
        variant: "fridge_model",
        brandName: "LG",
        brandSlug: "lg",
        modelNumber: "LRFXS3106S",
        mappedFilterCount: 0,
        connectedFilters: [],
        formFactor: "unknown",
        replacementIntervalHint: null,
      }),
    );
    const quarantineHtml = renderToStaticMarkup(
      createElement(FridgeModelFilterSection, {
        filters: [sampleFilter],
        quarantineMessage:
          "We're reviewing this model before recommending a replacement filter. Filter information for this model conflicts across sources, so no buying options appear yet.",
      }),
    );
    const html = `${cardHtml}\n${quarantineHtml}`;
    assert.ok(cardHtml.includes("Next steps"));
    assert.ok(!cardHtml.includes("data-form-factor-visual="));
    assert.ok(!cardHtml.includes("<svg"));
    const banned = [/\bPDP\b/i, /\bbrowser truth\b/i, /\bdirect_buyable\b/i, /\bcanonical slug\b/i, /\btoken\b/i];
    for (const rx of banned) {
      assert.equal(rx.test(html), false, `unexpected internal term: ${rx}`);
    }
  });

  it("quarantine keeps no chips or /go even when form-factor evidence is present", () => {
    const cardHtml = renderToStaticMarkup(
      createElement(VisualReplacementMatchCard, {
        variant: "fridge_model",
        brandName: "LG",
        brandSlug: "lg",
        modelNumber: "LRFXS3106S",
        mappedFilterCount: 0,
        connectedFilters: [],
        formFactor: "french_door_bottom_freezer",
        replacementIntervalHint: null,
      }),
    );
    const quarantineHtml = renderToStaticMarkup(
      createElement(FridgeModelFilterSection, {
        filters: [sampleFilter],
        quarantineMessage:
          "We're reviewing this model before recommending a replacement filter. Filter information for this model conflicts across sources, so no buying options appear yet.",
      }),
    );
    assert.ok(!cardHtml.includes("data-form-factor-visual="));
    assert.ok(!cardHtml.includes("<svg"));
    assert.ok(!quarantineHtml.includes("Numbers to compare"));
    assert.ok(!quarantineHtml.includes('href="/go/'));
  });
});
