import { HOMEKEEP_WEDGE_CATALOG, wedgeCatalogsForGapQuery } from "@/lib/catalog/identity";
import { loadEnv } from "./lib/load-env";
import { getSupabaseAdmin } from "./lib/supabase-admin";

function parseArgNumber(flag: string, fallback: number): number {
  const idx = process.argv.indexOf(flag);
  if (idx === -1) return fallback;
  const raw = process.argv[idx + 1];
  const n = raw ? Number.parseInt(raw, 10) : Number.NaN;
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function compact(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function extractModelLikeToken(q: string): string | null {
  const toks = q
    .toUpperCase()
    .split(/[^A-Z0-9]+/)
    .map((t) => t.trim())
    .filter(Boolean);
  const hit = toks.find((t) => /[A-Z]/.test(t) && /\d/.test(t) && t.length >= 7 && t.length <= 18);
  return hit ?? null;
}

async function main() {
  loadEnv();
  const supabase = getSupabaseAdmin();
  const limit = parseArgNumber("--limit", 100);

  const { data: brands, error: bErr } = await supabase.from("brands").select("slug, name");
  if (bErr) throw bErr;
  const brandList = (brands ?? []) as Array<{ slug: string; name: string }>;

  const { data: gaps, error } = await supabase
    .from("search_gaps")
    .select("id, catalog, sample_raw_query, normalized_query, search_count, zero_result_count, likely_entity_type, status, last_seen_at")
    .in("status", ["open", "reviewing", "queued"])
    .in("catalog", wedgeCatalogsForGapQuery(HOMEKEEP_WEDGE_CATALOG.refrigerator_water))
    .order("search_count", { ascending: false })
    .order("zero_result_count", { ascending: false })
    .limit(limit);
  if (error) throw error;

  const rows = [];
  for (const row of gaps ?? []) {
    const r = row as {
      id: number;
      catalog: string;
      sample_raw_query: string;
      normalized_query: string;
      search_count: number;
      zero_result_count: number;
      likely_entity_type: string;
      status: string;
      last_seen_at: string;
    };
    const query = r.sample_raw_query ?? "";
    const modelToken = extractModelLikeToken(query);
    if (!modelToken && r.likely_entity_type !== "model") continue;

    const inferredBrand =
      brandList.find((b) => compact(query).includes(compact(b.slug)))?.slug ??
      brandList.find((b) => compact(query).includes(compact(b.name)))?.slug ??
      null;

    const { data: liveModels, error: liveErr } = await supabase
      .from("fridge_models")
      .select("id, model_number, brands:brand_id(slug)")
      .ilike("model_number", modelToken ?? "")
      .limit(20);
    if (liveErr) throw liveErr;
    const liveExact = ((liveModels ?? []) as Array<{
      id: string;
      model_number: string;
      brands?: { slug: string } | null;
    }>).filter((m) => m.model_number.toUpperCase() === (modelToken ?? "").toUpperCase());
    const liveByBrand = inferredBrand
      ? liveExact.filter((m) => (m.brands?.slug ?? "").toLowerCase() === inferredBrand.toLowerCase())
      : liveExact;
    const liveExists = (liveByBrand.length > 0 ? liveByBrand : liveExact).length > 0;

    const { data: staged, error: stagedErr } = await supabase
      .from("staged_model_additions")
      .select("id, status, proposed_model_number, proposed_brand_slug")
      .ilike("proposed_model_number", modelToken ?? "")
      .limit(20);
    if (stagedErr) throw stagedErr;
    const stagedExact = ((staged ?? []) as Array<{
      id: number;
      status: string;
      proposed_model_number: string;
      proposed_brand_slug: string | null;
    }>).filter((s) => s.proposed_model_number.toUpperCase() === (modelToken ?? "").toUpperCase());
    const stagedByBrand = inferredBrand
      ? stagedExact.filter((s) => (s.proposed_brand_slug ?? "").toLowerCase() === inferredBrand.toLowerCase())
      : stagedExact;
    const stagedExists = (stagedByBrand.length > 0 ? stagedByBrand : stagedExact).length > 0;

    rows.push({
      search_gap_id: r.id,
      catalog: r.catalog,
      query: r.sample_raw_query,
      normalized_query: r.normalized_query,
      search_count: r.search_count,
      zero_result_count: r.zero_result_count,
      inferred_brand_slug: inferredBrand,
      inferred_model_number: modelToken,
      live_model_exists: liveExists,
      staged_model_exists: stagedExists,
      status: r.status,
      last_seen_at: r.last_seen_at,
    });
  }

  const ranked = rows.sort((a, b) => {
    const aMissing = Number(!a.live_model_exists && !a.staged_model_exists);
    const bMissing = Number(!b.live_model_exists && !b.staged_model_exists);
    if (bMissing !== aMissing) return bMissing - aMissing;
    if (b.search_count !== a.search_count) return b.search_count - a.search_count;
    return b.zero_result_count - a.zero_result_count;
  });

  console.log(
    JSON.stringify(
      {
        generated_at: new Date().toISOString(),
        scope: "refrigerator_water_plus_global_queries",
        total_rows: ranked.length,
        rows: ranked,
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error("[report-model-priority-refrigerator] failed", err);
  process.exit(1);
});
