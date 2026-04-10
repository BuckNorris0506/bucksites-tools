import { HOMEKEEP_WEDGE_CATALOG } from "@/lib/catalog/identity";
import { loadEnv } from "./lib/load-env";
import { getSupabaseAdmin } from "./lib/supabase-admin";

function parseArgNumber(flag: string, fallback: number): number {
  const idx = process.argv.indexOf(flag);
  if (idx === -1) return fallback;
  const raw = process.argv[idx + 1];
  const n = raw ? Number.parseInt(raw, 10) : Number.NaN;
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function asText(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length > 0 ? t : null;
}

function compact(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function extractOemTokens(query: string): string[] {
  return query
    .toUpperCase()
    .split(/[^A-Z0-9/-]+/)
    .map((x) => x.trim())
    .filter((x) => x.length >= 4)
    .filter((x) => /^(XWFE|RPWFE|XWF|MWF|ULTRAWF|HAF-QIN\/EXP|UKF|LT|EDR|HAF|DA|WF|CF)/.test(x) || (/[A-Z]/.test(x) && /\d/.test(x)));
}

function scoreOem(oem: string, sourceQuery: string, brandMatch: boolean): number {
  const q = compact(sourceQuery);
  const p = compact(oem);
  let score = 0;
  if (q.includes(p)) score += 75;
  if (brandMatch) score += 15;
  if (/^(XWFE|RPWFE|XWF|MWF|ULTRAWF|HAF|UKF|LT|EDR|DA|WF|CF)/i.test(oem)) score += 10;
  return score;
}

function scoreAlias(alias: string, sourceQuery: string): number {
  const q = compact(sourceQuery);
  const a = compact(alias);
  if (!a || !q) return 0;
  if (q.includes(a)) return 85;
  return a.length >= 5 && q.includes(a.slice(0, 5)) ? 25 : 0;
}

async function main() {
  loadEnv();
  const supabase = getSupabaseAdmin();
  const limit = parseArgNumber("--limit", 100);
  const top = parseArgNumber("--top", 6);

  const { data: rows, error } = await supabase
    .from("staged_compatibility_mapping_additions")
    .select("id, catalog, status, model_id, part_id, payload_json, created_at")
    .eq("catalog", HOMEKEEP_WEDGE_CATALOG.refrigerator_water)
    .eq("status", "reviewing")
    .eq("part_id", "pending_part_lookup")
    .order("created_at", { ascending: true })
    .limit(limit);
  if (error) throw error;

  const stagedRows = (rows ?? []) as Array<{
    id: number;
    model_id: string;
    payload_json: Record<string, unknown>;
    created_at: string;
  }>;

  const output = [];
  for (const row of stagedRows) {
    // Require real model UUID by shape and presence.
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(row.model_id)) {
      continue;
    }

    const payload = row.payload_json ?? {};
    const sourceQuery = asText(payload.source_query) ?? "";
    const inferredBrand = asText(payload.inferred_brand_slug);
    const oemTokens = extractOemTokens(sourceQuery);

    const { data: modelData, error: modelErr } = await supabase
      .from("fridge_models")
      .select("id, model_number, brands:brand_id(slug,name)")
      .eq("id", row.model_id)
      .limit(1);
    if (modelErr) throw modelErr;
    const model = (modelData ?? [])[0] as
      | { id: string; model_number: string; brands?: { slug: string; name: string } | null }
      | undefined;

    const { data: filters, error: filterErr } = await supabase
      .from("filters")
      .select("id, slug, oem_part_number, brands:brand_id(slug,name)")
      .limit(1200);
    if (filterErr) throw filterErr;

    const oemCandidates = ((filters ?? []) as Array<{
      id: string;
      slug: string;
      oem_part_number: string;
      brands?: { slug: string; name: string } | null;
    }>)
      .map((f) => {
        const brandSlug = f.brands?.slug ?? null;
        const brandMatch = Boolean(inferredBrand && brandSlug && brandSlug.toLowerCase() === inferredBrand.toLowerCase());
        const tokenHit = oemTokens.some((t) => f.oem_part_number.toUpperCase() === t);
        let score = scoreOem(f.oem_part_number, sourceQuery, brandMatch);
        if (tokenHit) score += 20;
        return {
          filter_id: f.id,
          filter_slug: f.slug,
          oem_part_number: f.oem_part_number,
          brand_slug: brandSlug,
          brand_name: f.brands?.name ?? null,
          score,
          source: tokenHit ? "oem_token_match" : "oem_text_match",
        };
      })
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, top);

    const { data: aliasRows, error: aliasErr } = await supabase
      .from("filter_aliases")
      .select("filter_id, alias")
      .limit(1500);
    if (aliasErr) throw aliasErr;
    const aliasCandidates = ((aliasRows ?? []) as Array<{ filter_id: string; alias: string }>)
      .map((a) => ({
        filter_id: a.filter_id,
        alias: a.alias,
        score: scoreAlias(a.alias, sourceQuery),
      }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, top);

    const { data: mapped, error: mapErr } = await supabase
      .from("compatibility_mappings")
      .select("filter_id, filters:filter_id(id,slug,oem_part_number)")
      .eq("fridge_model_id", row.model_id)
      .limit(top);
    if (mapErr) throw mapErr;
    const existingMappingHints = ((mapped ?? []) as Array<{
      filter_id: string;
      filters?: { id: string; slug: string; oem_part_number: string } | null;
    }>).map((m) => ({
      filter_id: m.filter_id,
      oem_part_number: m.filters?.oem_part_number ?? null,
      filter_slug: m.filters?.slug ?? null,
      source: "existing_model_mapping",
      score: 95,
    }));

    output.push({
      staged_id: row.id,
      created_at: row.created_at,
      model: model
        ? {
            model_id: model.id,
            model_number: model.model_number,
            brand_slug: model.brands?.slug ?? null,
            brand_name: model.brands?.name ?? null,
          }
        : { model_id: row.model_id },
      source_query: sourceQuery,
      inferred_brand_slug: inferredBrand,
      oem_tokens: oemTokens,
      part_suggestions: {
        existing_mapping_hints: existingMappingHints,
        by_oem_part_number: oemCandidates,
        by_filter_alias: aliasCandidates,
      },
    });
  }

  console.log(
    JSON.stringify(
      {
        generated_at: new Date().toISOString(),
        scope: HOMEKEEP_WEDGE_CATALOG.refrigerator_water,
        status: "reviewing",
        part_id_required_value: "pending_part_lookup",
        rows_seen: stagedRows.length,
        rows: output,
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error("[review-staged-part-resolution-refrigerator] failed", err);
  process.exit(1);
});
