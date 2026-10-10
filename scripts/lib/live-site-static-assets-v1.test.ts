import assert from "node:assert/strict";
import test from "node:test";

import {
  evaluateStaticAssetProbe,
  extractNextStaticAssetPathsFromHtml,
  LIVE_SITE_REPRESENTATIVE_PUBLIC_ASSET_PATHS_V1,
  probeNextStaticAssetsForHtmlPages,
  probeRepresentativePublicAssets,
  summarizeStaticAssetStatus,
} from "./live-site-static-assets-v1";

test("extractNextStaticAssetPathsFromHtml dedupes href and src references", () => {
  const html = `
    <link href="/_next/static/css/app.css" rel="stylesheet"/>
    <script src="/_next/static/chunks/main.js"></script>
    <script src="/_next/static/chunks/main.js"></script>
  `;
  assert.deepEqual(extractNextStaticAssetPathsFromHtml(html), [
    "/_next/static/chunks/main.js",
    "/_next/static/css/app.css",
  ]);
});

test("evaluateStaticAssetProbe flags HTML masquerading as JS", () => {
  const verdict = evaluateStaticAssetProbe({
    url_path: "/_next/static/chunks/main.js",
    status_code: 404,
    content_type: "text/html",
  });
  assert.equal(verdict.ok, false);
  assert.ok(verdict.failure_reasons.includes("http_404"));
  assert.ok(verdict.failure_reasons.includes("html_instead_of_asset"));
});

test("probeNextStaticAssetsForHtmlPages requires 2xx and correct MIME", async () => {
  const html = `<html><link href="/_next/static/css/app.css" rel="stylesheet"/><script src="/_next/static/chunks/a.js"></script></html>`;
  const fetchFn: typeof fetch = async (url: string) => {
    if (url.endsWith("/")) {
      return new Response(html, { status: 200, headers: { "content-type": "text/html" } });
    }
    if (url.includes("/_next/static/css/app.css")) {
      return new Response("body {}", { status: 200, headers: { "content-type": "text/css" } });
    }
    if (url.includes("/_next/static/chunks/a.js")) {
      return new Response("console.log(1)", {
        status: 200,
        headers: { "content-type": "application/javascript" },
      });
    }
    return new Response("missing", { status: 404, headers: { "content-type": "text/html" } });
  };

  const probes = await probeNextStaticAssetsForHtmlPages({
    fetchFn,
    baseUrl: "https://example.com",
    htmlPaths: ["/"],
  });
  assert.equal(probes.length, 2);
  assert.equal(summarizeStaticAssetStatus(probes), "OK");
});

test("probeRepresentativePublicAssets checks logo and fo-verify paths", async () => {
  const fetchFn: typeof fetch = async (url: string) => {
    if (url.endsWith("/buckparts-logo-black-transparent.png")) {
      return new Response(new Uint8Array([1, 2, 3]), {
        status: 200,
        headers: { "content-type": "image/png" },
      });
    }
    if (url.endsWith("/fo-verify.html")) {
      return new Response("<html></html>", {
        status: 200,
        headers: { "content-type": "text/html" },
      });
    }
    return new Response("missing", { status: 404, headers: { "content-type": "text/html" } });
  };
  const probes = await probeRepresentativePublicAssets({
    fetchFn,
    baseUrl: "https://example.com",
    paths: LIVE_SITE_REPRESENTATIVE_PUBLIC_ASSET_PATHS_V1,
  });
  assert.equal(probes.length, 2);
  assert.equal(summarizeStaticAssetStatus(probes), "OK");
});

test("summarizeStaticAssetStatus ATTENTION when any probe fails", () => {
  assert.equal(
    summarizeStaticAssetStatus([
      {
        url_path: "/_next/static/chunks/a.js",
        source_html_path: "/",
        status_code: 200,
        content_type: "application/javascript",
        ok: true,
        failure_reasons: [],
      },
      {
        url_path: "/_next/static/css/a.css",
        source_html_path: "/",
        status_code: 404,
        content_type: "text/html",
        ok: false,
        failure_reasons: ["http_404", "html_instead_of_asset"],
      },
    ]),
    "ATTENTION",
  );
});
