import { CATALOG_WHOLE_HOUSE_WATER_FILTERS } from "@/lib/catalog/constants";
import { wedgeCatalogForCatalogId } from "@/lib/catalog/identity";
import { loadWholeHouseWaterUsefulFilterSlugs } from "@/lib/data/whole-house-water-filter-usefulness";
import { normalizeSearchCompact, trimSearchInput } from "@/lib/search/normalize";
import { logSearchTelemetry } from "@/lib/search/telemetry";
import { getSupabaseServerClient } from "@/lib/supabase/server-client";

const MIN_LEN = 2;
const LIMIT = 25;

export type WholeHouseWaterSearchHitModel = {
  kind: "model";
  slug: string;
  model_number: string;
  brand_name: string;
  brand_slug: string;
  via?: "model" | "alias";
  matchedAlias?: string;
  compatible_filters?: { oem_part_number: string; slug: string }[];
};

export type WholeHouseWaterSearchHitFilter = {
  kind: "filter";
  slug: string;
  oem_part_number: string;
  name: string | null;
  brand_name: string;
  brand_slug: string;
  via?: "oem" | "alias";
  matchedAlias?: string;
};

export type WholeHouseWaterSearchHit =
  | WholeHouseWaterSearchHitModel
  | WholeHouseWaterSearchHitFilter;

export async function searchWholeHouseWaterCatalog(
  rawQuery: string,
): Promise<WholeHouseWaterSearchHit[]> {
  const q = trimSearchInput(rawQuery);
  if (q.length < MIN_LEN) return [];

  const supabase = getSupabaseServerClient();

  const [modelsDirect, modelAliases, partsDirect, partAliases] = await Promise.all([
    supabase.rpc("search_whole_house_water_models_flexible", {
      q,
      limit_count: LIMIT,
    }),
    supabase.rpc("search_whole_house_water_model_aliases_flexible", {
      q,
      limit_count: LIMIT,
    }),
    supabase.rpc("search_whole_house_water_parts_flexible", {
      q,
      limit_count: LIMIT,
    }),
    supabase.rpc("search_whole_house_water_part_aliases_flexible", {
      q,
      limit_count: LIMIT,
    }),
  ]);

  if (modelsDirect.error) throw modelsDirect.error;
  if (modelAliases.error) throw modelAliases.error;
  if (partsDirect.error) throw partsDirect.error;
  if (partAliases.error) throw partAliases.error;

  const seenModel = new Set<string>();
  const seenFilter = new Set<string>();
  const out: WholeHouseWaterSearchHit[] = [];

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

  const modelNorm = normalizeSearchCompact(q);
  if (modelNorm.length >= 6) {
    const hasExactNorm = out.some(
      (h): h is WholeHouseWaterSearchHitModel =>
        h.kind === "model" && normalizeSearchCompact(h.model_number) === modelNorm,
    );
    if (!hasExactNorm) {
      const { data: exactRows, error: exactErr } = await supabase
        .from("whole_house_water_models")
        .select("slug, model_number, brands:brand_id(name, slug)")
        .eq("model_number_norm", modelNorm)
        .limit(5);
      if (exactErr) throw exactErr;
      const prepend: WholeHouseWaterSearchHitModel[] = [];
      for (const row of exactRows ?? []) {
        const rec = row as unknown as {
          slug: string;
          model_number: string;
          brands?: { name: string; slug: string } | null;
        };
        const b = rec.brands;
        if (!b?.name || !b?.slug) continue;
        if (seenModel.has(rec.slug)) continue;
        seenModel.add(rec.slug);
        prepend.push({
          kind: "model",
          slug: rec.slug,
          model_number: rec.model_number,
          brand_name: b.name,
          brand_slug: b.slug,
          via: "model",
        });
      }
      if (prepend.length) out.splice(0, 0, ...prepend);
    }
  }

  for (const row of partsDirect.data ?? []) {
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

  for (const row of partAliases.data ?? []) {
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

  const usefulSlugs = await loadWholeHouseWaterUsefulFilterSlugs();
  const gated = out.filter(
    (h) => h.kind !== "filter" || usefulSlugs.has(h.slug),
  );

  await logSearchTelemetry({
    rawQuery,
    resultsCount: gated.length,
    catalog: wedgeCatalogForCatalogId(CATALOG_WHOLE_HOUSE_WATER_FILTERS),
  });
  return gated;
}

export async function enrichWholeHouseWaterModelHitsWithFilters(
  hits: WholeHouseWaterSearchHit[],
): Promise<WholeHouseWaterSearchHit[]> {
  const modelSlugs = Array.from(
    new Set(
      hits
        .filter((h): h is WholeHouseWaterSearchHitModel => h.kind === "model")
        .map((h) => h.slug),
    ),
  );
  if (modelSlugs.length === 0) return hits;

  const supabase = getSupabaseServerClient();

  const { data: modelRows, error: mErr } = await supabase
    .from("whole_house_water_models")
    .select("id, slug")
    .in("slug", modelSlugs);

  if (mErr) throw mErr;
  if (!modelRows?.length) return hits;

  const slugByModelId = new Map(
    modelRows.map((m) => [m.id as string, m.slug as string]),
  );
  const modelIds = modelRows.map((m) => m.id as string);

  const { data: maps, error: mapErr } = await supabase
    .from("whole_house_water_compatibility_mappings")
    .select("whole_house_water_model_id, whole_house_water_part_id")
    .in("whole_house_water_model_id", modelIds);

  if (mapErr) throw mapErr;

  const partIds = Array.from(
    new Set((maps ?? []).map((r) => r.whole_house_water_part_id as string)),
  );
  if (partIds.length === 0) return hits;

  const { data: parts, error: fErr } = await supabase
    .from("whole_house_water_parts")
    .select("id, oem_part_number, slug")
    .in("id", partIds);

  if (fErr) throw fErr;

  const partById = new Map(
    (parts ?? []).map((f) => [
      f.id as string,
      { oem_part_number: f.oem_part_number as string, slug: f.slug as string },
    ]),
  );

  const byModelSlug = new Map<string, { oem_part_number: string; slug: string }[]>();
  for (const row of maps ?? []) {
    const mid = row.whole_house_water_model_id as string;
    const slug = slugByModelId.get(mid);
    if (!slug) continue;
    const fil = partById.get(row.whole_house_water_part_id as string);
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
