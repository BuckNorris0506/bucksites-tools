/**
 * Whole-house-water search can surface rows whose `slug` in the hit payload does not
 * match a live `/whole-house-water/model/[slug]` or `/whole-house-water/filter/[slug]`
 * row (e.g. slugified model/OEM in a stale row, or slug param vs canonical URL slug).
 * These helpers resolve hits to canonical DB slugs and mark non-resolvable hits.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import { CATALOG_WHOLE_HOUSE_WATER_FILTERS } from "@/lib/catalog/constants";
import { normalizeSearchCompact } from "@/lib/search/normalize";
import type { SearchHit, SearchHitFilter, SearchHitModel } from "./search";
import type {
  WholeHouseWaterSearchHit,
  WholeHouseWaterSearchHitFilter,
  WholeHouseWaterSearchHitModel,
} from "@/lib/data/whole-house-water/search";

export type WhwModelSlugRow = {
  slug: string;
  model_number_norm: string | null;
};

export type WhwPartSlugRow = {
  slug: string;
  oem_part_number_norm: string | null;
};

/** Minimum compact norm length when treating URL/search `slug` as an OEM/model token. */
const MIN_NORM_FROM_SLUG = 4;

export function pickCanonicalWholeHouseWaterModelSlug(
  hit: { slug: string; model_number: string },
  rows: WhwModelSlugRow[],
): string | null {
  const valid = new Set(rows.map((r) => r.slug));
  if (valid.has(hit.slug)) return hit.slug;

  const nModel = normalizeSearchCompact(hit.model_number);
  if (nModel.length >= MIN_NORM_FROM_SLUG) {
    const byModel = rows.filter((r) => r.model_number_norm === nModel);
    if (byModel.length === 1) return byModel[0]!.slug;
  }

  const nSlug = normalizeSearchCompact(hit.slug);
  if (nSlug.length >= MIN_NORM_FROM_SLUG) {
    const bySlugNorm = rows.filter((r) => r.model_number_norm === nSlug);
    if (bySlugNorm.length === 1) return bySlugNorm[0]!.slug;
  }

  return null;
}

export function pickCanonicalWholeHouseWaterPartSlug(
  hit: { slug: string; oem_part_number: string },
  rows: WhwPartSlugRow[],
): string | null {
  const valid = new Set(rows.map((r) => r.slug));
  if (valid.has(hit.slug)) return hit.slug;

  const nOem = normalizeSearchCompact(hit.oem_part_number);
  if (nOem.length >= MIN_NORM_FROM_SLUG) {
    const byOem = rows.filter((r) => r.oem_part_number_norm === nOem);
    if (byOem.length === 1) return byOem[0]!.slug;
  }

  const nSlug = normalizeSearchCompact(hit.slug);
  if (nSlug.length >= MIN_NORM_FROM_SLUG) {
    const bySlugNorm = rows.filter((r) => r.oem_part_number_norm === nSlug);
    if (bySlugNorm.length === 1) return bySlugNorm[0]!.slug;
  }

  return null;
}

async function fetchModelResolutionRows(
  supabase: SupabaseClient,
  slugs: string[],
  norms: string[],
): Promise<WhwModelSlugRow[]> {
  const uniq = (xs: string[]) => Array.from(new Set(xs.filter(Boolean)));
  const s = uniq(slugs);
  const n = uniq(norms).filter((x) => x.length >= MIN_NORM_FROM_SLUG);

  const [rSlug, rNorm] = await Promise.all([
    s.length
      ? supabase
          .from("whole_house_water_models")
          .select("slug, model_number_norm")
          .in("slug", s)
      : Promise.resolve({ data: [] as WhwModelSlugRow[], error: null }),
    n.length
      ? supabase
          .from("whole_house_water_models")
          .select("slug, model_number_norm")
          .in("model_number_norm", n)
      : Promise.resolve({ data: [] as WhwModelSlugRow[], error: null }),
  ]);

  if (rSlug.error) throw rSlug.error;
  if (rNorm.error) throw rNorm.error;

  const byKey = new Map<string, WhwModelSlugRow>();
  for (const r of [...(rSlug.data ?? []), ...(rNorm.data ?? [])]) {
    byKey.set(r.slug, r as WhwModelSlugRow);
  }
  return Array.from(byKey.values());
}

async function fetchPartResolutionRows(
  supabase: SupabaseClient,
  slugs: string[],
  norms: string[],
): Promise<WhwPartSlugRow[]> {
  const uniq = (xs: string[]) => Array.from(new Set(xs.filter(Boolean)));
  const s = uniq(slugs);
  const n = uniq(norms).filter((x) => x.length >= MIN_NORM_FROM_SLUG);

  const [rSlug, rNorm] = await Promise.all([
    s.length
      ? supabase
          .from("whole_house_water_parts")
          .select("slug, oem_part_number_norm")
          .in("slug", s)
      : Promise.resolve({ data: [] as WhwPartSlugRow[], error: null }),
    n.length
      ? supabase
          .from("whole_house_water_parts")
          .select("slug, oem_part_number_norm")
          .in("oem_part_number_norm", n)
      : Promise.resolve({ data: [] as WhwPartSlugRow[], error: null }),
  ]);

  if (rSlug.error) throw rSlug.error;
  if (rNorm.error) throw rNorm.error;

  const byKey = new Map<string, WhwPartSlugRow>();
  for (const r of [...(rSlug.data ?? []), ...(rNorm.data ?? [])]) {
    byKey.set(r.slug, r as WhwPartSlugRow);
  }
  return Array.from(byKey.values());
}

/**
 * Patches whole-house-water model/filter hits so `slug` is the canonical row slug when
 * resolvable; sets `catalogDetailHref: null` when no live model/part row matches.
 */
export async function applyWholeHouseWaterSearchNavResolutionToCatalogHits(
  supabase: SupabaseClient,
  hits: SearchHit[],
): Promise<SearchHit[]> {
  const whModels = hits.filter(
    (h): h is SearchHitModel =>
      h.kind === "model" && h.catalog === CATALOG_WHOLE_HOUSE_WATER_FILTERS,
  );
  const whFilters = hits.filter(
    (h): h is SearchHitFilter =>
      h.kind === "filter" && h.catalog === CATALOG_WHOLE_HOUSE_WATER_FILTERS,
  );

  if (whModels.length === 0 && whFilters.length === 0) return hits;

  const modelSlugs = whModels.map((h) => h.slug);
  const modelNorms = whModels.flatMap((h) => [
    normalizeSearchCompact(h.model_number),
    normalizeSearchCompact(h.slug),
  ]);
  const partSlugs = whFilters.map((h) => h.slug);
  const partNorms = whFilters.flatMap((h) => [
    normalizeSearchCompact(h.oem_part_number),
    normalizeSearchCompact(h.slug),
  ]);

  const [modelRows, partRows] = await Promise.all([
    fetchModelResolutionRows(supabase, modelSlugs, modelNorms),
    fetchPartResolutionRows(supabase, partSlugs, partNorms),
  ]);

  return hits.map((h) => {
    if (h.kind === "model" && h.catalog === CATALOG_WHOLE_HOUSE_WATER_FILTERS) {
      const canonical = pickCanonicalWholeHouseWaterModelSlug(h, modelRows);
      if (canonical) {
        return { ...h, slug: canonical } as SearchHitModel;
      }
      return { ...h, catalogDetailHref: null } as SearchHitModel;
    }
    if (h.kind === "filter" && h.catalog === CATALOG_WHOLE_HOUSE_WATER_FILTERS) {
      const canonical = pickCanonicalWholeHouseWaterPartSlug(h, partRows);
      if (canonical) {
        return { ...h, slug: canonical } as SearchHitFilter;
      }
      return { ...h, catalogDetailHref: null } as SearchHitFilter;
    }
    return h;
  });
}

/**
 * Same resolution for the whole-house-water vertical search page (`/whole-house-water/search`).
 */
export async function applyWholeHouseWaterSearchNavResolutionToVerticalHits(
  supabase: SupabaseClient,
  hits: WholeHouseWaterSearchHit[],
): Promise<WholeHouseWaterSearchHit[]> {
  const whModels = hits.filter((h): h is WholeHouseWaterSearchHitModel => h.kind === "model");
  const whFilters = hits.filter((h): h is WholeHouseWaterSearchHitFilter => h.kind === "filter");

  if (whModels.length === 0 && whFilters.length === 0) return hits;

  const modelSlugs = whModels.map((h) => h.slug);
  const modelNorms = whModels.flatMap((h) => [
    normalizeSearchCompact(h.model_number),
    normalizeSearchCompact(h.slug),
  ]);
  const partSlugs = whFilters.map((h) => h.slug);
  const partNorms = whFilters.flatMap((h) => [
    normalizeSearchCompact(h.oem_part_number),
    normalizeSearchCompact(h.slug),
  ]);

  const [modelRows, partRows] = await Promise.all([
    fetchModelResolutionRows(supabase, modelSlugs, modelNorms),
    fetchPartResolutionRows(supabase, partSlugs, partNorms),
  ]);

  return hits.map((h) => {
    if (h.kind === "model") {
      const canonical = pickCanonicalWholeHouseWaterModelSlug(h, modelRows);
      if (canonical) {
        return { ...h, slug: canonical } as WholeHouseWaterSearchHitModel;
      }
      return { ...h, catalogDetailHref: null } as WholeHouseWaterSearchHitModel;
    }
    if (h.kind === "filter") {
      const canonical = pickCanonicalWholeHouseWaterPartSlug(h, partRows);
      if (canonical) {
        return { ...h, slug: canonical } as WholeHouseWaterSearchHitFilter;
      }
      return { ...h, catalogDetailHref: null } as WholeHouseWaterSearchHitFilter;
    }
    return h;
  });
}
