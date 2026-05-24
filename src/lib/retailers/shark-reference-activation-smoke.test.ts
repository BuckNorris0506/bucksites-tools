import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { parse } from "csv-parse/sync";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { OfficialProductReferenceLinks } from "@/components/trust/OfficialProductReferenceLinks";
import { TrustAwareBuySection } from "@/components/trust/TrustAwareBuySection";
import { buildPartPageTrust } from "@/lib/trust/part-trust";
import {
  buyPathSortContextForFilter,
  filterOfficialReferenceRetailerLinks,
  filterRealBuyRetailerLinks,
} from "@/lib/retailers/launch-buy-links";

const CSV = readFileSync("data/air-purifier/retailer_links.csv", "utf8");
const ALL_ROWS = parse(CSV, { columns: true, skip_empty_lines: true }) as Array<
  Record<string, string>
>;

function sharkRows(slug: string) {
  return ALL_ROWS.filter((r) => r.filter_slug === slug);
}

function renderSharkFilterPageSmoke(slug: string, oemPartNumber: string) {
  const raw = sharkRows(slug);
  const buyLinks = filterRealBuyRetailerLinks(
    raw.map((r) => ({
      id: r.filter_slug,
      retailer_name: r.retailer_name,
      affiliate_url: r.affiliate_url,
      retailer_key: r.retailer_key,
      browser_truth_classification: r.browser_truth_classification || null,
    })),
  );
  const refLinks = filterOfficialReferenceRetailerLinks(
    raw.map((r) => ({
      id: r.filter_slug,
      retailer_name: r.retailer_name,
      affiliate_url: r.affiliate_url,
      retailer_key: r.retailer_key,
      browser_truth_classification: r.browser_truth_classification || null,
      browser_truth_notes: r.browser_truth_notes || null,
      browser_truth_checked_at: r.browser_truth_checked_at || null,
    })),
  ).map((r) => ({
    id: r.id as string,
    retailer_name: (r as { retailer_name?: string }).retailer_name ?? null,
    affiliate_url: (r as { affiliate_url: string }).affiliate_url,
    retailer_key: (r as { retailer_key?: string }).retailer_key ?? null,
    browser_truth_classification:
      (r as { browser_truth_classification?: string }).browser_truth_classification ?? null,
  }));

  const trust = buildPartPageTrust({
    modelsCount: 4,
    retailerLinks: buyLinks,
    oemPartNumber,
    buyPathSortContext: buyPathSortContextForFilter(slug, null, oemPartNumber),
  });

  const buyHtml = renderToStaticMarkup(
    createElement(TrustAwareBuySection, {
      trust,
      links: buyLinks,
      goBase: "/air-purifier/go",
      primaryCtaLabel: "Buy this part at",
      suppressMessage: "We are not showing a store button yet.",
    }),
  );

  const refHtml = renderToStaticMarkup(
    createElement(OfficialProductReferenceLinks, { links: refLinks }),
  );

  return { buyHtml, refHtml, buyLinks, refLinks };
}

describe("Shark reference activation smoke (CSV + render)", () => {
  for (const [slug, oem] of [
    ["shark-hepa-he15fkp", "HE15FKPET"],
    ["shark-hepa-he3fkp", "HE3FKPET"],
  ] as const) {
    it(`${slug}: no buy CTA, official reference section with direct URL`, () => {
      const { buyHtml, refHtml, buyLinks, refLinks } = renderSharkFilterPageSmoke(slug, oem);
      assert.equal(buyLinks.length, 0);
      assert.equal(refLinks.length, 1);
      assert.match(buyHtml, /not showing a store button|No buying options yet/i);
      assert.doesNotMatch(buyHtml, /\/air-purifier\/go\//);
      assert.match(refHtml, /Official product reference/);
      assert.match(refHtml, /not a confirmed buy path/i);
      assert.match(refHtml, /sharkclean\.com\/products\//);
      assert.doesNotMatch(refHtml, /\/air-purifier\/go\//);
      assert.doesNotMatch(refHtml, /Buy this part|Buy online|Add to cart/i);
    });
  }
});
