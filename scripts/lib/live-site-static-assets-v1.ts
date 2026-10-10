export type LiveSiteStaticAssetProbeV1 = {
  url_path: string;
  source_html_path: string;
  status_code: number | "UNKNOWN";
  content_type: string | "UNKNOWN";
  ok: boolean;
  failure_reasons: string[];
};

export type LiveSiteStaticAssetStatusV1 = "OK" | "ATTENTION" | "UNKNOWN_CONFIG";

/** Representative `public/` assets that must survive a correct Netlify Next deploy. */
export const LIVE_SITE_REPRESENTATIVE_PUBLIC_ASSET_PATHS_V1 = [
  "/buckparts-logo-black-transparent.png",
  "/fo-verify.html",
] as const;

const NEXT_STATIC_PATH_RE = /\/_next\/static\/[^\s"'<>]+/g;

/** Collect unique `/_next/static/...` paths referenced in HTML (href/src/preload). */
export function extractNextStaticAssetPathsFromHtml(html: string): string[] {
  const found = new Set<string>();
  for (const match of html.matchAll(NEXT_STATIC_PATH_RE)) {
    const raw = match[0];
    const withoutQuery = raw.split("?")[0]?.split("#")[0]?.trim();
    if (withoutQuery && withoutQuery.startsWith("/_next/static/")) {
      found.add(withoutQuery);
    }
  }
  return [...found].sort();
}

function normalizeContentType(value: string | null): string | "UNKNOWN" {
  if (!value) return "UNKNOWN";
  const t = value.split(";")[0]?.trim().toLowerCase();
  return t && t.length > 0 ? t : "UNKNOWN";
}

function expectedMimeForPath(path: string): string[] {
  if (path.includes("/_next/static/css/") || path.endsWith(".css")) {
    return ["text/css"];
  }
  if (path.endsWith(".js") || path.includes("/chunks/")) {
    return ["application/javascript", "text/javascript", "application/x-javascript"];
  }
  if (path.includes("/media/") && path.endsWith(".woff")) {
    return ["application/font-woff", "font/woff"];
  }
  if (path.includes("/media/") && path.endsWith(".woff2")) {
    return ["font/woff2", "application/font-woff2"];
  }
  return [];
}

export function evaluateStaticAssetProbe(args: {
  url_path: string;
  status_code: number | "UNKNOWN";
  content_type: string | "UNKNOWN";
}): { ok: boolean; failure_reasons: string[] } {
  const failure_reasons: string[] = [];
  if (args.status_code === "UNKNOWN") {
    failure_reasons.push("request_failed");
  } else if (args.status_code < 200 || args.status_code >= 300) {
    failure_reasons.push(`http_${args.status_code}`);
  }

  const ct = args.content_type;
  if (ct === "UNKNOWN") {
    failure_reasons.push("missing_content_type");
  } else if (ct.includes("text/html")) {
    failure_reasons.push("html_instead_of_asset");
  }

  const expected = expectedMimeForPath(args.url_path);
  if (expected.length > 0 && ct !== "UNKNOWN" && !expected.includes(ct)) {
    failure_reasons.push(`unexpected_content_type:${ct}`);
  }

  return { ok: failure_reasons.length === 0, failure_reasons };
}

export async function probeNextStaticAssetsForHtmlPages(args: {
  fetchFn: typeof fetch;
  baseUrl: string;
  htmlPaths: readonly string[];
  timeoutMs?: number;
}): Promise<LiveSiteStaticAssetProbeV1[]> {
  const timeoutMs = args.timeoutMs ?? 15_000;
  const base = args.baseUrl.replace(/\/+$/, "");
  const pathToAssets = new Map<string, string[]>();

  for (const htmlPath of args.htmlPaths) {
    const url = `${base}${htmlPath.startsWith("/") ? htmlPath : `/${htmlPath}`}`;
    try {
      const res = await args.fetchFn(url, {
        method: "GET",
        redirect: "follow",
        signal: AbortSignal.timeout(timeoutMs),
        headers: { Accept: "text/html,application/xhtml+xml" },
      });
      if (!res.ok) continue;
      const html = await res.text();
      pathToAssets.set(htmlPath, extractNextStaticAssetPathsFromHtml(html));
    } catch {
      pathToAssets.set(htmlPath, []);
    }
  }

  const uniquePaths = [...new Set([...pathToAssets.values()].flat())].sort();
  const probes: LiveSiteStaticAssetProbeV1[] = [];

  for (const assetPath of uniquePaths) {
    let source_html_path = "UNKNOWN";
    for (const [htmlPath, assets] of pathToAssets) {
      if (assets.includes(assetPath)) {
        source_html_path = htmlPath;
        break;
      }
    }

    const assetUrl = `${base}${assetPath}`;
    let status_code: number | "UNKNOWN" = "UNKNOWN";
    let content_type: string | "UNKNOWN" = "UNKNOWN";
    try {
      const res = await args.fetchFn(assetUrl, {
        method: "GET",
        redirect: "follow",
        signal: AbortSignal.timeout(timeoutMs),
        headers: { Accept: "*/*" },
      });
      status_code = res.status;
      content_type = normalizeContentType(res.headers.get("content-type"));
      // Drain body so connection can close; classification uses headers only.
      await res.arrayBuffer();
    } catch {
      status_code = "UNKNOWN";
    }

    const verdict = evaluateStaticAssetProbe({ url_path: assetPath, status_code, content_type });
    probes.push({
      url_path: assetPath,
      source_html_path,
      status_code,
      content_type,
      ok: verdict.ok,
      failure_reasons: verdict.failure_reasons,
    });
  }

  return probes;
}

export async function probeRepresentativePublicAssets(args: {
  fetchFn: typeof fetch;
  baseUrl: string;
  paths?: readonly string[];
  timeoutMs?: number;
}): Promise<LiveSiteStaticAssetProbeV1[]> {
  const timeoutMs = args.timeoutMs ?? 15_000;
  const base = args.baseUrl.replace(/\/+$/, "");
  const paths = args.paths ?? LIVE_SITE_REPRESENTATIVE_PUBLIC_ASSET_PATHS_V1;
  const probes: LiveSiteStaticAssetProbeV1[] = [];

  for (const assetPath of paths) {
    const assetUrl = `${base}${assetPath.startsWith("/") ? assetPath : `/${assetPath}`}`;
    let status_code: number | "UNKNOWN" = "UNKNOWN";
    let content_type: string | "UNKNOWN" = "UNKNOWN";
    try {
      const res = await args.fetchFn(assetUrl, {
        method: "GET",
        redirect: "follow",
        signal: AbortSignal.timeout(timeoutMs),
        headers: { Accept: "*/*" },
      });
      status_code = res.status;
      content_type = normalizeContentType(res.headers.get("content-type"));
      await res.arrayBuffer();
    } catch {
      status_code = "UNKNOWN";
    }

    const failure_reasons: string[] = [];
    if (status_code === "UNKNOWN") {
      failure_reasons.push("request_failed");
    } else if (status_code < 200 || status_code >= 300) {
      failure_reasons.push(`http_${status_code}`);
    }
    if (content_type === "UNKNOWN") {
      failure_reasons.push("missing_content_type");
    } else if (content_type.includes("text/html") && assetPath.endsWith(".png")) {
      failure_reasons.push("html_instead_of_asset");
    }

    probes.push({
      url_path: assetPath,
      source_html_path: "public_root",
      status_code,
      content_type,
      ok: failure_reasons.length === 0,
      failure_reasons,
    });
  }

  return probes;
}

export function summarizeStaticAssetStatus(
  probes: LiveSiteStaticAssetProbeV1[],
): LiveSiteStaticAssetStatusV1 {
  if (probes.length === 0) return "ATTENTION";
  return probes.every((p) => p.ok) ? "OK" : "ATTENTION";
}
