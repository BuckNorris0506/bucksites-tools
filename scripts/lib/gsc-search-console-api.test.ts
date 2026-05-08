import assert from "node:assert/strict";
import test from "node:test";

import { createSearchConsoleClientFromEnv } from "./gsc-search-console-api";

test("missing env vars return UNKNOWN_CONFIG without secrets", () => {
  const result = createSearchConsoleClientFromEnv({
    env: {
      GSC_PROPERTY_SITE_URL: "",
      GSC_SERVICE_ACCOUNT_JSON: '{"private_key":"SECRET","client_email":"x@example.com","token_uri":"https://oauth2.googleapis.com/token"}',
    },
  });
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.status, "UNKNOWN_CONFIG");
  const flattened = `${result.reason} ${result.log_safe_details.join(" ")}`;
  assert.equal(flattened.includes("SECRET"), false);
});

test("oauth env complete selects oauth_refresh_token mode", () => {
  const result = createSearchConsoleClientFromEnv({
    env: {
      GSC_PROPERTY_SITE_URL: "sc-domain:buckparts.com",
      GSC_OAUTH_CLIENT_ID: "client-id",
      GSC_OAUTH_CLIENT_SECRET: "client-secret",
      GSC_OAUTH_REFRESH_TOKEN: "refresh-token",
    },
    fetchImpl: (async () =>
      ({
        ok: true,
        json: async () => ({ access_token: "token" }),
      }) as Response) as typeof fetch,
  });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.auth_mode, "oauth_refresh_token");
});

test("oauth env partial returns UNKNOWN_CONFIG with missing vars listed", () => {
  const result = createSearchConsoleClientFromEnv({
    env: {
      GSC_PROPERTY_SITE_URL: "sc-domain:buckparts.com",
      GSC_OAUTH_CLIENT_ID: "client-id",
      GSC_OAUTH_CLIENT_SECRET: "",
      GSC_OAUTH_REFRESH_TOKEN: "refresh-token",
    },
  });
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.status, "UNKNOWN_CONFIG");
  assert.equal(result.log_safe_details.some((d) => d.includes("GSC_OAUTH_CLIENT_SECRET")), true);
});

test("service-account env still works when oauth vars absent", () => {
  const result = createSearchConsoleClientFromEnv({
    env: {
      GSC_PROPERTY_SITE_URL: "sc-domain:buckparts.com",
      GSC_SERVICE_ACCOUNT_JSON:
        '{"client_email":"x@example.com","private_key":"-----BEGIN PRIVATE KEY-----\\\\nabc\\\\n-----END PRIVATE KEY-----\\\\n","token_uri":"https://oauth2.googleapis.com/token"}',
    },
  });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.auth_mode, "env_json");
});

test("missing all auth vars returns UNKNOWN_CONFIG", () => {
  const result = createSearchConsoleClientFromEnv({
    env: {
      GSC_PROPERTY_SITE_URL: "sc-domain:buckparts.com",
      GSC_OAUTH_CLIENT_ID: "",
      GSC_OAUTH_CLIENT_SECRET: "",
      GSC_OAUTH_REFRESH_TOKEN: "",
      GSC_SERVICE_ACCOUNT_JSON: "",
      GSC_SERVICE_ACCOUNT_KEY_PATH: "",
    },
  });
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.status, "UNKNOWN_CONFIG");
});
