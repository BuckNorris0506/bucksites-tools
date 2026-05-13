import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

const REPO = process.cwd();

/** Modules that attach `retailer_links` to objects returned to money pages (BuyLinks / TieredBuyLinks). */
const MONEY_PAGE_RETAILER_ROW_SOURCES = [
  "src/lib/data/air-purifier/models.ts",
  "src/lib/data/air-purifier/filters.ts",
  "src/lib/data/whole-house-water/models.ts",
  "src/lib/data/whole-house-water/filters.ts",
  "src/lib/data/vacuum/models.ts",
  "src/lib/data/vacuum/filters.ts",
  "src/lib/data/humidifier/models.ts",
  "src/lib/data/humidifier/filters.ts",
  "src/lib/data/appliance-air/models.ts",
  "src/lib/data/appliance-air/filters.ts",
  "src/lib/data/fridges.ts",
  "src/lib/data/filters.ts",
] as const;

const LAUNCH_IMPORT_RE =
  /from\s+["']@\/lib\/retailers\/launch-buy-links["']/;

/** Every money-page retailer row source must expose these fields so CTA gating matches /go. */
const MONEY_PAGE_BROWSER_TRUTH_SELECT_FIELDS = [
  "browser_truth_classification",
  "browser_truth_buyable_subtype",
  "browser_truth_notes",
  "browser_truth_checked_at",
] as const;

/** Ban wiring DB rows straight into page `retailer_links` without the shared filter. */
const RAW_RETAILER_LINKS_ASSIGN_RE = [
  /retailer_links:\s*\(links\s*\?\?\s*\[\]\)/,
  /retailer_links:\s*byFilter\.get\s*\(/,
  /retailer_links:\s*byPart\.get\s*\(/,
];

function readSource(rel: string): string {
  const abs = path.join(REPO, rel);
  assert.ok(fs.existsSync(abs), `missing ${rel}`);
  return fs.readFileSync(abs, "utf8");
}

describe("money-page retailer rows use filterRealBuyRetailerLinks at data boundary", () => {
  for (const rel of MONEY_PAGE_RETAILER_ROW_SOURCES) {
    it(rel, () => {
      const src = readSource(rel);
      assert.match(
        src,
        LAUNCH_IMPORT_RE,
        "must import shared buy-path helpers from @/lib/retailers/launch-buy-links",
      );
      assert.ok(
        src.includes("filterRealBuyRetailerLinks"),
        "must reference filterRealBuyRetailerLinks",
      );
      assert.ok(
        /\bfilterRealBuyRetailerLinks\s*\(/.test(src),
        "must call filterRealBuyRetailerLinks(…) when shaping retailer_links for pages",
      );
      for (const re of RAW_RETAILER_LINKS_ASSIGN_RE) {
        assert.ok(
          !re.test(src),
          `${rel} must not assign retailer_links from raw query rows without filterRealBuyRetailerLinks (matched ${re})`,
        );
      }
      for (const field of MONEY_PAGE_BROWSER_TRUTH_SELECT_FIELDS) {
        assert.ok(
          src.includes(field),
          `${rel} must select ${field} so live-link CTA filtering receives browser-truth fields (including buyable subtype)`,
        );
      }
    });
  }
});
