import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import {
  captureMonitoringException,
  captureMonitoringMessageAsync,
  captureMonitoringMessage,
  isMonitoringConfigured,
  setMonitoringClientLoaderForTests,
  setMonitoringClientForTests,
  toSafeMonitoringMetadata,
} from "@/lib/monitoring/error-monitoring";

const MONITORING_HELPER_SOURCE = join(process.cwd(), "src/lib/monitoring/error-monitoring.ts");
const NEXT_CONFIG_SOURCE = join(process.cwd(), "next.config.mjs");

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

test("route-facing monitoring helper does not import Sentry package", () => {
  const src = readFileSync(MONITORING_HELPER_SOURCE, "utf8");
  assert.equal(src.includes("@sentry/nextjs"), false);
});

test("Next config enables instrumentation hook for server monitoring registration", () => {
  const src = readFileSync(NEXT_CONFIG_SOURCE, "utf8");
  assert.match(src, /instrumentationHook:\s*true/);
  assert.match(src, /import\s+\{\s*withSentryConfig\s*\}\s+from\s+"@sentry\/nextjs"/);
  assert.match(src, /export\s+default\s+withSentryConfig\(nextConfig,\s*\{\s*silent:\s*!process\.env\.CI\s*\}\)/);
});

test("async capture reports dynamic_import client source when no test/global client exists", async () => {
  const previousGlobal = globalThis.__buckpartsMonitoringClient;
  delete globalThis.__buckpartsMonitoringClient;
  const seen: unknown[] = [];
  const restore = setMonitoringClientLoaderForTests(async () => ({
    captureException: () => {},
    captureMessage: (_message, context) => {
      seen.push(context);
    },
  }));
  try {
    const result = await captureMonitoringMessageAsync("proof", {
      area: "test",
      env: { SENTRY_DSN: "https://example.invalid/1" },
      metadata: { target_url: "https://www.amazon.com/dp/B00TEST?tag=secret" },
    });

    assert.deepEqual(result, {
      monitoring_configured: true,
      capture_attempted: true,
      client_source: "dynamic_import",
    });
    assert.deepEqual(seen, [
      {
        level: "warning",
        tags: { area: "test" },
        extra: { target_url: "https://www.amazon.com/dp/B00TEST" },
      },
    ]);
  } finally {
    restore();
    globalThis.__buckpartsMonitoringClient = previousGlobal;
  }
});

test("async capture reports none when configured but no monitoring client is registered", async () => {
  const previousGlobal = globalThis.__buckpartsMonitoringClient;
  delete globalThis.__buckpartsMonitoringClient;
  try {
    const result = await captureMonitoringMessageAsync("proof", {
      area: "test",
      env: { SENTRY_DSN: "https://example.invalid/1" },
    });

    assert.deepEqual(result, {
      monitoring_configured: true,
      capture_attempted: true,
      client_source: "none",
    });
  } finally {
    globalThis.__buckpartsMonitoringClient = previousGlobal;
  }
});

test("async capture reports global client source before dynamic import", async () => {
  const previousGlobal = globalThis.__buckpartsMonitoringClient;
  let dynamicImportCalls = 0;
  const seen: unknown[] = [];
  globalThis.__buckpartsMonitoringClient = {
    captureException: () => {},
    captureMessage: (_message, context) => {
      seen.push(context);
    },
  };
  const restore = setMonitoringClientLoaderForTests(async () => {
    dynamicImportCalls += 1;
    return null;
  });
  try {
    const result = await captureMonitoringMessageAsync("proof", {
      area: "test",
      env: { SENTRY_DSN: "https://example.invalid/1" },
    });

    assert.equal(result.client_source, "global");
    assert.equal(dynamicImportCalls, 0);
    assert.equal(seen.length, 1);
  } finally {
    restore();
    globalThis.__buckpartsMonitoringClient = previousGlobal;
  }
});
