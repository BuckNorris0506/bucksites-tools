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
