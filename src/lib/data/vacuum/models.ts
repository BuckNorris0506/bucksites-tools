import type { Brand } from "@/lib/types/database";
import { getSupabaseServerClient } from "@/lib/supabase/server-client";
import { sortModelFiltersByCompatRecommendation } from "@/lib/vertical/sort-model-filters";
import type { VacuumFilterRow, VacuumRetailerLink } from "./types";

export type VacuumModelDetail = {
  id: string;
  slug: string;
  brand_id: string;
  model_number: string;
  title: string;
  series: string | null;
  notes: string | null;
  brand: Pick<Brand, "id" | "slug" | "name">;
};

export type VacuumModelWithFilters = VacuumModelDetail & {
  filters: (VacuumFilterRow & { retailer_links: VacuumRetailerLink[] })[];
};

export async function getVacuumModelBySlug(
  slug: string,
): Promise<VacuumModelWithFilters | null> {
  const supabase = getSupabaseServerClient();

  const { data: row, error: rowErr } = await supabase
    .from("vacuum_models")
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

  const modelRow = row as unknown as VacuumModelDetail;

  const { data: maps, error: mapErr } = await supabase
    .from("vacuum_compatibility_mappings")
    .select("vacuum_filter_id, is_recommended")
    .eq("vacuum_model_id", modelRow.id);

  if (mapErr) throw mapErr;
  const recommendedByFilterId = new Map<string, boolean>();
  for (const m of maps ?? []) {
    const fid = m.vacuum_filter_id as string;
    const prev = recommendedByFilterId.get(fid) ?? false;
    recommendedByFilterId.set(fid, prev || m.is_recommended === true);
  }
  const filterIds = Array.from(recommendedByFilterId.keys());

  if (filterIds.length === 0) {
    return { ...modelRow, filters: [] };
  }

  const { data: filters, error: fErr } = await supabase
    .from("vacuum_filters")
    .select(
      "id, slug, brand_id, oem_part_number, name, replacement_interval_months, notes",
    )
    .in("id", filterIds);

  if (fErr) throw fErr;

  const { data: links, error: lErr } = await supabase
    .from("vacuum_retailer_links")
    .select(
      "id, vacuum_filter_id, retailer_name, affiliate_url, is_primary, retailer_key",
    )
    .in("vacuum_filter_id", filterIds)
    .eq("status", "approved")
    .order("is_primary", { ascending: false })
    .order("retailer_name", { ascending: true });

  if (lErr) throw lErr;

  const byFilter = new Map<string, VacuumRetailerLink[]>();
  for (const link of (links ?? []) as VacuumRetailerLink[]) {
    const list = byFilter.get(link.vacuum_filter_id) ?? [];
    list.push(link);
    byFilter.set(link.vacuum_filter_id, list);
  }

  const filterList = ((filters ?? []) as VacuumFilterRow[]).map((f) => ({
    ...f,
    retailer_links: byFilter.get(f.id) ?? [],
  }));

  sortModelFiltersByCompatRecommendation(filterList, recommendedByFilterId);

  return {
    ...modelRow,
    filters: filterList,
  };
}
