import assert from "node:assert/strict";
import test from "node:test";

import type { GscSearchAnalyticsArtifact } from "@/lib/owner-dashboard/gsc-api-artifact";
import { HOMEKEEP_WEDGE_CATALOG } from "@/lib/catalog/identity";

import {
  buildDemandToCoverageNextLaneUnknownV1,
  buildDemandToCoverageNextLaneV1Report,
  wedgeFromPageUrl,
  wedgeFromQueryText,
  type GscArtifactLoadResultV1,
} from "./lib/demand-to-coverage-next-lane-v1";

const fixedNow = () => new Date("2026-05-22T18:00:00.000Z");

function fixtureGscArtifact(): GscSearchAnalyticsArtifact {
  return {
    status: "OK",
    fetched_at: "2026-05-22T12:00:00.000Z",
    property: "sc-domain:buckparts.com",
    date_range: { start_date: "2026-04-22", end_date: "2026-05-18" },
    total_clicks: 3,
    total_impressions: 289,
    average_ctr: 0.01,
    average_position: 12,
    top_queries_by_clicks: "UNKNOWN",
    top_queries_by_impressions: [
      {
        key: "air purifier filter replacement",
        impressions: 28,
        clicks: 1,
        ctr: 0.035,
      },
      {
        key: "he15fkpet",
        impressions: 14,
        clicks: 0,
        ctr: 0,
      },
    ],
    top_pages_by_clicks: "UNKNOWN",
    top_pages_by_impressions: [
      {
        key: "https://buckparts.com/air-purifier",
        impressions: 111,
        clicks: 2,
        ctr: 0.018,
      },
      {
        key: "https://buckparts.com/air-purifier/model/shark-hp150",
        impressions: 82,
        clicks: 1,
        ctr: 0.012,
      },
      {
        key: "https://buckparts.com/brand/frigidaire",
        impressions: 20,
        clicks: 0,
        ctr: 0,
      },
    ],
    high_impression_low_click_opportunities: "UNKNOWN",
    proven_facts: [],
    unknown_facts: [],
    provenance: {
      source: "google_search_console_api",
      scope: "https://www.googleapis.com/auth/webmasters.readonly",
      writer: "test",
    },
  };
}

const AIR_PURIFIER_LINKS_CSV = `filter_slug,retailer_name,affiliate_url,is_primary,retailer_key,retailer_slug,destination_url
levoit-rf-rar029,OEM / manufacturer catalog (keyword lookup),https://levoit.com/search?q=LEVOIT-RF-RAR029,true,oem-catalog,oem-catalog,https://levoit.com/search?q=LEVOIT-RF-RAR029
levoit-rf-rar040,OEM / manufacturer catalog (keyword lookup),https://levoit.com/search?q=LEVOIT-RF-RAR040,true,oem-catalog,oem-catalog,https://levoit.com/search?q=LEVOIT-RF-RAR040
`;

const FRIDGE_LINKS_CSV = `filter_slug,retailer_name,affiliate_url,is_primary,retailer_key,retailer_slug,destination_url,browser_truth_classification
rpwfe,OEM parts catalog (GE spec PDP),https://www.geapplianceparts.com/store/parts/spec/RPWFE,true,0,oem-parts-catalog,direct_buyable,Playwright proof,2026-05-22T12:00:00.000Z
xwf,OEM parts catalog (keyword lookup),https://www.geapplianceparts.com/store/catalog/search.jsp?searchKeyword=XWF,true,0,oem-parts-catalog,,,
`;

const SITEMAP_FIXTURE = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://buckparts.com/air-purifier</loc></url>
  <url><loc>https://buckparts.com/air-purifier/model/shark-hp150</loc></url>
  <url><loc>https://buckparts.com/fridge/frigidaire-ffhn2740pe</loc></url>
  <url><loc>https://buckparts.com/filter/rpwfe</loc></url>
</urlset>`;

const files: Record<string, string> = {
  "data/air-purifier/filters.csv": "brand_slug,slug,oem_part_number,name\nsample,sample-ap-hepa,HK-1,HEPA\n",
  "data/air-purifier/retailer_links.csv": AIR_PURIFIER_LINKS_CSV,
  "data/filters.csv": "brand_slug,slug,oem_part_number,name\nge,rpwfe,RPWFE,GE RPWFE\n",
  "data/retailer_links.csv": FRIDGE_LINKS_CSV,
};

test("wedgeFromPageUrl maps air purifier and refrigerator routes", () => {
  assert.equal(wedgeFromPageUrl("https://buckparts.com/air-purifier"), HOMEKEEP_WEDGE_CATALOG.air_purifier);
  assert.equal(wedgeFromPageUrl("https://buckparts.com/filter/rpwfe"), HOMEKEEP_WEDGE_CATALOG.refrigerator_water);
  assert.equal(wedgeFromQueryText("air purifier filter replacement"), HOMEKEEP_WEDGE_CATALOG.air_purifier);
});

test("air purifier fixture recommends reopen with buyer-path snapshot action", async () => {
  const loadGscArtifact = async (): Promise<GscArtifactLoadResultV1> => ({
    ok: true,
    artifact: fixtureGscArtifact(),
    source: "test_fixture",
  });

  const report = await buildDemandToCoverageNextLaneV1Report({
    rootDir: "/fixture-root",
    now: fixedNow,
    fileExists: (abs) => {
      const rel = abs.replace("/fixture-root/", "");
      return rel in files || rel === "data/gsc/sitemap.xml";
    },
    readTextFile: (abs) => {
      const rel = abs.replace("/fixture-root/", "");
      if (rel === "data/gsc/sitemap.xml") return SITEMAP_FIXTURE;
      return files[rel] ?? "";
    },
    loadGscArtifact,
    loadSitemapText: () => SITEMAP_FIXTURE,
  });

  assert.equal(report.source_status, "PROVEN");
  assert.equal(report.recommended_wedge, HOMEKEEP_WEDGE_CATALOG.air_purifier);
  assert.equal(report.recommendation_status, "RECOMMEND_REOPEN");
  assert.match(report.next_action, /air purifier buyer-path coverage snapshot/i);
  assert.match(report.next_action, /top-20 queue/i);

  const ap = report.wedge_rows.find((r) => r.wedge === HOMEKEEP_WEDGE_CATALOG.air_purifier);
  assert.ok(ap);
  assert.equal(ap.launch_state, "NOINDEX_UNPROVEN");
  assert.equal(ap.impressions, 221);
  assert.ok(ap.blocked_link_count >= 2);
  assert.equal(ap.top_pages[0], "https://buckparts.com/air-purifier");
});

test("missing GSC degrades to UNKNOWN and does not throw", async () => {
  const report = await buildDemandToCoverageNextLaneV1Report({
    rootDir: "/empty",
    now: fixedNow,
    fileExists: () => false,
    readTextFile: () => "",
    loadGscArtifact: async () => ({ ok: false, reason: "fixture missing" }),
    loadSitemapText: () => null,
  });

  assert.equal(report.source_status, "UNKNOWN");
  assert.equal(report.recommendation_status, "UNKNOWN");
  assert.equal(report.recommended_wedge, "UNKNOWN");
});

test("buildDemandToCoverageNextLaneUnknownV1 is stable", () => {
  const report = buildDemandToCoverageNextLaneUnknownV1({ now: fixedNow, reason: "test" });
  assert.equal(report.report_name, "demand_to_coverage_next_lane_v1");
  assert.equal(report.read_only, true);
  assert.equal(report.data_mutation, false);
});
