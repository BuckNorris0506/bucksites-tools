import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

export type OwnerGscConnectionLevel = "BRIGHT" | "DIM" | "DARK" | "UNKNOWN";
export type OwnerGscSourceClass = "ARTIFACT" | "MANUAL" | "UNKNOWN";

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
  freshness_method: string;
  export_file_used: string | "UNKNOWN";
  export_date: string | "UNKNOWN";
  total_impressions: number | "UNKNOWN";
  total_clicks: number | "UNKNOWN";
  average_ctr: number | "UNKNOWN";
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
  getMtimeIso: (absPath: string) => string;
  unzipListEntries: (absPath: string) => string[];
  unzipReadEntry: (absPath: string, entry: string) => string;
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
    getMtimeIso: (absPath) => statSync(absPath).mtime.toISOString(),
    unzipListEntries: (absPath) =>
      execFileSync("unzip", ["-Z1", absPath], { encoding: "utf8" })
        .split(/\r?\n/)
        .map((s) => s.trim())
        .filter(Boolean),
    unzipReadEntry: (absPath, entry) =>
      execFileSync("unzip", ["-p", absPath, entry], { encoding: "utf8", maxBuffer: 8 * 1024 * 1024 }),
  };
}

function parseDateFromFilename(file: string): string | "UNKNOWN" {
  const m = file.match(/(\d{4}-\d{2}-\d{2})/);
  return m?.[1] ?? "UNKNOWN";
}

export function buildOwnerGscExternalDemandNeuron(args: {
  rootDir: string;
  deps?: Partial<Deps>;
}): OwnerGscExternalDemandNeuron {
  const deps = { ...defaultDeps(), ...(args.deps ?? {}) };
  const gscDir = path.resolve(args.rootDir, "data/gsc");
  const provenFacts: string[] = [];
  const unknownFacts: string[] = [];

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
      connection_level: "DARK",
      source_class: "UNKNOWN",
      freshness_method: "No local GSC performance export file found under data/gsc.",
      export_file_used: "UNKNOWN",
      export_date: "UNKNOWN",
      total_impressions: "UNKNOWN",
      total_clicks: "UNKNOWN",
      average_ctr: "UNKNOWN",
      top_queries_by_impressions: "UNKNOWN",
      top_queries_by_clicks: "UNKNOWN",
      top_pages_by_impressions: "UNKNOWN",
      top_pages_by_clicks: "UNKNOWN",
      high_impression_low_click_opportunities: "UNKNOWN",
      proven_facts: [],
      unknown_facts: ["No GSC performance export file is available locally."],
      next_owner_action: "Export a fresh GSC Performance report to data/gsc before using external demand for prioritization.",
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
      source_class: "ARTIFACT",
      freshness_method: "Local artifact exists but could not be parsed.",
      export_file_used: `data/gsc/${file}`,
      export_date: parseDateFromFilename(file),
      total_impressions: "UNKNOWN",
      total_clicks: "UNKNOWN",
      average_ctr: "UNKNOWN",
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
      source_class: "ARTIFACT",
      freshness_method: "Local artifact exists but schema/headers are unsupported for this parser.",
      export_file_used: `data/gsc/${file}`,
      export_date: parseDateFromFilename(file),
      total_impressions: "UNKNOWN",
      total_clicks: "UNKNOWN",
      average_ctr: "UNKNOWN",
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
      source_class: "ARTIFACT",
      freshness_method: "Performance export parsed but rows lack complete clicks/impressions values.",
      export_file_used: `data/gsc/${file}`,
      export_date: parseDateFromFilename(file),
      total_impressions: "UNKNOWN",
      total_clicks: "UNKNOWN",
      average_ctr: "UNKNOWN",
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

  return {
    neuron_key: "gsc_external_demand",
    connection_level: "BRIGHT",
    source_class: "ARTIFACT",
    freshness_method: "Parsed local GSC performance export artifact at owner-dashboard request time.",
    export_file_used: `data/gsc/${file}`,
    export_date: parseDateFromFilename(file),
    total_impressions: totalImpressions,
    total_clicks: totalClicks,
    average_ctr: averageCtr,
    top_queries_by_impressions: topQueriesByImpressions.length > 0 ? topQueriesByImpressions : "UNKNOWN",
    top_queries_by_clicks: topQueriesByClicks.length > 0 ? topQueriesByClicks : "UNKNOWN",
    top_pages_by_impressions: topPagesByImpressions.length > 0 ? topPagesByImpressions : "UNKNOWN",
    top_pages_by_clicks: topPagesByClicks.length > 0 ? topPagesByClicks : "UNKNOWN",
    high_impression_low_click_opportunities: opportunities.length > 0 ? opportunities : "UNKNOWN",
    proven_facts: provenFacts,
    unknown_facts: unknownFacts,
    next_owner_action:
      opportunities.length > 0
        ? "Prioritize high-impression/low-click query opportunities for title/snippet and landing-page relevance work."
        : "Use top query/page demand signals to prioritize content expansion and maintain fresh GSC exports weekly.",
  };
}
