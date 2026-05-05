import type { SupabaseClient } from "@supabase/supabase-js";

export type ResolvedRefrigeratorFilterRow = {
  id: string;
  slug: string;
  oem_part_number: string;
};

export type ResolveRefrigeratorFilterVia =
  | "slug_exact"
  | "slug_lower"
  | "oem_part_number"
  | "filter_alias";

export type ResolveRefrigeratorFilterResult =
  | { ok: true; row: ResolvedRefrigeratorFilterRow; via: ResolveRefrigeratorFilterVia }
  | { ok: false; reason: "not_found" | "ambiguous"; detail?: string };

type FilterSelectRow = {
  id: string;
  slug: string;
  oem_part_number: string | null;
};

function normalizeOem(s: string | null | undefined): string {
  return (s ?? "").trim();
}

function uniqueFilters(rows: FilterSelectRow[]): ResolvedRefrigeratorFilterRow[] {
  const byId = new Map<string, ResolvedRefrigeratorFilterRow>();
  for (const r of rows) {
    const slug = (r.slug ?? "").trim();
    if (!r.id || !slug) continue;
    byId.set(r.id, {
      id: r.id,
      slug,
      oem_part_number: normalizeOem(r.oem_part_number),
    });
  }
  return Array.from(byId.values());
}

async function fetchFiltersBySlugCandidates(
  supabase: SupabaseClient,
  slug: string,
): Promise<FilterSelectRow[]> {
  const { data, error } = await supabase
    .from("filters")
    .select("id,slug,oem_part_number")
    .eq("slug", slug)
    .limit(5);
  if (error) throw error;
  return (data ?? []) as FilterSelectRow[];
}

async function fetchFiltersByOemToken(
  supabase: SupabaseClient,
  token: string,
): Promise<FilterSelectRow[]> {
  const { data, error } = await supabase
    .from("filters")
    .select("id,slug,oem_part_number")
    .ilike("oem_part_number", token)
    .limit(25);
  if (error) throw error;
  const upper = token.toUpperCase();
  return ((data ?? []) as FilterSelectRow[]).filter(
    (r) => normalizeOem(r.oem_part_number).toUpperCase() === upper,
  );
}

async function fetchFilterIdsByAliasToken(
  supabase: SupabaseClient,
  token: string,
): Promise<string[]> {
  const { data, error } = await supabase
    .from("filter_aliases")
    .select("filter_id,alias")
    .ilike("alias", token)
    .limit(50);
  if (error) throw error;
  const upper = token.toUpperCase();
  const ids = new Set<string>();
  for (const row of (data ?? []) as Array<{ filter_id: string; alias: string }>) {
    if (String(row.alias).toUpperCase() === upper) ids.add(row.filter_id);
  }
  return Array.from(ids);
}

async function fetchFiltersByIds(
  supabase: SupabaseClient,
  ids: string[],
): Promise<FilterSelectRow[]> {
  if (ids.length === 0) return [];
  const { data, error } = await supabase
    .from("filters")
    .select("id,slug,oem_part_number")
    .in("id", ids)
    .limit(25);
  if (error) throw error;
  return (data ?? []) as FilterSelectRow[];
}

/**
 * Map an Amazon / Command Center queue token (often uppercase OEM, e.g. EDR1RXD1)
 * to a live `public.filters` row. Tries slug (exact + lowercase), OEM (case-insensitive),
 * then `filter_aliases` (case-insensitive).
 */
export async function resolveRefrigeratorFilterRowFromQueueToken(
  supabase: SupabaseClient,
  rawToken: string,
): Promise<ResolveRefrigeratorFilterResult> {
  const token = rawToken.trim();
  if (!token) {
    return { ok: false, reason: "not_found", detail: "empty token" };
  }

  const exactSlugRows = await fetchFiltersBySlugCandidates(supabase, token);
  const exactUnique = uniqueFilters(exactSlugRows);
  if (exactUnique.length > 1) {
    return { ok: false, reason: "ambiguous", detail: "multiple filters share slug (exact token)" };
  }
  if (exactUnique.length === 1) {
    return { ok: true, row: exactUnique[0]!, via: "slug_exact" };
  }

  const lower = token.toLowerCase();
  if (lower !== token) {
    const lowerRows = await fetchFiltersBySlugCandidates(supabase, lower);
    const lowerUnique = uniqueFilters(lowerRows);
    if (lowerUnique.length > 1) {
      return { ok: false, reason: "ambiguous", detail: "multiple filters share lowercase slug" };
    }
    if (lowerUnique.length === 1) {
      return { ok: true, row: lowerUnique[0]!, via: "slug_lower" };
    }
  }

  const oemRows = await fetchFiltersByOemToken(supabase, token);
  const oemUnique = uniqueFilters(oemRows);
  if (oemUnique.length > 1) {
    return { ok: false, reason: "ambiguous", detail: "multiple filters match OEM token" };
  }
  if (oemUnique.length === 1) {
    return { ok: true, row: oemUnique[0]!, via: "oem_part_number" };
  }

  const aliasFilterIds = await fetchFilterIdsByAliasToken(supabase, token);
  if (aliasFilterIds.length > 1) {
    return { ok: false, reason: "ambiguous", detail: "alias maps to multiple filter_id values" };
  }
  if (aliasFilterIds.length === 1) {
    const byId = await fetchFiltersByIds(supabase, aliasFilterIds);
    const resolved = uniqueFilters(byId);
    if (resolved.length !== 1) {
      return { ok: false, reason: "not_found", detail: "alias filter_id missing in filters table" };
    }
    return { ok: true, row: resolved[0]!, via: "filter_alias" };
  }

  return { ok: false, reason: "not_found", detail: "no slug, OEM, or alias match" };
}
