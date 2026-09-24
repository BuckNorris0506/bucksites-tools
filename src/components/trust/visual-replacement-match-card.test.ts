import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import {
  deriveFridgeFilterStorePlainStatus,
  VisualReplacementMatchCard,
} from "@/components/trust/VisualReplacementMatchCard";
import { FRIDGE_MODEL_PDP_CARTRIDGE_CONFIRMATION } from "@/lib/copy/buckparts-verified-link-copy";
import type { FridgeMappedFilterRow } from "@/lib/data/fridges";

const connectedRow = {
  id: "f1",
  slug: "lt1000p",
  oem_part_number: "LT1000P",
  name: "Example filter",
  also_known_as: ["ALT-A"],
} as unknown as FridgeMappedFilterRow;

function forbidHomeownerJargon(html: string) {
  const banned = [
    /\bPDP\b/i,
    /\bOEM\b/i,
    /\bCTA\b/i,
    /\bSERP\b/i,
    /\bSKU\b/i,
    /\baffiliate-ready\b/i,
    /\bbrowser truth\b/i,
    /\bdirect_buyable\b/i,
    /\bcanonical\s+slug\b/i,
    /\btoken\b/i,
    /\bOEM-style\b/i,
    /\bbuy-link\b/i,
    /checkout deep link/i,
    /retailer targets/i,
    /store links/i,
    /store buttons/i,
    /finished our listing review/i,
    /pass BuckParts checks/i,
    /discovery URL/i,
    /retailer target/i,
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
    /\bfully vetted\b/i,
    /\bguaranteed\b/i,
    /\bsafe to buy\b/i,
    /\bcompletely trust\b/i,
  ];
  for (const rx of banned) {
    assert.ok(!rx.test(html), `unsupported claim matching ${rx}`);
  }
}

describe("VisualReplacementMatchCard", () => {
  it("fridge_filter renders identity and aliases once without inline help or buy copy", () => {
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
    assert.ok(html.includes("This part"));
    assert.ok(html.includes("EDR1RXD1"));
    assert.ok(html.includes("FILTER-A"));
    assert.ok(html.includes("Also listed as"));
    assert.ok(!html.includes("Next steps"));
    assert.ok(!html.includes("Need help finding the filter?"));
    assert.ok(!html.includes("data-filter-visual="));
    assert.ok(!html.includes("<svg"));
    forbidHomeownerJargon(html);
    forbidUnsupportedHealthOrGuarantee(html);
  });

  it("fridge_model renders replacement answer and single confirmation without help block", () => {
    const html = renderToStaticMarkup(
      createElement(VisualReplacementMatchCard, {
        variant: "fridge_model",
        brandName: "Example Appliance Co.",
        brandSlug: "example",
        modelNumber: "WRS325SDHZ",
        mappedFilterCount: 2,
        connectedFilters: [connectedRow],
        formFactor: "french_door_bottom_freezer",
        replacementIntervalHint: "Suggested replacement timing: About every 6 months",
      }),
    );
    assert.ok(html.includes("Your model"));
    assert.ok(html.includes("Your replacement filter"));
    assert.ok(html.includes("WRS325SDHZ"));
    assert.ok(html.includes("LT1000P"));
    assert.ok(html.includes("Also listed as"));
    assert.ok(html.includes("ALT-A"));
    assert.ok(html.includes(FRIDGE_MODEL_PDP_CARTRIDGE_CONFIRMATION));
    assert.ok(!html.includes("Next steps"));
    assert.ok(!html.includes("Numbers to compare"));
    assert.ok(!html.includes("Need help finding the filter?"));
    assert.ok(!html.includes("data-form-factor-visual="));
    assert.ok(!html.includes("<svg"));
    assert.equal(/\bFrench Door\b/i.test(html), false);
    forbidHomeownerJargon(html);
    forbidUnsupportedHealthOrGuarantee(html);
  });

  it("fridge_model with no mapped filters uses neutral copy", () => {
    const html = renderToStaticMarkup(
      createElement(VisualReplacementMatchCard, {
        variant: "fridge_model",
        brandName: "Example Appliance Co.",
        brandSlug: "example",
        modelNumber: "WRS325SDHZ",
        mappedFilterCount: 0,
        connectedFilters: [],
        formFactor: "unknown",
        replacementIntervalHint: null,
      }),
    );
    assert.ok(html.includes("do not have mapped filter numbers"));
    assert.ok(!html.includes(FRIDGE_MODEL_PDP_CARTRIDGE_CONFIRMATION));
    assert.ok(!html.includes("data-form-factor-visual="));
    assert.ok(!html.includes("<svg"));
    assert.ok(!html.includes("<img"));
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
