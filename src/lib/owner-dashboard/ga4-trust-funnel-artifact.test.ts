import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { parseGa4TrustFunnelArtifact } from "@/lib/owner-dashboard/ga4-trust-funnel-artifact";

describe("ga4 trust funnel artifact parser", () => {
  it("parses valid normalized artifact", () => {
    const parsed = parseGa4TrustFunnelArtifact(
      JSON.stringify({
        status: "OK",
        fetched_at: "2026-05-08T20:00:00.000Z",
        property_id: "123456",
        date_range: { start_date: "2026-04-01", end_date: "2026-04-30" },
        event_totals: {
          fridge_model_view: 10,
          fridge_filter_chip_click: 5,
          fridge_filter_detail_click_from_model: 3,
          fridge_filter_view: 4,
          fridge_help_opened: 1,
        },
        rates: {
          chip_clicks_per_model_view: 0.5,
          filter_views_per_chip_click: 0.8,
          help_opens_per_filter_view: 0.25,
        },
        dimension_breakdowns: {
          top_model_slugs: "UNKNOWN",
          top_filter_slugs: "UNKNOWN",
          quarantined_vs_normal: "UNKNOWN",
        },
        proven_facts: [],
        unknown_facts: [],
        provenance: {
          source: "google_analytics_data_api",
          scope: "https://www.googleapis.com/auth/analytics.readonly",
          writer: "scripts/fetch-buckparts-ga4-trust-funnel-artifact.ts",
        },
      }),
    );
    assert.equal(parsed.ok, true);
  });
});

