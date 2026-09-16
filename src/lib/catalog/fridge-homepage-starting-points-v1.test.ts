import assert from "node:assert/strict";
import test from "node:test";

import {
  FRIDGE_HOMEPAGE_STARTING_POINT_CAP_V1,
  selectFridgeHomepageStartingPointsV1,
  slugsWithLiveVerifiedLinkFromRows,
} from "@/lib/catalog/fridge-homepage-starting-points-v1";

const now = new Date("2026-09-12T12:00:00.000Z");
const freshCheckedAt = "2026-09-09T14:41:34.635Z";

function browseRow(slug: string) {
  return { slug, oem_part_number: slug.toUpperCase(), name: `Whirlpool ${slug}` };
}

function amazonLink(filterId: string, checkedAt: string | null) {
  return {
    filter_id: filterId,
    retailer_key: "amazon",
    affiliate_url: "https://www.amazon.com/dp/B00EXAMPLE?tag=buckparts20-20",
    browser_truth_classification: "direct_buyable",
    browser_truth_buyable_subtype: "SINGLE_UNIT_DIRECT_BUYABLE",
    browser_truth_checked_at: checkedAt,
    browser_truth_notes: null,
  };
}

test("homepage starting points keep OEM order and drop closed no-CTA slugs", () => {
  const selected = selectFridgeHomepageStartingPointsV1({
    browseFilters: [
      browseRow("242017801"),
      browseRow("4396395"),
      browseRow("4396508"),
      browseRow("4396710"),
    ],
    slugsWithLiveVerifiedLink: ["4396710", "4396508"],
  });
  assert.deepEqual(
    selected.map((row) => row.slug),
    ["4396508", "4396710"],
  );
});

test("homepage starting points do not backfill with no-CTA pages", () => {
  const selected = selectFridgeHomepageStartingPointsV1({
    browseFilters: [
      browseRow("242017801"),
      browseRow("4396395"),
      browseRow("4396508"),
      browseRow("4396710"),
    ],
    slugsWithLiveVerifiedLink: ["4396508"],
    cap: FRIDGE_HOMEPAGE_STARTING_POINT_CAP_V1,
  });
  assert.deepEqual(
    selected.map((row) => row.slug),
    ["4396508"],
  );
});

test("catalog-only 4396395 link does not count as a live Verified Link", () => {
  const slugs = slugsWithLiveVerifiedLinkFromRows({
    slugByFilterId: new Map([
      ["id-4396395", "4396395"],
      ["id-4396710", "4396710"],
    ]),
    links: [
      {
        filter_id: "id-4396395",
        retailer_key: "oem-parts-catalog",
        affiliate_url:
          "https://www.whirlpoolparts.com/catalog.jsp?search=stw=&path=&searchKeyword=4396395",
        browser_truth_classification: null,
        browser_truth_buyable_subtype: null,
        browser_truth_checked_at: null,
        browser_truth_notes: null,
      },
      amazonLink("id-4396710", freshCheckedAt),
    ],
    now,
  });
  assert.equal(slugs.has("4396395"), false);
  assert.equal(slugs.has("4396710"), true);
});
