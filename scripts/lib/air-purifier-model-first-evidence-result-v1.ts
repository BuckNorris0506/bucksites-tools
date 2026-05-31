/**
 * Air Purifier model-first evidence result v1 — per-model rows from repo truth only.
 * Writes only under agent-results-model-first-v1/ when explicitly requested.
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { parse } from "csv-parse/sync";

import {
  buyLinkGateFailureKind,
  isDirectBuyableSafeCtaRow,
  isManufacturerSiteSearchUrl,
} from "@/lib/retailers/launch-buy-links";

import type { ApModelFirstEvidenceQueueReportV1 } from "./ap-model-first-evidence-queue-v1";

export const AP_MODEL_FIRST_EVIDENCE_RESULTS_DIR_REL_V1 =
  "data/air-purifier/batch-production/agent-results-model-first-v1" as const;

export const AIR_PURIFIER_MODEL_FIRST_EVIDENCE_RESULT_CONTRACT_V1 =
  "air_purifier_model_first_evidence_result_v1" as const;

export const AIR_PURIFIER_MODEL_FIRST_EVIDENCE_RESULT_REPORT_NAME_V1 =
  "air_purifier_model_first_evidence_result_v1" as const;

export const AP_MODEL_FIRST_HOLMES_HAPF30_RESULT_REL_V1 =
  `${AP_MODEL_FIRST_EVIDENCE_RESULTS_DIR_REL_V1}/ap-model-first-holmes-hapf30-v1.results.json` as const;

export const AP_MODEL_FIRST_HOLMES_HAPF30_LIVE_BROWSER_RESULT_REL_V1 =
  `${AP_MODEL_FIRST_EVIDENCE_RESULTS_DIR_REL_V1}/ap-model-first-holmes-hapf30-live-browser-v1.results.json` as const;

export const AP_MODEL_FIRST_HOLMES_HAPF30_PACKET_ID_V1 = "ap-model-first-holmes-hapf30-v1" as const;

export const AP_MODEL_FIRST_HOLMES_HAPF30_LIVE_BROWSER_PACKET_ID_V1 =
  "ap-model-first-holmes-hapf30-live-browser-v1" as const;

export const AP_MODEL_FIRST_EVIDENCE_QUEUE_CONTRACT_V1 = "ap_model_first_evidence_queue_v1" as const;

export const MODEL_FIRST_EVIDENCE_COLLECTION_MODES_V1 = [
  "repo_truth_only_v1",
  "live_browser_model_first_v1",
] as const;

export type ModelFirstEvidenceCollectionModeV1 =
  (typeof MODEL_FIRST_EVIDENCE_COLLECTION_MODES_V1)[number];

export type ModelFirstEvidenceRowStatusV1 = "PASS" | "FAIL" | "UNKNOWN" | "BLOCKED";

export type ModelFirstEvidenceConfidenceV1 = "PROVEN" | "INFERRED" | "UNKNOWN";

export type ModelFirstEvidenceModelRowV1 = {
  model_slug: string;
  brand_slug: string;
  model_number: string | null;
  model_title: string | null;
  evidence_status: ModelFirstEvidenceRowStatusV1;
  official_model_source_urls: string[];
  documented_filter_slug: string;
  documented_filter_part: string | null;
  exact_filter_token_evidence: string;
  buyer_path_status: string;
  add_to_cart_or_buy_button_found: boolean | null;
  why_status: string;
  confidence: ModelFirstEvidenceConfidenceV1;
  recommended_csv_mutation: null;
  do_not_claim_unavailable: true;
};

export type ModelFirstFilterFirstCrossReferenceV1 = {
  source_artifact_rel: string;
  filter_slug: string;
  evidence_status: string;
  candidate_url: string | null;
  browser_truth_classification: string | null;
  exact_token_found: boolean | null;
  add_to_cart_or_buy_button_found: boolean | null;
  token_evidence: string | null;
  buy_button_evidence: string | null;
  rejection_reason: string | null;
  applies_to: "filter_slug_only_not_per_model_pages";
};

export type ModelFirstLiveBrowserModelRowV1 = {
  model_slug: string;
  model_number: string | null;
  official_source_urls: string[];
  manual_urls: string[];
  documented_filter_tokens: string[];
  evidence_status: ModelFirstEvidenceRowStatusV1;
  buyer_path_status: string;
  notes: string;
};

export type ModelFirstCandidateBuyerPathStatusV1 = ModelFirstEvidenceRowStatusV1;

export type ModelFirstCandidateBuyerPathV1 = {
  url: string;
  retailer_or_source: string;
  exact_token_proof: string;
  buyability_proof: string;
  wrong_family_risk: string;
  status: ModelFirstCandidateBuyerPathStatusV1;
};

export type AirPurifierModelFirstEvidenceResultBaseV1 = {
  contract: typeof AIR_PURIFIER_MODEL_FIRST_EVIDENCE_RESULT_CONTRACT_V1;
  report_name: typeof AIR_PURIFIER_MODEL_FIRST_EVIDENCE_RESULT_REPORT_NAME_V1;
  packet_id: string;
  run_id: string;
  queue_contract: typeof AP_MODEL_FIRST_EVIDENCE_QUEUE_CONTRACT_V1;
  anchor_filter_slug: string;
  read_only: true;
  data_mutation: false;
  generated_at: string;
  source_status: "PROVEN" | "PARTIAL" | "UNKNOWN";
  /** Stable top-level summary of model slugs represented in model_rows (same order as model_rows). */
  model_slugs_checked: string[];
  evidence_status_counts: Record<ModelFirstEvidenceRowStatusV1, number>;
  recommended_csv_mutation: null;
  /** false unless evidence_status_counts.PASS > 0 and gates authorize CSV apply. */
  safe_apply_authorized: boolean;
  proven_facts: string[];
  inferred_facts: string[];
  unknown_facts: string[];
};

export type AirPurifierModelFirstRepoEvidenceResultV1 = AirPurifierModelFirstEvidenceResultBaseV1 & {
  evidence_collection_mode: "repo_truth_only_v1";
  evidence_mode?: "repo_truth_only_v1";
  model_rows: ModelFirstEvidenceModelRowV1[];
  filter_first_cross_reference: ModelFirstFilterFirstCrossReferenceV1 | null;
};

export type AirPurifierModelFirstLiveBrowserEvidenceResultV1 =
  AirPurifierModelFirstEvidenceResultBaseV1 & {
    evidence_collection_mode: "live_browser_model_first_v1";
    evidence_mode: "live_browser_model_first_v1";
    checked_at: string;
    filter_slug: string;
    model_rows: ModelFirstLiveBrowserModelRowV1[];
    candidate_buyer_paths: ModelFirstCandidateBuyerPathV1[];
    filter_first_cross_reference: ModelFirstFilterFirstCrossReferenceV1 | null;
  };

export type AirPurifierModelFirstEvidenceResultV1 =
  | AirPurifierModelFirstRepoEvidenceResultV1
  | AirPurifierModelFirstLiveBrowserEvidenceResultV1;

type ModelCsvRow = {
  brand_slug: string;
  slug: string;
  model_number?: string;
  title?: string;
  series?: string;
  notes?: string;
};

type FilterCsvRow = {
  brand_slug: string;
  slug: string;
  oem_part_number?: string;
  name?: string;
  notes?: string;
};

type RetailerLinkRow = {
  filter_slug: string;
  affiliate_url: string;
  destination_url?: string;
  is_primary?: string;
  retailer_key?: string;
  browser_truth_classification?: string;
};

type BatchV3FilterRow = {
  filter_slug?: string;
  candidate_url?: string;
  evidence_status?: string;
  browser_truth_classification?: string;
  exact_token_found?: boolean;
  add_to_cart_or_buy_button_found?: boolean;
  token_evidence?: string;
  buy_button_evidence?: string;
  rejection_reason?: string;
};

export type BuildModelFirstEvidenceResultDepsV1 = {
  rootDir: string;
  queue: ApModelFirstEvidenceQueueReportV1;
  anchorFilterSlug: string;
  modelSlugs: string[];
  now?: () => Date;
  fileExists?: (absPath: string) => boolean;
  readText?: (absPath: string) => string;
  writeResult?: boolean;
  resultRelPath?: string;
};

function defaultFileExists(absPath: string): boolean {
  return existsSync(absPath);
}

function defaultReadText(absPath: string): string {
  return readFileSync(absPath, "utf8");
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

function classifyRepoBuyerPathStatus(primary: RetailerLinkRow | null): string {
  if (!primary) return "NO_PRIMARY_LINK";
  const dest = (primary.destination_url ?? primary.affiliate_url ?? "").trim();
  if (isDirectBuyableSafeCtaRow({ ...primary, destination_url: dest })) {
    return "SAFE_DIRECT_BUYABLE";
  }
  if (isManufacturerSiteSearchUrl(dest)) return "SEARCH_PLACEHOLDER_PRIMARY";
  const gate = buyLinkGateFailureKind({ ...primary, destination_url: dest });
  if (gate === "missing_browser_truth") return "MISSING_BROWSER_TRUTH";
  return gate ?? "UNKNOWN";
}

function loadBatchV3FilterRow(args: {
  rootDir: string;
  filterSlug: string;
  readText: (p: string) => string;
  fileExists: (p: string) => boolean;
}): BatchV3FilterRow | null {
  const rel =
    "data/air-purifier/batch-production/agent-results-batch-v3/ap-oem-search-placeholder-v1.results.json";
  const abs = path.join(args.rootDir, rel);
  if (!args.fileExists(abs)) return null;
  try {
    const parsed = JSON.parse(args.readText(abs)) as {
      candidate_results?: BatchV3FilterRow[];
    };
    return parsed.candidate_results?.find((r) => r.filter_slug === args.filterSlug) ?? null;
  } catch {
    return null;
  }
}

type CompatibilityMappingRow = {
  model_slug: string;
  filter_slug: string;
  is_recommended?: string;
};

/** All model slugs mapped to anchor filter in compatibility_mappings.csv (repo truth, sorted). */
export function loadAllRepoModelSlugsForAnchorFilterV1(
  rootDir: string,
  anchorFilterSlug: string,
  readText: (absPath: string) => string = defaultReadText,
  fileExists: (absPath: string) => boolean = defaultFileExists,
): string[] {
  const rows = readCsv<CompatibilityMappingRow>(
    rootDir,
    "data/air-purifier/compatibility_mappings.csv",
    readText,
    fileExists,
  );
  const slugs = new Set<string>();
  for (const row of rows) {
    if (row.filter_slug !== anchorFilterSlug) continue;
    const recommended = (row.is_recommended ?? "").trim().toLowerCase();
    if (recommended === "false" || recommended === "0" || recommended === "no") continue;
    const slug = row.model_slug?.trim();
    if (slug) slugs.add(slug);
  }
  return Array.from(slugs).sort((a, b) => a.localeCompare(b));
}

export function modelFirstLiveBrowserResultRelPathV1(anchorFilterSlug: string): string {
  return `${AP_MODEL_FIRST_EVIDENCE_RESULTS_DIR_REL_V1}/ap-model-first-${anchorFilterSlug}-live-browser-v1.results.json`;
}

function countStatuses(
  rows: Array<{ evidence_status: ModelFirstEvidenceRowStatusV1 }>,
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

export function isAllowedModelFirstEvidenceResultRelPathV1(relPath: string): boolean {
  const normalized = relPath.replace(/\\/g, "/");
  if (!normalized.startsWith(`${AP_MODEL_FIRST_EVIDENCE_RESULTS_DIR_REL_V1}/`)) return false;
  if (!normalized.endsWith(".results.json")) return false;
  if (normalized.includes("..")) return false;
  return true;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasStatusCounts(value: unknown): boolean {
  if (!isRecord(value)) return false;
  const counts = value.evidence_status_counts;
  if (!isRecord(counts)) return false;
  return (
    typeof counts.PASS === "number" &&
    typeof counts.FAIL === "number" &&
    typeof counts.UNKNOWN === "number" &&
    typeof counts.BLOCKED === "number"
  );
}

function sortedSlugList(slugs: string[]): string[] {
  return slugs.slice().sort((a, b) => a.localeCompare(b));
}

function validateModelSlugsCheckedSummary(
  value: unknown,
  modelRows: Array<{ model_slug: string }>,
): boolean {
  if (!isRecord(value)) return false;
  if (!("model_slugs_checked" in value) || value.model_slugs_checked === undefined) {
    return true;
  }
  if (!Array.isArray(value.model_slugs_checked)) return false;
  const checked = value.model_slugs_checked.filter((s): s is string => typeof s === "string");
  if (checked.length !== value.model_slugs_checked.length) return false;
  const expected = sortedSlugList(modelRows.map((row) => row.model_slug));
  const actual = sortedSlugList(checked);
  return (
    actual.length === expected.length && actual.every((slug, index) => slug === expected[index])
  );
}

function validateSafeApplyAuthorizedSummary(value: unknown): boolean {
  if (!isRecord(value)) return false;
  if (!hasStatusCounts(value)) return false;
  if (!("safe_apply_authorized" in value) || value.safe_apply_authorized === undefined) {
    return true;
  }
  if (typeof value.safe_apply_authorized !== "boolean") return false;
  const counts = value.evidence_status_counts as Record<string, number>;
  const passCount = typeof counts.PASS === "number" ? counts.PASS : 0;
  return value.safe_apply_authorized === passCount > 0;
}

function validateRepoModelRows(rows: unknown): rows is ModelFirstEvidenceModelRowV1[] {
  if (!Array.isArray(rows)) return false;
  return rows.every((row) => {
    if (!isRecord(row)) return false;
    return (
      typeof row.model_slug === "string" &&
      row.recommended_csv_mutation === null &&
      row.do_not_claim_unavailable === true
    );
  });
}

function validateLiveBrowserModelRows(rows: unknown): rows is ModelFirstLiveBrowserModelRowV1[] {
  if (!Array.isArray(rows)) return false;
  return rows.every((row) => {
    if (!isRecord(row)) return false;
    return (
      typeof row.model_slug === "string" &&
      Array.isArray(row.official_source_urls) &&
      Array.isArray(row.manual_urls) &&
      Array.isArray(row.documented_filter_tokens)
    );
  });
}

function validateCandidateBuyerPaths(paths: unknown): paths is ModelFirstCandidateBuyerPathV1[] {
  if (!Array.isArray(paths)) return false;
  return paths.every((pathRow) => {
    if (!isRecord(pathRow)) return false;
    const url = typeof pathRow.url === "string" ? pathRow.url.trim() : "";
    if (!url || isManufacturerSiteSearchUrl(url)) return false;
    return (
      typeof pathRow.retailer_or_source === "string" &&
      typeof pathRow.exact_token_proof === "string" &&
      typeof pathRow.buyability_proof === "string" &&
      typeof pathRow.wrong_family_risk === "string" &&
      (pathRow.status === "PASS" ||
        pathRow.status === "FAIL" ||
        pathRow.status === "UNKNOWN" ||
        pathRow.status === "BLOCKED")
    );
  });
}

/** PASS buyer paths require non-empty exact-token proof (no search URLs). */
export function liveBrowserBuyerPathMayRecommendCsvMutationV1(
  pathRow: ModelFirstCandidateBuyerPathV1,
): boolean {
  if (pathRow.status !== "PASS") return false;
  const proof = pathRow.exact_token_proof.trim();
  if (!proof || proof.toUpperCase().startsWith("UNKNOWN")) return false;
  if (isManufacturerSiteSearchUrl(pathRow.url)) return false;
  return true;
}

export function validateModelFirstEvidenceResultV1(
  value: unknown,
): value is AirPurifierModelFirstEvidenceResultV1 {
  if (!isRecord(value)) return false;
  if (value.contract !== AIR_PURIFIER_MODEL_FIRST_EVIDENCE_RESULT_CONTRACT_V1) return false;
  if (value.read_only !== true || value.data_mutation !== false) return false;
  if (value.recommended_csv_mutation !== null) return false;
  if (!hasStatusCounts(value)) return false;
  if (!validateSafeApplyAuthorizedSummary(value)) return false;

  const mode = value.evidence_collection_mode ?? value.evidence_mode;
  if (mode === "repo_truth_only_v1") {
    if (!validateRepoModelRows(value.model_rows)) return false;
    return validateModelSlugsCheckedSummary(value, value.model_rows as ModelFirstEvidenceModelRowV1[]);
  }
  if (mode === "live_browser_model_first_v1") {
    if (value.evidence_mode !== "live_browser_model_first_v1") return false;
    if (typeof value.checked_at !== "string" || typeof value.filter_slug !== "string") return false;
    if (!validateLiveBrowserModelRows(value.model_rows)) return false;
    if (
      !validateModelSlugsCheckedSummary(value, value.model_rows as ModelFirstLiveBrowserModelRowV1[])
    ) {
      return false;
    }
    if (!validateCandidateBuyerPaths(value.candidate_buyer_paths)) return false;
    const paths = value.candidate_buyer_paths as ModelFirstCandidateBuyerPathV1[];
    if (paths.some((p) => p.status === "PASS" && !liveBrowserBuyerPathMayRecommendCsvMutationV1(p))) {
      return false;
    }
    return true;
  }
  return false;
}

export function buildModelFirstEvidenceResultV1(
  deps: BuildModelFirstEvidenceResultDepsV1,
): AirPurifierModelFirstRepoEvidenceResultV1 {
  const now = deps.now ?? (() => new Date());
  const fileExists = deps.fileExists ?? defaultFileExists;
  const readText = deps.readText ?? defaultReadText;

  const models = readCsv<ModelCsvRow>(
    deps.rootDir,
    "data/air-purifier/models.csv",
    readText,
    fileExists,
  );
  const filters = readCsv<FilterCsvRow>(
    deps.rootDir,
    "data/air-purifier/filters.csv",
    readText,
    fileExists,
  );
  const links = readCsv<RetailerLinkRow>(
    deps.rootDir,
    "data/air-purifier/retailer_links.csv",
    readText,
    fileExists,
  );

  const filterRow = filters.find((f) => f.slug === deps.anchorFilterSlug) ?? null;
  const primary = primaryLinkForSlug(links, deps.anchorFilterSlug);
  const buyerPathStatus = classifyRepoBuyerPathStatus(primary);
  const batchRow = loadBatchV3FilterRow({
    rootDir: deps.rootDir,
    filterSlug: deps.anchorFilterSlug,
    readText,
    fileExists,
  });

  const filterFirstCrossRef: ModelFirstFilterFirstCrossReferenceV1 | null = batchRow
    ? {
        source_artifact_rel:
          "data/air-purifier/batch-production/agent-results-batch-v3/ap-oem-search-placeholder-v1.results.json",
        filter_slug: deps.anchorFilterSlug,
        evidence_status: batchRow.evidence_status ?? "UNKNOWN",
        candidate_url: batchRow.candidate_url ?? null,
        browser_truth_classification: batchRow.browser_truth_classification ?? null,
        exact_token_found: batchRow.exact_token_found ?? null,
        add_to_cart_or_buy_button_found: batchRow.add_to_cart_or_buy_button_found ?? null,
        token_evidence: batchRow.token_evidence ?? null,
        buy_button_evidence: batchRow.buy_button_evidence ?? null,
        rejection_reason: batchRow.rejection_reason ?? null,
        applies_to: "filter_slug_only_not_per_model_pages",
      }
    : null;

  const documentedPart =
    filterRow?.name?.trim() || filterRow?.oem_part_number?.trim() || null;
  const anchorBrandSlug = filterRow?.brand_slug?.trim() || null;
  const anchorPartToken = filterRow?.oem_part_number?.trim() || deps.anchorFilterSlug;

  const model_rows: ModelFirstEvidenceModelRowV1[] = [];

  for (const modelSlug of deps.modelSlugs) {
    const model = models.find((m) => m.slug === modelSlug);
    if (!model) {
      model_rows.push({
        model_slug: modelSlug,
        brand_slug: anchorBrandSlug ?? "unknown",
        model_number: null,
        model_title: null,
        evidence_status: "BLOCKED",
        official_model_source_urls: [],
        documented_filter_slug: deps.anchorFilterSlug,
        documented_filter_part: documentedPart,
        exact_filter_token_evidence:
          "BLOCKED: model_slug not found in data/air-purifier/models.csv.",
        buyer_path_status: buyerPathStatus,
        add_to_cart_or_buy_button_found: null,
        why_status: "Model slug missing from repo models.csv — cannot run model-first evidence row.",
        confidence: "PROVEN",
        recommended_csv_mutation: null,
        do_not_claim_unavailable: true,
      });
      continue;
    }

    const seriesNote = model.series?.trim() ? ` series=${model.series}` : "";
    model_rows.push({
      model_slug: model.slug,
      brand_slug: model.brand_slug,
      model_number: model.model_number?.trim() || null,
      model_title: model.title?.trim() || null,
      evidence_status: "UNKNOWN",
      official_model_source_urls: [],
      documented_filter_slug: deps.anchorFilterSlug,
      documented_filter_part: documentedPart,
      exact_filter_token_evidence:
        `UNKNOWN: No per-model official support/manual URL in repo for this run (repo_truth_only_v1). ` +
        `Committed filter-first batch-v3 row for ${deps.anchorFilterSlug} did not prove exact ${anchorPartToken} token on a model page` +
        (batchRow?.token_evidence ? ` (filter-slug batch token_evidence: ${batchRow.token_evidence}).` : " (filter-slug-level evidence only, if present)."),
      buyer_path_status: buyerPathStatus,
      add_to_cart_or_buy_button_found: batchRow?.add_to_cart_or_buy_button_found ?? null,
      why_status:
        `Model-first evidence path not completed for ${model.slug}${seriesNote}: need official model/support page proof → documented filter ${deps.anchorFilterSlug} → verified buyer path. ` +
        "Repo maps model→filter via compatibility_mappings.csv (PROVEN). Live browser proof not collected in this artifact.",
      confidence: "PROVEN",
      recommended_csv_mutation: null,
      do_not_claim_unavailable: true,
    });
  }

  const evidence_status_counts = countStatuses(model_rows);
  const model_slugs_checked = model_rows.map((row) => row.model_slug);
  const safe_apply_authorized = evidence_status_counts.PASS > 0;
  const run_id = `ap-model-first-${now().toISOString().slice(0, 10)}`;

  const report: AirPurifierModelFirstRepoEvidenceResultV1 = {
    contract: AIR_PURIFIER_MODEL_FIRST_EVIDENCE_RESULT_CONTRACT_V1,
    report_name: AIR_PURIFIER_MODEL_FIRST_EVIDENCE_RESULT_REPORT_NAME_V1,
    packet_id:
      deps.anchorFilterSlug === "holmes-hapf30"
        ? AP_MODEL_FIRST_HOLMES_HAPF30_PACKET_ID_V1
        : `ap-model-first-${deps.anchorFilterSlug}-v1`,
    run_id,
    queue_contract: AP_MODEL_FIRST_EVIDENCE_QUEUE_CONTRACT_V1,
    anchor_filter_slug: deps.anchorFilterSlug,
    read_only: true,
    data_mutation: false,
    generated_at: now().toISOString(),
    source_status:
      models.length > 0 && filterRow && primary ? "PROVEN" : batchRow ? "PARTIAL" : "PARTIAL",
    evidence_collection_mode: "repo_truth_only_v1",
    evidence_mode: "repo_truth_only_v1",
    model_slugs_checked,
    model_rows,
    filter_first_cross_reference: filterFirstCrossRef,
    evidence_status_counts,
    recommended_csv_mutation: null,
    safe_apply_authorized,
    proven_facts: [
      `PROVEN: ${String(model_rows.length)} model row(s) checked for anchor filter ${deps.anchorFilterSlug}.`,
      `PROVEN: All models map to ${deps.anchorFilterSlug} via data/air-purifier/compatibility_mappings.csv.`,
      `PROVEN: Repo primary buyer_path_status for linked filter is ${buyerPathStatus}.`,
      `PROVEN: recommended_csv_mutation=null; safe_apply_authorized=${String(safe_apply_authorized)}.`,
    ],
    inferred_facts: filterFirstCrossRef
      ? [
          `INFERRED: Committed filter-first batch-v3 evidence for ${deps.anchorFilterSlug} may inform filter-family context but does not satisfy per-model model-first proof.`,
        ]
      : [],
    unknown_facts: [
      `UNKNOWN: Whether official model/support pages document ${documentedPart ?? anchorPartToken} for filter ${deps.anchorFilterSlug} on each checked unit (no per-model URLs in repo).`,
      "UNKNOWN: Live purchase availability at retailers (not proven by this repo-only run).",
      ...(batchRow?.candidate_url
        ? [
            `UNKNOWN: Whether batch-v3 candidate URL ${batchRow.candidate_url} is the correct model-specific buyer path for ${deps.anchorFilterSlug}.`,
          ]
        : [
            `UNKNOWN: Whether a verified buyer-path PDP exists for ${deps.anchorFilterSlug} beyond repo primary link classification (${buyerPathStatus}).`,
          ]),
      `UNKNOWN: Live browser model-first proof not captured in this artifact; next read-only path: ${modelFirstLiveBrowserResultRelPathV1(deps.anchorFilterSlug)}.`,
    ],
  };

  if (deps.writeResult) {
    const rel =
      deps.resultRelPath ??
      `${AP_MODEL_FIRST_EVIDENCE_RESULTS_DIR_REL_V1}/ap-model-first-${deps.anchorFilterSlug}-v1.results.json`;
    const abs = path.join(deps.rootDir, rel);
    mkdirSync(path.dirname(abs), { recursive: true });
    writeFileSync(abs, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  }

  return report;
}

export type CommittedModelFirstEvidenceResultEntryV1 = {
  relPath: string;
  result: AirPurifierModelFirstEvidenceResultV1;
};

export type CommittedModelFirstEvidenceResultsLoadV1 = {
  results: CommittedModelFirstEvidenceResultEntryV1[];
  invalid_result_files: string[];
};

/** model_slugs_checked when present; otherwise derived from model_rows (legacy artifacts). */
export function modelFirstResultModelSlugsCheckedV1(
  result: AirPurifierModelFirstEvidenceResultV1,
): string[] {
  if ("model_slugs_checked" in result && Array.isArray(result.model_slugs_checked)) {
    return result.model_slugs_checked.filter((slug): slug is string => typeof slug === "string");
  }
  return result.model_rows.map((row) => row.model_slug);
}

export function modelFirstResultFilterSlugV1(
  result: AirPurifierModelFirstEvidenceResultV1,
): string | null {
  if ("filter_slug" in result && typeof result.filter_slug === "string" && result.filter_slug.trim()) {
    return result.filter_slug.trim();
  }
  const anchor = result.anchor_filter_slug?.trim();
  return anchor || null;
}

export function modelFirstResultTimestampV1(result: AirPurifierModelFirstEvidenceResultV1): string {
  if ("checked_at" in result && typeof result.checked_at === "string" && result.checked_at.trim()) {
    return result.checked_at;
  }
  return result.generated_at;
}

/** Completed pass with no safe CSV mutation authorized (PASS count 0, recommended_csv_mutation null). */
export function isModelFirstResultCompletedNoMutationV1(
  result: AirPurifierModelFirstEvidenceResultV1,
): boolean {
  if (result.recommended_csv_mutation !== null) return false;
  return result.evidence_status_counts.PASS === 0;
}

export function loadCommittedModelFirstEvidenceResultsV1(args: {
  rootDir: string;
  readText?: (absPath: string) => string;
  fileExists?: (absPath: string) => boolean;
  readdir?: (absDir: string) => string[];
}): CommittedModelFirstEvidenceResultsLoadV1 {
  const fileExists = args.fileExists ?? defaultFileExists;
  const readText = args.readText ?? defaultReadText;
  const readdir = args.readdir ?? ((absDir: string) => readdirSync(absDir));
  const resultsDirAbs = path.join(args.rootDir, AP_MODEL_FIRST_EVIDENCE_RESULTS_DIR_REL_V1);
  const invalid_result_files: string[] = [];
  const results: CommittedModelFirstEvidenceResultEntryV1[] = [];

  if (!fileExists(resultsDirAbs)) {
    return { results, invalid_result_files };
  }

  for (const name of readdir(resultsDirAbs)) {
    if (!name.endsWith(".results.json")) continue;
    const relPath = `${AP_MODEL_FIRST_EVIDENCE_RESULTS_DIR_REL_V1}/${name}`;
    if (!isAllowedModelFirstEvidenceResultRelPathV1(relPath)) {
      invalid_result_files.push(relPath);
      continue;
    }
    const loaded = loadModelFirstEvidenceResultV1({
      rootDir: args.rootDir,
      relPath,
      readText,
      fileExists,
    });
    if (!loaded) {
      invalid_result_files.push(relPath);
      continue;
    }
    if (!modelFirstResultFilterSlugV1(loaded)) {
      invalid_result_files.push(relPath);
      continue;
    }
    results.push({ relPath, result: loaded });
  }

  return { results, invalid_result_files };
}

/** Latest valid committed result per filter_slug (by generated_at / checked_at). */
export function latestCommittedModelFirstResultsByFilterSlugV1(
  load: CommittedModelFirstEvidenceResultsLoadV1,
): Map<string, CommittedModelFirstEvidenceResultEntryV1> {
  const bySlug = new Map<string, CommittedModelFirstEvidenceResultEntryV1>();
  for (const entry of load.results) {
    const slug = modelFirstResultFilterSlugV1(entry.result);
    if (!slug) continue;
    const existing = bySlug.get(slug);
    if (
      !existing ||
      modelFirstResultTimestampV1(entry.result) > modelFirstResultTimestampV1(existing.result)
    ) {
      bySlug.set(slug, entry);
    }
  }
  return bySlug;
}

export function loadModelFirstEvidenceResultV1(args: {
  rootDir: string;
  relPath: string;
  readText?: (absPath: string) => string;
  fileExists?: (absPath: string) => boolean;
}): AirPurifierModelFirstEvidenceResultV1 | null {
  const fileExists = args.fileExists ?? defaultFileExists;
  const readText = args.readText ?? defaultReadText;
  if (!isAllowedModelFirstEvidenceResultRelPathV1(args.relPath)) return null;
  const abs = path.join(args.rootDir, args.relPath);
  if (!fileExists(abs)) return null;
  try {
    const parsed: unknown = JSON.parse(readText(abs));
    if (!validateModelFirstEvidenceResultV1(parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function buildHolmesHapf30ModelFirstEvidenceFromQueueV1(args: {
  rootDir: string;
  queue: ApModelFirstEvidenceQueueReportV1;
  writeResult?: boolean;
  now?: () => Date;
}): AirPurifierModelFirstRepoEvidenceResultV1 {
  const top = args.queue.top_candidates.find((c) => c.filter_slug === "holmes-hapf30");
  const modelSlugs =
    top?.sample_model_slugs ?? [
      "holmes-hap412bcs",
      "holmes-hap412bns",
      "holmes-hap422b",
      "holmes-hap424-u",
      "holmes-hap424-u8",
    ];

  return buildModelFirstEvidenceResultV1({
    rootDir: args.rootDir,
    queue: args.queue,
    anchorFilterSlug: "holmes-hapf30",
    modelSlugs,
    writeResult: args.writeResult,
    now: args.now,
  });
}
