import type { Brand } from "@/lib/types/database";
import { getSupabaseServerClient } from "@/lib/supabase/server-client";
import { sortModelFiltersByCompatRecommendation } from "@/lib/vertical/sort-model-filters";
import type { HumidifierFilterRow, HumidifierRetailerLink } from "./types";

export type HumidifierModelDetail = {
  id: string;
  slug: string;
  brand_id: string;
  model_number: string;
  title: string;
  series: string | null;
  notes: string | null;
  brand: Pick<Brand, "id" | "slug" | "name">;
};

export type HumidifierModelWithFilters = HumidifierModelDetail & {
  filters: (HumidifierFilterRow & {
    retailer_links: HumidifierRetailerLink[];
  })[];
};

export async function getHumidifierModelBySlug(
  slug: string,
): Promise<HumidifierModelWithFilters | null> {
  const supabase = getSupabaseServerClient();

  const { data: row, error: rowErr } = await supabase
    .from("humidifier_models")
    .select(
      `
      id,
      slug,
      brand_id,
      model_number,
      title,
      series,
      notes,
      brand:brands!inner ( id, slug, name )
    `,
    )
    .eq("slug", slug)
    .maybeSingle();

  if (rowErr) throw rowErr;
  if (!row) return null;

  const modelRow = row as unknown as HumidifierModelDetail;

  const { data: maps, error: mapErr } = await supabase
    .from("humidifier_compatibility_mappings")
    .select("humidifier_filter_id, is_recommended")
    .eq("humidifier_model_id", modelRow.id);

  if (mapErr) throw mapErr;
  const recommendedByFilterId = new Map<string, boolean>();
  for (const m of maps ?? []) {
    const fid = m.humidifier_filter_id as string;
    const prev = recommendedByFilterId.get(fid) ?? false;
    recommendedByFilterId.set(fid, prev || m.is_recommended === true);
  }
  const filterIds = Array.from(recommendedByFilterId.keys());

  if (filterIds.length === 0) {
    return { ...modelRow, filters: [] };
  }

  const { data: filters, error: fErr } = await supabase
    .from("humidifier_filters")
    .select(
      "id, slug, brand_id, oem_part_number, name, replacement_interval_months, notes",
    )
    .in("id", filterIds);

  if (fErr) throw fErr;

  const { data: links, error: lErr } = await supabase
    .from("humidifier_retailer_links")
    .select(
      "id, humidifier_filter_id, retailer_name, affiliate_url, is_primary, retailer_key",
    )
    .in("humidifier_filter_id", filterIds)
    .eq("status", "approved")
    .order("is_primary", { ascending: false })
    .order("retailer_name", { ascending: true });

  if (lErr) throw lErr;

  const byFilter = new Map<string, HumidifierRetailerLink[]>();
  for (const link of (links ?? []) as HumidifierRetailerLink[]) {
    const list = byFilter.get(link.humidifier_filter_id) ?? [];
    list.push(link);
    byFilter.set(link.humidifier_filter_id, list);
  }

  const filterList = ((filters ?? []) as HumidifierFilterRow[]).map((f) => ({
    ...f,
    retailer_links: byFilter.get(f.id) ?? [],
  }));

  sortModelFiltersByCompatRecommendation(filterList, recommendedByFilterId);

  return {
    ...modelRow,
    filters: filterList,
  };
}
