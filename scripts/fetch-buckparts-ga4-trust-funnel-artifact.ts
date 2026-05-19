import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { loadEnv } from "./lib/load-env";
import { createGa4ClientFromEnv } from "./lib/ga4-data-api";
import {
  collectLogSafeFactsFromUnknown,
  throwGoogleApiLogSafeError,
} from "./lib/google-api-log-safe-error";
import type { Ga4TrustFunnelArtifact, Ga4TrustFunnelEventTotals } from "@/lib/owner-dashboard/ga4-trust-funnel-artifact";
import {
  OWNER_REPORT_ARTIFACT_KEY_GA4_TRUST_FUNNEL,
  writeOwnerArtifactToSupabase,
} from "@/lib/owner-dashboard/gsc-durable-artifact-store";

const TRUST_EVENTS = [
  "fridge_model_view",
  "fridge_filter_chip_click",
  "fridge_filter_detail_click_from_model",
  "fridge_filter_view",
  "fridge_help_opened",
] as const;

type TrustEvent = (typeof TRUST_EVENTS)[number];

type RunReportRow = {
  dimensionValues?: Array<{ value?: string }>;
  metricValues?: Array<{ value?: string }>;
};

function toDateIso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function buildDateRange(now = new Date()): { start_date: string; end_date: string } {
  const lagDays = 2;
  const windowDays = 30;
  const end = new Date(now.getTime() - lagDays * 86400000);
  const start = new Date(end.getTime() - (windowDays - 1) * 86400000);
  return { start_date: toDateIso(start), end_date: toDateIso(end) };
}

function computeRate(numerator: number, denominator: number): number | "UNKNOWN" {
  if (denominator <= 0) return "UNKNOWN";
  return numerator / denominator;
}

function parseEventTotals(rows: RunReportRow[] | undefined): Ga4TrustFunnelEventTotals {
  const seed: Ga4TrustFunnelEventTotals = {
    fridge_model_view: 0,
    fridge_filter_chip_click: 0,
    fridge_filter_detail_click_from_model: 0,
    fridge_filter_view: 0,
    fridge_help_opened: 0,
  };
  for (const row of rows ?? []) {
    const event = row.dimensionValues?.[0]?.value;
    const valueRaw = row.metricValues?.[0]?.value ?? "0";
    const value = Number(valueRaw);
    if (!event || !(TRUST_EVENTS as readonly string[]).includes(event)) continue;
    if (!Number.isFinite(value) || value < 0) continue;
    seed[event as TrustEvent] = value;
  }
  return seed;
}

async function queryEventTotals(args: {
  accessToken: string;
  property_id: string;
  dateRange: { start_date: string; end_date: string };
}): Promise<Ga4TrustFunnelEventTotals> {
  const response = await fetch(
    `https://analyticsdata.googleapis.com/v1beta/properties/${encodeURIComponent(args.property_id)}:runReport`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${args.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        dateRanges: [{ startDate: args.dateRange.start_date, endDate: args.dateRange.end_date }],
        dimensions: [{ name: "eventName" }],
        metrics: [{ name: "eventCount" }],
        dimensionFilter: {
          filter: {
            fieldName: "eventName",
            inListFilter: { values: [...TRUST_EVENTS], caseSensitive: false },
          },
        },
        limit: 20,
      }),
    },
  );
  if (!response.ok) {
    await throwGoogleApiLogSafeError(response, "ga4/runReport");
  }
  const parsed = (await response.json()) as { rows?: RunReportRow[] };
  return parseEventTotals(parsed.rows);
}

function buildUnknownArtifact(args: {
  status: "UNKNOWN_CONFIG" | "UNKNOWN_API_ERROR";
  property_id: string | "UNKNOWN";
  date_range: { start_date: string; end_date: string } | "UNKNOWN";
  unknown_facts: string[];
  proven_facts?: string[];
}): Ga4TrustFunnelArtifact {
  return {
    status: args.status,
    fetched_at: new Date().toISOString(),
    property_id: args.property_id,
    date_range: args.date_range,
    event_totals: "UNKNOWN",
    rates: "UNKNOWN",
    dimension_breakdowns: {
      top_model_slugs: "UNKNOWN",
      top_filter_slugs: "UNKNOWN",
      quarantined_vs_normal: "UNKNOWN",
    },
    proven_facts: args.proven_facts ?? [],
    unknown_facts: args.unknown_facts,
    provenance: {
      source: "google_analytics_data_api",
      scope: "https://www.googleapis.com/auth/analytics.readonly",
      writer: "scripts/fetch-buckparts-ga4-trust-funnel-artifact.ts",
    },
  };
}

export async function buildGa4TrustFunnelArtifact(args?: {
  now?: Date;
  env?: Record<string, string | undefined>;
}): Promise<Ga4TrustFunnelArtifact> {
  const dateRange = buildDateRange(args?.now);
  const client = createGa4ClientFromEnv({ env: args?.env });
  if (!client.ok) {
    return buildUnknownArtifact({
      status: "UNKNOWN_CONFIG",
      property_id: "UNKNOWN",
      date_range: dateRange,
      unknown_facts: [client.reason, ...client.log_safe_details],
    });
  }
  try {
    const accessToken = await client.getAccessToken();
    const totals = await queryEventTotals({
      accessToken,
      property_id: client.property_id,
      dateRange,
    });
    const rates = {
      chip_clicks_per_model_view: computeRate(totals.fridge_filter_chip_click, totals.fridge_model_view),
      filter_views_per_chip_click: computeRate(totals.fridge_filter_view, totals.fridge_filter_chip_click),
      help_opens_per_filter_view: computeRate(totals.fridge_help_opened, totals.fridge_filter_view),
    };
    return {
      status: "OK",
      fetched_at: new Date().toISOString(),
      property_id: client.property_id,
      date_range: dateRange,
      event_totals: totals,
      rates,
      dimension_breakdowns: {
        top_model_slugs: "UNKNOWN",
        top_filter_slugs: "UNKNOWN",
        quarantined_vs_normal: "UNKNOWN",
      },
      proven_facts: [
        `Fetched GA4 trust-funnel event totals via auth_mode=${client.auth_mode}.`,
        `Property=${client.property_id}.`,
        `Date range=${dateRange.start_date}..${dateRange.end_date}.`,
      ],
      unknown_facts: [
        "Custom dimensions for page_slug/model_slug/filter_slug/trust_state are not proven configured; dimension breakdowns remain UNKNOWN.",
      ],
      provenance: {
        source: "google_analytics_data_api",
        scope: "https://www.googleapis.com/auth/analytics.readonly",
        writer: "scripts/fetch-buckparts-ga4-trust-funnel-artifact.ts",
      },
    };
  } catch (error) {
    const diagnosticFacts = collectLogSafeFactsFromUnknown(error);
    return buildUnknownArtifact({
      status: "UNKNOWN_API_ERROR",
      property_id: client.property_id,
      date_range: dateRange,
      proven_facts: [`Configured GA4 property_id=${client.property_id}.`],
      unknown_facts: [
        "GA4 Data API query failed.",
        "Verify Analytics Data API access, property permissions, and quota/availability.",
        ...diagnosticFacts,
      ],
    });
  }
}

export async function runGa4TrustFunnelFetchJob(rootDir = process.cwd()): Promise<{
  output_path: string;
  artifact: Ga4TrustFunnelArtifact;
  durable_write:
    | { status: "OK"; sink: "SUPABASE"; details: string[] }
    | { status: "UNKNOWN_SUPABASE_WRITE"; details: string[] };
}> {
  loadEnv(rootDir);
  const artifact = await buildGa4TrustFunnelArtifact();
  const outputPath = path.resolve(rootDir, "data/reports/buckparts-ga4-trust-funnel.json");
  mkdirSync(path.dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
  const durableWrite = await writeOwnerArtifactToSupabase({
    artifact_key: OWNER_REPORT_ARTIFACT_KEY_GA4_TRUST_FUNNEL,
    status: artifact.status,
    fetched_at: artifact.fetched_at,
    payload: artifact,
    source: "scripts/fetch-buckparts-ga4-trust-funnel-artifact.ts",
  });
  return {
    output_path: outputPath,
    artifact,
    durable_write: durableWrite.ok
      ? { status: "OK", sink: durableWrite.sink, details: durableWrite.details }
      : { status: "UNKNOWN_SUPABASE_WRITE", details: durableWrite.details },
  };
}

export async function main(): Promise<void> {
  const result = await runGa4TrustFunnelFetchJob();
  process.stdout.write(
    `${JSON.stringify(
      {
        output_path: result.output_path,
        status: result.artifact.status,
        fetched_at: result.artifact.fetched_at,
        property_id: result.artifact.property_id,
        durable_write: result.durable_write,
        ...(result.artifact.status !== "OK" ? { unknown_facts: result.artifact.unknown_facts } : {}),
      },
      null,
      2,
    )}\n`,
  );
}

const THIS_FILE = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === THIS_FILE) {
  main().catch(() => {
    console.error("[fetch-buckparts-ga4-trust-funnel-artifact] failed");
    process.exit(1);
  });
}
