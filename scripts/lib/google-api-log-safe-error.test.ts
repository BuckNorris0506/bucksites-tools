import assert from "node:assert/strict";
import test from "node:test";

import {
  GoogleApiLogSafeError,
  formatGoogleApiLogSafeFacts,
  readGoogleApiLogSafeFacts,
  sanitizeLogSafeText,
} from "./google-api-log-safe-error";

test("readGoogleApiLogSafeFacts parses Google API error JSON", async () => {
  const response = new Response(
    JSON.stringify({
      error: {
        code: 403,
        message: "User does not have sufficient permission for site sc-domain:example.com.",
        status: "PERMISSION_DENIED",
        errors: [{ reason: "forbidden", message: "Forbidden" }],
      },
    }),
    { status: 403 },
  );

  const facts = await readGoogleApiLogSafeFacts(response, "gsc/searchAnalytics/query");
  assert.ok(facts.includes("endpoint=gsc/searchAnalytics/query"));
  assert.ok(facts.includes("http_status=403"));
  assert.ok(facts.includes("google_status=PERMISSION_DENIED"));
  assert.ok(facts.includes("google_code=403"));
  assert.ok(facts.includes("google_reason=forbidden"));
  assert.ok(facts.some((f) => f.startsWith("google_message=")));
});

test("sanitizeLogSafeText redacts token-like substrings", () => {
  const sanitized = sanitizeLogSafeText(
    "Bearer abcdefghijklmnopqrstuvwxyz access_token=secret-token refresh_token=refresh-token",
  );
  assert.equal(sanitized.includes("secret-token"), false);
  assert.equal(sanitized.includes("refresh-token"), false);
  assert.equal(sanitized.includes("abcdefghijklmnopqrstuvwxyz"), false);
  assert.ok(sanitized.includes("[REDACTED]"));
});

test("GoogleApiLogSafeError exposes logSafeFacts without raw body", () => {
  const facts = formatGoogleApiLogSafeFacts({
    endpoint_label: "oauth2/token",
    http_status: 401,
    google_status: "UNAUTHENTICATED",
    google_code: 401,
    google_reasons: ["invalid_grant"],
    google_message: "Token has been expired or revoked.",
  });
  const err = new GoogleApiLogSafeError(facts);
  assert.equal(err.logSafeFacts.includes("http_status=401"), true);
  assert.equal(`${err}`.includes("access_token"), false);
});
