import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import {
  deriveFridgeFilterStorePlainStatus,
  VisualReplacementMatchCard,
} from "@/components/trust/VisualReplacementMatchCard";
import type { FridgeMappedFilterRow } from "@/lib/data/fridges";

const connectedRow = {
  id: "f1",
  slug: "lt1000p",
  oem_part_number: "LT1000P",
} as unknown as FridgeMappedFilterRow;

function forbidHomeownerJargon(html: string) {
  const banned = [
    /\bPDP\b/i,
    /\bbrowser truth\b/i,
    /\bdirect_buyable\b/i,
    /\bcanonical\s+slug\b/i,
    /\btoken\b/i,
  ];
  for (const rx of banned) {
    assert.ok(!rx.test(html), `unexpected jargon matching ${rx}: ${html.slice(0, 240)}`);
  }
}

function forbidUnsupportedHealthOrGuarantee(html: string) {
  const banned = [
    /removes\s+all\s+contaminants/i,
    /\bguaranteed\s+fit\b/i,
    /\b100%\s*(pure|safe)\b/i,
    /\bcures\b/i,
    /\bprevents\s+cancer\b/i,
  ];
  for (const rx of banned) {
    assert.ok(!rx.test(html), `unsupported claim matching ${rx}`);
  }
}

describe("VisualReplacementMatchCard", () => {
  it("fridge_filter renders aliases and checklist without jargon", () => {
    const html = renderToStaticMarkup(
      createElement(VisualReplacementMatchCard, {
        variant: "fridge_filter",
        brandName: "Example Appliance Co.",
        brandSlug: "example",
        oemPartNumber: "EDR1RXD1",
        productName: "Example cartridge name",
        aliases: ["FILTER-A", "FILTER-B"],
        intervalLabel: "About every 6 months",
        compatibleModelCount: 12,
        storePlainStatus: "options_after_checks",
      }),
    );
    assert.ok(html.includes("We found this filter"));
    assert.ok(html.includes("EDR1RXD1"));
    assert.ok(html.includes("FILTER-A"));
    assert.ok(html.includes("Need help finding the filter?"));
    assert.ok(html.includes("<details"));
    assert.ok(html.includes("Where to look"));
    assert.ok(html.includes("How replacement usually works"));
    assert.ok(html.includes("Why replacement matters"));
    assert.ok(html.includes("What to compare before buying"));
    assert.ok(html.includes("Compare the OEM or part number"));
    assert.ok(
      html.includes("owner’s manual is the best guide") ||
        html.includes("owner's manual is the best guide"),
    );
    assert.ok(html.includes("Many refrigerator water filters are inside the fridge"));
    assert.ok(html.includes("near the lower grille"));
    assert.ok(html.includes("Do not force it."));
    assert.ok(!html.includes("Match the number on your current filter"));
    forbidHomeownerJargon(html);
    forbidUnsupportedHealthOrGuarantee(html);
  });

  it("fridge_model renders next steps and collapsible long help without jargon", () => {
    const html = renderToStaticMarkup(
      createElement(VisualReplacementMatchCard, {
        variant: "fridge_model",
        brandName: "Example Appliance Co.",
        brandSlug: "example",
        modelNumber: "WRS325SDHZ",
        mappedFilterCount: 2,
        connectedFilters: [connectedRow],
        replacementIntervalHint: "Suggested replacement timing: About every 6 months",
      }),
    );
    assert.ok(html.includes("We found your refrigerator"));
    assert.ok(html.includes('data-form-factor-visual="generic-unknown"'));
    assert.ok(html.includes("WRS325SDHZ"));
    assert.ok(html.includes("Next steps"));
    assert.ok(html.includes("Numbers to compare"));
    assert.ok(html.includes("LT1000P"));
    assert.ok(html.includes("Find the number on your old filter."));
    assert.ok(html.includes("See the same number below? Select it."));
    assert.ok(html.includes("Not sure? Check your owner’s manual first."));
    assert.ok(html.includes("Need help finding the filter?"));
    assert.ok(html.includes("<details"));
    assert.ok(html.includes("Where to look"));
    assert.ok(html.includes("How replacement usually works"));
    assert.ok(html.includes("Why replacement matters"));
    assert.ok(html.includes("What to compare before buying"));
    assert.ok(
      html.includes("owner’s manual is the best guide") ||
        html.includes("owner's manual is the best guide"),
    );
    assert.ok(html.includes("Many refrigerator water filters are inside the fridge"));
    assert.ok(html.includes("Do not force it."));
    assert.equal(/\bFrench Door\b/i.test(html), false);
    assert.equal(/\btop freezer\b/i.test(html), false);
    assert.equal(/\bside-by-side\b/i.test(html), false);
    const idxNext = html.indexOf("Next steps");
    const idxLong = html.indexOf("How replacement usually works");
    assert.ok(idxNext >= 0 && idxLong > idxNext, "long homeowner help should follow next steps");
    forbidHomeownerJargon(html);
    forbidUnsupportedHealthOrGuarantee(html);
  });

  it("fridge_model with no mapped filters uses neutral second-step copy", () => {
    const html = renderToStaticMarkup(
      createElement(VisualReplacementMatchCard, {
        variant: "fridge_model",
        brandName: "Example Appliance Co.",
        brandSlug: "example",
        modelNumber: "WRS325SDHZ",
        mappedFilterCount: 0,
        connectedFilters: [],
        replacementIntervalHint: null,
      }),
    );
    assert.ok(html.includes("When your number appears on this page, select it."));
    assert.ok(!html.includes("See the same number below? Select it."));
    assert.ok(!html.includes("Numbers to compare"));
    assert.ok(html.includes('data-form-factor-visual="generic-unknown"'));
    assert.ok(!html.includes("<img"));
    assert.ok(!/https?:\/\/(www\.)?(lg|lowes|amazon)\./i.test(html));
    forbidHomeownerJargon(html);
  });

  it("deriveFridgeFilterStorePlainStatus matches gated/raw/button visibility", () => {
    assert.equal(
      deriveFridgeFilterStorePlainStatus({
        gatedLinkCount: 2,
        rawLinkCount: 3,
        buyerPathShowsStoreButtons: true,
      }),
      "options_after_checks",
    );
    assert.equal(
      deriveFridgeFilterStorePlainStatus({
        gatedLinkCount: 0,
        rawLinkCount: 2,
        buyerPathShowsStoreButtons: false,
      }),
      "buttons_hidden_pending_checks",
    );
    assert.equal(
      deriveFridgeFilterStorePlainStatus({
        gatedLinkCount: 0,
        rawLinkCount: 0,
        buyerPathShowsStoreButtons: false,
      }),
      "none_yet",
    );
  });
});
