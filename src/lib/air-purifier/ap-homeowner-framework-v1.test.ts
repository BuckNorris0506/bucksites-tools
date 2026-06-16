import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { BuyLinkRow } from "@/components/BuyLinks";
import type { PartTrustSummary } from "@/lib/trust/part-trust";

import {
  AP_HOMEOWNER_FILTER_PILOT_SLUG,
  apHomeownerFitStateLabel,
  apHomeownerShowsOfficialListingTrustBullet,
  deriveApHomeownerFitState,
  formatApHomeownerCompatModelDisplay,
  formatApHomeownerListingCheckDate,
  isApHomeownerFilterPilotSlug,
  prepareApHomeownerDisplayRetailerLinks,
} from "./ap-homeowner-framework-v1";

const verifiedLink: BuyLinkRow = {
  id: "link-oem",
  retailer_name: "OEM / manufacturer catalog (keyword lookup)",
  affiliate_url: "https://medifyair.com/products/ma-50-replacement-filter",
  is_primary: true,
  retailer_key: "oem-catalog",
  browser_truth_classification: "direct_buyable",
  browser_truth_checked_at: "2026-06-15T17:49:12.389Z",
};

describe("ap-homeowner-framework-v1", () => {
  it("gates only the medify-ma50-rf pilot slug", () => {
    assert.equal(isApHomeownerFilterPilotSlug(AP_HOMEOWNER_FILTER_PILOT_SLUG), true);
    assert.equal(isApHomeownerFilterPilotSlug(" medify-ma50-rf "), true);
    assert.equal(isApHomeownerFilterPilotSlug("medify-ma40-rf"), false);
    assert.equal(isApHomeownerFilterPilotSlug("levoit-rf-rar040"), false);
  });

  it("derives exact_match only for confident direct_buyable paths", () => {
    assert.equal(
      deriveApHomeownerFitState({
        trust: { buyer_path_state: "show_confident_buy" },
        primaryVerifiedLink: verifiedLink,
      }),
      "exact_match",
    );
    assert.equal(
      deriveApHomeownerFitState({
        trust: { buyer_path_state: "suppress_buy" },
        primaryVerifiedLink: verifiedLink,
      }),
      "no_verified_link",
    );
    assert.equal(apHomeownerFitStateLabel("exact_match"), "Exact match - Original part");
  });

  it("formats compat models for homeowner display", () => {
    assert.equal(
      formatApHomeownerCompatModelDisplay({
        id: "1",
        slug: "medify-ma50",
        model_number: "MA-50",
        brand: { name: "Medify" },
      }),
      "Medify MA-50",
    );
  });

  it("sanitizes retailer links for homeowner CTAs", () => {
    const prepared = prepareApHomeownerDisplayRetailerLinks(
      [verifiedLink],
      "View official Medify replacement filter",
    );
    assert.equal(prepared[0]?.retailer_name, "View official Medify replacement filter");
    assert.equal(prepared[0]?.browser_truth_checked_at, null);
  });

  it("formats listing check dates for homeowner trust copy", () => {
    assert.equal(
      formatApHomeownerListingCheckDate("2026-06-15T17:49:12.389Z"),
      "Jun 15, 2026",
    );
    assert.equal(formatApHomeownerListingCheckDate(null), null);
  });

  it("shows official listing trust bullet only for direct_buyable oem-catalog winners", () => {
    const trust: Pick<
      PartTrustSummary,
      "buyer_path_state" | "preferred_winner_link" | "approved_retailer_links"
    > = {
      buyer_path_state: "show_confident_buy",
      approved_retailer_links: 1,
      preferred_winner_link: verifiedLink,
    };
    assert.equal(apHomeownerShowsOfficialListingTrustBullet(trust), true);
    assert.equal(
      apHomeownerShowsOfficialListingTrustBullet({
        ...trust,
        buyer_path_state: "suppress_buy",
      }),
      false,
    );
    assert.equal(
      apHomeownerShowsOfficialListingTrustBullet({
        ...trust,
        preferred_winner_link: { ...verifiedLink, retailer_key: "amazon" },
      }),
      false,
    );
  });
});
