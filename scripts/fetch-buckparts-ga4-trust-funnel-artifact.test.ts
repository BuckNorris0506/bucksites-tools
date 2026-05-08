import assert from "node:assert/strict";
import test from "node:test";

import { buildGa4TrustFunnelArtifact } from "./fetch-buckparts-ga4-trust-funnel-artifact";

test("missing ga4 env returns UNKNOWN_CONFIG artifact", async () => {
  const artifact = await buildGa4TrustFunnelArtifact({
    env: {
      GA4_PROPERTY_ID: "",
      GA4_OAUTH_CLIENT_ID: "",
      GA4_OAUTH_CLIENT_SECRET: "",
      GA4_OAUTH_REFRESH_TOKEN: "",
    },
  });
  assert.equal(artifact.status, "UNKNOWN_CONFIG");
  assert.equal(artifact.event_totals, "UNKNOWN");
  assert.equal(artifact.rates, "UNKNOWN");
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
    const artifact = await buildGa4TrustFunnelArtifact({
      env: {
        GA4_PROPERTY_ID: "123456789",
        GA4_OAUTH_CLIENT_ID: "client-id",
        GA4_OAUTH_CLIENT_SECRET: "secret-value",
        GA4_OAUTH_REFRESH_TOKEN: "refresh-value",
      },
    });
    assert.equal(artifact.status, "UNKNOWN_API_ERROR");
    const flattened = `${artifact.proven_facts.join(" ")} ${artifact.unknown_facts.join(" ")}`;
    assert.equal(flattened.includes("secret-value"), false);
    assert.equal(flattened.includes("refresh-value"), false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

