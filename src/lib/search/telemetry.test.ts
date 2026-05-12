import assert from "node:assert/strict";
import test from "node:test";

import { setMonitoringClientForTests } from "@/lib/monitoring/error-monitoring";
import { logSearchTelemetry } from "@/lib/search/telemetry";

test("search telemetry failure is monitored and does not throw to user flow", async () => {
  const previousDsn = process.env.SENTRY_DSN;
  const previousUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const previousAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  process.env.SENTRY_DSN = "https://example.invalid/1";
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const contexts: unknown[] = [];
  const restore = setMonitoringClientForTests({
    captureException: (_error, context) => {
      contexts.push(context);
    },
    captureMessage: () => {},
  });

  try {
    await assert.doesNotReject(() =>
      logSearchTelemetry({
        rawQuery: "levoit lap",
        resultsCount: 0,
        catalog: "all_catalogs",
      }),
    );

    assert.equal(contexts.length, 1);
    assert.deepEqual(contexts[0], {
      tags: { area: "search_telemetry_event_insert" },
      extra: {
        catalog: "all_catalogs",
        normalized_query: "levoitlap",
        results_count: 0,
      },
    });
  } finally {
    restore();
    if (previousDsn == null) delete process.env.SENTRY_DSN;
    else process.env.SENTRY_DSN = previousDsn;
    if (previousUrl == null) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    else process.env.NEXT_PUBLIC_SUPABASE_URL = previousUrl;
    if (previousAnon == null) delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    else process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = previousAnon;
  }
});
