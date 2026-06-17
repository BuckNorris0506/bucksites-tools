import assert from "node:assert/strict";
import test from "node:test";

import {
  buildGscSearchAnalyticsArtifact,
  buildHighImpressionLowClickOpportunities,
} from "./fetch-buckparts-gsc-artifact";
import {
  buildNotFetchedTrackedPageSlice,
  buildQueryFailedTrackedPageSlice,
  buildTrackedPageSliceFromFilteredRows,
} from "./lib/gsc-tracked-page-slices-v1";
import { writeGscArtifactToSupabase } from "@/lib/owner-dashboard/gsc-durable-artifact-store";

test("missing gsc env returns UNKNOWN_CONFIG artifact and no fake metrics", async () => {
  const artifact = await buildGscSearchAnalyticsArtifact({
    env: {
      GSC_PROPERTY_SITE_URL: "",
      GSC_SERVICE_ACCOUNT_JSON: "",
      GSC_SERVICE_ACCOUNT_KEY_PATH: "",
    },
  });
  assert.equal(artifact.status, "UNKNOWN_CONFIG");
  assert.equal(artifact.total_clicks, "UNKNOWN");
  assert.equal(artifact.total_impressions, "UNKNOWN");
  assert.equal(artifact.average_ctr, "UNKNOWN");
});

test("oauth token exchange failure returns UNKNOWN_API_ERROR without secret leakage", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () =>
    ({
      ok: false,
      status: 400,
      json: async () => ({ error: "invalid_grant", error_description: "Token has been expired or revoked." }),
      text: async () =>
        JSON.stringify({ error: "invalid_grant", error_description: "Token has been expired or revoked." }),
    }) as Response) as typeof fetch;
  try {
    const artifact = await buildGscSearchAnalyticsArtifact({
      env: {
        GSC_PROPERTY_SITE_URL: "sc-domain:buckparts.com",
        GSC_OAUTH_CLIENT_ID: "client-id",
        GSC_OAUTH_CLIENT_SECRET: "super-secret",
        GSC_OAUTH_REFRESH_TOKEN: "refresh-secret",
      },
    });
    assert.equal(artifact.status, "UNKNOWN_API_ERROR");
    const flattened = `${artifact.proven_facts.join(" ")} ${artifact.unknown_facts.join(" ")}`;
    assert.equal(flattened.includes("super-secret"), false);
    assert.equal(flattened.includes("refresh-secret"), false);
    assert.equal(flattened.includes("access_token"), false);
    assert.ok(artifact.unknown_facts.some((f) => f.includes("http_status=400")));
    assert.ok(artifact.unknown_facts.some((f) => f.includes("google_reason=invalid_grant")));
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("search analytics non-OK response returns UNKNOWN_API_ERROR with log-safe Google diagnostics", async () => {
  const originalFetch = globalThis.fetch;
  const googleErrorBody = JSON.stringify({
    error: {
      code: 403,
      message: "User does not have sufficient permission for this site.",
      status: "PERMISSION_DENIED",
      errors: [{ reason: "forbidden", message: "Forbidden" }],
    },
  });
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes("oauth2.googleapis.com/token")) {
      return {
        ok: true,
        status: 200,
        json: async () => ({ access_token: "test-access-token-value" }),
        text: async () => JSON.stringify({ access_token: "test-access-token-value" }),
      } as Response;
    }
    return {
      ok: false,
      status: 403,
      json: async () => JSON.parse(googleErrorBody),
      text: async () => googleErrorBody,
    } as Response;
  }) as typeof fetch;
  try {
    const artifact = await buildGscSearchAnalyticsArtifact({
      env: {
        GSC_PROPERTY_SITE_URL: "sc-domain:buckparts.com",
        GSC_OAUTH_CLIENT_ID: "client-id",
        GSC_OAUTH_CLIENT_SECRET: "super-secret",
        GSC_OAUTH_REFRESH_TOKEN: "refresh-secret",
      },
    });
    assert.equal(artifact.status, "UNKNOWN_API_ERROR");
    assert.ok(artifact.unknown_facts.some((f) => f.includes("http_status=403")));
    assert.ok(artifact.unknown_facts.some((f) => f.includes("google_status=PERMISSION_DENIED")));
    assert.ok(artifact.unknown_facts.some((f) => f.includes("google_reason=forbidden")));
    assert.ok(artifact.unknown_facts.some((f) => f.startsWith("google_message=")));
    const flattened = `${artifact.proven_facts.join(" ")} ${artifact.unknown_facts.join(" ")}`;
    assert.equal(flattened.includes("test-access-token-value"), false);
    assert.equal(flattened.includes("super-secret"), false);
    assert.equal(flattened.includes("refresh-secret"), false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("supabase durable write missing env returns log-safe UNKNOWN", async () => {
  const write = await writeGscArtifactToSupabase(
    {
      status: "OK",
      fetched_at: "2026-05-08T14:00:00.000Z",
      property: "sc-domain:buckparts.com",
      date_range: { start_date: "2026-04-01", end_date: "2026-04-30" },
      total_clicks: 1,
      total_impressions: 10,
      average_ctr: 0.1,
      average_position: 12,
      top_queries_by_clicks: "UNKNOWN",
      top_queries_by_impressions: "UNKNOWN",
      top_pages_by_clicks: "UNKNOWN",
      top_pages_by_impressions: "UNKNOWN",
      high_impression_low_click_opportunities: "UNKNOWN",
      proven_facts: [],
      unknown_facts: [],
      provenance: {
        source: "google_search_console_api",
        scope: "https://www.googleapis.com/auth/webmasters.readonly",
        writer: "scripts/fetch-buckparts-gsc-artifact.ts",
      },
    },
    { env: {} },
  );
  assert.equal(write.ok, false);
  if (!write.ok) {
    assert.equal(write.reason, "MISSING_CONFIG");
    assert.ok(write.details.some((d) => d.includes("configured=false")));
  }
});

test("concrete GSC rows produce high_impression_low_click_opportunities", () => {
  const opportunities = buildHighImpressionLowClickOpportunities({
    totalImpressions: 200,
    queryRows: [
      {
        key: "air purifier filter replacement",
        impressions: 14,
        clicks: 0,
        ctr: 0,
        average_position: 18,
      },
      {
        key: "already clicking",
        impressions: 30,
        clicks: 4,
        ctr: 4 / 30,
        average_position: 4,
      },
      {
        key: "too small",
        impressions: 4,
        clicks: 0,
        ctr: 0,
        average_position: 20,
      },
    ],
  });

  assert.notEqual(opportunities, "UNKNOWN");
  if (opportunities !== "UNKNOWN") {
    assert.deepEqual(opportunities.map((entry) => entry.key), ["air purifier filter replacement"]);
    assert.equal(opportunities[0]?.average_position, 18);
  }
});

test("aggregate totals alone do not create fake GSC opportunities", () => {
  const opportunities = buildHighImpressionLowClickOpportunities({
    totalImpressions: 200,
    queryRows: [],
  });

  assert.equal(opportunities, "UNKNOWN");
});

test("malformed or incomplete GSC row data keeps opportunities UNKNOWN", () => {
  const opportunities = buildHighImpressionLowClickOpportunities({
    totalImpressions: 200,
    queryRows: [
      {
        key: "below threshold",
        impressions: 2,
        clicks: 0,
        ctr: 0,
        average_position: "UNKNOWN",
      },
    ],
  });

  assert.equal(opportunities, "UNKNOWN");
});

test("tracked page slice builders distinguish FOUND, ZERO_IN_RANGE, QUERY_FAILED, and NOT_FETCHED", () => {
  const found = buildTrackedPageSliceFromFilteredRows({
    slug: "medify-ma50-rf",
    page_url: "https://buckparts.com/air-purifier/filter/medify-ma50-rf",
    rows: [
      {
        keys: ["https://buckparts.com/air-purifier/filter/medify-ma50-rf"],
        impressions: 14,
        clicks: 2,
        position: 18.4,
      },
    ],
  });
  assert.equal(found.match_status, "FOUND");
  assert.equal(found.impressions, 14);
  assert.equal(found.clicks, 2);

  const zero = buildTrackedPageSliceFromFilteredRows({
    slug: "levoit-rf-rar040",
    page_url: "https://buckparts.com/air-purifier/filter/levoit-rf-rar040",
    rows: [],
  });
  assert.equal(zero.match_status, "ZERO_IN_RANGE");
  assert.equal(zero.impressions, 0);
  assert.equal(zero.clicks, 0);

  const failed = buildQueryFailedTrackedPageSlice({
    slug: "coway-max2-hepa",
    page_url: "https://buckparts.com/air-purifier/filter/coway-max2-hepa",
  });
  assert.equal(failed.match_status, "QUERY_FAILED");
  assert.equal(failed.impressions, "UNKNOWN");

  const notFetched = buildNotFetchedTrackedPageSlice({
    slug: "medify-ma50-rf",
    page_url: "https://buckparts.com/air-purifier/filter/medify-ma50-rf",
  });
  assert.equal(notFetched.match_status, "NOT_FETCHED");
});

test("successful GSC fetch includes tracked_page_slices_v1 from exact-page filtered queries", async () => {
  const originalFetch = globalThis.fetch;
  const filteredUrls: string[] = [];
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url.includes("oauth2.googleapis.com/token")) {
      return {
        ok: true,
        status: 200,
        json: async () => ({ access_token: "test-access-token-value" }),
        text: async () => JSON.stringify({ access_token: "test-access-token-value" }),
      } as Response;
    }
    const body = init?.body ? JSON.parse(String(init.body)) : {};
    const filters = body.dimensionFilterGroups?.[0]?.filters;
    if (Array.isArray(filters) && filters[0]?.expression) {
      filteredUrls.push(String(filters[0].expression));
      const pageUrl = String(filters[0].expression);
      if (pageUrl.includes("levoit-rf-rar040")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            rows: [
              {
                keys: [pageUrl],
                impressions: 9,
                clicks: 1,
                position: 22.1,
              },
            ],
          }),
          text: async () => "",
        } as Response;
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({ rows: [] }),
        text: async () => "",
      } as Response;
    }
    return {
      ok: true,
      status: 200,
      json: async () => ({
        rows: [{ clicks: 5, impressions: 100, position: 10 }],
      }),
      text: async () => "",
    } as Response;
  }) as typeof fetch;

  try {
    const artifact = await buildGscSearchAnalyticsArtifact({
      now: new Date("2026-06-10T12:00:00.000Z"),
      env: {
        GSC_PROPERTY_SITE_URL: "sc-domain:buckparts.com",
        GSC_OAUTH_CLIENT_ID: "client-id",
        GSC_OAUTH_CLIENT_SECRET: "secret",
        GSC_OAUTH_REFRESH_TOKEN: "refresh",
        NEXT_PUBLIC_SITE_URL: "https://buckparts.com",
      },
    });
    assert.equal(artifact.status, "OK");
    assert.ok(artifact.tracked_page_slices_v1);
    assert.equal(artifact.tracked_page_slices_v1?.length, 3);
    assert.equal(filteredUrls.length, 3);
    const levoit = artifact.tracked_page_slices_v1?.find((s) => s.slug === "levoit-rf-rar040");
    assert.ok(levoit);
    assert.equal(levoit.match_status, "FOUND");
    assert.equal(levoit.impressions, 9);
    const medify = artifact.tracked_page_slices_v1?.find((s) => s.slug === "medify-ma50-rf");
    assert.ok(medify);
    assert.equal(medify.match_status, "ZERO_IN_RANGE");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
