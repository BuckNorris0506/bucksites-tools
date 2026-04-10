import type {
  Brand,
  Filter,
  FridgeModel,
  ResetInstruction,
  RetailerLink,
} from "@/lib/types/database";
import { getSupabaseServerClient } from "@/lib/supabase/server-client";
import { filterRealBuyRetailerLinks } from "@/lib/retailers/launch-buy-links";

export type FridgeDetail = FridgeModel & {
  brand: Pick<Brand, "id" | "slug" | "name">;
};

export type FridgeWithFilters = FridgeDetail & {
  filters: (Filter & { retailer_links: RetailerLink[] })[];
  reset_instructions: Pick<
    ResetInstruction,
    "id" | "title" | "body_markdown"
  >[];
};

export async function getFridgeBySlug(slug: string): Promise<FridgeWithFilters | null> {
  const supabase = getSupabaseServerClient();

  const { data: fridge, error: fridgeErr } = await supabase
    .from("fridge_models")
    .select(
      `
      id,
      slug,
      brand_id,
      model_number,
      notes,
      brand:brands!inner ( id, slug, name )
    `,
    )
    .eq("slug", slug)
    .maybeSingle();

  if (fridgeErr) throw fridgeErr;
  if (!fridge) return null;

  const fridgeRow = fridge as unknown as FridgeDetail;

  const { data: maps, error: mapErr } = await supabase
    .from("compatibility_mappings")
    .select("filter_id")
    .eq("fridge_model_id", fridgeRow.id);

  if (mapErr) throw mapErr;
  const filterIds = Array.from(
    new Set((maps ?? []).map((m) => m.filter_id as string)),
  );
  if (filterIds.length === 0) {
    const { data: resets } = await supabase
      .from("reset_instructions")
      .select("id, title, body_markdown")
      .eq("brand_id", fridgeRow.brand_id);

    return {
      ...fridgeRow,
      filters: [],
      reset_instructions: (resets ?? []) as FridgeWithFilters["reset_instructions"],
    };
  }

  const { data: filters, error: fErr } = await supabase
    .from("filters")
    .select(
      "id, slug, brand_id, oem_part_number, name, replacement_interval_months, notes",
    )
    .in("id", filterIds);

  if (fErr) throw fErr;

  const { data: links, error: lErr } = await supabase
    .from("retailer_links")
    .select("id, filter_id, retailer_name, affiliate_url, is_primary, retailer_key")
    .in("filter_id", filterIds)
    .order("is_primary", { ascending: false })
    .order("retailer_name", { ascending: true });

  if (lErr) throw lErr;

  const byFilter = new Map<string, RetailerLink[]>();
  for (const link of (links ?? []) as RetailerLink[]) {
    const list = byFilter.get(link.filter_id) ?? [];
    list.push(link);
    byFilter.set(link.filter_id, list);
  }

  const filterList = ((filters ?? []) as Filter[]).map((f) => ({
    ...f,
    retailer_links: filterRealBuyRetailerLinks(byFilter.get(f.id) ?? []),
  }));

  filterList.sort((a, b) =>
    (a.oem_part_number ?? "").localeCompare(b.oem_part_number ?? ""),
  );

  const { data: resets, error: rErr } = await supabase
    .from("reset_instructions")
    .select("id, title, body_markdown")
    .eq("brand_id", fridgeRow.brand_id);

  if (rErr) throw rErr;

  return {
    ...fridgeRow,
    filters: filterList,
    reset_instructions: (resets ?? []) as FridgeWithFilters["reset_instructions"],
  };
}

export async function listFridgeModelsByBrand(brandId: string) {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("fridge_models")
    .select("id, slug, model_number")
    .eq("brand_id", brandId)
    .order("model_number", { ascending: true });

  if (error) throw error;
  return data ?? [];
}
