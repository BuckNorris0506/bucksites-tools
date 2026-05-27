/**
 * Read-only Air Purifier Weak Buyer Path Audit v1 — diagnose why linked filters lack
 * verified safe direct-buyable primaries in repo. No CSV mutation or gate weakening.
 */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { parse } from "csv-parse/sync";

import {
  buyLinkGateFailureKind,
  isDirectBuyableSafeCtaRow,
  isManufacturerSiteSearchUrl,
} from "@/lib/retailers/launch-buy-links";

export const AIR_PURIFIER_WEAK_BUYER_PATH_AUDIT_CONTRACT_V1 =
  "air_purifier_weak_buyer_path_audit_v1" as const;

export const AP_BATCH_V3_RESULTS_DIR_REL_V1 =
  "data/air-purifier/batch-production/agent-results-batch-v3" as const;

export type WeakAuditSourceStatusV1 = "PROVEN" | "PARTIAL" | "UNKNOWN";

export type WeakAuditConfidenceV1 = "PROVEN" | "INFERRED" | "UNKNOWN";

export type WeakBuyerPathWeaknessClassV1 =
  | "SEARCH_PLACEHOLDER_PRIMARY"
  | "OFFICIAL_REFERENCE_ONLY"
  | "COMPATIBLE_REPLACEMENT_PRESENT_BUT_NOT_PRIMARY"
  | "SECONDARY_LINK_PRESENT_BUT_PRIMARY_WEAK"
  | "NO_RETAILER_LINK_ROW"
  | "AMAZON_PRESENT_BUT_NOT_SAFE"
  | "EXACT_TOKEN_GAP"
  | "ALIAS_OR_SKU_SPLIT"
  | "DISCONTINUED_OR_UNKNOWN"
  | "UNKNOWN_REPO_SHAPE";

export type LikelyNextEvidenceLaneV1 =
  | "official_model_support_page"
  | "official_filter_pdp_search"
  | "retailer_exact_pdp_search"
  | "compatible_replacement_search"
  | "alias_sku_resolution"
  | "discontinued_replacement_resolution"
  | "owner_policy_review";

export type WeakLinkedFilterRowV1 = {
  filter_slug: string;
  brand_slug: string;
  model_count_using_filter: number;
  sample_model_slugs: string[];
  current_primary_url: string | null;
  current_primary_retailer_key: string | null;
  current_primary_classification: string | null;
  secondary_link_count: number;
  buyer_path_weakness_class: WeakBuyerPathWeaknessClassV1;
  why_not_safe_direct_buyable: string;
  likely_next_evidence_lane: LikelyNextEvidenceLaneV1;
  confidence: WeakAuditConfidenceV1;
  do_not_claim_unavailable: true;
  batch_v3_evidence_status: string | null;
  evidence_priority_score: number;
};

export type WeakFilterSummaryV1 = {
  filter_slug: string;
  brand_slug: string;
  model_count_using_filter: number;
  buyer_path_weakness_class: WeakBuyerPathWeaknessClassV1;
  likely_next_evidence_lane: LikelyNextEvidenceLaneV1;
  evidence_priority_score: number;
};

export type AirPurifierWeakBuyerPathAuditReportV1 = {
  contract: typeof AIR_PURIFIER_WEAK_BUYER_PATH_AUDIT_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  generated_at: string;
  source_status: WeakAuditSourceStatusV1;
  linked_filter_count: number;
  safe_direct_buyable_filter_count: number;
  weak_linked_filter_count: number;
  weak_model_coverage_count: number;
  weakness_class_counts: Record<string, number>;
  top_brand_weakness_counts: Record<string, number>;
  safe_direct_buyable_filters: string[];
  weak_linked_filters: WeakLinkedFilterRowV1[];
  top_10_weak_filters_by_model_coverage: WeakFilterSummaryV1[];
  top_10_weak_filters_by_evidence_priority: WeakFilterSummaryV1[];
  are_weak_filters_proven_unavailable: "UNKNOWN";
  search_placeholder_primary_count: number;
  recommended_next_evidence_lane: LikelyNextEvidenceLaneV1;
  recommended_next_action: string;
  proven_facts: string[];
  inferred_facts: string[];
  unknown_facts: string[];
};

export type BuildAirPurifierWeakBuyerPathAuditDepsV1 = {
  rootDir: string;
  now?: () => Date;
  fileExists?: (absPath: string) => boolean;
  readText?: (absPath: string) => string;
  listDir?: (absPath: string) => string[];
};

type ModelRow = { brand_slug: string; slug: string };
type CompatRow = { model_slug: string; filter_slug: string; is_recommended?: string };
type FilterRow = { brand_slug: string; slug: string; oem_part_number?: string; notes?: string };
type RetailerLinkRow = {
  filter_slug: string;
  retailer_name?: string;
  affiliate_url: string;
  is_primary?: string;
  retailer_key?: string;
  destination_url?: string;
  browser_truth_classification?: string;
  browser_truth_notes?: string;
};

type BatchV3CandidateV1 = {
  filter_slug: string;
  evidence_status?: string;
  browser_truth_classification?: string;
  exact_token_found?: boolean;
  token_evidence?: string;
  buy_button_evidence?: string;
  rejection_reason?: string;
  notes?: string;
};

function defaultFileExists(absPath: string): boolean {
  return existsSync(absPath);
}

function defaultReadText(absPath: string): string {
  return readFileSync(absPath, "utf8");
}

function defaultListDir(absPath: string): string[] {
  try {
    return readdirSync(absPath);
  } catch {
    return [];
  }
}

function readCsv<T extends Record<string, string>>(
  rootDir: string,
  relPath: string,
  readText: (p: string) => string,
  fileExists: (p: string) => boolean,
): T[] {
  const abs = path.join(rootDir, relPath);
  if (!fileExists(abs)) return [];
  return parse(readText(abs), {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
  }) as T[];
}

function isTruthyPrimary(value: string | undefined): boolean {
  const v = (value ?? "").trim().toLowerCase();
  return v === "true" || v === "1" || v === "yes";
}

function primaryLinkForSlug(links: RetailerLinkRow[], slug: string): RetailerLinkRow | null {
  const rows = links.filter((l) => l.filter_slug === slug);
  if (rows.length === 0) return null;
  return rows.find((l) => isTruthyPrimary(l.is_primary)) ?? rows[0] ?? null;
}

function secondaryLinksForSlug(links: RetailerLinkRow[], slug: string): RetailerLinkRow[] {
  const rows = links.filter((l) => l.filter_slug === slug);
  const primary = primaryLinkForSlug(links, slug);
  if (!primary) return rows;
  return rows.filter((l) => l !== primary);
}

function resolveModelFilterLinks(
  models: ModelRow[],
  compat: CompatRow[],
): Map<string, string> {
  const modelSlugs = new Set(models.map((m) => m.slug));
  const linked = new Map<string, string>();
  for (const row of compat) {
    if (!modelSlugs.has(row.model_slug)) continue;
    const existing = linked.get(row.model_slug);
    if (row.is_recommended?.trim().toLowerCase() === "true" || !existing) {
      linked.set(row.model_slug, row.filter_slug);
    }
  }
  return linked;
}

function invertModelFilterLinks(modelFilterLinks: Map<string, string>): Map<string, string[]> {
  const byFilter = new Map<string, string[]>();
  for (const [modelSlug, filterSlug] of Array.from(modelFilterLinks.entries())) {
    const list = byFilter.get(filterSlug) ?? [];
    list.push(modelSlug);
    byFilter.set(filterSlug, list);
  }
  for (const [slug, list] of Array.from(byFilter.entries())) {
    list.sort();
    byFilter.set(slug, list);
  }
  return byFilter;
}

function isSafeDirectBuyablePrimary(primary: RetailerLinkRow | null): boolean {
  if (!primary) return false;
  const dest = (primary.destination_url ?? primary.affiliate_url ?? "").trim();
  return isDirectBuyableSafeCtaRow({ ...primary, destination_url: dest });
}

function hasAmazonSecondary(secondary: RetailerLinkRow[]): boolean {
  return secondary.some((l) => {
    const key = (l.retailer_key ?? "").trim().toLowerCase();
    const url = (l.destination_url ?? l.affiliate_url ?? "").toLowerCase();
    return key === "amazon" && url.includes("amazon.com");
  });
}

function notesSuggestDiscontinued(text: string): boolean {
  const t = text.toLowerCase();
  return (
    t.includes("out of stock") ||
    t.includes("out-of-stock") ||
    t.includes("discontinued") ||
    t.includes("notify me") ||
    t.includes("where to buy")
  );
}

function filterNotesSuggestAlias(notes: string): boolean {
  const t = notes.toLowerCase();
  return (
    t.includes("alias") ||
    t.includes("also known") ||
    t.includes("aka ") ||
    t.includes("aligns with") ||
    t.includes("does not print") ||
    t.includes("mapping ambiguity")
  );
}

function loadBatchV3ByFilter(args: {
  rootDir: string;
  fileExists: (p: string) => boolean;
  readText: (p: string) => string;
  listDir: (p: string) => string[];
}): Map<string, BatchV3CandidateV1> {
  const dirAbs = path.join(args.rootDir, AP_BATCH_V3_RESULTS_DIR_REL_V1);
  const out = new Map<string, BatchV3CandidateV1>();
  if (!args.fileExists(dirAbs)) return out;

  for (const name of args.listDir(dirAbs)) {
    if (!name.endsWith(".results.json")) continue;
    try {
      const parsed = JSON.parse(args.readText(path.join(dirAbs, name))) as {
        candidate_results?: BatchV3CandidateV1[];
        rows?: Array<{ slug: string } & BatchV3CandidateV1>;
      };
      const rows = parsed.candidate_results ?? [];
      for (const row of rows) {
        if (row.filter_slug) out.set(row.filter_slug, row);
      }
      if (parsed.rows) {
        for (const row of parsed.rows) {
          const slug = (row as { slug?: string }).slug;
          if (slug) out.set(slug, { ...row, filter_slug: slug });
        }
      }
    } catch {
      // skip malformed
    }
  }
  return out;
}

function classifyWeakness(args: {
  filterSlug: string;
  primary: RetailerLinkRow | null;
  secondary: RetailerLinkRow[];
  filterRow: FilterRow | null;
  batch: BatchV3CandidateV1 | null;
}): {
  weakness_class: WeakBuyerPathWeaknessClassV1;
  why: string;
  lane: LikelyNextEvidenceLaneV1;
  confidence: WeakAuditConfidenceV1;
} {
  const { filterSlug, primary, secondary, filterRow, batch } = args;
  const allRows = primary ? [primary, ...secondary] : secondary;

  if (allRows.length === 0) {
    return {
      weakness_class: "NO_RETAILER_LINK_ROW",
      why: "No retailer_links.csv rows exist for this linked filter slug.",
      lane: "official_filter_pdp_search",
      confidence: "PROVEN",
    };
  }

  if (!primary) {
    return {
      weakness_class: "UNKNOWN_REPO_SHAPE",
      why: "Retailer link rows exist but no row is marked is_primary=true.",
      lane: "owner_policy_review",
      confidence: "PROVEN",
    };
  }

  const dest = (primary.destination_url ?? primary.affiliate_url ?? "").trim();
  const classification = (primary.browser_truth_classification ?? "").trim().toLowerCase();
  const gate = buyLinkGateFailureKind({ ...primary, destination_url: dest });
  const notesBlob = [
    primary.browser_truth_notes ?? "",
    batch?.token_evidence ?? "",
    batch?.buy_button_evidence ?? "",
    batch?.notes ?? "",
    batch?.rejection_reason ?? "",
    filterRow?.notes ?? "",
  ].join(" ");

  if (isManufacturerSiteSearchUrl(dest) || gate === "search_placeholder") {
    if (hasAmazonSecondary(secondary)) {
      return {
        weakness_class: "SEARCH_PLACEHOLDER_PRIMARY",
        why:
          "Primary OEM row is a manufacturer site search/discovery URL; secondary Amazon PDP exists but lacks direct_buyable browser truth — BuckParts is looking at search first, not promoting unverified Amazon.",
        lane: "retailer_exact_pdp_search",
        confidence: "PROVEN",
      };
    }
    return {
      weakness_class: "SEARCH_PLACEHOLDER_PRIMARY",
      why: "Primary OEM row is a manufacturer site search/discovery URL, not a verified direct_buyable PDP.",
      lane: "official_filter_pdp_search",
      confidence: "PROVEN",
    };
  }

  if (batch?.browser_truth_classification === "wrong_family" || batch?.rejection_reason?.includes("wrong-family")) {
    return {
      weakness_class: "EXACT_TOKEN_GAP",
      why: explainWhy(
        batch.rejection_reason ?? "",
        "Committed ap-batch-v3 evidence flags wrong-family or identity conflict vs catalog filter identity.",
      ),
      lane: "alias_sku_resolution",
      confidence: "PROVEN",
    };
  }

  if (
    batch?.exact_token_found === false ||
    batch?.rejection_reason?.toLowerCase().includes("exact token") ||
    batch?.token_evidence?.toLowerCase().includes("not proven in primary")
  ) {
    return {
      weakness_class: "EXACT_TOKEN_GAP",
      why: explainWhy(
        batch?.token_evidence ?? batch?.rejection_reason ?? "",
        "Committed batch evidence did not prove exact catalog token on official primary product area.",
      ),
      lane: "alias_sku_resolution",
      confidence: batch ? "PROVEN" : "INFERRED",
    };
  }

  if (
    (filterRow && filterNotesSuggestAlias(filterRow.notes ?? "")) ||
    batch?.rejection_reason?.toLowerCase().includes("mapping ambiguity") ||
    batch?.notes?.toLowerCase().includes("owner-review mapping")
  ) {
    return {
      weakness_class: "ALIAS_OR_SKU_SPLIT",
      why: explainWhy(
        batch?.notes ?? filterRow?.notes ?? "",
        "Catalog notes or batch evidence suggest alias/SKU split between storefront token and catalog slug.",
      ),
      lane: "alias_sku_resolution",
      confidence: "INFERRED",
    };
  }

  if (
    classification === "likely_valid" ||
    classification === "official_reference" ||
    batch?.browser_truth_classification === "official_reference"
  ) {
    if (notesSuggestDiscontinued(notesBlob)) {
      return {
        weakness_class: "DISCONTINUED_OR_UNKNOWN",
        why:
          "Primary or committed batch notes reference out-of-stock/notify/where-to-buy — not proven unavailable, but not direct_buyable in repo.",
        lane: "discontinued_replacement_resolution",
        confidence: "INFERRED",
      };
    }
    return {
      weakness_class: "OFFICIAL_REFERENCE_ONLY",
      why: `Primary row classification is ${classification || batch?.browser_truth_classification || "reference"} — not direct_buyable with passing buy gate.`,
      lane: "official_filter_pdp_search",
      confidence: "PROVEN",
    };
  }

  if (notesSuggestDiscontinued(notesBlob) && !isManufacturerSiteSearchUrl(dest)) {
    return {
      weakness_class: "DISCONTINUED_OR_UNKNOWN",
      why: "Repo notes suggest out-of-stock or notify-only official PDP — availability for purchase is UNKNOWN.",
      lane: "discontinued_replacement_resolution",
      confidence: "INFERRED",
    };
  }

  const compatibleSecondary = secondary.find((l) => {
    const c = (l.browser_truth_classification ?? "").trim().toLowerCase();
    return c.includes("compatible") || c === "compatible_replacement_direct_buyable";
  });
  if (compatibleSecondary && !isSafeDirectBuyablePrimary(compatibleSecondary)) {
    return {
      weakness_class: "COMPATIBLE_REPLACEMENT_PRESENT_BUT_NOT_PRIMARY",
      why: "A compatible-replacement row exists but is not primary and is not safe direct_buyable in repo.",
      lane: "compatible_replacement_search",
      confidence: "INFERRED",
    };
  }

  if (hasAmazonSecondary(secondary)) {
    return {
      weakness_class: "AMAZON_PRESENT_BUT_NOT_SAFE",
      why: "Amazon affiliate row exists but lacks direct_buyable browser truth — cannot mark safe without proof.",
      lane: "retailer_exact_pdp_search",
      confidence: "PROVEN",
    };
  }

  if (secondary.length > 0) {
    return {
      weakness_class: "SECONDARY_LINK_PRESENT_BUT_PRIMARY_WEAK",
      why: `Primary fails buy gate (${gate ?? "unknown"}); ${String(secondary.length)} secondary link(s) present but none are safe primary.`,
      lane: "official_filter_pdp_search",
      confidence: gate ? "PROVEN" : "UNKNOWN",
    };
  }

  if (gate === "missing_browser_truth" || !classification) {
    return {
      weakness_class: "UNKNOWN_REPO_SHAPE",
      why: "Primary URL is not a search placeholder but browser_truth_classification is empty — gate blocks direct_buyable.",
      lane: "official_filter_pdp_search",
      confidence: "PROVEN",
    };
  }

  return {
    weakness_class: "UNKNOWN_REPO_SHAPE",
    why: `Primary row gate failure: ${gate ?? "unclassified"}; classification=${classification || "empty"}.`,
    lane: "owner_policy_review",
    confidence: "UNKNOWN",
  };
}

function evidencePriorityScore(args: {
  modelCount: number;
  weakness_class: WeakBuyerPathWeaknessClassV1;
  batch: BatchV3CandidateV1 | null;
  hasAmazonSecondary: boolean;
}): number {
  let score = args.modelCount * 10;
  if (args.batch) score += 15;
  if (args.hasAmazonSecondary) score += 8;
  if (args.weakness_class === "SEARCH_PLACEHOLDER_PRIMARY") score += 5;
  if (args.weakness_class === "EXACT_TOKEN_GAP" || args.weakness_class === "ALIAS_OR_SKU_SPLIT") score += 4;
  if (args.weakness_class === "OFFICIAL_REFERENCE_ONLY") score += 3;
  return score;
}

function explainWhy(base: string, fallback: string): string {
  const trimmed = base.trim();
  return trimmed.length >= 20 ? trimmed : fallback;
}

function laneForBrandDominance(
  topBrand: string | undefined,
  weaknessCounts: Record<string, number>,
): LikelyNextEvidenceLaneV1 {
  const searchCount = weaknessCounts.SEARCH_PLACEHOLDER_PRIMARY ?? 0;
  const amazonLikely = searchCount > 0;
  if (topBrand === "levoit" || topBrand === "holmes" || topBrand === "winix") {
    return amazonLikely ? "official_model_support_page" : "official_filter_pdp_search";
  }
  if ((weaknessCounts.AMAZON_PRESENT_BUT_NOT_SAFE ?? 0) > 0) {
    return "retailer_exact_pdp_search";
  }
  if ((weaknessCounts.EXACT_TOKEN_GAP ?? 0) + (weaknessCounts.ALIAS_OR_SKU_SPLIT ?? 0) > 3) {
    return "alias_sku_resolution";
  }
  return "official_filter_pdp_search";
}

export function buildAirPurifierWeakBuyerPathAuditV1Report(
  deps: BuildAirPurifierWeakBuyerPathAuditDepsV1,
): AirPurifierWeakBuyerPathAuditReportV1 {
  const now = deps.now ?? (() => new Date());
  const fileExists = deps.fileExists ?? defaultFileExists;
  const readText = deps.readText ?? defaultReadText;
  const listDir = deps.listDir ?? defaultListDir;

  const models = readCsv<ModelRow>(deps.rootDir, "data/air-purifier/models.csv", readText, fileExists);
  const compat = readCsv<CompatRow>(
    deps.rootDir,
    "data/air-purifier/compatibility_mappings.csv",
    readText,
    fileExists,
  );
  const filters = readCsv<FilterRow>(deps.rootDir, "data/air-purifier/filters.csv", readText, fileExists);
  const links = readCsv<RetailerLinkRow>(
    deps.rootDir,
    "data/air-purifier/retailer_links.csv",
    readText,
    fileExists,
  );

  const filterBySlug = new Map(filters.map((f) => [f.slug, f]));
  const modelFilterLinks = resolveModelFilterLinks(models, compat);
  const modelsByFilter = invertModelFilterLinks(modelFilterLinks);
  const linkedFilterSlugs = Array.from(modelsByFilter.keys()).sort();
  const batchByFilter = loadBatchV3ByFilter({ rootDir: deps.rootDir, fileExists, readText, listDir });

  const safe_direct_buyable_filters: string[] = [];
  const weak_linked_filters: WeakLinkedFilterRowV1[] = [];
  const weakness_class_counts: Record<string, number> = {};
  const top_brand_weakness_counts: Record<string, number> = {};
  let weak_model_coverage_count = 0;

  for (const filterSlug of linkedFilterSlugs) {
    const primary = primaryLinkForSlug(links, filterSlug);
    const secondary = secondaryLinksForSlug(links, filterSlug);
    const filterRow = filterBySlug.get(filterSlug) ?? null;
    const brand_slug = filterRow?.brand_slug ?? filterSlug.split("-")[0] ?? "unknown";
    const modelSlugs = modelsByFilter.get(filterSlug) ?? [];
    const model_count = modelSlugs.length;

    if (isSafeDirectBuyablePrimary(primary)) {
      safe_direct_buyable_filters.push(filterSlug);
      continue;
    }

    weak_model_coverage_count += model_count;
    const batch = batchByFilter.get(filterSlug) ?? null;
    const classified = classifyWeakness({
      filterSlug,
      primary,
      secondary,
      filterRow,
      batch,
    });

    weakness_class_counts[classified.weakness_class] =
      (weakness_class_counts[classified.weakness_class] ?? 0) + 1;
    top_brand_weakness_counts[brand_slug] = (top_brand_weakness_counts[brand_slug] ?? 0) + 1;

    const dest = primary
      ? (primary.destination_url ?? primary.affiliate_url ?? "").trim()
      : null;

    weak_linked_filters.push({
      filter_slug: filterSlug,
      brand_slug,
      model_count_using_filter: model_count,
      sample_model_slugs: modelSlugs.slice(0, 5),
      current_primary_url: dest,
      current_primary_retailer_key: primary?.retailer_key?.trim() || null,
      current_primary_classification: primary?.browser_truth_classification?.trim() || null,
      secondary_link_count: secondary.length,
      buyer_path_weakness_class: classified.weakness_class,
      why_not_safe_direct_buyable: classified.why,
      likely_next_evidence_lane: classified.lane,
      confidence: classified.confidence,
      do_not_claim_unavailable: true,
      batch_v3_evidence_status: batch?.evidence_status ?? null,
      evidence_priority_score: evidencePriorityScore({
        modelCount: model_count,
        weakness_class: classified.weakness_class,
        batch,
        hasAmazonSecondary: hasAmazonSecondary(secondary),
      }),
    });
  }

  weak_linked_filters.sort((a, b) => b.model_count_using_filter - a.model_count_using_filter);

  const toSummary = (row: WeakLinkedFilterRowV1): WeakFilterSummaryV1 => ({
    filter_slug: row.filter_slug,
    brand_slug: row.brand_slug,
    model_count_using_filter: row.model_count_using_filter,
    buyer_path_weakness_class: row.buyer_path_weakness_class,
    likely_next_evidence_lane: row.likely_next_evidence_lane,
    evidence_priority_score: row.evidence_priority_score,
  });

  const top_10_weak_filters_by_model_coverage = weak_linked_filters
    .slice()
    .sort((a, b) => b.model_count_using_filter - a.model_count_using_filter)
    .slice(0, 10)
    .map(toSummary);

  const top_10_weak_filters_by_evidence_priority = weak_linked_filters
    .slice()
    .sort((a, b) => b.evidence_priority_score - a.evidence_priority_score)
    .slice(0, 10)
    .map(toSummary);

  const search_placeholder_primary_count =
    weakness_class_counts.SEARCH_PLACEHOLDER_PRIMARY ?? 0;

  const topBrandEntry = Object.entries(top_brand_weakness_counts).sort((a, b) => b[1] - a[1])[0];
  const recommended_next_evidence_lane = laneForBrandDominance(
    topBrandEntry?.[0],
    weakness_class_counts,
  );

  const topPriority = top_10_weak_filters_by_evidence_priority[0];
  const recommended_next_action =
    `Read-only evidence packet: ${recommended_next_evidence_lane} starting with ${topPriority?.filter_slug ?? "top weak filter"} ` +
    `(${topPriority?.brand_slug ?? "brand"}, ${String(topPriority?.model_count_using_filter ?? 0)} models). ` +
    `${String(search_placeholder_primary_count)} of ${String(weak_linked_filters.length)} weak filters use OEM search-placeholder primaries — try official PDP discovery or verified retailer proof before CSV apply. ` +
    "Do not claim filters are unavailable; weakness means repo lacks verified safe direct_buyable primary.";

  const source_status: WeakAuditSourceStatusV1 =
    linkedFilterSlugs.length > 0 &&
    fileExists(path.join(deps.rootDir, "data/air-purifier/retailer_links.csv"))
      ? batchByFilter.size > 0
        ? "PROVEN"
        : "PARTIAL"
      : "PARTIAL";

  const overSafeHints =
    (weakness_class_counts.OFFICIAL_REFERENCE_ONLY ?? 0) +
    (weakness_class_counts.EXACT_TOKEN_GAP ?? 0) +
    (weakness_class_counts.ALIAS_OR_SKU_SPLIT ?? 0);
  const poorPlaceHints = search_placeholder_primary_count + (weakness_class_counts.AMAZON_PRESENT_BUT_NOT_SAFE ?? 0);

  const proven_facts = [
    `PROVEN: ${String(linkedFilterSlugs.length)} unique linked filter slugs from compatibility_mappings.csv.`,
    `PROVEN: ${String(safe_direct_buyable_filters.length)} linked filters have safe direct_buyable primaries in retailer_links.csv.`,
    `PROVEN: ${String(weak_linked_filters.length)} linked filters are weak (no verified safe direct_buyable primary).`,
    `PROVEN: ${String(weak_model_coverage_count)} model pages map to weak linked filters.`,
    `PROVEN: ${String(search_placeholder_primary_count)} weak filters have SEARCH_PLACEHOLDER_PRIMARY (OEM site search URL as primary).`,
    "PROVEN: Weak buyer path does NOT prove purchase unavailability — only missing verified safe direct_buyable primary in repo.",
  ];

  const inferred_facts = [
    `INFERRED: ${String(poorPlaceHints)} weak filters may be low-yield while OEM search placeholders remain primary (filter-first rescue pattern).`,
    `INFERRED: ${String(overSafeHints)} weak filters show official/reference or token/alias gaps — may need owner review rather than more search rescue.`,
    `INFERRED: Top weak brand by filter count is ${topBrandEntry?.[0] ?? "UNKNOWN"} (${String(topBrandEntry?.[1] ?? 0)} weak filters).`,
    batchByFilter.size > 0
      ? `INFERRED: ${String(batchByFilter.size)} filter slugs have committed ap-batch-v3 candidate evidence in repo.`
      : "INFERRED: No ap-batch-v3 artifacts loaded — batch overlap UNKNOWN.",
  ];

  const unknown_facts = [
    "UNKNOWN: Whether weak filters are out of stock or discontinued at retailers (repo does not prove live availability).",
    "UNKNOWN: Whether promoting existing Amazon secondary rows would pass strict direct_buyable gates without new browser proof.",
    "UNKNOWN: Live production /go CTA order for multi-path slugs (not read in this audit).",
  ];

  return {
    contract: AIR_PURIFIER_WEAK_BUYER_PATH_AUDIT_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    generated_at: now().toISOString(),
    source_status,
    linked_filter_count: linkedFilterSlugs.length,
    safe_direct_buyable_filter_count: safe_direct_buyable_filters.length,
    weak_linked_filter_count: weak_linked_filters.length,
    weak_model_coverage_count,
    weakness_class_counts,
    top_brand_weakness_counts,
    safe_direct_buyable_filters: safe_direct_buyable_filters.sort(),
    weak_linked_filters,
    top_10_weak_filters_by_model_coverage,
    top_10_weak_filters_by_evidence_priority,
    are_weak_filters_proven_unavailable: "UNKNOWN",
    search_placeholder_primary_count,
    recommended_next_evidence_lane,
    recommended_next_action,
    proven_facts,
    inferred_facts,
    unknown_facts,
  };
}
