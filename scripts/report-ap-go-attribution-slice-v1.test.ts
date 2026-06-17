import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildApGoAttributionGroups } from "./report-ap-go-attribution-slice-v1";

describe("buildApGoAttributionGroups", () => {
  it("groups by page_type, page_slug, filter_slug, and link id", () => {
    const linkMeta = new Map([
      [
        "link-a",
        { linkId: "link-a", filterSlug: "levoit-rf-rar029", retailerKey: "amazon" },
      ],
      [
        "link-b",
        { linkId: "link-b", filterSlug: "levoit-rf-rar029", retailerKey: "oem-catalog" },
      ],
    ]);
    const groups = buildApGoAttributionGroups(
      [
        {
          page_type: "air_purifier_model",
          page_slug: "levoit-core-300",
          created_at: "2026-06-01T00:00:00.000Z",
          air_purifier_retailer_link_id: "link-a",
        },
        {
          page_type: "air_purifier_model",
          page_slug: "levoit-core-300",
          created_at: "2026-06-02T00:00:00.000Z",
          air_purifier_retailer_link_id: "link-a",
        },
        {
          page_type: "air_purifier_filter",
          page_slug: "levoit-rf-rar029",
          created_at: "2026-06-03T00:00:00.000Z",
          air_purifier_retailer_link_id: "link-b",
        },
        {
          page_type: null,
          page_slug: null,
          created_at: "2026-05-01T00:00:00.000Z",
          air_purifier_retailer_link_id: "link-a",
        },
      ],
      linkMeta,
    );
    assert.equal(groups.length, 3);
    const modelGroup = groups.find(
      (g) =>
        g.page_type === "air_purifier_model" &&
        g.page_slug === "levoit-core-300" &&
        g.air_purifier_retailer_link_id === "link-a",
    );
    assert.ok(modelGroup);
    assert.equal(modelGroup.clicks, 2);
    assert.equal(modelGroup.filter_slug, "levoit-rf-rar029");
    const legacy = groups.find((g) => g.page_type === null && g.page_slug === null);
    assert.ok(legacy);
    assert.equal(legacy.clicks, 1);
  });
});
