import type { Brand } from "@/lib/types/database";
import { getSupabaseServerClient } from "@/lib/supabase/server-client";
import {
  filterRealBuyRetailerLinks,
  summarizeBuyPathGateSuppression,
  type BuyPathGateSuppressionSummary,
} from "@/lib/retailers/launch-buy-links";
import type {
  HumidifierFilterRow,
  HumidifierModelListRow,
  HumidifierRetailerLink,
} from "./types";

export type HumidifierFilterDetail = HumidifierFilterRow & {
  brand: Pick<Brand, "slug" | "name">;
};

export type HumidifierFilterWithModels = HumidifierFilterDetail & {
  models: HumidifierModelListRow[];
  retailer_links: HumidifierRetailerLink[];
  buy_path_gate_suppression: BuyPathGateSuppressionSummary;
};

export async function getHumidifierFilterBySlug(
  slug: string,
): Promise<HumidifierFilterWithModels | null> {
  const supabase = getSupabaseServerClient();
  const slugParam = slug.trim();

  const { data: filter, error: fErr } = await supabase
    .from("humidifier_filters")
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
  } as unknown as HumidifierFilterDetail;

  const { data: maps, error: mErr } = await supabase
    .from("humidifier_compatibility_mappings")
    .select("humidifier_model_id")
    .eq("humidifier_filter_id", filterRow.id);

  if (mErr) throw mErr;
  const modelIds = Array.from(
    new Set((maps ?? []).map((x) => x.humidifier_model_id as string)),
  );

  let models: HumidifierModelListRow[] = [];
  if (modelIds.length > 0) {
    const { data: fm, error: fmErr } = await supabase
      .from("humidifier_models")
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
    models = (fm ?? []) as unknown as HumidifierModelListRow[];
  }

  const { data: links, error: lErr } = await supabase
    .from("humidifier_retailer_links")
    .select(
      "id, humidifier_filter_id, retailer_name, affiliate_url, is_primary, retailer_key, browser_truth_classification, browser_truth_buyable_subtype, browser_truth_notes, browser_truth_checked_at",
    )
    .eq("humidifier_filter_id", filterRow.id)
    .eq("status", "approved")
    .order("is_primary", { ascending: false })
    .order("retailer_name", { ascending: true });

  if (lErr) throw lErr;

  const rawRetailerLinks = (links ?? []) as HumidifierRetailerLink[];

  return {
    ...filterRow,
    models,
    retailer_links: filterRealBuyRetailerLinks(rawRetailerLinks),
    buy_path_gate_suppression: summarizeBuyPathGateSuppression(rawRetailerLinks),
  };
}
