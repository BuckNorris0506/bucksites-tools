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
import { buyLinkGateFailureKind } from "@/lib/retailers/launch-buy-links";

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

function parseFamilyLimit(): number {
  const idx = process.argv.indexOf("--family-limit");
  if (idx === -1) return 15;
  const n = Number.parseInt(process.argv[idx + 1] ?? "", 10);
  return Number.isFinite(n) && n > 0 ? n : 15;
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
  created_at: string;
  air_purifier_retailer_link_id: string | null;
  whole_house_water_retailer_link_id: string | null;
};

type FilterMeta = {
  id: string;
  slug: string;
  oem_part_number: string;
  brand_slug: string | null;
  brand_name: string | null;
};

type RetailerLinkRow = {
  filter_id: string;
  retailer_key: string;
  affiliate_url: string;
  browser_truth_classification: string | null;
  created_at: string | null;
};

type FamilyConfidence = "high" | "medium" | "low";

type FamilyGrouping = {
  family: string;
  confidence: FamilyConfidence;
  method: "brand_oem" | "brand_only" | "oem_pattern" | "slug_fallback" | "unknown";
};

const SLUG_FAMILY_STOPWORDS = new Set([
  "filter",
  "filters",
  "part",
  "parts",
  "replacement",
  "water",
  "air",
  "purifier",
  "whole",
  "house",
  "refrigerator",
]);

function normalizeToken(v: string): string {
  return v.trim().toLowerCase().replace(/[^a-z0-9-]+/g, "");
}

function extractOemFamilyToken(oemPartNumber: string): string | null {
  const oem = oemPartNumber.trim().toLowerCase();
  if (!oem) return null;
  const compact = oem.replace(/\s+/g, "");
  if (/^[a-z]{2,}\d{2,}[a-z0-9]*$/.test(compact)) return compact;
  if (/^\d{2,5}-\d{3,6}[a-z0-9-]*$/.test(compact)) return compact;

  const parts = compact.split(/[-_/]+/).filter(Boolean);
  if (parts.length >= 2) {
    const first = parts[0]!;
    const second = parts[1]!;
    if (/^\d{1,3}$/.test(first) && /^[a-z0-9]{3,}$/.test(second)) {
      return `${first}-${second}`;
    }
    if (/^[a-z]{2,}\d{1,}[a-z0-9]*$/.test(first)) return first;
  }
  if (/^[a-z0-9-]{5,}$/.test(compact)) return compact;
  return null;
}

function extractSlugFamilyToken(slug: string): string | null {
  const tokens = slug
    .trim()
    .toLowerCase()
    .split(/[-_/]+/)
    .map((t) => normalizeToken(t))
    .filter(Boolean)
    .filter((t) => !SLUG_FAMILY_STOPWORDS.has(t));
  if (tokens.length === 0) return null;
  const first = tokens[0]!;
  if (/^\d+$/.test(first) || first.length < 4) {
    const second = tokens[1];
    if (second && !/^\d+$/.test(second) && second.length >= 4) {
      return `${first}-${second}`;
    }
    return null;
  }
  return first;
}

function familyKeyForPart(wedge: HomekeepMonetizationWedgeCatalog, meta: FilterMeta): FamilyGrouping {
  const oemFamily = extractOemFamilyToken(meta.oem_part_number);
  const brand = normalizeToken(meta.brand_slug ?? meta.brand_name ?? "");
  if (brand && oemFamily) {
    return {
      family: `${wedge}:${brand}:${oemFamily}`,
      confidence: "high",
      method: "brand_oem",
    };
  }
  if (brand) {
    return {
      family: `${wedge}:${brand}`,
      confidence: "medium",
      method: "brand_only",
    };
  }
  if (oemFamily) {
    return {
      family: `${wedge}:${oemFamily}`,
      confidence: "medium",
      method: "oem_pattern",
    };
  }
  const slugFamily = extractSlugFamilyToken(meta.slug);
  if (slugFamily) {
    return {
      family: `${wedge}:${slugFamily}`,
      confidence: "low",
      method: "slug_fallback",
    };
  }
  return {
    family: `${wedge}:unknown`,
    confidence: "low",
    method: "unknown",
  };
}

async function loadFilterMetaByWedge(
  cfg: WedgeCfg,
): Promise<{ byId: Map<string, FilterMeta>; all: FilterMeta[] }> {
  const supabase = getSupabaseAdmin();
  const byId = new Map<string, FilterMeta>();
  const all: FilterMeta[] = [];
  const brandIdByFilterId = new Map<string, string>();
  const brandIds = new Set<string>();
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from(cfg.filtersTable)
      .select("id, slug, oem_part_number, brand_id")
      .range(from, from + PAGE - 1);
    if (error) throw error;
    const chunk = (data ?? []) as Array<Record<string, unknown>>;
    for (const row of chunk) {
      const item: FilterMeta = {
        id: String(row.id ?? ""),
        slug: String(row.slug ?? ""),
        oem_part_number: String(row.oem_part_number ?? ""),
        brand_slug: null,
        brand_name: null,
      };
      if (!item.id) continue;
      const brandId = String(row.brand_id ?? "");
      if (brandId) {
        brandIdByFilterId.set(item.id, brandId);
        brandIds.add(brandId);
      }
      byId.set(item.id, item);
      all.push(item);
    }
    if (chunk.length < PAGE) break;
  }
  if (brandIds.size > 0) {
    const brandMeta = new Map<string, { slug: string | null; name: string | null }>();
    const ids = [...brandIds];
    for (let from = 0; from < ids.length; from += PAGE) {
      const slice = ids.slice(from, from + PAGE);
      const { data, error } = await supabase.from("brands").select("id, slug, name").in("id", slice);
      if (error) throw error;
      for (const row of (data ?? []) as Array<Record<string, unknown>>) {
        const id = String(row.id ?? "");
        if (!id) continue;
        brandMeta.set(id, {
          slug: typeof row.slug === "string" ? row.slug : null,
          name: typeof row.name === "string" ? row.name : null,
        });
      }
    }
    for (const [filterId, brandId] of brandIdByFilterId.entries()) {
      const meta = byId.get(filterId);
      const brand = brandMeta.get(brandId);
      if (!meta || !brand) continue;
      meta.brand_slug = brand.slug;
      meta.brand_name = brand.name;
    }
  }
  return { byId, all };
}

async function loadRetailerLinksByWedge(cfg: WedgeCfg): Promise<RetailerLinkRow[]> {
  const supabase = getSupabaseAdmin();
  const out: RetailerLinkRow[] = [];
  const fk = cfg.retailerFilterFk;
  for (let from = 0; ; from += PAGE) {
    let q = supabase
      .from(cfg.retailerLinksTable)
      .select(`${fk}, retailer_key, affiliate_url, browser_truth_classification, created_at`);
    if (cfg.retailerLinksApprovedOnly) q = q.eq("status", "approved");
    const { data, error } = await q.range(from, from + PAGE - 1);
    if (error) throw error;
    const chunk = (data ?? []) as Array<Record<string, unknown>>;
    for (const row of chunk) {
      const filterId = String(row[fk] ?? "");
      if (!filterId) continue;
      out.push({
        filter_id: filterId,
        retailer_key: String(row.retailer_key ?? ""),
        affiliate_url: String(row.affiliate_url ?? ""),
        browser_truth_classification:
          (row.browser_truth_classification as string | null | undefined) ?? null,
        created_at: (row.created_at as string | null | undefined) ?? null,
      });
    }
    if (chunk.length < PAGE) break;
  }
  return out;
}

type ClickCountsByWedge = Record<HomekeepMonetizationWedgeCatalog, Map<string, number>>;

async function countClicksByFilterByWedge(sinceIso: string): Promise<ClickCountsByWedge> {
  const supabase = getSupabaseAdmin();
  const apLinkToFilter = new Map<string, string>();
  const whwLinkToFilter = new Map<string, string>();
  const counts: ClickCountsByWedge = {
    [HOMEKEEP_WEDGE_CATALOG.refrigerator_water]: new Map<string, number>(),
    [HOMEKEEP_WEDGE_CATALOG.air_purifier]: new Map<string, number>(),
    [HOMEKEEP_WEDGE_CATALOG.whole_house_water]: new Map<string, number>(),
  };

  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("air_purifier_retailer_links")
      .select("id, air_purifier_filter_id")
      .eq("status", "approved")
      .range(from, from + PAGE - 1);
    if (error) throw error;
    const chunk = (data ?? []) as Array<Record<string, unknown>>;
    for (const row of chunk) {
      const id = String(row.id ?? "");
      const fid = String(row.air_purifier_filter_id ?? "");
      if (id && fid) apLinkToFilter.set(id, fid);
    }
    if (chunk.length < PAGE) break;
  }
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("whole_house_water_retailer_links")
      .select("id, whole_house_water_part_id")
      .eq("status", "approved")
      .range(from, from + PAGE - 1);
    if (error) throw error;
    const chunk = (data ?? []) as Array<Record<string, unknown>>;
    for (const row of chunk) {
      const id = String(row.id ?? "");
      const fid = String(row.whole_house_water_part_id ?? "");
      if (id && fid) whwLinkToFilter.set(id, fid);
    }
    if (chunk.length < PAGE) break;
  }

  const inc = (m: Map<string, number>, id: string) => {
    m.set(id, (m.get(id) ?? 0) + 1);
  };
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("click_events")
      .select("filter_id, created_at, air_purifier_retailer_link_id, whole_house_water_retailer_link_id")
      .gte("created_at", sinceIso)
      .order("created_at", { ascending: false })
      .range(from, from + PAGE - 1);
    if (error) throw error;
    const chunk = (data ?? []) as ClickEventRow[];
    for (const row of chunk) {
      if (row.air_purifier_retailer_link_id) {
        const fid = apLinkToFilter.get(row.air_purifier_retailer_link_id);
        if (fid) inc(counts[HOMEKEEP_WEDGE_CATALOG.air_purifier], fid);
        continue;
      }
      if (row.whole_house_water_retailer_link_id) {
        const fid = whwLinkToFilter.get(row.whole_house_water_retailer_link_id);
        if (fid) inc(counts[HOMEKEEP_WEDGE_CATALOG.whole_house_water], fid);
        continue;
      }
      if (row.filter_id) {
        inc(counts[HOMEKEEP_WEDGE_CATALOG.refrigerator_water], row.filter_id);
      }
    }
    if (chunk.length < PAGE) break;
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

type ScoreboardByWedgeRow = {
  wedge: HomekeepMonetizationWedgeCatalog;
  live_pages: number;
  live_pages_with_valid_buy_cta: number;
  live_pages_with_zero_valid_buy_cta: number;
  amazon_cta_covered_pages: number;
  amazon_cta_coverage_ratio: number | null;
  pages_with_cta_but_zero_clicks: number;
  newly_monetized_slugs_last_day: string[];
};

type ScoreboardByFamilyRow = {
  family: string;
  confidence: FamilyConfidence;
  confidence_method: FamilyGrouping["method"];
  live_pages: number;
  pages_with_valid_buy_cta: number;
  pages_with_zero_valid_buy_cta: number;
  amazon_cta_covered_pages: number;
  amazon_cta_coverage_ratio: number | null;
};

async function main() {
  loadEnv();
  const sinceDays = parseSinceDays();
  const promotedFetchLimit = parsePromotedLimit();
  const familyLimit = parseFamilyLimit();
  const sinceIso = new Date(Date.now() - sinceDays * 86400000).toISOString();
  const lastDayIso = new Date(Date.now() - 86400000).toISOString();

  const clicksByFilterByWedge = await countClicksByFilterByWedge(sinceIso);

  let sumModels = 0;
  let sumFilters = 0;
  let sumDiscoverable = 0;
  let sumRetailerLinked = 0;
  let sumClicks = 0;
  let sumUnresolvedGaps = 0;
  let totalLivePages = 0;
  let totalWithValidCta = 0;
  let totalZeroCta = 0;
  let totalAmazonCovered = 0;
  let totalPagesWithCtaZeroClicks = 0;

  const familyAcc = new Map<
    string,
    {
      confidence: FamilyConfidence;
      confidence_method: FamilyGrouping["method"];
      live_pages: number;
      pages_with_valid_buy_cta: number;
      amazon_cta_covered_pages: number;
    }
  >();
  const moneyByWedge: ScoreboardByWedgeRow[] = [];
  const newlyMonetizedByWedge: Record<HomekeepMonetizationWedgeCatalog, string[]> = {
    [HOMEKEEP_WEDGE_CATALOG.refrigerator_water]: [],
    [HOMEKEEP_WEDGE_CATALOG.air_purifier]: [],
    [HOMEKEEP_WEDGE_CATALOG.whole_house_water]: [],
  };

  const byWedge: WedgeScorecardRow[] = [];

  for (const w of SCORECARD_WEDGES) {
    const cfg = WEDGE_CFG[w];
    const [
      live_model_count,
      live_filter_part_count,
      discoverableIds,
      retailerLinks,
      filterMeta,
      unresolved_search_gaps,
    ] = await Promise.all([
      countTableRows(cfg.modelsTable),
      countTableRows(cfg.filtersTable),
      loadDiscoverableFilterIds(w),
      loadRetailerLinksByWedge(cfg),
      loadFilterMetaByWedge(cfg),
      countUnresolvedSearchGaps(cfg.searchGapCatalog),
    ]);

    const validFilters = new Set<string>();
    const amazonFilters = new Set<string>();
    const newlyMonetized = new Set<string>();
    for (const link of retailerLinks) {
      const gate = buyLinkGateFailureKind({
        retailer_key: link.retailer_key,
        affiliate_url: link.affiliate_url,
        browser_truth_classification: link.browser_truth_classification,
      });
      if (gate !== null) continue;
      validFilters.add(link.filter_id);
      if (link.retailer_key.trim().toLowerCase() === "amazon") amazonFilters.add(link.filter_id);
      if (link.created_at && link.created_at >= lastDayIso) {
        const slug = filterMeta.byId.get(link.filter_id)?.slug;
        if (slug) newlyMonetized.add(slug);
      }
    }
    const retailerLinkedIds = validFilters;
    const discoverable_filter_part_count = discoverableIds.size;
    const retailer_linked_filter_part_count = retailerLinkedIds.size;
    const clicks_in_window = [...(clicksByFilterByWedge[w] ?? new Map()).values()].reduce(
      (acc, n) => acc + n,
      0,
    );

    let livePages = 0;
    let withValidCta = 0;
    let zeroCta = 0;
    let amazonCovered = 0;
    let pagesWithCtaZeroClicks = 0;
    for (const id of discoverableIds) {
      const meta = filterMeta.byId.get(id);
      if (!meta) continue;
      livePages += 1;
      const hasValid = validFilters.has(id);
      if (hasValid) withValidCta += 1;
      else zeroCta += 1;
      if (amazonFilters.has(id)) amazonCovered += 1;
      if (hasValid && !clicksByFilterByWedge[w].has(id)) pagesWithCtaZeroClicks += 1;

      const family = familyKeyForPart(w, meta);
      const acc = familyAcc.get(family.family) ?? {
        confidence: family.confidence,
        confidence_method: family.method,
        live_pages: 0,
        pages_with_valid_buy_cta: 0,
        amazon_cta_covered_pages: 0,
      };
      acc.live_pages += 1;
      if (hasValid) acc.pages_with_valid_buy_cta += 1;
      if (amazonFilters.has(id)) acc.amazon_cta_covered_pages += 1;
      familyAcc.set(family.family, acc);
    }
    moneyByWedge.push({
      wedge: w,
      live_pages: livePages,
      live_pages_with_valid_buy_cta: withValidCta,
      live_pages_with_zero_valid_buy_cta: zeroCta,
      amazon_cta_covered_pages: amazonCovered,
      amazon_cta_coverage_ratio: ratio(amazonCovered, livePages),
      pages_with_cta_but_zero_clicks: pagesWithCtaZeroClicks,
      newly_monetized_slugs_last_day: [...newlyMonetized].sort(),
    });
    newlyMonetizedByWedge[w] = [...newlyMonetized].sort();

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
    totalLivePages += livePages;
    totalWithValidCta += withValidCta;
    totalZeroCta += zeroCta;
    totalAmazonCovered += amazonCovered;
    totalPagesWithCtaZeroClicks += pagesWithCtaZeroClicks;
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

  const byFamily: ScoreboardByFamilyRow[] = [...familyAcc.entries()]
    .map(([family, acc]) => ({
      family,
      confidence: acc.confidence,
      confidence_method: acc.confidence_method,
      live_pages: acc.live_pages,
      pages_with_valid_buy_cta: acc.pages_with_valid_buy_cta,
      pages_with_zero_valid_buy_cta: acc.live_pages - acc.pages_with_valid_buy_cta,
      amazon_cta_covered_pages: acc.amazon_cta_covered_pages,
      amazon_cta_coverage_ratio: ratio(acc.amazon_cta_covered_pages, acc.live_pages),
    }))
    .sort((a, b) => b.pages_with_zero_valid_buy_cta - a.pages_with_zero_valid_buy_cta);
  const byFamilyForValidCoverage = [...byFamily].sort(
    (a, b) => b.pages_with_valid_buy_cta - a.pages_with_valid_buy_cta,
  );
  const byFamilyForAmazonCoverage = [...byFamily].sort(
    (a, b) => b.amazon_cta_covered_pages - a.amazon_cta_covered_pages,
  );
  const topFamilyForValidCoverage = byFamilyForValidCoverage.slice(0, familyLimit);
  const topFamilyForAmazonCoverage = byFamilyForAmazonCoverage.slice(0, familyLimit);

  const moneyScoreboardV1 = {
    generated_at: new Date().toISOString(),
    live_pages_with_valid_buy_cta: {
      overall: {
        count: totalWithValidCta,
        ratio: ratio(totalWithValidCta, totalLivePages),
      },
      by_wedge: moneyByWedge.map((r) => ({
        wedge: r.wedge,
        count: r.live_pages_with_valid_buy_cta,
        ratio: ratio(r.live_pages_with_valid_buy_cta, r.live_pages),
      })),
      by_family: {
        total_family_count: byFamilyForValidCoverage.length,
        included_family_count: topFamilyForValidCoverage.length,
        omitted_family_count: Math.max(0, byFamilyForValidCoverage.length - topFamilyForValidCoverage.length),
        rows: topFamilyForValidCoverage.map((r) => ({
          family: r.family,
          confidence: r.confidence,
          confidence_method: r.confidence_method,
          count: r.pages_with_valid_buy_cta,
          ratio: ratio(r.pages_with_valid_buy_cta, r.live_pages),
        })),
      },
    },
    live_pages_with_zero_valid_buy_cta: {
      overall: {
        count: totalZeroCta,
        ratio: ratio(totalZeroCta, totalLivePages),
      },
      by_wedge: moneyByWedge.map((r) => ({
        wedge: r.wedge,
        count: r.live_pages_with_zero_valid_buy_cta,
        ratio: ratio(r.live_pages_with_zero_valid_buy_cta, r.live_pages),
      })),
    },
    amazon_cta_coverage_by_wedge: moneyByWedge.map((r) => ({
      wedge: r.wedge,
      covered_pages: r.amazon_cta_covered_pages,
      live_pages: r.live_pages,
      ratio: r.amazon_cta_coverage_ratio,
    })),
    amazon_cta_coverage_by_family: {
      total_family_count: byFamilyForAmazonCoverage.length,
      included_family_count: topFamilyForAmazonCoverage.length,
      omitted_family_count: Math.max(0, byFamilyForAmazonCoverage.length - topFamilyForAmazonCoverage.length),
      rows: topFamilyForAmazonCoverage.map((r) => ({
        family: r.family,
        confidence: r.confidence,
        confidence_method: r.confidence_method,
        covered_pages: r.amazon_cta_covered_pages,
        live_pages: r.live_pages,
        ratio: r.amazon_cta_coverage_ratio,
      })),
    },
    newly_monetized_slugs_last_day: {
      supported: true,
      window_iso_start: lastDayIso,
      total_slug_count: Object.values(newlyMonetizedByWedge).reduce((acc, slugs) => acc + slugs.length, 0),
      by_wedge: moneyByWedge.map((r) => ({ wedge: r.wedge, slugs: r.newly_monetized_slugs_last_day })),
    },
    pages_with_cta_but_zero_clicks: {
      supported: true,
      window_iso_start: sinceIso,
      overall_count: totalPagesWithCtaZeroClicks,
      by_wedge: moneyByWedge.map((r) => ({
        wedge: r.wedge,
        count: r.pages_with_cta_but_zero_clicks,
      })),
    },
    biggest_monetization_gaps_by_family: {
      top_families: byFamily
        .filter((r) => r.confidence !== "low")
        .slice(0, 15)
        .map((r) => ({
          family: r.family,
          confidence: r.confidence,
          confidence_method: r.confidence_method,
          gap_pages: r.pages_with_zero_valid_buy_cta,
          live_pages: r.live_pages,
          gap_ratio: ratio(r.pages_with_zero_valid_buy_cta, r.live_pages),
        })),
      excluded_low_confidence_family_count: byFamily.filter((r) => r.confidence === "low").length,
      low_confidence_note:
        "Low-confidence slug fallback families are excluded from ranked gaps to avoid overstating noisy groupings.",
    },
    by_family_confidence_summary: {
      high: byFamily.filter((r) => r.confidence === "high").length,
      medium: byFamily.filter((r) => r.confidence === "medium").length,
      low: byFamily.filter((r) => r.confidence === "low").length,
    },
    family_array_limits: {
      family_limit: familyLimit,
      applies_to: [
        "live_pages_with_valid_buy_cta.by_family",
        "amazon_cta_coverage_by_family",
        "biggest_monetization_gaps_by_family.top_families",
      ],
    },
    blocked_metrics: {
      discovery_hit_rate_by_family: {
        status: "blocked",
        reason: "no persistent per-run attempt telemetry",
      },
      discovery_miss_false_negative_queue: {
        status: "blocked/partial",
        reason: "no canonical false-negative run lineage",
      },
      broken_go_count: {
        status: "blocked",
        reason: "no persisted failed-redirect event log/status",
      },
    },
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
      family_limit: familyLimit,
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
    money_scoreboard_v1: moneyScoreboardV1,
  };

  console.log(JSON.stringify(payload, null, 2));
}

main().catch((e) => {
  console.error("[report-homekeep-business-scorecard] failed", e);
  process.exit(1);
});
