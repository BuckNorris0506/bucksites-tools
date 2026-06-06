import assert from "node:assert/strict";
import test from "node:test";

import {
  FORBIDDEN_JSON_LD_KEYS,
  buildOrganizationJsonLd,
  buildRefrigeratorFilterProductJsonLd,
  buildSiteWideJsonLdGraph,
  buildWebSiteJsonLd,
  jsonLdContainsForbiddenKeys,
  refrigeratorFilterMetadataDescription,
} from "@/lib/seo/structured-data";

const SITE_URL = "https://buckparts.com";

test("site-wide JSON-LD graph omits forbidden commerce and review keys", () => {
  const graph = buildSiteWideJsonLdGraph(SITE_URL);
  assert.equal(jsonLdContainsForbiddenKeys(graph).length, 0);
  assert.equal(graph.length, 2);
});

test("Organization JSON-LD uses repo-proven site fields only", () => {
  const org = buildOrganizationJsonLd(SITE_URL);
  assert.equal(org["@type"], "Organization");
  assert.equal(org.name, "BuckParts");
  assert.equal(org.url, SITE_URL);
  assert.equal(org.logo, `${SITE_URL}/buckparts-logo-black-transparent.png`);
  assert.equal(org.email, "admin@buckparts.com");
  assert.ok(typeof org.description === "string" && org.description.length > 0);
  assert.equal("image" in org, false);
  assert.equal(jsonLdContainsForbiddenKeys(org).length, 0);
});

test("WebSite JSON-LD includes SearchAction for /search?q=", () => {
  const site = buildWebSiteJsonLd(SITE_URL);
  assert.equal(site["@type"], "WebSite");
  const action = site.potentialAction as Record<string, unknown>;
  assert.equal(action["@type"], "SearchAction");
  const target = action.target as Record<string, unknown>;
  assert.equal(target.urlTemplate, `${SITE_URL}/search?q={search_term_string}`);
  assert.equal(jsonLdContainsForbiddenKeys(site).length, 0);
});

test("Product JSON-LD includes proven filter fields and omits image", () => {
  const description = refrigeratorFilterMetadataDescription("LT1000P");
  const product = buildRefrigeratorFilterProductJsonLd({
    slug: "lt1000p",
    oemPartNumber: "LT1000P",
    name: "LT1000P cartridge",
    brandName: "LG",
    description,
    siteUrl: SITE_URL,
  });
  assert.ok(product);
  assert.equal(product!["@type"], "Product");
  assert.equal(product!.name, "LT1000P cartridge");
  assert.equal(product!.mpn, "LT1000P");
  assert.equal(product!.description, description);
  assert.deepEqual(product!.brand, { "@type": "Brand", name: "LG" });
  assert.equal(product!.url, `${SITE_URL}/filter/lt1000p`);
  assert.equal("image" in product!, false);
  assert.equal("sku" in product!, false);
  assert.equal(jsonLdContainsForbiddenKeys(product!).length, 0);
});

test("Product JSON-LD falls back to OEM for name and returns null when required fields missing", () => {
  const description = refrigeratorFilterMetadataDescription("MWF");
  const product = buildRefrigeratorFilterProductJsonLd({
    slug: "mwf",
    oemPartNumber: "MWF",
    name: null,
    brandName: "GE",
    description,
    siteUrl: SITE_URL,
  });
  assert.equal(product!.name, "MWF");

  assert.equal(
    buildRefrigeratorFilterProductJsonLd({
      slug: "mwf",
      oemPartNumber: "",
      name: "MWF",
      brandName: "GE",
      description,
      siteUrl: SITE_URL,
    }),
    null,
  );
});

test("forbidden key scanner covers Phase 1 deny list including nested keys", () => {
  const polluted = {
    "@type": "Product",
    offers: { price: "9.99" },
    aggregateRating: { ratingValue: 5 },
  };
  const hits = jsonLdContainsForbiddenKeys(polluted);
  assert.ok(hits.includes("offers"));
  assert.ok(hits.includes("price"));
  assert.ok(hits.includes("aggregateRating"));
  assert.equal(hits.length, 3);
  assert.equal(hits.length <= FORBIDDEN_JSON_LD_KEYS.length, true);
});
