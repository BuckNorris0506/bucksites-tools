import type {
  Brand,
  Filter,
  FridgeModel,
  ResetInstruction,
  RetailerLink,
} from "@/lib/types/database";
import { uniqueFilterAliasesForPdp } from "@/lib/data/filter-alias-helpers";
import { getSupabaseServerClient } from "@/lib/supabase/server-client";
import {
  filterRealBuyRetailerLinks,
  summarizeBuyPathGateSuppression,
  type BuyPathGateSuppressionSummary,
} from "@/lib/retailers/launch-buy-links";

export type FridgeDetail = FridgeModel & {
  brand: Pick<Brand, "id" | "slug" | "name">;
};

/** One mapped filter on a fridge model PDP — trust fields align with `getFilterBySlug` / `/filter/[slug]`. */
export type FridgeMappedFilterRow = Filter & {
  retailer_links: RetailerLink[];
  also_known_as: string[];
  buy_path_gate_suppression: BuyPathGateSuppressionSummary;
  /**
   * Distinct fridge models in the repo mapped to this filter (same count as `fridge_models.length` on `/filter/[slug]`).
   * Passed to `buildPartPageTrust({ modelsCount })` on the fridge model hub so part-trust evidence matches the filter PDP.
   */
  compatible_fridge_model_count: number;
};

export type FridgeWithFilters = FridgeDetail & {
  filters: FridgeMappedFilterRow[];
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

  const [{ data: links, error: lErr }, { data: compatRows, error: cErr }, { data: aliasRows, error: aErr }] =
    await Promise.all([
      supabase
        .from("retailer_links")
        .select(
          "id, filter_id, retailer_name, affiliate_url, is_primary, retailer_key, browser_truth_classification, browser_truth_notes, browser_truth_checked_at",
        )
        .in("filter_id", filterIds)
        .order("is_primary", { ascending: false })
        .order("retailer_name", { ascending: true }),
      supabase.from("compatibility_mappings").select("filter_id, fridge_model_id").in("filter_id", filterIds),
      supabase.from("filter_aliases").select("filter_id, alias").in("filter_id", filterIds),
    ]);

  if (lErr) throw lErr;
  if (cErr) throw cErr;
  if (aErr) throw aErr;

  const byFilter = new Map<string, RetailerLink[]>();
  for (const link of (links ?? []) as RetailerLink[]) {
    const list = byFilter.get(link.filter_id) ?? [];
    list.push(link);
    byFilter.set(link.filter_id, list);
  }

  const distinctFridgesPerFilter = new Map<string, Set<string>>();
  for (const row of compatRows ?? []) {
    const fid = (row as { filter_id: string }).filter_id;
    const mid = (row as { fridge_model_id: string }).fridge_model_id;
    let set = distinctFridgesPerFilter.get(fid);
    if (!set) {
      set = new Set();
      distinctFridgesPerFilter.set(fid, set);
    }
    set.add(mid);
  }

  const aliasesByFilter = new Map<string, string[]>();
  for (const row of aliasRows ?? []) {
    const fid = (row as { filter_id: string }).filter_id;
    const alias = (row as { alias: string }).alias;
    const list = aliasesByFilter.get(fid) ?? [];
    list.push(alias);
    aliasesByFilter.set(fid, list);
  }

  const filterList: FridgeMappedFilterRow[] = ((filters ?? []) as Filter[]).map((f) => {
    const raw = byFilter.get(f.id) ?? [];
    const rawAliases = aliasesByFilter.get(f.id) ?? [];
    const also_known_as = uniqueFilterAliasesForPdp(rawAliases, f.oem_part_number ?? "");
    return {
      ...f,
      retailer_links: filterRealBuyRetailerLinks(raw),
      buy_path_gate_suppression: summarizeBuyPathGateSuppression(raw),
      also_known_as,
      compatible_fridge_model_count: distinctFridgesPerFilter.get(f.id)?.size ?? 0,
    };
  });

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
