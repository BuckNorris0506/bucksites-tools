import { CATALOG_HUMIDIFIER_FILTERS } from "@/lib/catalog/constants";
import { wedgeCatalogForCatalogId } from "@/lib/catalog/identity";
import { trimSearchInput } from "@/lib/search/normalize";
import { logSearchTelemetry } from "@/lib/search/telemetry";
import { getSupabaseServerClient } from "@/lib/supabase/server-client";

const MIN_LEN = 2;
const LIMIT = 25;

export type HumidifierSearchHitModel = {
  kind: "model";
  slug: string;
  model_number: string;
  brand_name: string;
  brand_slug: string;
  via?: "model" | "alias";
  matchedAlias?: string;
  compatible_filters?: { oem_part_number: string; slug: string }[];
};

export type HumidifierSearchHitFilter = {
  kind: "filter";
  slug: string;
  oem_part_number: string;
  name: string | null;
  brand_name: string;
  brand_slug: string;
  via?: "oem" | "alias";
  matchedAlias?: string;
};

export type HumidifierSearchHit = HumidifierSearchHitModel | HumidifierSearchHitFilter;

export async function searchHumidifierCatalog(
  rawQuery: string,
): Promise<HumidifierSearchHit[]> {
  const q = trimSearchInput(rawQuery);
  if (q.length < MIN_LEN) return [];

  const supabase = getSupabaseServerClient();

  const [modelsDirect, modelAliases, filtersDirect, filterAliases] =
    await Promise.all([
      supabase.rpc("search_humidifier_models_flexible", {
        q,
        limit_count: LIMIT,
      }),
      supabase.rpc("search_humidifier_model_aliases_flexible", {
        q,
        limit_count: LIMIT,
      }),
      supabase.rpc("search_humidifier_filters_flexible", {
        q,
        limit_count: LIMIT,
      }),
      supabase.rpc("search_humidifier_filter_aliases_flexible", {
        q,
        limit_count: LIMIT,
      }),
    ]);

  if (modelsDirect.error) throw modelsDirect.error;
  if (modelAliases.error) throw modelAliases.error;
  if (filtersDirect.error) throw filtersDirect.error;
  if (filterAliases.error) throw filterAliases.error;

  const seenModel = new Set<string>();
  const seenFilter = new Set<string>();
  const out: HumidifierSearchHit[] = [];

  for (const row of modelsDirect.data ?? []) {
    const r = row as {
      slug: string;
      model_number: string;
      brand_name: string;
      brand_slug: string;
    };
    if (seenModel.has(r.slug)) continue;
    seenModel.add(r.slug);
    out.push({
      kind: "model",
      slug: r.slug,
      model_number: r.model_number,
      brand_name: r.brand_name,
      brand_slug: r.brand_slug,
      via: "model",
    });
  }

  for (const row of modelAliases.data ?? []) {
    const r = row as {
      slug: string;
      model_number: string;
      brand_name: string;
      brand_slug: string;
      matched_alias: string;
    };
    if (seenModel.has(r.slug)) continue;
    seenModel.add(r.slug);
    out.push({
      kind: "model",
      slug: r.slug,
      model_number: r.model_number,
      brand_name: r.brand_name,
      brand_slug: r.brand_slug,
      via: "alias",
      matchedAlias: r.matched_alias,
    });
  }

  for (const row of filtersDirect.data ?? []) {
    const r = row as {
      slug: string;
      oem_part_number: string;
      filter_name: string | null;
      brand_name: string;
      brand_slug: string;
    };
    if (seenFilter.has(r.slug)) continue;
    seenFilter.add(r.slug);
    out.push({
      kind: "filter",
      slug: r.slug,
      oem_part_number: r.oem_part_number,
      name: r.filter_name,
      brand_name: r.brand_name,
      brand_slug: r.brand_slug,
      via: "oem",
    });
  }

  for (const row of filterAliases.data ?? []) {
    const r = row as {
      slug: string;
      oem_part_number: string;
      filter_name: string | null;
      brand_name: string;
      brand_slug: string;
      matched_alias: string;
    };
    if (seenFilter.has(r.slug)) continue;
    seenFilter.add(r.slug);
    out.push({
      kind: "filter",
      slug: r.slug,
      oem_part_number: r.oem_part_number,
      name: r.filter_name,
      brand_name: r.brand_name,
      brand_slug: r.brand_slug,
      via: "alias",
      matchedAlias: r.matched_alias,
    });
  }

  await logSearchTelemetry({
    rawQuery,
    resultsCount: out.length,
    catalog: wedgeCatalogForCatalogId(CATALOG_HUMIDIFIER_FILTERS),
  });
  return out;
}

export async function enrichHumidifierModelHitsWithFilters(
  hits: HumidifierSearchHit[],
): Promise<HumidifierSearchHit[]> {
  const modelSlugs = Array.from(
    new Set(
      hits
        .filter((h): h is HumidifierSearchHitModel => h.kind === "model")
        .map((h) => h.slug),
    ),
  );
  if (modelSlugs.length === 0) return hits;

  const supabase = getSupabaseServerClient();

  const { data: modelRows, error: mErr } = await supabase
    .from("humidifier_models")
    .select("id, slug")
    .in("slug", modelSlugs);

  if (mErr) throw mErr;
  if (!modelRows?.length) return hits;

  const slugByModelId = new Map(
    modelRows.map((m) => [m.id as string, m.slug as string]),
  );
  const modelIds = modelRows.map((m) => m.id as string);

  const { data: maps, error: mapErr } = await supabase
    .from("humidifier_compatibility_mappings")
    .select("humidifier_model_id, humidifier_filter_id")
    .in("humidifier_model_id", modelIds);

  if (mapErr) throw mapErr;

  const filterIds = Array.from(
    new Set((maps ?? []).map((r) => r.humidifier_filter_id as string)),
  );
  if (filterIds.length === 0) return hits;

  const { data: filters, error: fErr } = await supabase
    .from("humidifier_filters")
    .select("id, oem_part_number, slug")
    .in("id", filterIds);

  if (fErr) throw fErr;

  const filterById = new Map(
    (filters ?? []).map((f) => [
      f.id as string,
      { oem_part_number: f.oem_part_number as string, slug: f.slug as string },
    ]),
  );

  const byModelSlug = new Map<
    string,
    { oem_part_number: string; slug: string }[]
  >();
  for (const row of maps ?? []) {
    const mid = row.humidifier_model_id as string;
    const slug = slugByModelId.get(mid);
    if (!slug) continue;
    const fil = filterById.get(row.humidifier_filter_id as string);
    if (!fil) continue;
    const list = byModelSlug.get(slug) ?? [];
    if (!list.some((x) => x.slug === fil.slug)) list.push(fil);
    byModelSlug.set(slug, list);
  }

  return hits.map((h) => {
    if (h.kind !== "model") return h;
    const raw = byModelSlug.get(h.slug) ?? [];
    if (raw.length === 0) return h;
    const sorted = [...raw].sort((a, b) =>
      a.oem_part_number.localeCompare(b.oem_part_number),
    );
    return { ...h, compatible_filters: sorted.slice(0, 4) };
  });
}
