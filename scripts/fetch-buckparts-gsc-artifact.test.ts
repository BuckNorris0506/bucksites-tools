import assert from "node:assert/strict";
import test from "node:test";

import { buildGscSearchAnalyticsArtifact } from "./fetch-buckparts-gsc-artifact";
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
      json: async () => ({ error: "invalid_grant" }),
      text: async () => "invalid_grant",
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
