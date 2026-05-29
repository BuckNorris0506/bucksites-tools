/**
 * Read-only whole-house-water model-first easiest-proof expansion queue v1.
 * No CSV, Supabase, public UI, launch-state, or buy-gate mutation.
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { parse } from "csv-parse/sync";

import { HOMEKEEP_WEDGE_CATALOG } from "@/lib/catalog/identity";
import { getVerticalLaunchState } from "@/lib/catalog/vertical-launch-state";
import {
  buyLinkGateFailureKind,
  isDirectBuyableSafeCtaRow,
  isManufacturerSiteSearchUrl,
  isOemCatalogSlotKey,
} from "@/lib/retailers/launch-buy-links";

export const WHW_MODEL_FIRST_EASIEST_PROOF_QUEUE_CONTRACT_V1 =
  "whole_house_water_model_first_easiest_proof_queue_v1" as const;

export const WHW_MODEL_FIRST_EVIDENCE_PATH_V1 =
  "official system/model support or manual → documented OEM replacement cartridge/part number → verified safe direct_buyable buyer path (read-only browser proof; no CSV apply)" as const;

export type WhwBuyerPathStatusV1 =
  | "SAFE_GATED_DIRECT_BUYABLE"
  | "SEARCH_PLACEHOLDER_PRIMARY"
  | "NO_DIRECT_BUYABLE_CLASSIFICATION"
  | "NO_PRIMARY_LINK"
  | "KNOWN_INDIRECT_DESTINATION"
  | "WEAK_PRIMARY_UNKNOWN";

export type WhwMappingTruthStatusV1 = "RECOMMENDED_MAPPING" | "COMPAT_ONLY" | "IMPLIED_ONLY" | "UNKNOWN";

export type WhwRecommendedActionV1 =
  | "RUN_MODEL_FIRST_EVIDENCE"
  | "SKIP_FAST_NO_SAFE_PATH"
  | "MAPPING_REVIEW_REQUIRED"
  | "BUYER_PATH_REVIEW_REQUIRED"
  | "DO_NOT_USE";

export type WhwEasiestProofCandidateV1 = {
  rank: number;
  wedge: typeof HOMEKEEP_WEDGE_CATALOG.whole_house_water;
  brand_slug: string;
  model_or_system_slugs: string[];
  filter_slug: string;
  model_coverage_count: number;
  current_buyer_path_status: WhwBuyerPathStatusV1;
  current_mapping_truth_status: WhwMappingTruthStatusV1;
  easiest_proof_score: number;
  evidence_path_to_try_next: typeof WHW_MODEL_FIRST_EVIDENCE_PATH_V1;
  skip_fast_reason: string | null;
  recommended_action: WhwRecommendedActionV1;
};

export type WhwSkippedOrHardCaseV1 = {
  filter_slug: string;
  model_or_system_slugs: string[];
  skip_fast_reason: string;
  recommended_action: WhwRecommendedActionV1;
};

export type WhwRecommendedNextEvidencePacketV1 = {
  packet_id: string;
  read_only: true;
  anchor_brand_slug: string;
  anchor_model_slug: string;
  anchor_filter_slug: string;
  evidence_path: typeof WHW_MODEL_FIRST_EVIDENCE_PATH_V1;
  artifacts_not_written_yet: true;
};

export type WholeHouseWaterModelFirstEasiestProofQueueV1 = {
  contract: typeof WHW_MODEL_FIRST_EASIEST_PROOF_QUEUE_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  generated_at: string;
  source_paths: string[];
  summary: {
    model_count: number;
    filter_count: number;
    compatibility_mapping_count: number;
    recommended_mapping_pair_count: number;
    mapped_filter_slug_count: number;
    mapped_filters_with_safe_gated_direct_buyable: number;
    safe_cta_row_count: number;
  search_placeholder_primary_count: number;
  primary_buy_gate_failure_counts: Record<string, number>;
  direct_buyable_classification_row_count: number;
    why_safe_cta_count_is_zero: string;
    whole_house_water_public_launch_state: string;
  };
  top_10_easiest_candidates: WhwEasiestProofCandidateV1[];
  skipped_or_hard_cases: WhwSkippedOrHardCaseV1[];
  recommended_next_action: WhwRecommendedNextEvidencePacketV1 | null;
  proven_facts: string[];
  inferred_facts: string[];
  unknown_facts: string[];
};

type ModelRow = {
  brand_slug: string;
  slug: string;
  model_number?: string;
  series?: string;
  notes?: string;
};
type FilterRow = {
  brand_slug: string;
  slug: string;
  oem_part_number?: string;
  name?: string;
  notes?: string;
};
type MappingRow = {
  model_slug: string;
  filter_slug: string;
  is_recommended?: string;
};
type RetailerRow = {
  filter_slug: string;
  affiliate_url?: string;
  is_primary?: string;
  retailer_key?: string;
  destination_url?: string;
  browser_truth_classification?: string;
  browser_truth_buyable_subtype?: string;
};
type AliasRow = { filter_slug: string; alias: string };

const SOURCE_PATHS = [
  "data/whole-house-water/models.csv",
  "data/whole-house-water/filters.csv",
  "data/whole-house-water/compatibility_mappings.csv",
  "data/whole-house-water/retailer_links.csv",
  "data/whole-house-water/filter_aliases.csv",
  "data/whole-house-water/model_aliases.csv",
  "src/lib/retailers/launch-buy-links.ts",
  "src/lib/data/whole-house-water/filters.ts",
  "src/lib/catalog/vertical-launch-state.ts",
  "scripts/lib/public-wedge-readiness-and-easiest-wins-v1.ts",
] as const;

const OEM_SYSTEM_BRANDS = new Set(["ge", "3m", "whirlpool", "culligan", "watts", "pentair"]);

function readCsv<T extends Record<string, string>>(rootDir: string, relPath: string): T[] {
  const abs = path.join(rootDir, relPath);
  return parse(readFileSync(abs, "utf8"), {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
  }) as T[];
}

function isTruthyPrimary(value: string | undefined): boolean {
  const v = (value ?? "").trim().toLowerCase();
  return v === "true" || v === "1" || v === "yes";
}

function isRecommended(value: string | undefined): boolean {
  return isTruthyPrimary(value);
}

function primaryLink(rows: RetailerRow[]): RetailerRow | null {
  if (rows.length === 0) return null;
  return rows.find((r) => isTruthyPrimary(r.is_primary)) ?? rows[0] ?? null;
}

function toBuyLinkRow(row: RetailerRow): {
  retailer_key?: string | null;
  affiliate_url: string;
  browser_truth_classification?: string | null;
  browser_truth_buyable_subtype?: string | null;
} {
  return {
    retailer_key: row.retailer_key ?? null,
    affiliate_url: (row.affiliate_url ?? "").trim(),
    browser_truth_classification: row.browser_truth_classification ?? null,
    browser_truth_buyable_subtype: row.browser_truth_buyable_subtype ?? null,
  };
}

function buyerPathStatusForPrimary(primary: RetailerRow | null): WhwBuyerPathStatusV1 {
  if (!primary) return "NO_PRIMARY_LINK";
  const link = toBuyLinkRow(primary);
  if (isDirectBuyableSafeCtaRow(link)) return "SAFE_GATED_DIRECT_BUYABLE";
  const url = (primary.destination_url ?? primary.affiliate_url ?? "").trim();
  if (
    buyLinkGateFailureKind(link) === "indirect_discovery" ||
    url.includes("kinetico.com/en-us/for-home/water-filtration")
  ) {
    return "KNOWN_INDIRECT_DESTINATION";
  }
  if (
    buyLinkGateFailureKind(link) === "search_placeholder" ||
    isManufacturerSiteSearchUrl(url) ||
    (buyLinkGateFailureKind(link) === "missing_browser_truth" &&
      isOemCatalogSlotKey(link.retailer_key))
  ) {
    return "SEARCH_PLACEHOLDER_PRIMARY";
  }
  if ((primary.browser_truth_classification ?? "").trim() !== "direct_buyable") {
    return "NO_DIRECT_BUYABLE_CLASSIFICATION";
  }
  return "WEAK_PRIMARY_UNKNOWN";
}

function notesSuggestReplacementAmbiguity(notes: string): boolean {
  const n = notes.toLowerCase();
  return (
    n.includes("generation may vary") ||
    n.includes("verify sticker") ||
    n.includes("dealer") ||
    n.includes("confirm your installed") ||
    n.includes("may vary")
  );
}

function notesSuggestGenericCartridgeSize(notes: string): boolean {
  const n = notes.toLowerCase();
  return (
    n.includes("fits standard bb10") ||
    n.includes("fits standard bb20") ||
    n.includes("9.75 x 2.5") ||
    n.includes("10 x 4.5 in.") ||
    n.includes("compatible bb") ||
    n.includes("cross-compatible")
  );
}

function modelNotesSuggestHousingOnly(notes: string): boolean {
  const n = notes.toLowerCase();
  return n.includes("housing for") || n.includes("sump") || n.includes("confirm port");
}

type CandidateDraft = Omit<WhwEasiestProofCandidateV1, "rank">;

function scoreCandidate(args: {
  filter: FilterRow;
  models: ModelRow[];
  mappingTruth: WhwMappingTruthStatusV1;
  buyerPath: WhwBuyerPathStatusV1;
  aliasCollisionCount: number;
}): { score: number; skip_fast_reason: string | null; recommended_action: WhwRecommendedActionV1 } {
  const { filter, models, mappingTruth, buyerPath, aliasCollisionCount } = args;
  const filterNotes = filter.notes ?? "";
  const modelNotes = models.map((m) => m.notes ?? "").join(" ");

  let score = 0;
  let skip_fast_reason: string | null = null;
  let recommended_action: WhwRecommendedActionV1 = "RUN_MODEL_FIRST_EVIDENCE";

  const coverageCap = Math.min(models.length * 4, 16);
  score += coverageCap;

  if (mappingTruth === "RECOMMENDED_MAPPING") score += 22;
  else if (mappingTruth === "COMPAT_ONLY") {
    score -= 18;
    recommended_action = "MAPPING_REVIEW_REQUIRED";
  }

  if (OEM_SYSTEM_BRANDS.has(filter.brand_slug)) score += 14;
  else if (filter.brand_slug === "pentek" || filter.brand_slug === "pentair") score += 8;

  const oemToken = (filter.oem_part_number ?? "").trim();
  if (oemToken.length >= 3) score += 10;

  const hasExactSeriesModel = models.some((m) => (m.model_number ?? "").trim().length >= 4);
  if (hasExactSeriesModel) score += 8;

  if (models.some((m) => modelNotesSuggestHousingOnly(m.notes ?? "")) && notesSuggestGenericCartridgeSize(filterNotes)) {
    score -= 28;
    skip_fast_reason =
      "Generic BB/slim cartridge size mapping from housing-only models — prove system sticker and OEM cartridge token before buyer-path work.";
    if (recommended_action === "RUN_MODEL_FIRST_EVIDENCE") {
      recommended_action = "MAPPING_REVIEW_REQUIRED";
    }
  }

  if (notesSuggestReplacementAmbiguity(filterNotes) || notesSuggestReplacementAmbiguity(modelNotes)) {
    score -= 24;
    skip_fast_reason =
      skip_fast_reason ??
      "Replacement-chain or generation ambiguity in committed notes — official model sticker evidence required before buyer path.";
  }

  if (filter.brand_slug === "kinetico" || buyerPath === "KNOWN_INDIRECT_DESTINATION") {
    score -= 60;
    skip_fast_reason = "Dealer-network / non-checkout official destination — not a direct buyer-path proof lane.";
    recommended_action = "DO_NOT_USE";
  }

  if (aliasCollisionCount > 0) {
    score -= aliasCollisionCount * 6;
  }

  if (buyerPath === "SEARCH_PLACEHOLDER_PRIMARY") {
    score -= 12;
    recommended_action = "RUN_MODEL_FIRST_EVIDENCE";
  } else if (buyerPath === "SAFE_GATED_DIRECT_BUYABLE") {
    score += 40;
    recommended_action = "BUYER_PATH_REVIEW_REQUIRED";
  } else if (buyerPath === "NO_PRIMARY_LINK") {
    score -= 20;
    recommended_action = "SKIP_FAST_NO_SAFE_PATH";
    skip_fast_reason = skip_fast_reason ?? "No primary retailer link row in committed CSV.";
  }

  if (buyerPath !== "SAFE_GATED_DIRECT_BUYABLE" && models.length >= 6 && notesSuggestGenericCartridgeSize(filterNotes)) {
    skip_fast_reason =
      skip_fast_reason ??
      "High model fan-out with generic cartridge sizing — skip filter-first rescue; anchor on one housing/system model.";
    recommended_action = "SKIP_FAST_NO_SAFE_PATH";
    score -= 15;
  }

  return { score, skip_fast_reason, recommended_action };
}

function buildAliasCollisionCount(aliases: AliasRow[]): Map<string, number> {
  const aliasToFilters = new Map<string, Set<string>>();
  for (const row of aliases) {
    const alias = row.alias.trim().toUpperCase();
    const slug = row.filter_slug.trim().toLowerCase();
    if (!alias || !slug) continue;
    if (!aliasToFilters.has(alias)) aliasToFilters.set(alias, new Set());
    aliasToFilters.get(alias)!.add(slug);
  }
  const collisions = new Map<string, number>();
  for (const row of aliases) {
    const slug = row.filter_slug.trim().toLowerCase();
    const alias = row.alias.trim().toUpperCase();
    const count = aliasToFilters.get(alias)?.size ?? 1;
    if (count > 1) {
      collisions.set(slug, Math.max(collisions.get(slug) ?? 0, count - 1));
    }
  }
  return collisions;
}

export function buildWholeHouseWaterModelFirstEasiestProofQueueV1(args: {
  rootDir: string;
  now?: () => Date;
}): WholeHouseWaterModelFirstEasiestProofQueueV1 {
  const now = args.now ?? (() => new Date());
  const models = readCsv<ModelRow>(args.rootDir, "data/whole-house-water/models.csv");
  const filters = readCsv<FilterRow>(args.rootDir, "data/whole-house-water/filters.csv");
  const mappings = readCsv<MappingRow>(args.rootDir, "data/whole-house-water/compatibility_mappings.csv");
  const links = readCsv<RetailerRow>(args.rootDir, "data/whole-house-water/retailer_links.csv");
  const filterAliases = readCsv<AliasRow>(args.rootDir, "data/whole-house-water/filter_aliases.csv");

  const modelBySlug = new Map(models.map((m) => [m.slug.trim().toLowerCase(), m] as const));
  const filterBySlug = new Map(filters.map((f) => [f.slug.trim().toLowerCase(), f] as const));
  const aliasCollisions = buildAliasCollisionCount(filterAliases);

  const linksByFilter = new Map<string, RetailerRow[]>();
  for (const row of links) {
    const slug = row.filter_slug.trim().toLowerCase();
    if (!linksByFilter.has(slug)) linksByFilter.set(slug, []);
    linksByFilter.get(slug)!.push(row);
  }

  let safeCtaRowCount = 0;
  let searchPlaceholderPrimaryCount = 0;
  let directBuyableClassificationRowCount = 0;
  const primaryBuyGateFailureCounts: Record<string, number> = {};
  const mappedFilterSlugs = new Set<string>();
  let recommendedPairCount = 0;

  const recommendedModelsByFilter = new Map<string, Set<string>>();
  const compatOnlyModelsByFilter = new Map<string, Set<string>>();

  for (const row of mappings) {
    const modelSlug = row.model_slug.trim().toLowerCase();
    const filterSlug = row.filter_slug.trim().toLowerCase();
    if (!modelSlug || !filterSlug) continue;
    mappedFilterSlugs.add(filterSlug);
    if (isRecommended(row.is_recommended)) {
      recommendedPairCount += 1;
      if (!recommendedModelsByFilter.has(filterSlug)) recommendedModelsByFilter.set(filterSlug, new Set());
      recommendedModelsByFilter.get(filterSlug)!.add(modelSlug);
    } else {
      if (!compatOnlyModelsByFilter.has(filterSlug)) compatOnlyModelsByFilter.set(filterSlug, new Set());
      compatOnlyModelsByFilter.get(filterSlug)!.add(modelSlug);
    }
  }

  let mappedFiltersWithSafeGated = 0;
  for (const filterSlug of Array.from(mappedFilterSlugs)) {
    const rows = linksByFilter.get(filterSlug) ?? [];
    const buyRows = rows.map(toBuyLinkRow);
    const primary = primaryLink(rows);
    const primaryStatus = buyerPathStatusForPrimary(primary);
    if (primaryStatus === "SEARCH_PLACEHOLDER_PRIMARY") searchPlaceholderPrimaryCount += 1;
    if (primaryStatus === "SAFE_GATED_DIRECT_BUYABLE") mappedFiltersWithSafeGated += 1;
    if (primary) {
      const gate = buyLinkGateFailureKind(toBuyLinkRow(primary)) ?? "pass";
      primaryBuyGateFailureCounts[gate] = (primaryBuyGateFailureCounts[gate] ?? 0) + 1;
    } else {
      primaryBuyGateFailureCounts.no_primary = (primaryBuyGateFailureCounts.no_primary ?? 0) + 1;
    }

    for (const link of buyRows) {
      if (link.browser_truth_classification?.trim() === "direct_buyable") {
        directBuyableClassificationRowCount += 1;
      }
      if (isDirectBuyableSafeCtaRow(link)) safeCtaRowCount += 1;
    }
  }

  const drafts: CandidateDraft[] = [];

  for (const [filterSlug, modelSlugs] of Array.from(recommendedModelsByFilter.entries())) {
    const filter = filterBySlug.get(filterSlug);
    if (!filter) continue;
    const modelRows = Array.from(modelSlugs)
      .map((s) => modelBySlug.get(s))
      .filter((m): m is ModelRow => !!m);
    const mappingTruth: WhwMappingTruthStatusV1 = "RECOMMENDED_MAPPING";
    const primary = primaryLink(linksByFilter.get(filterSlug) ?? []);
    const buyerPath = buyerPathStatusForPrimary(primary);
    const { score, skip_fast_reason, recommended_action } = scoreCandidate({
      filter,
      models: modelRows,
      mappingTruth,
      buyerPath,
      aliasCollisionCount: aliasCollisions.get(filterSlug) ?? 0,
    });

    drafts.push({
      wedge: HOMEKEEP_WEDGE_CATALOG.whole_house_water,
      brand_slug: filter.brand_slug,
      model_or_system_slugs: Array.from(modelSlugs).sort(),
      filter_slug: filterSlug,
      model_coverage_count: modelSlugs.size,
      current_buyer_path_status: buyerPath,
      current_mapping_truth_status: mappingTruth,
      easiest_proof_score: score,
      evidence_path_to_try_next: WHW_MODEL_FIRST_EVIDENCE_PATH_V1,
      skip_fast_reason,
      recommended_action,
    });
  }

  for (const [filterSlug, modelSlugs] of Array.from(compatOnlyModelsByFilter.entries())) {
    if (recommendedModelsByFilter.has(filterSlug)) continue;
    const filter = filterBySlug.get(filterSlug);
    if (!filter) continue;
    const modelRows = Array.from(modelSlugs)
      .map((s) => modelBySlug.get(s))
      .filter((m): m is ModelRow => !!m);
    const primary = primaryLink(linksByFilter.get(filterSlug) ?? []);
    const buyerPath = buyerPathStatusForPrimary(primary);
    const { score, skip_fast_reason, recommended_action } = scoreCandidate({
      filter,
      models: modelRows,
      mappingTruth: "COMPAT_ONLY",
      buyerPath,
      aliasCollisionCount: aliasCollisions.get(filterSlug) ?? 0,
    });
    drafts.push({
      wedge: HOMEKEEP_WEDGE_CATALOG.whole_house_water,
      brand_slug: filter.brand_slug,
      model_or_system_slugs: Array.from(modelSlugs).sort().slice(0, 5),
      filter_slug: filterSlug,
      model_coverage_count: modelSlugs.size,
      current_buyer_path_status: buyerPath,
      current_mapping_truth_status: "COMPAT_ONLY",
      easiest_proof_score: score,
      evidence_path_to_try_next: WHW_MODEL_FIRST_EVIDENCE_PATH_V1,
      skip_fast_reason,
      recommended_action,
    });
  }

  const activeCandidates = drafts
    .filter((d) => d.recommended_action !== "DO_NOT_USE")
    .sort((a, b) => {
      if (b.easiest_proof_score !== a.easiest_proof_score) {
        return b.easiest_proof_score - a.easiest_proof_score;
      }
      if (b.model_coverage_count !== a.model_coverage_count) {
        return b.model_coverage_count - a.model_coverage_count;
      }
      return a.filter_slug.localeCompare(b.filter_slug);
    });

  const top_10_easiest_candidates: WhwEasiestProofCandidateV1[] = activeCandidates
    .slice(0, 10)
    .map((row, idx) => ({ rank: idx + 1, ...row }));

  const skipped_or_hard_cases: WhwSkippedOrHardCaseV1[] = drafts
    .filter(
      (d) =>
        d.recommended_action === "DO_NOT_USE" ||
        d.recommended_action === "SKIP_FAST_NO_SAFE_PATH" ||
        d.skip_fast_reason !== null,
    )
    .sort((a, b) => a.filter_slug.localeCompare(b.filter_slug))
    .slice(0, 15)
    .map((d) => ({
      filter_slug: d.filter_slug,
      model_or_system_slugs: d.model_or_system_slugs.slice(0, 3),
      skip_fast_reason: d.skip_fast_reason ?? `${d.recommended_action}: ${d.current_buyer_path_status}`,
      recommended_action: d.recommended_action,
    }));

  const topActionable = activeCandidates.find((c) => c.recommended_action === "RUN_MODEL_FIRST_EVIDENCE") ?? null;
  const anchorModel = topActionable?.model_or_system_slugs[0] ?? null;
  const recommended_next_action: WhwRecommendedNextEvidencePacketV1 | null =
    topActionable && anchorModel
      ? {
          packet_id: "whw-model-first-evidence-proposed-v1",
          read_only: true,
          anchor_brand_slug: topActionable.brand_slug,
          anchor_model_slug: anchorModel,
          anchor_filter_slug: topActionable.filter_slug,
          evidence_path: WHW_MODEL_FIRST_EVIDENCE_PATH_V1,
          artifacts_not_written_yet: true,
        }
      : null;

  const launchState = getVerticalLaunchState("whole-house-water");

  const whyZero =
    mappedFiltersWithSafeGated === 0
      ? `PROVEN: committed data/whole-house-water/retailer_links.csv has 0 rows with browser_truth_classification=direct_buyable; mapped filter primaries fail launch-buy-links (${Object.entries(
          primaryBuyGateFailureCounts,
        )
          .map(([k, v]) => `${k}=${v}`)
          .join(", ")}) — filterRealBuyRetailerLinks returns empty for all filters.`
      : "UNKNOWN: safe CTA count > 0 — inspect buyer-path diagnostics.";

  return {
    contract: WHW_MODEL_FIRST_EASIEST_PROOF_QUEUE_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    generated_at: now().toISOString(),
    source_paths: [...SOURCE_PATHS],
    summary: {
      model_count: models.length,
      filter_count: filters.length,
      compatibility_mapping_count: mappings.length,
      recommended_mapping_pair_count: recommendedPairCount,
      mapped_filter_slug_count: mappedFilterSlugs.size,
      mapped_filters_with_safe_gated_direct_buyable: mappedFiltersWithSafeGated,
      safe_cta_row_count: safeCtaRowCount,
      search_placeholder_primary_count: searchPlaceholderPrimaryCount,
      primary_buy_gate_failure_counts: primaryBuyGateFailureCounts,
      direct_buyable_classification_row_count: directBuyableClassificationRowCount,
      why_safe_cta_count_is_zero: whyZero,
      whole_house_water_public_launch_state: launchState,
    },
    top_10_easiest_candidates,
    skipped_or_hard_cases,
    recommended_next_action,
    proven_facts: [
      `PROVEN: ${models.length} whole-house-water models in committed data/whole-house-water/models.csv.`,
      `PROVEN: ${filters.length} filter/cartridge slugs in committed data/whole-house-water/filters.csv.`,
      `PROVEN: ${mappings.length} model→filter compatibility rows; ${recommendedPairCount} is_recommended=true pairs.`,
      `PROVEN: ${mappedFilterSlugs.size} mapped filter slugs; ${mappedFiltersWithSafeGated} with safe gated direct_buyable primary.`,
      `PROVEN: safe_cta_row_count=${safeCtaRowCount}; search_placeholder_primary_count=${searchPlaceholderPrimaryCount}.`,
      `PROVEN: whole-house-water launch state is ${launchState} (not publicly opened).`,
      `PROVEN: Queue ranks ${top_10_easiest_candidates.length} actionable candidates; top filter ${top_10_easiest_candidates[0]?.filter_slug ?? "none"}.`,
    ],
    inferred_facts: [
      "INFERRED: OEM system families (GE FX, 3M AP810/AP811, Whirlpool WHKF) are easier model-first proof targets than generic Pentek BB cartridge rows despite lower model fan-out.",
      "INFERRED: Pentek BB10 housing → cartridge mappings are browse inventory until a specific system sticker and OEM token are proven on one anchor model.",
      topActionable
        ? `INFERRED: Next bounded packet should anchor model ${anchorModel} → filter ${topActionable.filter_slug} before any CSV or public launch change.`
        : "INFERRED: No RUN_MODEL_FIRST_EVIDENCE candidate surfaced — review skipped/hard cases first.",
    ],
    unknown_facts: [
      "UNKNOWN: Whether official GE/3M/Whirlpool parts PDPs will pass direct_buyable browser truth on first attempt.",
      "UNKNOWN: Supabase-only buyer-path rows (if any) are excluded — this queue uses committed CSV only.",
    ],
  };
}
