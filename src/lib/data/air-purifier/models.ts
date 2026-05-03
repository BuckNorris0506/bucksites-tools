import type { Brand } from "@/lib/types/database";
import { getSupabaseServerClient } from "@/lib/supabase/server-client";
import { sortModelFiltersByCompatRecommendation } from "@/lib/vertical/sort-model-filters";
import {
  filterRealBuyRetailerLinks,
  summarizeBuyPathGateSuppression,
  type BuyPathGateSuppressionSummary,
} from "@/lib/retailers/launch-buy-links";
import type { AirPurifierFilterRow, AirPurifierRetailerLink } from "./types";

export type AirPurifierModelDetail = {
  id: string;
  slug: string;
  brand_id: string;
  model_number: string;
  title: string;
  series: string | null;
  notes: string | null;
  brand: Pick<Brand, "id" | "slug" | "name">;
};

export type AirPurifierModelWithFilters = AirPurifierModelDetail & {
  filters: (AirPurifierFilterRow & {
    retailer_links: AirPurifierRetailerLink[];
    is_recommended_fit: boolean;
  })[];
  /** Gate summary for the primary (sort-first) filter’s raw retailer rows; absent when no filters. */
  primary_buy_path_gate_suppression?: BuyPathGateSuppressionSummary;
};

export async function getAirPurifierModelBySlug(
  slug: string,
): Promise<AirPurifierModelWithFilters | null> {
  const supabase = getSupabaseServerClient();

  const { data: row, error: rowErr } = await supabase
    .from("air_purifier_models")
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

  const modelRow = row as unknown as AirPurifierModelDetail;

  const { data: maps, error: mapErr } = await supabase
    .from("air_purifier_compatibility_mappings")
    .select("air_purifier_filter_id, is_recommended")
    .eq("air_purifier_model_id", modelRow.id);

  if (mapErr) throw mapErr;
  const recommendedByFilterId = new Map<string, boolean>();
  for (const m of maps ?? []) {
    const fid = m.air_purifier_filter_id as string;
    const prev = recommendedByFilterId.get(fid) ?? false;
    recommendedByFilterId.set(fid, prev || m.is_recommended === true);
  }
  const filterIds = Array.from(recommendedByFilterId.keys());

  if (filterIds.length === 0) {
    return { ...modelRow, filters: [] };
  }

  const { data: filters, error: fErr } = await supabase
    .from("air_purifier_filters")
    .select(
      "id, slug, brand_id, oem_part_number, name, replacement_interval_months, notes",
    )
    .in("id", filterIds);

  if (fErr) throw fErr;

  const { data: links, error: lErr } = await supabase
    .from("air_purifier_retailer_links")
    .select(
      "id, air_purifier_filter_id, retailer_name, affiliate_url, is_primary, retailer_key, browser_truth_classification, browser_truth_buyable_subtype, browser_truth_notes, browser_truth_checked_at",
    )
    .in("air_purifier_filter_id", filterIds)
    .eq("status", "approved")
    .order("is_primary", { ascending: false })
    .order("retailer_name", { ascending: true });

  if (lErr) throw lErr;

  const byFilter = new Map<string, AirPurifierRetailerLink[]>();
  for (const link of (links ?? []) as AirPurifierRetailerLink[]) {
    const list = byFilter.get(link.air_purifier_filter_id) ?? [];
    list.push(link);
    byFilter.set(link.air_purifier_filter_id, list);
  }

  const filterList = ((filters ?? []) as AirPurifierFilterRow[]).map((f) => ({
    ...f,
    retailer_links: filterRealBuyRetailerLinks(byFilter.get(f.id) ?? []),
    is_recommended_fit: recommendedByFilterId.get(f.id) === true,
  }));

  const sortedFilters = sortModelFiltersByCompatRecommendation(
    filterList,
    recommendedByFilterId,
  );
  const primaryId = sortedFilters[0]?.id;
  const primaryRawLinks = primaryId ? (byFilter.get(primaryId) ?? []) : [];

  return {
    ...modelRow,
    filters: sortedFilters,
    primary_buy_path_gate_suppression:
      sortedFilters.length > 0 ? summarizeBuyPathGateSuppression(primaryRawLinks) : undefined,
  };
}
