import type { Brand } from "@/lib/types/database";
import { uniqueFilterAliasesForPdp } from "@/lib/data/filter-alias-helpers";
import { getSupabaseServerClient } from "@/lib/supabase/server-client";
import type {
  AirPurifierFilterRow,
  AirPurifierModelListRow,
  AirPurifierRetailerLink,
} from "./types";
import { filterRealBuyRetailerLinks } from "@/lib/retailers/launch-buy-links";

export type AirPurifierFilterDetail = AirPurifierFilterRow & {
  brand: Pick<Brand, "slug" | "name">;
};

export type AirPurifierFilterWithModels = AirPurifierFilterDetail & {
  models: AirPurifierModelListRow[];
  retailer_links: AirPurifierRetailerLink[];
  /** Search aliases from air_purifier_filter_aliases (excludes redundant OEM echo). */
  also_known_as: string[];
};

export async function getAirPurifierFilterBySlug(
  slug: string,
): Promise<AirPurifierFilterWithModels | null> {
  const supabase = getSupabaseServerClient();
  const slugParam = slug.trim();

  const { data: filter, error: fErr } = await supabase
    .from("air_purifier_filters")
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
  } as unknown as AirPurifierFilterDetail;

  const { data: maps, error: mErr } = await supabase
    .from("air_purifier_compatibility_mappings")
    .select("air_purifier_model_id")
    .eq("air_purifier_filter_id", filterRow.id);

  if (mErr) throw mErr;
  const modelIds = Array.from(
    new Set((maps ?? []).map((x) => x.air_purifier_model_id as string)),
  );

  let models: AirPurifierModelListRow[] = [];
  if (modelIds.length > 0) {
    const { data: fm, error: fmErr } = await supabase
      .from("air_purifier_models")
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
    models = (fm ?? []) as unknown as AirPurifierModelListRow[];
  }

  const { data: links, error: lErr } = await supabase
    .from("air_purifier_retailer_links")
    .select(
      "id, air_purifier_filter_id, retailer_name, affiliate_url, is_primary, retailer_key, browser_truth_classification, browser_truth_notes, browser_truth_checked_at",
    )
    .eq("air_purifier_filter_id", filterRow.id)
    .eq("status", "approved")
    .order("is_primary", { ascending: false })
    .order("retailer_name", { ascending: true });

  if (lErr) throw lErr;

  const { data: aliasRows, error: aErr } = await supabase
    .from("air_purifier_filter_aliases")
    .select("alias")
    .eq("air_purifier_filter_id", filterRow.id);

  if (aErr) throw aErr;
  const rawAliases = (aliasRows ?? []).map((r) => (r as { alias: string }).alias);
  const also_known_as = uniqueFilterAliasesForPdp(rawAliases, filterRow.oem_part_number);

  return {
    ...filterRow,
    models,
    retailer_links: filterRealBuyRetailerLinks(
      (links ?? []) as AirPurifierRetailerLink[],
    ),
    also_known_as,
  };
}
