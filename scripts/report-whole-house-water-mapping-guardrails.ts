import { HOMEKEEP_WEDGE_CATALOG } from "@/lib/catalog/identity";
import { loadEnv } from "./lib/load-env";
import { getSupabaseAdmin } from "./lib/supabase-admin";

const CATALOG = HOMEKEEP_WEDGE_CATALOG.whole_house_water;
const ACTIVE_STAGED = ["queued", "reviewing", "ready"] as const;

type Supabase = ReturnType<typeof getSupabaseAdmin>;

function parseArgNumber(flag: string, fallback: number): number {
  const idx = process.argv.indexOf(flag);
  if (idx === -1) return fallback;
  const raw = process.argv[idx + 1];
  const n = raw ? Number.parseInt(raw, 10) : Number.NaN;
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

async function selectPaged<T>(
  supabase: Supabase,
  table: string,
  columns: string,
  pageSize: number,
): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase.from(table).select(columns).range(from, from + pageSize - 1);
    if (error) throw error;
    const chunk = (data ?? []) as T[];
    out.push(...chunk);
    if (chunk.length < pageSize) break;
  }
  return out;
}

async function resolveBrandId(
  supabase: Supabase,
  proposedBrandId: string | null,
  proposedBrandSlug: string | null,
): Promise<string | null> {
  if (proposedBrandId) {
    const { data, error } = await supabase.from("brands").select("id").eq("id", proposedBrandId).limit(1);
    if (error) throw error;
    return ((data ?? [])[0] as { id: string } | undefined)?.id ?? null;
  }
  if (!proposedBrandSlug?.trim()) return null;
  const { data, error } = await supabase.from("brands").select("id").eq("slug", proposedBrandSlug.trim()).limit(1);
  if (error) throw error;
  return ((data ?? [])[0] as { id: string } | undefined)?.id ?? null;
}

function take<T>(arr: T[], n: number): { items: T[]; truncated: boolean } {
  if (arr.length <= n) return { items: arr, truncated: false };
  return { items: arr.slice(0, n), truncated: true };
}

async function main() {
  loadEnv();
  const supabase = getSupabaseAdmin();
  const listLimit = parseArgNumber("--limit", 100);
  const pageSize = parseArgNumber("--page-size", 2000);

  const [whModels, compatRows, parts, retailerLinks, stagedModels, stagedFilters] = await Promise.all([
    selectPaged<
      { id: string; slug: string; model_number: string; brands: { slug: string; name: string } | null }
    >(
      supabase,
      "whole_house_water_models",
      "id, slug, model_number, brands:brand_id(slug, name)",
      pageSize,
    ),
    selectPaged<{ whole_house_water_model_id: string; whole_house_water_part_id: string }>(
      supabase,
      "whole_house_water_compatibility_mappings",
      "whole_house_water_model_id, whole_house_water_part_id",
      pageSize,
    ),
    selectPaged<{
      id: string;
      slug: string;
      oem_part_number: string;
      brands: { slug: string; name: string } | null;
    }>(supabase, "whole_house_water_parts", "id, slug, oem_part_number, brands:brand_id(slug, name)", pageSize),
    selectPaged<{ id: string; whole_house_water_part_id: string; is_primary: boolean | null }>(
      supabase,
      "whole_house_water_retailer_links",
      "id, whole_house_water_part_id, is_primary",
      pageSize,
    ),
    supabase
      .from("staged_model_additions")
      .select("id, status, proposed_model_number, proposed_brand_id, proposed_brand_slug")
      .eq("catalog", CATALOG)
      .in("status", [...ACTIVE_STAGED])
      .then(({ data, error }) => {
        if (error) throw error;
        return (data ?? []) as Array<{
          id: number;
          status: string;
          proposed_model_number: string;
          proposed_brand_id: string | null;
          proposed_brand_slug: string | null;
        }>;
      }),
    supabase
      .from("staged_filter_part_additions")
      .select("id, status, proposed_oem_part_number, proposed_brand_id, proposed_brand_slug")
      .eq("catalog", CATALOG)
      .in("status", [...ACTIVE_STAGED])
      .then(({ data, error }) => {
        if (error) throw error;
        return (data ?? []) as Array<{
          id: number;
          status: string;
          proposed_oem_part_number: string | null;
          proposed_brand_id: string | null;
          proposed_brand_slug: string | null;
        }>;
      }),
  ]);

  const modelsWithCompat = new Set(compatRows.map((r) => r.whole_house_water_model_id));
  const partIdsWithAnyLink = new Set(retailerLinks.map((r) => r.whole_house_water_part_id));
  const partIdsWithCompat = new Set(compatRows.map((r) => r.whole_house_water_part_id));

  const primaryByPart = new Map<string, string[]>();
  for (const row of retailerLinks) {
    if (row.is_primary !== true) continue;
    const list = primaryByPart.get(row.whole_house_water_part_id) ?? [];
    list.push(row.id);
    primaryByPart.set(row.whole_house_water_part_id, list);
  }
  const duplicatePrimary = Array.from(primaryByPart.entries())
    .filter(([, ids]) => ids.length > 1)
    .map(([whole_house_water_part_id, link_ids]) => {
      const p = parts.find((x) => x.id === whole_house_water_part_id);
      return {
        whole_house_water_part_id,
        part_slug: p?.slug ?? null,
        oem_part_number: p?.oem_part_number ?? null,
        brand_slug: p?.brands?.slug ?? null,
        primary_link_count: link_ids.length,
        link_ids,
      };
    });

  const compatPartsMissingRetailerLink = Array.from(partIdsWithCompat).filter(
    (pid) => !partIdsWithAnyLink.has(pid),
  );
  const compatPartsMissingLinkDetail = compatPartsMissingRetailerLink.map((whole_house_water_part_id) => {
    const p = parts.find((x) => x.id === whole_house_water_part_id);
    return {
      whole_house_water_part_id,
      part_slug: p?.slug ?? null,
      oem_part_number: p?.oem_part_number ?? null,
      brand_slug: p?.brands?.slug ?? null,
    };
  });

  const liveModelsWithoutCompat = whModels
    .filter((m) => !modelsWithCompat.has(m.id))
    .map((m) => ({
      whole_house_water_model_id: m.id,
      slug: m.slug,
      model_number: m.model_number,
      brand_slug: m.brands?.slug ?? null,
      brand_name: m.brands?.name ?? null,
    }));

  const livePartsWithoutRetailerLink = parts
    .filter((p) => !partIdsWithAnyLink.has(p.id))
    .map((p) => ({
      whole_house_water_part_id: p.id,
      slug: p.slug,
      oem_part_number: p.oem_part_number,
      brand_slug: p.brands?.slug ?? null,
      brand_name: p.brands?.name ?? null,
    }));

  const orphanPartsHiddenFromDiscovery = parts
    .filter((p) => !partIdsWithCompat.has(p.id) && !partIdsWithAnyLink.has(p.id))
    .map((p) => ({
      whole_house_water_part_id: p.id,
      slug: p.slug,
      oem_part_number: p.oem_part_number,
      brand_slug: p.brands?.slug ?? null,
      brand_name: p.brands?.name ?? null,
    }));

  const stagedModelsMatchingLiveWithoutCompat: Array<{
    staged_model_addition_id: number;
    status: string;
    proposed_model_number: string;
    proposed_brand_slug: string | null;
    whole_house_water_model_id: string;
    model_slug: string;
  }> = [];
  const stagedModelsPendingLive: Array<{
    staged_model_addition_id: number;
    status: string;
    proposed_model_number: string;
    proposed_brand_slug: string | null;
  }> = [];

  for (const s of stagedModels) {
    const brandId = await resolveBrandId(supabase, s.proposed_brand_id, s.proposed_brand_slug);
    if (!brandId) {
      stagedModelsPendingLive.push({
        staged_model_addition_id: s.id,
        status: s.status,
        proposed_model_number: s.proposed_model_number,
        proposed_brand_slug: s.proposed_brand_slug,
      });
      continue;
    }
    const { data: live, error: liveErr } = await supabase
      .from("whole_house_water_models")
      .select("id, slug")
      .eq("brand_id", brandId)
      .eq("model_number", s.proposed_model_number.trim())
      .limit(1);
    if (liveErr) throw liveErr;
    const row = (live ?? [])[0] as { id: string; slug: string } | undefined;
    if (!row) {
      stagedModelsPendingLive.push({
        staged_model_addition_id: s.id,
        status: s.status,
        proposed_model_number: s.proposed_model_number,
        proposed_brand_slug: s.proposed_brand_slug,
      });
      continue;
    }
    if (!modelsWithCompat.has(row.id)) {
      stagedModelsMatchingLiveWithoutCompat.push({
        staged_model_addition_id: s.id,
        status: s.status,
        proposed_model_number: s.proposed_model_number,
        proposed_brand_slug: s.proposed_brand_slug,
        whole_house_water_model_id: row.id,
        model_slug: row.slug,
      });
    }
  }

  const stagedPartsMatchingLiveWithoutLink: Array<{
    staged_filter_addition_id: number;
    status: string;
    proposed_oem_part_number: string;
    proposed_brand_slug: string | null;
    whole_house_water_part_id: string;
    part_slug: string;
  }> = [];
  const stagedPartsPendingLive: Array<{
    staged_filter_addition_id: number;
    status: string;
    proposed_oem_part_number: string | null;
    proposed_brand_slug: string | null;
  }> = [];

  for (const s of stagedFilters) {
    if (!s.proposed_oem_part_number?.trim()) {
      stagedPartsPendingLive.push({
        staged_filter_addition_id: s.id,
        status: s.status,
        proposed_oem_part_number: s.proposed_oem_part_number,
        proposed_brand_slug: s.proposed_brand_slug,
      });
      continue;
    }
    const brandId = await resolveBrandId(supabase, s.proposed_brand_id, s.proposed_brand_slug);
    if (!brandId) {
      stagedPartsPendingLive.push({
        staged_filter_addition_id: s.id,
        status: s.status,
        proposed_oem_part_number: s.proposed_oem_part_number,
        proposed_brand_slug: s.proposed_brand_slug,
      });
      continue;
    }
    const { data: live, error: liveErr } = await supabase
      .from("whole_house_water_parts")
      .select("id, slug")
      .eq("brand_id", brandId)
      .eq("oem_part_number", s.proposed_oem_part_number.trim())
      .limit(1);
    if (liveErr) throw liveErr;
    const row = (live ?? [])[0] as { id: string; slug: string } | undefined;
    if (!row) {
      stagedPartsPendingLive.push({
        staged_filter_addition_id: s.id,
        status: s.status,
        proposed_oem_part_number: s.proposed_oem_part_number,
        proposed_brand_slug: s.proposed_brand_slug,
      });
      continue;
    }
    if (!partIdsWithAnyLink.has(row.id)) {
      stagedPartsMatchingLiveWithoutLink.push({
        staged_filter_addition_id: s.id,
        status: s.status,
        proposed_oem_part_number: s.proposed_oem_part_number.trim(),
        proposed_brand_slug: s.proposed_brand_slug,
        whole_house_water_part_id: row.id,
        part_slug: row.slug,
      });
    }
  }

  const summary = {
    duplicate_primary_retailer_link_groups: duplicatePrimary.length,
    parts_referenced_by_compat_without_retailer_link: compatPartsMissingLinkDetail.length,
    live_models_without_compat: liveModelsWithoutCompat.length,
    live_parts_without_retailer_link: livePartsWithoutRetailerLink.length,
    orphan_live_parts_hidden_from_discovery: orphanPartsHiddenFromDiscovery.length,
    staged_models_matching_live_without_compat: stagedModelsMatchingLiveWithoutCompat.length,
    staged_models_pending_live_row_or_brand: stagedModelsPendingLive.length,
    staged_parts_matching_live_without_retailer_link: stagedPartsMatchingLiveWithoutLink.length,
    staged_parts_pending_live_row_or_brand: stagedPartsPendingLive.length,
  };

  const payload = {
    generated_at: new Date().toISOString(),
    catalog: CATALOG,
    read_only: true,
    summary,
    duplicate_primary_retailer_links: take(duplicatePrimary, listLimit),
    parts_referenced_by_compat_without_retailer_link: take(compatPartsMissingLinkDetail, listLimit),
    live_models_without_compat: take(liveModelsWithoutCompat, listLimit),
    live_parts_without_retailer_link: take(livePartsWithoutRetailerLink, listLimit),
    orphan_live_parts_hidden_from_discovery: take(orphanPartsHiddenFromDiscovery, listLimit),
    staged_models: {
      matching_live_without_compat: take(stagedModelsMatchingLiveWithoutCompat, listLimit),
      pending_live_row_or_unresolved_brand: take(stagedModelsPendingLive, listLimit),
    },
    staged_filter_parts: {
      matching_live_without_retailer_link: take(stagedPartsMatchingLiveWithoutLink, listLimit),
      pending_live_row_or_unresolved_brand: take(stagedPartsPendingLive, listLimit),
    },
  };

  console.log(JSON.stringify(payload, null, 2));
}

main().catch((err) => {
  console.error("[report-whole-house-water-mapping-guardrails] failed", err);
  process.exit(1);
});
