import assert from "node:assert/strict";
import test from "node:test";

import { runLiveSiteSmokeCheck } from "./live-site-smoke-check";
import {
  buildLiveSiteMonitorArtifact,
  LIVE_SITE_MONITOR_CONTRACT,
} from "./lib/live-site-smoke";
import {
  fixtureGoodWrongPartPreventionHtml,
  fixtureStaleWrongPartPreventionHtml,
} from "./lib/live-site-trust-page-content-contract-v1";

function productRouteFetchBody(url: string): string {
  if (url.endsWith("/fridge/lg-lfxs26973s") || url.endsWith("/filter/adq36006101")) {
    return `<html><script>__NEXT_DATA__</script>adq36006101 lg-lfxs26973s</html>`;
  }
  return `<!DOCTYPE html><html><script>__NEXT_DATA__</script></html>`;
}

function mockLiveFetch(options: { staleWrongPartPrevention?: boolean } = {}): typeof fetch {
  return async (url: string) => {
    if (url.includes("/wrong-part-prevention")) {
      return new Response(
        options.staleWrongPartPrevention
          ? fixtureStaleWrongPartPreventionHtml()
          : fixtureGoodWrongPartPreventionHtml(),
        { status: 200, headers: { "content-type": "text/html" } },
      );
    }
    return new Response(productRouteFetchBody(url), {
      status: 200,
      headers: { "content-type": "text/html" },
    });
  };
}

test("stale /wrong-part-prevention HTML fails content contract while route HTTP may still pass", async () => {
  const art = await buildLiveSiteMonitorArtifact({
    cwd: process.cwd(),
    fetchFn: mockLiveFetch({ staleWrongPartPrevention: true }),
    env: {
      LIVE_SITE_SMOKE_TARGET_URL: "https://buckparts.com",
      LIVE_SITE_DEPLOY_COMMIT: "e080f9c396facb2989fe4962d094cef4fb8ff8f5",
    },
    nowIso: "2026-05-28T12:00:00.000Z",
    source: "test",
    execSync: (cmd: string) => {
      if (cmd === "git rev-parse HEAD") return "localsha\n";
      if (cmd === "git rev-parse origin/main") return "e080f9c396facb2989fe4962d094cef4fb8ff8f5\n";
      throw new Error(cmd);
    },
  });

  assert.equal(art.contract, LIVE_SITE_MONITOR_CONTRACT);
  assert.equal(art.route_http_status, "OK");
  assert.equal(art.content_contract_status, "ATTENTION");
  assert.equal(art.runtime_status, "ATTENTION");
  assert.equal(art.deploy_sync_status, "MATCHES_ORIGIN_MAIN");
  const wpp = art.content_contracts.find((c) => c.path === "/wrong-part-prevention");
  assert.ok(wpp);
  assert.equal(wpp!.http_ok, true);
  assert.equal(wpp!.required_markers_ok, false);
  assert.equal(wpp!.banned_phrases_absent, false);
  assert.equal(wpp!.content_contract_ok, false);
  assert.ok(wpp!.banned_phrases_found.includes("structured data"));
  assert.ok(
    art.unknown_facts.some((f) => f.includes("LIVE_SITE_DEPLOY_COMMIT matches origin/main but trust content contract failed")),
  );
});

test("current homeowner /wrong-part-prevention copy passes content contract", async () => {
  const art = await buildLiveSiteMonitorArtifact({
    cwd: process.cwd(),
    fetchFn: mockLiveFetch({ staleWrongPartPrevention: false }),
    env: { NEXT_PUBLIC_SITE_URL: "https://buckparts.com" },
    nowIso: "2026-05-28T12:00:00.000Z",
    source: "test",
    execSync: () => {
      throw new Error("git");
    },
  });

  assert.equal(art.route_http_status, "OK");
  assert.equal(art.content_contract_status, "OK");
  assert.equal(art.runtime_status, "OK");
  const wpp = art.content_contracts.find((c) => c.path === "/wrong-part-prevention");
  assert.ok(wpp);
  assert.equal(wpp!.content_contract_ok, true);
  assert.deepEqual(wpp!.required_markers_missing, []);
  assert.deepEqual(wpp!.banned_phrases_found, []);
});

test("runLiveSiteSmokeCheck distinguishes route HTTP, content contract, and deploy sync", async () => {
  const art = await runLiveSiteSmokeCheck(process.cwd(), {
    env: { NEXT_PUBLIC_SITE_URL: "https://example.com" },
    loadEnvFn: () => {},
    nowIso: "2026-05-28T12:00:00.000Z",
    fetchFn: mockLiveFetch({ staleWrongPartPrevention: true }),
    execSync: () => {
      throw new Error("git");
    },
  });

  assert.equal(art.route_http_status, "OK");
  assert.equal(art.content_contract_status, "ATTENTION");
  assert.equal(art.runtime_status, "ATTENTION");
  assert.equal(art.deploy_sync_status, "UNKNOWN_DEPLOY_COMMIT");
  assert.equal(art.deployed_commit, "UNKNOWN");
});
