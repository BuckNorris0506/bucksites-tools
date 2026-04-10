import { loadEnv } from "./lib/load-env";
import { getSupabaseAdmin } from "./lib/supabase-admin";

type GapRollupRow = {
  catalog: string;
  normalized_query: string;
  sample_raw_query: string;
  searches: number;
  zero_results: number;
  low_results: number;
  avg_results: number;
  last_seen_at: string;
};

function parseArgNumber(flag: string, fallback: number): number {
  const idx = process.argv.indexOf(flag);
  if (idx === -1) return fallback;
  const raw = process.argv[idx + 1];
  const n = raw ? Number.parseInt(raw, 10) : Number.NaN;
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

async function main() {
  loadEnv();
  const supabase = getSupabaseAdmin();

  const limit = parseArgNumber("--limit", 50);
  const days = parseArgNumber("--days", 30);
  const lowThreshold = parseArgNumber("--low-threshold", 3);
  const includeLow = process.argv.includes("--include-low");
  const sinceIso = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from("search_events")
    .select("catalog, normalized_query, raw_query, results_count, created_at")
    .gte("created_at", sinceIso)
    .order("created_at", { ascending: false })
    .limit(20000);

  if (error) throw error;

  const grouped = new Map<string, GapRollupRow>();
  for (const row of data ?? []) {
    const catalog = String(row.catalog ?? "");
    const normalizedQuery = String(row.normalized_query ?? "");
    if (!catalog || !normalizedQuery) continue;
    const k = `${catalog}::${normalizedQuery}`;
    const resultsCount = Number(row.results_count ?? 0);
    const createdAt = String(row.created_at ?? new Date(0).toISOString());
    const sampleRawQuery = String(row.raw_query ?? normalizedQuery);
    const cur = grouped.get(k);
    if (!cur) {
      grouped.set(k, {
        catalog,
        normalized_query: normalizedQuery,
        sample_raw_query: sampleRawQuery,
        searches: 1,
        zero_results: resultsCount === 0 ? 1 : 0,
        low_results: resultsCount > 0 && resultsCount <= lowThreshold ? 1 : 0,
        avg_results: resultsCount,
        last_seen_at: createdAt,
      });
      continue;
    }
    cur.searches += 1;
    cur.zero_results += resultsCount === 0 ? 1 : 0;
    cur.low_results += resultsCount > 0 && resultsCount <= lowThreshold ? 1 : 0;
    cur.avg_results = (cur.avg_results * (cur.searches - 1) + resultsCount) / cur.searches;
    if (createdAt > cur.last_seen_at) {
      cur.last_seen_at = createdAt;
      cur.sample_raw_query = sampleRawQuery;
    }
  }

  const ranked = Array.from(grouped.values())
    .filter((r) => r.zero_results > 0 || (includeLow && r.low_results > 0))
    .sort((a, b) => {
      if (b.zero_results !== a.zero_results) return b.zero_results - a.zero_results;
      if (b.low_results !== a.low_results) return b.low_results - a.low_results;
      if (b.searches !== a.searches) return b.searches - a.searches;
      return b.last_seen_at.localeCompare(a.last_seen_at);
    })
    .slice(0, limit);

  const output = ranked.map((r) => ({
    catalog: r.catalog,
    normalized_query: r.normalized_query,
    sample_raw_query: r.sample_raw_query,
    searches: r.searches,
    zero_results: r.zero_results,
    low_results: r.low_results,
    avg_results: Number(r.avg_results.toFixed(2)),
    last_seen_at: r.last_seen_at,
  }));

  console.log(
    JSON.stringify(
      {
        generated_at: new Date().toISOString(),
        days,
        low_threshold: lowThreshold,
        include_low_results: includeLow,
        total_ranked: output.length,
        rows: output,
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error("[search-gaps-rank] failed", err);
  process.exit(1);
});
