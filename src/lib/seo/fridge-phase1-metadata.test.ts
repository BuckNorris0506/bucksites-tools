import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

function read(rel: string): string {
  return readFileSync(join(process.cwd(), rel), "utf8");
}

const PROTECTED_PATHS = [
  "src/app/go/[linkId]/route.ts",
  "src/components/trust/TrustAwareBuySection.tsx",
  "src/components/trust/VisualReplacementMatchCard.tsx",
  "src/lib/retailers/launch-buy-links.ts",
  "src/lib/refrigerator-filter-winner-rails.ts",
  "src/app/sitemap.ts",
  "src/app/air-purifier/page.tsx",
  "src/app/whole-house-water/page.tsx",
];

test("fridge Phase 1 pages wire canonical helpers", () => {
  const fridge = read("src/app/fridge/[slug]/page.tsx");
  assert.ok(fridge.includes("canonicalAlternatesForIndexablePath"));
  assert.ok(fridge.includes("`/fridge/${params.slug}`"));

  const filter = read("src/app/filter/[slug]/page.tsx");
  assert.ok(filter.includes("canonicalAlternatesForIndexablePath"));
  assert.ok(filter.includes("`/filter/${params.slug}`"));
  assert.ok(filter.includes("resolveRefrigeratorFilterProductJsonLdV1"));
  assert.ok(filter.includes("hasTruthfulOfferJsonLd: false"));
  assert.ok(filter.includes("JsonLdScript"));

  const brand = read("src/app/brand/[slug]/page.tsx");
  assert.ok(brand.includes("canonicalAlternatesForPath"));
  assert.ok(brand.includes("`/brand/${params.slug}`"));
});

test("root layout injects site-wide Organization and WebSite JSON-LD", () => {
  const layout = read("src/app/layout.tsx");
  assert.ok(layout.includes("buildSiteWideJsonLdGraph"));
  assert.ok(layout.includes("JsonLdScript"));
});

test("Phase 1 does not introduce ProductGroup schema", () => {
  const seoLib = read("src/lib/seo/structured-data.ts");
  const filterPage = read("src/app/filter/[slug]/page.tsx");
  assert.ok(!/ProductGroup/i.test(seoLib));
  assert.ok(!/ProductGroup/i.test(filterPage));
});

test("protected paths remain untouched in working tree", () => {
  for (const rel of PROTECTED_PATHS) {
    const diff = execSync(`git diff -- "${rel}"`, { encoding: "utf8" }).trim();
    assert.equal(diff, "", `${rel} must not be modified in Phase 1`);
  }
});
