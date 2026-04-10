/**
 * Read-only cross-wedge ops snapshot: monetization, discovery coverage, and leverage hints.
 * Wedges: refrigerator_water, whole_house_water, air_purifier only.
 */
import { loadEnv } from "./lib/load-env";
import { loadAirPurifierUsefulFilterIds } from "@/lib/data/air-purifier-filter-usefulness";
import { loadRefrigeratorUsefulFilterIds } from "@/lib/data/refrigerator-filter-usefulness";
import { loadWholeHouseWaterUsefulFilterIds } from "@/lib/data/whole-house-water-filter-usefulness";
import { getSupabaseAdmin } from "./lib/supabase-admin";
import {
  HOMEKEEP_GLOBAL_SEARCH_CATALOG,
  HOMEKEEP_MONETIZATION_WEDGE_CATALOG_ORDER,
  HOMEKEEP_WEDGE_CATALOG,
  type HomekeepMonetizationWedgeCatalog,
  monetizationWedgeGapCatalogsOnly,
  monetizationWedgeGapCatalogsWithGlobal,
} from "@/lib/catalog/identity";

const PAGE = 2000;
const PROMOTED_LIMIT = 8;

type WedgeTables = {
  models: string;
  filters: string;
  compat: string;
  modelFk: string;
  filterFk: string;
  retailerLinks: string;
  retailerFilterFk: string;
  searchGapCatalog: HomekeepMonetizationWedgeCatalog;
};

const WEDGE: Record<HomekeepMonetizationWedgeCatalog, WedgeTables> = {
  [HOMEKEEP_WEDGE_CATALOG.refrigerator_water]: {
    models: "fridge_models",
    filters: "filters",
    compat: "compatibility_mappings",
    modelFk: "fridge_model_id",
    filterFk: "filter_id",
    retailerLinks: "retailer_links",
    retailerFilterFk: "filter_id",
    searchGapCatalog: HOMEKEEP_WEDGE_CATALOG.refrigerator_water,
  },
  [HOMEKEEP_WEDGE_CATALOG.whole_house_water]: {
    models: "whole_house_water_models",
    filters: "whole_house_water_parts",
    compat: "whole_house_water_compatibility_mappings",
    modelFk: "whole_house_water_model_id",
    filterFk: "whole_house_water_part_id",
    retailerLinks: "whole_house_water_retailer_links",
    retailerFilterFk: "whole_house_water_part_id",
    searchGapCatalog: HOMEKEEP_WEDGE_CATALOG.whole_house_water,
  },
  [HOMEKEEP_WEDGE_CATALOG.air_purifier]: {
    models: "air_purifier_models",
    filters: "air_purifier_filters",
    compat: "air_purifier_compatibility_mappings",
    modelFk: "air_purifier_model_id",
    filterFk: "air_purifier_filter_id",
    retailerLinks: "air_purifier_retailer_links",
    retailerFilterFk: "air_purifier_filter_id",
    searchGapCatalog: HOMEKEEP_WEDGE_CATALOG.air_purifier,
  },
};

function parseArgNumber(flag: string, fallback: number): number {
  const idx = process.argv.indexOf(flag);
  if (idx === -1) return fallback;
  const raw = process.argv[idx + 1];
  const n = raw ? Number.parseInt(raw, 10) : Number.NaN;
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

async function pagedColumnIds(table: string, column: string): Promise<Set<string>> {
  const supabase = getSupabaseAdmin();
  const out = new Set<string>();
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase.from(table).select(column).range(from, from + PAGE - 1);
    if (error) throw error;
    const chunk = data ?? [];
    for (const row of chunk) {
      const v = (row as unknown as Record<string, unknown>)[column];
      if (typeof v === "string" && v.length > 0) out.add(v);
    }
    if (chunk.length < PAGE) break;
  }
  return out;
}

async function countTableRows(table: string): Promise<number> {
  const supabase = getSupabaseAdmin();
  const { count, error } = await supabase.from(table).select("id", { count: "exact", head: true });
  if (error) throw error;
  return count ?? 0;
}

async function countOrphanFilters(filtersTable: string, usefulIds: Set<string>): Promise<number> {
  const supabase = getSupabaseAdmin();
  let orphan = 0;
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase.from(filtersTable).select("id").range(from, from + PAGE - 1);
    if (error) throw error;
    const chunk = data ?? [];
    for (const row of chunk) {
      const id = (row as { id: string }).id;
      if (typeof id === "string" && !usefulIds.has(id)) orphan += 1;
    }
    if (chunk.length < PAGE) break;
  }
  return orphan;
}

async function loadUsefulIds(w: HomekeepMonetizationWedgeCatalog): Promise<Set<string>> {
  switch (w) {
    case HOMEKEEP_WEDGE_CATALOG.refrigerator_water:
      return loadRefrigeratorUsefulFilterIds();
    case HOMEKEEP_WEDGE_CATALOG.whole_house_water:
      return loadWholeHouseWaterUsefulFilterIds();
    case HOMEKEEP_WEDGE_CATALOG.air_purifier:
      return loadAirPurifierUsefulFilterIds();
    default: {
      const _e: never = w;
      return _e;
    }
  }
}

type WedgeSnapshot = {
  wedge: HomekeepMonetizationWedgeCatalog;
  live_model_count: number;
  live_filter_or_part_count: number;
  discoverable_filter_count: number;
  filters_with_retailer_link_distinct: number;
  compatibility_mapped_filters_without_retailer_link: number;
  orphan_filters_hidden_from_discovery: number;
  live_models_without_any_compatibility_mapping: number;
  search_gaps_unresolved_for_wedge_catalog: number;
};

async function snapshotWedge(w: HomekeepMonetizationWedgeCatalog): Promise<WedgeSnapshot> {
  const t = WEDGE[w];
  const supabase = getSupabaseAdmin();

  const [
    live_model_count,
    live_filter_or_part_count,
    usefulIds,
    compatFilterIds,
    linkFilterIds,
    modelsWithCompat,
  ] = await Promise.all([
    countTableRows(t.models),
    countTableRows(t.filters),
    loadUsefulIds(w),
    pagedColumnIds(t.compat, t.filterFk),
    pagedColumnIds(t.retailerLinks, t.retailerFilterFk),
    pagedColumnIds(t.compat, t.modelFk),
  ]);

  const discoverable_filter_count = usefulIds.size;
  const filters_with_retailer_link_distinct = linkFilterIds.size;

  const mappedNoLink = [...Array.from(compatFilterIds)].filter((id) => !linkFilterIds.has(id)).length;

  const orphan_filters_hidden_from_discovery = await countOrphanFilters(t.filters, usefulIds);

  const { count: totalModels, error: tmErr } = await supabase
    .from(t.models)
    .select("id", { count: "exact", head: true });
  if (tmErr) throw tmErr;
  const totalM = totalModels ?? 0;
  const live_models_without_any_compatibility_mapping = Math.max(0, totalM - modelsWithCompat.size);

  const { count: gapCount, error: gErr } = await supabase
    .from("search_gaps")
    .select("id", { count: "exact", head: true })
    .eq("catalog", t.searchGapCatalog)
    .in("status", ["open", "reviewing", "queued"]);
  if (gErr) throw gErr;

  return {
    wedge: w,
    live_model_count,
    live_filter_or_part_count,
    discoverable_filter_count,
    filters_with_retailer_link_distinct,
    compatibility_mapped_filters_without_retailer_link: mappedNoLink,
    orphan_filters_hidden_from_discovery,
    live_models_without_any_compatibility_mapping,
    search_gaps_unresolved_for_wedge_catalog: gapCount ?? 0,
  };
}

type LeverageItem = {
  rank: number;
  wedge: HomekeepMonetizationWedgeCatalog | typeof HOMEKEEP_GLOBAL_SEARCH_CATALOG | "overall";
  action: string;
  count: number;
  rationale: string;
};

function buildLeverageRanked(
  snapshots: Record<HomekeepMonetizationWedgeCatalog, WedgeSnapshot>,
  allCatalogsGaps: number,
): LeverageItem[] {
  const candidates: Array<Omit<LeverageItem, "rank">> = [];

  for (const w of HOMEKEEP_MONETIZATION_WEDGE_CATALOG_ORDER) {
    const s = snapshots[w];
    if (s.compatibility_mapped_filters_without_retailer_link > 0) {
      candidates.push({
        wedge: w,
        action: "add_retailer_links_for_mapped_filters",
        count: s.compatibility_mapped_filters_without_retailer_link,
        rationale:
          "Filters already tied to models via compatibility_mappings but no retailer_links row — add approved buy links to monetize existing fit graph.",
      });
    }
    if (s.orphan_filters_hidden_from_discovery > 0) {
      candidates.push({
        wedge: w,
        action: "map_or_link_orphan_filters",
        count: s.orphan_filters_hidden_from_discovery,
        rationale:
          "Live filter/part rows with no compatibility_mappings and no retailer_links — invisible in browse/search until mapped or linked.",
      });
    }
    if (s.live_models_without_any_compatibility_mapping > 0) {
      candidates.push({
        wedge: w,
        action: "add_compatibility_mappings_for_models",
        count: s.live_models_without_any_compatibility_mapping,
        rationale:
          "Models with zero compat rows — users cannot see which filters fit from model pages or enriched search.",
      });
    }
    if (s.search_gaps_unresolved_for_wedge_catalog > 0) {
      candidates.push({
        wedge: w,
        action: "triage_and_close_stale_search_gaps",
        count: s.search_gaps_unresolved_for_wedge_catalog,
        rationale:
          "Unresolved search_gaps for this wedge catalog — classify, fix data, or mark resolved/ignored via wedge gap-status scripts.",
      });
    }
  }

  if (allCatalogsGaps > 0) {
    candidates.push({
      wedge: HOMEKEEP_GLOBAL_SEARCH_CATALOG,
      action: "triage_all_catalogs_search_gaps",
      count: allCatalogsGaps,
      rationale:
        "Zero-result global /search gaps — often stale after inventory changes; replay runbooks then update status.",
    });
  }

  const score = (c: Omit<LeverageItem, "rank">) =>
    c.action === "add_retailer_links_for_mapped_filters"
      ? c.count * 100
      : c.action === "map_or_link_orphan_filters"
        ? c.count * 70
        : c.action === "add_compatibility_mappings_for_models"
          ? c.count * 40
          : c.action === "triage_all_catalogs_search_gaps"
            ? c.count * 25
            : c.count * 15;

  candidates.sort((a, b) => score(b) - score(a));

  return candidates.slice(0, 12).map((c, i) => ({ ...c, rank: i + 1 }));
}

async function main() {
  loadEnv();
  const promotedLimit = parseArgNumber("--promoted", PROMOTED_LIMIT);
  const supabase = getSupabaseAdmin();

  const [fr, wh, ap] = await Promise.all(
    HOMEKEEP_MONETIZATION_WEDGE_CATALOG_ORDER.map((w) => snapshotWedge(w)),
  );
  const wedges: Record<HomekeepMonetizationWedgeCatalog, WedgeSnapshot> = {
    [HOMEKEEP_WEDGE_CATALOG.refrigerator_water]: fr,
    [HOMEKEEP_WEDGE_CATALOG.whole_house_water]: wh,
    [HOMEKEEP_WEDGE_CATALOG.air_purifier]: ap,
  };

  const monetizationGapCatalogs = monetizationWedgeGapCatalogsOnly();
  const monetizationGapsIncludingGlobal = monetizationWedgeGapCatalogsWithGlobal();

  const { count: unresolvedOverall, error: uoErr } = await supabase
    .from("search_gaps")
    .select("id", { count: "exact", head: true })
    .in("catalog", monetizationGapsIncludingGlobal)
    .in("status", ["open", "reviewing", "queued"]);
  if (uoErr) throw uoErr;

  const { count: unresolvedThreeOnly, error: utErr } = await supabase
    .from("search_gaps")
    .select("id", { count: "exact", head: true })
    .in("catalog", monetizationGapCatalogs)
    .in("status", ["open", "reviewing", "queued"]);
  if (utErr) throw utErr;

  const { count: unresolvedAllCatalogs, error: uaErr } = await supabase
    .from("search_gaps")
    .select("id", { count: "exact", head: true })
    .eq("catalog", HOMEKEEP_GLOBAL_SEARCH_CATALOG)
    .in("status", ["open", "reviewing", "queued"]);
  if (uaErr) throw uaErr;

  const [promotedModels, promotedFilters] = await Promise.all([
    supabase
      .from("staged_model_additions")
      .select("id, catalog, status, proposed_model_number, proposed_brand_slug, created_at")
      .in("catalog", monetizationGapCatalogs)
      .eq("status", "promoted")
      .order("id", { ascending: false })
      .limit(promotedLimit),
    supabase
      .from("staged_filter_part_additions")
      .select("id, catalog, status, proposed_oem_part_number, proposed_brand_slug, created_at")
      .in("catalog", monetizationGapCatalogs)
      .eq("status", "promoted")
      .order("id", { ascending: false })
      .limit(promotedLimit),
  ]);
  if (promotedModels.error) throw promotedModels.error;
  if (promotedFilters.error) throw promotedFilters.error;

  const overall = {
    live_model_count: fr.live_model_count + wh.live_model_count + ap.live_model_count,
    live_filter_or_part_count:
      fr.live_filter_or_part_count + wh.live_filter_or_part_count + ap.live_filter_or_part_count,
    discoverable_filter_count:
      fr.discoverable_filter_count + wh.discoverable_filter_count + ap.discoverable_filter_count,
    filters_with_retailer_link_distinct:
      fr.filters_with_retailer_link_distinct +
      wh.filters_with_retailer_link_distinct +
      ap.filters_with_retailer_link_distinct,
    compatibility_mapped_filters_without_retailer_link:
      fr.compatibility_mapped_filters_without_retailer_link +
      wh.compatibility_mapped_filters_without_retailer_link +
      ap.compatibility_mapped_filters_without_retailer_link,
    orphan_filters_hidden_from_discovery:
      fr.orphan_filters_hidden_from_discovery +
      wh.orphan_filters_hidden_from_discovery +
      ap.orphan_filters_hidden_from_discovery,
    live_models_without_any_compatibility_mapping:
      fr.live_models_without_any_compatibility_mapping +
      wh.live_models_without_any_compatibility_mapping +
      ap.live_models_without_any_compatibility_mapping,
    search_gaps_unresolved_three_wedge_catalogs_only: unresolvedThreeOnly ?? 0,
    search_gaps_unresolved_including_all_catalogs: unresolvedOverall ?? 0,
    search_gaps_unresolved_all_catalogs_bucket: unresolvedAllCatalogs ?? 0,
  };

  const highest_leverage_next_fixes = buildLeverageRanked(
    wedges,
    unresolvedAllCatalogs ?? 0,
  );

  const payload = {
    generated_at: new Date().toISOString(),
    read_only: true,
    scope: {
      wedges: [...HOMEKEEP_MONETIZATION_WEDGE_CATALOG_ORDER],
      notes: {
        monetized:
          "Approximated as filters with ≥1 retailer_links row (service role; includes non-approved rows where present). Public discovery uses approved links per RLS.",
        discoverable:
          "Filters with ≥1 compatibility_mappings OR ≥1 retailer_links row (same rule as Phase A usefulness).",
      },
    },
    overall,
    wedges,
    search_gaps: {
      unresolved_total_across_four_catalogs: unresolvedOverall ?? 0,
      unresolved_wedge_catalogs_only_sum_of_per_wedge_rows: unresolvedThreeOnly ?? 0,
      unresolved_all_catalogs_global_search_bucket: unresolvedAllCatalogs ?? 0,
      by_catalog: {
        [HOMEKEEP_WEDGE_CATALOG.refrigerator_water]: fr.search_gaps_unresolved_for_wedge_catalog,
        [HOMEKEEP_WEDGE_CATALOG.whole_house_water]: wh.search_gaps_unresolved_for_wedge_catalog,
        [HOMEKEEP_WEDGE_CATALOG.air_purifier]: ap.search_gaps_unresolved_for_wedge_catalog,
      },
    },
    staging_recent_promoted: {
      limit: promotedLimit,
      staged_model_additions: promotedModels.data ?? [],
      staged_filter_part_additions: promotedFilters.data ?? [],
    },
    highest_leverage_next_fixes,
    command_hints: {
      guardrails:
        "npm run buckparts:guardrails:refrigerator && npm run buckparts:guardrails:whole-house-water && npm run buckparts:guardrails:air-purifier",
      runbooks:
        "npm run buckparts:runbook:refrigerator && npm run buckparts:runbook:whole-house-water && npm run buckparts:runbook:air-purifier",
    },
  };

  console.log(JSON.stringify(payload, null, 2));
}

main().catch((e) => {
  console.error("[report-homekeep-cross-wedge-ops] failed", e);
  process.exit(1);
});
