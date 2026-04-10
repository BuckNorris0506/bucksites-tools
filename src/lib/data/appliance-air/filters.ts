import type { Brand } from "@/lib/types/database";
import { getSupabaseServerClient } from "@/lib/supabase/server-client";
import type {
  ApplianceAirModelListRow,
  ApplianceAirPartRow,
  ApplianceAirRetailerLink,
} from "./types";

export type ApplianceAirPartDetail = ApplianceAirPartRow & {
  brand: Pick<Brand, "slug" | "name">;
};

export type ApplianceAirPartWithModels = ApplianceAirPartDetail & {
  models: ApplianceAirModelListRow[];
  retailer_links: ApplianceAirRetailerLink[];
};

export async function getApplianceAirPartBySlug(
  slug: string,
): Promise<ApplianceAirPartWithModels | null> {
  const supabase = getSupabaseServerClient();
  const slugParam = slug.trim();

  const { data: part, error: fErr } = await supabase
    .from("appliance_air_parts")
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
  } as unknown as ApplianceAirPartDetail;

  const { data: maps, error: mErr } = await supabase
    .from("appliance_air_compatibility_mappings")
    .select("appliance_air_model_id")
    .eq("appliance_air_part_id", partRow.id);

  if (mErr) throw mErr;
  const modelIds = Array.from(
    new Set((maps ?? []).map((x) => x.appliance_air_model_id as string)),
  );

  let models: ApplianceAirModelListRow[] = [];
  if (modelIds.length > 0) {
    const { data: fm, error: fmErr } = await supabase
      .from("appliance_air_models")
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
    models = (fm ?? []) as unknown as ApplianceAirModelListRow[];
  }

  const { data: links, error: lErr } = await supabase
    .from("appliance_air_retailer_links")
    .select(
      "id, appliance_air_part_id, retailer_name, affiliate_url, is_primary, retailer_key",
    )
    .eq("appliance_air_part_id", partRow.id)
    .eq("status", "approved")
    .order("is_primary", { ascending: false })
    .order("retailer_name", { ascending: true });

  if (lErr) throw lErr;

  return {
    ...partRow,
    models,
    retailer_links: (links ?? []) as ApplianceAirRetailerLink[],
  };
}
