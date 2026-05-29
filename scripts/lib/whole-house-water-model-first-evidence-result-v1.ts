/**
 * Whole-house-water model-first evidence result v1 — live-browser artifacts only.
 * Writes only under agent-results-model-first-v1/ when explicitly requested.
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { getVerticalLaunchState } from "@/lib/catalog/vertical-launch-state";
import { isManufacturerSiteSearchUrl } from "@/lib/retailers/launch-buy-links";

import {
  liveBrowserBuyerPathMayRecommendCsvMutationV1,
  type ModelFirstCandidateBuyerPathV1,
  type ModelFirstEvidenceRowStatusV1,
  type ModelFirstLiveBrowserModelRowV1,
} from "./air-purifier-model-first-evidence-result-v1";
/** Matches whole-house-water-model-first-easiest-proof-queue-v1 contract (avoid circular import). */
export const WHW_MODEL_FIRST_EASIEST_PROOF_QUEUE_CONTRACT_V1 =
  "whole_house_water_model_first_easiest_proof_queue_v1" as const;

export const WHW_MODEL_FIRST_EVIDENCE_RESULT_CONTRACT_V1 =
  "whole_house_water_model_first_evidence_result_v1" as const;

export const WHW_MODEL_FIRST_EVIDENCE_RESULTS_DIR_REL_V1 =
  "data/whole-house-water/batch-production/agent-results-model-first-v1" as const;

export const WHW_AP810_LIVE_BROWSER_RESULT_REL_V1 =
  `${WHW_MODEL_FIRST_EVIDENCE_RESULTS_DIR_REL_V1}/whw-model-first-3m-ap810-live-browser-v1.results.json` as const;

export const WHW_AP810_PACKET_ID_V1 = "whw-model-first-3m-ap810-v1" as const;

export type WhwModelFirstLiveBrowserEvidenceResultV1 = {
  contract: typeof WHW_MODEL_FIRST_EVIDENCE_RESULT_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  evidence_mode: "live_browser_model_first_v1";
  evidence_collection_mode: "live_browser_model_first_v1";
  packet_id: typeof WHW_AP810_PACKET_ID_V1;
  run_id: string;
  queue_contract: typeof WHW_MODEL_FIRST_EASIEST_PROOF_QUEUE_CONTRACT_V1;
  anchor_brand_slug: "3m";
  anchor_model_slug: "3m-aquapure-ap801";
  anchor_filter_slug: "3m-ap810";
  filter_slug: "3m-ap810";
  read_only_artifact: true;
  do_not_open_public: true;
  generated_at: string;
  checked_at: string;
  source_status: "PROVEN" | "PARTIAL" | "UNKNOWN";
  model_rows: ModelFirstLiveBrowserModelRowV1[];
  candidate_buyer_paths: ModelFirstCandidateBuyerPathV1[];
  evidence_status_counts: Record<ModelFirstEvidenceRowStatusV1, number>;
  recommended_csv_mutation: null;
  proven_facts: string[];
  inferred_facts: string[];
  unknown_facts: string[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasStatusCounts(
  value: unknown,
): value is Record<string, unknown> & {
  evidence_status_counts: Record<ModelFirstEvidenceRowStatusV1, number>;
} {
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

export function isAllowedWhwModelFirstEvidenceResultRelPathV1(relPath: string): boolean {
  const normalized = relPath.replace(/\\/g, "/");
  if (!normalized.startsWith(`${WHW_MODEL_FIRST_EVIDENCE_RESULTS_DIR_REL_V1}/`)) return false;
  if (!normalized.endsWith(".results.json")) return false;
  if (normalized.includes("..")) return false;
  return true;
}

export function validateWhwModelFirstEvidenceResultV1(
  value: unknown,
): value is WhwModelFirstLiveBrowserEvidenceResultV1 {
  if (!isRecord(value)) return false;
  if (value.contract !== WHW_MODEL_FIRST_EVIDENCE_RESULT_CONTRACT_V1) return false;
  if (value.read_only !== true || value.data_mutation !== false) return false;
  if (value.recommended_csv_mutation !== null) return false;
  if (value.do_not_open_public !== true) return false;
  if (value.evidence_mode !== "live_browser_model_first_v1") return false;
  if (!hasStatusCounts(value)) return false;
  if (!validateLiveBrowserModelRows(value.model_rows)) return false;
  if (!validateCandidateBuyerPaths(value.candidate_buyer_paths)) return false;
  const paths = value.candidate_buyer_paths as ModelFirstCandidateBuyerPathV1[];
  if (paths.some((p) => p.status === "PASS" && !liveBrowserBuyerPathMayRecommendCsvMutationV1(p))) {
    return false;
  }
  if (value.evidence_status_counts.PASS > 0 && paths.every((p) => p.status !== "PASS")) {
    const rows = value.model_rows as ModelFirstLiveBrowserModelRowV1[];
    const modelPass = rows.some((r) => r.evidence_status === "PASS");
    if (modelPass && paths.every((p) => p.status !== "PASS")) {
      // Model-only PASS without buyer PASS is allowed; counts may reflect model row PASS.
    }
  }
  return true;
}

function countModelStatuses(
  rows: ModelFirstLiveBrowserModelRowV1[],
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

/** Live-browser evidence for queue anchor 3m-aquapure-ap801 → 3m-ap810 (May 2026). */
export function buildWhw3mAp810LiveBrowserEvidenceV1(args?: {
  now?: () => Date;
}): WhwModelFirstLiveBrowserEvidenceResultV1 {
  const now = args?.now ?? (() => new Date());
  const iso = now().toISOString();
  const runDay = iso.slice(0, 10);

  const officialAp800HousingPdf =
    "https://multimedia.3m.com/mws/media/1903341O/3m-aqua-pure-ap800-series-whole-house-filter-housings.pdf";
  const officialComparisonChartPdf =
    "https://multimedia.3m.com/mws/media/2337401O/residential-aqua-pure-home-water-filter-comparison-chart.pdf";
  const committedSearchPlaceholder =
    "https://www.3m.com/3M/en_US/water-filtration-us/search/?Ntt=AP810";
  const aquapureDealerPdp =
    "https://www.aquapurefilters.com/products/aqua-pure-ap810-whole-house-water-filter";

  const model_rows: ModelFirstLiveBrowserModelRowV1[] = [
    {
      model_slug: "3m-aquapure-ap801",
      model_number: "AP801",
      official_source_urls: [officialAp800HousingPdf, officialComparisonChartPdf],
      manual_urls: [officialAp800HousingPdf],
      documented_filter_tokens: ["AP810", "5618902"],
      evidence_status: "PASS",
      buyer_path_status: "NO_SAFE_GATED_DIRECT_BUYABLE_IN_COMMITTED_CSV",
      notes:
        "PROVEN: Official 3M AP800 Series housing PDF documents AP801B/AP801T whole-house housings and lists AP810 (5618902) as a replacement cartridge option for AP800-series installs. PROVEN: Official 3M residential comparison chart row AP801B/AP801T → replacement cartridge AP810. PROVEN: Repo maps 3m-aquapure-ap801 → 3m-ap810 with is_recommended=true in data/whole-house-water/compatibility_mappings.csv. INFERRED: Anchor model AP801 is legacy AP800-class single-stage housing; official docs name AP801B/AP801T successors — exact AP801 token not found on a dedicated 3M.com model page in this run. Do not claim unavailable.",
    },
  ];

  const candidate_buyer_paths: ModelFirstCandidateBuyerPathV1[] = [
    {
      url: aquapureDealerPdp,
      retailer_or_source: "aquapurefilters_authorized_dealer",
      exact_token_proof:
        "PROVEN: PDP title and Shopify SKU show Aqua-Pure AP810 / MPN 5618902 (live fetch May 2026). PROVEN: Description lists AP801/AP801B-class compatible systems including Discontinued AP801.",
      buyability_proof:
        "PROVEN: Add to cart control present on live PDP. UNKNOWN: No browser_truth_classification=direct_buyable on file; third-party dealer PDP not verified through launch-buy-links safe CTA gate in this artifact.",
      wrong_family_risk:
        "LOW for AP810 token; listing is cartridge PDP not official 3M.com — do not label compatible-only SKUs as official OEM without separate proof.",
      status: "UNKNOWN",
    },
  ];

  const evidence_status_counts = countModelStatuses(model_rows);

  return {
    contract: WHW_MODEL_FIRST_EVIDENCE_RESULT_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    evidence_mode: "live_browser_model_first_v1",
    evidence_collection_mode: "live_browser_model_first_v1",
    packet_id: WHW_AP810_PACKET_ID_V1,
    run_id: `whw-model-first-3m-ap810-live-browser-${runDay}`,
    queue_contract: WHW_MODEL_FIRST_EASIEST_PROOF_QUEUE_CONTRACT_V1,
    anchor_brand_slug: "3m",
    anchor_model_slug: "3m-aquapure-ap801",
    anchor_filter_slug: "3m-ap810",
    filter_slug: "3m-ap810",
    read_only_artifact: true,
    do_not_open_public: true,
    generated_at: iso,
    checked_at: iso,
    source_status: "PROVEN",
    model_rows,
    candidate_buyer_paths,
    evidence_status_counts,
    recommended_csv_mutation: null,
    proven_facts: [
      "PROVEN: Official 3M AP800 Series housing PDF lists AP810 (5618902) as AP801B/AP801T replacement cartridge option.",
      "PROVEN: Official 3M comparison chart maps AP801B/AP801T whole-house systems to AP810 replacement cartridge.",
      "PROVEN: Committed retailer_links.csv primary for 3m-ap810 is oem-catalog site-search only (0 direct_buyable rows).",
      `PROVEN: Committed primary URL ${committedSearchPlaceholder} is manufacturer site-search — excluded from candidate_buyer_paths (search URLs fail schema validation).`,
      "PROVEN: Aqua-Pure Filters dealer PDP shows AP810 / 5618902 with Add to cart (live fetch May 2026).",
      "PROVEN: recommended_csv_mutation is null — no CSV apply authorized.",
      `PROVEN: whole-house-water launch state remains ${getVerticalLaunchState("whole-house-water")}.`,
    ],
    inferred_facts: [
      "INFERRED: Legacy AP801 anchor model shares AP810 cartridge family with official AP801B/AP801T documentation.",
      "INFERRED: Dealer PDP is a candidate buyer-path follow-up but not yet safe-gated for public CTA without browser truth proof.",
    ],
    unknown_facts: [
      "UNKNOWN: Whether an official 3M.com AP810 product PDP with in-stock direct checkout exists (3m.com product URLs timed out in this run).",
      "UNKNOWN: Whether Amazon or other retailers provide exact AP810/5618902 with clean direct_buyable browser truth.",
      "UNKNOWN: Exact dedicated official support page for legacy AP801 model suffix (vs AP801B/AP801T) on 3m.com.",
    ],
  };
}

export function writeWhwModelFirstEvidenceResultV1(args: {
  rootDir: string;
  result: WhwModelFirstLiveBrowserEvidenceResultV1;
  relPath?: string;
}): string {
  const rel = args.relPath ?? WHW_AP810_LIVE_BROWSER_RESULT_REL_V1;
  if (!isAllowedWhwModelFirstEvidenceResultRelPathV1(rel)) {
    throw new Error(`Refusing to write outside allowed WHW model-first results dir: ${rel}`);
  }
  const abs = path.join(args.rootDir, rel);
  mkdirSync(path.dirname(abs), { recursive: true });
  writeFileSync(abs, `${JSON.stringify(args.result, null, 2)}\n`, "utf8");
  return rel;
}

export function loadWhwModelFirstEvidenceResultV1(args: {
  rootDir: string;
  relPath: string;
  readText?: (absPath: string) => string;
  fileExists?: (absPath: string) => boolean;
}): WhwModelFirstLiveBrowserEvidenceResultV1 | null {
  const fileExists = args.fileExists ?? existsSync;
  const readText = args.readText ?? ((absPath: string) => readFileSync(absPath, "utf8"));
  if (!isAllowedWhwModelFirstEvidenceResultRelPathV1(args.relPath)) return null;
  const abs = path.join(args.rootDir, args.relPath);
  if (!fileExists(abs)) return null;
  try {
    const parsed: unknown = JSON.parse(readText(abs));
    if (!validateWhwModelFirstEvidenceResultV1(parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export type CommittedWhwModelFirstEvidenceResultEntryV1 = {
  relPath: string;
  result: WhwModelFirstLiveBrowserEvidenceResultV1;
};

export type CommittedWhwModelFirstEvidenceResultsLoadV1 = {
  results: CommittedWhwModelFirstEvidenceResultEntryV1[];
  invalid_result_files: string[];
};

export function whwModelFirstResultFilterSlugV1(
  result: WhwModelFirstLiveBrowserEvidenceResultV1,
): string {
  return (result.filter_slug ?? result.anchor_filter_slug).trim().toLowerCase();
}

export function whwModelFirstResultTimestampV1(result: WhwModelFirstLiveBrowserEvidenceResultV1): string {
  if (result.checked_at?.trim()) return result.checked_at;
  return result.generated_at;
}

export function isWhwModelFirstFitPassV1(result: WhwModelFirstLiveBrowserEvidenceResultV1): boolean {
  return result.model_rows.some((row) => row.evidence_status === "PASS");
}

export function isWhwModelFirstNoMutationV1(result: WhwModelFirstLiveBrowserEvidenceResultV1): boolean {
  return result.recommended_csv_mutation === null;
}

export function loadCommittedWhwModelFirstEvidenceResultsV1(args: {
  rootDir: string;
  readText?: (absPath: string) => string;
  fileExists?: (absPath: string) => boolean;
  readdir?: (absDir: string) => string[];
}): CommittedWhwModelFirstEvidenceResultsLoadV1 {
  const fileExists = args.fileExists ?? existsSync;
  const readdir = args.readdir ?? ((absDir: string) => readdirSync(absDir));
  const resultsDirAbs = path.join(args.rootDir, WHW_MODEL_FIRST_EVIDENCE_RESULTS_DIR_REL_V1);
  const invalid_result_files: string[] = [];
  const results: CommittedWhwModelFirstEvidenceResultEntryV1[] = [];

  if (!fileExists(resultsDirAbs)) {
    return { results, invalid_result_files };
  }

  for (const name of readdir(resultsDirAbs)) {
    if (!name.endsWith(".results.json")) continue;
    const relPath = `${WHW_MODEL_FIRST_EVIDENCE_RESULTS_DIR_REL_V1}/${name}`;
    if (!isAllowedWhwModelFirstEvidenceResultRelPathV1(relPath)) {
      invalid_result_files.push(relPath);
      continue;
    }
    const loaded = loadWhwModelFirstEvidenceResultV1({
      rootDir: args.rootDir,
      relPath,
      readText: args.readText,
      fileExists: args.fileExists,
    });
    if (!loaded) {
      invalid_result_files.push(relPath);
      continue;
    }
    results.push({ relPath, result: loaded });
  }

  return { results, invalid_result_files };
}

export function latestCommittedWhwModelFirstResultsByFilterSlugV1(
  load: CommittedWhwModelFirstEvidenceResultsLoadV1,
): Map<string, CommittedWhwModelFirstEvidenceResultEntryV1> {
  const bySlug = new Map<string, CommittedWhwModelFirstEvidenceResultEntryV1>();
  for (const entry of load.results) {
    const slug = whwModelFirstResultFilterSlugV1(entry.result);
    const existing = bySlug.get(slug);
    if (
      !existing ||
      whwModelFirstResultTimestampV1(entry.result) > whwModelFirstResultTimestampV1(existing.result)
    ) {
      bySlug.set(slug, entry);
    }
  }
  return bySlug;
}
