/**
 * Read-only operator runbook: air_purifier pipeline + data health snapshot.
 */
import { loadEnv } from "./lib/load-env";
import {
  classifyAirPurifierSearchGap,
  type AirPurifierGapState,
} from "./lib/air-purifier-gap-classification";
import { getSupabaseAdmin } from "./lib/supabase-admin";
import { HOMEKEEP_WEDGE_CATALOG, wedgeCatalogsForGapQuery } from "@/lib/catalog/identity";

const CATALOG = HOMEKEEP_WEDGE_CATALOG.air_purifier;
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
    totalFiltersCount,
    totalApModelsCount,
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
    supabase.from("air_purifier_filters").select("id", { count: "exact", head: true }),
    supabase.from("air_purifier_models").select("id", { count: "exact", head: true }),
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
    totalFiltersCount.error,
    totalApModelsCount.error,
  ].filter(Boolean);
  if (errs.length) throw errs[0];

  const linkFilterIds = await pagedColumnIds("air_purifier_retailer_links", "air_purifier_filter_id");
  const compatFilterIds = await pagedColumnIds(
    "air_purifier_compatibility_mappings",
    "air_purifier_filter_id",
  );
  const usefulFilterIds = new Set([...Array.from(compatFilterIds), ...Array.from(linkFilterIds)]);

  const mappedWithoutRetailerIds = [...Array.from(compatFilterIds)].filter((id) =>
    !linkFilterIds.has(id),
  );
  const distinctCompatNoLink = mappedWithoutRetailerIds.length;

  const compatNoRetailerSample: Array<{
    air_purifier_filter_id: string;
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
      .from("air_purifier_filters")
      .select("id, slug, oem_part_number")
      .in("id", chunk);
    if (error) throw error;
    for (const r of data ?? []) {
      if (compatNoRetailerSample.length >= sampleTop) break;
      const row = r as { id: string; slug: string; oem_part_number: string };
      compatNoRetailerSample.push({
        air_purifier_filter_id: row.id,
        slug: row.slug,
        oem_part_number: row.oem_part_number,
      });
    }
  }
  compatNoRetailerSample.sort((a, b) =>
    (a.oem_part_number ?? "").localeCompare(b.oem_part_number ?? ""),
  );

  let orphanFiltersSample: Array<{ id: string; slug: string; oem_part_number: string }> = [];
  let orphanFiltersCount = 0;
  const orphanAcc: Array<{ id: string; slug: string; oem_part_number: string }> = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("air_purifier_filters")
      .select("id, slug, oem_part_number")
      .range(from, from + PAGE - 1);
    if (error) throw error;
    const chunk = data ?? [];
    for (const r of chunk) {
      const row = r as { id: string; slug: string; oem_part_number: string };
      if (!usefulFilterIds.has(row.id)) {
        orphanAcc.push(row);
        orphanFiltersCount += 1;
      }
    }
    if (chunk.length < PAGE) break;
  }
  orphanFiltersSample = orphanAcc
    .sort((a, b) => a.oem_part_number.localeCompare(b.oem_part_number))
    .slice(0, sampleTop);

  const gapClassificationTally: Record<AirPurifierGapState, number> = {
    still_unresolved: 0,
    now_resolved_by_live_search: 0,
    intentionally_hidden_orphan_filter: 0,
    superseded_by_live_model_or_mapping: 0,
  };
  const search_gaps_reviewed: Array<
    Record<string, unknown> & {
      gap_classification: { state: AirPurifierGapState; detail: string };
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
    const gap_classification = await classifyAirPurifierSearchGap({
      sample_raw_query: g.sample_raw_query,
      normalized_query: g.normalized_query,
      usefulFilterIds,
    });
    gapClassificationTally[gap_classification.state] += 1;
    search_gaps_reviewed.push({ ...g, gap_classification });
  }

  let newLiveModelsWindow: unknown[] | null = null;
  let newLiveModelsWindowError: string | null = null;
  {
    const { data, error } = await supabase
      .from("air_purifier_models")
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

  let newLiveFiltersWindow: unknown[] | null = null;
  let newLiveFiltersWindowError: string | null = null;
  {
    const { data, error } = await supabase
      .from("air_purifier_filters")
      .select("slug, oem_part_number, brands:brand_id(slug)")
      .gte("created_at", sinceIso)
      .order("created_at", { ascending: false })
      .limit(sampleTop);
    if (error) {
      newLiveFiltersWindowError = error.message;
      newLiveFiltersWindow = null;
    } else {
      newLiveFiltersWindow = data ?? [];
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
      `${nResolved} air-purifier-related search_gap row(s) are stale: global /search already returns air-purifier hits (discovery gating applied). Plan DB update to status=resolved — this runbook is read-only.`,
    );
  }
  if (nHiddenOrphan > 0) {
    recommended_next_actions.push(
      `${nHiddenOrphan} gap(s): OEM matches a live air_purifier_filters row with no compatibility_mappings and no retailer_links, so it stays hidden from browse/search. Add maps + buy links or mark gap ignored if intentional.`,
    );
  }
  if (nSuperseded > 0) {
    recommended_next_actions.push(
      `${nSuperseded} gap(s): live air_purifier_models or mapped filters exist for normalized tokens but /search still empty — re-check norms/RPCs or close gap after manual verification.`,
    );
  }
  if (nStill > 0) {
    recommended_next_actions.push(
      `${nStill} gap(s) still genuinely unresolved vs live data — run \`npm run search:gaps:classify\`, then gap candidate tooling for air_purifier where wired.`,
    );
  }
  if (stagedReviewingCount > 0) {
    recommended_next_actions.push(
      `${stagedReviewingCount} staged row(s) in "reviewing" for air_purifier — finish review or reject via your existing staging workflow.`,
    );
  }
  if (distinctCompatNoLink > 0) {
    recommended_next_actions.push(
      `${distinctCompatNoLink} filter(s) appear in air_purifier_compatibility_mappings but have zero retailer_links — add affiliate rows; guardrail report: \`npm run buckparts:guardrails:air-purifier\`.`,
    );
  }
  if (orphanFiltersCount > 0) {
    recommended_next_actions.push(
      `${orphanFiltersCount} live filter(s) are discovery orphans (no compat, no links) — map to models or add links; guardrail: \`npm run buckparts:guardrails:air-purifier\`.`,
    );
  }
  if (recommended_next_actions.length === 0) {
    recommended_next_actions.push(
      "No items flagged in this snapshot; re-run after pipeline work. Schedule `npm run buckparts:guardrails:air-purifier` periodically.",
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
      live_air_purifier_models: totalApModelsCount.count ?? 0,
      live_air_purifier_filters: totalFiltersCount.count ?? 0,
      compatibility_mappings_distinct_filters_without_retailer_link: distinctCompatNoLink,
      orphan_live_filters_hidden_from_discovery: orphanFiltersCount,
    },
    interpretation: {
      latest_promoted_staging_rows:
        "Latest rows with status=promoted in staged_model_additions / staged_filter_part_additions (ordered by id desc).",
      new_live_in_window:
        "Live air_purifier_models / air_purifier_filters with created_at in the last --since-days.",
      orphan_filters:
        "air_purifier_filters with no row in compatibility_mappings AND no row in retailer_links (matches Phase A discovery rule).",
      search_gap_classification:
        "Each shown gap is replayed through searchCatalog(skipTelemetry) + air purifier filter RPCs + model_number_norm/oem_part_number_norm checks.",
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
      air_purifier_models: newLiveModelsWindow,
      air_purifier_models_query_error: newLiveModelsWindowError,
      air_purifier_filters: newLiveFiltersWindow,
      air_purifier_filters_query_error: newLiveFiltersWindowError,
    },
    compatibility_mapped_filters_missing_retailer_link: {
      count_distinct_filters: distinctCompatNoLink,
      sample: compatNoRetailerSample,
    },
    orphan_filters_hidden_from_discovery: {
      count: orphanFiltersCount,
      sample: orphanFiltersSample,
    },
    recommended_next_actions,
    command_hints: {
      runbook: "npm run buckparts:runbook:air-purifier",
      guardrails: "npm run buckparts:guardrails:air-purifier",
      gap_status: "npm run buckparts:search-gap:status:air-purifier -- --id <id> --action resolved",
      classification_env:
        "Gap replay uses `NEXT_PUBLIC_SUPABASE_*` anon client + `searchCatalog(..., { skipTelemetry: true })`.",
    },
  };

  console.log(JSON.stringify(payload, null, 2));
}

main().catch((e) => {
  console.error("[runbook-air-purifier] failed", e);
  process.exit(1);
});
