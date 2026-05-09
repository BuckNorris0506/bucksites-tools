import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { runLiveSiteSmokeCheck } from "../live-site-smoke-check";
import {
  buildLiveSiteMonitorArtifact,
  computeDeploySyncStatus,
  LIVE_SITE_MONITOR_CONTRACT,
  probeLiveSiteRoute,
} from "./live-site-smoke";

test("computeDeploySyncStatus UNKNOWN when deployed missing", () => {
  assert.equal(
    computeDeploySyncStatus({ deployed_commit: "UNKNOWN", origin_main_commit: "abc" }),
    "UNKNOWN_DEPLOY_COMMIT",
  );
});

test("computeDeploySyncStatus UNKNOWN when origin missing", () => {
  assert.equal(
    computeDeploySyncStatus({ deployed_commit: "abc", origin_main_commit: "UNKNOWN" }),
    "UNKNOWN_DEPLOY_COMMIT",
  );
});

test("computeDeploySyncStatus MATCHES when both known and equal", () => {
  assert.equal(
    computeDeploySyncStatus({ deployed_commit: "deadbeef", origin_main_commit: "deadbeef" }),
    "MATCHES_ORIGIN_MAIN",
  );
});

test("computeDeploySyncStatus DIFFERS when both known and unequal", () => {
  assert.equal(
    computeDeploySyncStatus({ deployed_commit: "aaa", origin_main_commit: "bbb" }),
    "DEPLOYED_COMMIT_DIFFERS",
  );
});

test("buildLiveSiteMonitorArtifact UNKNOWN_CONFIG when NEXT_PUBLIC_SITE_URL missing", async () => {
  const art = await buildLiveSiteMonitorArtifact({
    cwd: process.cwd(),
    fetchFn: global.fetch,
    env: {},
    nowIso: "2026-05-09T12:00:00.000Z",
    source: "test",
    execSync: () => {
      throw new Error("no git");
    },
  });
  assert.equal(art.contract, LIVE_SITE_MONITOR_CONTRACT);
  assert.equal(art.runtime_status, "UNKNOWN_CONFIG");
  assert.equal(art.routes.length, 0);
  assert.equal(art.deploy_sync_status, "UNKNOWN_DEPLOY_COMMIT");
});

test("runLiveSiteSmokeCheck UNKNOWN_CONFIG when NEXT_PUBLIC_SITE_URL missing", async () => {
  const art = await runLiveSiteSmokeCheck(process.cwd(), {
    env: {},
    loadEnvFn: () => {},
    nowIso: "2026-05-09T12:00:00.000Z",
    execSync: () => {
      throw new Error("no git");
    },
  });
  assert.equal(art.contract, LIVE_SITE_MONITOR_CONTRACT);
  assert.equal(art.runtime_status, "UNKNOWN_CONFIG");
  assert.equal(art.target_base_url, "UNKNOWN");
  assert.equal(art.routes.length, 0);
  assert.equal(art.deployed_commit, "UNKNOWN");
});

test("runLiveSiteSmokeCheck does not write local live-site artifact", async () => {
  const tmpDir = mkdtempSync(path.join(os.tmpdir(), "buckparts-live-site-check-"));
  try {
    const artifactPath = path.join(tmpDir, "data/reports/buckparts-live-site-smoke.json");
    const art = await runLiveSiteSmokeCheck(tmpDir, {
      env: {
        NEXT_PUBLIC_SITE_URL: "https://example.com",
        LIVE_SITE_DEPLOY_COMMIT: "originsha",
      },
      loadEnvFn: () => {},
      nowIso: "2026-05-09T12:00:00.000Z",
      fetchFn: async (url: string) => {
        const body =
          url.endsWith("/fridge/lg-lfxs26973s") || url.endsWith("/filter/adq36006101")
            ? `<html><script>__NEXT_DATA__</script>adq36006101 lg-lfxs26973s</html>`
            : `<!DOCTYPE html><html><script>__NEXT_DATA__</script></html>`;
        return new Response(body, { status: 200, headers: { "content-type": "text/html" } });
      },
      execSync: (cmd: string) => {
        if (cmd === "git rev-parse HEAD") return "localsha\n";
        if (cmd === "git rev-parse origin/main") return "originsha\n";
        throw new Error(cmd);
      },
    });
    assert.equal(art.runtime_status, "OK");
    assert.equal(existsSync(artifactPath), false);
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
});

test("live-site smoke check command does not import artifact writer or Supabase upsert", () => {
  const source = readFileSync(path.resolve(process.cwd(), "scripts/live-site-smoke-check.ts"), "utf8");
  assert.equal(source.includes("writeFileSync"), false);
  assert.equal(source.includes("mkdirSync"), false);
  assert.equal(source.includes("writeOwnerArtifactToSupabase"), false);
  assert.equal(source.includes(".upsert("), false);
});

test("buildLiveSiteMonitorArtifact probes routes and never infers deployed from HEAD", async () => {
  const calls: string[] = [];
  const fetchFn = async (url: string) => {
    calls.push(url);
    const body =
      url.endsWith("/fridge/lg-lfxs26973s") || url.endsWith("/filter/adq36006101")
        ? `<html><script>__NEXT_DATA__</script>adq36006101 lg-lfxs26973s</html>`
        : `<!DOCTYPE html><html><script>__NEXT_DATA__</script></html>`;
    return new Response(body, { status: 200, headers: { "content-type": "text/html" } });
  };
  const art = await buildLiveSiteMonitorArtifact({
    cwd: process.cwd(),
    fetchFn,
    env: {
      NEXT_PUBLIC_SITE_URL: "https://example.com/",
      LIVE_SITE_DEPLOY_COMMIT: "originsha",
    },
    nowIso: "2026-05-09T12:00:00.000Z",
    source: "test",
    execSync: (cmd: string) => {
      if (cmd === "git rev-parse HEAD") return "localonly\n";
      if (cmd === "git rev-parse origin/main") return "originsha\n";
      throw new Error(cmd);
    },
  });
  assert.equal(art.runtime_status, "OK");
  assert.equal(art.target_base_url, "https://example.com");
  assert.equal(art.routes.length, 3);
  assert.ok(art.routes.every((r) => r.ok));
  assert.equal(art.deployed_commit, "originsha");
  assert.equal(art.local_head_commit, "localonly");
  assert.equal(art.origin_main_commit, "originsha");
  assert.equal(art.deploy_sync_status, "MATCHES_ORIGIN_MAIN");
  assert.ok(calls.every((u) => u.startsWith("https://example.com")));
});

test("runLiveSiteSmokeCheck does not infer deployed commit from local HEAD", async () => {
  const art = await runLiveSiteSmokeCheck(process.cwd(), {
    env: { NEXT_PUBLIC_SITE_URL: "https://example.com/" },
    loadEnvFn: () => {},
    nowIso: "2026-05-09T12:00:00.000Z",
    fetchFn: async () =>
      new Response(`<!DOCTYPE html><html><script>__NEXT_DATA__</script>adq36006101 lg-lfxs26973s</html>`, {
        status: 200,
      }),
    execSync: (cmd: string) => {
      if (cmd === "git rev-parse HEAD") return "localonly\n";
      if (cmd === "git rev-parse origin/main") return "originsha\n";
      throw new Error(cmd);
    },
  });
  assert.equal(art.local_head_commit, "localonly");
  assert.equal(art.origin_main_commit, "originsha");
  assert.equal(art.deployed_commit, "UNKNOWN");
  assert.equal(art.deploy_sync_status, "UNKNOWN_DEPLOY_COMMIT");
});

test("buildLiveSiteMonitorArtifact route failure yields ATTENTION artifact", async () => {
  const fetchFn = async (url: string) => {
    if (url.endsWith("/filter/adq36006101")) {
      return new Response("missing", { status: 404 });
    }
    return new Response(`<!DOCTYPE html><html><script>__NEXT_DATA__</script>adq36006101</html>`, { status: 200 });
  };
  const art = await buildLiveSiteMonitorArtifact({
    cwd: process.cwd(),
    fetchFn,
    env: { NEXT_PUBLIC_SITE_URL: "https://x.test" },
    nowIso: "2026-05-09T12:00:00.000Z",
    source: "test",
    execSync: () => {
      throw new Error("git");
    },
  });
  assert.equal(art.runtime_status, "ATTENTION");
  const f = art.routes.find((r) => r.path === "/filter/adq36006101");
  assert.ok(f);
  assert.equal(f!.ok, false);
});

test("runLiveSiteSmokeCheck represents route failure honestly", async () => {
  const art = await runLiveSiteSmokeCheck(process.cwd(), {
    env: { NEXT_PUBLIC_SITE_URL: "https://example.com" },
    loadEnvFn: () => {},
    nowIso: "2026-05-09T12:00:00.000Z",
    fetchFn: async (url: string) => {
      if (url.endsWith("/fridge/lg-lfxs26973s")) {
        return new Response("server error", { status: 503 });
      }
      return new Response(`<!DOCTYPE html><html><script>__NEXT_DATA__</script>adq36006101</html>`, { status: 200 });
    },
    execSync: () => {
      throw new Error("git");
    },
  });
  assert.equal(art.runtime_status, "ATTENTION");
  const route = art.routes.find((r) => r.path === "/fridge/lg-lfxs26973s");
  assert.ok(route);
  assert.equal(route!.ok, false);
  assert.equal(route!.status_code, 503);
  assert.ok(art.unknown_facts.some((fact) => fact.includes("One or more routes failed HTTP ok check")));
});

test("probeLiveSiteRoute marks UNKNOWN on throw", async () => {
  const r = await probeLiveSiteRoute({
    fetchFn: async () => {
      throw new Error("net");
    },
    baseUrl: "https://x",
    path: "/",
  });
  assert.equal(r.status_code, "UNKNOWN");
  assert.equal(r.marker_found, "UNKNOWN");
  assert.equal(r.ok, false);
});
