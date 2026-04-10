/**
 * Read-only traffic + affiliate readiness audit for BuckParts wedges.
 * Wedges: refrigerator_water, whole_house_water, air_purifier only.
 */
import { loadEnv } from "./lib/load-env";
import { loadAirPurifierUsefulFilterIds } from "@/lib/data/air-purifier-filter-usefulness";
import { loadRefrigeratorUsefulFilterIds } from "@/lib/data/refrigerator-filter-usefulness";
import { loadWholeHouseWaterUsefulFilterIds } from "@/lib/data/whole-house-water-filter-usefulness";
import {
  HOMEKEEP_MONETIZATION_WEDGE_CATALOG_ORDER,
  HOMEKEEP_WEDGE_CATALOG,
  type HomekeepMonetizationWedgeCatalog,
} from "@/lib/catalog/identity";
import { getSupabaseAdmin } from "./lib/supabase-admin";

const PAGE = 2000;
const DEFAULT_SINCE_DAYS = 14;
const TOP_FILTERS_SAMPLE = 5;

type WedgeTables = {
  models: string;
  filters: string;
  compat: string;
  modelFk: string;
  filterFk: string;
  retailerLinks: string;
  retailerFilterFk: string;
  modelPathNote: string;
  filterPathNote: string;
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
    modelPathNote: "/fridge/[slug]",
    filterPathNote: "/filter/[slug]",
  },
  [HOMEKEEP_WEDGE_CATALOG.whole_house_water]: {
    models: "whole_house_water_models",
    filters: "whole_house_water_parts",
    compat: "whole_house_water_compatibility_mappings",
    modelFk: "whole_house_water_model_id",
    filterFk: "whole_house_water_part_id",
    retailerLinks: "whole_house_water_retailer_links",
    retailerFilterFk: "whole_house_water_part_id",
    modelPathNote: "/whole-house-water/model/[slug]",
    filterPathNote: "/whole-house-water/filter/[slug]",
  },
  [HOMEKEEP_WEDGE_CATALOG.air_purifier]: {
    models: "air_purifier_models",
    filters: "air_purifier_filters",
    compat: "air_purifier_compatibility_mappings",
    modelFk: "air_purifier_model_id",
    filterFk: "air_purifier_filter_id",
    retailerLinks: "air_purifier_retailer_links",
    retailerFilterFk: "air_purifier_filter_id",
    modelPathNote: "/air-purifier/model/[slug]",
    filterPathNote: "/air-purifier/filter/[slug]",
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

/** Compat rows whose filter/part has zero retailer_links rows (affiliate gap on existing graph). */
async function countCompatRowsWithFilterMissingLink(
  compatTable: string,
  filterFk: string,
  linkFilterIds: Set<string>,
): Promise<number> {
  const supabase = getSupabaseAdmin();
  let n = 0;
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from(compatTable)
      .select(filterFk)
      .range(from, from + PAGE - 1);
    if (error) throw error;
    const chunk = data ?? [];
    for (const row of chunk) {
      const fid = (row as unknown as Record<string, unknown>)[filterFk];
      if (typeof fid === "string" && !linkFilterIds.has(fid)) n += 1;
    }
    if (chunk.length < PAGE) break;
  }
  return n;
}

/** Aggregate compat degree per filter id for filters that lack retailer links. */
async function topFiltersMissingLinksByCompatDegree(
  compatTable: string,
  filterFk: string,
  linkFilterIds: Set<string>,
  filtersTable: string,
  topN: number,
): Promise<
  Array<{
    filter_id: string;
    slug: string | null;
    oem_part_number: string | null;
    compatibility_mapping_row_count: number;
  }>
> {
  const supabase = getSupabaseAdmin();
  const counts = new Map<string, number>();
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from(compatTable)
      .select(filterFk)
      .range(from, from + PAGE - 1);
    if (error) throw error;
    const chunk = data ?? [];
    for (const row of chunk) {
      const fid = (row as unknown as Record<string, unknown>)[filterFk];
      if (typeof fid !== "string" || linkFilterIds.has(fid)) continue;
      counts.set(fid, (counts.get(fid) ?? 0) + 1);
    }
    if (chunk.length < PAGE) break;
  }
  const sorted = Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN);
  const out: Array<{
    filter_id: string;
    slug: string | null;
    oem_part_number: string | null;
    compatibility_mapping_row_count: number;
  }> = [];
  for (const [fid, cnt] of sorted) {
    const { data, error } = await supabase
      .from(filtersTable)
      .select("slug, oem_part_number")
      .eq("id", fid)
      .maybeSingle();
    if (error) throw error;
    const r = data as { slug: string; oem_part_number: string } | null;
    out.push({
      filter_id: fid,
      slug: r?.slug ?? null,
      oem_part_number: r?.oem_part_number ?? null,
      compatibility_mapping_row_count: cnt,
    });
  }
  return out;
}

async function countRecentRows(
  table: string,
  sinceIso: string,
): Promise<{ count: number; error: string | null }> {
  const supabase = getSupabaseAdmin();
  const { count, error } = await supabase
    .from(table)
    .select("id", { count: "exact", head: true })
    .gte("created_at", sinceIso);
  if (error) return { count: 0, error: error.message };
  return { count: count ?? 0, error: null };
}

type GrowthMove = {
  rank: number;
  wedge: HomekeepMonetizationWedgeCatalog | "overall";
  move: string;
  metric_hint: string;
  rationale: string;
};

function buildGrowthMoves(
  wedges: Record<
    HomekeepMonetizationWedgeCatalog,
    {
      compat_edges_without_buy_link: number;
      useful_without_retailer_link_count: number;
      hidden_orphan_items: number;
      model_pages_zero_compat: number;
      distinct_filters_mapped_but_no_link: number;
    }
  >,
): GrowthMove[] {
  const items: GrowthMove[] = [];

  for (const w of HOMEKEEP_MONETIZATION_WEDGE_CATALOG_ORDER) {
    const s = wedges[w];
    if (s.distinct_filters_mapped_but_no_link > 0) {
      items.push({
        rank: 0,
        wedge: w,
        move: "add_approved_retailer_links",
        metric_hint: `${s.distinct_filters_mapped_but_no_link} mapped filters lack any retailer_links row`,
        rationale:
          "Existing model↔filter graph already drives discovery; adding buy links is the fastest path to monetize current traffic.",
      });
    }
    if (s.compat_edges_without_buy_link > 0) {
      items.push({
        rank: 0,
        wedge: w,
        move: "close_compat_edge_affiliate_gaps",
        metric_hint: `${s.compat_edges_without_buy_link} compatibility rows reference filters with no retailer link`,
        rationale:
          "Each edge is a qualified model page impression that cannot convert to affiliate until that filter has a link.",
      });
    }
    if (s.useful_without_retailer_link_count > 0) {
      items.push({
        rank: 0,
        wedge: w,
        move: "monetize_discoverable_compat_only_filters",
        metric_hint: `${s.useful_without_retailer_link_count} discoverable items rely on compat only (no retailer link)`,
        rationale:
          "These SKUs surface in browse/search but outbound monetization is incomplete.",
      });
    }
    if (s.hidden_orphan_items > 0) {
      items.push({
        rank: 0,
        wedge: w,
        move: "map_or_link_orphan_inventory",
        metric_hint: `${s.hidden_orphan_items} live filter/part rows invisible in discovery`,
        rationale:
          "Orphans do not earn search or internal-link traffic until mapped or linked; fix before expecting organic scale.",
      });
    }
    if (s.model_pages_zero_compat > 0) {
      items.push({
        rank: 0,
        wedge: w,
        move: "add_compatibility_mappings_for_thin_models",
        metric_hint: `${s.model_pages_zero_compat} model URLs exist with zero compat rows`,
        rationale:
          "Thin model pages underperform for long-tail search; compat rows unlock filter modules and internal links.",
      });
    }
  }

  const score = (g: GrowthMove) => {
    const n = Number.parseInt(g.metric_hint.match(/^(\d+)/)?.[1] ?? "0", 10);
    if (g.move === "add_approved_retailer_links") return n * 100;
    if (g.move === "close_compat_edge_affiliate_gaps") return n * 80;
    if (g.move === "monetize_discoverable_compat_only_filters") return n * 60;
    if (g.move === "map_or_link_orphan_inventory") return n * 50;
    return n * 35;
  };

  items.sort((a, b) => score(b) - score(a));
  return items.slice(0, 15).map((x, i) => ({ ...x, rank: i + 1 }));
}

async function auditWedge(w: HomekeepMonetizationWedgeCatalog, sinceIso: string) {
  const t = WEDGE[w];
  const [
    indexable_model_page_count,
    indexable_filter_or_part_page_count,
    usefulIds,
    compatFilterIds,
    linkFilterIds,
    modelsWithCompatIds,
  ] = await Promise.all([
    countTableRows(t.models),
    countTableRows(t.filters),
    loadUsefulIds(w),
    pagedColumnIds(t.compat, t.filterFk),
    pagedColumnIds(t.retailerLinks, t.retailerFilterFk),
    pagedColumnIds(t.compat, t.modelFk),
  ]);

  const discoverable_useful_item_count = usefulIds.size;
  const monetized_distinct_filter_ids_with_retailer_link = linkFilterIds.size;

  let useful_items_without_retailer_links = 0;
  for (const id of Array.from(usefulIds)) {
    if (!linkFilterIds.has(id)) useful_items_without_retailer_links += 1;
  }

  const hidden_orphan_items = await countOrphanFilters(t.filters, usefulIds);

  const model_pages_with_at_least_one_compat_mapping = modelsWithCompatIds.size;
  const model_pages_zero_compat_thin_surface = Math.max(
    0,
    indexable_model_page_count - model_pages_with_at_least_one_compat_mapping,
  );

  const distinct_filters_mapped_but_missing_retailer_link = [...Array.from(compatFilterIds)].filter(
    (fid) => !linkFilterIds.has(fid),
  ).length;

  const compatibility_mapping_rows_where_filter_has_no_retailer_link =
    await countCompatRowsWithFilterMissingLink(t.compat, t.filterFk, linkFilterIds);

  const [recentModels, recentFilters] = await Promise.all([
    countRecentRows(t.models, sinceIso),
    countRecentRows(t.filters, sinceIso),
  ]);

  const top_filters_missing_links = await topFiltersMissingLinksByCompatDegree(
    t.compat,
    t.filterFk,
    linkFilterIds,
    t.filters,
    TOP_FILTERS_SAMPLE,
  );

  return {
    wedge: w,
    routes: {
      model_page: t.modelPathNote,
      filter_or_part_page: t.filterPathNote,
    },
    indexable_model_page_count,
    indexable_filter_or_part_page_count,
    model_pages_with_at_least_one_compat_mapping,
    model_pages_zero_compat_thin_surface,
    discoverable_useful_item_count,
    monetized_distinct_filter_ids_with_retailer_link,
    useful_items_without_retailer_links,
    hidden_orphan_items,
    distinct_filters_mapped_but_missing_retailer_link,
    compatibility_mapping_rows_where_filter_has_no_retailer_link,
    recent_new_live_rows: {
      since_iso: sinceIso,
      new_models: recentModels,
      new_filters_or_parts: recentFilters,
    },
    pages_likely_worth_prioritizing_next_from_existing_live_mappings: {
      interpretation:
        "Not new URL types — leverage existing compat graph: add retailer_links for mapped filters that still lack them (see top_filters_missing_retailer_links_by_compat_row_count).",
      top_filters_missing_retailer_links_by_compat_row_count: top_filters_missing_links,
    },
    _growthMetrics: {
      compat_edges_without_buy_link: compatibility_mapping_rows_where_filter_has_no_retailer_link,
      useful_without_retailer_link_count: useful_items_without_retailer_links,
      hidden_orphan_items,
      model_pages_zero_compat: model_pages_zero_compat_thin_surface,
      distinct_filters_mapped_but_no_link: distinct_filters_mapped_but_missing_retailer_link,
    },
  };
}

async function main() {
  loadEnv();
  const sinceDays = parseArgNumber("--since-days", DEFAULT_SINCE_DAYS);
  const sinceIso = new Date(Date.now() - sinceDays * 86400000).toISOString();

  const [fr, wh, ap] = await Promise.all(
    HOMEKEEP_MONETIZATION_WEDGE_CATALOG_ORDER.map((w) => auditWedge(w, sinceIso)),
  );

  const stripGrowth = (x: Awaited<ReturnType<typeof auditWedge>>) => {
    const { _growthMetrics, ...rest } = x;
    return rest;
  };

  const growthInputs: Record<HomekeepMonetizationWedgeCatalog, (typeof fr)["_growthMetrics"]> = {
    [HOMEKEEP_WEDGE_CATALOG.refrigerator_water]: fr._growthMetrics,
    [HOMEKEEP_WEDGE_CATALOG.whole_house_water]: wh._growthMetrics,
    [HOMEKEEP_WEDGE_CATALOG.air_purifier]: ap._growthMetrics,
  };

  const highest_leverage_growth_moves = buildGrowthMoves(growthInputs);

  const overall = {
    indexable_model_page_count:
      fr.indexable_model_page_count + wh.indexable_model_page_count + ap.indexable_model_page_count,
    indexable_filter_or_part_page_count:
      fr.indexable_filter_or_part_page_count +
      wh.indexable_filter_or_part_page_count +
      ap.indexable_filter_or_part_page_count,
    discoverable_useful_item_count:
      fr.discoverable_useful_item_count +
      wh.discoverable_useful_item_count +
      ap.discoverable_useful_item_count,
    monetized_distinct_filter_ids_with_retailer_link:
      fr.monetized_distinct_filter_ids_with_retailer_link +
      wh.monetized_distinct_filter_ids_with_retailer_link +
      ap.monetized_distinct_filter_ids_with_retailer_link,
    useful_items_without_retailer_links:
      fr.useful_items_without_retailer_links +
      wh.useful_items_without_retailer_links +
      ap.useful_items_without_retailer_links,
    hidden_orphan_items:
      fr.hidden_orphan_items + wh.hidden_orphan_items + ap.hidden_orphan_items,
    model_pages_zero_compat_thin_surface:
      fr.model_pages_zero_compat_thin_surface +
      wh.model_pages_zero_compat_thin_surface +
      ap.model_pages_zero_compat_thin_surface,
    compatibility_mapping_rows_where_filter_has_no_retailer_link:
      fr.compatibility_mapping_rows_where_filter_has_no_retailer_link +
      wh.compatibility_mapping_rows_where_filter_has_no_retailer_link +
      ap.compatibility_mapping_rows_where_filter_has_no_retailer_link,
  };

  const payload = {
    generated_at: new Date().toISOString(),
    read_only: true,
    audit: "traffic_and_monetization_readiness",
    scope: {
      wedges: [...HOMEKEEP_MONETIZATION_WEDGE_CATALOG_ORDER],
      parameters: { since_days: sinceDays },
      definitions: {
        indexable_pages:
          "Counts live DB rows that back public dynamic routes (each row can return 200). Does not assert sitemap/noindex policy.",
        discoverable_useful_items:
          "Filter/part ids with ≥1 compatibility_mappings OR ≥1 retailer_links row (Phase A usefulness / browse+search discovery).",
        monetized_distinct_filters:
          "Distinct filter/part ids with ≥1 retailer_links row (service role; includes non-approved rows if present — align with RLS for prod).",
        orphans:
          "Filter/part rows with neither compat nor link — hidden from discovery, direct URL only.",
      },
    },
    overall,
    wedges: {
      [HOMEKEEP_WEDGE_CATALOG.refrigerator_water]: stripGrowth(fr),
      [HOMEKEEP_WEDGE_CATALOG.whole_house_water]: stripGrowth(wh),
      [HOMEKEEP_WEDGE_CATALOG.air_purifier]: stripGrowth(ap),
    },
    highest_leverage_growth_moves,
    command_hints: {
      cross_wedge_ops: "npm run buckparts:ops:cross-wedge",
      guardrails:
        "npm run buckparts:guardrails:refrigerator | buckparts:guardrails:whole-house-water | buckparts:guardrails:air-purifier",
    },
  };

  console.log(JSON.stringify(payload, null, 2));
}

main().catch((e) => {
  console.error("[audit-homekeep-traffic-monetization-readiness] failed", e);
  process.exit(1);
});
