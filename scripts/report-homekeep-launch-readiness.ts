/**
 * Launch-readiness coverage report (read-only JSON) for refrigerator_water,
 * air_purifier, whole_house_water — inventory depth and mapping/buy-link gaps,
 * not machinery health.
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY + Supabase URL. Stdout: JSON only.
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

const PAGE = 2000;

const LAUNCH_WEDGES = [
  HOMEKEEP_WEDGE_CATALOG.refrigerator_water,
  HOMEKEEP_WEDGE_CATALOG.air_purifier,
  HOMEKEEP_WEDGE_CATALOG.whole_house_water,
] as const satisfies readonly HomekeepMonetizationWedgeCatalog[];

type WedgeTables = {
  models: string;
  filters: string;
  compat: string;
  modelFk: string;
  filterFk: string;
  retailerLinks: string;
  retailerFilterFk: string;
  retailerLinksApprovedOnly: boolean;
  /** Supabase nested select for brand on models */
  modelsBrandRelation: string;
  filtersBrandRelation: string;
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
    retailerLinksApprovedOnly: false,
    modelsBrandRelation: "brands(name, slug)",
    filtersBrandRelation: "brands(name, slug)",
  },
  [HOMEKEEP_WEDGE_CATALOG.air_purifier]: {
    models: "air_purifier_models",
    filters: "air_purifier_filters",
    compat: "air_purifier_compatibility_mappings",
    modelFk: "air_purifier_model_id",
    filterFk: "air_purifier_filter_id",
    retailerLinks: "air_purifier_retailer_links",
    retailerFilterFk: "air_purifier_filter_id",
    retailerLinksApprovedOnly: true,
    modelsBrandRelation: "brands(name, slug)",
    filtersBrandRelation: "brands(name, slug)",
  },
  [HOMEKEEP_WEDGE_CATALOG.whole_house_water]: {
    models: "whole_house_water_models",
    filters: "whole_house_water_parts",
    compat: "whole_house_water_compatibility_mappings",
    modelFk: "whole_house_water_model_id",
    filterFk: "whole_house_water_part_id",
    retailerLinks: "whole_house_water_retailer_links",
    retailerFilterFk: "whole_house_water_part_id",
    retailerLinksApprovedOnly: true,
    modelsBrandRelation: "brands(name, slug)",
    filtersBrandRelation: "brands(name, slug)",
  },
};

type LaunchTier =
  | "demo_only"
  | "thin_but_launchable"
  | "credible_starter_wedge"
  | "strongest_launch_wedge";

type BaseTier = Exclude<LaunchTier, "strongest_launch_wedge">;

function parseGapLimit(): number {
  const idx = process.argv.indexOf("--gap-limit");
  if (idx === -1) return 25;
  const n = Number.parseInt(process.argv[idx + 1] ?? "", 10);
  return Number.isFinite(n) && n > 0 ? Math.min(n, 200) : 25;
}

function parseLeverageLimit(): number {
  const idx = process.argv.indexOf("--leverage-limit");
  if (idx === -1) return 18;
  const n = Number.parseInt(process.argv[idx + 1] ?? "", 10);
  return Number.isFinite(n) && n > 0 ? Math.min(n, 50) : 18;
}

async function pagedColumnIds(table: string, column: string): Promise<Set<string>> {
  const supabase = getSupabaseAdmin();
  const out = new Set<string>();
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase.from(table).select(column).range(from, from + PAGE - 1);
    if (error) throw error;
    const chunk = data ?? [];
    for (const row of chunk) {
      const v = (row as Record<string, unknown>)[column];
      if (typeof v === "string" && v.length > 0) out.add(v);
    }
    if (chunk.length < PAGE) break;
  }
  return out;
}

async function loadRetailerLinkedFilterIds(t: WedgeTables): Promise<Set<string>> {
  const supabase = getSupabaseAdmin();
  const fk = t.retailerFilterFk;
  const out = new Set<string>();
  for (let from = 0; ; from += PAGE) {
    let q = supabase.from(t.retailerLinks).select(fk);
    if (t.retailerLinksApprovedOnly) {
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

async function countTableRows(table: string): Promise<number> {
  const supabase = getSupabaseAdmin();
  const { count, error } = await supabase.from(table).select("id", { count: "exact", head: true });
  if (error) throw error;
  return count ?? 0;
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

type BrandMini = { name: string | null; slug: string | null };

function readBrand(row: Record<string, unknown>): BrandMini {
  const b = row.brands as Record<string, unknown> | null | undefined;
  if (!b || typeof b !== "object") return { name: null, slug: null };
  return {
    name: typeof b.name === "string" ? b.name : null,
    slug: typeof b.slug === "string" ? b.slug : null,
  };
}

type InventoryGapExample =
  | {
      gap_kind: "model_without_compatibility_mapping";
      model_id: string;
      slug: string;
      model_number: string;
      brand_name: string | null;
      brand_slug: string | null;
    }
  | {
      gap_kind: "orphan_filter_hidden_from_discovery";
      filter_id: string;
      slug: string;
      oem_part_number: string;
      brand_name: string | null;
      brand_slug: string | null;
    }
  | {
      gap_kind: "mapped_part_without_approved_buy_link";
      filter_id: string;
      slug: string;
      oem_part_number: string;
      brand_name: string | null;
      brand_slug: string | null;
    };

async function fetchModelGapExamples(
  t: WedgeTables,
  modelsWithCompat: Set<string>,
  limit: number,
): Promise<InventoryGapExample[]> {
  const supabase = getSupabaseAdmin();
  const missing: InventoryGapExample[] = [];
  for (let from = 0; missing.length < limit; from += PAGE) {
    const { data, error } = await supabase
      .from(t.models)
      .select(`id, slug, model_number, ${t.modelsBrandRelation}`)
      .range(from, from + PAGE - 1);
    if (error) throw error;
    const chunk = data ?? [];
    for (const raw of chunk) {
      const row = raw as Record<string, unknown>;
      const id = row.id as string;
      if (modelsWithCompat.has(id)) continue;
      const brand = readBrand(row);
      missing.push({
        gap_kind: "model_without_compatibility_mapping",
        model_id: id,
        slug: row.slug as string,
        model_number: row.model_number as string,
        brand_name: brand.name,
        brand_slug: brand.slug,
      });
      if (missing.length >= limit) break;
    }
    if (chunk.length < PAGE) break;
  }
  missing.sort((a, b) =>
    (a as { model_number: string }).model_number.localeCompare(
      (b as { model_number: string }).model_number,
    ),
  );
  return missing.slice(0, limit);
}

async function fetchOrphanFilterExamples(
  t: WedgeTables,
  usefulIds: Set<string>,
  limit: number,
): Promise<InventoryGapExample[]> {
  const supabase = getSupabaseAdmin();
  const out: InventoryGapExample[] = [];
  for (let from = 0; out.length < limit; from += PAGE) {
    const { data, error } = await supabase
      .from(t.filters)
      .select(`id, slug, oem_part_number, ${t.filtersBrandRelation}`)
      .range(from, from + PAGE - 1);
    if (error) throw error;
    const chunk = data ?? [];
    for (const raw of chunk) {
      const row = raw as Record<string, unknown>;
      const id = row.id as string;
      if (usefulIds.has(id)) continue;
      const brand = readBrand(row);
      out.push({
        gap_kind: "orphan_filter_hidden_from_discovery",
        filter_id: id,
        slug: row.slug as string,
        oem_part_number: row.oem_part_number as string,
        brand_name: brand.name,
        brand_slug: brand.slug,
      });
      if (out.length >= limit) break;
    }
    if (chunk.length < PAGE) break;
  }
  out.sort((a, b) =>
    (a as { oem_part_number: string }).oem_part_number.localeCompare(
      (b as { oem_part_number: string }).oem_part_number,
    ),
  );
  return out.slice(0, limit);
}

async function fetchMappedNoApprovedLinkExamples(
  t: WedgeTables,
  compatFilterIds: Set<string>,
  approvedLinkFilterIds: Set<string>,
  limit: number,
): Promise<InventoryGapExample[]> {
  const ids = [...compatFilterIds].filter((id) => !approvedLinkFilterIds.has(id));
  ids.sort();
  const supabase = getSupabaseAdmin();
  const out: InventoryGapExample[] = [];
  for (let i = 0; i < ids.length && out.length < limit; i += 80) {
    const slice = ids.slice(i, i + 80);
    const { data, error } = await supabase
      .from(t.filters)
      .select(`id, slug, oem_part_number, ${t.filtersBrandRelation}`)
      .in("id", slice);
    if (error) throw error;
    for (const raw of data ?? []) {
      const row = raw as Record<string, unknown>;
      const brand = readBrand(row);
      out.push({
        gap_kind: "mapped_part_without_approved_buy_link",
        filter_id: row.id as string,
        slug: row.slug as string,
        oem_part_number: row.oem_part_number as string,
        brand_name: brand.name,
        brand_slug: brand.slug,
      });
      if (out.length >= limit) break;
    }
  }
  return out.slice(0, limit);
}

function ratio(num: number, den: number): number {
  if (den <= 0) return 0;
  return num / den;
}

function baseLaunchTier(m: {
  discoverable: number;
  live_models: number;
  live_filters: number;
  retailer_linked: number;
  orphan: number;
  models_no_compat: number;
}): BaseTier {
  const { discoverable, live_models, live_filters, retailer_linked, orphan, models_no_compat } = m;
  const retailer_r = ratio(retailer_linked, discoverable);
  const orphan_r = ratio(orphan, live_filters);
  const model_hollow_r = ratio(models_no_compat, live_models);

  if (
    discoverable < 10 ||
    live_models < 2 ||
    live_filters < 2 ||
    (live_filters >= 6 && orphan_r >= 0.9)
  ) {
    return "demo_only";
  }

  if (
    discoverable < 40 ||
    retailer_r < 0.38 ||
    model_hollow_r > 0.45 ||
    (discoverable < 60 && retailer_r < 0.5 && model_hollow_r > 0.25)
  ) {
    return "thin_but_launchable";
  }

  return "credible_starter_wedge";
}

function launchReadinessScore(m: {
  discoverable: number;
  retailer_linked: number;
  orphan: number;
  models_no_compat: number;
  mapped_no_buy: number;
  live_models: number;
}): number {
  const r = ratio(m.retailer_linked, m.discoverable);
  const covered_models = Math.max(0, m.live_models - m.models_no_compat);
  return (
    m.discoverable * 4 +
    m.retailer_linked * 3 +
    covered_models * 5 -
    m.orphan * 2 -
    m.models_no_compat * 3 -
    m.mapped_no_buy * 2 +
    r * 30
  );
}

function assignFinalTiers(
  rows: Array<{
    wedge: HomekeepMonetizationWedgeCatalog;
    base: BaseTier;
    score: number;
  }>,
): Map<HomekeepMonetizationWedgeCatalog, LaunchTier> {
  const order = new Map(LAUNCH_WEDGES.map((w, i) => [w, i]));
  const cred = rows.filter((r) => r.base === "credible_starter_wedge");
  const map = new Map<HomekeepMonetizationWedgeCatalog, LaunchTier>();

  if (cred.length === 0) {
    for (const r of rows) {
      map.set(r.wedge, r.base);
    }
    return map;
  }

  cred.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return (order.get(a.wedge) ?? 99) - (order.get(b.wedge) ?? 99);
  });
  const winner = cred[0]!.wedge;

  for (const r of rows) {
    if (r.wedge === winner) {
      map.set(r.wedge, "strongest_launch_wedge");
    } else if (r.base === "credible_starter_wedge") {
      map.set(r.wedge, "credible_starter_wedge");
    } else {
      map.set(r.wedge, r.base);
    }
  }
  return map;
}

type LeverageRow = {
  rank: number;
  wedge: HomekeepMonetizationWedgeCatalog;
  action: string;
  count: number;
  rationale: string;
};

function buildLeverageList(
  snapshots: Array<{
    wedge: HomekeepMonetizationWedgeCatalog;
    models_no_compat: number;
    mapped_no_buy: number;
    orphan: number;
    discoverable: number;
  }>,
  limit: number,
): LeverageRow[] {
  const items: Omit<LeverageRow, "rank">[] = [];
  for (const s of snapshots) {
    if (s.models_no_compat > 0) {
      items.push({
        wedge: s.wedge,
        action: "add_compatibility_mappings_for_models",
        count: s.models_no_compat,
        rationale:
          "Models with zero compat rows produce empty model pages and weak search — map each to at least one discoverable part.",
      });
    }
    if (s.mapped_no_buy > 0) {
      items.push({
        wedge: s.wedge,
        action: "add_approved_retailer_links_for_mapped_parts",
        count: s.mapped_no_buy,
        rationale:
          "Parts already tied to models but missing an approved buy link — fastest path to monetizable depth.",
      });
    }
    if (s.orphan > 0) {
      items.push({
        wedge: s.wedge,
        action: "map_or_link_orphan_filters",
        count: s.orphan,
        rationale:
          "Live part rows invisible in browse/search until they have compat and/or retailer coverage per usefulness rules.",
      });
    }
    if (s.discoverable < 25) {
      items.push({
        wedge: s.wedge,
        action: "expand_discoverable_inventory",
        count: Math.max(0, 25 - s.discoverable),
        rationale:
          "Discoverable surface is below a minimal credible starter threshold — add mapped + linked parts, not just raw rows.",
      });
    }
  }

  const weight = (a: Omit<LeverageRow, "rank">) => {
    if (a.action === "add_approved_retailer_links_for_mapped_parts") return a.count * 100;
    if (a.action === "add_compatibility_mappings_for_models") return a.count * 70;
    if (a.action === "map_or_link_orphan_filters") return a.count * 55;
    return a.count * 40;
  };

  items.sort((a, b) => weight(b) - weight(a));

  return items.slice(0, limit).map((row, i) => ({ ...row, rank: i + 1 }));
}

async function analyzeWedge(
  w: HomekeepMonetizationWedgeCatalog,
  gapLimit: number,
): Promise<{
  wedge: HomekeepMonetizationWedgeCatalog;
  live_model_count: number;
  live_filter_part_count: number;
  discoverable_filter_part_count: number;
  retailer_linked_filter_part_count: number;
  orphan_hidden_filter_part_count: number;
  models_with_no_compatibility_mappings: number;
  compatibility_mapped_parts_without_approved_buy_link: number;
  top_uncovered_inventory_gaps: InventoryGapExample[];
  launch_readiness: {
    base_tier_before_strongest_pick: BaseTier;
    launch_readiness_score: number;
    tier_rationale: string[];
  };
}> {
  const t = WEDGE[w];
  const supabase = getSupabaseAdmin();

  const [
    live_model_count,
    live_filter_part_count,
    usefulIds,
    compatFilterIds,
    approvedLinkFilterIds,
    modelsWithCompat,
  ] = await Promise.all([
    countTableRows(t.models),
    countTableRows(t.filters),
    loadUsefulIds(w),
    pagedColumnIds(t.compat, t.filterFk),
    loadRetailerLinkedFilterIds(t),
    pagedColumnIds(t.compat, t.modelFk),
  ]);

  const discoverable_filter_part_count = usefulIds.size;
  const retailer_linked_filter_part_count = approvedLinkFilterIds.size;

  let orphan_hidden = 0;
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase.from(t.filters).select("id").range(from, from + PAGE - 1);
    if (error) throw error;
    const chunk = data ?? [];
    for (const row of chunk) {
      const id = (row as { id: string }).id;
      if (typeof id === "string" && !usefulIds.has(id)) orphan_hidden += 1;
    }
    if (chunk.length < PAGE) break;
  }

  const models_with_no_compat = Math.max(0, live_model_count - modelsWithCompat.size);
  const mapped_no_approved = [...compatFilterIds].filter((id) => !approvedLinkFilterIds.has(id)).length;

  const [modelGaps, orphanGaps, mappedNoBuyGaps] = await Promise.all([
    fetchModelGapExamples(t, modelsWithCompat, gapLimit),
    fetchOrphanFilterExamples(t, usefulIds, gapLimit),
    fetchMappedNoApprovedLinkExamples(t, compatFilterIds, approvedLinkFilterIds, gapLimit),
  ]);

  const top_gaps: InventoryGapExample[] = [];
  for (const g of mappedNoBuyGaps) {
    if (top_gaps.length >= gapLimit) break;
    top_gaps.push(g);
  }
  for (const g of modelGaps) {
    if (top_gaps.length >= gapLimit) break;
    top_gaps.push(g);
  }
  for (const g of orphanGaps) {
    if (top_gaps.length >= gapLimit) break;
    top_gaps.push(g);
  }

  const base = baseLaunchTier({
    discoverable: discoverable_filter_part_count,
    live_models: live_model_count,
    live_filters: live_filter_part_count,
    retailer_linked: retailer_linked_filter_part_count,
    orphan: orphan_hidden,
    models_no_compat: models_with_no_compat,
  });

  const score = launchReadinessScore({
    discoverable: discoverable_filter_part_count,
    retailer_linked: retailer_linked_filter_part_count,
    orphan: orphan_hidden,
    models_no_compat: models_with_no_compat,
    mapped_no_buy: mapped_no_approved,
    live_models: live_model_count,
  });

  const tier_rationale: string[] = [];
  if (discoverable_filter_part_count < 10) {
    tier_rationale.push("Discoverable parts below minimal credible surface.");
  }
  if (ratio(retailer_linked_filter_part_count, discoverable_filter_part_count) < 0.4) {
    tier_rationale.push("Approved buy-link coverage on discoverable parts is thin.");
  }
  if (models_with_no_compat > 0 && ratio(models_with_no_compat, live_model_count) > 0.3) {
    tier_rationale.push("Large share of models lack any compatibility mapping.");
  }
  if (orphan_hidden > 0 && ratio(orphan_hidden, live_filter_part_count) > 0.35) {
    tier_rationale.push("Many live part rows are hidden from discovery (orphans).");
  }
  if (mapped_no_approved > 0) {
    tier_rationale.push(
      `${mapped_no_approved} compatibility-mapped part(s) still lack an approved retailer link.`,
    );
  }

  return {
    wedge: w,
    live_model_count,
    live_filter_part_count,
    discoverable_filter_part_count,
    retailer_linked_filter_part_count,
    orphan_hidden_filter_part_count: orphan_hidden,
    models_with_no_compatibility_mappings: models_with_no_compat,
    compatibility_mapped_parts_without_approved_buy_link: mapped_no_approved,
    top_uncovered_inventory_gaps: top_gaps,
    launch_readiness: {
      base_tier_before_strongest_pick: base,
      launch_readiness_score: score,
      tier_rationale: tier_rationale.length > 0 ? tier_rationale : ["Meets heuristic floors for this bucket."],
    },
  };
}

async function main() {
  loadEnv();
  const gapLimit = parseGapLimit();
  const leverageLimit = parseLeverageLimit();

  const partial: Awaited<ReturnType<typeof analyzeWedge>>[] = [];
  for (const w of LAUNCH_WEDGES) {
    partial.push(await analyzeWedge(w, gapLimit));
  }

  const tierInputs = partial.map((p) => ({
    wedge: p.wedge,
    base: p.launch_readiness.base_tier_before_strongest_pick,
    score: p.launch_readiness.launch_readiness_score,
  }));
  const finalMap = assignFinalTiers(tierInputs);

  const by_wedge = partial.map((p) => ({
    wedge: p.wedge,
    live_model_count: p.live_model_count,
    live_filter_part_count: p.live_filter_part_count,
    discoverable_filter_part_count: p.discoverable_filter_part_count,
    retailer_linked_filter_part_count: p.retailer_linked_filter_part_count,
    orphan_hidden_filter_part_count: p.orphan_hidden_filter_part_count,
    models_with_no_compatibility_mappings: p.models_with_no_compatibility_mappings,
    compatibility_mapped_parts_without_approved_buy_link:
      p.compatibility_mapped_parts_without_approved_buy_link,
    ratios: {
      retailer_linked_per_discoverable: ratio(
        p.retailer_linked_filter_part_count,
        p.discoverable_filter_part_count,
      ),
      orphan_per_live_filter: ratio(p.orphan_hidden_filter_part_count, p.live_filter_part_count),
      models_lacking_compat_per_live_model: ratio(
        p.models_with_no_compatibility_mappings,
        p.live_model_count,
      ),
    },
    top_uncovered_inventory_gaps: p.top_uncovered_inventory_gaps,
    gap_counts: {
      model_without_compatibility_mapping: p.models_with_no_compatibility_mappings,
      orphan_filter_hidden_from_discovery: p.orphan_hidden_filter_part_count,
      mapped_part_without_approved_buy_link: p.compatibility_mapped_parts_without_approved_buy_link,
    },
    launch_readiness: {
      tier: finalMap.get(p.wedge) ?? p.launch_readiness.base_tier_before_strongest_pick,
      base_tier_before_strongest_pick: p.launch_readiness.base_tier_before_strongest_pick,
      launch_readiness_score: p.launch_readiness.launch_readiness_score,
      tier_rationale: p.launch_readiness.tier_rationale,
    },
  }));

  const leverage = buildLeverageList(
    partial.map((p) => ({
      wedge: p.wedge,
      models_no_compat: p.models_with_no_compatibility_mappings,
      mapped_no_buy: p.compatibility_mapped_parts_without_approved_buy_link,
      orphan: p.orphan_hidden_filter_part_count,
      discoverable: p.discoverable_filter_part_count,
    })),
    leverageLimit,
  );

  const payload = {
    generated_at: new Date().toISOString(),
    read_only: true,
    report: "buckparts_launch_readiness_v1",
    scope: {
      wedges: [...LAUNCH_WEDGES],
      gap_limit: gapLimit,
      leverage_limit: leverageLimit,
      definitions: {
        discoverable_filter_part_count:
          "Parts with ≥1 compatibility mapping OR ≥1 retailer_links row (any status for usefulness — same as browse/search).",
        retailer_linked_filter_part_count:
          "Distinct parts with ≥1 buy link: fridge counts all retailer_links; AP/WH count approved links only.",
        orphan_hidden_filter_part_count:
          "Live filter/part rows not in the discoverable (usefulness) set — invisible in browse/search/sitemap filter URLs.",
        compatibility_mapped_parts_without_approved_buy_link:
          "Parts appearing in compatibility_mappings but with no approved retailer link (AP/WH); fridge uses any retailer_links row.",
        launch_tiers:
          "Heuristic labels from depth + coverage ratios; tune thresholds as real inventory grows. strongest_launch_wedge is mutually exclusive per run (one wedge).",
      },
      launch_tier_labels: {
        demo_only: "Toy-sized or mostly-hidden inventory — not credible as a public wedge yet.",
        thin_but_launchable:
          "Real rows exist but buy-link coverage, model mapping, or discoverable depth is still weak; launch only if paired with a stronger wedge.",
        credible_starter_wedge:
          "Enough discoverable, mapped, and linked parts to look like a real utility for that category.",
        strongest_launch_wedge:
          "Among the three wedges, the best-prepared catalog by score (picked only from credible_starter_wedge bases).",
      },
      launch_tier_rules: {
        demo_only_any_of: [
          "discoverable_filter_part_count < 10",
          "live_model_count < 2",
          "live_filter_part_count < 2",
          "live_filter_part_count >= 6 and orphan_hidden / live_filter_part_count >= 0.9",
        ],
        thin_but_launchable_if_not_demo_any_of: [
          "discoverable_filter_part_count < 40",
          "retailer_linked / max(discoverable,1) < 0.38",
          "models_without_compat / max(live_model_count,1) > 0.45",
          "discoverable < 60 and retailer_ratio < 0.5 and models_without_compat/live_models > 0.25",
        ],
        credible_starter_wedge: "Passes all demo and thin checks (absolute heuristics — adjust in script as inventory scales).",
        strongest_launch_wedge:
          "Exactly one wedge: max launch_readiness_score among those with base_tier credible_starter_wedge; tie-break order refrigerator_water, air_purifier, whole_house_water. If no credible base tiers, no wedge is strongest.",
      },
      not_in_scope: ["new_wedges", "ui", "revenue", "traffic"],
    },
    by_wedge,
    highest_leverage_inventory_additions_next: leverage,
    overall: {
      live_model_count: partial.reduce((a, p) => a + p.live_model_count, 0),
      live_filter_part_count: partial.reduce((a, p) => a + p.live_filter_part_count, 0),
      discoverable_filter_part_count: partial.reduce((a, p) => a + p.discoverable_filter_part_count, 0),
      retailer_linked_filter_part_count: partial.reduce(
        (a, p) => a + p.retailer_linked_filter_part_count,
        0,
      ),
      orphan_hidden_filter_part_count: partial.reduce((a, p) => a + p.orphan_hidden_filter_part_count, 0),
      models_with_no_compatibility_mappings: partial.reduce(
        (a, p) => a + p.models_with_no_compatibility_mappings,
        0,
      ),
      wedges_classified_strongest: LAUNCH_WEDGES.filter(
        (w) => finalMap.get(w) === "strongest_launch_wedge",
      ),
    },
  };

  console.log(JSON.stringify(payload, null, 2));
}

main().catch((e) => {
  console.error("[report-homekeep-launch-readiness] failed", e);
  process.exit(1);
});
