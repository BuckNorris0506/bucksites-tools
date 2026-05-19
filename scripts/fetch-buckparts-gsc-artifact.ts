import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { loadEnv } from "./lib/load-env";
import {
  collectLogSafeFactsFromUnknown,
  throwGoogleApiLogSafeError,
} from "./lib/google-api-log-safe-error";
import { createSearchConsoleClientFromEnv } from "./lib/gsc-search-console-api";
import type { GscArtifactTopEntry, GscSearchAnalyticsArtifact } from "@/lib/owner-dashboard/gsc-api-artifact";
import { writeGscArtifactToSupabase } from "@/lib/owner-dashboard/gsc-durable-artifact-store";

type SearchConsoleApiRow = {
  keys?: string[];
  clicks?: number;
  impressions?: number;
  position?: number;
};

async function querySearchAnalytics(args: {
  accessToken: string;
  property: string;
  startDate: string;
  endDate: string;
  dimensions?: Array<"query" | "page">;
  rowLimit?: number;
  startRow?: number;
}): Promise<SearchConsoleApiRow[]> {
  const response = await fetch(
    `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(args.property)}/searchAnalytics/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${args.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        startDate: args.startDate,
        endDate: args.endDate,
        dimensions: args.dimensions,
        rowLimit: args.rowLimit ?? 250,
        startRow: args.startRow ?? 0,
      }),
    },
  );
  if (!response.ok) {
    await throwGoogleApiLogSafeError(response, "gsc/searchAnalytics/query");
  }
  const parsed = (await response.json()) as { rows?: SearchConsoleApiRow[] };
  return parsed.rows ?? [];
}

type SearchAnalyticsRow = {
  key: string;
  clicks: number;
  impressions: number;
  ctr: number | "UNKNOWN";
  average_position: number | "UNKNOWN";
};

function asFiniteNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function toDateIso(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function buildDateRange(now = new Date()): { start_date: string; end_date: string } {
  const lagDays = 3;
  const windowDays = 30;
  const end = new Date(now.getTime() - lagDays * 86400000);
  const start = new Date(end.getTime() - (windowDays - 1) * 86400000);
  return { start_date: toDateIso(start), end_date: toDateIso(end) };
}

async function queryDimension(args: {
  accessToken: string;
  property: string;
  dateRange: { start_date: string; end_date: string };
  dimension: "query" | "page";
}): Promise<SearchAnalyticsRow[]> {
  const rows = await querySearchAnalytics({
    accessToken: args.accessToken,
    property: args.property,
    startDate: args.dateRange.start_date,
    endDate: args.dateRange.end_date,
    dimensions: [args.dimension],
    rowLimit: 250,
    startRow: 0,
  });
  return rows
    .map((row) => {
      const key = Array.isArray(row.keys) ? row.keys[0] : null;
      if (typeof key !== "string" || key.length === 0) return null;
      const impressions = asFiniteNumber(row.impressions);
      const clicks = asFiniteNumber(row.clicks);
      return {
        key,
        impressions,
        clicks,
        ctr: impressions > 0 ? clicks / impressions : ("UNKNOWN" as const),
        average_position: typeof row.position === "number" && Number.isFinite(row.position) ? row.position : "UNKNOWN",
      };
    })
    .filter((row): row is SearchAnalyticsRow => row !== null);
}

function toTopEntries(rows: SearchAnalyticsRow[], sortBy: "clicks" | "impressions"): GscArtifactTopEntry[] {
  return [...rows]
    .sort((a, b) =>
      sortBy === "clicks" ? b.clicks - a.clicks || b.impressions - a.impressions : b.impressions - a.impressions || b.clicks - a.clicks,
    )
    .slice(0, 10);
}

function opportunityMinimumImpressions(totalImpressions: number): number {
  return Math.max(10, Math.ceil(totalImpressions * 0.05));
}

export function buildHighImpressionLowClickOpportunities(args: {
  queryRows: SearchAnalyticsRow[];
  totalImpressions: number;
}): GscArtifactTopEntry[] | "UNKNOWN" {
  if (args.queryRows.length === 0 || args.totalImpressions <= 0) return "UNKNOWN";
  const minImpressions = opportunityMinimumImpressions(args.totalImpressions);
  const rows = args.queryRows
    .filter((entry) => entry.impressions >= minImpressions)
    .filter((entry) => entry.clicks <= 1)
    .filter((entry) => entry.ctr === "UNKNOWN" || entry.ctr <= 0.02)
    .sort((a, b) =>
      b.impressions - a.impressions ||
      a.clicks - b.clicks ||
      (typeof b.average_position === "number" ? b.average_position : Number.NEGATIVE_INFINITY) -
        (typeof a.average_position === "number" ? a.average_position : Number.NEGATIVE_INFINITY),
    )
    .slice(0, 10);
  return rows.length > 0 ? rows : "UNKNOWN";
}

async function queryTotals(args: {
  accessToken: string;
  property: string;
  dateRange: { start_date: string; end_date: string };
}): Promise<{ total_clicks: number; total_impressions: number; average_position: number | "UNKNOWN" }> {
  const rows = await querySearchAnalytics({
    accessToken: args.accessToken,
    property: args.property,
    startDate: args.dateRange.start_date,
    endDate: args.dateRange.end_date,
    rowLimit: 1,
    startRow: 0,
  });
  const row = rows[0];
  const total_clicks = asFiniteNumber(row?.clicks);
  const total_impressions = asFiniteNumber(row?.impressions);
  const position = row?.position;
  return {
    total_clicks,
    total_impressions,
    average_position: typeof position === "number" && Number.isFinite(position) ? position : "UNKNOWN",
  };
}

function buildUnknownArtifact(args: {
  status: "UNKNOWN_CONFIG" | "UNKNOWN_API_ERROR";
  property: string | "UNKNOWN";
  dateRange: { start_date: string; end_date: string } | "UNKNOWN";
  unknownFacts: string[];
  provenFacts?: string[];
}): GscSearchAnalyticsArtifact {
  return {
    status: args.status,
    fetched_at: new Date().toISOString(),
    property: args.property,
    date_range: args.dateRange,
    total_clicks: "UNKNOWN",
    total_impressions: "UNKNOWN",
    average_ctr: "UNKNOWN",
    average_position: "UNKNOWN",
    top_queries_by_clicks: "UNKNOWN",
    top_queries_by_impressions: "UNKNOWN",
    top_pages_by_clicks: "UNKNOWN",
    top_pages_by_impressions: "UNKNOWN",
    high_impression_low_click_opportunities: "UNKNOWN",
    proven_facts: args.provenFacts ?? [],
    unknown_facts: args.unknownFacts,
    provenance: {
      source: "google_search_console_api",
      scope: "https://www.googleapis.com/auth/webmasters.readonly",
      writer: "scripts/fetch-buckparts-gsc-artifact.ts",
    },
  };
}

export async function buildGscSearchAnalyticsArtifact(args?: {
  now?: Date;
  env?: Record<string, string | undefined>;
}): Promise<GscSearchAnalyticsArtifact> {
  const dateRange = buildDateRange(args?.now);
  const client = createSearchConsoleClientFromEnv({ env: args?.env });
  if (!client.ok) {
    return buildUnknownArtifact({
      status: "UNKNOWN_CONFIG",
      property: "UNKNOWN",
      dateRange,
      unknownFacts: [client.reason, ...client.log_safe_details],
    });
  }

  try {
    const accessToken = await client.getAccessToken();
    const [totals, queryRows, pageRows] = await Promise.all([
      queryTotals({
        accessToken,
        property: client.property,
        dateRange,
      }),
      queryDimension({
        accessToken,
        property: client.property,
        dateRange,
        dimension: "query",
      }),
      queryDimension({
        accessToken,
        property: client.property,
        dateRange,
        dimension: "page",
      }),
    ]);
    const averageCtr =
      totals.total_impressions > 0 ? totals.total_clicks / totals.total_impressions : ("UNKNOWN" as const);
    const topQueriesByClicks = toTopEntries(queryRows, "clicks");
    const topQueriesByImpressions = toTopEntries(queryRows, "impressions");
    const topPagesByClicks = toTopEntries(pageRows, "clicks");
    const topPagesByImpressions = toTopEntries(pageRows, "impressions");
    const opportunities = buildHighImpressionLowClickOpportunities({
      queryRows,
      totalImpressions: totals.total_impressions,
    });
    return {
      status: "OK",
      fetched_at: new Date().toISOString(),
      property: client.property,
      date_range: dateRange,
      total_clicks: totals.total_clicks,
      total_impressions: totals.total_impressions,
      average_ctr: averageCtr,
      average_position: totals.average_position,
      top_queries_by_clicks: topQueriesByClicks.length > 0 ? topQueriesByClicks : "UNKNOWN",
      top_queries_by_impressions: topQueriesByImpressions.length > 0 ? topQueriesByImpressions : "UNKNOWN",
      top_pages_by_clicks: topPagesByClicks.length > 0 ? topPagesByClicks : "UNKNOWN",
      top_pages_by_impressions: topPagesByImpressions.length > 0 ? topPagesByImpressions : "UNKNOWN",
      high_impression_low_click_opportunities: opportunities,
      proven_facts: [
        `Fetched Search Analytics via readonly API auth_mode=${client.auth_mode}.`,
        `Property=${client.property}.`,
        `Date range=${dateRange.start_date}..${dateRange.end_date}.`,
        `Totals clicks=${totals.total_clicks}, impressions=${totals.total_impressions}.`,
      ],
      unknown_facts: [],
      provenance: {
        source: "google_search_console_api",
        scope: "https://www.googleapis.com/auth/webmasters.readonly",
        writer: "scripts/fetch-buckparts-gsc-artifact.ts",
      },
    };
  } catch (error) {
    const diagnosticFacts = collectLogSafeFactsFromUnknown(error);
    return buildUnknownArtifact({
      status: "UNKNOWN_API_ERROR",
      property: client.property,
      dateRange,
      unknownFacts: [
        "Search Console API query failed.",
        "Verify property access for the configured service account and check API quota/availability.",
        ...diagnosticFacts,
      ],
      provenFacts: [`Configured property=${client.property}.`],
    });
  }
}

export async function runGscFetchJob(rootDir = process.cwd()): Promise<{
  output_path: string;
  artifact: GscSearchAnalyticsArtifact;
  durable_write:
    | { status: "OK"; sink: "SUPABASE"; details: string[] }
    | { status: "UNKNOWN_SUPABASE_WRITE"; details: string[] };
}> {
  loadEnv(rootDir);
  const artifact = await buildGscSearchAnalyticsArtifact();
  const outputPath = path.resolve(rootDir, "data/reports/buckparts-gsc-search-analytics.json");
  mkdirSync(path.dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
  const durableWrite = await writeGscArtifactToSupabase(artifact);
  return {
    output_path: outputPath,
    artifact,
    durable_write: durableWrite.ok
      ? { status: "OK", sink: durableWrite.sink, details: durableWrite.details }
      : { status: "UNKNOWN_SUPABASE_WRITE", details: durableWrite.details },
  };
}

export async function main(): Promise<void> {
  const result = await runGscFetchJob();
  process.stdout.write(
    `${JSON.stringify(
      {
        output_path: result.output_path,
        status: result.artifact.status,
        fetched_at: result.artifact.fetched_at,
        property: result.artifact.property,
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
    console.error("[fetch-buckparts-gsc-artifact] failed");
    process.exit(1);
  });
}
