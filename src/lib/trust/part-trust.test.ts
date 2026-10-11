import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { PartTruthPanel } from "@/components/trust/PartTruthPanel";
import { BUYABLE_SUBTYPES } from "@/lib/retailers/launch-buy-links";
import {
  buildModelPageTrust,
  buildPartPageTrust,
  oemOrCompatibleFromPreferredGatedBuyLink,
} from "@/lib/trust/part-trust";

describe("part-trust", () => {
  it("marks part pages with mapped models and live links as buy-ready", () => {
    const trust = buildPartPageTrust({
      modelsCount: 3,
      retailerLinks: [
        {
          id: "1",
          retailer_name: "OEM Store",
          affiliate_url: "https://example.com/pdp",
          is_primary: true,
          retailer_key: "oem",
        },
      ],
      oemPartNumber: "LT1000P",
      alsoKnownAs: ["ADQ74793501"],
      notes: "Replace every 6 months.",
    });

    assert.equal(trust.match_confidence, "high");
    assert.equal(trust.buyer_path_state, "show_confident_buy");
    assert.equal(trust.requires_manual_verification, false);
    assert.equal(trust.approved_retailer_links, 1);
  });

  it("suppresses buy on part pages with no repo compatibility proof", () => {
    const trust = buildPartPageTrust({
      modelsCount: 0,
      retailerLinks: [],
      oemPartNumber: "UNKNOWN-PART",
    });

    assert.equal(trust.match_confidence, "unknown");
    assert.equal(trust.buyer_path_state, "suppress_buy");
    assert.equal(trust.requires_manual_verification, true);
  });

  it("allows a recommended model-page winner", () => {
    const trust = buildModelPageTrust({
      totalFits: 3,
      hasRecommendedFit: true,
      primaryIsRecommended: true,
      retailerLinks: [
        {
          id: "1",
          retailer_name: "OEM Store",
          affiliate_url: "https://example.com/pdp",
          is_primary: true,
          retailer_key: "oem",
        },
      ],
      oemPartNumber: "HRF-R1",
      modelNumber: "HPA100",
    });

    assert.equal(trust.match_basis, "recommended_compatibility_mapping");
    assert.equal(trust.buyer_path_state, "show_confident_buy");
  });

  it("suppresses model-page buy when multiple fits exist and none is recommended", () => {
    const trust = buildModelPageTrust({
      totalFits: 2,
      hasRecommendedFit: false,
      primaryIsRecommended: false,
      retailerLinks: [
        {
          id: "1",
          retailer_name: "OEM Store",
          affiliate_url: "https://example.com/pdp",
          is_primary: true,
          retailer_key: "oem",
        },
      ],
      oemPartNumber: "WF2CB",
      modelNumber: "FGHS2631PF4A",
    });

    assert.equal(trust.match_confidence, "medium");
    assert.equal(trust.buyer_path_state, "suppress_buy");
    assert.equal(trust.requires_manual_verification, true);
  });

  it("buildPartPageTrust replacement_reasoning uses listing-evidence phrasing (no verify)", () => {
    const withModels = buildPartPageTrust({
      modelsCount: 2,
      retailerLinks: [
        {
          id: "1",
          retailer_name: "Store",
          affiliate_url: "https://example.com/p",
          is_primary: true,
          retailer_key: "amazon",
        },
      ],
      oemPartNumber: "LT1000P",
    });
    assert.match(
      withModels.replacement_reasoning_summary,
      /BuckParts Verified Link appears only when our checks clear/i,
    );
    assert.match(withModels.replacement_reasoning_summary, /not every filter has one/i);
    assert.ok(!/store shortcut/i.test(withModels.replacement_reasoning_summary));
    assert.ok(!/\bOEM\b/i.test(withModels.replacement_reasoning_summary));
    assert.ok(!/\bverify\b/i.test(withModels.replacement_reasoning_summary));

    const noModels = buildPartPageTrust({
      modelsCount: 0,
      retailerLinks: [],
      oemPartNumber: "X-123",
    });
    assert.match(noModels.replacement_reasoning_summary, /Compare the part number/i);
    assert.ok(!/\bverify\b/i.test(noModels.replacement_reasoning_summary));
  });

  it("oemOrCompatibleFromPreferredGatedBuyLink follows gated winner subtype (Shark compatible Amazon)", () => {
    const winner = {
      id: "amazon-compatible",
      retailer_name: "Amazon",
      affiliate_url: "https://www.amazon.com/dp/B0DJ4CXHPH",
      is_primary: true,
      retailer_key: "amazon",
      browser_truth_classification: "direct_buyable",
      browser_truth_buyable_subtype: BUYABLE_SUBTYPES.COMPATIBLE_REPLACEMENT_DIRECT_BUYABLE,
      browser_truth_notes: "COMPATIBLE REPLACEMENT for HE15FKPET. Not official Shark OEM.",
    };
    assert.equal(
      oemOrCompatibleFromPreferredGatedBuyLink({
        preferredWinnerLink: winner,
        approvedRetailerLinks: 1,
      }),
      "compatible",
    );
    const trust = buildPartPageTrust({
      modelsCount: 4,
      retailerLinks: [winner],
      oemPartNumber: "HE15FKPET",
    });
    assert.equal(trust.oem_or_compatible, "compatible");
    const html = renderToStaticMarkup(
      createElement(PartTruthPanel, {
        trust,
        compatibleModelCount: 4,
        hasNotes: false,
      }),
    );
    assert.match(html, /Compatible replacement/);
    assert.doesNotMatch(html, /Original part/);
  });

  it("oemOrCompatibleFromPreferredGatedBuyLink keeps OEM for official direct_buyable winner", () => {
    const winner = {
      id: "oem",
      retailer_name: "Winix",
      affiliate_url: "https://www.winixamerica.com/product/filter-h-116130",
      is_primary: true,
      retailer_key: "oem-catalog",
      browser_truth_classification: "direct_buyable",
      browser_truth_buyable_subtype: BUYABLE_SUBTYPES.SINGLE_UNIT_DIRECT_BUYABLE,
    };
    const trust = buildPartPageTrust({
      modelsCount: 2,
      retailerLinks: [winner],
      oemPartNumber: "116130",
    });
    assert.equal(trust.oem_or_compatible, "oem");
    const html = renderToStaticMarkup(
      createElement(PartTruthPanel, {
        trust,
        compatibleModelCount: 2,
        hasNotes: false,
      }),
    );
    assert.match(html, /Original part/);
  });

  it("oemOrCompatibleFromPreferredGatedBuyLink is unknown when no gated buy path survives", () => {
    assert.equal(
      oemOrCompatibleFromPreferredGatedBuyLink({
        preferredWinnerLink: null,
        approvedRetailerLinks: 0,
      }),
      "unknown",
    );
    const trust = buildPartPageTrust({
      modelsCount: 2,
      retailerLinks: [],
      oemPartNumber: "HE15FKPET",
    });
    assert.equal(trust.oem_or_compatible, "unknown");
    assert.equal(trust.buyer_path_state, "suppress_buy");
  });

  it("buildModelPageTrust replacement_reasoning avoids verify when buy is suppressed", () => {
    const trust = buildModelPageTrust({
      totalFits: 2,
      hasRecommendedFit: false,
      primaryIsRecommended: false,
      retailerLinks: [
        {
          id: "1",
          retailer_name: "OEM Store",
          affiliate_url: "https://example.com/pdp",
          is_primary: true,
          retailer_key: "oem",
        },
      ],
      oemPartNumber: "WF2CB",
      modelNumber: "FGHS2631PF4A",
    });
    assert.equal(trust.buyer_path_state, "suppress_buy");
    assert.ok(!/\bverify\b/i.test(trust.replacement_reasoning_summary));
    assert.match(trust.replacement_reasoning_summary, /compare the part number carefully/i);
  });
});
