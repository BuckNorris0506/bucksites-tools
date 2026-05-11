import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { PartTruthPanel } from "@/components/trust/PartTruthPanel";
import { TrustAwareBuySection } from "@/components/trust/TrustAwareBuySection";
import { TieredBuyLinks } from "@/components/TieredBuyLinks";
import type { PartTrustSummary } from "@/lib/trust/part-trust";

function baseTrust(over: Partial<PartTrustSummary>): PartTrustSummary {
  return {
    match_confidence: "high",
    match_basis: "compatibility_mapping",
    oem_or_compatible: "oem",
    compatible_risk_level: "low",
    evidence_notes: [],
    requires_manual_verification: false,
    approved_retailer_links: 1,
    preferred_winner_link: null,
    replacement_reasoning_summary: "",
    buyer_path_state: "show_confident_buy",
    ...over,
  };
}

describe("trust UI (server render)", () => {
  it("PartTruthPanel renders replacement_reasoning_summary and compatible pill when present", () => {
    const html = renderToStaticMarkup(
      createElement(PartTruthPanel, {
        trust: baseTrust({
          replacement_reasoning_summary: "Unique reasoning line for test.",
          oem_or_compatible: "compatible",
        }),
        compatibleModelCount: 2,
        hasNotes: false,
      }),
    );
    assert.ok(html.includes("Unique reasoning line for test."));
    assert.ok(html.includes("Compatible replacement"));
  });

  it("TrustAwareBuySection suppress_buy does not render /go links", () => {
    const html = renderToStaticMarkup(
      createElement(TrustAwareBuySection, {
        trust: baseTrust({ buyer_path_state: "suppress_buy", approved_retailer_links: 0 }),
        links: [
          {
            id: "link-1",
            retailer_name: "Example",
            affiliate_url: "https://www.example.com/p/1",
            retailer_key: "amazon",
            browser_truth_classification: "direct_buyable",
            browser_truth_buyable_subtype: "SINGLE_UNIT_DIRECT_BUYABLE",
          },
        ],
        goBase: "/go",
        primaryCtaLabel: "Buy at",
        suppressMessage: "Buy suppressed for test.",
      }),
    );
    assert.ok(!html.includes('href="/go/'));
    assert.ok(html.includes("Buy suppressed for test."));
  });

  it("TieredBuyLinks shows buying-option trust footnote when browser_truth_checked_at is set", () => {
    const html = renderToStaticMarkup(
      createElement(TieredBuyLinks, {
        links: [
          {
            id: "go-primary",
            retailer_name: "Example Store",
            affiliate_url: "https://www.amazon.com/dp/B0TESTEXAM",
            retailer_key: "amazon",
            browser_truth_classification: "direct_buyable",
            browser_truth_buyable_subtype: "SINGLE_UNIT_DIRECT_BUYABLE",
            browser_truth_checked_at: "2026-05-04T15:00:00.000Z",
          },
        ],
        goBase: "/go",
      }),
    );
    assert.ok(html.includes("2026-05-04"));
    assert.ok(
      html.includes("Shown after BuckParts checks the product page against this filter number"),
    );
    assert.ok(!html.includes("buy-link"));
    assert.ok(!html.includes("store links"));
    assert.ok(!html.includes("store buttons"));
  });
});

describe("public merchant-priority copy guard", () => {
  const rooted = (rel: string) => join(process.cwd(), rel);

  it("key trust entrypoints avoid forbidden phrases", () => {
    const paths = [
      "src/lib/copy/public-trust.ts",
      "src/app/page.tsx",
      "src/components/trust/PartTruthPanel.tsx",
      "src/components/trust/ModelTruthPanel.tsx",
      "src/components/trust/TrustAwareBuySection.tsx",
      "src/components/TieredBuyLinks.tsx",
    ];
    for (const p of paths) {
      const src = readFileSync(rooted(p), "utf8");
      assert.ok(!/\bAmazon first\b/i.test(src), `${p}: Amazon-first`);
      assert.ok(!/\bprefer Amazon\b/i.test(src), `${p}: prefer Amazon`);
    }
  });

  it("homepage source does not use standalone verified store links phrase", () => {
    const src = readFileSync(rooted("src/app/page.tsx"), "utf8");
    assert.ok(!/verified store links/i.test(src));
    assert.ok(!/\bOEM\b/i.test(src));
  });

  it("public legal and about pages avoid store-link business wording", () => {
    const paths = [
      "src/app/about/page.tsx",
      "src/app/disclosure/page.tsx",
      "src/app/privacy/page.tsx",
      "src/app/terms/page.tsx",
    ];
    const banned = /\b(vetted store links|verified store links|store links|verify links)\b/i;
    for (const p of paths) {
      const src = readFileSync(rooted(p), "utf8");
      assert.ok(!banned.test(src), `${p}: public copy still contains store-link business wording`);
    }

    const disclosure = readFileSync(rooted("src/app/disclosure/page.tsx"), "utf8");
    assert.ok(/commission or referral fee/i.test(disclosure));
    assert.ok(/retailer—not BuckParts—runs checkout/i.test(disclosure));
    assert.ok(/buying options/i.test(disclosure));
    assert.ok(/retailer product page/i.test(disclosure));
  });

  it("public homeowner copy avoids internal acronym labels", () => {
    const paths = [
      "src/app/page.tsx",
      "src/app/search/page.tsx",
      "src/app/catalog/page.tsx",
      "src/app/air-purifier/page.tsx",
      "src/app/air-purifier/search/page.tsx",
      "src/app/humidifier/page.tsx",
      "src/app/humidifier/search/page.tsx",
      "src/app/vacuum/page.tsx",
      "src/app/vacuum/search/page.tsx",
      "src/app/whole-house-water/page.tsx",
      "src/app/whole-house-water/search/page.tsx",
      "src/app/appliance-air/page.tsx",
      "src/app/appliance-air/search/page.tsx",
      "src/lib/copy/public-trust.ts",
      "src/lib/copy/vertical-fit.ts",
    ];
    const banned = /\b(OEM|SKU|CTA|PDP|SERP|direct_buyable|affiliate-ready|compatibility mapping)\b/;
    for (const p of paths) {
      const src = readFileSync(rooted(p), "utf8");
      assert.ok(!banned.test(src), `${p}: public copy still contains internal acronym/business term`);
    }
  });

  it("air purifier category copy matches filter replacement demand and keeps fit-safety guidance", () => {
    const src = readFileSync(rooted("src/app/air-purifier/page.tsx"), "utf8");
    assert.ok(/Air purifier filter replacement/i.test(src));
    assert.ok(/Find air purifier filter replacement options/i.test(src));
    assert.ok(/unit model or filter number/i.test(src));
    assert.ok(/Compare the part number with your current filter or manual before buying/i.test(src));
    assert.ok(/Always compare the part number with your old filter or manual/i.test(src));
    assert.ok(!/\b(OEM|SKU|CTA|PDP|SERP|token|canonical|direct_buyable|affiliate-ready|compatibility mapping)\b/.test(src));
    assert.ok(!/\bguaranteed fit\b|\bofficial manufacturer endorsement\b|\bcomplete catalog coverage\b/i.test(src));
  });

  it("global shell footer avoids store links/buttons wording", () => {
    const src = readFileSync(rooted("src/components/SiteShell.tsx"), "utf8");
    assert.ok(!/store links/i.test(src));
    assert.ok(!/store buttons/i.test(src));
    assert.ok(
      /Buying options appear only when we can match the product\s+page to the filter number\./m.test(
        src,
      ),
    );
  });
});
