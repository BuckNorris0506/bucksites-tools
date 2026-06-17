import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { parseGscSearchAnalyticsArtifact } from "@/lib/owner-dashboard/gsc-api-artifact";

describe("gsc api artifact parser", () => {
  it("parses valid normalized artifact", () => {
    const parsed = parseGscSearchAnalyticsArtifact(
      JSON.stringify({
        status: "OK",
        fetched_at: "2026-05-08T14:00:00.000Z",
        property: "sc-domain:buckparts.com",
        date_range: { start_date: "2026-04-05", end_date: "2026-05-04" },
        total_clicks: 120,
        total_impressions: 2400,
        average_ctr: 0.05,
        average_position: 11.2,
        top_queries_by_clicks: [{ key: "mwf", clicks: 50, impressions: 500, ctr: 0.1 }],
        top_queries_by_impressions: [{ key: "mwf", clicks: 50, impressions: 500, ctr: 0.1 }],
        top_pages_by_clicks: [{ key: "/filter/mwf", clicks: 40, impressions: 400, ctr: 0.1 }],
        top_pages_by_impressions: [{ key: "/filter/mwf", clicks: 40, impressions: 400, ctr: 0.1 }],
        high_impression_low_click_opportunities: [
          { key: "low click", clicks: 1, impressions: 120, ctr: 1 / 120, average_position: 18 },
        ],
        proven_facts: ["ok"],
        unknown_facts: [],
        provenance: {
          source: "google_search_console_api",
          scope: "https://www.googleapis.com/auth/webmasters.readonly",
          writer: "scripts/fetch-buckparts-gsc-artifact.ts",
        },
      }),
    );
    assert.equal(parsed.ok, true);
    if (parsed.ok) {
      const opportunities = parsed.artifact.high_impression_low_click_opportunities;
      assert.notEqual(opportunities, "UNKNOWN");
      if (opportunities !== "UNKNOWN") {
        assert.equal(opportunities[0]?.average_position, 18);
      }
    }
  });

  it("parses tracked_page_slices_v1 when present", () => {
    const parsed = parseGscSearchAnalyticsArtifact(
      JSON.stringify({
        status: "OK",
        fetched_at: "2026-05-08T14:00:00.000Z",
        property: "sc-domain:buckparts.com",
        date_range: { start_date: "2026-04-05", end_date: "2026-05-04" },
        total_clicks: 120,
        total_impressions: 2400,
        average_ctr: 0.05,
        average_position: 11.2,
        top_queries_by_clicks: [{ key: "mwf", clicks: 50, impressions: 500, ctr: 0.1 }],
        top_queries_by_impressions: [{ key: "mwf", clicks: 50, impressions: 500, ctr: 0.1 }],
        top_pages_by_clicks: [{ key: "/filter/mwf", clicks: 40, impressions: 400, ctr: 0.1 }],
        top_pages_by_impressions: [{ key: "/filter/mwf", clicks: 40, impressions: 400, ctr: 0.1 }],
        high_impression_low_click_opportunities: [
          { key: "low click", clicks: 1, impressions: 120, ctr: 1 / 120, average_position: 18 },
        ],
        tracked_page_slices_v1: [
          {
            slug: "medify-ma50-rf",
            page_url: "https://buckparts.com/air-purifier/filter/medify-ma50-rf",
            match_status: "FOUND",
            impressions: 3,
            clicks: 1,
            ctr: 1 / 3,
            average_position: 15.2,
            gsc_page_key: "https://buckparts.com/air-purifier/filter/medify-ma50-rf",
          },
        ],
        proven_facts: ["ok"],
        unknown_facts: [],
        provenance: {
          source: "google_search_console_api",
          scope: "https://www.googleapis.com/auth/webmasters.readonly",
          writer: "scripts/fetch-buckparts-gsc-artifact.ts",
        },
      }),
    );
    assert.equal(parsed.ok, true);
    if (parsed.ok) {
      assert.equal(parsed.artifact.tracked_page_slices_v1?.length, 1);
      assert.equal(parsed.artifact.tracked_page_slices_v1?.[0]?.match_status, "FOUND");
    }
  });

  it("accepts older artifacts without tracked_page_slices_v1", () => {
    const parsed = parseGscSearchAnalyticsArtifact(
      JSON.stringify({
        status: "OK",
        fetched_at: "2026-05-08T14:00:00.000Z",
        property: "sc-domain:buckparts.com",
        date_range: { start_date: "2026-04-05", end_date: "2026-05-04" },
        total_clicks: 120,
        total_impressions: 2400,
        average_ctr: 0.05,
        average_position: 11.2,
        top_queries_by_clicks: [{ key: "mwf", clicks: 50, impressions: 500, ctr: 0.1 }],
        top_queries_by_impressions: [{ key: "mwf", clicks: 50, impressions: 500, ctr: 0.1 }],
        top_pages_by_clicks: [{ key: "/filter/mwf", clicks: 40, impressions: 400, ctr: 0.1 }],
        top_pages_by_impressions: [{ key: "/filter/mwf", clicks: 40, impressions: 400, ctr: 0.1 }],
        high_impression_low_click_opportunities: "UNKNOWN",
        proven_facts: ["ok"],
        unknown_facts: [],
        provenance: {
          source: "google_search_console_api",
          scope: "https://www.googleapis.com/auth/webmasters.readonly",
          writer: "scripts/fetch-buckparts-gsc-artifact.ts",
        },
      }),
    );
    assert.equal(parsed.ok, true);
    if (parsed.ok) {
      assert.equal(parsed.artifact.tracked_page_slices_v1, undefined);
    }
  });
});
