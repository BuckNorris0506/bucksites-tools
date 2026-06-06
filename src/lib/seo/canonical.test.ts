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
