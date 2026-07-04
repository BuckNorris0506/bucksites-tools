/**
 * Coverage Batch A: committed CSV direct_buyable primaries for edr3rxd1 / ultrawf must
 * survive buy-path gating and produce a non-suppressed filter PDP trust path.
 *
 * PROVEN: live `/filter/[slug]` loads retailer_links from Supabase via getFilterBySlug —
 * not from data/retailer_links.csv. This test proves CSV rows are render-ready once synced.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import { parse } from "csv-parse/sync";

import type { BuyLinkRow } from "@/components/BuyLinks";
import {
  buyLinkGateFailureKind,
  buyPathSortContextForFilter,
  filterRealBuyRetailerLinks,
} from "@/lib/retailers/launch-buy-links";
import { buildPartPageTrust } from "@/lib/trust/part-trust";
import { BUCKPARTS_VERIFIED_LINK_NONE_YET } from "@/lib/copy/buckparts-verified-link-copy";

const REPO_ROOT = path.resolve(path.join(path.dirname(fileURLToPath(import.meta.url)), "../../.."));

const BATCH_A_EXPECTED = {
  edr3rxd1: {
    url: "https://www.whirlpool.com/accessories/kitchen-accessories/refrigerator/p.ice-and-water-refrigerator-filter-3.edr3rxd1.html",
    oem: "EDR3RXD1",
  },
  ultrawf: {
    url: "https://www.frigidaireapplianceparts.com/PartDetail/Water-Filter/ULTRAWF/1534529",
    oem: "ULTRAWF",
  },
} as const;

function loadCsvPrimaryRows(): Map<string, Record<string, string>> {
  const csvPath = path.join(REPO_ROOT, "data/retailer_links.csv");
  const rows = parse(readFileSync(csvPath, "utf8"), {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
  }) as Record<string, string>[];
  const bySlug = new Map<string, Record<string, string>>();
  for (const row of rows) {
    const slug = (row.filter_slug ?? "").trim().toLowerCase();
    if (!(slug in BATCH_A_EXPECTED)) continue;
    if (String(row.is_primary ?? "").toLowerCase() !== "true") continue;
    bySlug.set(slug, row);
  }
  return bySlug;
}

function csvRowToBuyLink(row: Record<string, string>, index: number): BuyLinkRow {
  return {
    id: `csv-parity-test-${row.filter_slug}-${index}`,
    filter_id: `csv-parity-filter-${row.filter_slug}`,
    retailer_name: row.retailer_name ?? "Retailer",
    affiliate_url: row.affiliate_url ?? "",
    is_primary: String(row.is_primary ?? "").toLowerCase() === "true",
    retailer_key: row.retailer_key ?? null,
    browser_truth_classification: row.browser_truth_classification ?? null,
    browser_truth_buyable_subtype: row.browser_truth_buyable_subtype ?? null,
    browser_truth_notes: row.browser_truth_notes ?? null,
    browser_truth_checked_at: row.browser_truth_checked_at ?? null,
  };
}

describe("filter PDP verified-link CSV parity (Coverage Batch A)", () => {
  it("getFilterBySlug reads Supabase retailer_links, not data/retailer_links.csv", () => {
    const src = readFileSync(path.join(REPO_ROOT, "src/lib/data/filters.ts"), "utf8");
    assert.match(src, /from\("retailer_links"\)/);
    assert.match(src, /filterRealBuyRetailerLinks/);
    assert.ok(!src.includes("data/retailer_links.csv"));
    assert.ok(!src.includes("readFileSync"));
  });

  it("repo-runtime convergence gate is air_purifier-only (not refrigerator_water)", () => {
    const src = readFileSync(
      path.join(REPO_ROOT, "scripts/lib/repo-runtime-convergence-gate-v1.ts"),
      "utf8",
    );
    assert.match(src, /wedge: "air_purifier"/);
    assert.match(src, /air_purifier_supabase_vs_csv_diff_v1/);
    assert.ok(!src.includes("refrigerator_water"));
  });

  for (const slug of Object.keys(BATCH_A_EXPECTED) as Array<keyof typeof BATCH_A_EXPECTED>) {
    it(`CSV primary for ${slug} passes buy-path gate and would render verified link on filter PDP`, () => {
      const primaries = loadCsvPrimaryRows();
      const row = primaries.get(slug);
      assert.ok(row, `missing primary CSV row for ${slug}`);
      assert.equal(row.browser_truth_classification, "direct_buyable");
      assert.equal(row.affiliate_url, BATCH_A_EXPECTED[slug].url);

      const link = csvRowToBuyLink(row, 0);
      assert.equal(buyLinkGateFailureKind(link), null, `gate blocked ${slug}`);

      const gated = filterRealBuyRetailerLinks([link]);
      assert.equal(gated.length, 1);
      assert.equal(gated[0]?.affiliate_url, BATCH_A_EXPECTED[slug].url);

      const sortContext = buyPathSortContextForFilter(
        slug,
        BATCH_A_EXPECTED[slug].oem,
        BATCH_A_EXPECTED[slug].oem,
      );
      const trust = buildPartPageTrust({
        modelsCount: 1,
        retailerLinks: gated,
        oemPartNumber: BATCH_A_EXPECTED[slug].oem,
        buyPathSortContext: sortContext,
      });
      assert.notEqual(trust.buyer_path_state, "suppress_buy");
      assert.ok(trust.approved_retailer_links > 0);
      assert.ok(trust.preferred_winner_link);
      assert.equal(trust.preferred_winner_link?.affiliate_url, BATCH_A_EXPECTED[slug].url);
      // Suppress message is only shown when buyer_path_state === suppress_buy.
      assert.notEqual(trust.buyer_path_state, "suppress_buy");
      assert.ok(BUCKPARTS_VERIFIED_LINK_NONE_YET.length > 0);
    });
  }
});
