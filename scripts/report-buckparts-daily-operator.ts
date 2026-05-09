import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { buildBuckpartsCommandCenterReport } from "./report-buckparts-command-center";
import { buildBuckpartsCommandSurfaceReport, type CommandSurfaceReport } from "./report-buckparts-command-surface";
import { runLiveSiteSmokeCheck } from "./live-site-smoke-check";
import type { LiveSiteMonitorV1 } from "./lib/buckparts-command-center-v2-types";
import {
  buildOwnerGscExternalDemandNeuron,
  type OwnerGscExternalDemandNeuron,
} from "@/lib/owner-dashboard/gsc-external-demand";
import {
  OWNER_REPORT_ARTIFACT_KEY_GA4_TRUST_FUNNEL,
  readOwnerArtifactFromSupabase,
} from "@/lib/owner-dashboard/gsc-durable-artifact-store";
import {
  parseGa4TrustFunnelArtifact,
  type Ga4TrustFunnelArtifact,
} from "@/lib/owner-dashboard/ga4-trust-funnel-artifact";

type UnknownableNumber = number | "UNKNOWN";
type RuntimeStatus = "OK" | "ATTENTION" | "BLOCKED" | "UNKNOWN";
type CommandCenterReport = Awaited<ReturnType<typeof buildBuckpartsCommandCenterReport>>;

type Ga4TrustFunnelRead =
  | { status: "OK"; source: "SUPABASE" | "LOCAL_ARTIFACT"; artifact: Ga4TrustFunnelArtifact; issue: null }
  | { status: "UNKNOWN"; source: "NONE"; artifact: null; issue: string };

type DailyOperatorOptions = {
  rootDir?: string;
  now?: () => Date;
  env?: NodeJS.ProcessEnv;
  providers?: {
    commandCenter?: () => Promise<CommandCenterReport>;
    commandSurface?: () => Promise<CommandSurfaceReport>;
    liveSiteSmokeCheck?: () => Promise<LiveSiteMonitorV1>;
    gscExternalDemand?: () => Promise<OwnerGscExternalDemandNeuron>;
    ga4TrustFunnel?: () => Promise<Ga4TrustFunnelRead>;
  };
};

type ExcludedSignal = {
  signal: string;
  reason: string;
};

export type BuckpartsDailyOperatorReport = {
  contract: "buckparts_daily_operator_v1";
  generated_at: string;
  runtime_status: RuntimeStatus;
  business_warning: {
    status: "CLEAR" | "STOP_THE_LINE" | "UNKNOWN";
    issues: string[];
  };
  demand_opportunities: {
    gsc_external_demand: {
      status: OwnerGscExternalDemandNeuron["status"] | "UNKNOWN";
      connection_level: OwnerGscExternalDemandNeuron["connection_level"] | "UNKNOWN";
      total_impressions: UnknownableNumber;
      total_clicks: UnknownableNumber;
      average_ctr: UnknownableNumber;
      average_position: UnknownableNumber;
      high_impression_low_click_opportunities: OwnerGscExternalDemandNeuron["high_impression_low_click_opportunities"];
    };
    internal_search_demand_gaps: CommandCenterReport["search_and_click_intelligence_summary"];
  };
  throughput_clicks_money: {
    go_clicks: CommandCenterReport["search_and_click_intelligence_summary"]["click_events"];
    click_visibility: CommandCenterReport["command_center_v2"]["revenue_snapshot"]["click_visibility"] | null;
    ga4_trust_funnel: {
      status: Ga4TrustFunnelRead["status"];
      source: Ga4TrustFunnelRead["source"];
      event_totals: Ga4TrustFunnelArtifact["event_totals"] | "UNKNOWN";
      rates: Ga4TrustFunnelArtifact["rates"] | "UNKNOWN";
      zero_counts_are_failure: false;
      custom_dimension_breakdowns: "UNKNOWN";
    };
    revenue_conversions: {
      status: "UNKNOWN_NOT_CONNECTED";
      revenue: "UNKNOWN";
      conversions: "UNKNOWN";
      reason: string;
    };
  };
  site_health: {
    live_site_smoke: LiveSiteMonitorV1 | null;
    deploy_sync_status: LiveSiteMonitorV1["deploy_sync_status"] | "UNKNOWN";
    route_health_status: RuntimeStatus;
  };
  stale_or_missing_artifacts: string[];
  blocked_jobs: Array<{ job_or_signal: string; status: "BLOCKED" | "UNKNOWN"; reason: string }>;
  non_authoritative_signals: ExcludedSignal[];
  decision_authority_policy: {
    decision_authoritative_signals: Array<{ signal: string; scope: string; reason: string }>;
    excluded_signals: ExcludedSignal[];
  };
  next_owner_action: string;
  next_agent_action: string;
  validation_status: {
    read_only: true;
    data_mutation: false;
    local_artifact_write: false;
    supabase_upsert: false;
    expensive_validation_commands_run: false;
    git: {
      local_head_commit: string | "UNKNOWN";
      origin_main_commit: string | "UNKNOWN";
      status_short: string | "UNKNOWN";
    };
  };
  what_not_to_touch: string[];
  proven_facts: string[];
  unknown_facts: string[];
};

type HumanOutputOptions = {
  canonicalProductionUrl?: string;
};

const EXCLUDED_SIGNALS: ExcludedSignal[] = [
  {
    signal: "affiliate revenue/conversions",
    reason: "Excluded until a real affiliate revenue/conversion feed exists; clicks are not revenue.",
  },
  {
    signal: "valuation monitor",
    reason: "Excluded until real revenue/profit exists; traffic or clicks must not be converted into valuation.",
  },
  {
    signal: "GA4 custom-dimension breakdowns",
    reason: "Excluded until model/filter/quarantine custom dimensions are proven in aggregate artifacts.",
  },
  {
    signal: "semantic page-state by CTA/trust/quarantine/demand joins",
    reason: "Excluded because sitemap inventory/policy buckets do not prove semantic CTA, trust, quarantine, or demand state.",
  },
  {
    signal: "catalog-wide evidence coverage by brand/model",
    reason: "Excluded until evidence artifacts are joined to catalog brand/model inventories.",
  },
  {
    signal: "deployed commit sync",
    reason: "Excluded unless deployed_commit is explicitly proven; local HEAD is never production deploy proof.",
  },
];

const DECISION_AUTHORITATIVE_SIGNALS = [
  {
    signal: "GSC external demand",
    scope: "Search-demand totals and opportunities only when artifact metrics are present.",
    reason: "Durable/local/manual artifact parser provides numeric impressions/clicks without live GSC API writes.",
  },
  {
    signal: "internal search demand/gaps",
    scope: "Search event and gap backlog counts when runtime_status is OK.",
    reason: "Command-surface read-only summary is the repo path for internal demand telemetry.",
  },
  {
    signal: "/go click visibility",
    scope: "Click behavior only, never revenue or buyer proof.",
    reason: "click_events aggregates are read-only operational telemetry.",
  },
  {
    signal: "GA4 aggregate freshness/counts",
    scope: "Aggregate event counts and rates only; zero totals are valid observations, not failure by themselves.",
    reason: "The GA4 trust-funnel artifact contract keeps dimension breakdowns UNKNOWN.",
  },
  {
    signal: "live-site route health",
    scope: "Allowlisted route GET status and marker checks from read-only live-site smoke check.",
    reason: "The check mode performs no artifact writes, upserts, or deploys.",
  },
  {
    signal: "page-state inventory/policy",
    scope: "Sitemap inventory and vertical policy buckets only.",
    reason: "The command-surface state contract labels this as inventory/policy truth, not semantic page state.",
  },
  {
    signal: "evidence inventory/body mapping",
    scope: "Local evidence file inventory and body mapping only.",
    reason: "Evidence inventory explicitly does not prove catalog-wide brand/model coverage.",
  },
  {
    signal: "integrity/UNKNOWN honesty",
    scope: "Whether unknowns/fallbacks are represented honestly before recommendations.",
    reason: "Daily Operator actions must remain UNKNOWN-safe.",
  },
];

function resolveGit(rootDir: string): BuckpartsDailyOperatorReport["validation_status"]["git"] {
  const run = (cmd: string): string | "UNKNOWN" => {
    try {
      return execSync(cmd, { cwd: rootDir, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
    } catch {
      return "UNKNOWN";
    }
  };
  return {
    local_head_commit: run("git rev-parse HEAD"),
    origin_main_commit: run("git rev-parse origin/main"),
    status_short: run("git status --short"),
  };
}

async function loadGa4TrustFunnelReadOnly(args: {
  rootDir: string;
  env?: NodeJS.ProcessEnv;
}): Promise<Ga4TrustFunnelRead> {
  const durable = await readOwnerArtifactFromSupabase<Ga4TrustFunnelArtifact>({
    artifact_key: OWNER_REPORT_ARTIFACT_KEY_GA4_TRUST_FUNNEL,
    env: args.env,
  });
  if (durable.ok) {
    return { status: "OK", source: "SUPABASE", artifact: durable.artifact, issue: null };
  }

  const localPath = path.resolve(args.rootDir, "data/reports/buckparts-ga4-trust-funnel.json");
  if (!existsSync(localPath)) {
    return {
      status: "UNKNOWN",
      source: "NONE",
      artifact: null,
      issue: `GA4 trust-funnel artifact unavailable: durable_read=${durable.reason}; local artifact missing.`,
    };
  }
  try {
    const parsed = parseGa4TrustFunnelArtifact(readFileSync(localPath, "utf8"));
    if (parsed.ok) return { status: "OK", source: "LOCAL_ARTIFACT", artifact: parsed.artifact, issue: null };
    return { status: "UNKNOWN", source: "NONE", artifact: null, issue: `Local GA4 artifact parse failed: ${parsed.reason}` };
  } catch {
    return { status: "UNKNOWN", source: "NONE", artifact: null, issue: "Local GA4 artifact exists but could not be read." };
  }
}

async function safeProvider<T>(
  label: string,
  fn: () => Promise<T>,
): Promise<{ ok: true; value: T } | { ok: false; label: string; reason: string }> {
  try {
    return { ok: true, value: await fn() };
  } catch (error) {
    return { ok: false, label, reason: error instanceof Error ? error.message : "UNKNOWN" };
  }
}

function routeHealthStatus(mon: LiveSiteMonitorV1 | null): RuntimeStatus {
  if (!mon) return "UNKNOWN";
  if (mon.runtime_status === "UNKNOWN_CONFIG") return "UNKNOWN";
  if (mon.routes.some((r) => r.status_code === "UNKNOWN" || (typeof r.status_code === "number" && r.status_code >= 500))) {
    return "BLOCKED";
  }
  if (mon.runtime_status === "ATTENTION" || mon.routes.some((r) => !r.ok)) return "ATTENTION";
  return "OK";
}

function hasKnownUnknown(haystack: string[], needle: string): boolean {
  return haystack.some((item) => item.toLowerCase().includes(needle.toLowerCase()));
}

export async function buildBuckpartsDailyOperatorReport(
  options: DailyOperatorOptions = {},
): Promise<BuckpartsDailyOperatorReport> {
  const rootDir = options.rootDir ?? process.cwd();
  const now = options.now ?? (() => new Date());
  const providers = options.providers ?? {};

  const [commandCenterResult, commandSurfaceResult, liveSiteResult, gscResult, ga4Result] = await Promise.all([
    safeProvider("command_center", providers.commandCenter ?? (() => buildBuckpartsCommandCenterReport({ rootDir, now }))),
    safeProvider("command_surface", providers.commandSurface ?? (() => buildBuckpartsCommandSurfaceReport({ rootDir, now }))),
    safeProvider("live_site_smoke_check", providers.liveSiteSmokeCheck ?? (() => runLiveSiteSmokeCheck(rootDir, { env: options.env }))),
    safeProvider(
      "gsc_external_demand",
      providers.gscExternalDemand ??
        (() => buildOwnerGscExternalDemandNeuron({ rootDir })),
    ),
    safeProvider(
      "ga4_trust_funnel",
      providers.ga4TrustFunnel ?? (() => loadGa4TrustFunnelReadOnly({ rootDir, env: options.env })),
    ),
  ]);

  const blocked_jobs: BuckpartsDailyOperatorReport["blocked_jobs"] = [];
  for (const result of [commandCenterResult, commandSurfaceResult, liveSiteResult, gscResult, ga4Result]) {
    if (!result.ok) blocked_jobs.push({ job_or_signal: result.label, status: "UNKNOWN", reason: result.reason });
  }

  const commandCenter = commandCenterResult.ok ? commandCenterResult.value : null;
  const commandSurface = commandSurfaceResult.ok ? commandSurfaceResult.value : null;
  const liveSite = liveSiteResult.ok ? liveSiteResult.value : null;
  const gsc = gscResult.ok ? gscResult.value : null;
  const ga4 = ga4Result.ok ? ga4Result.value : null;
  if (ga4 && ga4.status !== "OK") {
    blocked_jobs.push({ job_or_signal: "ga4_trust_funnel", status: "UNKNOWN", reason: ga4.issue });
  }

  const stopLineIssues: string[] = [];
  if (commandSurface?.system_health.status === "CRITICAL") {
    stopLineIssues.push(...commandSurface.system_health.reasons.map((r) => `command_surface: ${r}`));
  }
  const liveStatus = routeHealthStatus(liveSite);
  if (liveStatus === "BLOCKED") stopLineIssues.push("live_site_smoke_check: route health has UNKNOWN or 5xx result.");

  const unknownFacts: string[] = [];
  if (!commandCenter) unknownFacts.push("Command Center report unavailable; dependent demand/click/action fields are UNKNOWN.");
  if (!commandSurface) unknownFacts.push("Command Surface report unavailable; system health and artifact stale checks are UNKNOWN.");
  if (!liveSite) unknownFacts.push("Read-only live-site smoke check unavailable; route health is UNKNOWN.");
  if (!gsc) unknownFacts.push("GSC external demand unavailable; GSC demand authority is UNKNOWN.");
  if (!ga4 || ga4.status !== "OK") unknownFacts.push(ga4?.issue ?? "GA4 trust-funnel aggregate unavailable.");

  const commandUnknowns = [
    ...(commandCenter?.known_unknowns ?? []),
    ...(commandSurface?.known_unknowns ?? []),
    ...(liveSite?.unknown_facts ?? []),
    ...(gsc?.unknown_facts ?? []),
    ...(ga4?.artifact?.unknown_facts ?? []),
  ];
  const staleOrMissingArtifacts = commandUnknowns.filter(
    (item) =>
      /missing|stale|not found|unavailable|unknown_config|snapshot|artifact|export/i.test(item) &&
      !/secret|service_role/i.test(item),
  );

  if (gsc && !(typeof gsc.total_impressions === "number" && typeof gsc.total_clicks === "number")) {
    blocked_jobs.push({
      job_or_signal: "gsc_external_demand",
      status: "UNKNOWN",
      reason: "GSC external demand does not have numeric total_impressions and total_clicks.",
    });
  }
  if (commandCenter?.search_and_click_intelligence_summary.runtime_status !== "OK") {
    blocked_jobs.push({
      job_or_signal: "internal_search_demand_gaps",
      status: "UNKNOWN",
      reason: `runtime_status=${commandCenter?.search_and_click_intelligence_summary.runtime_status ?? "UNKNOWN"}`,
    });
  }
  if (liveSite?.deploy_sync_status === "UNKNOWN_DEPLOY_COMMIT") {
    blocked_jobs.push({
      job_or_signal: "deploy_sync_status",
      status: "UNKNOWN",
      reason: "LIVE_SITE_DEPLOY_COMMIT is absent or unproven; local HEAD is not used as deployed commit proof.",
    });
  }

  const runtime_status: RuntimeStatus =
    stopLineIssues.length > 0
      ? "BLOCKED"
      : blocked_jobs.length > 0 || commandSurface?.system_health.status === "WARNING" || liveStatus === "ATTENTION"
        ? "ATTENTION"
        : commandCenter && commandSurface && liveSite && gsc && ga4
          ? "OK"
          : "UNKNOWN";

  const ownerAction =
    stopLineIssues.length > 0
      ? "Resolve stop-the-line command-surface or live-site blockers before using Daily Operator recommendations."
      : commandCenter?.command_center_v2.next_owner_action ??
        gsc?.next_owner_action ??
        "Restore missing read-only inputs before using Daily Operator recommendations.";

  const agentAction =
    stopLineIssues.length > 0
      ? "Run read-only diagnostics for the blocking lane; do not mutate retailer_links, /go, analytics emitters, token controls, or deploy state."
      : commandCenter?.execution_guidance.next_move_command ??
        "npm run buckparts:daily";

  const provenFacts = [
    "Daily Operator v1 invokes read-only report builders/check helpers only; it does not write local artifacts or Supabase rows.",
    liveSite
      ? `Read-only live-site smoke returned runtime_status=${liveSite.runtime_status}; deploy_sync_status=${liveSite.deploy_sync_status}.`
      : null,
    gsc && typeof gsc.total_impressions === "number"
      ? `GSC external demand total_impressions=${gsc.total_impressions}; total_clicks=${String(gsc.total_clicks)}.`
      : null,
    commandCenter?.search_and_click_intelligence_summary.runtime_status === "OK"
      ? "Internal search demand/gaps runtime_status is OK."
      : null,
    ga4?.status === "OK"
      ? `GA4 trust-funnel aggregate loaded from ${ga4.source}; zero event totals are treated as valid counts, not failure by themselves.`
      : null,
    commandSurface?.state_system_metrics.page_state.contract === "sitemap_artifact_inventory_v1"
      ? "Page-state signal is authoritative only as sitemap artifact inventory/policy."
      : null,
    commandCenter?.command_center_v2.recent_evidence.evidence_inventory.contract === "evidence_inventory_v1"
      ? "Evidence signal is authoritative only as inventory/body mapping."
      : null,
  ].filter((v): v is string => typeof v === "string");

  unknownFacts.push(
    ...EXCLUDED_SIGNALS.map((s) => `${s.signal}: ${s.reason}`),
    ...commandUnknowns,
  );
  if (!hasKnownUnknown(unknownFacts, "deployed commit")) {
    unknownFacts.push("deployed commit sync remains UNKNOWN unless LIVE_SITE_DEPLOY_COMMIT or another production deploy SHA source is proven.");
  }

  return {
    contract: "buckparts_daily_operator_v1",
    generated_at: now().toISOString(),
    runtime_status,
    business_warning: {
      status: stopLineIssues.length > 0 ? "STOP_THE_LINE" : commandCenter || commandSurface || liveSite ? "CLEAR" : "UNKNOWN",
      issues: stopLineIssues,
    },
    demand_opportunities: {
      gsc_external_demand: {
        status: gsc?.status ?? "UNKNOWN",
        connection_level: gsc?.connection_level ?? "UNKNOWN",
        total_impressions: gsc?.total_impressions ?? "UNKNOWN",
        total_clicks: gsc?.total_clicks ?? "UNKNOWN",
        average_ctr: gsc?.average_ctr ?? "UNKNOWN",
        average_position: gsc?.average_position ?? "UNKNOWN",
        high_impression_low_click_opportunities: gsc?.high_impression_low_click_opportunities ?? "UNKNOWN",
      },
      internal_search_demand_gaps:
        commandCenter?.search_and_click_intelligence_summary ?? {
          runtime_status: "UNKNOWN_NOT_QUERIED",
          window_days: { short: 7, long: 30 },
          search_events: {
            last_7d: "UNKNOWN",
            last_30d: "UNKNOWN",
            zero_result_last_7d: "UNKNOWN",
            zero_result_last_30d: "UNKNOWN",
            zero_result_rate_last_7d: "UNKNOWN",
            zero_result_rate_last_30d: "UNKNOWN",
          },
          search_gaps_backlog: { open: "UNKNOWN", reviewing: "UNKNOWN", queued: "UNKNOWN", total_actionable: "UNKNOWN" },
          click_events: { last_7d: "UNKNOWN", last_30d: "UNKNOWN" },
          known_unknowns: ["Command Center unavailable."],
        },
    },
    throughput_clicks_money: {
      go_clicks: commandCenter?.search_and_click_intelligence_summary.click_events ?? {
        last_7d: "UNKNOWN",
        last_30d: "UNKNOWN",
      },
      click_visibility: commandCenter?.command_center_v2.revenue_snapshot.click_visibility ?? null,
      ga4_trust_funnel: {
        status: ga4?.status ?? "UNKNOWN",
        source: ga4?.source ?? "NONE",
        event_totals: ga4?.artifact?.event_totals ?? "UNKNOWN",
        rates: ga4?.artifact?.rates ?? "UNKNOWN",
        zero_counts_are_failure: false,
        custom_dimension_breakdowns: "UNKNOWN",
      },
      revenue_conversions: {
        status: "UNKNOWN_NOT_CONNECTED",
        revenue: "UNKNOWN",
        conversions: "UNKNOWN",
        reason: "No real affiliate revenue/conversion feed is connected; clicks and GA4 events are not revenue.",
      },
    },
    site_health: {
      live_site_smoke: liveSite,
      deploy_sync_status: liveSite?.deploy_sync_status ?? "UNKNOWN",
      route_health_status: liveStatus,
    },
    stale_or_missing_artifacts: Array.from(new Set(staleOrMissingArtifacts)),
    blocked_jobs,
    non_authoritative_signals: EXCLUDED_SIGNALS,
    decision_authority_policy: {
      decision_authoritative_signals: DECISION_AUTHORITATIVE_SIGNALS,
      excluded_signals: EXCLUDED_SIGNALS,
    },
    next_owner_action: ownerAction,
    next_agent_action: agentAction,
    validation_status: {
      read_only: true,
      data_mutation: false,
      local_artifact_write: false,
      supabase_upsert: false,
      expensive_validation_commands_run: false,
      git: resolveGit(rootDir),
    },
    what_not_to_touch: [
      "deploy",
      "git push",
      "DB writes",
      "Supabase upserts",
      "local artifact writes",
      "public UI",
      "/go",
      "analytics emitters",
      "retailer_links",
      "Amazon rescue",
      "token controls",
      "compatibility mapping",
    ],
    proven_facts: provenFacts,
    unknown_facts: Array.from(new Set(unknownFacts)),
  };
}

function fmt(value: unknown): string {
  if (value === null || value === undefined) return "UNKNOWN";
  if (typeof value === "number") return Number.isInteger(value) ? String(value) : value.toFixed(3).replace(/0+$/, "").replace(/\.$/, "");
  if (typeof value === "string") return value;
  return "UNKNOWN";
}

function pct(value: unknown): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "UNKNOWN";
  return `${(value * 100).toFixed(1)}%`;
}

function bulletLines(items: string[], fallback: string, max = 3): string[] {
  const trimmed = items.map((item) => item.trim()).filter(Boolean).slice(0, max);
  const out = trimmed.length > 0 ? trimmed : [fallback];
  return out.map((item) => `- ${item}`);
}

function summarizeGa4Events(events: BuckpartsDailyOperatorReport["throughput_clicks_money"]["ga4_trust_funnel"]["event_totals"]): string {
  if (events === "UNKNOWN") return "event totals UNKNOWN";
  return [
    `model views ${events.fridge_model_view}`,
    `chip clicks ${events.fridge_filter_chip_click}`,
    `filter views ${events.fridge_filter_view}`,
    `help opens ${events.fridge_help_opened}`,
  ].join(", ");
}

function routeSummary(mon: LiveSiteMonitorV1 | null): string {
  if (!mon || mon.routes.length === 0) return "UNKNOWN";
  const ok = mon.routes.filter((r) => r.ok).length;
  return `${ok}/${mon.routes.length} routes OK`;
}

function siteTargetWarning(report: BuckpartsDailyOperatorReport, canonicalProductionUrl: string): string | null {
  const target = report.site_health.live_site_smoke?.target_base_url;
  if (!target || target === "UNKNOWN" || target === canonicalProductionUrl) return null;
  return `Live-site smoke target is ${target}; production custom domain check (${canonicalProductionUrl}) is UNKNOWN.`;
}

export function formatBuckpartsDailyOperatorHumanReport(
  report: BuckpartsDailyOperatorReport,
  options: HumanOutputOptions = {},
): string {
  const canonicalProductionUrl = options.canonicalProductionUrl ?? "https://buckparts.com";
  const stopTheLine = [...report.business_warning.issues];
  const targetWarning = siteTargetWarning(report, canonicalProductionUrl);
  if (targetWarning) stopTheLine.push(targetWarning);

  const gsc = report.demand_opportunities.gsc_external_demand;
  const internal = report.demand_opportunities.internal_search_demand_gaps;
  const clickVisibility = report.throughput_clicks_money.click_visibility;
  const human7 = clickVisibility?.human_likely_last_7_days_clicks ?? "UNKNOWN";
  const human30 = clickVisibility?.human_likely_last_30_days_clicks ?? "UNKNOWN";
  const ga4 = report.throughput_clicks_money.ga4_trust_funnel;
  const deploySync = report.site_health.deploy_sync_status === "MATCHES_ORIGIN_MAIN"
    ? "MATCHES_ORIGIN_MAIN"
    : `${report.site_health.deploy_sync_status} (not inferred from local HEAD)`;
  const excluded = report.decision_authority_policy.excluded_signals.map((s) => s.signal);

  const lines = [
    "BUCKPARTS DAILY OPERATOR",
    `Status: ${report.runtime_status}`,
    "",
    "STOP-THE-LINE",
    ...bulletLines(stopTheLine, "None."),
    "",
    "DEMAND",
    `- GSC: impressions ${fmt(gsc.total_impressions)}, clicks ${fmt(gsc.total_clicks)}, CTR ${gsc.average_ctr === "UNKNOWN" ? pct(gsc.total_impressions !== "UNKNOWN" && gsc.total_clicks !== "UNKNOWN" && gsc.total_impressions > 0 ? gsc.total_clicks / gsc.total_impressions : "UNKNOWN") : pct(gsc.average_ctr)}, position ${fmt(gsc.average_position)}.`,
    `- Internal search: ${fmt(internal.search_events.last_7d)} searches 7d / ${fmt(internal.search_events.last_30d)} searches 30d; zero-result ${fmt(internal.search_events.zero_result_last_7d)} 7d / ${fmt(internal.search_events.zero_result_last_30d)} 30d; actionable gaps ${fmt(internal.search_gaps_backlog.total_actionable)}.`,
    "",
    "TRAFFIC / CLICKS / MONEY",
    `- /go clicks: ${fmt(report.throughput_clicks_money.go_clicks.last_7d)} last 7d / ${fmt(report.throughput_clicks_money.go_clicks.last_30d)} last 30d.`,
    `- Human-likely clicks: ${fmt(human7)} last 7d / ${fmt(human30)} last 30d.`,
    `- GA4 funnel: ${ga4.status} from ${ga4.source}; ${summarizeGa4Events(ga4.event_totals)}. Zero counts are not failure by themselves.`,
    `- Revenue/conversions: ${report.throughput_clicks_money.revenue_conversions.status}; ${report.throughput_clicks_money.revenue_conversions.reason}`,
    "",
    "SITE HEALTH",
    `- Routes: ${routeSummary(report.site_health.live_site_smoke)}; status ${report.site_health.route_health_status}.`,
    `- Smoke target: ${report.site_health.live_site_smoke?.target_base_url ?? "UNKNOWN"}.`,
    `- Deploy sync: ${deploySync}.`,
    "",
    "NEXT ACTION",
    `- Owner: ${report.next_owner_action}`,
    `- Agent: ${report.next_agent_action}`,
    "",
    "DO NOT TOUCH",
    ...bulletLines(
      [
        ...excluded,
        "DB writes/deploy/git push/local artifact writes unless explicitly approved",
      ],
      "No excluded signals configured.",
      12,
    ),
  ];

  return `${lines.join("\n")}\n`;
}

export function renderBuckpartsDailyOperatorOutput(
  report: BuckpartsDailyOperatorReport,
  options: { json?: boolean } = {},
): string {
  if (options.json) return `${JSON.stringify(report, null, 2)}\n`;
  return formatBuckpartsDailyOperatorHumanReport(report);
}

export async function main(): Promise<void> {
  const report = await buildBuckpartsDailyOperatorReport();
  process.stdout.write(renderBuckpartsDailyOperatorOutput(report, { json: process.argv.includes("--json") }));
}

const entryHref = pathToFileURL(path.resolve(process.argv[1] ?? "")).href;
if (import.meta.url === entryHref) {
  main().catch(() => {
    console.error("[report-buckparts-daily-operator] failed");
    process.exit(1);
  });
}
