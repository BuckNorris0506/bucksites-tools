import type { Brand, Filter, FridgeModel, RetailerLink } from "@/lib/types/database";
import { uniqueFilterAliasesForPdp } from "@/lib/data/filter-alias-helpers";
import { getSupabaseServerClient } from "@/lib/supabase/server-client";
import { loadRefrigeratorUsefulFilterIds } from "@/lib/data/refrigerator-filter-usefulness";
import { filterRealBuyRetailerLinks } from "@/lib/retailers/launch-buy-links";

export type FilterDetail = Filter & {
  brand: Pick<Brand, "slug" | "name">;
};

export type FridgeModelListRow = Pick<
  FridgeModel,
  "id" | "slug" | "model_number"
> & {
  brand: Pick<Brand, "slug" | "name">;
};

export type FilterWithFridges = FilterDetail & {
  fridge_models: FridgeModelListRow[];
  retailer_links: RetailerLink[];
  /** Search aliases for this filter (excludes redundant OEM echo). */
  also_known_as: string[];
};

export async function getFilterBySlug(slug: string): Promise<FilterWithFridges | null> {
  const supabase = getSupabaseServerClient();
  const slugParam = slug.trim();

  const { data: filter, error: fErr } = await supabase
    .from("filters")
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
  } as unknown as FilterDetail;

  const { data: maps, error: mErr } = await supabase
    .from("compatibility_mappings")
    .select("fridge_model_id")
    .eq("filter_id", filterRow.id);

  if (mErr) throw mErr;
  const fridgeIds = Array.from(
    new Set((maps ?? []).map((x) => x.fridge_model_id as string)),
  );

  let fridges: FilterWithFridges["fridge_models"] = [];
  if (fridgeIds.length > 0) {
    const { data: fm, error: fmErr } = await supabase
      .from("fridge_models")
      .select(
        `
        id,
        slug,
        model_number,
        brand:brands!inner ( slug, name )
      `,
      )
      .in("id", fridgeIds)
      .order("model_number", { ascending: true });

    if (fmErr) throw fmErr;
    fridges = (fm ?? []) as unknown as FridgeModelListRow[];
  }

  const { data: links, error: lErr } = await supabase
    .from("retailer_links")
    .select("id, filter_id, retailer_name, affiliate_url, is_primary, retailer_key")
    .eq("filter_id", filterRow.id)
    .order("is_primary", { ascending: false })
    .order("retailer_name", { ascending: true });

  if (lErr) throw lErr;

  const { data: aliasRows, error: aErr } = await supabase
    .from("filter_aliases")
    .select("alias")
    .eq("filter_id", filterRow.id);

  if (aErr) throw aErr;
  const rawAliases = (aliasRows ?? []).map((r) => (r as { alias: string }).alias);
  const also_known_as = uniqueFilterAliasesForPdp(rawAliases, filterRow.oem_part_number);

  return {
    ...filterRow,
    fridge_models: fridges,
    retailer_links: filterRealBuyRetailerLinks((links ?? []) as RetailerLink[]),
    also_known_as,
  };
}

export async function listFiltersByBrand(brandId: string) {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("filters")
    .select("id, slug, oem_part_number, name, replacement_interval_months")
    .eq("brand_id", brandId)
    .order("oem_part_number", { ascending: true });

  if (error) throw error;
  const rows = data ?? [];
  const useful = await loadRefrigeratorUsefulFilterIds();
  return rows.filter((f) => useful.has((f as { id: string }).id));
}
