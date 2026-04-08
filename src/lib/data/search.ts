import { getSupabaseServerClient } from "@/lib/supabase/server-client";

export type SearchHitFridge = {
  kind: "fridge";
  slug: string;
  model_number: string;
  brand_name: string;
  brand_slug: string;
  via?: "model" | "alias";
  matchedAlias?: string;
};

export type SearchHitFilter = {
  kind: "filter";
  slug: string;
  oem_part_number: string;
  name: string | null;
  brand_name: string;
  brand_slug: string;
  via?: "oem" | "alias";
  matchedAlias?: string;
};

export type SearchHit = SearchHitFridge | SearchHitFilter;

const MIN_LEN = 2;
const LIMIT = 25;
const MAX_QUERY = 80;

export async function searchCatalog(rawQuery: string): Promise<SearchHit[]> {
  const q = rawQuery.trim().slice(0, MAX_QUERY);
  if (q.length < MIN_LEN) return [];

  const supabase = getSupabaseServerClient();
  const pattern = `%${q}%`;

  const [
    fridgesDirect,
    fridgeAliases,
    filtersDirect,
    filterAliases,
  ] = await Promise.all([
    supabase
      .from("fridge_models")
      .select(
        `
        slug,
        model_number,
        brand:brands!inner ( name, slug )
      `,
      )
      .ilike("model_number", pattern)
      .limit(LIMIT),
    supabase
      .from("fridge_model_aliases")
      .select(
        `
        alias,
        fridge_models!inner (
          slug,
          model_number,
          brand:brands!inner ( name, slug )
        )
      `,
      )
      .ilike("alias", pattern)
      .limit(LIMIT),
    supabase
      .from("filters")
      .select(
        `
        slug,
        oem_part_number,
        name,
        brand:brands!inner ( name, slug )
      `,
      )
      .ilike("oem_part_number", pattern)
      .limit(LIMIT),
    supabase
      .from("filter_aliases")
      .select(
        `
        alias,
        filters!inner (
          slug,
          oem_part_number,
          name,
          brand:brands!inner ( name, slug )
        )
      `,
      )
      .ilike("alias", pattern)
      .limit(LIMIT),
  ]);

  if (fridgesDirect.error) throw fridgesDirect.error;
  if (fridgeAliases.error) throw fridgeAliases.error;
  if (filtersDirect.error) throw filtersDirect.error;
  if (filterAliases.error) throw filterAliases.error;

  const seenFridge = new Set<string>();
  const seenFilter = new Set<string>();
  const out: SearchHit[] = [];

  type BrandRef = { name: string; slug: string };

  for (const row of fridgesDirect.data ?? []) {
    const r = row as unknown as {
      slug: string;
      model_number: string;
      brand: BrandRef;
    };
    if (seenFridge.has(r.slug)) continue;
    seenFridge.add(r.slug);
    out.push({
      kind: "fridge",
      slug: r.slug,
      model_number: r.model_number,
      brand_name: r.brand.name,
      brand_slug: r.brand.slug,
      via: "model",
    });
  }

  for (const row of fridgeAliases.data ?? []) {
    const r = row as unknown as {
      alias: string;
      fridge_models: {
        slug: string;
        model_number: string;
        brand: BrandRef;
      };
    };
    const fm = r.fridge_models;
    if (seenFridge.has(fm.slug)) continue;
    seenFridge.add(fm.slug);
    out.push({
      kind: "fridge",
      slug: fm.slug,
      model_number: fm.model_number,
      brand_name: fm.brand.name,
      brand_slug: fm.brand.slug,
      via: "alias",
      matchedAlias: r.alias,
    });
  }

  for (const row of filtersDirect.data ?? []) {
    const r = row as unknown as {
      slug: string;
      oem_part_number: string;
      name: string | null;
      brand: BrandRef;
    };
    if (seenFilter.has(r.slug)) continue;
    seenFilter.add(r.slug);
    out.push({
      kind: "filter",
      slug: r.slug,
      oem_part_number: r.oem_part_number,
      name: r.name,
      brand_name: r.brand.name,
      brand_slug: r.brand.slug,
      via: "oem",
    });
  }

  for (const row of filterAliases.data ?? []) {
    const r = row as unknown as {
      alias: string;
      filters: {
        slug: string;
        oem_part_number: string;
        name: string | null;
        brand: BrandRef;
      };
    };
    const f = r.filters;
    if (seenFilter.has(f.slug)) continue;
    seenFilter.add(f.slug);
    out.push({
      kind: "filter",
      slug: f.slug,
      oem_part_number: f.oem_part_number,
      name: f.name,
      brand_name: f.brand.name,
      brand_slug: f.brand.slug,
      via: "alias",
      matchedAlias: r.alias,
    });
  }

  return out;
}
