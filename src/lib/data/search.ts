import {
  CATALOG_AIR_PURIFIER_FILTERS,
  CATALOG_APPLIANCE_AIR_FILTERS,
  CATALOG_HUMIDIFIER_FILTERS,
  CATALOG_REFRIGERATOR_WATER_FILTER,
  CATALOG_VACUUM_FILTERS,
  CATALOG_WHOLE_HOUSE_WATER_FILTERS,
  LAUNCH_SCOPE_CATALOG_IDS,
  type CatalogId,
} from "@/lib/catalog/constants";
import { HOMEKEEP_GLOBAL_SEARCH_CATALOG } from "@/lib/catalog/identity";
import { logSearchTelemetry } from "@/lib/search/telemetry";
import { normalizeSearchCompact, trimSearchInput } from "@/lib/search/normalize";
import { getSupabaseServerClient } from "@/lib/supabase/server-client";
import { loadRefrigeratorUsefulFilterSlugs } from "@/lib/data/refrigerator-filter-usefulness";
import { loadAirPurifierUsefulFilterSlugs } from "@/lib/data/air-purifier-filter-usefulness";
import { loadWholeHouseWaterUsefulFilterSlugs } from "@/lib/data/whole-house-water-filter-usefulness";
import { applyWholeHouseWaterSearchNavResolutionToCatalogHits } from "@/lib/data/whole-house-water-search-nav";

export type SearchHitFridge = {
  catalog: typeof CATALOG_REFRIGERATOR_WATER_FILTER;
  kind: "fridge";
  slug: string;
  model_number: string;
  brand_name: string;
  brand_slug: string;
  via?: "model" | "alias";
  matchedAlias?: string;
  compatible_filters?: { oem_part_number: string; slug: string }[];
};

export type SearchHitModel = {
  catalog:
    | typeof CATALOG_AIR_PURIFIER_FILTERS
    | typeof CATALOG_VACUUM_FILTERS
    | typeof CATALOG_HUMIDIFIER_FILTERS
    | typeof CATALOG_APPLIANCE_AIR_FILTERS
    | typeof CATALOG_WHOLE_HOUSE_WATER_FILTERS;
  kind: "model";
  slug: string;
  model_number: string;
  brand_name: string;
  brand_slug: string;
  via?: "model" | "alias";
  matchedAlias?: string;
  compatible_filters?: { oem_part_number: string; slug: string }[];
  /**
   * Whole-house-water only: when `null`, global search must not link this hit (no
   * matching `whole_house_water_models` row for the returned slug/OEM tokens).
   */
  catalogDetailHref?: string | null;
};

export type SearchHitFilter = {
  catalog: CatalogId;
  kind: "filter";
  slug: string;
  oem_part_number: string;
  name: string | null;
  brand_name: string;
  brand_slug: string;
  via?: "oem" | "alias";
  matchedAlias?: string;
  /**
   * Whole-house-water only: when `null`, global search must not link this hit (no
   * matching `whole_house_water_parts` row for the returned slug/OEM tokens).
   */
  catalogDetailHref?: string | null;
};

export type SearchHit = SearchHitFridge | SearchHitModel | SearchHitFilter;

const MIN_LEN = 2;
const LIMIT = 25;

/**
 * For mixed "brand + model + filter" queries, refrigerator RPC substring
 * matching often misses because compact form is one long token (e.g. samsungrf30…filter).
 * Strip to the model-like token so fridge model RPCs get a clean query.
 */
function fridgeFlexibleSearchInput(trimmedQuery: string): string {
  const hasFilterWord = /\b(filter|water\s*filter|cartridge|replacement)\b/i.test(trimmedQuery);
  if (!hasFilterWord) return trimmedQuery;

  const upper = trimmedQuery.toUpperCase();
  const tokens = upper.match(/\b[A-Z0-9][A-Z0-9-]{5,}\b/g) ?? [];
  const modelish = tokens.filter((t) => /[A-Z]/.test(t) && /\d/.test(t) && t.length >= 7);
  if (modelish.length === 1) return modelish[0]!;
  if (modelish.length > 1) return modelish.sort((a, b) => b.length - a.length)[0]!;

  return trimmedQuery;
}

type ModelCompatCfg = {
  modelsTable: string;
  compatTable: string;
  modelIdCol: string;
  filterIdCol: string;
  filtersTable: string;
};

async function enrichSearchHitsForModelCatalog(
  hits: SearchHit[],
  catalog: SearchHitModel["catalog"],
  cfg: ModelCompatCfg,
): Promise<SearchHit[]> {
  const modelSlugs = Array.from(
    new Set(
      hits
        .filter((h): h is SearchHitModel => h.kind === "model" && h.catalog === catalog)
        .map((h) => h.slug),
    ),
  );
  if (modelSlugs.length === 0) return hits;

  const supabase = getSupabaseServerClient();

  const { data: modelRows, error: mErr } = await supabase
    .from(cfg.modelsTable)
    .select("id, slug")
    .in("slug", modelSlugs);

  if (mErr) throw mErr;
  if (!modelRows?.length) return hits;

  const slugByModelId = new Map(
    modelRows.map((m) => [m.id as string, m.slug as string]),
  );
  const modelIds = modelRows.map((m) => m.id as string);

  // Dynamic table/column names — bypass strict generated types for this helper only.
  const sb = supabase as unknown as {
    from: (t: string) => {
      select: (s: string) => {
        in: (col: string, vals: string[]) => Promise<{
          data: Record<string, unknown>[] | null;
          error: { message: string } | null;
        }>;
      };
    };
  };
  const { data: maps, error: mapErr } = await sb
    .from(cfg.compatTable)
    .select(`${cfg.modelIdCol}, ${cfg.filterIdCol}, is_recommended`)
    .in(cfg.modelIdCol, modelIds);

  if (mapErr) throw mapErr;

  const filterIds = Array.from(
    new Set(
      (maps ?? []).map((r) => (r as Record<string, unknown>)[cfg.filterIdCol] as string),
    ),
  );
  if (filterIds.length === 0) return hits;

  const { data: filters, error: fErr } = await supabase
    .from(cfg.filtersTable)
    .select("id, oem_part_number, slug")
    .in("id", filterIds);

  if (fErr) throw fErr;

  const filterById = new Map(
    (filters ?? []).map((f) => [
      f.id as string,
      { oem_part_number: f.oem_part_number as string, slug: f.slug as string },
    ]),
  );

  type CompatRef = { oem_part_number: string; slug: string; is_recommended: boolean };
  const byModelSlug = new Map<string, CompatRef[]>();
  for (const row of maps ?? []) {
    const rec = row as Record<string, unknown>;
    const mid = rec[cfg.modelIdCol] as string;
    const slug = slugByModelId.get(mid);
    if (!slug) continue;
    const fil = filterById.get(rec[cfg.filterIdCol] as string);
    if (!fil) continue;
    const isRec = rec.is_recommended === true;
    const list = byModelSlug.get(slug) ?? [];
    const idx = list.findIndex((x) => x.slug === fil.slug);
    if (idx === -1) {
      list.push({ ...fil, is_recommended: isRec });
    } else {
      const cur = list[idx]!;
      list[idx] = { ...cur, is_recommended: cur.is_recommended || isRec };
    }
    byModelSlug.set(slug, list);
  }

  return hits.map((h) => {
    if (h.kind !== "model" || h.catalog !== catalog) return h;
    const raw = byModelSlug.get(h.slug) ?? [];
    if (raw.length === 0) return h;
    const sorted = [...raw].sort((a, b) => {
      const d = Number(b.is_recommended) - Number(a.is_recommended);
      if (d !== 0) return d;
      return a.oem_part_number.localeCompare(b.oem_part_number);
    });
    return {
      ...h,
      compatible_filters: sorted.slice(0, 4).map(({ oem_part_number, slug }) => ({
        oem_part_number,
        slug,
      })),
    };
  });
}

export async function searchCatalog(
  rawQuery: string,
  options?: { skipTelemetry?: boolean },
): Promise<SearchHit[]> {
  const q = trimSearchInput(rawQuery);
  if (q.length < MIN_LEN) return [];

  const supabase = getSupabaseServerClient();
  const fridgeQ = fridgeFlexibleSearchInput(q);

  // Fridge + refrigerator filter RPCs: use (q, limit_count) — must match SQL arg names
  // (see search_fridge_*_flexible / search_filters_flexible).
  const [
    fridgesDirect,
    fridgeAliases,
    filtersDirect,
    filterAliases,
    apModels,
    apModelAliases,
    apFilters,
    apFilterAliases,
    vacModels,
    vacModelAliases,
    vacFilters,
    vacFilterAliases,
    humModels,
    humModelAliases,
    humFilters,
    humFilterAliases,
    aaModels,
    aaModelAliases,
    aaParts,
    aaPartAliases,
    whModels,
    whModelAliases,
    whParts,
    whPartAliases,
  ] = await Promise.all([
    supabase.rpc("search_fridge_models_flexible", { q: fridgeQ, limit_count: LIMIT }),
    supabase.rpc("search_fridge_aliases_flexible", { q: fridgeQ, limit_count: LIMIT }),
    supabase.rpc("search_filters_flexible", { q, limit_count: LIMIT }),
    supabase.rpc("search_filter_aliases_flexible", { q, limit_count: LIMIT }),
    supabase.rpc("search_air_purifier_models_flexible", { q, limit_count: LIMIT }),
    supabase.rpc("search_air_purifier_model_aliases_flexible", {
      q,
      limit_count: LIMIT,
    }),
    supabase.rpc("search_air_purifier_filters_flexible", {
      q,
      limit_count: LIMIT,
    }),
    supabase.rpc("search_air_purifier_filter_aliases_flexible", {
      q,
      limit_count: LIMIT,
    }),
    supabase.rpc("search_vacuum_models_flexible", { q, limit_count: LIMIT }),
    supabase.rpc("search_vacuum_model_aliases_flexible", {
      q,
      limit_count: LIMIT,
    }),
    supabase.rpc("search_vacuum_filters_flexible", { q, limit_count: LIMIT }),
    supabase.rpc("search_vacuum_filter_aliases_flexible", {
      q,
      limit_count: LIMIT,
    }),
    supabase.rpc("search_humidifier_models_flexible", { q, limit_count: LIMIT }),
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
    supabase.rpc("search_appliance_air_models_flexible", {
      q,
      limit_count: LIMIT,
    }),
    supabase.rpc("search_appliance_air_model_aliases_flexible", {
      q,
      limit_count: LIMIT,
    }),
    supabase.rpc("search_appliance_air_parts_flexible", {
      q,
      limit_count: LIMIT,
    }),
    supabase.rpc("search_appliance_air_part_aliases_flexible", {
      q,
      limit_count: LIMIT,
    }),
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

  const rpcErrors: { name: string; err: (typeof fridgesDirect)["error"] }[] = [];
  const pushErr = (name: string, err: (typeof fridgesDirect)["error"]) => {
    if (err) rpcErrors.push({ name, err });
  };
  pushErr("search_fridge_models_flexible", fridgesDirect.error);
  pushErr("search_fridge_aliases_flexible", fridgeAliases.error);
  pushErr("search_filters_flexible", filtersDirect.error);
  pushErr("search_filter_aliases_flexible", filterAliases.error);
  pushErr("search_air_purifier_models_flexible", apModels.error);
  pushErr("search_air_purifier_model_aliases_flexible", apModelAliases.error);
  pushErr("search_air_purifier_filters_flexible", apFilters.error);
  pushErr("search_air_purifier_filter_aliases_flexible", apFilterAliases.error);
  pushErr("search_vacuum_models_flexible", vacModels.error);
  pushErr("search_vacuum_model_aliases_flexible", vacModelAliases.error);
  pushErr("search_vacuum_filters_flexible", vacFilters.error);
  pushErr("search_vacuum_filter_aliases_flexible", vacFilterAliases.error);
  pushErr("search_humidifier_models_flexible", humModels.error);
  pushErr("search_humidifier_model_aliases_flexible", humModelAliases.error);
  pushErr("search_humidifier_filters_flexible", humFilters.error);
  pushErr("search_humidifier_filter_aliases_flexible", humFilterAliases.error);
  pushErr("search_appliance_air_models_flexible", aaModels.error);
  pushErr("search_appliance_air_model_aliases_flexible", aaModelAliases.error);
  pushErr("search_appliance_air_parts_flexible", aaParts.error);
  pushErr("search_appliance_air_part_aliases_flexible", aaPartAliases.error);
  pushErr("search_whole_house_water_models_flexible", whModels.error);
  pushErr("search_whole_house_water_model_aliases_flexible", whModelAliases.error);
  pushErr("search_whole_house_water_parts_flexible", whParts.error);
  pushErr("search_whole_house_water_part_aliases_flexible", whPartAliases.error);

  for (const { name, err } of rpcErrors) {
    console.error("[searchCatalog] RPC error", name, err);
  }
  for (const { err } of rpcErrors) {
    if (err) throw err;
  }

  const seenFridge = new Set<string>();
  const seenFilter = new Set<string>();
  const seenModelVertical = new Set<string>();

  const out: SearchHit[] = [];

  for (const row of fridgesDirect.data ?? []) {
    const r = row as {
      slug: string;
      model_number: string;
      brand_name: string;
      brand_slug: string;
    };
    const k = `${CATALOG_REFRIGERATOR_WATER_FILTER}:${r.slug}`;
    if (seenFridge.has(k)) continue;
    seenFridge.add(k);
    out.push({
      catalog: CATALOG_REFRIGERATOR_WATER_FILTER,
      kind: "fridge",
      slug: r.slug,
      model_number: r.model_number,
      brand_name: r.brand_name,
      brand_slug: r.brand_slug,
      via: "model",
    });
  }

  for (const row of fridgeAliases.data ?? []) {
    const r = row as {
      slug: string;
      model_number: string;
      brand_name: string;
      brand_slug: string;
      matched_alias: string;
    };
    const k = `${CATALOG_REFRIGERATOR_WATER_FILTER}:${r.slug}`;
    if (seenFridge.has(k)) continue;
    seenFridge.add(k);
    out.push({
      catalog: CATALOG_REFRIGERATOR_WATER_FILTER,
      kind: "fridge",
      slug: r.slug,
      model_number: r.model_number,
      brand_name: r.brand_name,
      brand_slug: r.brand_slug,
      via: "alias",
      matchedAlias: r.matched_alias,
    });
  }

  // Exact model_number_norm fallback: RPC can return 25 weaker substring matches first
  // (ORDER BY slug), hiding the real row. DB column same as normalizeSearchCompact().
  const fridgeNorm = normalizeSearchCompact(fridgeQ);
  if (fridgeNorm.length >= 6) {
    const hasExactFridgeNorm = out.some(
      (h): h is SearchHitFridge =>
        h.kind === "fridge" &&
        h.catalog === CATALOG_REFRIGERATOR_WATER_FILTER &&
        normalizeSearchCompact(h.model_number) === fridgeNorm,
    );
    if (!hasExactFridgeNorm) {
      const { data: exactRows, error: exactErr } = await supabase
        .from("fridge_models")
        .select("slug, model_number, brands:brand_id(name, slug)")
        .eq("model_number_norm", fridgeNorm)
        .limit(5);
      if (exactErr) throw exactErr;
      const exactHits: SearchHitFridge[] = [];
      for (const row of exactRows ?? []) {
        const rec = row as unknown as {
          slug: string;
          model_number: string;
          brands?: { name: string; slug: string } | null;
        };
        const b = rec.brands;
        if (!b?.name || !b?.slug) continue;
        const k = `${CATALOG_REFRIGERATOR_WATER_FILTER}:${rec.slug}`;
        if (seenFridge.has(k)) continue;
        seenFridge.add(k);
        exactHits.push({
          catalog: CATALOG_REFRIGERATOR_WATER_FILTER,
          kind: "fridge",
          slug: rec.slug,
          model_number: rec.model_number,
          brand_name: b.name,
          brand_slug: b.slug,
          via: "model",
        });
      }
      if (exactHits.length) out.splice(0, 0, ...exactHits);
    }
  }

  const pushFilter = (
    catalog: CatalogId,
    r: {
      slug: string;
      oem_part_number: string;
      filter_name: string | null;
      brand_name: string;
      brand_slug: string;
      matched_alias?: string;
    },
    via: "oem" | "alias",
  ) => {
    const k = `${catalog}:${r.slug}`;
    if (seenFilter.has(k)) return;
    seenFilter.add(k);
    out.push({
      catalog,
      kind: "filter",
      slug: r.slug,
      oem_part_number: r.oem_part_number,
      name: r.filter_name,
      brand_name: r.brand_name,
      brand_slug: r.brand_slug,
      via,
      matchedAlias: via === "alias" ? r.matched_alias : undefined,
    });
  };

  for (const row of filtersDirect.data ?? []) {
    pushFilter(
      CATALOG_REFRIGERATOR_WATER_FILTER,
      row as Parameters<typeof pushFilter>[1],
      "oem",
    );
  }

  for (const row of filterAliases.data ?? []) {
    pushFilter(
      CATALOG_REFRIGERATOR_WATER_FILTER,
      row as Parameters<typeof pushFilter>[1],
      "alias",
    );
  }

  const pushVerticalModel = (
    catalog: SearchHitModel["catalog"],
    r: {
      slug: string;
      model_number: string;
      brand_name: string;
      brand_slug: string;
      matched_alias?: string;
    },
    via: "model" | "alias",
  ) => {
    const k = `${catalog}:${r.slug}`;
    if (seenModelVertical.has(k)) return;
    seenModelVertical.add(k);
    out.push({
      catalog,
      kind: "model",
      slug: r.slug,
      model_number: r.model_number,
      brand_name: r.brand_name,
      brand_slug: r.brand_slug,
      via,
      matchedAlias: via === "alias" ? r.matched_alias : undefined,
    });
  };

  for (const row of apModels.data ?? []) {
    pushVerticalModel(
      CATALOG_AIR_PURIFIER_FILTERS,
      row as Parameters<typeof pushVerticalModel>[1],
      "model",
    );
  }
  for (const row of apModelAliases.data ?? []) {
    pushVerticalModel(
      CATALOG_AIR_PURIFIER_FILTERS,
      row as Parameters<typeof pushVerticalModel>[1],
      "alias",
    );
  }

  const apModelNorm = normalizeSearchCompact(q);
  if (apModelNorm.length >= 6) {
    const hasExactApNorm = out.some(
      (h): h is SearchHitModel =>
        h.kind === "model" &&
        h.catalog === CATALOG_AIR_PURIFIER_FILTERS &&
        normalizeSearchCompact(h.model_number) === apModelNorm,
    );
    if (!hasExactApNorm) {
      const { data: exactApRows, error: exactApErr } = await supabase
        .from("air_purifier_models")
        .select("slug, model_number, brands:brand_id(name, slug)")
        .eq("model_number_norm", apModelNorm)
        .limit(5);
      if (exactApErr) throw exactApErr;
      const exactApHits: SearchHitModel[] = [];
      for (const row of exactApRows ?? []) {
        const rec = row as unknown as {
          slug: string;
          model_number: string;
          brands?: { name: string; slug: string } | null;
        };
        const b = rec.brands;
        if (!b?.name || !b?.slug) continue;
        const k = `${CATALOG_AIR_PURIFIER_FILTERS}:${rec.slug}`;
        if (seenModelVertical.has(k)) continue;
        seenModelVertical.add(k);
        exactApHits.push({
          catalog: CATALOG_AIR_PURIFIER_FILTERS,
          kind: "model",
          slug: rec.slug,
          model_number: rec.model_number,
          brand_name: b.name,
          brand_slug: b.slug,
          via: "model",
        });
      }
      if (exactApHits.length) out.splice(0, 0, ...exactApHits);
    }
  }

  for (const row of apFilters.data ?? []) {
    pushFilter(CATALOG_AIR_PURIFIER_FILTERS, row as Parameters<typeof pushFilter>[1], "oem");
  }
  for (const row of apFilterAliases.data ?? []) {
    pushFilter(
      CATALOG_AIR_PURIFIER_FILTERS,
      row as Parameters<typeof pushFilter>[1],
      "alias",
    );
  }

  for (const row of vacModels.data ?? []) {
    pushVerticalModel(
      CATALOG_VACUUM_FILTERS,
      row as Parameters<typeof pushVerticalModel>[1],
      "model",
    );
  }
  for (const row of vacModelAliases.data ?? []) {
    pushVerticalModel(
      CATALOG_VACUUM_FILTERS,
      row as Parameters<typeof pushVerticalModel>[1],
      "alias",
    );
  }
  for (const row of vacFilters.data ?? []) {
    pushFilter(CATALOG_VACUUM_FILTERS, row as Parameters<typeof pushFilter>[1], "oem");
  }
  for (const row of vacFilterAliases.data ?? []) {
    pushFilter(
      CATALOG_VACUUM_FILTERS,
      row as Parameters<typeof pushFilter>[1],
      "alias",
    );
  }

  for (const row of humModels.data ?? []) {
    pushVerticalModel(
      CATALOG_HUMIDIFIER_FILTERS,
      row as Parameters<typeof pushVerticalModel>[1],
      "model",
    );
  }
  for (const row of humModelAliases.data ?? []) {
    pushVerticalModel(
      CATALOG_HUMIDIFIER_FILTERS,
      row as Parameters<typeof pushVerticalModel>[1],
      "alias",
    );
  }
  for (const row of humFilters.data ?? []) {
    pushFilter(
      CATALOG_HUMIDIFIER_FILTERS,
      row as Parameters<typeof pushFilter>[1],
      "oem",
    );
  }
  for (const row of humFilterAliases.data ?? []) {
    pushFilter(
      CATALOG_HUMIDIFIER_FILTERS,
      row as Parameters<typeof pushFilter>[1],
      "alias",
    );
  }

  for (const row of aaModels.data ?? []) {
    pushVerticalModel(
      CATALOG_APPLIANCE_AIR_FILTERS,
      row as Parameters<typeof pushVerticalModel>[1],
      "model",
    );
  }
  for (const row of aaModelAliases.data ?? []) {
    pushVerticalModel(
      CATALOG_APPLIANCE_AIR_FILTERS,
      row as Parameters<typeof pushVerticalModel>[1],
      "alias",
    );
  }
  for (const row of aaParts.data ?? []) {
    pushFilter(
      CATALOG_APPLIANCE_AIR_FILTERS,
      row as Parameters<typeof pushFilter>[1],
      "oem",
    );
  }
  for (const row of aaPartAliases.data ?? []) {
    pushFilter(
      CATALOG_APPLIANCE_AIR_FILTERS,
      row as Parameters<typeof pushFilter>[1],
      "alias",
    );
  }

  for (const row of whModels.data ?? []) {
    pushVerticalModel(
      CATALOG_WHOLE_HOUSE_WATER_FILTERS,
      row as Parameters<typeof pushVerticalModel>[1],
      "model",
    );
  }
  for (const row of whModelAliases.data ?? []) {
    pushVerticalModel(
      CATALOG_WHOLE_HOUSE_WATER_FILTERS,
      row as Parameters<typeof pushVerticalModel>[1],
      "alias",
    );
  }

  const whModelNorm = normalizeSearchCompact(q);
  if (whModelNorm.length >= 6) {
    const hasExactWhNorm = out.some(
      (h): h is SearchHitModel =>
        h.kind === "model" &&
        h.catalog === CATALOG_WHOLE_HOUSE_WATER_FILTERS &&
        normalizeSearchCompact(h.model_number) === whModelNorm,
    );
    if (!hasExactWhNorm) {
      const { data: exactWhRows, error: exactWhErr } = await supabase
        .from("whole_house_water_models")
        .select("slug, model_number, brands:brand_id(name, slug)")
        .eq("model_number_norm", whModelNorm)
        .limit(5);
      if (exactWhErr) throw exactWhErr;
      const exactWhHits: SearchHitModel[] = [];
      for (const row of exactWhRows ?? []) {
        const rec = row as unknown as {
          slug: string;
          model_number: string;
          brands?: { name: string; slug: string } | null;
        };
        const b = rec.brands;
        if (!b?.name || !b?.slug) continue;
        const k = `${CATALOG_WHOLE_HOUSE_WATER_FILTERS}:${rec.slug}`;
        if (seenModelVertical.has(k)) continue;
        seenModelVertical.add(k);
        exactWhHits.push({
          catalog: CATALOG_WHOLE_HOUSE_WATER_FILTERS,
          kind: "model",
          slug: rec.slug,
          model_number: rec.model_number,
          brand_name: b.name,
          brand_slug: b.slug,
          via: "model",
        });
      }
      if (exactWhHits.length) out.splice(0, 0, ...exactWhHits);
    }
  }

  for (const row of whParts.data ?? []) {
    pushFilter(
      CATALOG_WHOLE_HOUSE_WATER_FILTERS,
      row as Parameters<typeof pushFilter>[1],
      "oem",
    );
  }
  for (const row of whPartAliases.data ?? []) {
    pushFilter(
      CATALOG_WHOLE_HOUSE_WATER_FILTERS,
      row as Parameters<typeof pushFilter>[1],
      "alias",
    );
  }

  const resolvedOut = await applyWholeHouseWaterSearchNavResolutionToCatalogHits(
    supabase,
    out,
  );

  const [usefulFridgeFilterSlugs, usefulAirPurifierFilterSlugs, usefulWholeHouseWaterFilterSlugs] =
    await Promise.all([
      loadRefrigeratorUsefulFilterSlugs(),
      loadAirPurifierUsefulFilterSlugs(),
      loadWholeHouseWaterUsefulFilterSlugs(),
    ]);
  const gated = resolvedOut.filter((h) => {
    if (h.kind !== "filter") return true;
    if (h.catalog === CATALOG_REFRIGERATOR_WATER_FILTER) {
      return usefulFridgeFilterSlugs.has(h.slug);
    }
    if (h.catalog === CATALOG_AIR_PURIFIER_FILTERS) {
      return usefulAirPurifierFilterSlugs.has(h.slug);
    }
    if (h.catalog === CATALOG_WHOLE_HOUSE_WATER_FILTERS) {
      return usefulWholeHouseWaterFilterSlugs.has(h.slug);
    }
    return true;
  });

  const launchGated = gated.filter((h) =>
    LAUNCH_SCOPE_CATALOG_IDS.includes(h.catalog as CatalogId),
  );

  if (!options?.skipTelemetry) {
    await logSearchTelemetry({
      rawQuery,
      resultsCount: launchGated.length,
      catalog: HOMEKEEP_GLOBAL_SEARCH_CATALOG,
    });
  }

  return launchGated;
}

export async function enrichFridgeHitsWithCompatibleFilters(
  hits: SearchHit[],
): Promise<SearchHit[]> {
  const fridgeSlugs = Array.from(
    new Set(
      hits.filter((h): h is SearchHitFridge => h.kind === "fridge").map((h) => h.slug),
    ),
  );
  if (fridgeSlugs.length === 0) return hits;

  const supabase = getSupabaseServerClient();

  const { data: models, error: mErr } = await supabase
    .from("fridge_models")
    .select("id, slug")
    .in("slug", fridgeSlugs);

  if (mErr) throw mErr;
  if (!models?.length) return hits;

  const slugByModelId = new Map(
    models.map((m) => [m.id as string, m.slug as string]),
  );
  const modelIds = models.map((m) => m.id as string);

  const { data: maps, error: mapErr } = await supabase
    .from("compatibility_mappings")
    .select("fridge_model_id, filter_id")
    .in("fridge_model_id", modelIds);

  if (mapErr) throw mapErr;

  const filterIds = Array.from(
    new Set((maps ?? []).map((r) => r.filter_id as string)),
  );
  if (filterIds.length === 0) return hits;

  const { data: filters, error: fErr } = await supabase
    .from("filters")
    .select("id, oem_part_number, slug")
    .in("id", filterIds);

  if (fErr) throw fErr;

  const filterById = new Map(
    (filters ?? []).map((f) => [
      f.id as string,
      { oem_part_number: f.oem_part_number as string, slug: f.slug as string },
    ]),
  );

  const byFridgeSlug = new Map<string, { oem_part_number: string; slug: string }[]>();
  for (const row of maps ?? []) {
    const fridgeId = row.fridge_model_id as string;
    const slug = slugByModelId.get(fridgeId);
    if (!slug) continue;
    const fil = filterById.get(row.filter_id as string);
    if (!fil) continue;
    const list = byFridgeSlug.get(slug) ?? [];
    if (!list.some((x) => x.slug === fil.slug)) list.push(fil);
    byFridgeSlug.set(slug, list);
  }

  return hits.map((h) => {
    if (h.kind !== "fridge") return h;
    const raw = byFridgeSlug.get(h.slug) ?? [];
    if (raw.length === 0) return h;
    const sorted = [...raw].sort((a, b) =>
      a.oem_part_number.localeCompare(b.oem_part_number),
    );
    return { ...h, compatible_filters: sorted.slice(0, 4) };
  });
}

/** Adds compatible part numbers to global search hits for all catalogs. */
export async function enrichAllSearchHitsWithCompatibleFilters(
  hits: SearchHit[],
): Promise<SearchHit[]> {
  let h = await enrichFridgeHitsWithCompatibleFilters(hits);
  h = await enrichSearchHitsForModelCatalog(h, CATALOG_AIR_PURIFIER_FILTERS, {
    modelsTable: "air_purifier_models",
    compatTable: "air_purifier_compatibility_mappings",
    modelIdCol: "air_purifier_model_id",
    filterIdCol: "air_purifier_filter_id",
    filtersTable: "air_purifier_filters",
  });
  h = await enrichSearchHitsForModelCatalog(h, CATALOG_VACUUM_FILTERS, {
    modelsTable: "vacuum_models",
    compatTable: "vacuum_compatibility_mappings",
    modelIdCol: "vacuum_model_id",
    filterIdCol: "vacuum_filter_id",
    filtersTable: "vacuum_filters",
  });
  h = await enrichSearchHitsForModelCatalog(h, CATALOG_HUMIDIFIER_FILTERS, {
    modelsTable: "humidifier_models",
    compatTable: "humidifier_compatibility_mappings",
    modelIdCol: "humidifier_model_id",
    filterIdCol: "humidifier_filter_id",
    filtersTable: "humidifier_filters",
  });
  h = await enrichSearchHitsForModelCatalog(h, CATALOG_APPLIANCE_AIR_FILTERS, {
    modelsTable: "appliance_air_models",
    compatTable: "appliance_air_compatibility_mappings",
    modelIdCol: "appliance_air_model_id",
    filterIdCol: "appliance_air_part_id",
    filtersTable: "appliance_air_parts",
  });
  h = await enrichSearchHitsForModelCatalog(h, CATALOG_WHOLE_HOUSE_WATER_FILTERS, {
    modelsTable: "whole_house_water_models",
    compatTable: "whole_house_water_compatibility_mappings",
    modelIdCol: "whole_house_water_model_id",
    filterIdCol: "whole_house_water_part_id",
    filtersTable: "whole_house_water_parts",
  });
  return h;
}
