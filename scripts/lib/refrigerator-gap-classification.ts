/**
 * Read-only: classify refrigerator-related search gaps vs live DB + live search behavior (anon/RLS).
 */
import { CATALOG_REFRIGERATOR_WATER_FILTER } from "@/lib/catalog/constants";
import { searchCatalog } from "@/lib/data/search";
import { normalizeSearchCompact, trimSearchInput } from "@/lib/search/normalize";
import { getSupabaseServerClient } from "@/lib/supabase/server-client";

const RPC_LIMIT = 25;

export type RefrigeratorGapState =
  | "still_unresolved"
  | "now_resolved_by_live_search"
  | "intentionally_hidden_orphan_filter"
  | "superseded_by_live_model_or_mapping";

export type RefrigeratorGapClassification = {
  state: RefrigeratorGapState;
  detail: string;
};

function candidateNormsFromQuery(q: string): string[] {
  const norms = new Set<string>();
  const compact = normalizeSearchCompact(q);
  if (compact.length >= 4) norms.add(compact);
  const tokens = q.toUpperCase().match(/\b[A-Z0-9][A-Z0-9-]{3,}\b/g) ?? [];
  for (const t of tokens) {
    const n = normalizeSearchCompact(t);
    if (n.length >= 4) norms.add(n);
  }
  return [...norms];
}

function fridgeRelevantHits(
  hits: Awaited<ReturnType<typeof searchCatalog>>,
): string[] {
  const lines: string[] = [];
  for (const h of hits) {
    if (h.catalog !== CATALOG_REFRIGERATOR_WATER_FILTER) continue;
    if (h.kind === "fridge") {
      lines.push(`fridge:${h.slug} (${h.model_number})`);
    } else if (h.kind === "filter") {
      lines.push(`filter:${h.slug} (${h.oem_part_number})`);
    }
  }
  return lines;
}

export async function classifyRefrigeratorSearchGap(args: {
  sample_raw_query: string;
  normalized_query: string;
  usefulFilterIds: Set<string>;
}): Promise<RefrigeratorGapClassification> {
  const raw =
    args.sample_raw_query?.trim() ||
    (args.normalized_query?.trim().length ? args.normalized_query.trim() : "");
  const q = trimSearchInput(raw);
  if (q.length < 2) {
    return { state: "still_unresolved", detail: "query too short for search (< 2 chars)" };
  }

  const hits = await searchCatalog(q, { skipTelemetry: true });
  const fridgeLines = fridgeRelevantHits(hits);
  if (fridgeLines.length > 0) {
    return {
      state: "now_resolved_by_live_search",
      detail: `live search returns ${fridgeLines.length} refrigerator hit(s): ${fridgeLines.slice(0, 6).join("; ")}${fridgeLines.length > 6 ? "…" : ""}`,
    };
  }

  const supabase = getSupabaseServerClient();

  const [{ data: fd }, { data: fa }] = await Promise.all([
    supabase.rpc("search_filters_flexible", { q, limit_count: RPC_LIMIT }),
    supabase.rpc("search_filter_aliases_flexible", { q, limit_count: RPC_LIMIT }),
  ]);

  const filterSlugs = new Set<string>();
  for (const row of (fd ?? []) as Array<{ slug: string }>) {
    if (row.slug) filterSlugs.add(row.slug);
  }
  for (const row of (fa ?? []) as Array<{ slug: string }>) {
    if (row.slug) filterSlugs.add(row.slug);
  }

  if (filterSlugs.size > 0) {
    const slugList = [...filterSlugs];
    const { data: filterRows, error: fErr } = await supabase
      .from("filters")
      .select("id, slug")
      .in("slug", slugList);
    if (fErr) throw fErr;
    const ids = (filterRows ?? []) as Array<{ id: string; slug: string }>;
    if (ids.length > 0) {
      const allOrphan = ids.every((r) => !args.usefulFilterIds.has(r.id));
      const anyUseful = ids.some((r) => args.usefulFilterIds.has(r.id));
      if (allOrphan) {
        return {
          state: "intentionally_hidden_orphan_filter",
          detail: `search_filters RPC matches ${ids.length} filter row(s) with no compat and no retailer_links (hidden from discovery): ${ids.map((r) => r.slug).slice(0, 8).join(", ")}${ids.length > 8 ? "…" : ""}`,
        };
      }
      if (anyUseful) {
        return {
          state: "still_unresolved",
          detail:
            "RPC matched at least one useful filter (compat or retailer link) but searchCatalog returned no refrigerator hits — worth investigating search/enrich path",
        };
      }
    }
  }

  const norms = candidateNormsFromQuery(q);
  for (const n of norms) {
    const { data: mod, error: mErr } = await supabase
      .from("fridge_models")
      .select("slug, model_number")
      .eq("model_number_norm", n)
      .limit(2);
    if (mErr) throw mErr;
    if ((mod ?? []).length > 0) {
      const row = mod![0] as { slug: string; model_number: string };
      return {
        state: "superseded_by_live_model_or_mapping",
        detail: `live fridge_models row matches normalized token (${n}): ${row.model_number} → /fridge/${row.slug}`,
      };
    }
  }

  for (const n of norms) {
    const { data: fil, error: filErr } = await supabase
      .from("filters")
      .select("id, slug, oem_part_number")
      .eq("oem_part_number_norm", n)
      .limit(2);
    if (filErr) throw filErr;
    const frow = (fil ?? [])[0] as { id: string; slug: string; oem_part_number: string } | undefined;
    if (!frow) continue;
    const { count, error: cErr } = await supabase
      .from("compatibility_mappings")
      .select("fridge_model_id", { count: "exact", head: true })
      .eq("filter_id", frow.id);
    if (cErr) throw cErr;
    if ((count ?? 0) > 0) {
      return {
        state: "superseded_by_live_model_or_mapping",
        detail: `live filters row + compatibility_mappings: ${frow.oem_part_number} → /filter/${frow.slug} (${count} mapping row(s))`,
      };
    }
  }

  return {
    state: "still_unresolved",
    detail:
      "no refrigerator search hits; no orphan-only RPC filter match; no live model_number_norm / mapped filter norm match",
  };
}
