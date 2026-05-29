/**
 * Whole-house-water buyer-path proof v1 — live-browser PDP checks for safe buy paths.
 * References committed model-first artifact; does not redo fit proof.
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { getVerticalLaunchState } from "@/lib/catalog/vertical-launch-state";
import {
  isDirectBuyableSafeCtaRow,
  isManufacturerSiteSearchUrl,
} from "@/lib/retailers/launch-buy-links";

import type { ModelFirstEvidenceRowStatusV1 } from "./air-purifier-model-first-evidence-result-v1";
import {
  WHW_AP810_LIVE_BROWSER_RESULT_REL_V1,
  loadWhwModelFirstEvidenceResultV1,
} from "./whole-house-water-model-first-evidence-result-v1";

export const WHW_BUYER_PATH_PROOF_RESULT_CONTRACT_V1 =
  "whole_house_water_buyer_path_proof_result_v1" as const;

export const WHW_BUYER_PATH_PROOF_RESULTS_DIR_REL_V1 =
  "data/whole-house-water/batch-production/agent-results-buyer-path-v1" as const;

export const WHW_AP810_BUYER_PATH_RESULT_REL_V1 =
  `${WHW_BUYER_PATH_PROOF_RESULTS_DIR_REL_V1}/whw-buyer-path-3m-ap810-live-browser-v1.results.json` as const;

export const WHW_AP810_BUYER_PATH_PACKET_ID_V1 = "whw-buyer-path-3m-ap810-v1" as const;

export type WhwBuyerPathListingKindV1 =
  | "official_oem"
  | "authorized_dealer"
  | "major_retailer"
  | "compatible_replacement"
  | "search_or_catalog";

export type WhwBuyerPathCandidateV1 = {
  url: string;
  retailer_or_source: string;
  listing_kind: WhwBuyerPathListingKindV1;
  exact_token_proof: string;
  buyability_proof: string;
  wrong_family_or_compatible_risk: string;
  buy_action_observed: boolean;
  browser_truth_direct_buyable_proven: boolean;
  passes_launch_buy_links_safe_cta_gate: boolean;
  status: ModelFirstEvidenceRowStatusV1;
};

export type WhwBestTruthfulBuyerPathV1 = {
  url: string;
  retailer_or_source: string;
  exact_token_proof: string;
  buyability_proof: string;
} | null;

export type WhwBuyerPathProofResultV1 = {
  contract: typeof WHW_BUYER_PATH_PROOF_RESULT_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  evidence_mode: "live_browser_buyer_path_v1";
  packet_id: typeof WHW_AP810_BUYER_PATH_PACKET_ID_V1;
  anchor_filter_slug: "3m-ap810";
  source_model_first_artifact: string;
  model_first_fit_status: ModelFirstEvidenceRowStatusV1;
  generated_at: string;
  checked_at: string;
  buyer_path_candidates: WhwBuyerPathCandidateV1[];
  evidence_status_counts: Record<ModelFirstEvidenceRowStatusV1, number>;
  recommended_csv_mutation: null;
  best_truthful_buyer_path: WhwBestTruthfulBuyerPathV1;
  do_not_open_public: true;
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

export function isAllowedWhwBuyerPathProofResultRelPathV1(relPath: string): boolean {
  const normalized = relPath.replace(/\\/g, "/");
  if (!normalized.startsWith(`${WHW_BUYER_PATH_PROOF_RESULTS_DIR_REL_V1}/`)) return false;
  if (!normalized.endsWith(".results.json")) return false;
  if (normalized.includes("..")) return false;
  return true;
}

export function passesLaunchBuyLinksSafeCtaGateForCandidateV1(candidate: {
  url: string;
  retailer_key?: string | null;
  browser_truth_classification?: string | null;
  browser_truth_buyable_subtype?: string | null;
}): boolean {
  return isDirectBuyableSafeCtaRow({
    retailer_key: candidate.retailer_key ?? null,
    affiliate_url: candidate.url,
    browser_truth_classification: candidate.browser_truth_classification ?? null,
    browser_truth_buyable_subtype: candidate.browser_truth_buyable_subtype ?? null,
  });
}

export function buyerPathCandidateMayRecommendCsvMutationV1(
  candidate: WhwBuyerPathCandidateV1,
): boolean {
  if (candidate.status !== "PASS") return false;
  if (!candidate.passes_launch_buy_links_safe_cta_gate) return false;
  const proof = candidate.exact_token_proof.trim();
  if (!proof || proof.toUpperCase().startsWith("UNKNOWN")) return false;
  if (isManufacturerSiteSearchUrl(candidate.url)) return false;
  if (candidate.listing_kind === "compatible_replacement") return false;
  return true;
}

export function finalizeWhwBuyerPathCandidateV1(
  draft: Omit<
    WhwBuyerPathCandidateV1,
    "status" | "passes_launch_buy_links_safe_cta_gate" | "browser_truth_direct_buyable_proven"
  > & {
    browser_truth_classification?: string | null;
    browser_truth_buyable_subtype?: string | null;
    retailer_key?: string | null;
  },
): WhwBuyerPathCandidateV1 {
  const browser_truth_direct_buyable_proven =
    draft.browser_truth_classification?.trim() === "direct_buyable";
  const passes_launch_buy_links_safe_cta_gate = passesLaunchBuyLinksSafeCtaGateForCandidateV1({
    url: draft.url,
    retailer_key: draft.retailer_key ?? null,
    browser_truth_classification: draft.browser_truth_classification ?? null,
    browser_truth_buyable_subtype: draft.browser_truth_buyable_subtype ?? null,
  });

  let status: ModelFirstEvidenceRowStatusV1 = "UNKNOWN";

  if (isManufacturerSiteSearchUrl(draft.url) || draft.listing_kind === "search_or_catalog") {
    status = "FAIL";
  } else if (draft.listing_kind === "compatible_replacement") {
    status = "FAIL";
  } else if (
    browser_truth_direct_buyable_proven &&
    passes_launch_buy_links_safe_cta_gate &&
    draft.buy_action_observed &&
    !draft.exact_token_proof.toUpperCase().startsWith("UNKNOWN")
  ) {
    status = "PASS";
  } else if (!draft.buy_action_observed && draft.listing_kind === "official_oem") {
    status = "FAIL";
  }

  return {
    url: draft.url,
    retailer_or_source: draft.retailer_or_source,
    listing_kind: draft.listing_kind,
    exact_token_proof: draft.exact_token_proof,
    buyability_proof: draft.buyability_proof,
    wrong_family_or_compatible_risk: draft.wrong_family_or_compatible_risk,
    buy_action_observed: draft.buy_action_observed,
    browser_truth_direct_buyable_proven,
    passes_launch_buy_links_safe_cta_gate,
    status,
  };
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

export function validateWhwBuyerPathProofResultV1(value: unknown): value is WhwBuyerPathProofResultV1 {
  if (!isRecord(value)) return false;
  if (value.contract !== WHW_BUYER_PATH_PROOF_RESULT_CONTRACT_V1) return false;
  if (value.read_only !== true || value.data_mutation !== false) return false;
  if (value.evidence_mode !== "live_browser_buyer_path_v1") return false;
  if (value.do_not_open_public !== true) return false;
  if (!hasStatusCounts(value)) return false;
  if (!Array.isArray(value.buyer_path_candidates)) return false;

  const candidates = value.buyer_path_candidates as WhwBuyerPathCandidateV1[];
  for (const c of candidates) {
    if (!c.url || isManufacturerSiteSearchUrl(c.url)) return false;
    if (c.status === "PASS" && !buyerPathCandidateMayRecommendCsvMutationV1(c)) return false;
    if (c.status === "PASS" && c.listing_kind === "compatible_replacement") return false;
  }

  if (value.recommended_csv_mutation !== null) return false;
  if (value.evidence_status_counts.PASS > 0 && value.best_truthful_buyer_path === null) {
    return false;
  }
  if (value.evidence_status_counts.PASS === 0 && value.best_truthful_buyer_path !== null) {
    return false;
  }

  return true;
}

/** Live-browser buyer-path proof for 3m-ap810 (May 2026). */
export function buildWhw3mAp810BuyerPathProofV1(args?: {
  rootDir?: string;
  now?: () => Date;
}): WhwBuyerPathProofResultV1 {
  const rootDir = args?.rootDir ?? process.cwd();
  const now = args?.now ?? (() => new Date());
  const iso = now().toISOString();

  const modelFirst = loadWhwModelFirstEvidenceResultV1({
    rootDir,
    relPath: WHW_AP810_LIVE_BROWSER_RESULT_REL_V1,
  });
  const modelFirstFitStatus: ModelFirstEvidenceRowStatusV1 =
    modelFirst?.model_rows[0]?.evidence_status ?? "UNKNOWN";

  const committedSearchUrl =
    "https://www.3m.com/3M/en_US/water-filtration-us/search/?Ntt=AP810";

  const drafts = [
    finalizeWhwBuyerPathCandidateV1({
      url: "https://www.solventum.com/en-us/home/f/b40070898/",
      retailer_or_source: "solventum_official",
      listing_kind: "official_oem",
      exact_token_proof:
        "PROVEN: Solventum official AP810 product page lists catalog 5618902 / Product ID 7000029442 and AP810 model name (live fetch May 2026).",
      buyability_proof:
        "PROVEN: Page exposes Where to buy only — no Add to Cart / direct checkout on official PDP in this run.",
      wrong_family_or_compatible_risk: "LOW — official OEM reference PDP.",
      buy_action_observed: false,
      retailer_key: "oem-catalog",
    }),
    finalizeWhwBuyerPathCandidateV1({
      url: "https://www.amazon.com/Aqua-Pure-Whole-House-Replacement-Filter/dp/B000W0TTJQ",
      retailer_or_source: "amazon",
      listing_kind: "official_oem",
      exact_token_proof:
        "PROVEN: Amazon PDP title is 3M Aqua-Pure Whole House Replacement Water Filter AP810; Manufacturer Part Number field shows AP810 5618902 (live fetch May 2026).",
      buyability_proof:
        "PROVEN: PDP shows add this item to your cart and New & Used offers from $38.40. UNKNOWN: No browser_truth_classification=direct_buyable captured in this read-only packet.",
      wrong_family_or_compatible_risk:
        "LOW for OEM listing; verify seller is Amazon-shipped OEM not aftermarket compatible-only.",
      buy_action_observed: true,
      retailer_key: "amazon",
    }),
    finalizeWhwBuyerPathCandidateV1({
      url: "https://www.aquapurefilters.com/products/aqua-pure-ap810-whole-house-water-filter",
      retailer_or_source: "aquapurefilters_authorized_dealer",
      listing_kind: "authorized_dealer",
      exact_token_proof:
        "PROVEN: Shopify PDP title Aqua-Pure AP810 (5618902); variant SKU 5618902 (recheck live fetch May 2026).",
      buyability_proof:
        "PROVEN: Add to cart control present. UNKNOWN: No browser_truth direct_buyable proof in this packet.",
      wrong_family_or_compatible_risk:
        "LOW for AP810 OEM SKU; authorized dealer — not official 3M.com checkout.",
      buy_action_observed: true,
      retailer_key: "aquapure-dealer",
    }),
    finalizeWhwBuyerPathCandidateV1({
      url: "https://klearwaterstore.com/3m-aqua-pure-ap810-whole-house-filter-cartridge-5-micron/",
      retailer_or_source: "klearwaterstore",
      listing_kind: "major_retailer",
      exact_token_proof:
        "PROVEN: PDP SKU 5618902; product title 3M Aqua-Pure AP810 (live fetch May 2026).",
      buyability_proof:
        "PROVEN: Adding to cart / quantity controls present. UNKNOWN: No browser_truth direct_buyable proof in this packet.",
      wrong_family_or_compatible_risk: "LOW — lists OEM AP810 not compatible-only branding.",
      buy_action_observed: true,
      retailer_key: "klearwater",
    }),
    finalizeWhwBuyerPathCandidateV1({
      url: "https://www.homedepot.com/p/Waterdrop-AP810-Whole-House-Water-Filter-10-in-x-4-5-in-5-Micron-Replacement-for-3M-Aqua-Pure-AP810-Whirlpool-WHKF-GD25BB-B-WD-AP810-2/333084969",
      retailer_or_source: "home_depot",
      listing_kind: "compatible_replacement",
      exact_token_proof:
        "PROVEN: Primary product is Waterdrop B-WD-AP810-2 compatible replacement — AP810 appears only in compatibility title text, not as sold OEM SKU.",
      buyability_proof:
        "PROVEN: Add to cart may exist on PDP but product is compatible replacement, not official AP810/5618902.",
      wrong_family_or_compatible_risk:
        "HIGH — compatible replacement must not be labeled official OEM.",
      buy_action_observed: true,
      retailer_key: "home-depot",
    }),
    finalizeWhwBuyerPathCandidateV1({
      url: "https://www.amazon.com/AQUACREST-Compatible-Aqua-Pure-Whirlpool-WHKF-GD25BB/dp/B01L069O36",
      retailer_or_source: "amazon",
      listing_kind: "compatible_replacement",
      exact_token_proof:
        "PROVEN: Listing title states AQUACREST Compatible Replacement for Aqua-Pure AP810 — not OEM AP810 cartridge.",
      buyability_proof: "PROVEN: Buy UI may exist but product is third-party compatible, not official.",
      wrong_family_or_compatible_risk: "HIGH — compatible-only; do not treat as official AP810.",
      buy_action_observed: true,
      retailer_key: "amazon",
    }),
  ];

  const buyer_path_candidates = drafts;
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

  return {
    contract: WHW_BUYER_PATH_PROOF_RESULT_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    evidence_mode: "live_browser_buyer_path_v1",
    packet_id: WHW_AP810_BUYER_PATH_PACKET_ID_V1,
    anchor_filter_slug: "3m-ap810",
    source_model_first_artifact: WHW_AP810_LIVE_BROWSER_RESULT_REL_V1,
    model_first_fit_status: modelFirstFitStatus,
    generated_at: iso,
    checked_at: iso,
    buyer_path_candidates,
    evidence_status_counts,
    recommended_csv_mutation: null,
    best_truthful_buyer_path,
    do_not_open_public: true,
    proven_facts: [
      `PROVEN: Model-first artifact ${WHW_AP810_LIVE_BROWSER_RESULT_REL_V1} records fit evidence PASS for 3m-aquapure-ap801 → 3m-ap810.`,
      "PROVEN: Committed data/whole-house-water/retailer_links.csv primary is 3M site-search placeholder with 0 direct_buyable rows.",
      `PROVEN: Committed search URL ${committedSearchUrl} fails launch-buy-links search-placeholder gate (not a PDP candidate row).`,
      "PROVEN: Solventum official AP810 page documents 5618902 but has Where to buy only (no direct checkout).",
      "PROVEN: Amazon B000W0TTJQ and aquapurefilters dealer PDPs show AP810/5618902 with buy UI; no browser_truth direct_buyable proof in this packet.",
      `PROVEN: Buyer-path evidence_status_counts PASS=${evidence_status_counts.PASS} FAIL=${evidence_status_counts.FAIL} UNKNOWN=${evidence_status_counts.UNKNOWN}.`,
      "PROVEN: recommended_csv_mutation remains null.",
      `PROVEN: whole-house-water launch state remains ${getVerticalLaunchState("whole-house-water")}.`,
    ],
    inferred_facts: [
      "INFERRED: Next step is read-only browser_truth capture on the strongest OEM PDP (Amazon B000W0TTJQ or authorized dealer) before any retailer_links.csv change.",
      "INFERRED: Compatible Home Depot / Amazon listings are intentionally ranked FAIL despite buy UI to avoid wrong-family CTAs.",
    ],
    unknown_facts: [
      "UNKNOWN: Whether live browser_truth run will classify Amazon B000W0TTJQ or aquapurefilters as direct_buyable without wrong-family drift.",
      "UNKNOWN: Whether official 3M.com sells AP810 direct-checkout outside Solventum Where to buy flow.",
    ],
  };
}

export function writeWhwBuyerPathProofResultV1(args: {
  rootDir: string;
  result: WhwBuyerPathProofResultV1;
  relPath?: string;
}): string {
  const rel = args.relPath ?? WHW_AP810_BUYER_PATH_RESULT_REL_V1;
  if (!isAllowedWhwBuyerPathProofResultRelPathV1(rel)) {
    throw new Error(`Refusing to write outside allowed WHW buyer-path results dir: ${rel}`);
  }
  const abs = path.join(args.rootDir, rel);
  mkdirSync(path.dirname(abs), { recursive: true });
  writeFileSync(abs, `${JSON.stringify(args.result, null, 2)}\n`, "utf8");
  return rel;
}

export function loadWhwBuyerPathProofResultV1(args: {
  rootDir: string;
  relPath: string;
  readText?: (absPath: string) => string;
  fileExists?: (absPath: string) => boolean;
}): WhwBuyerPathProofResultV1 | null {
  const fileExists = args.fileExists ?? existsSync;
  const readText = args.readText ?? ((absPath: string) => readFileSync(absPath, "utf8"));
  if (!isAllowedWhwBuyerPathProofResultRelPathV1(args.relPath)) return null;
  const abs = path.join(args.rootDir, args.relPath);
  if (!fileExists(abs)) return null;
  try {
    const parsed: unknown = JSON.parse(readText(abs));
    if (!validateWhwBuyerPathProofResultV1(parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export type CommittedWhwBuyerPathProofResultEntryV1 = {
  relPath: string;
  result: WhwBuyerPathProofResultV1;
};

export type CommittedWhwBuyerPathProofResultsLoadV1 = {
  results: CommittedWhwBuyerPathProofResultEntryV1[];
  invalid_result_files: string[];
};

export function whwBuyerPathResultFilterSlugV1(result: WhwBuyerPathProofResultV1): string {
  return result.anchor_filter_slug.trim().toLowerCase();
}

export function whwBuyerPathResultTimestampV1(result: WhwBuyerPathProofResultV1): string {
  if (result.checked_at?.trim()) return result.checked_at;
  return result.generated_at;
}

export function isWhwBuyerPathCheckedNoSafePassV1(result: WhwBuyerPathProofResultV1): boolean {
  if (result.recommended_csv_mutation !== null) return false;
  return result.evidence_status_counts.PASS === 0;
}

export function loadCommittedWhwBuyerPathProofResultsV1(args: {
  rootDir: string;
  readText?: (absPath: string) => string;
  fileExists?: (absPath: string) => boolean;
  readdir?: (absDir: string) => string[];
}): CommittedWhwBuyerPathProofResultsLoadV1 {
  const fileExists = args.fileExists ?? existsSync;
  const readdir = args.readdir ?? ((absDir: string) => readdirSync(absDir));
  const resultsDirAbs = path.join(args.rootDir, WHW_BUYER_PATH_PROOF_RESULTS_DIR_REL_V1);
  const invalid_result_files: string[] = [];
  const results: CommittedWhwBuyerPathProofResultEntryV1[] = [];

  if (!fileExists(resultsDirAbs)) {
    return { results, invalid_result_files };
  }

  for (const name of readdir(resultsDirAbs)) {
    if (!name.endsWith(".results.json")) continue;
    const relPath = `${WHW_BUYER_PATH_PROOF_RESULTS_DIR_REL_V1}/${name}`;
    if (!isAllowedWhwBuyerPathProofResultRelPathV1(relPath)) {
      invalid_result_files.push(relPath);
      continue;
    }
    const loaded = loadWhwBuyerPathProofResultV1({
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

export function latestCommittedWhwBuyerPathResultsByFilterSlugV1(
  load: CommittedWhwBuyerPathProofResultsLoadV1,
): Map<string, CommittedWhwBuyerPathProofResultEntryV1> {
  const bySlug = new Map<string, CommittedWhwBuyerPathProofResultEntryV1>();
  for (const entry of load.results) {
    const slug = whwBuyerPathResultFilterSlugV1(entry.result);
    const existing = bySlug.get(slug);
    if (
      !existing ||
      whwBuyerPathResultTimestampV1(entry.result) > whwBuyerPathResultTimestampV1(existing.result)
    ) {
      bySlug.set(slug, entry);
    }
  }
  return bySlug;
}
