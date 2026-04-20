import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

const REPO = process.cwd();

/** Wedge segments that use `VerticalModelPageContent` / `VerticalFilterPageContent` + wedge `/go`. */
const VERTICAL_MONEY_WEDGES = [
  "air-purifier",
  "whole-house-water",
  "humidifier",
  "vacuum",
  "appliance-air",
] as const;

function reEscape(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function readPage(rel: string): string {
  const abs = path.join(REPO, rel);
  assert.ok(fs.existsSync(abs), `missing ${rel}`);
  return fs.readFileSync(abs, "utf8");
}

/** Block cross-wedge copy-paste of `@/lib/data/<wedge>/…` loaders on money pages. */
function assertNoForeignVerticalDataModules(src: string, allowedPrefix: string): void {
  for (const w of VERTICAL_MONEY_WEDGES) {
    const prefix = `@/lib/data/${w}/`;
    if (allowedPrefix === prefix) continue;
    assert.ok(
      !src.includes(prefix),
      `must not reference foreign vertical data path ${prefix}`,
    );
  }
}

describe("money-page CTA composition (wedge data vs /go hop)", () => {
  describe("vertical model pages align loader + TieredBuyLinks goBase", () => {
    for (const w of VERTICAL_MONEY_WEDGES) {
      const rel = `src/app/${w}/model/[slug]/page.tsx`;
      it(`${rel} uses ${w} models + matching goBase`, () => {
        const src = readPage(rel);
        assert.match(
          src,
          new RegExp(`from\\s+["']@/lib/data/${reEscape(w)}/models["']`),
          "model page must load from this wedge's models module",
        );
        assert.ok(
          src.includes(`goBase="/${w}/go"`),
          `goBase must be "/${w}/go" so retailer_link UUIDs hit the same wedge's /go handler`,
        );
        assert.ok(
          src.includes(`filterBasePath="/${w}/filter"`),
          `filterBasePath must be "/${w}/filter"`,
        );
        assert.ok(
          src.includes(`searchHref="/${w}/search"`),
          `searchHref must be "/${w}/search"`,
        );
        assert.ok(
          !src.includes("@/lib/data/retailers"),
          "vertical model page must not import legacy fridge retailers module",
        );
        assert.ok(
          !src.includes("@/lib/data/fridges"),
          "vertical model page must not import fridge catalog module",
        );
        assert.ok(
          !src.includes("@/lib/data/filters"),
          "vertical model page must not import fridge filter module",
        );
        assertNoForeignVerticalDataModules(src, `@/lib/data/${w}/`);
      });
    }
  });

  describe("vertical filter pages align loader + TieredBuyLinks goBase", () => {
    for (const w of VERTICAL_MONEY_WEDGES) {
      const rel = `src/app/${w}/filter/[slug]/page.tsx`;
      it(`${rel} uses ${w} filters + matching goBase`, () => {
        const src = readPage(rel);
        assert.match(
          src,
          new RegExp(`from\\s+["']@/lib/data/${reEscape(w)}/filters["']`),
          "filter page must load from this wedge's filters module",
        );
        assert.ok(src.includes(`goBase="/${w}/go"`), `goBase must be "/${w}/go"`);
        assert.ok(src.includes(`modelBasePath="/${w}/model"`), `modelBasePath must be "/${w}/model"`);
        assert.ok(src.includes(`searchHref="/${w}/search"`), `searchHref must be "/${w}/search"`);
        assert.ok(!src.includes("@/lib/data/retailers"), "must not import legacy fridge retailers");
        assert.ok(!src.includes("@/lib/data/fridges"), "must not import fridge catalog module");
        assert.ok(!src.includes("@/lib/data/filters"), "must not import fridge filter hub module");
        assertNoForeignVerticalDataModules(src, `@/lib/data/${w}/`);
      });
    }
  });

  it("fridge filter hub uses fridge filter data + legacy /go", () => {
    const rel = "src/app/filter/[slug]/page.tsx";
    const src = readPage(rel);
    assert.match(
      src,
      /from\s+["']@\/lib\/data\/filters["']/,
      "fridge filter page must import @/lib/data/filters",
    );
    assert.ok(src.includes('goBase="/go"'), "fridge filter TieredBuyLinks must use goBase=\"/go\"");
    assertNoForeignVerticalDataModules(src, "");
    assert.ok(!src.includes("@/lib/data/fridges"), "filter hub page must not load fridge models here");
  });

  it("fridge model hub uses fridge data + default BuyLinks /go", () => {
    const rel = "src/app/fridge/[slug]/page.tsx";
    const src = readPage(rel);
    assert.match(
      src,
      /from\s+["']@\/lib\/data\/fridges["']/,
      "fridge model page must import @/lib/data/fridges",
    );
    assert.ok(src.includes("<BuyLinks"), "expected BuyLinks for per-filter CTAs");
    assert.ok(
      !src.includes('goBase="/air-purifier/go"') &&
        !src.includes('goBase="/vacuum/go"') &&
        !src.includes('goBase="/humidifier/go"'),
      "fridge BuyLinks must not be wired to a vertical wedge /go",
    );
    assertNoForeignVerticalDataModules(src, "");
    assert.ok(!src.includes("@/lib/data/filters"), "fridge model page must not import filter hub module");
  });
});
