import { getSupabaseServerClient } from "@/lib/supabase/server-client";

const PAGE = 2000;

async function pagedDistinctIds(table: string, column: string): Promise<Set<string>> {
  const supabase = getSupabaseServerClient();
  const out = new Set<string>();
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase.from(table).select(column).range(from, from + PAGE - 1);
    if (error) throw error;
    const chunk = data ?? [];
    for (const row of chunk) {
      const v = (row as unknown as Record<string, unknown>)[column];
      if (typeof v === "string" && v.length > 0) out.add(v);
    }
    if (chunk.length < PAGE) break;
  }
  return out;
}

/**
 * Whole-house water parts worth surfacing in browse/search: at least one compatibility mapping
 * or at least one approved retailer link (RLS hides non-approved links).
 */
export async function loadWholeHouseWaterUsefulFilterIds(): Promise<Set<string>> {
  const [fromCompat, fromLinks] = await Promise.all([
    pagedDistinctIds("whole_house_water_compatibility_mappings", "whole_house_water_part_id"),
    pagedDistinctIds("whole_house_water_retailer_links", "whole_house_water_part_id"),
  ]);
  return new Set([...Array.from(fromCompat), ...Array.from(fromLinks)]);
}

export type WholeHouseWaterBrowseFilterRow = {
  slug: string;
  oem_part_number: string;
  name: string | null;
};

/** Filters eligible for public browse lists in this vertical. */
export async function listWholeHouseWaterUsefulFiltersForBrowse(
  limit: number,
): Promise<WholeHouseWaterBrowseFilterRow[]> {
  const ids = await loadWholeHouseWaterUsefulFilterIds();
  if (ids.size === 0) return [];

  const supabase = getSupabaseServerClient();
  const idArr = Array.from(ids);
  const rows: WholeHouseWaterBrowseFilterRow[] = [];
  for (let i = 0; i < idArr.length; i += 100) {
    const { data, error } = await supabase
      .from("whole_house_water_parts")
      .select("slug, oem_part_number, name")
      .in("id", idArr.slice(i, i + 100));
    if (error) throw error;
    rows.push(...((data ?? []) as WholeHouseWaterBrowseFilterRow[]));
  }
  rows.sort((a, b) => a.oem_part_number.localeCompare(b.oem_part_number));
  return rows.slice(0, limit);
}

/** Slugs for parts that appear in global search filter hits (whole-house-water catalog only). */
export async function loadWholeHouseWaterUsefulFilterSlugs(): Promise<Set<string>> {
  const ids = await loadWholeHouseWaterUsefulFilterIds();
  if (ids.size === 0) return new Set();

  const supabase = getSupabaseServerClient();
  const idArr = Array.from(ids);
  const slugs = new Set<string>();
  for (let i = 0; i < idArr.length; i += 100) {
    const { data, error } = await supabase
      .from("whole_house_water_parts")
      .select("slug")
      .in("id", idArr.slice(i, i + 100));
    if (error) throw error;
    for (const r of data ?? []) slugs.add((r as { slug: string }).slug);
  }
  return slugs;
}

/** Brand ids for browse chips: any model brand, plus brands that have at least one useful part. */
export async function listWholeHouseWaterBrowseBrandIds(): Promise<string[]> {
  const supabase = getSupabaseServerClient();
  const usefulIds = await loadWholeHouseWaterUsefulFilterIds();

  const [{ data: modelRows }, partBrandIds] = await Promise.all([
    supabase.from("whole_house_water_models").select("brand_id"),
    (async (): Promise<string[]> => {
      if (usefulIds.size === 0) return [];
      const idArr = Array.from(usefulIds);
      const brands = new Set<string>();
      for (let i = 0; i < idArr.length; i += 100) {
        const { data, error } = await supabase
          .from("whole_house_water_parts")
          .select("brand_id")
          .in("id", idArr.slice(i, i + 100));
        if (error) throw error;
        for (const r of data ?? []) {
          const id = (r as { brand_id: string }).brand_id;
          if (id) brands.add(id);
        }
      }
      return Array.from(brands);
    })(),
  ]);

  const out = new Set<string>(partBrandIds);
  for (const r of modelRows ?? []) {
    const id = (r as { brand_id: string }).brand_id;
    if (id) out.add(id);
  }
  return Array.from(out);
}
