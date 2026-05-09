import type {
  LiveSiteMonitorDeploySyncStatusV1,
  LiveSiteMonitorV1,
  LiveSiteSmokeRouteResultV1,
} from "./buckparts-command-center-v2-types";

export const LIVE_SITE_MONITOR_CONTRACT = "live_site_monitor_v1" as const;

export const LIVE_SITE_SMOKE_ALLOWLISTED_PATHS = ["/", "/filter/adq36006101", "/fridge/lg-lfxs26973s"] as const;

export type GitResolveResult = {
  local_head_commit: string | "UNKNOWN";
  origin_main_commit: string | "UNKNOWN";
};

export function trimSiteBaseUrl(raw: string | undefined): string | null {
  if (typeof raw !== "string") return null;
  const t = raw.trim();
  if (t.length === 0) return null;
  return t.replace(/\/+$/, "");
}

export function computeDeploySyncStatus(args: {
  deployed_commit: string | "UNKNOWN";
  origin_main_commit: string | "UNKNOWN";
}): LiveSiteMonitorDeploySyncStatusV1 {
  const d = args.deployed_commit;
  const o = args.origin_main_commit;
  if (d === "UNKNOWN" || o === "UNKNOWN") return "UNKNOWN_DEPLOY_COMMIT";
  if (d.trim() === o.trim()) return "MATCHES_ORIGIN_MAIN";
  return "DEPLOYED_COMMIT_DIFFERS";
}

function markerForPath(path: string, bodyLower: string): boolean | "UNKNOWN" {
  if (path === "/") {
    return bodyLower.includes("__next_data__");
  }
  if (path === "/filter/adq36006101") {
    return bodyLower.includes("adq36006101");
  }
  if (path === "/fridge/lg-lfxs26973s") {
    return bodyLower.includes("lg-lfxs26973s");
  }
  return "UNKNOWN";
}

export async function probeLiveSiteRoute(args: {
  fetchFn: typeof fetch;
  baseUrl: string;
  path: string;
  timeoutMs?: number;
}): Promise<LiveSiteSmokeRouteResultV1> {
  const timeoutMs = args.timeoutMs ?? 15_000;
  const url = `${args.baseUrl.replace(/\/+$/, "")}${args.path.startsWith("/") ? args.path : `/${args.path}`}`;
  const t0 = Date.now();
  try {
    const res = await args.fetchFn(url, {
      method: "GET",
      redirect: "follow",
      signal: AbortSignal.timeout(timeoutMs),
      headers: { Accept: "text/html,application/xhtml+xml" },
    });
    const latency = Date.now() - t0;
    const status = res.status;
    const text = await res.text();
    const lower = text.toLowerCase();
    const marker = markerForPath(args.path, lower);
    const ok = status >= 200 && status < 400;
    return {
      path: args.path,
      status_code: status,
      ok,
      latency_ms: latency,
      marker_found: marker,
    };
  } catch {
    return {
      path: args.path,
      status_code: "UNKNOWN",
      ok: false,
      latency_ms: "UNKNOWN",
      marker_found: "UNKNOWN",
    };
  }
}

export function resolveGitCommitsSync(args: {
  cwd: string;
  execSync: (cmd: string, o: { cwd: string; encoding: "utf8" }) => string;
}): GitResolveResult {
  let local_head_commit: string | "UNKNOWN" = "UNKNOWN";
  let origin_main_commit: string | "UNKNOWN" = "UNKNOWN";
  try {
    local_head_commit = args.execSync("git rev-parse HEAD", { cwd: args.cwd, encoding: "utf8" }).trim();
  } catch {
    local_head_commit = "UNKNOWN";
  }
  try {
    origin_main_commit = args
      .execSync("git rev-parse origin/main", { cwd: args.cwd, encoding: "utf8" })
      .trim();
  } catch {
    origin_main_commit = "UNKNOWN";
  }
  return { local_head_commit, origin_main_commit };
}

export function isLiveSiteMonitorV1(value: unknown): value is LiveSiteMonitorV1 {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const o = value as Record<string, unknown>;
  return (
    o.contract === LIVE_SITE_MONITOR_CONTRACT &&
    typeof o.checked_at === "string" &&
    typeof o.target_base_url === "string" &&
    Array.isArray(o.routes)
  );
}

export async function buildLiveSiteMonitorArtifact(args: {
  cwd: string;
  fetchFn: typeof fetch;
  env: NodeJS.ProcessEnv;
  nowIso: string;
  source: string;
  execSync: (cmd: string, o: { cwd: string; encoding: "utf8" }) => string;
}): Promise<LiveSiteMonitorV1> {
  const base = trimSiteBaseUrl(args.env.NEXT_PUBLIC_SITE_URL);
  const unknownFactsBase = [
    "Live-site smoke uses outbound GET only — it does not trigger Netlify deploys or call Netlify APIs.",
    "deployed_commit is never inferred from local HEAD; set LIVE_SITE_DEPLOY_COMMIT only when operator-proven.",
    "Route markers are minimal HTML substring checks — false negatives remain possible.",
  ];
  const provenFacts: string[] = [];

  if (!base) {
    return {
      contract: LIVE_SITE_MONITOR_CONTRACT,
      checked_at: args.nowIso,
      source: args.source,
      target_base_url: "UNKNOWN",
      runtime_status: "UNKNOWN_CONFIG",
      routes: [],
      local_head_commit: "UNKNOWN",
      origin_main_commit: "UNKNOWN",
      deployed_commit: "UNKNOWN",
      deploy_sync_status: "UNKNOWN_DEPLOY_COMMIT",
      proven_facts: ["NEXT_PUBLIC_SITE_URL is missing or empty after trim — smoke checks were not run."],
      unknown_facts: [
        ...unknownFactsBase,
        "UNKNOWN_CONFIG: set NEXT_PUBLIC_SITE_URL to the production origin (no trailing slash) before running smoke.",
      ],
    };
  }

  provenFacts.push(`Target base URL: ${base}.`);
  provenFacts.push(`Allowlisted paths: ${LIVE_SITE_SMOKE_ALLOWLISTED_PATHS.join(", ")}.`);

  const routes: LiveSiteSmokeRouteResultV1[] = [];
  for (const p of LIVE_SITE_SMOKE_ALLOWLISTED_PATHS) {
    routes.push(await probeLiveSiteRoute({ fetchFn: args.fetchFn, baseUrl: base, path: p }));
  }

  const git = resolveGitCommitsSync({ cwd: args.cwd, execSync: args.execSync });
  const deployedRaw = (args.env.LIVE_SITE_DEPLOY_COMMIT ?? "").trim();
  const deployed_commit: string | "UNKNOWN" = deployedRaw.length > 0 ? deployedRaw : "UNKNOWN";

  const deploy_sync_status = computeDeploySyncStatus({
    deployed_commit,
    origin_main_commit: git.origin_main_commit,
  });

  const allHttpOk = routes.every((r) => r.ok && typeof r.status_code === "number" && r.status_code < 400);
  const anyServerError = routes.some(
    (r) => typeof r.status_code === "number" && r.status_code >= 500,
  );
  const runtime_status: LiveSiteMonitorV1["runtime_status"] = allHttpOk ? "OK" : "ATTENTION";

  provenFacts.push(
    `Recorded ${routes.length} GET probes at checked_at=${args.nowIso}; all_http_ok=${String(allHttpOk)}.`,
  );
  if (git.local_head_commit !== "UNKNOWN") {
    provenFacts.push(`local HEAD (git rev-parse): ${git.local_head_commit}.`);
  }
  if (git.origin_main_commit !== "UNKNOWN") {
    provenFacts.push(`origin/main (git rev-parse): ${git.origin_main_commit}.`);
  }
  if (deployed_commit !== "UNKNOWN") {
    provenFacts.push(`deployed_commit from LIVE_SITE_DEPLOY_COMMIT: ${deployed_commit}.`);
  } else {
    provenFacts.push("deployed_commit: UNKNOWN (LIVE_SITE_DEPLOY_COMMIT not set).");
  }
  provenFacts.push(`deploy_sync_status=${deploy_sync_status}.`);

  const unknown_facts = [...unknownFactsBase];
  if (deployed_commit === "UNKNOWN") {
    unknown_facts.push("Deploy sync cannot be proven against production without LIVE_SITE_DEPLOY_COMMIT or other proven deploy SHA source.");
  }
  if (!allHttpOk) {
    unknown_facts.push(
      `One or more routes failed HTTP ok check or threw; anyServerError=${String(anyServerError)} — investigate before assuming site-wide outage.`,
    );
  }
  if (anyServerError) {
    unknown_facts.push("At least one route returned HTTP 5xx — treat as high-severity until cleared.");
  }

  return {
    contract: LIVE_SITE_MONITOR_CONTRACT,
    checked_at: args.nowIso,
    source: args.source,
    target_base_url: base,
    runtime_status,
    routes,
    local_head_commit: git.local_head_commit,
    origin_main_commit: git.origin_main_commit,
    deployed_commit,
    deploy_sync_status,
    proven_facts: provenFacts,
    unknown_facts,
  };
}
