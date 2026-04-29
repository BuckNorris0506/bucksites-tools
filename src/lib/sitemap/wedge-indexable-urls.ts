/**
 * URLs for the three operational wedges, aligned with public discovery gating
 * (same usefulness rules as browse/search — no orphan-only filter rows).
 */
import { getSupabaseServerClient } from "@/lib/supabase/server-client";
import { loadAirPurifierUsefulFilterIds } from "@/lib/data/air-purifier-filter-usefulness";
import { loadRefrigeratorUsefulFilterIds } from "@/lib/data/refrigerator-filter-usefulness";
import { loadWholeHouseWaterUsefulFilterIds } from "@/lib/data/whole-house-water-filter-usefulness";
import { getSitemapLaunchVerticals } from "@/lib/catalog/vertical-launch-state";
import { getRequiredSiteUrl } from "@/lib/site-url/get-required-site-url";

const PAGE = 1000;

function siteBase(): string {
  return getRequiredSiteUrl();
}

function abs(path: string): string {
  const b = siteBase();
  return path.startsWith("/") ? `${b}${path}` : `${b}/${path}`;
}

async function allSlugsFromTable(table: string): Promise<string[]> {
  const supabase = getSupabaseServerClient();
  const out: string[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase.from(table).select("slug").range(from, from + PAGE - 1);
    if (error) throw error;
    const chunk = data ?? [];
    for (const row of chunk) {
      const s = (row as { slug?: string }).slug;
      if (typeof s === "string" && s.length > 0) out.push(s);
    }
    if (chunk.length < PAGE) break;
  }
  return out;
}

async function filterSlugsByIds(table: string, ids: Set<string>): Promise<string[]> {
  if (ids.size === 0) return [];
  const supabase = getSupabaseServerClient();
  const idList = Array.from(ids);
  const out: string[] = [];
  const chunkSize = 120;
  for (let i = 0; i < idList.length; i += chunkSize) {
    const slice = idList.slice(i, i + chunkSize);
    const { data, error } = await supabase.from(table).select("slug").in("id", slice);
    if (error) throw error;
    for (const row of data ?? []) {
      const s = (row as { slug?: string }).slug;
      if (typeof s === "string" && s.length > 0) out.push(s);
    }
  }
  return out;
}

async function brandSlugsForIds(brandIds: Set<string>): Promise<string[]> {
  if (brandIds.size === 0) return [];
  const supabase = getSupabaseServerClient();
  const ids = Array.from(brandIds);
  const out: string[] = [];
  const chunkSize = 120;
  for (let i = 0; i < ids.length; i += chunkSize) {
    const slice = ids.slice(i, i + chunkSize);
    const { data, error } = await supabase.from("brands").select("slug").in("id", slice);
    if (error) throw error;
    for (const row of data ?? []) {
      const s = (row as { slug?: string }).slug;
      if (typeof s === "string" && s.length > 0) out.push(s);
    }
  }
  return out;
}

async function distinctBrandIdsFromTable(table: string): Promise<Set<string>> {
  const supabase = getSupabaseServerClient();
  const out = new Set<string>();
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase.from(table).select("brand_id").range(from, from + PAGE - 1);
    if (error) throw error;
    const chunk = data ?? [];
    for (const row of chunk) {
      const id = (row as { brand_id?: string }).brand_id;
      if (typeof id === "string" && id.length > 0) out.add(id);
    }
    if (chunk.length < PAGE) break;
  }
  return out;
}

async function brandIdsForFilterTable(
  table: string,
  usefulFilterIds: Set<string>,
): Promise<Set<string>> {
  if (usefulFilterIds.size === 0) return new Set();
  const supabase = getSupabaseServerClient();
  const idList = Array.from(usefulFilterIds);
  const out = new Set<string>();
  const chunkSize = 120;
  for (let i = 0; i < idList.length; i += chunkSize) {
    const slice = idList.slice(i, i + chunkSize);
    const { data, error } = await supabase.from(table).select("brand_id").in("id", slice);
    if (error) throw error;
    for (const row of data ?? []) {
      const id = (row as { brand_id?: string }).brand_id;
      if (typeof id === "string" && id.length > 0) out.add(id);
    }
  }
  return out;
}

export type SitemapUrl = {
  url: string;
  lastModified: Date;
  changeFrequency?: "weekly" | "daily";
  priority?: number;
};

function liveStaticPaths(now: Date): SitemapUrl[] {
  const live = new Set(getSitemapLaunchVerticals());
  const staticPaths: SitemapUrl[] = [
    { url: abs("/"), lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: abs("/catalog"), lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: abs("/search"), lastModified: now, changeFrequency: "daily", priority: 0.85 },
  ];

  if (live.has("air-purifier")) {
    staticPaths.push(
      { url: abs("/air-purifier"), lastModified: now, changeFrequency: "weekly", priority: 0.85 },
      {
        url: abs("/air-purifier/search"),
        lastModified: now,
        changeFrequency: "weekly",
        priority: 0.75,
      },
    );
  }

  if (live.has("whole-house-water")) {
    staticPaths.push(
      {
        url: abs("/whole-house-water"),
        lastModified: now,
        changeFrequency: "weekly",
        priority: 0.85,
      },
      {
        url: abs("/whole-house-water/search"),
        lastModified: now,
        changeFrequency: "weekly",
        priority: 0.75,
      },
    );
  }

  return staticPaths;
}

export async function collectHomekeepWedgeSitemapUrls(): Promise<SitemapUrl[]> {
  const now = new Date();
  const staticPaths = liveStaticPaths(now);

  const usefulFridge = await loadRefrigeratorUsefulFilterIds();
  const usefulAp = await loadAirPurifierUsefulFilterIds();
  const usefulWh = await loadWholeHouseWaterUsefulFilterIds();

  const [
    fridgeModelSlugs,
    fridgeFilterSlugs,
    apModelSlugs,
    apFilterSlugs,
    whModelSlugs,
    whPartSlugs,
  ] = await Promise.all([
    allSlugsFromTable("fridge_models"),
    filterSlugsByIds("filters", usefulFridge),
    allSlugsFromTable("air_purifier_models"),
    filterSlugsByIds("air_purifier_filters", usefulAp),
    allSlugsFromTable("whole_house_water_models"),
    filterSlugsByIds("whole_house_water_parts", usefulWh),
  ]);

  const fridgeBrandIds = new Set<string>();
  (await distinctBrandIdsFromTable("fridge_models")).forEach((id) => fridgeBrandIds.add(id));
  const fridgeFilterBrandIds = await brandIdsForFilterTable("filters", usefulFridge);
  fridgeFilterBrandIds.forEach((id) => fridgeBrandIds.add(id));
  const fridgeBrandSlugs = await brandSlugsForIds(fridgeBrandIds);

  const apBrandIds = new Set<string>();
  (await distinctBrandIdsFromTable("air_purifier_models")).forEach((id) => apBrandIds.add(id));
  (await brandIdsForFilterTable("air_purifier_filters", usefulAp)).forEach((id) =>
    apBrandIds.add(id),
  );
  const apBrandSlugs = await brandSlugsForIds(apBrandIds);

  const whBrandIds = new Set<string>();
  (await distinctBrandIdsFromTable("whole_house_water_models")).forEach((id) =>
    whBrandIds.add(id),
  );
  (await brandIdsForFilterTable("whole_house_water_parts", usefulWh)).forEach((id) =>
    whBrandIds.add(id),
  );
  const whBrandSlugs = await brandSlugsForIds(whBrandIds);

  const dynamic: SitemapUrl[] = [];

  for (const slug of fridgeBrandSlugs) {
    dynamic.push({
      url: abs(`/brand/${slug}`),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.7,
    });
  }
  for (const slug of fridgeModelSlugs) {
    dynamic.push({
      url: abs(`/fridge/${slug}`),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.65,
    });
  }
  for (const slug of fridgeFilterSlugs) {
    dynamic.push({
      url: abs(`/filter/${slug}`),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.65,
    });
  }

  for (const slug of apBrandSlugs) {
    dynamic.push({
      url: abs(`/air-purifier/brand/${slug}`),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.65,
    });
  }
  for (const slug of apModelSlugs) {
    dynamic.push({
      url: abs(`/air-purifier/model/${slug}`),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.6,
    });
  }
  for (const slug of apFilterSlugs) {
    dynamic.push({
      url: abs(`/air-purifier/filter/${slug}`),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.6,
    });
  }

  for (const slug of whBrandSlugs) {
    dynamic.push({
      url: abs(`/whole-house-water/brand/${slug}`),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.65,
    });
  }
  for (const slug of whModelSlugs) {
    dynamic.push({
      url: abs(`/whole-house-water/model/${slug}`),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.6,
    });
  }
  for (const slug of whPartSlugs) {
    dynamic.push({
      url: abs(`/whole-house-water/filter/${slug}`),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.6,
    });
  }

  return [...staticPaths, ...dynamic];
}

export const __test_only__ = {
  liveStaticPaths,
};
