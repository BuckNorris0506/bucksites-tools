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

  it("TieredBuyLinks shows buy-link check footnote when browser_truth_checked_at is set", () => {
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
    assert.ok(html.includes("passed BuckParts buy-link checks"));
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
  });
});
