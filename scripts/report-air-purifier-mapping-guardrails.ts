import { HOMEKEEP_WEDGE_CATALOG } from "@/lib/catalog/identity";
import { loadEnv } from "./lib/load-env";
import { getSupabaseAdmin } from "./lib/supabase-admin";

const CATALOG = HOMEKEEP_WEDGE_CATALOG.air_purifier;
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

  const [apModels, compatRows, filters, retailerLinks, stagedModels, stagedFilters] = await Promise.all([
    selectPaged<
      { id: string; slug: string; model_number: string; brands: { slug: string; name: string } | null }
    >(
      supabase,
      "air_purifier_models",
      "id, slug, model_number, brands:brand_id(slug, name)",
      pageSize,
    ),
    selectPaged<{ air_purifier_model_id: string; air_purifier_filter_id: string }>(
      supabase,
      "air_purifier_compatibility_mappings",
      "air_purifier_model_id, air_purifier_filter_id",
      pageSize,
    ),
    selectPaged<{
      id: string;
      slug: string;
      oem_part_number: string;
      brands: { slug: string; name: string } | null;
    }>(supabase, "air_purifier_filters", "id, slug, oem_part_number, brands:brand_id(slug, name)", pageSize),
    selectPaged<{ id: string; air_purifier_filter_id: string; is_primary: boolean | null }>(
      supabase,
      "air_purifier_retailer_links",
      "id, air_purifier_filter_id, is_primary",
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

  const modelsWithCompat = new Set(compatRows.map((r) => r.air_purifier_model_id));
  const filterIdsWithAnyLink = new Set(retailerLinks.map((r) => r.air_purifier_filter_id));
  const filterIdsWithCompat = new Set(compatRows.map((r) => r.air_purifier_filter_id));

  const primaryByFilter = new Map<string, string[]>();
  for (const row of retailerLinks) {
    if (row.is_primary !== true) continue;
    const list = primaryByFilter.get(row.air_purifier_filter_id) ?? [];
    list.push(row.id);
    primaryByFilter.set(row.air_purifier_filter_id, list);
  }
  const duplicatePrimary = Array.from(primaryByFilter.entries())
    .filter(([, ids]) => ids.length > 1)
    .map(([air_purifier_filter_id, link_ids]) => {
      const f = filters.find((x) => x.id === air_purifier_filter_id);
      return {
        air_purifier_filter_id,
        filter_slug: f?.slug ?? null,
        oem_part_number: f?.oem_part_number ?? null,
        brand_slug: f?.brands?.slug ?? null,
        primary_link_count: link_ids.length,
        link_ids,
      };
    });

  const compatFiltersMissingRetailerLink = Array.from(filterIdsWithCompat).filter(
    (fid) => !filterIdsWithAnyLink.has(fid),
  );
  const compatFiltersMissingLinkDetail = compatFiltersMissingRetailerLink.map((air_purifier_filter_id) => {
    const f = filters.find((x) => x.id === air_purifier_filter_id);
    return {
      air_purifier_filter_id,
      filter_slug: f?.slug ?? null,
      oem_part_number: f?.oem_part_number ?? null,
      brand_slug: f?.brands?.slug ?? null,
    };
  });

  const liveModelsWithoutCompat = apModels
    .filter((m) => !modelsWithCompat.has(m.id))
    .map((m) => ({
      air_purifier_model_id: m.id,
      slug: m.slug,
      model_number: m.model_number,
      brand_slug: m.brands?.slug ?? null,
      brand_name: m.brands?.name ?? null,
    }));

  const liveFiltersWithoutRetailerLink = filters
    .filter((f) => !filterIdsWithAnyLink.has(f.id))
    .map((f) => ({
      air_purifier_filter_id: f.id,
      slug: f.slug,
      oem_part_number: f.oem_part_number,
      brand_slug: f.brands?.slug ?? null,
      brand_name: f.brands?.name ?? null,
    }));

  const orphanFiltersHiddenFromDiscovery = filters
    .filter((f) => !filterIdsWithCompat.has(f.id) && !filterIdsWithAnyLink.has(f.id))
    .map((f) => ({
      air_purifier_filter_id: f.id,
      slug: f.slug,
      oem_part_number: f.oem_part_number,
      brand_slug: f.brands?.slug ?? null,
      brand_name: f.brands?.name ?? null,
    }));

  const stagedModelsMatchingLiveWithoutCompat: Array<{
    staged_model_addition_id: number;
    status: string;
    proposed_model_number: string;
    proposed_brand_slug: string | null;
    air_purifier_model_id: string;
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
      .from("air_purifier_models")
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
        air_purifier_model_id: row.id,
        model_slug: row.slug,
      });
    }
  }

  const stagedFiltersMatchingLiveWithoutLink: Array<{
    staged_filter_addition_id: number;
    status: string;
    proposed_oem_part_number: string;
    proposed_brand_slug: string | null;
    air_purifier_filter_id: string;
    filter_slug: string;
  }> = [];
  const stagedFiltersPendingLive: Array<{
    staged_filter_addition_id: number;
    status: string;
    proposed_oem_part_number: string | null;
    proposed_brand_slug: string | null;
  }> = [];

  for (const s of stagedFilters) {
    if (!s.proposed_oem_part_number?.trim()) {
      stagedFiltersPendingLive.push({
        staged_filter_addition_id: s.id,
        status: s.status,
        proposed_oem_part_number: s.proposed_oem_part_number,
        proposed_brand_slug: s.proposed_brand_slug,
      });
      continue;
    }
    const brandId = await resolveBrandId(supabase, s.proposed_brand_id, s.proposed_brand_slug);
    if (!brandId) {
      stagedFiltersPendingLive.push({
        staged_filter_addition_id: s.id,
        status: s.status,
        proposed_oem_part_number: s.proposed_oem_part_number,
        proposed_brand_slug: s.proposed_brand_slug,
      });
      continue;
    }
    const { data: live, error: liveErr } = await supabase
      .from("air_purifier_filters")
      .select("id, slug")
      .eq("brand_id", brandId)
      .eq("oem_part_number", s.proposed_oem_part_number.trim())
      .limit(1);
    if (liveErr) throw liveErr;
    const row = (live ?? [])[0] as { id: string; slug: string } | undefined;
    if (!row) {
      stagedFiltersPendingLive.push({
        staged_filter_addition_id: s.id,
        status: s.status,
        proposed_oem_part_number: s.proposed_oem_part_number,
        proposed_brand_slug: s.proposed_brand_slug,
      });
      continue;
    }
    if (!filterIdsWithAnyLink.has(row.id)) {
      stagedFiltersMatchingLiveWithoutLink.push({
        staged_filter_addition_id: s.id,
        status: s.status,
        proposed_oem_part_number: s.proposed_oem_part_number.trim(),
        proposed_brand_slug: s.proposed_brand_slug,
        air_purifier_filter_id: row.id,
        filter_slug: row.slug,
      });
    }
  }

  const summary = {
    duplicate_primary_retailer_link_groups: duplicatePrimary.length,
    filters_referenced_by_compat_without_retailer_link: compatFiltersMissingLinkDetail.length,
    live_models_without_compat: liveModelsWithoutCompat.length,
    live_filters_without_retailer_link: liveFiltersWithoutRetailerLink.length,
    orphan_live_filters_hidden_from_discovery: orphanFiltersHiddenFromDiscovery.length,
    staged_models_matching_live_without_compat: stagedModelsMatchingLiveWithoutCompat.length,
    staged_models_pending_live_row_or_brand: stagedModelsPendingLive.length,
    staged_filters_matching_live_without_retailer_link: stagedFiltersMatchingLiveWithoutLink.length,
    staged_filters_pending_live_row_or_brand: stagedFiltersPendingLive.length,
  };

  const payload = {
    generated_at: new Date().toISOString(),
    catalog: CATALOG,
    read_only: true,
    summary,
    duplicate_primary_retailer_links: take(duplicatePrimary, listLimit),
    filters_referenced_by_compat_without_retailer_link: take(compatFiltersMissingLinkDetail, listLimit),
    live_models_without_compat: take(liveModelsWithoutCompat, listLimit),
    live_filters_without_retailer_link: take(liveFiltersWithoutRetailerLink, listLimit),
    orphan_live_filters_hidden_from_discovery: take(orphanFiltersHiddenFromDiscovery, listLimit),
    staged_models: {
      matching_live_without_compat: take(stagedModelsMatchingLiveWithoutCompat, listLimit),
      pending_live_row_or_unresolved_brand: take(stagedModelsPendingLive, listLimit),
    },
    staged_filters: {
      matching_live_without_retailer_link: take(stagedFiltersMatchingLiveWithoutLink, listLimit),
      pending_live_row_or_unresolved_brand: take(stagedFiltersPendingLive, listLimit),
    },
  };

  console.log(JSON.stringify(payload, null, 2));
}

main().catch((err) => {
  console.error("[report-air-purifier-mapping-guardrails] failed", err);
  process.exit(1);
});
