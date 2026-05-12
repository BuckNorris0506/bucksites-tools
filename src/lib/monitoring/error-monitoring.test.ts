import assert from "node:assert/strict";
import test from "node:test";

import {
  captureMonitoringException,
  captureMonitoringMessage,
  isMonitoringConfigured,
  setMonitoringClientForTests,
  toSafeMonitoringMetadata,
} from "@/lib/monitoring/error-monitoring";

test("monitoring is disabled when Sentry env is absent", () => {
  assert.equal(isMonitoringConfigured({}), false);
  assert.equal(isMonitoringConfigured({ SENTRY_DSN: "https://example.invalid/1" }), true);
});

test("monitoring metadata redacts secret-like fields and URL query strings", () => {
  const safe = toSafeMonitoringMetadata({
    target_url: "https://www.amazon.com/dp/B00TEST123?tag=secret-tag&session=abc#reviews",
    authorization: "Bearer should-not-appear",
    service_role_key: "should-not-appear",
    message: "plain message",
    headers: { cookie: "x" },
  });

  assert.equal(safe.target_url, "https://www.amazon.com/dp/B00TEST123");
  assert.equal(safe.authorization, "[REDACTED]");
  assert.equal(safe.service_role_key, "[REDACTED]");
  assert.equal(safe.message, "plain message");
  assert.equal(safe.headers, "[REDACTED_OBJECT]");
});

test("capture helpers no-op when monitoring is not configured", () => {
  let calls = 0;
  const restore = setMonitoringClientForTests({
    captureException: () => {
      calls += 1;
    },
    captureMessage: () => {
      calls += 1;
    },
  });
  try {
    captureMonitoringException(new Error("x"), { area: "test", env: {} });
    captureMonitoringMessage("x", { area: "test", env: {} });
    assert.equal(calls, 0);
  } finally {
    restore();
  }
});

test("capture helper sends only sanitized metadata when configured", () => {
  const seen: unknown[] = [];
  const restore = setMonitoringClientForTests({
    captureException: (_error, context) => {
      seen.push(context);
    },
    captureMessage: (_message, context) => {
      seen.push(context);
    },
  });
  try {
    captureMonitoringException(new Error("boom"), {
      area: "go",
      env: { SENTRY_DSN: "https://example.invalid/1" },
      metadata: {
        affiliate_url: "https://www.amazon.com/dp/B00TEST123?tag=secret-tag",
        anon_key: "should-not-appear",
      },
    });
    assert.equal(seen.length, 1);
    assert.deepEqual(seen[0], {
      tags: { area: "go" },
      extra: {
        affiliate_url: "https://www.amazon.com/dp/B00TEST123",
        anon_key: "[REDACTED]",
      },
    });
  } finally {
    restore();
  }
});
