import type { Brand } from "@/lib/types/database";
import { getSupabaseServerClient } from "@/lib/supabase/server-client";
import { filterRealBuyRetailerLinks } from "@/lib/retailers/launch-buy-links";
import type {
  VacuumFilterRow,
  VacuumModelListRow,
  VacuumRetailerLink,
} from "./types";

export type VacuumFilterDetail = VacuumFilterRow & {
  brand: Pick<Brand, "slug" | "name">;
};

export type VacuumFilterWithModels = VacuumFilterDetail & {
  models: VacuumModelListRow[];
  retailer_links: VacuumRetailerLink[];
};

export async function getVacuumFilterBySlug(
  slug: string,
): Promise<VacuumFilterWithModels | null> {
  const supabase = getSupabaseServerClient();
  const slugParam = slug.trim();

  const { data: filter, error: fErr } = await supabase
    .from("vacuum_filters")
    .select(
      "id, slug, brand_id, oem_part_number, name, replacement_interval_months, notes",
    )
    .ilike("slug", slugParam)
    .maybeSingle();

  if (fErr) throw fErr;
  if (!filter) return null;

  const { data: brand, error: bErr } = await supabase
    .from("brands")
    .select("slug, name")
    .eq("id", filter.brand_id)
    .maybeSingle();

  if (bErr) throw bErr;
  if (!brand) return null;

  const filterRow = {
    ...filter,
    brand,
  } as unknown as VacuumFilterDetail;

  const { data: maps, error: mErr } = await supabase
    .from("vacuum_compatibility_mappings")
    .select("vacuum_model_id")
    .eq("vacuum_filter_id", filterRow.id);

  if (mErr) throw mErr;
  const modelIds = Array.from(
    new Set((maps ?? []).map((x) => x.vacuum_model_id as string)),
  );

  let models: VacuumModelListRow[] = [];
  if (modelIds.length > 0) {
    const { data: fm, error: fmErr } = await supabase
      .from("vacuum_models")
      .select(
        `
        id,
        slug,
        model_number,
        brand:brands!inner ( slug, name )
      `,
      )
      .in("id", modelIds)
      .order("model_number", { ascending: true });

    if (fmErr) throw fmErr;
    models = (fm ?? []) as unknown as VacuumModelListRow[];
  }

  const { data: links, error: lErr } = await supabase
    .from("vacuum_retailer_links")
    .select(
      "id, vacuum_filter_id, retailer_name, affiliate_url, is_primary, retailer_key",
    )
    .eq("vacuum_filter_id", filterRow.id)
    .eq("status", "approved")
    .order("is_primary", { ascending: false })
    .order("retailer_name", { ascending: true });

  if (lErr) throw lErr;

  return {
    ...filterRow,
    models,
    retailer_links: filterRealBuyRetailerLinks((links ?? []) as VacuumRetailerLink[]),
  };
}
