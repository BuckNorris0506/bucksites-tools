/**
 * Manual search_gaps status updates for whole-house-water-related rows only.
 * Dry-run by default; use --write to persist.
 */
import { loadEnv } from "./lib/load-env";
import {
  classifyWholeHouseWaterSearchGap,
  type WholeHouseWaterGapClassification,
} from "./lib/whole-house-water-gap-classification";
import { getSupabaseAdmin } from "./lib/supabase-admin";
import { HOMEKEEP_WEDGE_CATALOG, wedgeAllowsSearchGapCatalog, wedgeCatalogsForGapQuery } from "@/lib/catalog/identity";

const PAGE = 2000;
const WEDGE = HOMEKEEP_WEDGE_CATALOG.whole_house_water;
const ALLOWED_CATALOG_LIST = wedgeCatalogsForGapQuery(WEDGE);

type GapAction = "resolved" | "ignored";

function parseIds(): number[] {
  const out: number[] = [];
  const idx = process.argv.indexOf("--ids");
  if (idx !== -1) {
    const raw = process.argv[idx + 1];
    if (raw) {
      for (const part of raw.split(",")) {
        const n = Number.parseInt(part.trim(), 10);
        if (Number.isFinite(n) && n > 0) out.push(n);
      }
    }
  }
  for (let i = 0; i < process.argv.length; i += 1) {
    if (process.argv[i] === "--id") {
      const n = Number.parseInt(process.argv[i + 1] ?? "", 10);
      if (Number.isFinite(n) && n > 0) out.push(n);
    }
  }
  return Array.from(new Set(out)).sort((a, b) => a - b);
}

function parseAction(): GapAction | null {
  const idx = process.argv.indexOf("--action");
  if (idx === -1) return null;
  const v = (process.argv[idx + 1] ?? "").trim().toLowerCase();
  if (v === "resolved" || v === "ignored") return v;
  return null;
}

async function pagedColumnIds(table: string, column: string): Promise<Set<string>> {
  const supabase = getSupabaseAdmin();
  const ids = new Set<string>();
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase.from(table).select(column).range(from, from + PAGE - 1);
    if (error) throw error;
    const chunk = data ?? [];
    for (const row of chunk) {
      const v = (row as unknown as Record<string, unknown>)[column];
      if (typeof v === "string" && v.length > 0) ids.add(v);
    }
    if (chunk.length < PAGE) break;
  }
  return ids;
}

function suggestedActionFromClassification(
  c: WholeHouseWaterGapClassification,
): GapAction | null {
  if (
    c.state === "now_resolved_by_live_search" ||
    c.state === "superseded_by_live_model_or_mapping"
  ) {
    return "resolved";
  }
  if (c.state === "intentionally_hidden_orphan_filter") {
    return "ignored";
  }
  return null;
}

async function main() {
  loadEnv();
  const supabase = getSupabaseAdmin();
  const ids = parseIds();
  const action = parseAction();
  const write = process.argv.includes("--write");

  if (ids.length === 0) {
    throw new Error(
      "Provide gap id(s): --id 12 or --ids 12,34,56 (search_gaps.id, bigint)",
    );
  }
  if (!action) {
    throw new Error('Provide --action resolved | --action ignored');
  }

  const targetStatus: GapAction = action;

  const [fromCompat, fromLinks] = await Promise.all([
    pagedColumnIds("whole_house_water_compatibility_mappings", "whole_house_water_part_id"),
    pagedColumnIds("whole_house_water_retailer_links", "whole_house_water_part_id"),
  ]);
  const usefulPartIds = new Set([...Array.from(fromCompat), ...Array.from(fromLinks)]);

  const rows: Array<Record<string, unknown>> = [];

  for (const gapId of ids) {
    const { data: row, error: fetchErr } = await supabase
      .from("search_gaps")
      .select(
        "id, catalog, status, sample_raw_query, normalized_query, likely_entity_type, search_count, zero_result_count",
      )
      .eq("id", gapId)
      .maybeSingle();
    if (fetchErr) throw fetchErr;
    if (!row) {
      rows.push({
        gap_id: gapId,
        error: "search_gaps row not found",
      });
      continue;
    }
    const g = row as {
      id: number;
      catalog: string;
      status: string;
      sample_raw_query: string;
      normalized_query: string;
      likely_entity_type: string;
      search_count: number;
      zero_result_count: number;
    };

    if (!wedgeAllowsSearchGapCatalog(WEDGE, g.catalog)) {
      rows.push({
        gap_id: gapId,
        error: `catalog "${g.catalog}" is not whole-house-water-scoped (allowed: ${ALLOWED_CATALOG_LIST.join(", ")})`,
        row: g,
      });
      continue;
    }

    const gap_classification = await classifyWholeHouseWaterSearchGap({
      sample_raw_query: g.sample_raw_query,
      normalized_query: g.normalized_query,
      usefulPartIds,
    });
    const suggested_action = suggestedActionFromClassification(gap_classification);
    const action_matches_suggestion = suggested_action === targetStatus;
    const warning =
      suggested_action !== null && suggested_action !== targetStatus
        ? `classification suggests "${suggested_action}" but you requested "${targetStatus}"`
        : null;

    if (g.status === targetStatus) {
      rows.push({
        gap_id: gapId,
        before_status: g.status,
        target_status: targetStatus,
        idempotent_skip: true,
        gap_classification,
        suggested_action,
        warning,
      });
      continue;
    }

    if (!write) {
      rows.push({
        gap_id: gapId,
        before_status: g.status,
        target_status: targetStatus,
        dry_run: true,
        gap_classification,
        suggested_action,
        action_matches_suggestion,
        warning,
      });
      continue;
    }

    const { data: updated, error: upErr } = await supabase
      .from("search_gaps")
      .update({ status: targetStatus })
      .eq("id", gapId)
      .eq("catalog", g.catalog)
      .select("id, status, updated_at")
      .maybeSingle();
    if (upErr) throw upErr;
    rows.push({
      gap_id: gapId,
      before_status: g.status,
      after_status: (updated as { status: string } | null)?.status ?? null,
      updated_at: (updated as { updated_at: string } | null)?.updated_at ?? null,
      wrote: Boolean(updated),
      gap_classification,
      suggested_action,
      action_matches_suggestion,
      warning,
    });
  }

  console.log(
    JSON.stringify(
      {
        generated_at: new Date().toISOString(),
        read_only: !write,
        scope: "whole_house_water_related_search_gaps",
        allowed_catalogs: [...ALLOWED_CATALOG_LIST],
        action: targetStatus,
        hint:
          "Runbook: `npm run buckparts:runbook:whole-house-water` for classification across top gaps. This script does not auto-pick ids.",
        rows,
      },
      null,
      2,
    ),
  );

  if (!write) {
    console.error(
      "[apply-search-gap-status-whole-house-water] dry-run only. Re-run with --write to update search_gaps.status.",
    );
  }
}

main().catch((e) => {
  console.error("[apply-search-gap-status-whole-house-water] failed", e);
  process.exit(1);
});
