/**
 * Read-only Air Purifier Model-First Production Lane v1 — appliance/unit model discovery
 * before filter-SKU buyer-path rescue. No CSV, Supabase, or batch mutation.
 */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { parse } from "csv-parse/sync";

import {
  buyLinkGateFailureKind,
  isDirectBuyableSafeCtaRow,
  isManufacturerSiteSearchUrl,
} from "@/lib/retailers/launch-buy-links";

export const AIR_PURIFIER_MODEL_FIRST_PRODUCTION_LANE_REPORT_NAME_V1 =
  "air_purifier_model_first_production_lane_v1" as const;

export const AP_BATCH_V3_RESULTS_DIR_REL_V1 =
  "data/air-purifier/batch-production/agent-results-batch-v3" as const;

export type ModelFirstLaneSourceStatusV1 = "PROVEN" | "PARTIAL" | "UNKNOWN";

export type ModelFirstConfidenceV1 = "PROVEN" | "INFERRED" | "UNKNOWN";

export type ModelFirstLinkedFilterStatusV1 = "LINKED" | "NO_LINK";

export type ModelFirstBuyerPathStatusV1 =
  | "SAFE_DIRECT_BUYABLE"
  | "OFFICIAL_REFERENCE"
  | "SEARCH_PLACEHOLDER"
  | "BLOCKED"
  | "UNKNOWN"
  | "NO_LINK";

export type ModelFirstFilterFirstVerdictV1 = "PROMISING" | "UNKNOWN" | "NOT_PROVEN";

export type ModelFirstCandidateRowV1 = {
  model_slug: string;
  brand_slug: string;
  model_number: string | null;
  model_title: string | null;
  linked_filter_slug: string | null;
  linked_filter_status: ModelFirstLinkedFilterStatusV1;
  buyer_path_status: ModelFirstBuyerPathStatusV1;
  evidence_gap: string;
  why_model_first: string;
  recommended_evidence_source_type: string;
  recommended_next_action: string;
  confidence: ModelFirstConfidenceV1;
};

export type ModelFirstBrandSummaryV1 = {
  brand_slug: string;
  model_count: number;
  model_with_safe_buyer_path_count: number;
  model_search_placeholder_primary_count: number;
  model_blocked_or_unknown_buyer_path_count: number;
  model_first_opportunity_score: number;
};

export type ModelFirstFilterFirstBatchV3ComparisonV1 = {
  results_dir: string;
  filter_first_candidates_checked: number;
  safe_csv_mutations: number;
  evidence_status_counts: Record<string, number>;
  dominant_packet_patterns: string[];
  filter_first_safe_mutation_rate: number;
  oem_search_placeholder_rescue_share: number;
  model_first_verdict: ModelFirstFilterFirstVerdictV1;
  verdict_rationale: string;
  batch_v3_filter_slugs: string[];
};

export type AirPurifierModelFirstProductionLaneReportV1 = {
  contract: typeof AIR_PURIFIER_MODEL_FIRST_PRODUCTION_LANE_REPORT_NAME_V1;
  read_only: true;
  data_mutation: false;
  generated_at: string;
  source_status: ModelFirstLaneSourceStatusV1;
  model_count: number;
  model_with_filter_count: number;
  model_without_filter_count: number;
  linked_filter_count: number;
  linked_filter_safe_cta_count: number;
  linked_filter_blocked_or_unknown_count: number;
  model_first_candidate_count: number;
  candidate_rows: ModelFirstCandidateRowV1[];
  brand_summary: ModelFirstBrandSummaryV1[];
  comparison_to_filter_first_batch_v3: ModelFirstFilterFirstBatchV3ComparisonV1;
  recommended_next_action: string;
  proven_facts: string[];
  unknown_facts: string[];
};

export type BuildAirPurifierModelFirstProductionLaneDepsV1 = {
  rootDir: string;
  now?: () => Date;
  fileExists?: (absPath: string) => boolean;
  readText?: (absPath: string) => string;
  listDir?: (absPath: string) => string[];
};

type ModelRow = {
  brand_slug: string;
  slug: string;
  model_number?: string;
  title?: string;
  series?: string;
  notes?: string;
};

type CompatRow = {
  model_slug: string;
  filter_slug: string;
  is_recommended?: string;
};

type RetailerLinkRow = {
  filter_slug: string;
  retailer_name?: string;
  affiliate_url: string;
  is_primary?: string;
  retailer_key?: string;
  destination_url?: string;
  browser_truth_classification?: string;
};

type BatchV3ResultFileV1 = {
  packet_id?: string;
  candidate_results?: Array<{
    filter_slug: string;
    evidence_status?: string;
    recommended_csv_mutation?: unknown | null;
    browser_truth_classification?: string;
  }>;
  rows?: Array<{
    slug: string;
    recommended_csv_mutation?: unknown | null;
    evidence_status?: string;
  }>;
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

function classifyBuyerPathStatus(
  filterSlug: string | null,
  links: RetailerLinkRow[],
): ModelFirstBuyerPathStatusV1 {
  if (!filterSlug) return "NO_LINK";
  const primary = primaryLinkForSlug(links, filterSlug);
  if (!primary) return "UNKNOWN";
  const dest = (primary.destination_url ?? primary.affiliate_url ?? "").trim();
  const rowForGate = { ...primary, destination_url: dest };
  if (isDirectBuyableSafeCtaRow(rowForGate)) return "SAFE_DIRECT_BUYABLE";
  if (isManufacturerSiteSearchUrl(dest)) return "SEARCH_PLACEHOLDER";
  const gate = buyLinkGateFailureKind(rowForGate);
  if (gate) return "BLOCKED";
  const classification = (primary.browser_truth_classification ?? "").trim().toLowerCase();
  if (classification === "likely_valid" || classification === "official_reference") {
    return "OFFICIAL_REFERENCE";
  }
  return "UNKNOWN";
}

function buyerPathConfidence(status: ModelFirstBuyerPathStatusV1): ModelFirstConfidenceV1 {
  if (status === "SAFE_DIRECT_BUYABLE") return "PROVEN";
  if (status === "SEARCH_PLACEHOLDER" || status === "BLOCKED") return "PROVEN";
  if (status === "OFFICIAL_REFERENCE") return "INFERRED";
  return "UNKNOWN";
}

function evidenceGapForStatus(
  status: ModelFirstBuyerPathStatusV1,
  filterSlug: string | null,
): string {
  switch (status) {
    case "NO_LINK":
      return "No compatibility_mapping links this model to a filter slug in repo.";
    case "SAFE_DIRECT_BUYABLE":
      return "Linked filter primary row is direct_buyable with null buy gate — no model-first rescue required for buy path.";
    case "SEARCH_PLACEHOLDER":
      return `Linked filter ${filterSlug ?? "UNKNOWN"} primary OEM row is still a manufacturer site search URL — filter-first rescue may be low-yield.`;
    case "BLOCKED":
      return `Linked filter ${filterSlug ?? "UNKNOWN"} primary row fails buy/go gate checks in repo CSV.`;
    case "OFFICIAL_REFERENCE":
      return `Linked filter ${filterSlug ?? "UNKNOWN"} has reference-only official PDP — not direct_buyable.`;
    default:
      return "Buyer path status could not be classified from committed retailer_links.csv fields.";
  }
}

function whyModelFirstForRow(args: {
  model: ModelRow;
  filterSlug: string | null;
  buyerPathStatus: ModelFirstBuyerPathStatusV1;
}): string {
  if (args.buyerPathStatus === "SAFE_DIRECT_BUYABLE") {
    return "Model already maps to a filter with safe direct_buyable primary — model-first is for discovery/validation, not urgent rescue.";
  }
  if (args.buyerPathStatus === "SEARCH_PLACEHOLDER") {
    return "Homeowners search by owned unit model; official model/support pages may name the correct replacement filter before OEM search-placeholder URLs.";
  }
  if (args.buyerPathStatus === "BLOCKED" || args.buyerPathStatus === "UNKNOWN") {
    return "Model→filter link exists but buyer path is not safe — collect official manual/support evidence from the appliance model first.";
  }
  if (!args.filterSlug) {
    return "Model has no linked filter in compatibility_mappings — discover replacement filter identity from official model documentation.";
  }
  return "Model-first evidence may clarify filter fit before any CSV mutation.";
}

function recommendedEvidenceSource(model: ModelRow, status: ModelFirstBuyerPathStatusV1): string {
  if (status === "SEARCH_PLACEHOLDER" || status === "BLOCKED" || status === "UNKNOWN") {
    return "official_support_manual_or_model_page";
  }
  if (!model.series && !model.notes) return "manufacturer_model_page";
  return "oem_parts_lookup_from_model_family";
}

function recommendedNextActionForRow(status: ModelFirstBuyerPathStatusV1): string {
  if (status === "SAFE_DIRECT_BUYABLE") {
    return "No model-first packet required — monitor only.";
  }
  return "Collect read-only browser evidence: model page → documented filter SKU/part → official PDP (no CSV apply).";
}

function loadBatchV3Comparison(args: {
  rootDir: string;
  fileExists: (p: string) => boolean;
  readText: (p: string) => string;
  listDir: (p: string) => string[];
}): ModelFirstFilterFirstBatchV3ComparisonV1 {
  const dirRel = AP_BATCH_V3_RESULTS_DIR_REL_V1;
  const dirAbs = path.join(args.rootDir, dirRel);
  const empty: ModelFirstFilterFirstBatchV3ComparisonV1 = {
    results_dir: dirRel,
    filter_first_candidates_checked: 0,
    safe_csv_mutations: 0,
    evidence_status_counts: {},
    dominant_packet_patterns: [],
    filter_first_safe_mutation_rate: 0,
    oem_search_placeholder_rescue_share: 0,
    model_first_verdict: "UNKNOWN",
    verdict_rationale: "No committed ap-batch-v3 result artifacts found in repo.",
    batch_v3_filter_slugs: [],
  };

  if (!args.fileExists(dirAbs)) return empty;

  const evidence_status_counts: Record<string, number> = {};
  const packetPatterns = new Map<string, number>();
  const batch_v3_filter_slugs: string[] = [];
  let safe_csv_mutations = 0;
  let filter_first_candidates_checked = 0;
  let searchPlaceholderCatalogHits = 0;

  const links = readCsv<RetailerLinkRow>(
    args.rootDir,
    "data/air-purifier/retailer_links.csv",
    args.readText,
    args.fileExists,
  );

  for (const name of args.listDir(dirAbs)) {
    if (!name.endsWith(".results.json")) continue;
    const rel = `${dirRel}/${name}`;
    const parsed = JSON.parse(args.readText(path.join(args.rootDir, rel))) as BatchV3ResultFileV1;
    const packetId = parsed.packet_id ?? name.replace(/\.results\.json$/, "");
    if (packetId.includes("search-placeholder")) {
      packetPatterns.set("oem_search_placeholder_rescue", (packetPatterns.get("oem_search_placeholder_rescue") ?? 0) + 1);
    } else if (packetId.includes("oem-discovery")) {
      packetPatterns.set("oem_discovery", (packetPatterns.get("oem_discovery") ?? 0) + 1);
    } else if (packetId.includes("catalog-identity")) {
      packetPatterns.set("catalog_identity", (packetPatterns.get("catalog_identity") ?? 0) + 1);
    }

    const rows = parsed.candidate_results ?? parsed.rows ?? [];
    for (const row of rows) {
      const slug = "filter_slug" in row ? row.filter_slug : (row as { slug: string }).slug;
      filter_first_candidates_checked += 1;
      batch_v3_filter_slugs.push(slug);
      const status = String(row.evidence_status ?? "UNKNOWN").toUpperCase();
      evidence_status_counts[status] = (evidence_status_counts[status] ?? 0) + 1;
      const mutation = row.recommended_csv_mutation;
      if (mutation != null && typeof mutation === "object") {
        safe_csv_mutations += 1;
      }
      const primary = primaryLinkForSlug(links, slug);
      const dest = (primary?.destination_url ?? primary?.affiliate_url ?? "").trim();
      if (isManufacturerSiteSearchUrl(dest)) searchPlaceholderCatalogHits += 1;
    }
  }

  const dominant_packet_patterns = Array.from(packetPatterns.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([pattern]) => pattern);

  const filter_first_safe_mutation_rate =
    filter_first_candidates_checked > 0 ? safe_csv_mutations / filter_first_candidates_checked : 0;

  const oem_search_placeholder_rescue_share =
    filter_first_candidates_checked > 0
      ? searchPlaceholderCatalogHits / filter_first_candidates_checked
      : 0;

  let model_first_verdict: ModelFirstFilterFirstVerdictV1 = "UNKNOWN";
  let verdict_rationale =
    "Insufficient repo evidence to compare model-first vs filter-first batch-v3.";

  if (filter_first_candidates_checked > 0) {
    if (safe_csv_mutations === 0 && oem_search_placeholder_rescue_share >= 0.5) {
      model_first_verdict = "PROMISING";
      verdict_rationale =
        `INFERRED: ap-batch-v3 filter-first checked ${String(filter_first_candidates_checked)} candidates with 0 safe CSV mutations; ` +
        `${String(Math.round(oem_search_placeholder_rescue_share * 100))}% of those slugs still had OEM search-placeholder primaries in retailer_links.csv. ` +
        "Repo structure (287 models→linked filters, many search placeholders) supports trying model-first evidence before filter-SKU rescue — not yet proven by a model-first packet run.";
    } else if (safe_csv_mutations > 0) {
      model_first_verdict = "NOT_PROVEN";
      verdict_rationale =
        "Filter-first batch-v3 produced safe CSV mutation recommendations — model-first advantage is NOT_PROVEN from repo artifacts.";
    } else {
      model_first_verdict = "UNKNOWN";
      verdict_rationale =
        "Filter-first batch-v3 found no safe mutations, but OEM search-placeholder dominance is below threshold — model-first advantage remains UNKNOWN.";
    }
  }

  return {
    results_dir: dirRel,
    filter_first_candidates_checked,
    safe_csv_mutations,
    evidence_status_counts,
    dominant_packet_patterns,
    filter_first_safe_mutation_rate,
    oem_search_placeholder_rescue_share,
    model_first_verdict,
    verdict_rationale,
    batch_v3_filter_slugs: Array.from(new Set(batch_v3_filter_slugs)).sort(),
  };
}

export function buildAirPurifierModelFirstProductionLaneV1Report(
  deps: BuildAirPurifierModelFirstProductionLaneDepsV1,
): AirPurifierModelFirstProductionLaneReportV1 {
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
  const links = readCsv<RetailerLinkRow>(
    deps.rootDir,
    "data/air-purifier/retailer_links.csv",
    readText,
    fileExists,
  );

  const modelFilterLinks = resolveModelFilterLinks(models, compat);
  const uniqueFilterSlugs = new Set(modelFilterLinks.values());

  let linked_filter_safe_cta_count = 0;
  let linked_filter_blocked_or_unknown_count = 0;
  for (const filterSlug of Array.from(uniqueFilterSlugs)) {
    const status = classifyBuyerPathStatus(filterSlug, links);
    if (status === "SAFE_DIRECT_BUYABLE") linked_filter_safe_cta_count += 1;
    else linked_filter_blocked_or_unknown_count += 1;
  }

  const candidate_rows: ModelFirstCandidateRowV1[] = [];
  const brandAcc = new Map<string, ModelFirstBrandSummaryV1>();

  for (const model of models) {
    const filterSlug = modelFilterLinks.get(model.slug) ?? null;
    const linked_filter_status: ModelFirstLinkedFilterStatusV1 = filterSlug ? "LINKED" : "NO_LINK";
    const buyer_path_status = classifyBuyerPathStatus(filterSlug, links);
    const confidence = buyerPathConfidence(buyer_path_status);

    let summary = brandAcc.get(model.brand_slug);
    if (!summary) {
      summary = {
        brand_slug: model.brand_slug,
        model_count: 0,
        model_with_safe_buyer_path_count: 0,
        model_search_placeholder_primary_count: 0,
        model_blocked_or_unknown_buyer_path_count: 0,
        model_first_opportunity_score: 0,
      };
      brandAcc.set(model.brand_slug, summary);
    }
    summary.model_count += 1;
    if (buyer_path_status === "SAFE_DIRECT_BUYABLE") summary.model_with_safe_buyer_path_count += 1;
    if (buyer_path_status === "SEARCH_PLACEHOLDER") summary.model_search_placeholder_primary_count += 1;
    if (
      buyer_path_status === "BLOCKED" ||
      buyer_path_status === "UNKNOWN" ||
      buyer_path_status === "OFFICIAL_REFERENCE"
    ) {
      summary.model_blocked_or_unknown_buyer_path_count += 1;
    }

    const isModelFirstCandidate = buyer_path_status !== "SAFE_DIRECT_BUYABLE";
    if (isModelFirstCandidate) {
      candidate_rows.push({
        model_slug: model.slug,
        brand_slug: model.brand_slug,
        model_number: (model.model_number ?? "").trim() || null,
        model_title: (model.title ?? "").trim() || null,
        linked_filter_slug: filterSlug,
        linked_filter_status,
        buyer_path_status,
        evidence_gap: evidenceGapForStatus(buyer_path_status, filterSlug),
        why_model_first: whyModelFirstForRow({ model, filterSlug, buyerPathStatus: buyer_path_status }),
        recommended_evidence_source_type: recommendedEvidenceSource(model, buyer_path_status),
        recommended_next_action: recommendedNextActionForRow(buyer_path_status),
        confidence,
      });
      summary.model_first_opportunity_score += buyer_path_status === "SEARCH_PLACEHOLDER" ? 3 : 1;
    }
  }

  candidate_rows.sort((a, b) => {
    const score = (s: ModelFirstBuyerPathStatusV1) =>
      s === "SEARCH_PLACEHOLDER" ? 0 : s === "BLOCKED" ? 1 : s === "UNKNOWN" ? 2 : 3;
    return score(a.buyer_path_status) - score(b.buyer_path_status);
  });

  const brand_summary = Array.from(brandAcc.values()).sort(
    (a, b) => b.model_first_opportunity_score - a.model_first_opportunity_score,
  );

  const comparison_to_filter_first_batch_v3 = loadBatchV3Comparison({
    rootDir: deps.rootDir,
    fileExists,
    readText,
    listDir,
  });

  const model_with_filter_count = modelFilterLinks.size;
  const model_without_filter_count = models.length - model_with_filter_count;

  const source_status: ModelFirstLaneSourceStatusV1 =
    models.length > 0 && fileExists(path.join(deps.rootDir, "data/air-purifier/models.csv")) &&
    fileExists(path.join(deps.rootDir, "data/air-purifier/compatibility_mappings.csv")) &&
    fileExists(path.join(deps.rootDir, "data/air-purifier/retailer_links.csv"))
      ? comparison_to_filter_first_batch_v3.filter_first_candidates_checked > 0
        ? "PROVEN"
        : "PARTIAL"
      : "PARTIAL";

  const topBrand = brand_summary[0];
  const recommended_next_action =
    comparison_to_filter_first_batch_v3.model_first_verdict === "PROMISING"
      ? `Run a read-only model-first evidence packet for ${topBrand?.brand_slug ?? "top"} models (${String(candidate_rows.length)} model-first candidates) — start from official model/support pages, then map to filter SKU and buyer path. Do not mutate CSV until browser proof exists.`
      : "Legacy filter-first batch lane is historical/read-only triage only — do not use for new product addition; run model-first evidence first.";

  const proven_facts = [
    `PROVEN: ${String(models.length)} air purifier models in data/air-purifier/models.csv.`,
    `PROVEN: ${String(model_with_filter_count)} models have a linked filter via data/air-purifier/compatibility_mappings.csv.`,
    `PROVEN: ${String(model_without_filter_count)} models without compatibility_mapping link.`,
    `PROVEN: ${String(uniqueFilterSlugs.size)} unique linked filter slugs across models.`,
    `PROVEN: ${String(linked_filter_safe_cta_count)} linked filters have safe direct_buyable primary rows in retailer_links.csv.`,
    `PROVEN: ap-batch-v3 filter-first checked ${String(comparison_to_filter_first_batch_v3.filter_first_candidates_checked)} candidates with ${String(comparison_to_filter_first_batch_v3.safe_csv_mutations)} safe CSV mutations.`,
  ];

  const unknown_facts = [
    "UNKNOWN: Whether official model/support pages will yield higher-yield OEM PDPs than filter-first search rescue — requires a model-first evidence packet run.",
    "UNKNOWN: Live production /go primary CTA order for multi-path slugs (not read in this lane).",
    "UNKNOWN: Supabase parity state (not queried).",
    comparison_to_filter_first_batch_v3.verdict_rationale,
  ];

  return {
    contract: AIR_PURIFIER_MODEL_FIRST_PRODUCTION_LANE_REPORT_NAME_V1,
    read_only: true,
    data_mutation: false,
    generated_at: now().toISOString(),
    source_status,
    model_count: models.length,
    model_with_filter_count,
    model_without_filter_count,
    linked_filter_count: uniqueFilterSlugs.size,
    linked_filter_safe_cta_count,
    linked_filter_blocked_or_unknown_count,
    model_first_candidate_count: candidate_rows.length,
    candidate_rows,
    brand_summary,
    comparison_to_filter_first_batch_v3,
    recommended_next_action,
    proven_facts,
    unknown_facts,
  };
}
