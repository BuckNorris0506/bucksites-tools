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
 * Air purifier filters worth surfacing in browse/search: at least one compatibility mapping
 * or at least one row in retailer_links (RLS may hide non-approved links for anon; server client respects session).
 */
export async function loadAirPurifierUsefulFilterIds(): Promise<Set<string>> {
  const [fromCompat, fromLinks] = await Promise.all([
    pagedDistinctIds("air_purifier_compatibility_mappings", "air_purifier_filter_id"),
    pagedDistinctIds("air_purifier_retailer_links", "air_purifier_filter_id"),
  ]);
  return new Set([...Array.from(fromCompat), ...Array.from(fromLinks)]);
}

export type AirPurifierBrowseFilterRow = {
  slug: string;
  oem_part_number: string;
  name: string | null;
};

/** Filters eligible for public browse lists in this vertical. */
export async function listAirPurifierUsefulFiltersForBrowse(
  limit: number,
): Promise<AirPurifierBrowseFilterRow[]> {
  const ids = await loadAirPurifierUsefulFilterIds();
  if (ids.size === 0) return [];

  const supabase = getSupabaseServerClient();
  const idArr = Array.from(ids);
  const rows: AirPurifierBrowseFilterRow[] = [];
  for (let i = 0; i < idArr.length; i += 100) {
    const { data, error } = await supabase
      .from("air_purifier_filters")
      .select("slug, oem_part_number, name")
      .in("id", idArr.slice(i, i + 100));
    if (error) throw error;
    rows.push(...((data ?? []) as AirPurifierBrowseFilterRow[]));
  }
  rows.sort((a, b) => a.oem_part_number.localeCompare(b.oem_part_number));
  return rows.slice(0, limit);
}

/** Slugs for filters in global / vertical search filter hits (air purifier catalog only). */
export async function loadAirPurifierUsefulFilterSlugs(): Promise<Set<string>> {
  const ids = await loadAirPurifierUsefulFilterIds();
  if (ids.size === 0) return new Set();

  const supabase = getSupabaseServerClient();
  const idArr = Array.from(ids);
  const slugs = new Set<string>();
  for (let i = 0; i < idArr.length; i += 100) {
    const { data, error } = await supabase
      .from("air_purifier_filters")
      .select("slug")
      .in("id", idArr.slice(i, i + 100));
    if (error) throw error;
    for (const r of data ?? []) slugs.add((r as { slug: string }).slug);
  }
  return slugs;
}

/** Brand ids: any model brand, plus brands with ≥1 useful filter. */
export async function listAirPurifierBrowseBrandIds(): Promise<string[]> {
  const supabase = getSupabaseServerClient();
  const usefulIds = await loadAirPurifierUsefulFilterIds();

  const [{ data: modelRows }, filterBrandIds] = await Promise.all([
    supabase.from("air_purifier_models").select("brand_id"),
    (async (): Promise<string[]> => {
      if (usefulIds.size === 0) return [];
      const idArr = Array.from(usefulIds);
      const brands = new Set<string>();
      for (let i = 0; i < idArr.length; i += 100) {
        const { data, error } = await supabase
          .from("air_purifier_filters")
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

  const out = new Set<string>(filterBrandIds);
  for (const r of modelRows ?? []) {
    const id = (r as { brand_id: string }).brand_id;
    if (id) out.add(id);
  }
  return Array.from(out);
}
