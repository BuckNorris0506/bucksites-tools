import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

import {
  FRIDGE_FIRST_HOMEPAGE_BROWSE_PROMO_VERTICALS,
  attachOwnerVerticalLaunchPolicyReport,
  buildOwnerVerticalLaunchPolicyReport,
} from "@/lib/owner-dashboard/owner-vertical-launch-policy";

describe("owner vertical launch / crawler policy (read-only)", () => {
  it("report is read-only and lists generation sources", () => {
    const r = buildOwnerVerticalLaunchPolicyReport();
    assert.equal(r.data_mutation, false);
    assert.ok(r.generated_from.length >= 3);
    assert.ok(r.generated_from.some((s) => s.includes("vertical-launch-state")));
    assert.ok(r.rows.length >= 6);
  });

  it("refrigerator: LIVE, sitemap discovery, not layout-noindexed, LIVE catalog + homepage promo", () => {
    const r = buildOwnerVerticalLaunchPolicyReport();
    const row = r.rows.find((x) => x.vertical_slug === "refrigerator");
    assert.ok(row);
    assert.equal(row.launch_state, "LIVE");
    assert.equal(row.is_live, true);
    assert.equal(row.sitemap_discovery_urls_expected, true);
    assert.equal(row.layout_noindex_follow_expected, false);
    assert.equal(row.catalog_hub_promo_expected, true);
    assert.equal(row.catalog_hub_live_promo_expected, true);
    assert.equal(row.homepage_browse_promo_expected, true);
    assert.equal(row.owner_note, null);
  });

  it("air-purifier: LIVE, sitemap discovery, not layout-noindexed, LIVE catalog hub, no homepage promo", () => {
    const r = buildOwnerVerticalLaunchPolicyReport();
    const row = r.rows.find((x) => x.vertical_slug === "air-purifier");
    assert.ok(row);
    assert.equal(row.launch_state, "LIVE");
    assert.equal(row.is_live, true);
    assert.equal(row.sitemap_discovery_urls_expected, true);
    assert.equal(row.layout_noindex_follow_expected, false);
    assert.equal(row.catalog_hub_promo_expected, true);
    assert.equal(row.catalog_hub_live_promo_expected, true);
    assert.equal(row.homepage_browse_promo_expected, false);
    assert.equal(row.owner_note, null);
  });

  it("whole-house-water: non-live, catalog hub card with honest preview, no homepage promo", () => {
    const r = buildOwnerVerticalLaunchPolicyReport();
    const row = r.rows.find((x) => x.vertical_slug === "whole-house-water");
    assert.ok(row);
    assert.equal(row.launch_state, "NOINDEX_UNPROVEN");
    assert.equal(row.is_live, false);
    assert.equal(row.sitemap_discovery_urls_expected, false);
    assert.equal(row.layout_noindex_follow_expected, true);
    assert.equal(row.catalog_hub_promo_expected, true);
    assert.equal(row.catalog_hub_live_promo_expected, false);
    assert.equal(row.homepage_browse_promo_expected, false);
  });

  it("attachOwnerVerticalLaunchPolicyReport preserves read-only contract", () => {
    const policy = buildOwnerVerticalLaunchPolicyReport();
    const report = attachOwnerVerticalLaunchPolicyReport({ report_name: "t" }, policy);
    assert.ok("owner_vertical_launch_policy" in report);
    assert.equal(report.owner_vertical_launch_policy.data_mutation, false);
    assert.ok(report.owner_vertical_launch_policy.rows.length >= 1);
  });

  it("homepage browse promo constant stays aligned with fridge-first src/app/page.tsx", () => {
    assert.deepEqual([...FRIDGE_FIRST_HOMEPAGE_BROWSE_PROMO_VERTICALS], ["refrigerator"]);
    const home = readFileSync(join(process.cwd(), "src/app/page.tsx"), "utf8");
    assert.equal(home.includes('href="/air-purifier"'), false);
    assert.equal(home.includes('href="/whole-house-water"'), false);
    assert.ok(home.includes('href="/catalog"'));
  });
});
