import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, test } from "node:test";

import {
  buyLinkGateFailureKind,
  filterRealBuyRetailerLinks,
  passesDirectBuyableGate,
} from "../../src/lib/retailers/launch-buy-links";

const ROOT = process.cwd();
const CSV_REL = "data/retailer_links.csv";
const B087 = "B087PDLZL9";

function parseAmazonRowsFromRetailerLinksCsv(
  content: string,
): Array<{ slug: string; url: string }> {
  const rows: Array<{ slug: string; url: string }> = [];
  for (const line of content.split("\n")) {
    if (!line.trim() || line.startsWith("filter_slug,")) continue;
    const match = line.match(/^([^,]+),Amazon,(https:\/\/[^,]+),/i);
    if (match) rows.push({ slug: match[1]!, url: match[2]! });
  }
  return rows;
}

function loadCsvRows(): Array<{
  slug: string;
  url: string;
  browser_truth_classification: string;
  browser_truth_notes: string;
}> {
  const lines = readFileSync(path.join(ROOT, CSV_REL), "utf8").split("\n");
  const rows: Array<{
    slug: string;
    url: string;
    browser_truth_classification: string;
    browser_truth_notes: string;
  }> = [];
  for (const line of lines) {
    if (!line.trim() || line.startsWith("filter_slug,")) continue;
    const match = line.match(/^([^,]+),([^,]*),(https:\/\/[^,]*),([^,]*),([^,]*),([^,]*),([^,]*),(.*)$/);
    if (!match) continue;
    rows.push({
      slug: match[1]!,
      url: match[3]!,
      browser_truth_classification: match[7] ?? "",
      browser_truth_notes: match[8] ?? "",
    });
  }
  return rows;
}

function b087LiveDirectBuyableRows(slug: string) {
  return loadCsvRows().filter(
    (row) =>
      row.slug === slug &&
      row.url.toUpperCase().includes(B087) &&
      passesDirectBuyableGate({
        browser_truth_classification: row.browser_truth_classification,
      }),
  );
}

describe("b087-p0-buyer-path-safety-v1", () => {
  test("4396841 has no live direct_buyable B087PDLZL9 row in retailer_links.csv", () => {
    assert.equal(b087LiveDirectBuyableRows("4396841").length, 0);
    const amazonRows = parseAmazonRowsFromRetailerLinksCsv(
      readFileSync(path.join(ROOT, CSV_REL), "utf8"),
    ).filter((r) => r.slug === "4396841");
    assert.equal(amazonRows.length, 0);
  });

  test("4396710 has no live direct_buyable B087PDLZL9 row in retailer_links.csv", () => {
    assert.equal(b087LiveDirectBuyableRows("4396710").length, 0);
    const amazonRows = parseAmazonRowsFromRetailerLinksCsv(
      readFileSync(path.join(ROOT, CSV_REL), "utf8"),
    ).filter((r) => r.slug === "4396710");
    assert.equal(amazonRows.length, 0);
  });

  test("edr3rxd1 has no B087PDLZL9 row in retailer_links.csv", () => {
    const edr3Rows = loadCsvRows().filter((row) => row.slug === "edr3rxd1");
    assert.ok(edr3Rows.every((row) => !row.url.toUpperCase().includes(B087)));
  });

  test("fridge retailer_links.csv has 12 Amazon rows and no B087PDLZL9", () => {
    const amazonRows = parseAmazonRowsFromRetailerLinksCsv(
      readFileSync(path.join(ROOT, CSV_REL), "utf8"),
    );
    assert.equal(amazonRows.length, 12);
    assert.ok(!amazonRows.some((r) => r.url.toUpperCase().includes(B087)));
  });

  test("retailer_links.csv contains no B087PDLZL9 anywhere", () => {
    const csv = readFileSync(path.join(ROOT, CSV_REL), "utf8");
    assert.ok(!csv.toUpperCase().includes(B087));
  });

  test("any residual B087 CSV row would fail buy-path gate (defense in depth)", () => {
    const hypothetical = {
      retailer_key: "amazon",
      affiliate_url: `https://www.amazon.com/dp/${B087}?tag=buckparts20-20`,
      browser_truth_classification: "direct_buyable",
      browser_truth_buyable_subtype: "MULTIPACK_DIRECT_BUYABLE",
    };
    assert.equal(buyLinkGateFailureKind(hypothetical), null);
    assert.equal(
      buyLinkGateFailureKind({
        ...hypothetical,
        browser_truth_buyable_subtype: "BLOCKED_UNSAFE",
      }),
      "unsafe_browser_truth",
    );
    assert.equal(
      filterRealBuyRetailerLinks([
        {
          id: "x",
          retailer_name: "Amazon",
          ...hypothetical,
          browser_truth_buyable_subtype: "BLOCKED_UNSAFE",
        },
      ]).length,
      0,
    );
  });
});
