import assert from "node:assert/strict";
import test from "node:test";

import {
  canonicalAlternatesForIndexablePath,
  canonicalAlternatesForPath,
  isIndexablePageState,
} from "@/lib/seo/canonical";
import { PAGE_STATES } from "@/lib/page-state/page-state";

test("indexable page states qualify for canonical alternates", () => {
  for (const pageState of [
    PAGE_STATES.INDEXABLE_BUY_READY,
    PAGE_STATES.INDEXABLE_BUY_SUPPRESSED_TRUST,
    PAGE_STATES.INDEXABLE_INFO_ONLY,
  ]) {
    assert.equal(isIndexablePageState(pageState), true);
    assert.deepEqual(canonicalAlternatesForIndexablePath("/fridge/lfxs26973s", pageState), {
      alternates: { canonical: "/fridge/lfxs26973s" },
    });
  }
});

test("noindex page states omit canonical alternates", () => {
  for (const pageState of [
    PAGE_STATES.SITEMAP_EXCLUDED_DEMAND,
    PAGE_STATES.SITEMAP_EXCLUDED_LOW_SIGNAL,
    PAGE_STATES.UNKNOWN,
  ]) {
    assert.equal(isIndexablePageState(pageState), false);
    assert.equal(
      canonicalAlternatesForIndexablePath("/filter/example", pageState),
      undefined,
      `${pageState}: noindex routes skip canonical to avoid mixed consolidation signals`,
    );
  }
});

test("brand routes always receive path canonical without page-state gate", () => {
  assert.deepEqual(canonicalAlternatesForPath("brand/lg"), {
    alternates: { canonical: "/brand/lg" },
  });
});

test("public hub routes receive explicit self-canonical paths", () => {
  for (const path of ["/catalog", "/air-purifier"] as const) {
    assert.deepEqual(canonicalAlternatesForPath(path), {
      alternates: { canonical: path },
    });
  }
});

test("search routes receive base-path canonical without query params", () => {
  for (const path of ["/search", "/air-purifier/search"] as const) {
    assert.deepEqual(canonicalAlternatesForPath(path), {
      alternates: { canonical: path },
    });
    assert.equal(String(canonicalAlternatesForPath(path).alternates?.canonical).includes("?"), false);
  }
});

test("global search metadata canonicalizes to /search regardless of query", async () => {
  const { generateMetadata } = await import("@/app/search/page");
  const empty = await generateMetadata({ searchParams: {} });
  const withQuery = await generateMetadata({ searchParams: { q: "wf3cb" } });
  assert.deepEqual(empty.alternates?.canonical, "/search");
  assert.deepEqual(withQuery.alternates?.canonical, "/search");
  assert.equal(empty.robots, undefined);
  assert.equal(withQuery.robots, undefined);
});

test("air purifier search metadata canonicalizes to /air-purifier/search regardless of query", async () => {
  const { generateMetadata } = await import("@/app/air-purifier/search/page");
  const empty = await generateMetadata({ searchParams: {} });
  const withQuery = await generateMetadata({ searchParams: { q: "shark hp150" } });
  assert.deepEqual(empty.alternates?.canonical, "/air-purifier/search");
  assert.deepEqual(withQuery.alternates?.canonical, "/air-purifier/search");
});

test("air purifier hub and catalog pages export explicit self-canonical metadata", async () => {
  const { metadata: airPurifierHub } = await import("@/app/air-purifier/page");
  const { metadata: catalog } = await import("@/app/catalog/page");
  assert.deepEqual(airPurifierHub.alternates?.canonical, "/air-purifier");
  assert.deepEqual(catalog.alternates?.canonical, "/catalog");
});
