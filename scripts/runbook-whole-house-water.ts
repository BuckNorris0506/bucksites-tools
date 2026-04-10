/**
 * Read-only operator runbook: whole_house_water pipeline + data health snapshot.
 */
import { loadEnv } from "./lib/load-env";
import {
  classifyWholeHouseWaterSearchGap,
  type WholeHouseWaterGapState,
} from "./lib/whole-house-water-gap-classification";
import { getSupabaseAdmin } from "./lib/supabase-admin";
import { HOMEKEEP_WEDGE_CATALOG, wedgeCatalogsForGapQuery } from "@/lib/catalog/identity";

const CATALOG = HOMEKEEP_WEDGE_CATALOG.whole_house_water;
const GAP_CATALOG_FILTER = wedgeCatalogsForGapQuery(CATALOG);
const PAGE = 2000;

function parseArgNumber(flag: string, fallback: number): number {
  const idx = process.argv.indexOf(flag);
  if (idx === -1) return fallback;
  const raw = process.argv[idx + 1];
  const n = raw ? Number.parseInt(raw, 10) : Number.NaN;
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

async function pagedColumnIds(table: string, column: string): Promise<Set<string>> {
  const supabase = getSupabaseAdmin();
  const out = new Set<string>();
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase.from(table).select(column).range(from, from + PAGE - 1);
    if (error) throw error;
    const chunk = data ?? [];
    for (const row of chunk) {
      const v = (row as unknown as Record<string, unknown>)[column];
      if (typeof v === "string" && v.length > 0) out.add(v);
    }
    if (chunk.length < PAGE) break;
  }
  return out;
}

async function main() {
  loadEnv();
  const supabase = getSupabaseAdmin();
  const gapTop = parseArgNumber("--gaps", 12);
  const sampleTop = parseArgNumber("--top", 8);
  const promotedLimit = parseArgNumber("--promoted", 10);
  const sinceDays = parseArgNumber("--since-days", 14);

  const sinceIso = new Date(Date.now() - sinceDays * 86400000).toISOString();

  const [
    searchGapsRes,
    searchGapsCountRes,
    stagedModelReviewing,
    stagedFilterReviewing,
    stagedCompatReviewing,
    stagedAliasReviewing,
    stagedHelpReviewing,
    latestPromotedModels,
    latestPromotedFilters,
    totalPartsCount,
    totalWhModelsCount,
  ] = await Promise.all([
    supabase
      .from("search_gaps")
      .select(
        "id, catalog, status, sample_raw_query, normalized_query, search_count, zero_result_count, likely_entity_type, last_seen_at",
      )
      .in("catalog", GAP_CATALOG_FILTER)
      .in("status", ["open", "reviewing", "queued"])
      .order("zero_result_count", { ascending: false })
      .order("search_count", { ascending: false })
      .limit(gapTop),
    supabase
      .from("search_gaps")
      .select("id", { count: "exact", head: true })
      .in("catalog", GAP_CATALOG_FILTER)
      .in("status", ["open", "reviewing", "queued"]),
    supabase
      .from("staged_model_additions")
      .select("id, status, proposed_model_number, proposed_brand_slug, created_at")
      .eq("catalog", CATALOG)
      .eq("status", "reviewing")
      .order("id", { ascending: true }),
    supabase
      .from("staged_filter_part_additions")
      .select("id, status, proposed_oem_part_number, proposed_brand_slug, created_at")
      .eq("catalog", CATALOG)
      .eq("status", "reviewing")
      .order("id", { ascending: true }),
    supabase
      .from("staged_compatibility_mapping_additions")
      .select("id, status, model_id, part_id, created_at")
      .eq("catalog", CATALOG)
      .eq("status", "reviewing")
      .order("id", { ascending: true }),
    supabase
      .from("staged_alias_additions")
      .select("id, status, target_kind, proposed_alias, created_at")
      .eq("catalog", CATALOG)
      .eq("status", "reviewing")
      .order("id", { ascending: true }),
    supabase
      .from("staged_help_page_additions")
      .select("id, status, suggested_slug, created_at")
      .eq("catalog", CATALOG)
      .eq("status", "reviewing")
      .order("id", { ascending: true }),
    supabase
      .from("staged_model_additions")
      .select("id, proposed_model_number, proposed_brand_slug, created_at")
      .eq("catalog", CATALOG)
      .eq("status", "promoted")
      .order("id", { ascending: false })
      .limit(promotedLimit),
    supabase
      .from("staged_filter_part_additions")
      .select("id, proposed_oem_part_number, proposed_brand_slug, created_at")
      .eq("catalog", CATALOG)
      .eq("status", "promoted")
      .order("id", { ascending: false })
      .limit(promotedLimit),
    supabase.from("whole_house_water_parts").select("id", { count: "exact", head: true }),
    supabase.from("whole_house_water_models").select("id", { count: "exact", head: true }),
  ]);

  const errs = [
    searchGapsRes.error,
    searchGapsCountRes.error,
    stagedModelReviewing.error,
    stagedFilterReviewing.error,
    stagedCompatReviewing.error,
    stagedAliasReviewing.error,
    stagedHelpReviewing.error,
    latestPromotedModels.error,
    latestPromotedFilters.error,
    totalPartsCount.error,
    totalWhModelsCount.error,
  ].filter(Boolean);
  if (errs.length) throw errs[0];

  const linkPartIds = await pagedColumnIds("whole_house_water_retailer_links", "whole_house_water_part_id");
  const compatPartIds = await pagedColumnIds(
    "whole_house_water_compatibility_mappings",
    "whole_house_water_part_id",
  );
  const usefulPartIds = new Set([...Array.from(compatPartIds), ...Array.from(linkPartIds)]);

  const mappedWithoutRetailerIds = [...Array.from(compatPartIds)].filter((id) =>
    !linkPartIds.has(id),
  );
  const distinctCompatNoLink = mappedWithoutRetailerIds.length;

  const compatNoRetailerSample: Array<{
    whole_house_water_part_id: string;
    slug: string | null;
    oem_part_number: string | null;
  }> = [];
  for (
    let i = 0;
    i < mappedWithoutRetailerIds.length && compatNoRetailerSample.length < sampleTop;
    i += 80
  ) {
    const chunk = mappedWithoutRetailerIds.slice(i, i + 80);
    if (chunk.length === 0) break;
    const { data, error } = await supabase
      .from("whole_house_water_parts")
      .select("id, slug, oem_part_number")
      .in("id", chunk);
    if (error) throw error;
    for (const r of data ?? []) {
      if (compatNoRetailerSample.length >= sampleTop) break;
      const row = r as { id: string; slug: string; oem_part_number: string };
      compatNoRetailerSample.push({
        whole_house_water_part_id: row.id,
        slug: row.slug,
        oem_part_number: row.oem_part_number,
      });
    }
  }
  compatNoRetailerSample.sort((a, b) =>
    (a.oem_part_number ?? "").localeCompare(b.oem_part_number ?? ""),
  );

  let orphanPartsSample: Array<{ id: string; slug: string; oem_part_number: string }> = [];
  let orphanPartsCount = 0;
  const orphanAcc: Array<{ id: string; slug: string; oem_part_number: string }> = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("whole_house_water_parts")
      .select("id, slug, oem_part_number")
      .range(from, from + PAGE - 1);
    if (error) throw error;
    const chunk = data ?? [];
    for (const r of chunk) {
      const row = r as { id: string; slug: string; oem_part_number: string };
      if (!usefulPartIds.has(row.id)) {
        orphanAcc.push(row);
        orphanPartsCount += 1;
      }
    }
    if (chunk.length < PAGE) break;
  }
  orphanPartsSample = orphanAcc
    .sort((a, b) => a.oem_part_number.localeCompare(b.oem_part_number))
    .slice(0, sampleTop);

  const gapClassificationTally: Record<WholeHouseWaterGapState, number> = {
    still_unresolved: 0,
    now_resolved_by_live_search: 0,
    intentionally_hidden_orphan_filter: 0,
    superseded_by_live_model_or_mapping: 0,
  };
  const search_gaps_reviewed: Array<
    Record<string, unknown> & {
      gap_classification: { state: WholeHouseWaterGapState; detail: string };
    }
  > = [];
  for (const row of searchGapsRes.data ?? []) {
    const g = row as {
      id: number;
      catalog: string;
      status: string;
      sample_raw_query: string;
      normalized_query: string;
      search_count: number;
      zero_result_count: number;
      likely_entity_type: string;
      last_seen_at: string;
    };
    const gap_classification = await classifyWholeHouseWaterSearchGap({
      sample_raw_query: g.sample_raw_query,
      normalized_query: g.normalized_query,
      usefulPartIds,
    });
    gapClassificationTally[gap_classification.state] += 1;
    search_gaps_reviewed.push({ ...g, gap_classification });
  }

  let newLiveModelsWindow: unknown[] | null = null;
  let newLiveModelsWindowError: string | null = null;
  {
    const { data, error } = await supabase
      .from("whole_house_water_models")
      .select("slug, model_number, brands:brand_id(slug)")
      .gte("created_at", sinceIso)
      .order("created_at", { ascending: false })
      .limit(sampleTop);
    if (error) {
      newLiveModelsWindowError = error.message;
      newLiveModelsWindow = null;
    } else {
      newLiveModelsWindow = data ?? [];
    }
  }

  let newLivePartsWindow: unknown[] | null = null;
  let newLivePartsWindowError: string | null = null;
  {
    const { data, error } = await supabase
      .from("whole_house_water_parts")
      .select("slug, oem_part_number, brands:brand_id(slug)")
      .gte("created_at", sinceIso)
      .order("created_at", { ascending: false })
      .limit(sampleTop);
    if (error) {
      newLivePartsWindowError = error.message;
      newLivePartsWindow = null;
    } else {
      newLivePartsWindow = data ?? [];
    }
  }

  const stagedReviewing = {
    staged_model_additions: stagedModelReviewing.data ?? [],
    staged_filter_part_additions: stagedFilterReviewing.data ?? [],
    staged_compatibility_mapping_additions: stagedCompatReviewing.data ?? [],
    staged_alias_additions: stagedAliasReviewing.data ?? [],
    staged_help_page_additions: stagedHelpReviewing.data ?? [],
  };
  const stagedReviewingCount =
    (stagedModelReviewing.data?.length ?? 0) +
    (stagedFilterReviewing.data?.length ?? 0) +
    (stagedCompatReviewing.data?.length ?? 0) +
    (stagedAliasReviewing.data?.length ?? 0) +
    (stagedHelpReviewing.data?.length ?? 0);

  const recommended_next_actions: string[] = [];
  const nResolved = gapClassificationTally.now_resolved_by_live_search;
  const nHiddenOrphan = gapClassificationTally.intentionally_hidden_orphan_filter;
  const nSuperseded = gapClassificationTally.superseded_by_live_model_or_mapping;
  const nStill = gapClassificationTally.still_unresolved;

  if (nResolved > 0) {
    recommended_next_actions.push(
      `${nResolved} whole-house-water-related search_gap row(s) are stale: global /search already returns whole-house-water hits (discovery gating applied). Plan DB update to status=resolved — this runbook is read-only.`,
    );
  }
  if (nHiddenOrphan > 0) {
    recommended_next_actions.push(
      `${nHiddenOrphan} gap(s): OEM matches a live whole_house_water_parts row with no compatibility_mappings and no retailer_links, so it stays hidden from browse/search. Add maps + buy links or mark gap ignored if intentional.`,
    );
  }
  if (nSuperseded > 0) {
    recommended_next_actions.push(
      `${nSuperseded} gap(s): live whole_house_water_models or mapped parts exist for normalized tokens but /search still empty — re-check norms/RPCs or close gap after manual verification.`,
    );
  }
  if (nStill > 0) {
    recommended_next_actions.push(
      `${nStill} gap(s) still genuinely unresolved vs live data — run \`npm run search:gaps:classify\`, then gap candidate tooling for whole_house_water where wired.`,
    );
  }
  if (stagedReviewingCount > 0) {
    recommended_next_actions.push(
      `${stagedReviewingCount} staged row(s) in "reviewing" for whole_house_water — finish review or reject via your existing staging workflow (no dedicated WHW promote script in this pass).`,
    );
  }
  if (distinctCompatNoLink > 0) {
    recommended_next_actions.push(
      `${distinctCompatNoLink} part(s) appear in whole_house_water_compatibility_mappings but have zero retailer_links — add affiliate rows; guardrail report: \`npm run buckparts:guardrails:whole-house-water\`.`,
    );
  }
  if (orphanPartsCount > 0) {
    recommended_next_actions.push(
      `${orphanPartsCount} live part(s) are discovery orphans (no compat, no links) — map to models or add links; guardrail: \`npm run buckparts:guardrails:whole-house-water\`.`,
    );
  }
  if (recommended_next_actions.length === 0) {
    recommended_next_actions.push(
      "No items flagged in this snapshot; re-run after pipeline work. Schedule `npm run buckparts:guardrails:whole-house-water` periodically.",
    );
  }

  const payload = {
    generated_at: new Date().toISOString(),
    read_only: true,
    scope: CATALOG,
    parameters: {
      gaps_limit: gapTop,
      sample_top: sampleTop,
      latest_promoted_limit: promotedLimit,
      since_days: sinceDays,
    },
    summary_counts: {
      search_gaps_unresolved_total: searchGapsCountRes.count ?? 0,
      search_gaps_unresolved_shown: (searchGapsRes.data ?? []).length,
      search_gap_classification_of_shown: gapClassificationTally,
      staged_reviewing_total: stagedReviewingCount,
      live_whole_house_water_models: totalWhModelsCount.count ?? 0,
      live_whole_house_water_parts: totalPartsCount.count ?? 0,
      compatibility_mappings_distinct_parts_without_retailer_link: distinctCompatNoLink,
      orphan_live_parts_hidden_from_discovery: orphanPartsCount,
    },
    interpretation: {
      latest_promoted_staging_rows:
        "Latest rows with status=promoted in staged_model_additions / staged_filter_part_additions (ordered by id desc).",
      new_live_in_window:
        "Live whole_house_water_models / parts with created_at in the last --since-days (skipped if DB has no created_at column).",
      orphan_parts:
        "whole_house_water_parts with no row in compatibility_mappings AND no row in retailer_links (matches Phase A discovery hiding rule).",
      search_gap_classification:
        "Each shown gap is replayed through searchCatalog(skipTelemetry) + WHW part RPCs + model_number_norm/oem_part_number_norm checks. Order: resolved by live search -> hidden orphan part -> superseded by live row -> still unresolved.",
    },
    search_gaps_reviewed,
    staged_reviewing: {
      counts: {
        staged_model_additions: stagedModelReviewing.data?.length ?? 0,
        staged_filter_part_additions: stagedFilterReviewing.data?.length ?? 0,
        staged_compatibility_mapping_additions: stagedCompatReviewing.data?.length ?? 0,
        staged_alias_additions: stagedAliasReviewing.data?.length ?? 0,
        staged_help_page_additions: stagedHelpReviewing.data?.length ?? 0,
      },
      rows: stagedReviewing,
    },
    latest_promoted_via_staging: {
      staged_model_additions: latestPromotedModels.data ?? [],
      staged_filter_part_additions: latestPromotedFilters.data ?? [],
    },
    new_live_in_window: {
      whole_house_water_models: newLiveModelsWindow,
      whole_house_water_models_query_error: newLiveModelsWindowError,
      whole_house_water_parts: newLivePartsWindow,
      whole_house_water_parts_query_error: newLivePartsWindowError,
    },
    compatibility_mapped_parts_missing_retailer_link: {
      count_distinct_parts: distinctCompatNoLink,
      sample: compatNoRetailerSample,
    },
    orphan_parts_hidden_from_discovery: {
      count: orphanPartsCount,
      sample: orphanPartsSample,
    },
    recommended_next_actions,
    command_hints: {
      runbook: "npm run buckparts:runbook:whole-house-water",
      guardrails: "npm run buckparts:guardrails:whole-house-water",
      gap_status: "npm run buckparts:search-gap:status:whole-house-water -- --id <id> --action resolved",
      classification_env:
        "Gap replay uses `NEXT_PUBLIC_SUPABASE_*` anon client + `searchCatalog(..., { skipTelemetry: true })`. Service role used for batched inventory reads.",
    },
  };

  console.log(JSON.stringify(payload, null, 2));
}

main().catch((e) => {
  console.error("[runbook-whole-house-water] failed", e);
  process.exit(1);
});
