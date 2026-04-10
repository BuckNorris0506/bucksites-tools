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
 * Refrigerator filter rows worth surfacing in browse/search: at least one compatibility mapping
 * or at least one retailer link.
 */
export async function loadRefrigeratorUsefulFilterIds(): Promise<Set<string>> {
  const [fromCompat, fromLinks] = await Promise.all([
    pagedDistinctIds("compatibility_mappings", "filter_id"),
    pagedDistinctIds("retailer_links", "filter_id"),
  ]);
  return new Set([...Array.from(fromCompat), ...Array.from(fromLinks)]);
}

export type RefrigeratorBrowseFilterRow = {
  slug: string;
  oem_part_number: string;
  name: string | null;
};

/** Filters eligible for public browse lists (Home, caps, category sections). */
export async function listRefrigeratorUsefulFiltersForBrowse(
  limit: number,
): Promise<RefrigeratorBrowseFilterRow[]> {
  const ids = await loadRefrigeratorUsefulFilterIds();
  if (ids.size === 0) return [];

  const supabase = getSupabaseServerClient();
  const idArr = Array.from(ids);
  const rows: RefrigeratorBrowseFilterRow[] = [];
  for (let i = 0; i < idArr.length; i += 100) {
    const { data, error } = await supabase
      .from("filters")
      .select("slug, oem_part_number, name")
      .in("id", idArr.slice(i, i + 100));
    if (error) throw error;
    rows.push(...((data ?? []) as RefrigeratorBrowseFilterRow[]));
  }
  rows.sort((a, b) => a.oem_part_number.localeCompare(b.oem_part_number));
  return rows.slice(0, limit);
}

/** Slugs for filters that appear in global search filter hits (refrigerator catalog only). */
export async function loadRefrigeratorUsefulFilterSlugs(): Promise<Set<string>> {
  const ids = await loadRefrigeratorUsefulFilterIds();
  if (ids.size === 0) return new Set();

  const supabase = getSupabaseServerClient();
  const idArr = Array.from(ids);
  const slugs = new Set<string>();
  for (let i = 0; i < idArr.length; i += 100) {
    const { data, error } = await supabase.from("filters").select("slug").in("id", idArr.slice(i, i + 100));
    if (error) throw error;
    for (const r of data ?? []) slugs.add((r as { slug: string }).slug);
  }
  return slugs;
}
