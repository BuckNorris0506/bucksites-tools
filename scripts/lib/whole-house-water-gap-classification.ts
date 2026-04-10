/**
 * Read-only: classify whole-house-water-related search gaps vs live DB + global search (anon/RLS).
 */
import { CATALOG_WHOLE_HOUSE_WATER_FILTERS } from "@/lib/catalog/constants";
import { searchCatalog } from "@/lib/data/search";
import { normalizeSearchCompact, trimSearchInput } from "@/lib/search/normalize";
import { getSupabaseServerClient } from "@/lib/supabase/server-client";

const RPC_LIMIT = 25;

export type WholeHouseWaterGapState =
  | "still_unresolved"
  | "now_resolved_by_live_search"
  | "intentionally_hidden_orphan_filter"
  | "superseded_by_live_model_or_mapping";

export type WholeHouseWaterGapClassification = {
  state: WholeHouseWaterGapState;
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
  return Array.from(norms);
}

function whwRelevantHits(
  hits: Awaited<ReturnType<typeof searchCatalog>>,
): string[] {
  const lines: string[] = [];
  for (const h of hits) {
    if (h.catalog !== CATALOG_WHOLE_HOUSE_WATER_FILTERS) continue;
    if (h.kind === "model") {
      lines.push(`model:${h.slug} (${h.model_number})`);
    } else if (h.kind === "filter") {
      lines.push(`part:${h.slug} (${h.oem_part_number})`);
    }
  }
  return lines;
}

export async function classifyWholeHouseWaterSearchGap(args: {
  sample_raw_query: string;
  normalized_query: string;
  usefulPartIds: Set<string>;
}): Promise<WholeHouseWaterGapClassification> {
  const raw =
    args.sample_raw_query?.trim() ||
    (args.normalized_query?.trim().length ? args.normalized_query.trim() : "");
  const q = trimSearchInput(raw);
  if (q.length < 2) {
    return { state: "still_unresolved", detail: "query too short for search (< 2 chars)" };
  }

  const hits = await searchCatalog(q, { skipTelemetry: true });
  const whLines = whwRelevantHits(hits);
  if (whLines.length > 0) {
    return {
      state: "now_resolved_by_live_search",
      detail: `live search returns ${whLines.length} whole-house-water hit(s): ${whLines.slice(0, 6).join("; ")}${whLines.length > 6 ? "…" : ""}`,
    };
  }

  const supabase = getSupabaseServerClient();

  const [{ data: pd }, { data: pa }] = await Promise.all([
    supabase.rpc("search_whole_house_water_parts_flexible", {
      q,
      limit_count: RPC_LIMIT,
    }),
    supabase.rpc("search_whole_house_water_part_aliases_flexible", {
      q,
      limit_count: RPC_LIMIT,
    }),
  ]);

  const partSlugs = new Set<string>();
  for (const row of (pd ?? []) as Array<{ slug: string }>) {
    if (row.slug) partSlugs.add(row.slug);
  }
  for (const row of (pa ?? []) as Array<{ slug: string }>) {
    if (row.slug) partSlugs.add(row.slug);
  }

  if (partSlugs.size > 0) {
    const slugList = Array.from(partSlugs);
    const { data: partRows, error: pErr } = await supabase
      .from("whole_house_water_parts")
      .select("id, slug")
      .in("slug", slugList);
    if (pErr) throw pErr;
    const ids = (partRows ?? []) as Array<{ id: string; slug: string }>;
    if (ids.length > 0) {
      const allOrphan = ids.every((r) => !args.usefulPartIds.has(r.id));
      const anyUseful = ids.some((r) => args.usefulPartIds.has(r.id));
      if (allOrphan) {
        return {
          state: "intentionally_hidden_orphan_filter",
          detail: `search_whole_house_water_parts RPC matches ${ids.length} part row(s) with no compat and no retailer_links (hidden from discovery): ${ids.map((r) => r.slug).slice(0, 8).join(", ")}${ids.length > 8 ? "…" : ""}`,
        };
      }
      if (anyUseful) {
        return {
          state: "still_unresolved",
          detail:
            "RPC matched at least one useful part (compat or retailer link) but searchCatalog returned no whole-house-water hits — worth investigating search/enrich path",
        };
      }
    }
  }

  const norms = candidateNormsFromQuery(q);
  for (const n of norms) {
    const { data: mod, error: mErr } = await supabase
      .from("whole_house_water_models")
      .select("slug, model_number")
      .eq("model_number_norm", n)
      .limit(2);
    if (mErr) throw mErr;
    if ((mod ?? []).length > 0) {
      const row = mod![0] as { slug: string; model_number: string };
      return {
        state: "superseded_by_live_model_or_mapping",
        detail: `live whole_house_water_models row matches normalized token (${n}): ${row.model_number} → /whole-house-water/model/${row.slug}`,
      };
    }
  }

  for (const n of norms) {
    const { data: fil, error: filErr } = await supabase
      .from("whole_house_water_parts")
      .select("id, slug, oem_part_number")
      .eq("oem_part_number_norm", n)
      .limit(2);
    if (filErr) throw filErr;
    const prow = (fil ?? [])[0] as
      | { id: string; slug: string; oem_part_number: string }
      | undefined;
    if (!prow) continue;
    const { count, error: cErr } = await supabase
      .from("whole_house_water_compatibility_mappings")
      .select("whole_house_water_model_id", { count: "exact", head: true })
      .eq("whole_house_water_part_id", prow.id);
    if (cErr) throw cErr;
    if ((count ?? 0) > 0) {
      return {
        state: "superseded_by_live_model_or_mapping",
        detail: `live whole_house_water_parts + compatibility_mappings: ${prow.oem_part_number} → /whole-house-water/filter/${prow.slug} (${count} mapping row(s))`,
      };
    }
  }

  return {
    state: "still_unresolved",
    detail:
      "no whole-house-water search hits; no orphan-only RPC part match; no live model_number_norm / mapped part norm match",
  };
}
