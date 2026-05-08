import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { parseGscSearchAnalyticsArtifact } from "@/lib/owner-dashboard/gsc-api-artifact";
import { readGscArtifactFromSupabase } from "@/lib/owner-dashboard/gsc-durable-artifact-store";

export type OwnerGscConnectionLevel = "BRIGHT" | "DIM" | "DARK" | "UNKNOWN";
export type OwnerGscSourceClass = "ARTIFACT" | "MANUAL" | "UNKNOWN";
export type OwnerGscArtifactSource = "SUPABASE" | "LOCAL_ARTIFACT" | "MANUAL_EXPORT" | "NONE";
export type OwnerGscLaneStatus = "OK" | "UNKNOWN_CONFIG" | "UNKNOWN_API_ERROR" | "UNKNOWN";

export type OwnerGscDemandRow = {
  query: string | null;
  page: string | null;
  clicks: number | null;
  impressions: number | null;
};

export type OwnerGscTopEntry = {
  key: string;
  impressions: number;
  clicks: number;
  ctr: number | "UNKNOWN";
};

export type OwnerGscExternalDemandNeuron = {
  neuron_key: "gsc_external_demand";
  connection_level: OwnerGscConnectionLevel;
  source_class: OwnerGscSourceClass;
  artifact_source: OwnerGscArtifactSource;
  fetched_at: string | "UNKNOWN";
  status: OwnerGscLaneStatus;
  freshness_method: string;
  export_file_used: string | "UNKNOWN";
  export_date: string | "UNKNOWN";
  total_impressions: number | "UNKNOWN";
  total_clicks: number | "UNKNOWN";
  average_ctr: number | "UNKNOWN";
  average_position: number | "UNKNOWN";
  top_queries_by_impressions: OwnerGscTopEntry[] | "UNKNOWN";
  top_queries_by_clicks: OwnerGscTopEntry[] | "UNKNOWN";
  top_pages_by_impressions: OwnerGscTopEntry[] | "UNKNOWN";
  top_pages_by_clicks: OwnerGscTopEntry[] | "UNKNOWN";
  high_impression_low_click_opportunities: OwnerGscTopEntry[] | "UNKNOWN";
  proven_facts: string[];
  unknown_facts: string[];
  next_owner_action: string;
};

type Deps = {
  listFiles: (dir: string) => string[];
  readTextFile: (absPath: string) => string;
  fileExists: (absPath: string) => boolean;
  getMtimeIso: (absPath: string) => string;
  unzipListEntries: (absPath: string) => string[];
  unzipReadEntry: (absPath: string, entry: string) => string;
  readSupabaseArtifact: () => Promise<
    | { ok: true; artifactText: string; fetchedAt: string }
    | { ok: false; reason: "MISSING_CONFIG" | "NOT_FOUND" | "READ_ERROR"; details: string[] }
  >;
};

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    const next = i + 1 < line.length ? line[i + 1] : "";
    if (ch === '"') {
      if (inQuotes && next === '"') {
        cur += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === "," && !inQuotes) {
      out.push(cur);
      cur = "";
      continue;
    }
    cur += ch;
  }
  out.push(cur);
  return out;
}

function parseNumberCell(raw: string | undefined): number | null {
  if (typeof raw !== "string") return null;
  const normalized = raw.trim().replace(/,/g, "");
  if (!normalized) return null;
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase().replace(/\s+/g, "_");
}

export function parseGscPerformanceCsv(text: string): {
  ok: boolean;
  rows: OwnerGscDemandRow[];
  reason?: string;
} {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  if (lines.length < 2) {
    return { ok: false, rows: [], reason: "CSV has no data rows." };
  }
  const headers = parseCsvLine(lines[0]).map(normalizeHeader);
  const idx = {
    query: headers.indexOf("query"),
    page: headers.indexOf("page"),
    clicks: headers.indexOf("clicks"),
    impressions: headers.indexOf("impressions"),
  };
  if (idx.clicks < 0 || idx.impressions < 0 || (idx.query < 0 && idx.page < 0)) {
    return {
      ok: false,
      rows: [],
      reason: "CSV headers unsupported (need clicks/impressions and query or page).",
    };
  }
  const rows: OwnerGscDemandRow[] = [];
  for (let i = 1; i < lines.length; i += 1) {
    const cells = parseCsvLine(lines[i]);
    rows.push({
      query: idx.query >= 0 ? (cells[idx.query] ?? "").trim() || null : null,
      page: idx.page >= 0 ? (cells[idx.page] ?? "").trim() || null : null,
      clicks: parseNumberCell(cells[idx.clicks]),
      impressions: parseNumberCell(cells[idx.impressions]),
    });
  }
  return { ok: true, rows };
}

function toTopEntries(
  rows: OwnerGscDemandRow[],
  keySelector: (r: OwnerGscDemandRow) => string | null,
  sortBy: "impressions" | "clicks",
): OwnerGscTopEntry[] {
  const aggregate = new Map<string, { impressions: number; clicks: number }>();
  for (const row of rows) {
    const key = keySelector(row);
    if (!key) continue;
    if (row.impressions == null || row.clicks == null) continue;
    const prev = aggregate.get(key) ?? { impressions: 0, clicks: 0 };
    prev.impressions += row.impressions;
    prev.clicks += row.clicks;
    aggregate.set(key, prev);
  }
  return Array.from(aggregate.entries())
    .map(([key, v]) => ({
      key,
      impressions: v.impressions,
      clicks: v.clicks,
      ctr: v.impressions > 0 ? v.clicks / v.impressions : ("UNKNOWN" as const),
    }))
    .sort((a, b) =>
      sortBy === "impressions" ? b.impressions - a.impressions || b.clicks - a.clicks : b.clicks - a.clicks || b.impressions - a.impressions,
    )
    .slice(0, 10);
}

function defaultDeps(): Deps {
  return {
    listFiles: (dir) => readdirSync(dir),
    readTextFile: (absPath) => readFileSync(absPath, "utf8"),
    fileExists: (absPath) => existsSync(absPath),
    getMtimeIso: (absPath) => statSync(absPath).mtime.toISOString(),
    unzipListEntries: (absPath) =>
      execFileSync("unzip", ["-Z1", absPath], { encoding: "utf8" })
        .split(/\r?\n/)
        .map((s) => s.trim())
        .filter(Boolean),
    unzipReadEntry: (absPath, entry) =>
      execFileSync("unzip", ["-p", absPath, entry], { encoding: "utf8", maxBuffer: 8 * 1024 * 1024 }),
    readSupabaseArtifact: async () => {
      const read = await readGscArtifactFromSupabase();
      if (!read.ok) {
        return { ok: false, reason: read.reason, details: read.details };
      }
      return {
        ok: true,
        artifactText: JSON.stringify(read.artifact),
        fetchedAt: read.artifact.fetched_at,
      };
    },
  };
}

function parseDateFromFilename(file: string): string | "UNKNOWN" {
  const m = file.match(/(\d{4}-\d{2}-\d{2})/);
  return m?.[1] ?? "UNKNOWN";
}

export async function buildOwnerGscExternalDemandNeuron(args: {
  rootDir: string;
  deps?: Partial<Deps>;
}): Promise<OwnerGscExternalDemandNeuron> {
  const deps = { ...defaultDeps(), ...(args.deps ?? {}) };
  const apiArtifactPath = path.resolve(args.rootDir, "data/reports/buckparts-gsc-search-analytics.json");
  const gscDir = path.resolve(args.rootDir, "data/gsc");
  const provenFacts: string[] = [];
  const unknownFacts: string[] = [];
  let durableStoreIssue: string | null = null;
  let apiArtifactIssue: string | null = null;

  const supabaseArtifact = await deps.readSupabaseArtifact();
  if (supabaseArtifact.ok) {
    const parsed = parseGscSearchAnalyticsArtifact(supabaseArtifact.artifactText);
    if (parsed.ok && parsed.artifact.status === "OK") {
      const artifact = parsed.artifact;
      return {
        neuron_key: "gsc_external_demand",
        connection_level: "BRIGHT",
        source_class: "ARTIFACT",
        artifact_source: "SUPABASE",
        fetched_at: artifact.fetched_at,
        status: artifact.status,
        freshness_method: "Reads durable Supabase artifact first; no live GSC API call in owner-dashboard runtime.",
        export_file_used: "supabase.owner_report_artifacts[gsc_search_analytics]",
        export_date: artifact.date_range === "UNKNOWN" ? "UNKNOWN" : artifact.date_range.end_date,
        total_impressions: artifact.total_impressions,
        total_clicks: artifact.total_clicks,
        average_ctr: artifact.average_ctr,
        average_position: artifact.average_position,
        top_queries_by_impressions: artifact.top_queries_by_impressions,
        top_queries_by_clicks: artifact.top_queries_by_clicks,
        top_pages_by_impressions: artifact.top_pages_by_impressions,
        top_pages_by_clicks: artifact.top_pages_by_clicks,
        high_impression_low_click_opportunities: artifact.high_impression_low_click_opportunities,
        proven_facts: [
          ...artifact.proven_facts,
          `Durable artifact fetched_at=${artifact.fetched_at}.`,
        ],
        unknown_facts: artifact.unknown_facts,
        next_owner_action:
          artifact.high_impression_low_click_opportunities !== "UNKNOWN" &&
          artifact.high_impression_low_click_opportunities.length > 0
            ? "Prioritize high-impression/low-click query opportunities for title/snippet and landing-page relevance work."
            : "Maintain scheduled GSC artifact refresh and use top query/page demand signals to prioritize content work.",
      };
    }
    if (parsed.ok && parsed.artifact.status !== "OK") {
      durableStoreIssue = `Supabase durable artifact status is ${parsed.artifact.status}.`;
    } else if (!parsed.ok) {
      durableStoreIssue = `Supabase durable artifact parse failed: ${parsed.reason}`;
    }
  } else if (supabaseArtifact.reason === "READ_ERROR") {
    durableStoreIssue = `Supabase durable artifact read failed: ${supabaseArtifact.details.join(" ")}`;
  } else if (supabaseArtifact.reason === "MISSING_CONFIG") {
    durableStoreIssue = "Supabase durable artifact config is missing in this runtime.";
  }

  if (deps.fileExists(apiArtifactPath)) {
    try {
      const parsedArtifact = parseGscSearchAnalyticsArtifact(deps.readTextFile(apiArtifactPath));
      if (parsedArtifact.ok && parsedArtifact.artifact.status === "OK") {
        const artifact = parsedArtifact.artifact;
        return {
          neuron_key: "gsc_external_demand",
          connection_level: "BRIGHT",
          source_class: "ARTIFACT",
          artifact_source: "LOCAL_ARTIFACT",
          fetched_at: artifact.fetched_at,
          status: artifact.status,
          freshness_method: "Reads scheduled GSC API artifact first; no live API call in owner-dashboard runtime.",
          export_file_used: "data/reports/buckparts-gsc-search-analytics.json",
          export_date: artifact.date_range === "UNKNOWN" ? "UNKNOWN" : artifact.date_range.end_date,
          total_impressions: artifact.total_impressions,
          total_clicks: artifact.total_clicks,
          average_ctr: artifact.average_ctr,
          average_position: artifact.average_position,
          top_queries_by_impressions: artifact.top_queries_by_impressions,
          top_queries_by_clicks: artifact.top_queries_by_clicks,
          top_pages_by_impressions: artifact.top_pages_by_impressions,
          top_pages_by_clicks: artifact.top_pages_by_clicks,
          high_impression_low_click_opportunities: artifact.high_impression_low_click_opportunities,
          proven_facts: [
            ...artifact.proven_facts,
            `Artifact fetched_at=${artifact.fetched_at}.`,
            ...(durableStoreIssue ? [`Supabase durable artifact unavailable: ${durableStoreIssue}`] : []),
          ],
          unknown_facts: artifact.unknown_facts,
          next_owner_action:
            artifact.high_impression_low_click_opportunities !== "UNKNOWN" &&
            artifact.high_impression_low_click_opportunities.length > 0
              ? "Prioritize high-impression/low-click query opportunities for title/snippet and landing-page relevance work."
              : "Maintain scheduled GSC API artifact refresh and use top query/page demand signals to prioritize content work.",
        };
      }
      if (parsedArtifact.ok && parsedArtifact.artifact.status !== "OK") {
        apiArtifactIssue = `Scheduled GSC API artifact status is ${parsedArtifact.artifact.status}.`;
      } else if (!parsedArtifact.ok) {
        apiArtifactIssue = `Scheduled GSC API artifact parse failed: ${parsedArtifact.reason}`;
      }
    } catch {
      apiArtifactIssue = "Scheduled GSC API artifact exists but could not be read.";
    }
  }

  let gscFiles: string[] = [];
  try {
    gscFiles = deps.listFiles(gscDir);
  } catch {
    gscFiles = [];
  }

  const performanceCandidates = gscFiles
    .filter((f) => /performance-on-search/i.test(f) && (f.endsWith(".zip") || f.endsWith(".csv")))
    .sort((a, b) => b.localeCompare(a));

  if (performanceCandidates.length === 0) {
    return {
      neuron_key: "gsc_external_demand",
      connection_level: apiArtifactIssue || durableStoreIssue ? "UNKNOWN" : "DARK",
      source_class: "UNKNOWN",
      artifact_source: "NONE",
      fetched_at: "UNKNOWN",
      status: "UNKNOWN",
      freshness_method:
        apiArtifactIssue || durableStoreIssue
          ? "Durable/local artifacts are unusable and no local manual export fallback is available."
          : "No local GSC performance export file found under data/gsc.",
      export_file_used: "UNKNOWN",
      export_date: "UNKNOWN",
      total_impressions: "UNKNOWN",
      total_clicks: "UNKNOWN",
      average_ctr: "UNKNOWN",
      average_position: "UNKNOWN",
      top_queries_by_impressions: "UNKNOWN",
      top_queries_by_clicks: "UNKNOWN",
      top_pages_by_impressions: "UNKNOWN",
      top_pages_by_clicks: "UNKNOWN",
      high_impression_low_click_opportunities: "UNKNOWN",
      proven_facts: [],
      unknown_facts: [
        ...(durableStoreIssue ? [durableStoreIssue] : []),
        ...(apiArtifactIssue ? [apiArtifactIssue] : []),
        "No GSC performance export file is available locally.",
      ],
      next_owner_action: apiArtifactIssue || durableStoreIssue
        ? "Fix durable/local scheduled GSC artifact generation or place a valid manual GSC performance export under data/gsc."
        : "Export a fresh GSC Performance report to data/gsc before using external demand for prioritization.",
    };
  }

  const file = performanceCandidates[0];
  const abs = path.resolve(gscDir, file);
  let csvText: string | null = null;

  try {
    if (file.endsWith(".csv")) {
      csvText = deps.readTextFile(abs);
    } else {
      const entries = deps.unzipListEntries(abs);
      const csvEntry = entries.find((e) => e.toLowerCase().endsWith(".csv")) ?? null;
      if (!csvEntry) {
        unknownFacts.push("Performance ZIP exists but contains no CSV entry.");
      } else {
        csvText = deps.unzipReadEntry(abs, csvEntry);
        provenFacts.push(`Parsed CSV entry from ZIP: ${csvEntry}`);
      }
    }
  } catch (error) {
    unknownFacts.push(`Could not read performance export: ${error instanceof Error ? error.message : "UNKNOWN"}.`);
  }

  if (!csvText) {
    return {
      neuron_key: "gsc_external_demand",
      connection_level: "UNKNOWN",
      source_class: "MANUAL",
      artifact_source: "MANUAL_EXPORT",
      fetched_at: "UNKNOWN",
      status: "UNKNOWN",
      freshness_method: "Local artifact exists but could not be parsed.",
      export_file_used: `data/gsc/${file}`,
      export_date: parseDateFromFilename(file),
      total_impressions: "UNKNOWN",
      total_clicks: "UNKNOWN",
      average_ctr: "UNKNOWN",
      average_position: "UNKNOWN",
      top_queries_by_impressions: "UNKNOWN",
      top_queries_by_clicks: "UNKNOWN",
      top_pages_by_impressions: "UNKNOWN",
      top_pages_by_clicks: "UNKNOWN",
      high_impression_low_click_opportunities: "UNKNOWN",
      proven_facts: provenFacts,
      unknown_facts: unknownFacts.length > 0 ? unknownFacts : ["Performance export text is unavailable after read."],
      next_owner_action: "Regenerate the GSC performance export in CSV-compatible format and place it under data/gsc.",
    };
  }

  const parsed = parseGscPerformanceCsv(csvText);
  if (!parsed.ok) {
    return {
      neuron_key: "gsc_external_demand",
      connection_level: "UNKNOWN",
      source_class: "MANUAL",
      artifact_source: "MANUAL_EXPORT",
      fetched_at: "UNKNOWN",
      status: "UNKNOWN",
      freshness_method: "Local artifact exists but schema/headers are unsupported for this parser.",
      export_file_used: `data/gsc/${file}`,
      export_date: parseDateFromFilename(file),
      total_impressions: "UNKNOWN",
      total_clicks: "UNKNOWN",
      average_ctr: "UNKNOWN",
      average_position: "UNKNOWN",
      top_queries_by_impressions: "UNKNOWN",
      top_queries_by_clicks: "UNKNOWN",
      top_pages_by_impressions: "UNKNOWN",
      top_pages_by_clicks: "UNKNOWN",
      high_impression_low_click_opportunities: "UNKNOWN",
      proven_facts: provenFacts,
      unknown_facts: [...unknownFacts, parsed.reason ?? "Unsupported CSV format."],
      next_owner_action: "Adjust export format to include query/page with clicks and impressions columns.",
    };
  }

  const completeRows = parsed.rows.filter((r) => r.clicks != null && r.impressions != null);
  if (completeRows.length === 0) {
    return {
      neuron_key: "gsc_external_demand",
      connection_level: "DIM",
      source_class: "MANUAL",
      artifact_source: "MANUAL_EXPORT",
      fetched_at: deps.getMtimeIso(abs),
      status: "UNKNOWN",
      freshness_method: "Performance export parsed but rows lack complete clicks/impressions values.",
      export_file_used: `data/gsc/${file}`,
      export_date: parseDateFromFilename(file),
      total_impressions: "UNKNOWN",
      total_clicks: "UNKNOWN",
      average_ctr: "UNKNOWN",
      average_position: "UNKNOWN",
      top_queries_by_impressions: "UNKNOWN",
      top_queries_by_clicks: "UNKNOWN",
      top_pages_by_impressions: "UNKNOWN",
      top_pages_by_clicks: "UNKNOWN",
      high_impression_low_click_opportunities: "UNKNOWN",
      proven_facts: [...provenFacts, `Parsed ${parsed.rows.length} rows from performance export.`],
      unknown_facts: [...unknownFacts, "No rows contain both clicks and impressions values."],
      next_owner_action: "Regenerate export with complete numeric clicks/impressions columns and re-run owner dashboard.",
    };
  }

  const totalImpressions = completeRows.reduce((n, r) => n + (r.impressions ?? 0), 0);
  const totalClicks = completeRows.reduce((n, r) => n + (r.clicks ?? 0), 0);
  const averageCtr = totalImpressions > 0 ? totalClicks / totalImpressions : "UNKNOWN";
  const topQueriesByImpressions = toTopEntries(completeRows, (r) => r.query, "impressions");
  const topQueriesByClicks = toTopEntries(completeRows, (r) => r.query, "clicks");
  const topPagesByImpressions = toTopEntries(completeRows, (r) => r.page, "impressions");
  const topPagesByClicks = toTopEntries(completeRows, (r) => r.page, "clicks");
  const opportunities = topQueriesByImpressions
    .filter((q) => q.impressions >= 100 && q.clicks <= 1)
    .slice(0, 10);

  provenFacts.push(`Parsed ${completeRows.length} complete rows from ${file}.`);
  provenFacts.push(`File modified at ${deps.getMtimeIso(abs)}.`);
  provenFacts.push(`total_impressions=${totalImpressions}, total_clicks=${totalClicks}.`);
  if (apiArtifactIssue) {
    unknownFacts.push(apiArtifactIssue);
    provenFacts.push("Manual export parser fallback was used after API artifact was unavailable/invalid.");
  }

  return {
    neuron_key: "gsc_external_demand",
    connection_level: "BRIGHT",
    source_class: "MANUAL",
    artifact_source: "MANUAL_EXPORT",
    fetched_at: deps.getMtimeIso(abs),
    status: "OK",
    freshness_method: "Parsed local GSC performance export artifact at owner-dashboard request time (manual fallback).",
    export_file_used: `data/gsc/${file}`,
    export_date: parseDateFromFilename(file),
    total_impressions: totalImpressions,
    total_clicks: totalClicks,
    average_ctr: averageCtr,
    average_position: "UNKNOWN",
    top_queries_by_impressions: topQueriesByImpressions.length > 0 ? topQueriesByImpressions : "UNKNOWN",
    top_queries_by_clicks: topQueriesByClicks.length > 0 ? topQueriesByClicks : "UNKNOWN",
    top_pages_by_impressions: topPagesByImpressions.length > 0 ? topPagesByImpressions : "UNKNOWN",
    top_pages_by_clicks: topPagesByClicks.length > 0 ? topPagesByClicks : "UNKNOWN",
    high_impression_low_click_opportunities: opportunities.length > 0 ? opportunities : "UNKNOWN",
    proven_facts: provenFacts,
    unknown_facts: [...(durableStoreIssue ? [durableStoreIssue] : []), ...unknownFacts],
    next_owner_action:
      opportunities.length > 0
        ? "Prioritize high-impression/low-click query opportunities for title/snippet and landing-page relevance work."
        : "Use top query/page demand signals to prioritize content expansion and maintain fresh GSC exports weekly.",
  };
}
