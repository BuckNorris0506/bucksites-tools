import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildModelPageTrust,
  buildPartPageTrust,
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
});
