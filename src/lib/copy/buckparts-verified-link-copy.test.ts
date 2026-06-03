import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { TieredBuyLinks } from "@/components/TieredBuyLinks";
import { TrustAwareBuySection } from "@/components/trust/TrustAwareBuySection";
import { BuckPartsVerifiedLinksSection } from "@/components/trust/BuckPartsVerifiedLinksSection";
import {
  BUCKPARTS_VERIFIED_LINK_DEFINITION,
  BUCKPARTS_VERIFIED_LINK_NONE_YET,
  BUCKPARTS_VERIFIED_LINK_NOT_EVERY_FILTER_NOTE,
  BUCKPARTS_VERIFIED_LINK_PLURAL,
  BUCKPARTS_VERIFIED_LINK_SINGULAR,
} from "@/lib/copy/buckparts-verified-link-copy";
import { filterRealBuyRetailerLinks } from "@/lib/retailers/launch-buy-links";
import type { PartTrustSummary } from "@/lib/trust/part-trust";

const gatedLink = {
  id: "verified-link-1",
  retailer_name: "Example Store",
  affiliate_url: "https://www.amazon.com/dp/B0TESTEXAM",
  retailer_key: "amazon",
  browser_truth_classification: "direct_buyable",
  browser_truth_buyable_subtype: "SINGLE_UNIT_DIRECT_BUYABLE",
  browser_truth_checked_at: "2026-05-04T15:00:00.000Z",
};

test("verified link copy includes definition and not-every-filter qualifier", () => {
  const html = renderToStaticMarkup(
    createElement(
      BuckPartsVerifiedLinksSection,
      null,
      createElement("p", null, "child"),
    ),
  );
  assert.ok(html.includes(BUCKPARTS_VERIFIED_LINK_PLURAL));
  assert.ok(html.includes(BUCKPARTS_VERIFIED_LINK_DEFINITION));
  assert.ok(html.includes(BUCKPARTS_VERIFIED_LINK_NOT_EVERY_FILTER_NOTE));
});

test("TieredBuyLinks renders BuckParts Verified Link terminology for gated links", () => {
  const html = renderToStaticMarkup(
    createElement(TieredBuyLinks, { links: [gatedLink], goBase: "/go" }),
  );
  assert.ok(html.includes(BUCKPARTS_VERIFIED_LINK_SINGULAR));
  assert.ok(html.includes('href="/go/verified-link-1"'));
  assert.ok(!html.toLowerCase().includes("buy button"));
  assert.ok(!html.includes("buying option"));
});

test("TieredBuyLinks empty state does not imply checkout or store", () => {
  const html = renderToStaticMarkup(
    createElement(TieredBuyLinks, {
      links: [
        {
          ...gatedLink,
          affiliate_url: "https://www.geapplianceparts.com/store/catalog/search.jsp?searchKeyword=TEST",
          browser_truth_classification: null,
        },
      ],
      goBase: "/go",
    }),
  );
  assert.ok(html.includes(BUCKPARTS_VERIFIED_LINK_NONE_YET));
  assert.ok(!html.includes("checkout"));
  assert.ok(!html.toLowerCase().includes("online store"));
});

test("filterRealBuyRetailerLinks gating unchanged in TieredBuyLinks", () => {
  const searchRow = {
    ...gatedLink,
    affiliate_url: "https://www.geapplianceparts.com/store/catalog/search.jsp?searchKeyword=TEST",
    browser_truth_classification: null,
  };
  assert.equal(filterRealBuyRetailerLinks([searchRow]).length, 0);
  assert.equal(filterRealBuyRetailerLinks([gatedLink]).length, 1);

  const html = renderToStaticMarkup(
    createElement(TieredBuyLinks, { links: [searchRow, gatedLink], goBase: "/go" }),
  );
  assert.ok(html.includes('href="/go/verified-link-1"'));
  assert.equal((html.match(/href="\/go\//g) ?? []).length, 1);
});

test("TrustAwareBuySection suppress_buy still blocks /go without buy-button wording", () => {
  const trust: PartTrustSummary = {
    match_confidence: "high",
    match_basis: "compatibility_mapping",
    oem_or_compatible: "oem",
    compatible_risk_level: "low",
    evidence_notes: [],
    requires_manual_verification: false,
    approved_retailer_links: 0,
    preferred_winner_link: null,
    replacement_reasoning_summary: "",
    buyer_path_state: "suppress_buy",
  };
  const html = renderToStaticMarkup(
    createElement(TrustAwareBuySection, {
      trust,
      links: [gatedLink],
      goBase: "/go",
      primaryCtaLabel: "x",
      suppressMessage: BUCKPARTS_VERIFIED_LINK_NONE_YET,
    }),
  );
  assert.ok(!html.includes('href="/go/'));
  assert.ok(html.includes(BUCKPARTS_VERIFIED_LINK_NONE_YET));
  assert.ok(!html.toLowerCase().includes("buy button"));
});

test("purchase-path UI still routes through filterRealBuyRetailerLinks gating", () => {
  const tieredSrc = readFileSync(join(process.cwd(), "src/components/TieredBuyLinks.tsx"), "utf8");
  const filtersSrc = readFileSync(join(process.cwd(), "src/lib/data/filters.ts"), "utf8");
  const launchSrc = readFileSync(join(process.cwd(), "src/lib/retailers/launch-buy-links.ts"), "utf8");

  assert.ok(tieredSrc.includes("filterRealBuyRetailerLinks"));
  assert.ok(filtersSrc.includes("filterRealBuyRetailerLinks"));
  assert.match(
    launchSrc,
    /export function filterRealBuyRetailerLinks[\s\S]*?return links\.filter\(\(l\) => buyLinkGateFailureKind\(l\) === null\)/,
  );

  for (const rel of ["src/components/TieredBuyLinks.tsx", "src/lib/data/filters.ts"]) {
    const src = rel === "src/components/TieredBuyLinks.tsx" ? tieredSrc : filtersSrc;
    assert.ok(!src.includes(".update("), `${rel}: must not mutate Supabase`);
    assert.ok(!src.includes("retailer_links.csv"), `${rel}: must not touch CSV`);
  }
});
