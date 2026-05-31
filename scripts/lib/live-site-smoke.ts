import type {
  LiveSiteMonitorContentContractStatusV1,
  LiveSiteMonitorDeploySyncStatusV1,
  LiveSiteMonitorRouteHttpStatusV1,
  LiveSiteMonitorV1,
  LiveSiteSmokeRouteResultV1,
} from "./buckparts-command-center-v2-types";
import {
  LIVE_SITE_TRUST_PAGE_CONTENT_CONTRACTS_V1,
  probeLiveSiteTrustPageContentContract,
} from "./live-site-trust-page-content-contract-v1";

export const LIVE_SITE_MONITOR_CONTRACT = "live_site_monitor_v1" as const;

export const LIVE_SITE_SMOKE_ALLOWLISTED_PATHS = ["/", "/filter/adq36006101", "/fridge/lg-lfxs26973s"] as const;

export type GitResolveResult = {
  local_head_commit: string | "UNKNOWN";
  origin_main_commit: string | "UNKNOWN";
};

export type LiveSiteTargetSelection = {
  primary_target_base_url: string | "UNKNOWN";
  target_source: LiveSiteMonitorV1["target_source"];
  custom_domain_base_url: string | "UNKNOWN";
  custom_domain_checked: boolean;
  netlify_fallback_base_url: string | "UNKNOWN";
  netlify_domain_checked: boolean | "UNKNOWN";
};

export function trimSiteBaseUrl(raw: string | undefined): string | null {
  if (typeof raw !== "string") return null;
  const t = raw.trim();
  if (t.length === 0) return null;
  return t.replace(/\/+$/, "");
}

function isBuckpartsCustomDomain(base: string | "UNKNOWN"): boolean {
  if (base === "UNKNOWN") return false;
  try {
    return new URL(base).hostname.toLowerCase() === "buckparts.com";
  } catch {
    return false;
  }
}

function isNetlifyDomain(base: string | "UNKNOWN"): boolean {
  if (base === "UNKNOWN") return false;
  try {
    return new URL(base).hostname.toLowerCase().endsWith(".netlify.app");
  } catch {
    return false;
  }
}

export function resolveLiveSiteSmokeTargets(env: NodeJS.ProcessEnv): LiveSiteTargetSelection {
  const explicit = trimSiteBaseUrl(env.LIVE_SITE_SMOKE_TARGET_URL);
  const business = trimSiteBaseUrl(env.BUCKPARTS_PUBLIC_SITE_URL);
  const legacy = trimSiteBaseUrl(env.NEXT_PUBLIC_SITE_URL);
  const primary = explicit ?? business ?? legacy;
  const target_source: LiveSiteTargetSelection["target_source"] = explicit
    ? "LIVE_SITE_SMOKE_TARGET_URL"
    : business
      ? "BUCKPARTS_PUBLIC_SITE_URL"
      : legacy
        ? "NEXT_PUBLIC_SITE_URL"
        : "UNKNOWN";
  const custom = isBuckpartsCustomDomain(primary ?? "UNKNOWN")
    ? primary!
    : isBuckpartsCustomDomain(business ?? "UNKNOWN")
      ? business!
      : "UNKNOWN";
  const netlify = isNetlifyDomain(primary ?? "UNKNOWN")
    ? primary!
    : isNetlifyDomain(legacy ?? "UNKNOWN")
      ? legacy!
      : "UNKNOWN";

  return {
    primary_target_base_url: primary ?? "UNKNOWN",
    target_source,
    custom_domain_base_url: custom,
    custom_domain_checked: primary != null && isBuckpartsCustomDomain(primary),
    netlify_fallback_base_url: netlify,
    netlify_domain_checked: primary != null && isNetlifyDomain(primary) ? true : netlify === "UNKNOWN" ? "UNKNOWN" : false,
  };
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
    Array.isArray(o.routes) &&
    (o.content_contracts === undefined || Array.isArray(o.content_contracts))
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
  const target = resolveLiveSiteSmokeTargets(args.env);
  const base = target.primary_target_base_url === "UNKNOWN" ? null : target.primary_target_base_url;
  const unknownFactsBase = [
    "Live-site smoke uses outbound GET only — it does not trigger Netlify deploys or call Netlify APIs.",
    "deployed_commit is never inferred from local HEAD; set LIVE_SITE_DEPLOY_COMMIT only when operator-proven.",
    "deploy_sync_status does not prove live HTML content matches the injected commit — trust content_contracts must pass separately.",
    "Route markers are minimal HTML substring checks — false negatives remain possible.",
    "Only the primary live-site smoke target is probed in this read-only check; secondary domain health remains UNKNOWN unless it is selected as primary.",
  ];
  const provenFacts: string[] = [];

  if (!base) {
    return {
      contract: LIVE_SITE_MONITOR_CONTRACT,
      checked_at: args.nowIso,
      source: args.source,
      primary_target_base_url: "UNKNOWN",
      target_source: target.target_source,
      custom_domain_base_url: target.custom_domain_base_url,
      custom_domain_checked: false,
      netlify_fallback_base_url: target.netlify_fallback_base_url,
      netlify_domain_checked: target.netlify_domain_checked,
      target_base_url: "UNKNOWN",
      route_http_status: "UNKNOWN_CONFIG",
      content_contract_status: "UNKNOWN_CONFIG",
      content_contracts: [],
      runtime_status: "UNKNOWN_CONFIG",
      routes: [],
      local_head_commit: "UNKNOWN",
      origin_main_commit: "UNKNOWN",
      deployed_commit: "UNKNOWN",
      deploy_sync_status: "UNKNOWN_DEPLOY_COMMIT",
      proven_facts: ["No live-site smoke target env var is configured after trim — smoke checks were not run."],
      unknown_facts: [
        ...unknownFactsBase,
        "UNKNOWN_CONFIG: set LIVE_SITE_SMOKE_TARGET_URL=https://buckparts.com for the primary production custom-domain check; legacy fallback NEXT_PUBLIC_SITE_URL is still supported.",
      ],
    };
  }

  provenFacts.push(`Target base URL: ${base}.`);
  provenFacts.push(`Target source: ${target.target_source}.`);
  provenFacts.push(`custom_domain_checked=${String(target.custom_domain_checked)}; netlify_domain_checked=${String(target.netlify_domain_checked)}.`);
  provenFacts.push(`Allowlisted paths: ${LIVE_SITE_SMOKE_ALLOWLISTED_PATHS.join(", ")}.`);
  provenFacts.push(
    `Trust content contracts: ${LIVE_SITE_TRUST_PAGE_CONTENT_CONTRACTS_V1.map((c) => c.path).join(", ")}.`,
  );

  const routes: LiveSiteSmokeRouteResultV1[] = [];
  for (const p of LIVE_SITE_SMOKE_ALLOWLISTED_PATHS) {
    routes.push(await probeLiveSiteRoute({ fetchFn: args.fetchFn, baseUrl: base, path: p }));
  }

  const content_contracts = [];
  for (const contract of LIVE_SITE_TRUST_PAGE_CONTENT_CONTRACTS_V1) {
    content_contracts.push(
      await probeLiveSiteTrustPageContentContract({
        fetchFn: args.fetchFn,
        baseUrl: base,
        contract,
      }),
    );
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
  const route_http_status: LiveSiteMonitorRouteHttpStatusV1 = allHttpOk ? "OK" : "ATTENTION";
  const allContentOk =
    content_contracts.length > 0 && content_contracts.every((c) => c.content_contract_ok);
  const content_contract_status: LiveSiteMonitorContentContractStatusV1 = allContentOk
    ? "OK"
    : "ATTENTION";
  const runtime_status: LiveSiteMonitorV1["runtime_status"] =
    route_http_status === "OK" && content_contract_status === "OK" ? "OK" : "ATTENTION";

  provenFacts.push(
    `Recorded ${routes.length} route GET probes and ${content_contracts.length} trust content contract probes at checked_at=${args.nowIso}.`,
  );
  provenFacts.push(`route_http_status=${route_http_status}; content_contract_status=${content_contract_status}.`);
  for (const c of content_contracts) {
    provenFacts.push(
      `content_contract ${c.path}: http_ok=${String(c.http_ok)} required_markers_ok=${String(c.required_markers_ok)} banned_phrases_absent=${String(c.banned_phrases_absent)} content_contract_ok=${String(c.content_contract_ok)}.`,
    );
  }
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
  if (!target.custom_domain_checked) {
    unknown_facts.push("BuckParts.com custom-domain route health is UNKNOWN unless LIVE_SITE_SMOKE_TARGET_URL or BUCKPARTS_PUBLIC_SITE_URL points to https://buckparts.com.");
  }
  if (target.netlify_domain_checked !== true) {
    unknown_facts.push("Netlify fallback domain route health is UNKNOWN in this run unless the Netlify URL is selected as the primary target.");
  }
  if (deployed_commit === "UNKNOWN") {
    unknown_facts.push("Deploy sync cannot be proven against production without LIVE_SITE_DEPLOY_COMMIT or other proven deploy SHA source.");
  }
  if (!allHttpOk) {
    unknown_facts.push(
      `One or more routes failed HTTP ok check or threw; anyServerError=${String(anyServerError)} — investigate before assuming site-wide outage.`,
    );
  }
  if (!allContentOk) {
    for (const c of content_contracts.filter((x) => !x.content_contract_ok)) {
      if (!c.http_ok) {
        unknown_facts.push(`Trust page ${c.path} failed HTTP ok (status=${String(c.status_code)}).`);
      }
      if (c.required_markers_missing.length > 0) {
        unknown_facts.push(
          `Trust page ${c.path} missing required markers: ${c.required_markers_missing.join(", ")}.`,
        );
      }
      if (c.banned_phrases_found.length > 0) {
        unknown_facts.push(
          `Trust page ${c.path} still serves banned backend phrases: ${c.banned_phrases_found.join(", ")} — likely stale deploy HTML.`,
        );
      }
    }
  }
  if (deployed_commit !== "UNKNOWN" && deploy_sync_status === "MATCHES_ORIGIN_MAIN" && !allContentOk) {
    unknown_facts.push(
      "LIVE_SITE_DEPLOY_COMMIT matches origin/main but trust content contract failed — production may be serving stale HTML despite operator SHA.",
    );
  }
  if (anyServerError) {
    unknown_facts.push("At least one route returned HTTP 5xx — treat as high-severity until cleared.");
  }

  return {
    contract: LIVE_SITE_MONITOR_CONTRACT,
    checked_at: args.nowIso,
    source: args.source,
    primary_target_base_url: base,
    target_source: target.target_source,
    custom_domain_base_url: target.custom_domain_base_url,
    custom_domain_checked: target.custom_domain_checked,
    netlify_fallback_base_url: target.netlify_fallback_base_url,
    netlify_domain_checked: target.netlify_domain_checked,
    target_base_url: base,
    route_http_status,
    content_contract_status,
    content_contracts,
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
