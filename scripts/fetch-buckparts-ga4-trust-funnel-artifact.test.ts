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
      json: async () => ({ error: "invalid_grant", error_description: "Token has been expired or revoked." }),
      text: async () =>
        JSON.stringify({ error: "invalid_grant", error_description: "Token has been expired or revoked." }),
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
    assert.equal(flattened.includes("access_token"), false);
    assert.ok(artifact.unknown_facts.some((f) => f.includes("http_status=400")));
    assert.ok(artifact.unknown_facts.some((f) => f.includes("google_reason=invalid_grant")));
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("runReport non-OK response returns UNKNOWN_API_ERROR with log-safe Google diagnostics", async () => {
  const originalFetch = globalThis.fetch;
  const googleErrorBody = JSON.stringify({
    error: {
      code: 403,
      message: "User does not have sufficient permissions for this property.",
      status: "PERMISSION_DENIED",
      errors: [{ reason: "forbidden" }],
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
    const artifact = await buildGa4TrustFunnelArtifact({
      env: {
        GA4_PROPERTY_ID: "123456789",
        GA4_OAUTH_CLIENT_ID: "client-id",
        GA4_OAUTH_CLIENT_SECRET: "secret-value",
        GA4_OAUTH_REFRESH_TOKEN: "refresh-value",
      },
    });
    assert.equal(artifact.status, "UNKNOWN_API_ERROR");
    assert.ok(artifact.unknown_facts.some((f) => f.includes("http_status=403")));
    assert.ok(artifact.unknown_facts.some((f) => f.includes("google_status=PERMISSION_DENIED")));
    assert.ok(artifact.unknown_facts.some((f) => f.includes("google_reason=forbidden")));
    assert.ok(artifact.unknown_facts.some((f) => f.startsWith("google_message=")));
    const flattened = `${artifact.proven_facts.join(" ")} ${artifact.unknown_facts.join(" ")}`;
    assert.equal(flattened.includes("test-access-token-value"), false);
    assert.equal(flattened.includes("secret-value"), false);
    assert.equal(flattened.includes("refresh-value"), false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

