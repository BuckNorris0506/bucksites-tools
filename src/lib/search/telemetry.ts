import type { HomekeepSearchIntelligenceCatalog } from "@/lib/catalog/identity";
import { normalizeSearchCompact, trimSearchInput } from "@/lib/search/normalize";
import { getSupabaseServerClient } from "@/lib/supabase/server-client";

const MIN_QUERY_LEN = 2;

export type SearchGapEntityType =
  | "alias"
  | "model"
  | "filter_part"
  | "compatibility_mapping"
  | "help_page"
  | "unknown";

/** Wedge + `all_catalogs`; see `@/lib/catalog/identity`. */
export type SearchTelemetryCatalog = HomekeepSearchIntelligenceCatalog;

function inferLikelyEntityType(rawQuery: string): SearchGapEntityType {
  const q = rawQuery.toLowerCase().trim();
  if (!q) return "unknown";

  if (
    q.includes("reset") ||
    q.startsWith("how ") ||
    q.includes("manual") ||
    q.includes("replace ")
  ) {
    return "help_page";
  }

  if (q.includes(" fits ") || q.includes("compatible") || q.includes("for ")) {
    return "compatibility_mapping";
  }

  // Typical part/model lookups are usually short and alpha-numeric.
  const compact = normalizeSearchCompact(q);
  if (/[a-z]/.test(compact) && /\d/.test(compact)) {
    if (compact.length <= 14) return "model";
    return "filter_part";
  }

  if (compact.length > 0 && compact.length <= 10) return "alias";
  return "unknown";
}

export async function logSearchTelemetry(params: {
  rawQuery: string;
  resultsCount: number;
  catalog: SearchTelemetryCatalog;
}): Promise<void> {
  const raw = trimSearchInput(params.rawQuery);
  if (raw.length < MIN_QUERY_LEN) return;

  const normalized = normalizeSearchCompact(raw);
  if (!normalized) return;

  const supabase = getSupabaseServerClient();

  try {
    const { error: eventError } = await supabase.from("search_events").insert({
      raw_query: raw,
      normalized_query: normalized,
      results_count: Math.max(0, params.resultsCount),
      catalog: params.catalog,
    });
    if (eventError) throw eventError;
  } catch (error) {
    console.error("[search-telemetry] event insert failed", error);
    return;
  }

  if (params.resultsCount !== 0) return;

  const likely = inferLikelyEntityType(raw);
  try {
    const { error: gapError } = await supabase.rpc("upsert_search_gap", {
      p_catalog: params.catalog,
      p_raw_query: raw,
      p_normalized_query: normalized,
      p_results_count: 0,
      p_likely_entity_type: likely,
    });
    if (gapError) throw gapError;
  } catch (error) {
    console.error("[search-telemetry] gap upsert failed", error);
  }
}
