import assert from "node:assert/strict";
import test from "node:test";

import { rankFridgeCoverageRows } from "./generate-fridge-non-amazon-review-packets";

test("ranking supports returning top 10 zero-CTA slugs beyond fixture keys", () => {
  const rows = Array.from({ length: 12 }, (_, idx) => ({
    slug: `slug-${idx + 1}`,
    number_of_valid_links: 0,
    number_of_direct_buyable_links: 0,
    has_primary_amazon: false,
  }));
  rows.push({
    slug: "monetized-slug",
    number_of_valid_links: 1,
    number_of_direct_buyable_links: 1,
    has_primary_amazon: false,
  });
  const ranked = rankFridgeCoverageRows(rows);
  const zeroCtaTop10 = ranked.filter((r) => r.number_of_valid_links === 0).slice(0, 10);
  assert.equal(zeroCtaTop10.length, 10);
  assert.equal(zeroCtaTop10.some((r) => r.slug === "monetized-slug"), false);
});
