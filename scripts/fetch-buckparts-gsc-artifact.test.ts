import assert from "node:assert/strict";
import test from "node:test";

import { buildGscSearchAnalyticsArtifact } from "./fetch-buckparts-gsc-artifact";

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
