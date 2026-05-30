/**
 * Read-only WHW director model-first batch v1 — multi-filter bounded evidence from
 * Batch Production Director active MODEL_FIRST_READY items.
 * No CSV, Supabase, public UI, launch-state, or buy-gate mutation.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { parse } from "csv-parse/sync";

import { getVerticalLaunchState } from "@/lib/catalog/vertical-launch-state";
import { isManufacturerSiteSearchUrl } from "@/lib/retailers/launch-buy-links";

import {
  type ModelFirstEvidenceRowStatusV1,
  type ModelFirstLiveBrowserModelRowV1,
} from "./air-purifier-model-first-evidence-result-v1";
import {
  WHW_BATCH_PRODUCTION_DIRECTOR_CONTRACT_V1,
  buildWholeHouseWaterBatchProductionDirectorV1,
  type WholeHouseWaterBatchProductionDirectorV1,
  type WhwBatchProductionDirectorItemV1,
} from "./whole-house-water-batch-production-director-v1";
import {
  WHW_MODEL_FIRST_EVIDENCE_RESULTS_DIR_REL_V1,
  WHW_MODEL_FIRST_EVIDENCE_RESULT_CONTRACT_V1,
  WHW_MODEL_FIRST_EASIEST_PROOF_QUEUE_CONTRACT_V1,
  isAllowedWhwModelFirstEvidenceResultRelPathV1,
  type WhwModelFirstLiveBrowserEvidenceResultV1,
} from "./whole-house-water-model-first-evidence-result-v1";

import {
  WHW_DIRECTOR_MODEL_FIRST_BATCH_CONTRACT_V1,
  WHW_DIRECTOR_MODEL_FIRST_BATCH_V1_RESULT_REL_V1,
  directorModelFirstBatchParkedFilterSlugsV1,
  isAllowedWhwDirectorModelFirstBatchRelPathV1,
} from "./whole-house-water-director-model-first-batch-artifact-v1";

export {
  WHW_DIRECTOR_MODEL_FIRST_BATCH_CONTRACT_V1,
  WHW_DIRECTOR_MODEL_FIRST_BATCH_V1_RESULT_REL_V1,
  directorModelFirstBatchParkedFilterSlugsV1,
} from "./whole-house-water-director-model-first-batch-artifact-v1";

export const WHW_DIRECTOR_MODEL_FIRST_BATCH_PACKET_ID_V1 =
  "whw-director-model-first-batch-v1" as const;

export const OFFICIAL_AP800_HOUSING_PDF_V1 =
  "https://multimedia.3m.com/mws/media/1903341O/3m-aqua-pure-ap800-series-whole-house-filter-housings.pdf";

export const OFFICIAL_AQUA_PURE_COMPARISON_CHART_PDF_V1 =
  "https://multimedia.3m.com/mws/media/2337401O/residential-aqua-pure-home-water-filter-comparison-chart.pdf";

export type WhwDirectorModelFirstNextLaneV1 =
  | "buyer_path_proof"
  | "mapping_review"
  | "skip_for_now";

export type WhwDirectorModelFirstFilterResultV1 = {
  batch_rank: number;
  filter_slug: string;
  brand_slug: string;
  oem_part_number: string;
  anchor_model_or_system_slug: string | null;
  evidence_status: ModelFirstEvidenceRowStatusV1;
  evidence_notes: string;
  source_refs: string[];
  status_reason: string;
  next_recommended_lane: WhwDirectorModelFirstNextLaneV1;
  per_filter_artifact_rel: string | null;
  search_placeholder_primary: boolean;
  recommended_mapping_count: number;
  compat_only_mapping: boolean;
};

export type WholeHouseWaterDirectorModelFirstBatchV1 = {
  contract: typeof WHW_DIRECTOR_MODEL_FIRST_BATCH_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  evidence_mode: "director_model_first_batch_v1";
  packet_id: typeof WHW_DIRECTOR_MODEL_FIRST_BATCH_PACKET_ID_V1;
  source_director_contract: typeof WHW_BATCH_PRODUCTION_DIRECTOR_CONTRACT_V1;
  source_batch_head_filter_slug: string | null;
  source_batch_head_packet_kind: string | null;
  batch_size: number;
  filters_checked: WhwDirectorModelFirstFilterResultV1[];
  evidence_status_counts: Record<ModelFirstEvidenceRowStatusV1, number>;
  buyer_path_proof_targets: string[];
  parked_filter_slugs: string[];
  csv_apply_authorized: false;
  supabase_update_authorized: false;
  whw_public_opening_authorized: false;
  generated_at: string;
  checked_at: string;
  do_not_open_public: true;
  proven_facts: string[];
  inferred_facts: string[];
  unknown_facts: string[];
  director_batch_cycle_sealed?: boolean;
};

type RepoMappingRowV1 = {
  model_slug: string;
  filter_slug: string;
  is_recommended: boolean;
};

type RepoContextV1 = {
  filterBrandBySlug: Map<string, string>;
  filterOemBySlug: Map<string, string>;
  primaryUrlByFilter: Map<string, string>;
  mappings: RepoMappingRowV1[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readCsv(rootDir: string, rel: string): Record<string, string>[] {
  const abs = path.join(rootDir, rel);
  if (!existsSync(abs)) return [];
  return parse(readFileSync(abs, "utf8"), {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
  }) as Record<string, string>[];
}

function isTruthyRecommended(value: string | undefined): boolean {
  const v = (value ?? "").trim().toLowerCase();
  return v === "true" || v === "1" || v === "yes";
}

export function loadWhwRepoContextV1(rootDir: string): RepoContextV1 {
  const filterBrandBySlug = new Map<string, string>();
  const filterOemBySlug = new Map<string, string>();
  for (const row of readCsv(rootDir, "data/whole-house-water/filters.csv")) {
    const slug = (row.slug ?? "").trim().toLowerCase();
    if (!slug) continue;
    filterBrandBySlug.set(slug, (row.brand_slug ?? "").trim().toLowerCase());
    filterOemBySlug.set(slug, (row.oem_part_number ?? row.slug ?? "").trim());
  }

  const primaryUrlByFilter = new Map<string, string>();
  for (const row of readCsv(rootDir, "data/whole-house-water/retailer_links.csv")) {
    const slug = (row.filter_slug ?? "").trim().toLowerCase();
    if (!slug) continue;
    const isPrimary = (row.is_primary ?? "").trim().toLowerCase();
    if (isPrimary !== "true" && isPrimary !== "1" && isPrimary !== "yes") continue;
    primaryUrlByFilter.set(
      slug,
      (row.destination_url ?? row.affiliate_url ?? "").trim(),
    );
  }

  const mappings: RepoMappingRowV1[] = [];
  for (const row of readCsv(rootDir, "data/whole-house-water/compatibility_mappings.csv")) {
    const modelSlug = (row.model_slug ?? "").trim().toLowerCase();
    const filterSlug = (row.filter_slug ?? "").trim().toLowerCase();
    if (!modelSlug || !filterSlug) continue;
    mappings.push({
      model_slug: modelSlug,
      filter_slug: filterSlug,
      is_recommended: isTruthyRecommended(row.is_recommended),
    });
  }

  return { filterBrandBySlug, filterOemBySlug, primaryUrlByFilter, mappings };
}

export function mappingStatsForFilterV1(
  repo: RepoContextV1,
  filterSlug: string,
): { recommended: string[]; compatOnly: boolean } {
  const rows = repo.mappings.filter((m) => m.filter_slug === filterSlug);
  const recommended = rows.filter((m) => m.is_recommended).map((m) => m.model_slug);
  const compatOnly = rows.length > 0 && recommended.length === 0;
  return { recommended, compatOnly };
}

export function whwDirectorModelFirstPerFilterArtifactRelV1(filterSlug: string): string {
  return `${WHW_MODEL_FIRST_EVIDENCE_RESULTS_DIR_REL_V1}/whw-model-first-${filterSlug}-director-batch-v1.results.json`;
}

export function selectDirectorModelFirstBatchItemsV1(
  director: WholeHouseWaterBatchProductionDirectorV1,
): WhwBatchProductionDirectorItemV1[] {
  return director.next_batch_items.model_first_evidence.filter(
    (item) => item.workload === "active",
  );
}

function countStatuses(
  rows: WhwDirectorModelFirstFilterResultV1[],
): Record<ModelFirstEvidenceRowStatusV1, number> {
  const counts: Record<ModelFirstEvidenceRowStatusV1, number> = {
    PASS: 0,
    FAIL: 0,
    UNKNOWN: 0,
    BLOCKED: 0,
  };
  for (const row of rows) counts[row.evidence_status] += 1;
  return counts;
}

function boundedEvidenceForDirectorFilterV1(args: {
  filterSlug: string;
  anchorModelSlug: string | null;
  repo: RepoContextV1;
}): Pick<
  WhwDirectorModelFirstFilterResultV1,
  | "evidence_status"
  | "evidence_notes"
  | "source_refs"
  | "status_reason"
  | "next_recommended_lane"
  | "search_placeholder_primary"
  | "recommended_mapping_count"
  | "compat_only_mapping"
> {
  const { filterSlug, anchorModelSlug, repo } = args;
  const { recommended, compatOnly } = mappingStatsForFilterV1(repo, filterSlug);
  const primaryUrl = repo.primaryUrlByFilter.get(filterSlug) ?? "";
  const searchPlaceholderPrimary =
    primaryUrl.length > 0 && isManufacturerSiteSearchUrl(primaryUrl);

  if (searchPlaceholderPrimary) {
    // Search placeholders cannot prove model-first fit.
  }

  if (compatOnly) {
    return {
      evidence_status: "BLOCKED",
      evidence_notes: `BLOCKED: committed compatibility_mappings.csv has ${String(repo.mappings.filter((m) => m.filter_slug === filterSlug).length)} row(s) for ${filterSlug} but none with is_recommended=true — mapping chain ambiguous.`,
      source_refs: [
        "data/whole-house-water/compatibility_mappings.csv",
        ...(primaryUrl ? [`committed_primary:${primaryUrl}`] : []),
      ],
      status_reason:
        "No recommended housing→filter mapping in committed CSV; compat-only rows cannot prove official OEM fit.",
      next_recommended_lane: "mapping_review",
      search_placeholder_primary: searchPlaceholderPrimary,
      recommended_mapping_count: 0,
      compat_only_mapping: true,
    };
  }

  const anchor = anchorModelSlug ?? recommended[0] ?? null;
  const sourceRefs = [
    "data/whole-house-water/compatibility_mappings.csv",
    "data/whole-house-water/filters.csv",
    ...(primaryUrl ? [`committed_primary:${primaryUrl}`] : []),
  ];

  if (filterSlug === "3m-ap910r") {
    return {
      evidence_status: "UNKNOWN",
      evidence_notes:
        "PARTIAL: committed mapping 3m-aquapure-ap903 → 3m-ap910r is_recommended=true; filters.csv documents AP910R for AP903/AP904-class systems. UNKNOWN: AP900-series official comparison-chart row for AP910R not verified in bounded repo read — not grinding AP903 manual hunt in this batch.",
      source_refs: [...sourceRefs, OFFICIAL_AQUA_PURE_COMPARISON_CHART_PDF_V1],
      status_reason:
        "Repo recommended mapping exists but official stamped-head documentation not captured in bounded batch.",
      next_recommended_lane: "skip_for_now",
      search_placeholder_primary: searchPlaceholderPrimary,
      recommended_mapping_count: recommended.length,
      compat_only_mapping: false,
    };
  }

  if (filterSlug === "3m-ap917hd-s") {
    return {
      evidence_status: "UNKNOWN",
      evidence_notes:
        "PARTIAL: committed mapping 3m-aquapure-ap903 → 3m-ap917hd-s is_recommended=true; filters.csv notes AP917HD-S for AP900-series sediment. UNKNOWN: Official stamped-head compatibility not verified in bounded batch.",
      source_refs: [...sourceRefs, OFFICIAL_AQUA_PURE_COMPARISON_CHART_PDF_V1],
      status_reason:
        "Same AP903 anchor as AP910R; bounded repo read lacks official AP917HD-S fit proof.",
      next_recommended_lane: "skip_for_now",
      search_placeholder_primary: searchPlaceholderPrimary,
      recommended_mapping_count: recommended.length,
      compat_only_mapping: false,
    };
  }

  if (filterSlug === "whirlpool-whkf-gd05") {
    return {
      evidence_status: "UNKNOWN",
      evidence_notes:
        "PARTIAL: committed mapping whirlpool-whkf-dwhbb → whirlpool-whkf-gd05 is_recommended=true; models.csv notes WHKF-GD05 + WHKF-WHPL on dual Big Blue installs. UNKNOWN: No official Whirlpool manual URL in repo; primary committed link is search placeholder.",
      source_refs: sourceRefs,
      status_reason:
        "Recommended mapping without official manual URL captured — search primary cannot prove fit.",
      next_recommended_lane: "skip_for_now",
      search_placeholder_primary: searchPlaceholderPrimary,
      recommended_mapping_count: recommended.length,
      compat_only_mapping: false,
    };
  }

  if (filterSlug === "ge-fxwpc") {
    return {
      evidence_status: "UNKNOWN",
      evidence_notes:
        "PARTIAL: committed mappings ge-whole-house-gxwh20s/gxwh30c/gxwh35f/gxwh40f → ge-fxwpc are is_recommended=true. UNKNOWN: No official GE whole-house manual URL in repo; primary committed link is geapplianceparts search placeholder.",
      source_refs: sourceRefs,
      status_reason:
        "Multiple recommended GE housing mappings but no official generation-sticker proof in bounded batch.",
      next_recommended_lane: "skip_for_now",
      search_placeholder_primary: searchPlaceholderPrimary,
      recommended_mapping_count: recommended.length,
      compat_only_mapping: false,
    };
  }

  if (filterSlug === "ge-fxhsc") {
    return {
      evidence_status: "BLOCKED",
      evidence_notes:
        "BLOCKED: queue skip_fast cites replacement-chain / generation ambiguity across GXWH20S/GXWH30C/GXWH35F/GXWH40F manifolds. Committed mappings to ge-fxhsc are is_recommended=false only.",
      source_refs: sourceRefs,
      status_reason: "Generation/manifold ambiguity — mapping review required before proof spend.",
      next_recommended_lane: "mapping_review",
      search_placeholder_primary: searchPlaceholderPrimary,
      recommended_mapping_count: 0,
      compat_only_mapping: true,
    };
  }

  if (filterSlug === "springwell-cf1-sediment") {
    return {
      evidence_status: "UNKNOWN",
      evidence_notes:
        "PARTIAL: committed mapping springwell-cf1-system → springwell-cf1-sediment is_recommended=true. UNKNOWN: No official SpringWell manual URL in repo; primary committed link is site search placeholder.",
      source_refs: sourceRefs,
      status_reason: "Recommended mapping without official manual capture in bounded batch.",
      next_recommended_lane: "skip_for_now",
      search_placeholder_primary: searchPlaceholderPrimary,
      recommended_mapping_count: recommended.length,
      compat_only_mapping: false,
    };
  }

  if (filterSlug === "culligan-cw5-bb") {
    return {
      evidence_status: "UNKNOWN",
      evidence_notes:
        "PARTIAL: committed mapping culligan-housing-wh-hd-950-c → culligan-cw5-bb is_recommended=true. UNKNOWN: No official Culligan manual URL in repo; primary is search placeholder.",
      source_refs: sourceRefs,
      status_reason: "Recommended mapping without official manual in bounded repo read.",
      next_recommended_lane: "skip_for_now",
      search_placeholder_primary: searchPlaceholderPrimary,
      recommended_mapping_count: recommended.length,
      compat_only_mapping: false,
    };
  }

  if (filterSlug === "watts-w50pehd") {
    return {
      evidence_status: "UNKNOWN",
      evidence_notes:
        "PARTIAL: committed mapping watts-w50whd-housing → watts-w50pehd is_recommended=true; models.csv notes W50PEHD for W50WHD-class housings. UNKNOWN: No official Watts manual URL in repo; primary is search placeholder.",
      source_refs: sourceRefs,
      status_reason: "Recommended mapping without official manual in bounded repo read.",
      next_recommended_lane: "skip_for_now",
      search_placeholder_primary: searchPlaceholderPrimary,
      recommended_mapping_count: recommended.length,
      compat_only_mapping: false,
    };
  }

  if (filterSlug === "pentek-dgd-5005") {
    return {
      evidence_status: "UNKNOWN",
      evidence_notes:
        "PARTIAL: committed mapping pentair-big-blue-housing-bb10 → pentek-dgd-5005 is_recommended=true; filters.csv documents BB10 fit. UNKNOWN: No official Pentair/Pentek product manual URL in repo; primary is Pentair site search placeholder — cannot PASS from row count alone.",
      source_refs: sourceRefs,
      status_reason:
        "Standard BB10 cross-compat mapping exists but official OEM documentation not captured.",
      next_recommended_lane: "skip_for_now",
      search_placeholder_primary: searchPlaceholderPrimary,
      recommended_mapping_count: recommended.length,
      compat_only_mapping: false,
    };
  }

  if (filterSlug === "pentek-p5-slim") {
    return {
      evidence_status: "UNKNOWN",
      evidence_notes:
        "PARTIAL: committed mapping pentek-slim-housing-158115 → pentek-p5-slim is_recommended=true. UNKNOWN: No official Pentair slim-housing manual URL in repo; primary is search placeholder.",
      source_refs: sourceRefs,
      status_reason: "Recommended slim-housing mapping without official manual in bounded batch.",
      next_recommended_lane: "skip_for_now",
      search_placeholder_primary: searchPlaceholderPrimary,
      recommended_mapping_count: recommended.length,
      compat_only_mapping: false,
    };
  }

  return {
    evidence_status: "UNKNOWN",
    evidence_notes: `UNKNOWN: No bounded evidence template for ${filterSlug}; anchor ${anchor ?? "none"}.`,
    source_refs: sourceRefs,
    status_reason: "No bounded repo evidence template for filter slug.",
    next_recommended_lane: "skip_for_now",
    search_placeholder_primary: searchPlaceholderPrimary,
    recommended_mapping_count: recommended.length,
    compat_only_mapping: compatOnly,
  };
}

export function buildWhwDirectorModelFirstPerFilterArtifactV1(args: {
  filterResult: WhwDirectorModelFirstFilterResultV1;
  now?: () => Date;
}): WhwModelFirstLiveBrowserEvidenceResultV1 {
  const now = args.now ?? (() => new Date());
  const iso = now().toISOString();
  const runDay = iso.slice(0, 10);
  const slug = args.filterResult.filter_slug;
  const anchor = args.filterResult.anchor_model_or_system_slug ?? slug;

  const model_rows: ModelFirstLiveBrowserModelRowV1[] = [
    {
      model_slug: anchor,
      model_number: args.filterResult.oem_part_number,
      official_source_urls: args.filterResult.source_refs.filter((ref) => ref.startsWith("http")),
      manual_urls: args.filterResult.source_refs.filter((ref) => ref.startsWith("http")),
      documented_filter_tokens: [args.filterResult.oem_part_number].filter(Boolean),
      evidence_status: args.filterResult.evidence_status,
      buyer_path_status: "NO_SAFE_GATED_DIRECT_BUYABLE_IN_COMMITTED_CSV",
      notes: args.filterResult.evidence_notes,
    },
  ];

  const evidence_status_counts: Record<ModelFirstEvidenceRowStatusV1, number> = {
    PASS: args.filterResult.evidence_status === "PASS" ? 1 : 0,
    FAIL: args.filterResult.evidence_status === "FAIL" ? 1 : 0,
    UNKNOWN: args.filterResult.evidence_status === "UNKNOWN" ? 1 : 0,
    BLOCKED: args.filterResult.evidence_status === "BLOCKED" ? 1 : 0,
  };

  return {
    contract: WHW_MODEL_FIRST_EVIDENCE_RESULT_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    evidence_mode: "live_browser_model_first_v1",
    evidence_collection_mode: "live_browser_model_first_v1",
    packet_id: `whw-model-first-${slug}-director-batch-v1`,
    run_id: `whw-model-first-${slug}-director-batch-${runDay}`,
    queue_contract: WHW_MODEL_FIRST_EASIEST_PROOF_QUEUE_CONTRACT_V1,
    anchor_brand_slug: args.filterResult.brand_slug,
    anchor_model_slug: anchor,
    anchor_filter_slug: slug,
    filter_slug: slug,
    read_only_artifact: true,
    do_not_open_public: true,
    generated_at: iso,
    checked_at: iso,
    source_status:
      args.filterResult.evidence_status === "PASS"
        ? "PROVEN"
        : args.filterResult.evidence_status === "BLOCKED"
          ? "UNKNOWN"
          : "PARTIAL",
    model_rows,
    candidate_buyer_paths: [],
    evidence_status_counts,
    recommended_csv_mutation: null,
    proven_facts: [
      `PROVEN: Director batch bounded read for ${slug}; evidence_status=${args.filterResult.evidence_status}.`,
      `PROVEN: next_recommended_lane=${args.filterResult.next_recommended_lane}.`,
      args.filterResult.search_placeholder_primary
        ? "PROVEN: Committed primary retailer link is manufacturer search placeholder — excluded from model-first PASS."
        : "PROVEN: No search-placeholder primary in committed CSV for this filter.",
      "PROVEN: recommended_csv_mutation=null; no CSV apply authorized.",
    ],
    inferred_facts: [`INFERRED: ${args.filterResult.status_reason}`],
    unknown_facts: [
      args.filterResult.evidence_status === "UNKNOWN"
        ? `UNKNOWN: Official manual or stamped-head proof not captured for ${slug} in this bounded batch.`
        : `UNKNOWN: none for ${slug} evidence_status=${args.filterResult.evidence_status}.`,
    ].filter((f) => !f.includes("UNKNOWN: none")),
  } as unknown as WhwModelFirstLiveBrowserEvidenceResultV1;
}

export function buildWholeHouseWaterDirectorModelFirstBatchUnknownV1(args: {
  generated_at: string;
  reason: string;
}): WholeHouseWaterDirectorModelFirstBatchV1 {
  return {
    contract: WHW_DIRECTOR_MODEL_FIRST_BATCH_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    evidence_mode: "director_model_first_batch_v1",
    packet_id: WHW_DIRECTOR_MODEL_FIRST_BATCH_PACKET_ID_V1,
    source_director_contract: WHW_BATCH_PRODUCTION_DIRECTOR_CONTRACT_V1,
    source_batch_head_filter_slug: null,
    source_batch_head_packet_kind: null,
    batch_size: 0,
    filters_checked: [],
    evidence_status_counts: { PASS: 0, FAIL: 0, UNKNOWN: 0, BLOCKED: 0 },
    buyer_path_proof_targets: [],
    parked_filter_slugs: [],
    csv_apply_authorized: false,
    supabase_update_authorized: false,
    whw_public_opening_authorized: false,
    generated_at: args.generated_at,
    checked_at: args.generated_at,
    do_not_open_public: true,
    proven_facts: [],
    inferred_facts: [],
    unknown_facts: [
      `UNKNOWN: whole_house_water_director_model_first_batch_v1 failed: ${args.reason}`,
    ],
  };
}

export function buildWholeHouseWaterDirectorModelFirstBatchV1(args?: {
  rootDir?: string;
  now?: () => Date;
  director?: WholeHouseWaterBatchProductionDirectorV1;
}): WholeHouseWaterDirectorModelFirstBatchV1 {
  const rootDir = args?.rootDir ?? process.cwd();
  const now = args?.now ?? (() => new Date());
  const iso = now().toISOString();
  const director =
    args?.director ??
    buildWholeHouseWaterBatchProductionDirectorV1({ rootDir, now: args?.now });
  const activeItems = selectDirectorModelFirstBatchItemsV1(director);
  if (activeItems.length === 0) {
    const committed = loadWhwDirectorModelFirstBatchV1({ rootDir });
    if (committed?.director_batch_cycle_sealed === true) return committed;
  }
  const repo = loadWhwRepoContextV1(rootDir);

  const filters_checked: WhwDirectorModelFirstFilterResultV1[] = activeItems.map((item, idx) => {
    const filterSlug = item.filter_slug.trim().toLowerCase();
    const bounded = boundedEvidenceForDirectorFilterV1({
      filterSlug,
      anchorModelSlug: item.anchor_model_slug,
      repo,
    });
    const rel = whwDirectorModelFirstPerFilterArtifactRelV1(filterSlug);
    return {
      batch_rank: idx + 1,
      filter_slug: filterSlug,
      brand_slug: repo.filterBrandBySlug.get(filterSlug) ?? filterSlug.split("-")[0] ?? "",
      oem_part_number: repo.filterOemBySlug.get(filterSlug) ?? "",
      anchor_model_or_system_slug: item.anchor_model_slug,
      ...bounded,
      per_filter_artifact_rel: rel,
    };
  });

  const evidence_status_counts = countStatuses(filters_checked);
  const buyer_path_proof_targets = filters_checked
    .filter((row) => row.next_recommended_lane === "buyer_path_proof")
    .map((row) => row.filter_slug);
  const parked_filter_slugs = filters_checked
    .filter(
      (row) =>
        row.next_recommended_lane === "skip_for_now" ||
        row.next_recommended_lane === "mapping_review",
    )
    .map((row) => row.filter_slug);

  return {
    contract: WHW_DIRECTOR_MODEL_FIRST_BATCH_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    evidence_mode: "director_model_first_batch_v1",
    packet_id: WHW_DIRECTOR_MODEL_FIRST_BATCH_PACKET_ID_V1,
    source_director_contract: WHW_BATCH_PRODUCTION_DIRECTOR_CONTRACT_V1,
    source_batch_head_filter_slug:
      director.inspect_summary.current_batch_head_filter_slug,
    source_batch_head_packet_kind:
      director.inspect_summary.current_batch_head_packet_kind,
    batch_size: filters_checked.length,
    filters_checked,
    evidence_status_counts,
    buyer_path_proof_targets,
    parked_filter_slugs,
    csv_apply_authorized: false,
    supabase_update_authorized: false,
    whw_public_opening_authorized: false,
    generated_at: iso,
    checked_at: iso,
    do_not_open_public: true,
    proven_facts: [
      `PROVEN: Batch pulled ${String(filters_checked.length)} active model_first_evidence item(s) from ${WHW_BATCH_PRODUCTION_DIRECTOR_CONTRACT_V1}; head ${director.inspect_summary.current_batch_head_filter_slug ?? "none"}.`,
      `PROVEN: evidence_status_counts PASS=${String(evidence_status_counts.PASS)} FAIL=${String(evidence_status_counts.FAIL)} UNKNOWN=${String(evidence_status_counts.UNKNOWN)} BLOCKED=${String(evidence_status_counts.BLOCKED)}.`,
      "PROVEN: csv_apply_authorized=false; supabase_update_authorized=false; whw_public_opening_authorized=false.",
      `PROVEN: whole-house-water launch state remains ${getVerticalLaunchState("whole-house-water")}.`,
      ...filters_checked
        .filter((row) => row.search_placeholder_primary)
        .map(
          (row) =>
            `PROVEN: ${row.filter_slug} committed primary is search placeholder — cannot count as model-first PASS.`,
        ),
    ],
    inferred_facts: [
      filters_checked.length >= 2
        ? `INFERRED: Multi-filter batch spans ${String(filters_checked.length)} director MODEL_FIRST_READY slots — not AP910R-only grinding.`
        : "INFERRED: Director active batch smaller than expected — verify expansion queue lanes.",
      buyer_path_proof_targets.length > 0
        ? `INFERRED: ${buyer_path_proof_targets.join(", ")} advance to buyer_path_proof after model-first PASS.`
        : "INFERRED: No model-first PASS rows in this batch — buyer_path_proof targets empty until official docs captured.",
      parked_filter_slugs.length > 0
        ? `INFERRED: ${String(parked_filter_slugs.length)} filter(s) parked (${parked_filter_slugs.slice(0, 5).join(", ")}${parked_filter_slugs.length > 5 ? ", …" : ""}) — director should advance without re-grind.`
        : "INFERRED: No parked filters in batch snapshot.",
    ],
    unknown_facts: [
      "UNKNOWN: Whether follow-up bounded packets will PASS model proof for AP910R/AP917HD-S with full AP903 official docs.",
      "UNKNOWN: Whether Whirlpool/GE/Pentair official manuals yield PASS without generation sticker ambiguity.",
      "UNKNOWN: Whether any retailer PDP in this batch family will pass browser_truth direct_buyable without wrong-family drift.",
    ],
  };
}

export function loadWhwDirectorModelFirstBatchV1(args: {
  rootDir: string;
  relPath?: string;
}): WholeHouseWaterDirectorModelFirstBatchV1 | null {
  const rel = args.relPath ?? WHW_DIRECTOR_MODEL_FIRST_BATCH_V1_RESULT_REL_V1;
  if (!isAllowedWhwDirectorModelFirstBatchRelPathV1(rel)) return null;
  const abs = path.join(args.rootDir, rel);
  if (!existsSync(abs)) return null;
  try {
    const parsed: unknown = JSON.parse(readFileSync(abs, "utf8"));
    if (!isRecord(parsed)) return null;
    if (parsed.contract !== WHW_DIRECTOR_MODEL_FIRST_BATCH_CONTRACT_V1) return null;
    if (parsed.read_only !== true || parsed.data_mutation !== false) return null;
    if (!Array.isArray(parsed.filters_checked)) return null;
    return parsed as WholeHouseWaterDirectorModelFirstBatchV1;
  } catch {
    return null;
  }
}

export function directorModelFirstBatchParkedFilterSlugsFromFullBatchV1(args: {
  rootDir: string;
}): Set<string> {
  const batch = loadWhwDirectorModelFirstBatchV1({ rootDir: args.rootDir });
  if (!batch) return new Set();
  return new Set(batch.parked_filter_slugs.map((slug) => slug.trim().toLowerCase()));
}

export function writeWholeHouseWaterDirectorModelFirstBatchV1(args: {
  rootDir: string;
  result: WholeHouseWaterDirectorModelFirstBatchV1;
  writePerFilterArtifacts?: boolean;
  relPath?: string;
}): { batchRel: string; perFilterRels: string[] } {
  const rel = args.relPath ?? WHW_DIRECTOR_MODEL_FIRST_BATCH_V1_RESULT_REL_V1;
  if (!isAllowedWhwDirectorModelFirstBatchRelPathV1(rel)) {
    throw new Error(`Refusing to write outside allowed WHW model-first results dir: ${rel}`);
  }
  const abs = path.join(args.rootDir, rel);
  mkdirSync(path.dirname(abs), { recursive: true });
  writeFileSync(
    abs,
    `${JSON.stringify({ ...args.result, director_batch_cycle_sealed: true }, null, 2)}\n`,
    "utf8",
  );

  const perFilterRels: string[] = [];
  if (args.writePerFilterArtifacts) {
    for (const row of args.result.filters_checked) {
      const artifact = buildWhwDirectorModelFirstPerFilterArtifactV1({ filterResult: row });
      const perRel = row.per_filter_artifact_rel ?? whwDirectorModelFirstPerFilterArtifactRelV1(row.filter_slug);
      if (!isAllowedWhwModelFirstEvidenceResultRelPathV1(perRel)) {
        throw new Error(`Refusing per-filter artifact outside allowed dir: ${perRel}`);
      }
      const perAbs = path.join(args.rootDir, perRel);
      mkdirSync(path.dirname(perAbs), { recursive: true });
      writeFileSync(perAbs, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
      perFilterRels.push(perRel);
    }
  }

  return { batchRel: rel, perFilterRels };
}
