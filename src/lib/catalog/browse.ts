import { getSupabaseServerClient } from "@/lib/supabase/server-client";
import { getBrandBySlug } from "@/lib/data/brands";
import { listRefrigeratorUsefulFiltersForBrowse } from "@/lib/data/refrigerator-filter-usefulness";
import {
  listAirPurifierBrowseBrandIds,
  listAirPurifierUsefulFiltersForBrowse,
  loadAirPurifierUsefulFilterIds,
} from "@/lib/data/air-purifier-filter-usefulness";
import {
  listWholeHouseWaterBrowseBrandIds,
  listWholeHouseWaterUsefulFiltersForBrowse,
  loadWholeHouseWaterUsefulFilterIds,
} from "@/lib/data/whole-house-water-filter-usefulness";
import type { HomekeepWedgeCatalog } from "@/lib/catalog/identity";
import type { Brand } from "@/lib/types/database";

/** High-level catalog buckets for browse UI (matches /catalog cards). */
export type CatalogBrowseCategory = HomekeepWedgeCatalog;

export type BrowseBrandRow = Pick<Brand, "slug" | "name">;
export type BrowseModelRow = { slug: string; model_number: string };
export type BrowseFilterRow = {
  slug: string;
  oem_part_number: string;
  name: string | null;
};

/** Label for rounded brand chips (homepage + browse-by-brand). Full `name` stays on brand pages. */
export function brandNameForBrowseChip(brand: BrowseBrandRow): string {
  if (brand.slug === "ge") return "GE";
  return brand.name;
}

const BRAND_CAP = 48;
const MODEL_CAP = 72;
const FILTER_CAP = 72;

async function distinctBrandIdsFromTwoTables(
  tableA: string,
  tableB: string,
): Promise<string[]> {
  const supabase = getSupabaseServerClient();
  const sb = supabase as unknown as {
    from: (t: string) => { select: (c: string) => Promise<{ data: unknown[] | null }> };
  };
  const [{ data: a }, { data: b }] = await Promise.all([
    sb.from(tableA).select("brand_id"),
    sb.from(tableB).select("brand_id"),
  ]);
  const ids = new Set<string>();
  for (const row of a ?? []) {
    const id = (row as { brand_id: string }).brand_id;
    if (id) ids.add(id);
  }
  for (const row of b ?? []) {
    const id = (row as { brand_id: string }).brand_id;
    if (id) ids.add(id);
  }
  return Array.from(ids);
}

async function brandsByIds(ids: string[]): Promise<BrowseBrandRow[]> {
  if (ids.length === 0) return [];
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("brands")
    .select("slug, name")
    .in("id", ids)
    .order("name", { ascending: true })
    .limit(BRAND_CAP);
  if (error) throw error;
  return (data ?? []) as BrowseBrandRow[];
}

export async function listBrowseBrands(
  cat: CatalogBrowseCategory,
): Promise<BrowseBrandRow[]> {
  switch (cat) {
    case "refrigerator_water": {
      // Only brands with ≥1 fridge model. Excludes filter-only rows (e.g. orphaned/demo filters)
      // whose brand_id would otherwise appear when unioning with filters.
      const supabase = getSupabaseServerClient();
      const { data, error } = await supabase.from("fridge_models").select("brand_id");
      if (error) throw error;
      const ids = Array.from(
        new Set(
          (data ?? [])
            .map((r) => (r as { brand_id: string }).brand_id)
            .filter((id): id is string => Boolean(id)),
        ),
      );
      return brandsByIds(ids);
    }
    case "air_purifier": {
      const ids = await listAirPurifierBrowseBrandIds();
      return brandsByIds(ids);
    }
    case "vacuum": {
      const ids = await distinctBrandIdsFromTwoTables("vacuum_models", "vacuum_filters");
      return brandsByIds(ids);
    }
    case "humidifier": {
      const ids = await distinctBrandIdsFromTwoTables(
        "humidifier_models",
        "humidifier_filters",
      );
      return brandsByIds(ids);
    }
    case "appliance_air": {
      const ids = await distinctBrandIdsFromTwoTables(
        "appliance_air_models",
        "appliance_air_parts",
      );
      return brandsByIds(ids);
    }
    case "whole_house_water": {
      const ids = await listWholeHouseWaterBrowseBrandIds();
      return brandsByIds(ids);
    }
    default: {
      const _x: never = cat;
      return _x;
    }
  }
}

export async function listBrowseModels(
  cat: CatalogBrowseCategory,
): Promise<BrowseModelRow[]> {
  const supabase = getSupabaseServerClient();
  switch (cat) {
    case "refrigerator_water": {
      const { data, error } = await supabase
        .from("fridge_models")
        .select("slug, model_number")
        .order("model_number", { ascending: true })
        .limit(MODEL_CAP);
      if (error) throw error;
      return (data ?? []) as BrowseModelRow[];
    }
    case "air_purifier": {
      const { data, error } = await supabase
        .from("air_purifier_models")
        .select("slug, model_number")
        .order("model_number", { ascending: true })
        .limit(MODEL_CAP);
      if (error) throw error;
      return (data ?? []) as BrowseModelRow[];
    }
    case "vacuum": {
      const { data, error } = await supabase
        .from("vacuum_models")
        .select("slug, model_number")
        .order("model_number", { ascending: true })
        .limit(MODEL_CAP);
      if (error) throw error;
      return (data ?? []) as BrowseModelRow[];
    }
    case "humidifier": {
      const { data, error } = await supabase
        .from("humidifier_models")
        .select("slug, model_number")
        .order("model_number", { ascending: true })
        .limit(MODEL_CAP);
      if (error) throw error;
      return (data ?? []) as BrowseModelRow[];
    }
    case "appliance_air": {
      const { data, error } = await supabase
        .from("appliance_air_models")
        .select("slug, model_number")
        .order("model_number", { ascending: true })
        .limit(MODEL_CAP);
      if (error) throw error;
      return (data ?? []) as BrowseModelRow[];
    }
    case "whole_house_water": {
      const { data, error } = await supabase
        .from("whole_house_water_models")
        .select("slug, model_number")
        .order("model_number", { ascending: true })
        .limit(MODEL_CAP);
      if (error) throw error;
      return (data ?? []) as BrowseModelRow[];
    }
    default: {
      const _x: never = cat;
      return _x;
    }
  }
}

export async function listBrowseFilters(
  cat: CatalogBrowseCategory,
): Promise<BrowseFilterRow[]> {
  const supabase = getSupabaseServerClient();
  switch (cat) {
    case "refrigerator_water": {
      return (await listRefrigeratorUsefulFiltersForBrowse(FILTER_CAP)) as BrowseFilterRow[];
    }
    case "air_purifier": {
      return (await listAirPurifierUsefulFiltersForBrowse(FILTER_CAP)) as BrowseFilterRow[];
    }
    case "vacuum": {
      const { data, error } = await supabase
        .from("vacuum_filters")
        .select("slug, oem_part_number, name")
        .order("oem_part_number", { ascending: true })
        .limit(FILTER_CAP);
      if (error) throw error;
      return (data ?? []) as BrowseFilterRow[];
    }
    case "humidifier": {
      const { data, error } = await supabase
        .from("humidifier_filters")
        .select("slug, oem_part_number, name")
        .order("oem_part_number", { ascending: true })
        .limit(FILTER_CAP);
      if (error) throw error;
      return (data ?? []) as BrowseFilterRow[];
    }
    case "appliance_air": {
      const { data, error } = await supabase
        .from("appliance_air_parts")
        .select("slug, oem_part_number, name")
        .order("oem_part_number", { ascending: true })
        .limit(FILTER_CAP);
      if (error) throw error;
      return (data ?? []) as BrowseFilterRow[];
    }
    case "whole_house_water": {
      return (await listWholeHouseWaterUsefulFiltersForBrowse(FILTER_CAP)) as BrowseFilterRow[];
    }
    default: {
      const _x: never = cat;
      return _x;
    }
  }
}

export type VerticalBrandBrowsePayload = {
  brand: Brand;
  models: BrowseModelRow[];
  filters: BrowseFilterRow[];
};

export async function getVerticalBrandBrowse(
  cat: Exclude<CatalogBrowseCategory, "refrigerator_water">,
  brandSlug: string,
): Promise<VerticalBrandBrowsePayload | null> {
  const brand = await getBrandBySlug(brandSlug.trim());
  if (!brand) return null;

  const supabase = getSupabaseServerClient();
  switch (cat) {
    case "air_purifier": {
      const usefulFilterIds = await loadAirPurifierUsefulFilterIds();
      const [models, filters] = await Promise.all([
        supabase
          .from("air_purifier_models")
          .select("slug, model_number")
          .eq("brand_id", brand.id)
          .order("model_number", { ascending: true }),
        supabase
          .from("air_purifier_filters")
          .select("id, slug, oem_part_number, name")
          .eq("brand_id", brand.id)
          .order("oem_part_number", { ascending: true }),
      ]);
      if (models.error) throw models.error;
      if (filters.error) throw filters.error;
      const filterRows = (filters.data ?? []).filter((r) =>
        usefulFilterIds.has((r as { id: string }).id),
      ) as { slug: string; oem_part_number: string; name: string | null }[];
      return {
        brand,
        models: (models.data ?? []) as BrowseModelRow[],
        filters: filterRows,
      };
    }
    case "vacuum": {
      const [models, filters] = await Promise.all([
        supabase
          .from("vacuum_models")
          .select("slug, model_number")
          .eq("brand_id", brand.id)
          .order("model_number", { ascending: true }),
        supabase
          .from("vacuum_filters")
          .select("slug, oem_part_number, name")
          .eq("brand_id", brand.id)
          .order("oem_part_number", { ascending: true }),
      ]);
      if (models.error) throw models.error;
      if (filters.error) throw filters.error;
      return {
        brand,
        models: (models.data ?? []) as BrowseModelRow[],
        filters: (filters.data ?? []) as BrowseFilterRow[],
      };
    }
    case "humidifier": {
      const [models, filters] = await Promise.all([
        supabase
          .from("humidifier_models")
          .select("slug, model_number")
          .eq("brand_id", brand.id)
          .order("model_number", { ascending: true }),
        supabase
          .from("humidifier_filters")
          .select("slug, oem_part_number, name")
          .eq("brand_id", brand.id)
          .order("oem_part_number", { ascending: true }),
      ]);
      if (models.error) throw models.error;
      if (filters.error) throw filters.error;
      return {
        brand,
        models: (models.data ?? []) as BrowseModelRow[],
        filters: (filters.data ?? []) as BrowseFilterRow[],
      };
    }
    case "appliance_air": {
      const [models, filters] = await Promise.all([
        supabase
          .from("appliance_air_models")
          .select("slug, model_number")
          .eq("brand_id", brand.id)
          .order("model_number", { ascending: true }),
        supabase
          .from("appliance_air_parts")
          .select("slug, oem_part_number, name")
          .eq("brand_id", brand.id)
          .order("oem_part_number", { ascending: true }),
      ]);
      if (models.error) throw models.error;
      if (filters.error) throw filters.error;
      return {
        brand,
        models: (models.data ?? []) as BrowseModelRow[],
        filters: (filters.data ?? []) as BrowseFilterRow[],
      };
    }
    case "whole_house_water": {
      const usefulPartIds = await loadWholeHouseWaterUsefulFilterIds();
      const [models, filters] = await Promise.all([
        supabase
          .from("whole_house_water_models")
          .select("slug, model_number")
          .eq("brand_id", brand.id)
          .order("model_number", { ascending: true }),
        supabase
          .from("whole_house_water_parts")
          .select("id, slug, oem_part_number, name")
          .eq("brand_id", brand.id)
          .order("oem_part_number", { ascending: true }),
      ]);
      if (models.error) throw models.error;
      if (filters.error) throw filters.error;
      const filterRows = (filters.data ?? []).filter((r) =>
        usefulPartIds.has((r as { id: string }).id),
      ) as { slug: string; oem_part_number: string; name: string | null }[];
      return {
        brand,
        models: (models.data ?? []) as BrowseModelRow[],
        filters: filterRows,
      };
    }
    default: {
      const _x: never = cat;
      return _x;
    }
  }
}
