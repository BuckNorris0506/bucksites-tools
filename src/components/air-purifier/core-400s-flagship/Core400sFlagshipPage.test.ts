import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { Core400sFlagshipPage } from "./Core400sFlagshipPage";
import type { Core400sFlagshipBundle } from "@/lib/data/air-purifier/core-400s-flagship-bundle";
import type { AirPurifierModelWithFilters } from "@/lib/data/air-purifier/models";
import type { PartTrustSummary } from "@/lib/trust/part-trust";
import type { VerticalModelPrimaryTrustBuy } from "@/components/vertical/VerticalModelPageContent";

const verifiedLink = {
  id: "link-oem",
  air_purifier_filter_id: "filter-rar040",
  retailer_name: "Levoit",
  affiliate_url: "https://levoit.com/products/core-400s-p-3-stage-replacement-filter",
  is_primary: true,
  retailer_key: "oem-catalog",
  browser_truth_classification: "direct_buyable",
  browser_truth_buyable_subtype: "SINGLE_UNIT_DIRECT_BUYABLE",
  browser_truth_checked_at: "2026-06-12T22:15:23.992Z",
};

const model = {
  id: "model-core-400s",
  slug: "levoit-core-400s",
  brand_id: "brand-levoit",
  model_number: "Core 400S",
  title: "Levoit Core 400S Air Purifier",
  series: "Core 400",
  notes: null,
  brand: { id: "brand-levoit", slug: "levoit", name: "Levoit" },
  filters: [
    {
      id: "filter-rar040",
      slug: "levoit-rf-rar040",
      brand_id: "brand-levoit",
      oem_part_number: "LEVOIT-RF-RAR040",
      name: "Core 400 / Core 400S replacement filter",
      replacement_interval_months: 6,
      notes: "3-in-1 for Core 400 series",
      retailer_links: [verifiedLink],
      is_recommended_fit: true,
    },
  ],
  primary_buy_path_gate_suppression: {
    hadSearchPlaceholderRows: false,
    hadIndirectDiscoveryRows: false,
    hadBrokenDestinationRows: false,
    hadMissingBrowserTruthRows: false,
    hadUnsafeBrowserTruthRows: false,
  },
} satisfies AirPurifierModelWithFilters;

const bundle: Core400sFlagshipBundle = {
  familyModels: [
    {
      id: "model-core-400s",
      slug: "levoit-core-400s",
      model_number: "Core 400S",
      title: "Levoit Core 400S Air Purifier",
      series: "Core 400",
      brand: { slug: "levoit", name: "Levoit" },
    },
    {
      id: "model-lap-c401s",
      slug: "levoit-lap-c401s-wusr",
      model_number: "LAP-C401S-WUSR",
      title: "Levoit LAP-C401S-WUSR Air Purifier",
      series: "Core 400",
      brand: { slug: "levoit", name: "Levoit" },
    },
  ],
  alsoFitsModels: [
    {
      id: "model-core-400s",
      slug: "levoit-core-400s",
      model_number: "Core 400S",
      title: "Levoit Core 400S Air Purifier",
      series: "Core 400",
      brand: { slug: "levoit", name: "Levoit" },
    },
    {
      id: "model-core-450s",
      slug: "levoit-core-450s",
      model_number: "Core 450S",
      title: "Levoit Core 450S Air Purifier",
      series: "Core 400/600",
      brand: { slug: "levoit", name: "Levoit" },
    },
  ],
  confusableFamilies: [
    { series: "Core 200", filterPartNumbers: ["LEVOIT-RF-CR200"] },
    { series: "Core 300", filterPartNumbers: ["LEVOIT-RF-RAR029"] },
    { series: "Core 600", filterPartNumbers: ["LEVOIT-RF-RAR060"] },
  ],
};

function trust(overrides: Partial<PartTrustSummary> = {}): PartTrustSummary {
  return {
    match_confidence: "high",
    match_basis: "recommended_compatibility_mapping",
    oem_or_compatible: "oem",
    compatible_risk_level: "low",
    evidence_notes: [],
    requires_manual_verification: false,
    approved_retailer_links: 1,
    preferred_winner_link: verifiedLink,
    replacement_reasoning_summary: "",
    buyer_path_state: "show_confident_buy",
    ...overrides,
  };
}

function primaryTrustBuy(
  overrides: Partial<VerticalModelPrimaryTrustBuy> = {},
): VerticalModelPrimaryTrustBuy {
  return {
    trust: trust(),
    mappedPartOptionsCount: 1,
    hasPrimaryPartNotes: true,
    retailerLinks: [verifiedLink],
    gateSuppressionSummary: model.primary_buy_path_gate_suppression,
    buySuppressMessage: "Suppressed.",
    ...overrides,
  };
}

describe("Core400sFlagshipPage", () => {
  it("renders the Standard-only flagship facts and verified CTA stack", () => {
    const html = renderToStaticMarkup(
      createElement(Core400sFlagshipPage, {
        model,
        bundle,
        primaryTrustBuy: primaryTrustBuy(),
      }),
    );

    assert.ok(html.includes("Levoit Core 400S replacement filter"));
    assert.ok(html.includes("Core 400 / Core 400S replacement filter"));
    assert.ok(html.includes("LEVOIT-RF-RAR040"));
    assert.ok(html.includes("Replace about every 6 months"));
    assert.ok(html.includes("Exact match"));
    assert.ok(html.includes("Original part"));
    assert.ok(html.includes('href="/air-purifier/go/link-oem"'));
    assert.ok(html.includes("This filter also fits (2)"));
    assert.ok(html.includes("Core 450S"));
    assert.ok(html.includes("Check the model label before ordering."));
    assert.ok(html.includes("Core 200 / Core 300 / Core 600"));
    assert.ok(html.includes("LEVOIT-RF-CR200 / LEVOIT-RF-RAR029 / LEVOIT-RF-RAR060"));

    assert.equal(html.includes("verified Jun 12, 2026"), false);
    assert.equal(html.includes("2026-06-12"), false);
    assert.equal(html.includes("Core 400 family"), false);
    assert.equal(html.includes("LAP-C401S-WUSR"), false);
    assert.equal(html.includes("Stay on schedule"), false);
    assert.equal(html.includes("Add your own 6-month reminder"), false);
    assert.equal(html.includes("repo note"), false);
    assert.equal(html.includes("repo-listed"), false);
    assert.equal(html.includes("compatibility data"), false);
    assert.equal(html.includes("Different Core families use different filters."), false);
    assert.equal(html.includes("Pet Allergy"), false);
    assert.equal(html.includes("Smoke &amp; Wildfire"), false);
    assert.equal(html.includes("Odor"), false);
    assert.equal(/\$\d/.test(html), false);
    assert.equal(html.includes("variant_selected"), false);
  });

  it("uses the existing suppress path when no verified link survives", () => {
    const html = renderToStaticMarkup(
      createElement(Core400sFlagshipPage, {
        model,
        bundle,
        primaryTrustBuy: primaryTrustBuy({
          trust: trust({
            buyer_path_state: "suppress_buy",
            approved_retailer_links: 0,
            preferred_winner_link: null,
          }),
          retailerLinks: [],
        }),
      }),
    );

    assert.ok(!html.includes('href="/air-purifier/go/'));
    assert.ok(html.includes("No verified link right now"));
    assert.ok(html.includes("No BuckParts Verified Link right now for this Core 400S filter."));
  });
});
