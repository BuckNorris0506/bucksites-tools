import { loadEnv } from "./lib/load-env";
import { HOMEKEEP_WEDGE_CATALOG } from "@/lib/catalog/identity";
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

function tokens(s: string): string[] {
  return s
    .split(/[^a-z0-9]+/i)
    .map((x) => x.trim())
    .filter((x) => x.length >= 2);
}

function scoreModel(params: {
  modelNumber: string;
  modelBrandSlug: string | null;
  inferredModel: string | null;
  inferredBrand: string | null;
  sourceQuery: string;
}): number {
  let score = 0;
  const model = compact(params.modelNumber);
  const inferredModel = compact(params.inferredModel ?? "");
  const q = compact(params.sourceQuery);
  if (inferredModel && model === inferredModel) score += 70;
  else if (inferredModel && model.includes(inferredModel)) score += 35;
  if (q && model && q.includes(model)) score += 20;
  if (
    params.inferredBrand &&
    params.modelBrandSlug &&
    compact(params.inferredBrand) === compact(params.modelBrandSlug)
  ) {
    score += 15;
  }
  return score;
}

function scoreFilter(params: {
  oemPartNumber: string;
  filterBrandSlug: string | null;
  inferredBrand: string | null;
  sourceQuery: string;
}): number {
  let score = 0;
  const oem = compact(params.oemPartNumber);
  const q = compact(params.sourceQuery);
  if (q.includes(oem)) score += 70;
  if (oem.includes("filter")) score += 5;
  if (
    params.inferredBrand &&
    params.filterBrandSlug &&
    compact(params.inferredBrand) === compact(params.filterBrandSlug)
  ) {
    score += 15;
  }
  return score;
}

function scoreAlias(alias: string, sourceQuery: string): number {
  const a = compact(alias);
  const q = compact(sourceQuery);
  if (!a || !q) return 0;
  if (q.includes(a)) return 80;
  for (const t of tokens(sourceQuery)) {
    const ct = compact(t);
    if (ct.length >= 4 && a.includes(ct)) return 30;
  }
  return 0;
}

async function main() {
  loadEnv();
  const supabase = getSupabaseAdmin();
  const limit = parseArgNumber("--limit", 100);
  const perType = parseArgNumber("--per-type", 5);

  const { data: staged, error: stagedErr } = await supabase
    .from("staged_compatibility_mapping_additions")
    .select("id, status, catalog, model_id, part_id, payload_json, created_at")
    .eq("catalog", HOMEKEEP_WEDGE_CATALOG.refrigerator_water)
    .eq("status", "reviewing")
    .order("created_at", { ascending: true })
    .limit(limit);
  if (stagedErr) throw stagedErr;

  const rows = (staged ?? []) as Array<{
    id: number;
    model_id: string;
    part_id: string;
    payload_json: Record<string, unknown>;
    created_at: string;
  }>;

  const results = [];
  for (const row of rows) {
    const p = row.payload_json ?? {};
    const sourceQuery = asText(p.source_query) ?? "";
    const inferredBrand = asText(p.inferred_brand_slug);
    const inferredModel =
      asText(p.inferred_model_number) ?? asText(p.proposed_model_number);

    const { data: models, error: mErr } = await supabase
      .from("fridge_models")
      .select("id, slug, model_number, brands:brand_id(slug,name)")
      .limit(300);
    if (mErr) throw mErr;
    const modelScored = ((models ?? []) as Array<{
      id: string;
      slug: string;
      model_number: string;
      brands?: { slug: string; name: string } | null;
    }>)
      .map((m) => ({
        id: m.id,
        slug: m.slug,
        model_number: m.model_number,
        brand_slug: m.brands?.slug ?? null,
        brand_name: m.brands?.name ?? null,
        score: scoreModel({
          modelNumber: m.model_number,
          modelBrandSlug: m.brands?.slug ?? null,
          inferredModel,
          inferredBrand,
          sourceQuery,
        }),
      }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, perType);

    const { data: filters, error: fErr } = await supabase
      .from("filters")
      .select("id, slug, oem_part_number, brands:brand_id(slug,name)")
      .limit(500);
    if (fErr) throw fErr;
    const filterScored = ((filters ?? []) as Array<{
      id: string;
      slug: string;
      oem_part_number: string;
      brands?: { slug: string; name: string } | null;
    }>)
      .map((f) => ({
        id: f.id,
        slug: f.slug,
        oem_part_number: f.oem_part_number,
        brand_slug: f.brands?.slug ?? null,
        brand_name: f.brands?.name ?? null,
        score: scoreFilter({
          oemPartNumber: f.oem_part_number,
          filterBrandSlug: f.brands?.slug ?? null,
          inferredBrand,
          sourceQuery,
        }),
      }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, perType);

    const { data: aliases, error: aErr } = await supabase
      .from("filter_aliases")
      .select("filter_id, alias")
      .limit(1000);
    if (aErr) throw aErr;
    const aliasScored = ((aliases ?? []) as Array<{
      filter_id: string;
      alias: string;
    }>)
      .map((a) => ({
        filter_id: a.filter_id,
        alias: a.alias,
        score: scoreAlias(a.alias, sourceQuery),
      }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, perType);

    const topModel = modelScored[0];
    const modelStrong = Boolean(topModel && topModel.score >= 85);
    const recommendation = modelStrong
      ? {
          action: "review-compatibility",
          reason: "strong model candidate available; proceed with compatibility review",
          next_step: "select model/filter candidates and resolve mapping",
        }
      : {
          action: "create-model-first",
          reason:
            "no confident live model match for inferred model number; compatibility mapping should wait",
          next_step:
            "stage/promote model addition for inferred model number, then rerun resolver/review",
          suggested_model_addition: {
            inferred_brand_slug: inferredBrand,
            inferred_model_number: inferredModel,
          },
        };

    results.push({
      staged_id: row.id,
      created_at: row.created_at,
      source_query: sourceQuery,
      inferred_brand_slug: inferredBrand,
      inferred_model_number: inferredModel,
      model_candidates: modelScored,
      filter_candidates: filterScored,
      filter_alias_candidates: aliasScored,
      recommendation,
    });
  }

  console.log(
    JSON.stringify(
      {
        generated_at: new Date().toISOString(),
        scope: HOMEKEEP_WEDGE_CATALOG.refrigerator_water,
        status: "reviewing",
        rows_seen: rows.length,
        per_type: perType,
        rows: results,
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error("[review-staged-compat-refrigerator] failed", err);
  process.exit(1);
});
