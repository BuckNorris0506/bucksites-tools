import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import { setMonitoringClientForTests } from "@/lib/monitoring/error-monitoring";
import { GET } from "./route";

const TOKEN = "owner-proof-token-for-test";
const ROUTE_SOURCE = join(process.cwd(), "src/app/api/owner/sentry-proof/route.ts");

function requestWithToken(token?: string): Request {
  const headers = new Headers();
  if (token) headers.set("x-buckparts-owner-proof", token);
  return new Request("https://buckparts.com/api/owner/sentry-proof?secret=do-not-capture", {
    headers,
  });
}

function withEnv<T>(env: Record<string, string | undefined>, fn: () => Promise<T>): Promise<T> {
  const previous = new Map<string, string | undefined>();
  for (const key of Object.keys(env)) {
    previous.set(key, process.env[key]);
    const value = env[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  return fn().finally(() => {
    for (const [key, value] of previous.entries()) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });
}

test("Sentry proof route returns 404 when owner header is missing", async () => {
  await withEnv({ BUCKPARTS_OWNER_PROOF_TOKEN: TOKEN }, async () => {
    const res = await GET(requestWithToken());
    assert.equal(res.status, 404);
    assert.equal(await res.text(), '{"error":"not_found"}');
  });
});

test("Sentry proof route is explicitly dynamic", () => {
  const src = readFileSync(ROUTE_SOURCE, "utf8");
  assert.match(src, /export const dynamic = "force-dynamic";/);
  assert.match(src, /evaluate the owner header\/env token on every request/);
});

test("Sentry proof route returns 404 when owner header is wrong", async () => {
  await withEnv({ BUCKPARTS_OWNER_PROOF_TOKEN: TOKEN }, async () => {
    const res = await GET(requestWithToken("wrong-token"));
    assert.equal(res.status, 404);
    assert.equal((await res.text()).includes(TOKEN), false);
  });
});

test("Sentry proof route returns 404 when env token is missing", async () => {
  await withEnv({ BUCKPARTS_OWNER_PROOF_TOKEN: undefined }, async () => {
    const res = await GET(requestWithToken(TOKEN));
    assert.equal(res.status, 404);
    assert.equal((await res.text()).includes(TOKEN), false);
  });
});

test("Sentry proof route captures sanitized monitoring message for valid token", async () => {
  const calls: Array<{ message: string; context: unknown }> = [];
  const restore = setMonitoringClientForTests({
    captureException: () => {},
    captureMessage: (message, context) => {
      calls.push({ message, context });
    },
  });
  try {
    await withEnv(
      {
        BUCKPARTS_OWNER_PROOF_TOKEN: TOKEN,
        SENTRY_DSN: "https://example.invalid/1",
        SENTRY_ENVIRONMENT: "production",
        NODE_ENV: "test",
      },
      async () => {
        const res = await GET(requestWithToken(TOKEN));
        assert.equal(res.status, 200);
        const body = await res.json();
        assert.deepEqual(body, {
          ok: true,
          message: "sentry proof capture attempted",
          monitoring_configured: true,
          capture_attempted: true,
          client_source: "test",
        });
        assert.equal(JSON.stringify(body).includes(TOKEN), false);
      },
    );

    assert.deepEqual(calls, [
      {
        message: "buckparts_sentry_proof_v1",
        context: {
          level: "info",
          tags: { area: "sentry_proof" },
          extra: {
            area: "sentry_proof",
            route: "/api/owner/sentry-proof",
            proof_version: "v1",
            environment: "production",
          },
        },
      },
    ]);
  } finally {
    restore();
  }
});

test("Sentry proof route does not include token in successful response", async () => {
  const restore = setMonitoringClientForTests({
    captureException: () => {},
    captureMessage: () => {},
  });
  try {
    await withEnv(
      {
        BUCKPARTS_OWNER_PROOF_TOKEN: TOKEN,
        SENTRY_DSN: "https://example.invalid/1",
      },
      async () => {
        const res = await GET(requestWithToken(TOKEN));
        const text = await res.text();
        assert.equal(res.status, 200);
        assert.equal(text.includes(TOKEN), false);
        assert.equal(text.includes("SENTRY_DSN"), false);
      },
    );
  } finally {
    restore();
  }
});
