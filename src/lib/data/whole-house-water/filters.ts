import type { Brand } from "@/lib/types/database";
import { getSupabaseServerClient } from "@/lib/supabase/server-client";
import type {
  WholeHouseWaterModelListRow,
  WholeHouseWaterPartRow,
  WholeHouseWaterRetailerLink,
} from "./types";
import { filterRealBuyRetailerLinks } from "@/lib/retailers/launch-buy-links";

export type WholeHouseWaterPartDetail = WholeHouseWaterPartRow & {
  brand: Pick<Brand, "slug" | "name">;
};

export type WholeHouseWaterPartWithModels = WholeHouseWaterPartDetail & {
  models: WholeHouseWaterModelListRow[];
  retailer_links: WholeHouseWaterRetailerLink[];
};

export async function getWholeHouseWaterPartBySlug(
  slug: string,
): Promise<WholeHouseWaterPartWithModels | null> {
  const supabase = getSupabaseServerClient();
  const slugParam = slug.trim();

  const { data: part, error: fErr } = await supabase
    .from("whole_house_water_parts")
    .select(
      "id, slug, brand_id, oem_part_number, name, replacement_interval_months, notes",
    )
    .ilike("slug", slugParam)
    .maybeSingle();

  if (fErr) throw fErr;
  if (!part) return null;

  const { data: brand, error: bErr } = await supabase
    .from("brands")
    .select("slug, name")
    .eq("id", part.brand_id)
    .maybeSingle();

  if (bErr) throw bErr;
  if (!brand) return null;

  const partRow = {
    ...part,
    brand,
  } as unknown as WholeHouseWaterPartDetail;

  const { data: maps, error: mErr } = await supabase
    .from("whole_house_water_compatibility_mappings")
    .select("whole_house_water_model_id")
    .eq("whole_house_water_part_id", partRow.id);

  if (mErr) throw mErr;
  const modelIds = Array.from(
    new Set((maps ?? []).map((x) => x.whole_house_water_model_id as string)),
  );

  let models: WholeHouseWaterModelListRow[] = [];
  if (modelIds.length > 0) {
    const { data: fm, error: fmErr } = await supabase
      .from("whole_house_water_models")
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
    models = (fm ?? []) as unknown as WholeHouseWaterModelListRow[];
  }

  const { data: links, error: lErr } = await supabase
    .from("whole_house_water_retailer_links")
    .select(
      "id, whole_house_water_part_id, retailer_name, affiliate_url, is_primary, retailer_key",
    )
    .eq("whole_house_water_part_id", partRow.id)
    .eq("status", "approved")
    .order("is_primary", { ascending: false })
    .order("retailer_name", { ascending: true });

  if (lErr) throw lErr;

  return {
    ...partRow,
    models,
    retailer_links: filterRealBuyRetailerLinks(
      (links ?? []) as WholeHouseWaterRetailerLink[],
    ),
  };
}
