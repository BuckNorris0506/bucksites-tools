import { loadEnv } from "./lib/load-env";
import { getSupabaseAdmin } from "./lib/supabase-admin";

type SuggestedAction =
  | "add alias"
  | "add model"
  | "add filter/part"
  | "add compatibility mapping"
  | "add help page";

type EntityType =
  | "alias"
  | "model"
  | "filter_part"
  | "compatibility_mapping"
  | "help_page"
  | "unknown";

function parseArgNumber(flag: string, fallback: number): number {
  const idx = process.argv.indexOf(flag);
  if (idx === -1) return fallback;
  const raw = process.argv[idx + 1];
  const n = raw ? Number.parseInt(raw, 10) : Number.NaN;
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function classifyGap(rawQuery: string, normalizedQuery: string): {
  entityType: EntityType;
  action: SuggestedAction;
  confidence: number;
  reason: string;
} {
  const q = rawQuery.toLowerCase().trim();
  const compact = normalizedQuery.toLowerCase().trim();

  if (
    q.includes("reset") ||
    q.startsWith("how ") ||
    q.includes("manual") ||
    q.includes("error code") ||
    q.includes("replace ")
  ) {
    return {
      entityType: "help_page",
      action: "add help page",
      confidence: 0.86,
      reason: "query looks informational/instructional",
    };
  }

  if (
    q.includes("fits ") ||
    q.includes("compatible") ||
    q.includes("for ") ||
    q.includes("vs ")
  ) {
    return {
      entityType: "compatibility_mapping",
      action: "add compatibility mapping",
      confidence: 0.8,
      reason: "query indicates fit/compatibility intent",
    };
  }

  const hasLetters = /[a-z]/.test(compact);
  const hasDigits = /\d/.test(compact);
  if (hasLetters && hasDigits) {
    if (compact.length <= 12) {
      return {
        entityType: "model",
        action: "add model",
        confidence: 0.74,
        reason: "short alpha-numeric token likely a model number",
      };
    }
    return {
      entityType: "filter_part",
      action: "add filter/part",
      confidence: 0.71,
      reason: "long alpha-numeric token likely OEM part/SKU",
    };
  }

  if (hasLetters && compact.length <= 10) {
    return {
      entityType: "alias",
      action: "add alias",
      confidence: 0.62,
      reason: "short text token likely alternate naming/alias",
    };
  }

  return {
    entityType: "unknown",
    action: "add model",
    confidence: 0.4,
    reason: "insufficient signal; defaulting to model investigation",
  };
}

async function main() {
  loadEnv();
  const supabase = getSupabaseAdmin();

  const limit = parseArgNumber("--limit", 100);
  const write = process.argv.includes("--write");

  const { data, error } = await supabase
    .from("search_gaps")
    .select("id, catalog, normalized_query, sample_raw_query, search_count, zero_result_count, likely_entity_type, status, last_seen_at")
    .in("status", ["open", "reviewing"])
    .order("zero_result_count", { ascending: false })
    .order("search_count", { ascending: false })
    .order("last_seen_at", { ascending: false })
    .limit(limit);

  if (error) throw error;

  const rows = (data ?? []).map((row) => {
    const c = classifyGap(
      String(row.sample_raw_query ?? ""),
      String(row.normalized_query ?? ""),
    );
    return {
      id: Number(row.id),
      catalog: String(row.catalog ?? ""),
      normalized_query: String(row.normalized_query ?? ""),
      sample_raw_query: String(row.sample_raw_query ?? ""),
      search_count: Number(row.search_count ?? 0),
      zero_result_count: Number(row.zero_result_count ?? 0),
      status: String(row.status ?? "open"),
      current_likely_entity_type: String(row.likely_entity_type ?? "unknown"),
      suggested_likely_entity_type: c.entityType,
      suggested_action: c.action,
      confidence: c.confidence,
      reason: c.reason,
      last_seen_at: String(row.last_seen_at ?? ""),
    };
  });

  if (write) {
    for (const row of rows) {
      if (row.current_likely_entity_type !== "unknown") continue;
      if (row.suggested_likely_entity_type === "unknown") continue;
      const { error: updateError } = await supabase
        .from("search_gaps")
        .update({ likely_entity_type: row.suggested_likely_entity_type })
        .eq("id", row.id);
      if (updateError) throw updateError;
    }
  }

  console.log(
    JSON.stringify(
      {
        generated_at: new Date().toISOString(),
        write_mode: write,
        total_rows: rows.length,
        rows,
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error("[search-gaps-classify] failed", err);
  process.exit(1);
});
