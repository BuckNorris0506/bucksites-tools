/**
 * Decision-grade business scorecard (read-only JSON) for the three monetization wedges:
 * refrigerator_water, air_purifier, whole_house_water.
 *
 * Signals: inventory, discoverability (usefulness), approved buy-link coverage, affiliate clicks
 * in a window, search-gap backlog, recent promoted staging rows.
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY + Supabase URL. Output: JSON to stdout only.
 * Not a revenue report — click density vs catalog surface area only.
 */
import { loadEnv } from "./lib/load-env";
import { getSupabaseAdmin } from "./lib/supabase-admin";
import { loadAirPurifierUsefulFilterIds } from "@/lib/data/air-purifier-filter-usefulness";
import { loadRefrigeratorUsefulFilterIds } from "@/lib/data/refrigerator-filter-usefulness";
import { loadWholeHouseWaterUsefulFilterIds } from "@/lib/data/whole-house-water-filter-usefulness";
import {
  HOMEKEEP_WEDGE_CATALOG,
  type HomekeepMonetizationWedgeCatalog,
} from "@/lib/catalog/identity";

const PAGE = 2500;

/** User-facing wedge order for this scorecard (not `HOMEKEEP_MONETIZATION_WEDGE_CATALOG_ORDER`). */
const SCORECARD_WEDGES = [
  HOMEKEEP_WEDGE_CATALOG.refrigerator_water,
  HOMEKEEP_WEDGE_CATALOG.air_purifier,
  HOMEKEEP_WEDGE_CATALOG.whole_house_water,
] as const satisfies readonly HomekeepMonetizationWedgeCatalog[];

type WedgeCfg = {
  modelsTable: string;
  filtersTable: string;
  retailerLinksTable: string;
  retailerFilterFk: string;
  retailerLinksApprovedOnly: boolean;
  searchGapCatalog: HomekeepMonetizationWedgeCatalog;
};

const WEDGE_CFG: Record<HomekeepMonetizationWedgeCatalog, WedgeCfg> = {
  [HOMEKEEP_WEDGE_CATALOG.refrigerator_water]: {
    modelsTable: "fridge_models",
    filtersTable: "filters",
    retailerLinksTable: "retailer_links",
    retailerFilterFk: "filter_id",
    retailerLinksApprovedOnly: false,
    searchGapCatalog: HOMEKEEP_WEDGE_CATALOG.refrigerator_water,
  },
  [HOMEKEEP_WEDGE_CATALOG.air_purifier]: {
    modelsTable: "air_purifier_models",
    filtersTable: "air_purifier_filters",
    retailerLinksTable: "air_purifier_retailer_links",
    retailerFilterFk: "air_purifier_filter_id",
    retailerLinksApprovedOnly: true,
    searchGapCatalog: HOMEKEEP_WEDGE_CATALOG.air_purifier,
  },
  [HOMEKEEP_WEDGE_CATALOG.whole_house_water]: {
    modelsTable: "whole_house_water_models",
    filtersTable: "whole_house_water_parts",
    retailerLinksTable: "whole_house_water_retailer_links",
    retailerFilterFk: "whole_house_water_part_id",
    retailerLinksApprovedOnly: true,
    searchGapCatalog: HOMEKEEP_WEDGE_CATALOG.whole_house_water,
  },
};

function parseSinceDays(): number {
  const idx = process.argv.indexOf("--since-days");
  if (idx === -1) return 30;
  const n = Number.parseInt(process.argv[idx + 1] ?? "", 10);
  return Number.isFinite(n) && n > 0 ? n : 30;
}

function parsePromotedLimit(): number {
  const idx = process.argv.indexOf("--promoted-limit");
  if (idx === -1) return 20;
  const n = Number.parseInt(process.argv[idx + 1] ?? "", 10);
  return Number.isFinite(n) && n > 0 ? n : 20;
}

function ratio(num: number, den: number): number | null {
  if (den <= 0) return null;
  return num / den;
}

async function countTableRows(table: string): Promise<number> {
  const supabase = getSupabaseAdmin();
  const { count, error } = await supabase.from(table).select("id", { count: "exact", head: true });
  if (error) throw error;
  return count ?? 0;
}

async function loadDiscoverableFilterIds(w: HomekeepMonetizationWedgeCatalog): Promise<Set<string>> {
  switch (w) {
    case HOMEKEEP_WEDGE_CATALOG.refrigerator_water:
      return loadRefrigeratorUsefulFilterIds();
    case HOMEKEEP_WEDGE_CATALOG.air_purifier:
      return loadAirPurifierUsefulFilterIds();
    case HOMEKEEP_WEDGE_CATALOG.whole_house_water:
      return loadWholeHouseWaterUsefulFilterIds();
    default: {
      const _x: never = w;
      return _x;
    }
  }
}

async function loadRetailerLinkedFilterIds(cfg: WedgeCfg): Promise<Set<string>> {
  const supabase = getSupabaseAdmin();
  const out = new Set<string>();
  const fk = cfg.retailerFilterFk;
  for (let from = 0; ; from += PAGE) {
    let q = supabase.from(cfg.retailerLinksTable).select(fk);
    if (cfg.retailerLinksApprovedOnly) {
      q = q.eq("status", "approved");
    }
    const { data, error } = await q.range(from, from + PAGE - 1);
    if (error) throw error;
    const chunk = data ?? [];
    for (const row of chunk) {
      const id = (row as Record<string, unknown>)[fk];
      if (typeof id === "string" && id.length > 0) out.add(id);
    }
    if (chunk.length < PAGE) break;
  }
  return out;
}

async function countUnresolvedSearchGaps(catalog: string): Promise<number> {
  const supabase = getSupabaseAdmin();
  const { count, error } = await supabase
    .from("search_gaps")
    .select("id", { count: "exact", head: true })
    .eq("catalog", catalog)
    .in("status", ["open", "reviewing", "queued"]);
  if (error) throw error;
  return count ?? 0;
}

type ClickEventRow = {
  filter_id: string | null;
  retailer_slug: string | null;
  created_at: string;
  air_purifier_retailer_link_id: string | null;
  whole_house_water_retailer_link_id: string | null;
};

async function countClicksByWedge(sinceIso: string): Promise<Record<HomekeepMonetizationWedgeCatalog, number>> {
  const supabase = getSupabaseAdmin();
  const rawRows: ClickEventRow[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("click_events")
      .select(
        "filter_id, retailer_slug, created_at, air_purifier_retailer_link_id, whole_house_water_retailer_link_id",
      )
      .gte("created_at", sinceIso)
      .order("created_at", { ascending: false })
      .range(from, from + PAGE - 1);
    if (error) throw error;
    const chunk = (data ?? []) as ClickEventRow[];
    rawRows.push(...chunk);
    if (chunk.length < PAGE) break;
  }

  const counts: Record<HomekeepMonetizationWedgeCatalog, number> = {
    [HOMEKEEP_WEDGE_CATALOG.refrigerator_water]: 0,
    [HOMEKEEP_WEDGE_CATALOG.air_purifier]: 0,
    [HOMEKEEP_WEDGE_CATALOG.whole_house_water]: 0,
  };

  for (const row of rawRows) {
    if (row.air_purifier_retailer_link_id) {
      counts[HOMEKEEP_WEDGE_CATALOG.air_purifier] += 1;
      continue;
    }
    if (row.whole_house_water_retailer_link_id) {
      counts[HOMEKEEP_WEDGE_CATALOG.whole_house_water] += 1;
      continue;
    }
    if (row.filter_id) {
      counts[HOMEKEEP_WEDGE_CATALOG.refrigerator_water] += 1;
    }
  }

  return counts;
}

const MONETIZATION_CATALOGS: HomekeepMonetizationWedgeCatalog[] = [
  HOMEKEEP_WEDGE_CATALOG.refrigerator_water,
  HOMEKEEP_WEDGE_CATALOG.air_purifier,
  HOMEKEEP_WEDGE_CATALOG.whole_house_water,
];

type PromotedRow = {
  table: string;
  id: number;
  catalog: string;
  created_at: string;
  summary: Record<string, unknown>;
};

async function loadRecentPromoted(limitPerTable: number): Promise<PromotedRow[]> {
  const supabase = getSupabaseAdmin();
  const catalogFilter = MONETIZATION_CATALOGS;

  const [
    aliases,
    models,
    filters,
    compats,
    helps,
  ] = await Promise.all([
    supabase
      .from("staged_alias_additions")
      .select("id, catalog, normalized_query, target_kind, proposed_alias, created_at")
      .in("catalog", catalogFilter)
      .eq("status", "promoted")
      .order("id", { ascending: false })
      .limit(limitPerTable),
    supabase
      .from("staged_model_additions")
      .select("id, catalog, proposed_model_number, proposed_brand_slug, created_at")
      .in("catalog", catalogFilter)
      .eq("status", "promoted")
      .order("id", { ascending: false })
      .limit(limitPerTable),
    supabase
      .from("staged_filter_part_additions")
      .select("id, catalog, proposed_oem_part_number, proposed_brand_slug, created_at")
      .in("catalog", catalogFilter)
      .eq("status", "promoted")
      .order("id", { ascending: false })
      .limit(limitPerTable),
    supabase
      .from("staged_compatibility_mapping_additions")
      .select("id, catalog, compat_table, model_id, part_id, created_at")
      .in("catalog", catalogFilter)
      .eq("status", "promoted")
      .order("id", { ascending: false })
      .limit(limitPerTable),
    supabase
      .from("staged_help_page_additions")
      .select("id, catalog, suggested_slug, suggested_title, created_at")
      .in("catalog", catalogFilter)
      .eq("status", "promoted")
      .order("id", { ascending: false })
      .limit(limitPerTable),
  ]);

  for (const r of [aliases, models, filters, compats, helps]) {
    if (r.error) throw r.error;
  }

  const out: PromotedRow[] = [];

  for (const row of aliases.data ?? []) {
    const r = row as Record<string, unknown>;
    out.push({
      table: "staged_alias_additions",
      id: r.id as number,
      catalog: r.catalog as string,
      created_at: r.created_at as string,
      summary: {
        normalized_query: r.normalized_query,
        target_kind: r.target_kind,
        proposed_alias: r.proposed_alias,
      },
    });
  }
  for (const row of models.data ?? []) {
    const r = row as Record<string, unknown>;
    out.push({
      table: "staged_model_additions",
      id: r.id as number,
      catalog: r.catalog as string,
      created_at: r.created_at as string,
      summary: {
        proposed_model_number: r.proposed_model_number,
        proposed_brand_slug: r.proposed_brand_slug,
      },
    });
  }
  for (const row of filters.data ?? []) {
    const r = row as Record<string, unknown>;
    out.push({
      table: "staged_filter_part_additions",
      id: r.id as number,
      catalog: r.catalog as string,
      created_at: r.created_at as string,
      summary: {
        proposed_oem_part_number: r.proposed_oem_part_number,
        proposed_brand_slug: r.proposed_brand_slug,
      },
    });
  }
  for (const row of compats.data ?? []) {
    const r = row as Record<string, unknown>;
    out.push({
      table: "staged_compatibility_mapping_additions",
      id: r.id as number,
      catalog: r.catalog as string,
      created_at: r.created_at as string,
      summary: {
        compat_table: r.compat_table,
        model_id: r.model_id,
        part_id: r.part_id,
      },
    });
  }
  for (const row of helps.data ?? []) {
    const r = row as Record<string, unknown>;
    out.push({
      table: "staged_help_page_additions",
      id: r.id as number,
      catalog: r.catalog as string,
      created_at: r.created_at as string,
      summary: {
        suggested_slug: r.suggested_slug,
        suggested_title: r.suggested_title,
      },
    });
  }

  out.sort((a, b) => b.created_at.localeCompare(a.created_at));
  return out;
}

type WedgeScorecardRow = {
  wedge: HomekeepMonetizationWedgeCatalog;
  live_model_count: number;
  live_filter_part_count: number;
  discoverable_filter_part_count: number;
  retailer_linked_filter_part_count: number;
  clicks_in_window: number;
  clicks_per_discoverable_filter_part: number | null;
  clicks_per_live_model: number | null;
  unresolved_search_gaps: number;
};

async function main() {
  loadEnv();
  const sinceDays = parseSinceDays();
  const promotedFetchLimit = parsePromotedLimit();
  const sinceIso = new Date(Date.now() - sinceDays * 86400000).toISOString();

  const clicksByWedge = await countClicksByWedge(sinceIso);

  let sumModels = 0;
  let sumFilters = 0;
  let sumDiscoverable = 0;
  let sumRetailerLinked = 0;
  let sumClicks = 0;
  let sumUnresolvedGaps = 0;

  const byWedge: WedgeScorecardRow[] = [];

  for (const w of SCORECARD_WEDGES) {
    const cfg = WEDGE_CFG[w];
    const [
      live_model_count,
      live_filter_part_count,
      discoverableIds,
      retailerLinkedIds,
      unresolved_search_gaps,
    ] = await Promise.all([
      countTableRows(cfg.modelsTable),
      countTableRows(cfg.filtersTable),
      loadDiscoverableFilterIds(w),
      loadRetailerLinkedFilterIds(cfg),
      countUnresolvedSearchGaps(cfg.searchGapCatalog),
    ]);

    const discoverable_filter_part_count = discoverableIds.size;
    const retailer_linked_filter_part_count = retailerLinkedIds.size;
    const clicks_in_window = clicksByWedge[w];

    byWedge.push({
      wedge: w,
      live_model_count,
      live_filter_part_count,
      discoverable_filter_part_count,
      retailer_linked_filter_part_count,
      clicks_in_window,
      clicks_per_discoverable_filter_part: ratio(clicks_in_window, discoverable_filter_part_count),
      clicks_per_live_model: ratio(clicks_in_window, live_model_count),
      unresolved_search_gaps,
    });

    sumModels += live_model_count;
    sumFilters += live_filter_part_count;
    sumDiscoverable += discoverable_filter_part_count;
    sumRetailerLinked += retailer_linked_filter_part_count;
    sumClicks += clicks_in_window;
    sumUnresolvedGaps += unresolved_search_gaps;
  }

  const promotedRows = await loadRecentPromoted(Math.max(8, promotedFetchLimit));
  const promotedTrimmed = promotedRows.slice(0, promotedFetchLimit);

  const overall = {
    live_model_count: sumModels,
    live_filter_part_count: sumFilters,
    discoverable_filter_part_count: sumDiscoverable,
    retailer_linked_filter_part_count: sumRetailerLinked,
    clicks_in_window: sumClicks,
    clicks_per_discoverable_filter_part: ratio(sumClicks, sumDiscoverable),
    clicks_per_live_model: ratio(sumClicks, sumModels),
    unresolved_search_gaps: sumUnresolvedGaps,
    recent_promoted_staged_row_count_included: promotedTrimmed.length,
  };

  const payload = {
    generated_at: new Date().toISOString(),
    read_only: true,
    scorecard: "buckparts_business_v1",
    scope: {
      wedges: [...SCORECARD_WEDGES],
      since_days: sinceDays,
      since_iso: sinceIso,
      promoted_limit: promotedFetchLimit,
      definitions: {
        live_model_count: "Count of rows in the wedge models table.",
        live_filter_part_count: "Count of rows in the wedge filters/parts table (includes orphans).",
        discoverable_filter_part_count:
          "Distinct filters/parts with ≥1 compatibility mapping OR ≥1 retailer_links row (same usefulness rule as browse/search/sitemap).",
        retailer_linked_filter_part_count:
          "Distinct filters/parts with ≥1 buy link: refrigerator uses all retailer_links rows; air_purifier and whole_house_water use status=approved only.",
        clicks_in_window:
          "Outbound affiliate click_events in [since_iso, now] attributed by wedge (fridge: filter_id present without wedge FKs; AP/WH: wedge retailer_link_id).",
        clicks_per_discoverable_filter_part: "clicks_in_window / discoverable_filter_part_count (null if denominator 0).",
        clicks_per_live_model: "clicks_in_window / live_model_count (null if denominator 0).",
        unresolved_search_gaps:
          "search_gaps where catalog matches the wedge key and status ∈ {open, reviewing, queued}. Excludes all_catalogs global bucket.",
        recent_promoted_staged_rows:
          "Rows across staged_* tables with status=promoted and catalog in the three wedges, merged newest-first.",
      },
      not_in_scope: {
        revenue: "No order data, commissions, or RPM.",
        global_search_gaps:
          "search_gaps.catalog = all_catalogs is not rolled into per-wedge unresolved_search_gaps; use cross-wedge ops report if needed.",
      },
    },
    overall,
    by_wedge: byWedge,
    recent_promoted_staged_rows: promotedTrimmed,
  };

  console.log(JSON.stringify(payload, null, 2));
}

main().catch((e) => {
  console.error("[report-homekeep-business-scorecard] failed", e);
  process.exit(1);
});
