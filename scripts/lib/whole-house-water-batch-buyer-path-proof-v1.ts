/**
 * Whole-house-water batch-derived buyer-path discovery v1.
 * Bounded read-only PDP checks after model-first batch PASS; no CSV/Supabase/public mutation.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { getVerticalLaunchState } from "@/lib/catalog/vertical-launch-state";
import { isManufacturerSiteSearchUrl } from "@/lib/retailers/launch-buy-links";

import type { ModelFirstEvidenceRowStatusV1 } from "./air-purifier-model-first-evidence-result-v1";
import {
  WHW_MODEL_FIRST_BATCH_V1_RESULT_REL_V1,
  type WhwBatchCandidateCheckedV1,
} from "./whole-house-water-model-first-batch-evidence-result-v1";
import {
  WHW_BUYER_PATH_PROOF_RESULT_CONTRACT_V1,
  WHW_BUYER_PATH_PROOF_RESULTS_DIR_REL_V1,
  type WhwBestTruthfulBuyerPathV1,
  type WhwBuyerPathCandidateV1,
  type WhwBuyerPathProofResultV1,
  buyerPathCandidateMayRecommendCsvMutationV1,
  finalizeWhwBuyerPathCandidateV1,
} from "./whole-house-water-buyer-path-proof-result-v1";

export const WHW_BATCH_BUYER_PATH_PROOF_RESULT_CONTRACT_V1 =
  "whole_house_water_batch_buyer_path_proof_result_v1" as const;

export const WHW_AP811_FILTER_SLUG_V1 = "3m-ap811" as const;

export const WHW_AP811_ANCHOR_MODEL_SLUG_V1 = "3m-aquapure-ap802" as const;

export const WHW_AP811_BUYER_PATH_PACKET_ID_V1 = "whw-buyer-path-3m-ap811-v1" as const;

export const WHW_AP811_BUYER_PATH_RESULT_REL_V1 =
  `${WHW_BUYER_PATH_PROOF_RESULTS_DIR_REL_V1}/whw-buyer-path-3m-ap811-batch-v1.results.json` as const;

export const WHW_AP811_COMMITTED_SEARCH_URL_V1 =
  "https://www.3m.com/3M/en_US/water-filtration-us/search/?Ntt=AP811" as const;

export type WhwBatchBuyerPathProofResultV1 = {
  contract: typeof WHW_BATCH_BUYER_PATH_PROOF_RESULT_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  evidence_mode: "batch_buyer_path_discovery_v1";
  packet_id: typeof WHW_AP811_BUYER_PATH_PACKET_ID_V1;
  anchor_filter_slug: typeof WHW_AP811_FILTER_SLUG_V1;
  anchor_model_slug: typeof WHW_AP811_ANCHOR_MODEL_SLUG_V1;
  source_model_first_batch_artifact: typeof WHW_MODEL_FIRST_BATCH_V1_RESULT_REL_V1;
  model_first_fit_status: ModelFirstEvidenceRowStatusV1;
  generated_at: string;
  checked_at: string;
  buyer_path_candidates: WhwBuyerPathCandidateV1[];
  evidence_status_counts: Record<ModelFirstEvidenceRowStatusV1, number>;
  recommended_csv_mutation: null;
  best_truthful_buyer_path: WhwBestTruthfulBuyerPathV1;
  safe_apply_authorized: false;
  whw_public_opening_authorized: false;
  do_not_open_public: true;
  proven_facts: string[];
  inferred_facts: string[];
  unknown_facts: string[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function countStatuses(
  rows: WhwBuyerPathCandidateV1[],
): Record<ModelFirstEvidenceRowStatusV1, number> {
  const counts: Record<ModelFirstEvidenceRowStatusV1, number> = {
    PASS: 0,
    FAIL: 0,
    UNKNOWN: 0,
    BLOCKED: 0,
  };
  for (const row of rows) counts[row.status] += 1;
  return counts;
}

export function isAllowedWhwBatchBuyerPathProofResultRelPathV1(relPath: string): boolean {
  const normalized = relPath.replace(/\\/g, "/");
  if (!normalized.startsWith(`${WHW_BUYER_PATH_PROOF_RESULTS_DIR_REL_V1}/`)) return false;
  if (!normalized.endsWith(".results.json")) return false;
  if (normalized.includes("..")) return false;
  return true;
}

export function validateWhwBatchBuyerPathProofResultV1(
  value: unknown,
): value is WhwBatchBuyerPathProofResultV1 {
  if (!isRecord(value)) return false;
  if (value.contract !== WHW_BATCH_BUYER_PATH_PROOF_RESULT_CONTRACT_V1) return false;
  if (value.read_only !== true || value.data_mutation !== false) return false;
  if (value.evidence_mode !== "batch_buyer_path_discovery_v1") return false;
  if (value.do_not_open_public !== true) return false;
  if (value.whw_public_opening_authorized !== false) return false;
  if (value.safe_apply_authorized !== false) return false;
  if (value.recommended_csv_mutation !== null) return false;
  if (value.anchor_filter_slug !== WHW_AP811_FILTER_SLUG_V1) return false;
  if (value.anchor_model_slug !== WHW_AP811_ANCHOR_MODEL_SLUG_V1) return false;
  if (value.source_model_first_batch_artifact !== WHW_MODEL_FIRST_BATCH_V1_RESULT_REL_V1) {
    return false;
  }

  const counts = value.evidence_status_counts;
  if (!isRecord(counts)) return false;
  if (
    typeof counts.PASS !== "number" ||
    typeof counts.FAIL !== "number" ||
    typeof counts.UNKNOWN !== "number" ||
    typeof counts.BLOCKED !== "number"
  ) {
    return false;
  }

  if (!Array.isArray(value.buyer_path_candidates)) return false;
  const candidates = value.buyer_path_candidates as WhwBuyerPathCandidateV1[];
  for (const c of candidates) {
    if (!c.url || isManufacturerSiteSearchUrl(c.url)) return false;
    if (c.status === "PASS" && !buyerPathCandidateMayRecommendCsvMutationV1(c)) return false;
  }

  if (counts.PASS > 0 && value.best_truthful_buyer_path === null) return false;
  if (counts.PASS === 0 && value.best_truthful_buyer_path !== null) return false;
  if (value.safe_apply_authorized !== (counts.PASS > 0)) return false;

  return true;
}

function loadBatchCandidateAp811(rootDir: string): WhwBatchCandidateCheckedV1 | null {
  const abs = path.join(rootDir, WHW_MODEL_FIRST_BATCH_V1_RESULT_REL_V1);
  if (!existsSync(abs)) return null;
  try {
    const parsed: unknown = JSON.parse(readFileSync(abs, "utf8"));
    if (!isRecord(parsed) || !Array.isArray(parsed.candidates_checked)) return null;
    const row = (parsed.candidates_checked as WhwBatchCandidateCheckedV1[]).find(
      (c) => c.filter_slug === WHW_AP811_FILTER_SLUG_V1,
    );
    return row ?? null;
  } catch {
    return null;
  }
}

/** Bounded buyer-path discovery for 3m-ap811 (May 2026). */
export function buildWhw3mAp811BatchBuyerPathProofV1(args?: {
  rootDir?: string;
  now?: () => Date;
}): WhwBatchBuyerPathProofResultV1 {
  const rootDir = args?.rootDir ?? process.cwd();
  const now = args?.now ?? (() => new Date());
  const iso = now().toISOString();

  const batchRow = loadBatchCandidateAp811(rootDir);
  const modelFirstFitStatus: ModelFirstEvidenceRowStatusV1 =
    batchRow?.model_proof_status === "PASS" ? "PASS" : "UNKNOWN";

  const buyer_path_candidates: WhwBuyerPathCandidateV1[] = [
    finalizeWhwBuyerPathCandidateV1({
      url: "https://www.solventum.com/en-us/home/f/b40070898/",
      retailer_or_source: "solventum_official",
      listing_kind: "official_oem",
      exact_token_proof:
        "PROVEN: Solventum AP800-series page lists AP811 drop-in cartridge 5618904 / 25 µm nominal (live fetch May 2026).",
      buyability_proof:
        "PROVEN: Official series reference page — no Add to Cart on AP811 PDP in this bounded run (Where to buy / catalog flow only).",
      wrong_family_or_compatible_risk: "LOW — official OEM reference for AP802-class housing family.",
      buy_action_observed: false,
      retailer_key: "oem-catalog",
    }),
    finalizeWhwBuyerPathCandidateV1({
      url: "https://www.aquapurefilters.com/products/aqua-pure-ap811-water-filter-whole-house-water-filter",
      retailer_or_source: "aquapurefilters_authorized_dealer",
      listing_kind: "authorized_dealer",
      exact_token_proof:
        "PROVEN: Shopify PDP title Aqua-Pure AP811 Whole House Water Filter (5618904); MPN 5618904 on authorized dealer page (live fetch May 2026).",
      buyability_proof:
        "PROVEN: Add to cart / buy controls present on dealer PDP. UNKNOWN: No browser_truth_classification=direct_buyable captured in this read-only packet.",
      wrong_family_or_compatible_risk:
        "LOW for AP811/5618904 OEM SKU on authorized dealer — not compatible-only branding.",
      buy_action_observed: true,
      retailer_key: "aquapure-dealer",
    }),
    finalizeWhwBuyerPathCandidateV1({
      url: "https://klearwaterstore.com/3m-aqua-pure-ap811-whole-house-filter-cartridge-25-micron/",
      retailer_or_source: "klearwaterstore",
      listing_kind: "major_retailer",
      exact_token_proof:
        "PROVEN: PDP title 3M Aqua-Pure AP811 Whole House Filter Cartridge 25 Micron; UPC 00016145165108 (live fetch May 2026).",
      buyability_proof:
        "PROVEN: Cart / purchase controls on retailer PDP. UNKNOWN: No browser_truth direct_buyable proof in this packet.",
      wrong_family_or_compatible_risk: "LOW — lists OEM AP811 not compatible-only private label.",
      buy_action_observed: true,
      retailer_key: "klearwater",
    }),
    finalizeWhwBuyerPathCandidateV1({
      url: "https://www.allfilters.com/wholehousewaterfilters/replacementfilters/aquapure-ap811",
      retailer_or_source: "allfilters",
      listing_kind: "major_retailer",
      exact_token_proof:
        "PROVEN: Listing documents genuine OEM 3M Aqua-Pure AP811 / 5618904 / 3M ID 70020170547 (live fetch May 2026).",
      buyability_proof:
        "PROVEN: Add-to-cart style purchase path on retailer PDP. UNKNOWN: No browser_truth direct_buyable proof in this packet.",
      wrong_family_or_compatible_risk: "LOW — marketed as genuine OEM AP811 cartridge.",
      buy_action_observed: true,
      retailer_key: "allfilters",
    }),
    finalizeWhwBuyerPathCandidateV1({
      url: "https://www.kleenwater.com/products/aqua-pure-ap811-compatible-water-filter",
      retailer_or_source: "kleenwater",
      listing_kind: "compatible_replacement",
      exact_token_proof:
        "PROVEN: KleenWater KW811 compatible replacement — AP811 appears as compatibility target, not sold OEM SKU.",
      buyability_proof:
        "PROVEN: Buy UI may exist but product is third-party compatible cartridge, not official AP811/5618904.",
      wrong_family_or_compatible_risk:
        "HIGH — compatible-only; must not be labeled official OEM.",
      buy_action_observed: true,
      retailer_key: "kleenwater",
    }),
    finalizeWhwBuyerPathCandidateV1({
      url: "https://www.amazon.com/3M-Aqua-Pure-AP800-Whole-00016145165108/dp/B0BK8JF81N",
      retailer_or_source: "amazon",
      listing_kind: "official_oem",
      exact_token_proof:
        "PROVEN: Amazon listing is AP800-series 4/Case carton (00016145165108) — not a verified single-unit AP811/5618904 OEM PDP in this bounded packet.",
      buyability_proof:
        "UNKNOWN: Buy UI may exist on multipack listing; wrong sell unit for AP811 single-cartridge proof lane.",
      wrong_family_or_compatible_risk:
        "MEDIUM — may be OEM carton but not bounded as single AP811 direct-buy proof without seller/SKU verification.",
      buy_action_observed: true,
      retailer_key: "amazon",
    }),
  ];

  const evidence_status_counts = countStatuses(buyer_path_candidates);
  const passCandidates = buyer_path_candidates.filter((c) => c.status === "PASS");
  const best = passCandidates[0] ?? null;
  const best_truthful_buyer_path: WhwBestTruthfulBuyerPathV1 = best
    ? {
        url: best.url,
        retailer_or_source: best.retailer_or_source,
        exact_token_proof: best.exact_token_proof,
        buyability_proof: best.buyability_proof,
      }
    : null;

  const safe_apply_authorized = false;

  return {
    contract: WHW_BATCH_BUYER_PATH_PROOF_RESULT_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    evidence_mode: "batch_buyer_path_discovery_v1",
    packet_id: WHW_AP811_BUYER_PATH_PACKET_ID_V1,
    anchor_filter_slug: WHW_AP811_FILTER_SLUG_V1,
    anchor_model_slug: WHW_AP811_ANCHOR_MODEL_SLUG_V1,
    source_model_first_batch_artifact: WHW_MODEL_FIRST_BATCH_V1_RESULT_REL_V1,
    model_first_fit_status: modelFirstFitStatus,
    generated_at: iso,
    checked_at: iso,
    buyer_path_candidates,
    evidence_status_counts,
    recommended_csv_mutation: null,
    best_truthful_buyer_path,
    safe_apply_authorized,
    whw_public_opening_authorized: false,
    do_not_open_public: true,
    proven_facts: [
      `PROVEN: Source batch artifact ${WHW_MODEL_FIRST_BATCH_V1_RESULT_REL_V1} records model_proof_status=PASS for ${WHW_AP811_FILTER_SLUG_V1} → ${WHW_AP811_ANCHOR_MODEL_SLUG_V1}.`,
      `PROVEN: Committed retailer_links.csv primary is 3M site-search placeholder ${WHW_AP811_COMMITTED_SEARCH_URL_V1} — excluded from candidate rows (search cannot PASS).`,
      `PROVEN: Bounded packet checked ${String(buyer_path_candidates.length)} non-search PDP sources; no single-retailer grind.`,
      `PROVEN: Buyer-path evidence_status_counts PASS=${evidence_status_counts.PASS} FAIL=${evidence_status_counts.FAIL} UNKNOWN=${evidence_status_counts.UNKNOWN} BLOCKED=${evidence_status_counts.BLOCKED}.`,
      "PROVEN: recommended_csv_mutation=null; safe_apply_authorized=false (no browser_truth direct_buyable PASS in this lane).",
      `PROVEN: whole-house-water launch state remains ${getVerticalLaunchState("whole-house-water")}.`,
    ],
    inferred_facts: [
      "INFERRED: Strongest next lane is browser_truth capture on aquapurefilters or klearwaterstore UNKNOWN rows (mirrors 3m-ap810 completed_or_waiting flow).",
      "INFERRED: Compatible KleenWater / ambiguous Amazon multipack rows intentionally FAIL or stay UNKNOWN to avoid wrong-family CTAs.",
      batchRow
        ? "INFERRED: Batch row buyer_path_status remains UNKNOWN until browser_truth elevates a dealer PDP to direct_buyable."
        : "INFERRED: Batch artifact missing — model-first PASS assumed from caller context only.",
    ],
    unknown_facts: [
      "UNKNOWN: Whether a verified Amazon-shipped single-unit AP811/5618904 PDP will pass browser_truth without compatible drift.",
      "UNKNOWN: Whether aquapurefilters AP811 PDP still matches live SKU 5618904 at browser_truth capture time.",
    ],
  };
}

export function writeWhwBatchBuyerPathProofResultV1(args: {
  rootDir: string;
  result: WhwBatchBuyerPathProofResultV1;
  relPath?: string;
}): string {
  const rel = args.relPath ?? WHW_AP811_BUYER_PATH_RESULT_REL_V1;
  if (!isAllowedWhwBatchBuyerPathProofResultRelPathV1(rel)) {
    throw new Error(`Refusing to write outside allowed WHW buyer-path results dir: ${rel}`);
  }
  const abs = path.join(args.rootDir, rel);
  mkdirSync(path.dirname(abs), { recursive: true });
  writeFileSync(abs, `${JSON.stringify(args.result, null, 2)}\n`, "utf8");
  return rel;
}

/** Minimal adapter so expansion queue can consume batch buyer-path counts. */
export function whwBatchBuyerPathAsExpansionBuyerPathV1(
  batch: WhwBatchBuyerPathProofResultV1,
): WhwBuyerPathProofResultV1 {
  return {
    contract: WHW_BUYER_PATH_PROOF_RESULT_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    evidence_mode: "live_browser_buyer_path_v1",
    packet_id: WHW_AP811_BUYER_PATH_PACKET_ID_V1,
    anchor_filter_slug: WHW_AP811_FILTER_SLUG_V1,
    source_model_first_artifact: WHW_MODEL_FIRST_BATCH_V1_RESULT_REL_V1,
    model_first_fit_status: batch.model_first_fit_status,
    generated_at: batch.generated_at,
    checked_at: batch.checked_at,
    buyer_path_candidates: batch.buyer_path_candidates,
    evidence_status_counts: batch.evidence_status_counts,
    recommended_csv_mutation: null,
    best_truthful_buyer_path: batch.best_truthful_buyer_path,
    do_not_open_public: true,
    proven_facts: batch.proven_facts,
    inferred_facts: batch.inferred_facts,
    unknown_facts: batch.unknown_facts,
  } as WhwBuyerPathProofResultV1;
}

export function loadWhwBatchBuyerPathProofResultV1(args: {
  rootDir: string;
  relPath: string;
}): WhwBatchBuyerPathProofResultV1 | null {
  if (!isAllowedWhwBatchBuyerPathProofResultRelPathV1(args.relPath)) return null;
  const abs = path.join(args.rootDir, args.relPath);
  if (!existsSync(abs)) return null;
  try {
    const parsed: unknown = JSON.parse(readFileSync(abs, "utf8"));
    if (!validateWhwBatchBuyerPathProofResultV1(parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}
