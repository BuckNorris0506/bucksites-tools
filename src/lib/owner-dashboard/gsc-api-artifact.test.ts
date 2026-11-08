import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  parseGscSearchAnalyticsArtifact,
  queryDemandCompleteness,
} from "@/lib/owner-dashboard/gsc-api-artifact";

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
      assert.equal(queryDemandCompleteness(parsed.artifact), "UNKNOWN");
    }
  });

  it("rejects a complete claim whose row count does not match", () => {
    const parsed = parseGscSearchAnalyticsArtifact(
      JSON.stringify({
        status: "OK",
        fetched_at: "2026-05-08T14:00:00.000Z",
        property: "sc-domain:buckparts.com",
        date_range: { start_date: "2026-04-05", end_date: "2026-05-04" },
        total_clicks: 1,
        total_impressions: 10,
        average_ctr: 0.1,
        average_position: 4,
        top_queries_by_clicks: "UNKNOWN",
        top_queries_by_impressions: "UNKNOWN",
        top_pages_by_clicks: "UNKNOWN",
        top_pages_by_impressions: "UNKNOWN",
        high_impression_low_click_opportunities: "UNKNOWN",
        query_demand_v1: {
          schema_version: "buckparts.gsc.query_demand.v1",
          dimension: "query",
          property: "sc-domain:buckparts.com",
          date_range: { start_date: "2026-04-05", end_date: "2026-05-04" },
          reporting_lag_days: 3,
          page_size: 250,
          pages_fetched: 1,
          start_row: 0,
          returned_row_count: 2,
          completeness: "COMPLETE",
          partial_reason: null,
          authorizes_publication: false,
          authorizes_action: false,
          opportunity_instruction: "NONE",
          rows: [{ key: "only-one", impressions: 10, clicks: 1, ctr: 0.1, average_position: 4 }],
        },
        proven_facts: ["ok"],
        unknown_facts: [],
        provenance: {
          source: "google_search_console_api",
          scope: "https://www.googleapis.com/auth/webmasters.readonly",
          writer: "scripts/fetch-buckparts-gsc-artifact.ts",
        },
      }),
    );
    assert.equal(parsed.ok, false);
  });

  it("rejects query evidence that authorizes publication", () => {
    const parsed = parseGscSearchAnalyticsArtifact(
      JSON.stringify({
        status: "OK",
        fetched_at: "2026-05-08T14:00:00.000Z",
        property: "sc-domain:buckparts.com",
        date_range: { start_date: "2026-04-05", end_date: "2026-05-04" },
        total_clicks: 1,
        total_impressions: 10,
        average_ctr: 0.1,
        average_position: 4,
        top_queries_by_clicks: "UNKNOWN",
        top_queries_by_impressions: "UNKNOWN",
        top_pages_by_clicks: "UNKNOWN",
        top_pages_by_impressions: "UNKNOWN",
        high_impression_low_click_opportunities: "UNKNOWN",
        query_demand_v1: {
          schema_version: "buckparts.gsc.query_demand.v1",
          dimension: "query",
          property: "sc-domain:buckparts.com",
          date_range: { start_date: "2026-04-05", end_date: "2026-05-04" },
          reporting_lag_days: 3,
          page_size: 250,
          pages_fetched: 1,
          start_row: 0,
          returned_row_count: 0,
          completeness: "COMPLETE",
          partial_reason: null,
          authorizes_publication: true,
          authorizes_action: false,
          opportunity_instruction: "NONE",
          rows: [],
        },
        proven_facts: ["ok"],
        unknown_facts: [],
        provenance: {
          source: "google_search_console_api",
          scope: "https://www.googleapis.com/auth/webmasters.readonly",
          writer: "scripts/fetch-buckparts-gsc-artifact.ts",
        },
      }),
    );
    assert.equal(parsed.ok, false);
  });
});
