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

const PHASE1_BROWSER_TRUTH_REQUIRED = new Map<string, string[]>([
  [
    "src/lib/data/air-purifier/models.ts",
    [
      "browser_truth_classification",
      "browser_truth_notes",
      "browser_truth_checked_at",
    ],
  ],
  [
    "src/lib/data/air-purifier/filters.ts",
    [
      "browser_truth_classification",
      "browser_truth_notes",
      "browser_truth_checked_at",
    ],
  ],
  [
    "src/lib/data/whole-house-water/models.ts",
    [
      "browser_truth_classification",
      "browser_truth_notes",
      "browser_truth_checked_at",
    ],
  ],
  [
    "src/lib/data/whole-house-water/filters.ts",
    [
      "browser_truth_classification",
      "browser_truth_notes",
      "browser_truth_checked_at",
    ],
  ],
]);

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
      for (const field of PHASE1_BROWSER_TRUTH_REQUIRED.get(rel) ?? []) {
        assert.ok(
          src.includes(field),
          `${rel} must select ${field} so Phase 1 live-link CTA filtering receives browser-truth fields`,
        );
      }
    });
  }
});
