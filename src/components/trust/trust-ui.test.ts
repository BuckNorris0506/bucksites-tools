import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { PartTruthPanel } from "@/components/trust/PartTruthPanel";
import { TrustAwareBuySection } from "@/components/trust/TrustAwareBuySection";
import { TieredBuyLinks } from "@/components/TieredBuyLinks";
import { PUBLIC_CATEGORY_HUB_BROWSE_DISCLAIMER } from "@/lib/catalog/public-category-hub";
import {
  PUBLIC_BANNED_BACKEND_HOMEOWNER_PHRASES_V1,
  PUBLIC_BANNED_BACKEND_JARGON_V1,
  PUBLIC_TRUST_PAGE_REL_PATHS_V1,
} from "@/lib/copy/customer-language-doctrine";
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
      html.includes("Shown as a BuckParts Verified Link after we checked the product page"),
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
      for (const phrase of PUBLIC_BANNED_BACKEND_HOMEOWNER_PHRASES_V1) {
        assert.ok(
          !src.toLowerCase().includes(phrase.toLowerCase()),
          `${p}: banned backend homeowner phrase "${phrase}"`,
        );
      }
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
      "src/app/truth-policy/page.tsx",
      "src/app/wrong-part-prevention/page.tsx",
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
    assert.ok(/Find the right air purifier filter replacement/i.test(src));
    assert.ok(/air purifier model number or the filter number/i.test(src));
    assert.ok(/listing checks pass/i.test(src));
    assert.ok(/not on every filter/i.test(src));
    assert.ok(/If we have checked a retailer product page for that filter/i.test(src));
    assert.ok(/If no buying option appears yet/i.test(src));
    assert.ok(/Before buying, compare the part number with your old filter or manual/i.test(src));
    assert.ok(/BuckParts is not the seller/i.test(src));
    assert.ok(!/\breference\b/i.test(src));
    assert.ok(!/\b(OEM|SKU|CTA|PDP|SERP|token|canonical|direct_buyable|affiliate-ready|compatibility mapping)\b/.test(src));
    assert.ok(!/\bguaranteed fit\b|\bofficial manufacturer endorsement\b|\bcomplete catalog coverage\b|\bevery air purifier filter has been verified\b/i.test(src));
  });

  it("catalog, brand, and search pages include homeowner trust framing without internal terms", () => {
    const checks = [
      {
        path: "src/app/catalog/page.tsx",
        required: [
          /models, filter numbers, alternates, or pages to compare/i,
          /model or part number on your unit/i,
          /filter number printed on the old part/i,
          /Buying options appear only when the\s+destination looks safe enough to show/i,
          /checks the listing against the part number/i,
          /Browse preview/i,
        ],
      },
      {
        path: "src/app/brand/[slug]/page.tsx",
        required: [
          /model number on your appliance/i,
          /filter number printed on the old part/i,
          /listed items are not a\s+fit guarantee/i,
          /If a page has no buying option yet/i,
        ],
      },
      {
        path: "src/app/search/page.tsx",
        required: [
          /models, filter numbers, alternates, or pages to compare/i,
          /check what BuckParts found/i,
          /compare the part number with your old filter\s+or manual/i,
          /Parts & filter numbers/i,
        ],
      },
    ];
    const banned = /\b(OEM|SKU|CTA|PDP|SERP|token|canonical|direct_buyable|store links|compatibility mapping)\b/i;
    for (const check of checks) {
      const src = readFileSync(rooted(check.path), "utf8");
      for (const required of check.required) {
        assert.ok(required.test(src), `${check.path}: missing ${required}`);
      }
      if (check.path === "src/app/catalog/page.tsx") {
        assert.match(PUBLIC_CATEGORY_HUB_BROWSE_DISCLAIMER, /not a popularity ranking/i);
      }
      assert.ok(!banned.test(src), `${check.path}: public trust framing contains internal/business wording`);
    }
  });

  it("global shell footer uses BuckParts Verified Link wording", () => {
    const src = readFileSync(rooted("src/components/SiteShell.tsx"), "utf8");
    assert.ok(!/store links/i.test(src));
    assert.ok(!/store buttons/i.test(src));
    assert.ok(src.includes("BuckParts Verified Link"));
    assert.ok(/not every filter has one/i.test(src));
  });

  it("go-unavailable page uses BuckParts Verified Link wording", () => {
    const src = readFileSync(rooted("src/app/go-unavailable/page.tsx"), "utf8");
    assert.ok(!/store shortcut/i.test(src));
    assert.match(src, /BuckParts Verified Link/i);
    assert.ok(!/avoid sending you to a bad match/i.test(src));
  });

  it("homepage uses FOH hero copy and purchase-options doctrine below the fold", () => {
    const src = readFileSync(rooted("src/app/page.tsx"), "utf8");
    const searchForm = readFileSync(rooted("src/components/SearchForm.tsx"), "utf8");
    assert.ok(!/store shortcut/i.test(src));
    assert.ok(src.includes("Wrong Buck."));
    assert.ok(src.includes("Right Parts"));
    assert.ok(
      src.includes(
        "BuckParts checks replacement-filter links before it points you anywhere.",
      ),
    );
    assert.ok(searchForm.includes("Look it up"));
    assert.ok(src.includes("Free to use · No account needed."));
    assert.ok(src.includes("We only show a place to buy once the checks clear."));
    assert.ok(src.includes("Shop only after checks pass"));
    assert.ok(
      src.includes(
        "BuckParts shows purchase options only when the listing matches the part number well enough to pass our checks.",
      ),
    );
    assert.ok(!/Shop only when checks pass/.test(src));
    assert.ok(!/avoid sending you to a bad match/i.test(src));
  });

  it("global shell footer links to grant trust pages", () => {
    const src = readFileSync(rooted("src/components/SiteShell.tsx"), "utf8");
    assert.ok(src.includes('href="/truth-policy"'));
    assert.ok(src.includes('href="/wrong-part-prevention"'));
  });

  it("grant trust pages use homeowner language without internal acronyms", () => {
    const paths = [...PUBLIC_TRUST_PAGE_REL_PATHS_V1];
    const banned = /\b(OEM|SKU|CTA|PDP|SERP|direct_buyable|browser_truth|buy-gate|dispatch-run)\b/;
    for (const p of paths) {
      const src = readFileSync(rooted(p), "utf8");
      assert.ok(!banned.test(src), `${p}: internal jargon in public trust page`);
      const lower = src.toLowerCase();
      for (const phrase of PUBLIC_BANNED_BACKEND_JARGON_V1) {
        assert.ok(
          !lower.includes(phrase.toLowerCase()),
          `${p}: banned backend jargon "${phrase}"`,
        );
      }
      for (const phrase of PUBLIC_BANNED_BACKEND_HOMEOWNER_PHRASES_V1) {
        assert.ok(
          !lower.includes(phrase.toLowerCase()),
          `${p}: banned backend homeowner phrase "${phrase}"`,
        );
      }
    }
  });

  it("wrong-part-prevention page uses homeowner prevention copy", () => {
    const src = readFileSync(rooted("src/app/wrong-part-prevention/page.tsx"), "utf8");
    assert.match(src, /Replacement filter shopping is confusing/i);
    assert.match(src, /compare the filter code on your old filter or fridge label/i);
    assert.match(src, /will not point you at a questionable part/i);
    assert.match(src, /does not guarantee that every filter/i);
    assert.match(src, /not a substitute for reading your old part/i);
    assert.match(src, /one layer of help/i);
  });
});
