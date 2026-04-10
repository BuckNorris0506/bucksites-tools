import type { Brand } from "@/lib/types/database";
import { getSupabaseServerClient } from "@/lib/supabase/server-client";
import { sortModelFiltersByCompatRecommendation } from "@/lib/vertical/sort-model-filters";
import type { ApplianceAirPartRow, ApplianceAirRetailerLink } from "./types";

export type ApplianceAirModelDetail = {
  id: string;
  slug: string;
  brand_id: string;
  model_number: string;
  title: string;
  series: string | null;
  notes: string | null;
  brand: Pick<Brand, "id" | "slug" | "name">;
};

export type ApplianceAirModelWithParts = ApplianceAirModelDetail & {
  filters: (ApplianceAirPartRow & {
    retailer_links: ApplianceAirRetailerLink[];
  })[];
};

export async function getApplianceAirModelBySlug(
  slug: string,
): Promise<ApplianceAirModelWithParts | null> {
  const supabase = getSupabaseServerClient();

  const { data: row, error: rowErr } = await supabase
    .from("appliance_air_models")
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

  const modelRow = row as unknown as ApplianceAirModelDetail;

  const { data: maps, error: mapErr } = await supabase
    .from("appliance_air_compatibility_mappings")
    .select("appliance_air_part_id, is_recommended")
    .eq("appliance_air_model_id", modelRow.id);

  if (mapErr) throw mapErr;
  const recommendedByPartId = new Map<string, boolean>();
  for (const m of maps ?? []) {
    const pid = m.appliance_air_part_id as string;
    const prev = recommendedByPartId.get(pid) ?? false;
    recommendedByPartId.set(pid, prev || m.is_recommended === true);
  }
  const partIds = Array.from(recommendedByPartId.keys());

  if (partIds.length === 0) {
    return { ...modelRow, filters: [] };
  }

  const { data: parts, error: fErr } = await supabase
    .from("appliance_air_parts")
    .select(
      "id, slug, brand_id, oem_part_number, name, replacement_interval_months, notes",
    )
    .in("id", partIds);

  if (fErr) throw fErr;

  const { data: links, error: lErr } = await supabase
    .from("appliance_air_retailer_links")
    .select(
      "id, appliance_air_part_id, retailer_name, affiliate_url, is_primary, retailer_key",
    )
    .in("appliance_air_part_id", partIds)
    .eq("status", "approved")
    .order("is_primary", { ascending: false })
    .order("retailer_name", { ascending: true });

  if (lErr) throw lErr;

  const byPart = new Map<string, ApplianceAirRetailerLink[]>();
  for (const link of (links ?? []) as ApplianceAirRetailerLink[]) {
    const list = byPart.get(link.appliance_air_part_id) ?? [];
    list.push(link);
    byPart.set(link.appliance_air_part_id, list);
  }

  const partList = ((parts ?? []) as ApplianceAirPartRow[]).map((f) => ({
    ...f,
    retailer_links: byPart.get(f.id) ?? [],
  }));

  sortModelFiltersByCompatRecommendation(partList, recommendedByPartId);

  return {
    ...modelRow,
    filters: partList,
  };
}
