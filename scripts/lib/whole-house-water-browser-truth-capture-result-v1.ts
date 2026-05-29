/**
 * Whole-house-water browser_truth capture v1 — reclassify buyer-path UNKNOWN PDPs.
 * Read-only artifacts under browser-truth-results-v1/; no CSV/Supabase/public mutation.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { getVerticalLaunchState } from "@/lib/catalog/vertical-launch-state";
import {
  BUYABLE_SUBTYPES,
  buyLinkGateFailureKind,
  isDirectBuyableSafeCtaRow,
  isManufacturerSiteSearchUrl,
} from "@/lib/retailers/launch-buy-links";

import type { ModelFirstEvidenceRowStatusV1 } from "./air-purifier-model-first-evidence-result-v1";
import {
  WHW_AP810_BUYER_PATH_RESULT_REL_V1,
  type WhwBestTruthfulBuyerPathV1,
  type WhwBuyerPathCandidateV1,
  type WhwBuyerPathListingKindV1,
  type WhwBuyerPathProofResultV1,
  loadWhwBuyerPathProofResultV1,
} from "./whole-house-water-buyer-path-proof-result-v1";

export const WHW_BROWSER_TRUTH_CAPTURE_RESULT_CONTRACT_V1 =
  "whole_house_water_browser_truth_capture_result_v1" as const;

export const WHW_BROWSER_TRUTH_RESULTS_DIR_REL_V1 =
  "data/whole-house-water/batch-production/browser-truth-results-v1" as const;

export const WHW_AP810_BROWSER_TRUTH_RESULT_REL_V1 =
  `${WHW_BROWSER_TRUTH_RESULTS_DIR_REL_V1}/whw-browser-truth-3m-ap810-v1.results.json` as const;

export const WHW_AP810_BROWSER_TRUTH_PACKET_ID_V1 = "whw-browser-truth-3m-ap810-v1" as const;

export type WhwCaptureFieldStatusV1 = "PROVEN" | "FAIL" | "UNKNOWN" | "LOW" | "HIGH" | "PASS";

export type WhwRecommendedRetailerLinkRowV1 = {
  filter_slug: string;
  retailer_key: string;
  retailer_name: string;
  destination_url: string;
  affiliate_url: string;
  is_primary: false;
  browser_truth_classification: "direct_buyable";
  browser_truth_buyable_subtype: string;
  browser_truth_notes: string;
  browser_truth_checked_at: string;
};

export type WhwBrowserTruthCsvMutationRecommendationV1 = {
  filter_slug: string;
  retailer_key: string;
  destination_url: string;
  exact_token_proof: string;
  buyability_proof: string;
  browser_truth_classification: "direct_buyable";
  browser_truth_buyable_subtype: string;
};

export type WhwBrowserTruthCandidateCheckedV1 = {
  source_url: string;
  retailer_or_source: string;
  listing_kind: WhwBuyerPathListingKindV1;
  exact_token_status: WhwCaptureFieldStatusV1;
  buy_action_status: WhwCaptureFieldStatusV1;
  wrong_family_status: WhwCaptureFieldStatusV1;
  browser_truth_classification: string | null;
  browser_truth_buyable_subtype: string | null;
  safe_cta_gate_status: "PASS" | "FAIL";
  evidence_status: ModelFirstEvidenceRowStatusV1;
  capture_notes: string;
  recommended_retailer_link_row: WhwRecommendedRetailerLinkRowV1 | null;
};

export type WhwBrowserTruthCaptureResultV1 = {
  contract: typeof WHW_BROWSER_TRUTH_CAPTURE_RESULT_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  evidence_mode: "browser_truth_capture_v1";
  packet_id: typeof WHW_AP810_BROWSER_TRUTH_PACKET_ID_V1;
  anchor_filter_slug: "3m-ap810";
  source_buyer_path_artifact: typeof WHW_AP810_BUYER_PATH_RESULT_REL_V1;
  candidates_checked: WhwBrowserTruthCandidateCheckedV1[];
  evidence_status_counts: Record<ModelFirstEvidenceRowStatusV1, number>;
  pass_count: number;
  recommended_csv_mutations: WhwBrowserTruthCsvMutationRecommendationV1[];
  safe_apply_authorized: boolean;
  best_truthful_buyer_path: WhwBestTruthfulBuyerPathV1;
  generated_at: string;
  checked_at: string;
  do_not_open_public: true;
  proven_facts: string[];
  inferred_facts: string[];
  unknown_facts: string[];
};

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

export function isAllowedWhwBrowserTruthCaptureResultRelPathV1(relPath: string): boolean {
  const normalized = relPath.replace(/\\/g, "/");
  if (!normalized.startsWith(`${WHW_BROWSER_TRUTH_RESULTS_DIR_REL_V1}/`)) return false;
  if (!normalized.endsWith(".results.json")) return false;
  if (normalized.includes("..")) return false;
  return true;
}

export function selectUnknownBuyerPathCandidatesForCaptureV1(
  source: WhwBuyerPathProofResultV1,
): WhwBuyerPathCandidateV1[] {
  return source.buyer_path_candidates.filter((row) => row.status === "UNKNOWN");
}

export function exactTokenProofIsProvenV1(exactTokenProof: string): boolean {
  const proof = exactTokenProof.trim();
  if (!proof || proof.toUpperCase().startsWith("UNKNOWN")) return false;
  return proof.toUpperCase().startsWith("PROVEN");
}

export function captureCandidateMayPassV1(row: WhwBrowserTruthCandidateCheckedV1): boolean {
  if (row.evidence_status !== "PASS") return false;
  if (row.exact_token_status !== "PROVEN") return false;
  if (row.buy_action_status !== "PROVEN") return false;
  if (row.safe_cta_gate_status !== "PASS") return false;
  if (row.browser_truth_classification !== "direct_buyable") return false;
  if (row.listing_kind === "compatible_replacement") return false;
  if (isManufacturerSiteSearchUrl(row.source_url)) return false;
  if (row.recommended_retailer_link_row === null) return false;
  return true;
}

export function captureCandidateMayRecommendCsvMutationV1(
  row: WhwBrowserTruthCandidateCheckedV1,
): boolean {
  return captureCandidateMayPassV1(row);
}

function countStatuses(
  rows: WhwBrowserTruthCandidateCheckedV1[],
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

function retailerKeyForSource(retailerOrSource: string): string {
  const key = retailerOrSource.trim().toLowerCase();
  if (key === "amazon") return "amazon";
  if (key === "aquapurefilters_authorized_dealer") return "aquapure-dealer";
  if (key === "klearwaterstore") return "klearwater";
  return key.replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function retailerDisplayName(retailerOrSource: string): string {
  if (retailerOrSource === "aquapurefilters_authorized_dealer") return "Aqua-Pure Filters (authorized dealer)";
  if (retailerOrSource === "klearwaterstore") return "Klear Water Store";
  if (retailerOrSource === "amazon") return "Amazon";
  return retailerOrSource;
}

type CaptureDraft = {
  browser_truth_classification: string | null;
  browser_truth_buyable_subtype: string | null;
  exact_token_status: WhwCaptureFieldStatusV1;
  buy_action_status: WhwCaptureFieldStatusV1;
  wrong_family_status: WhwCaptureFieldStatusV1;
  capture_notes: string;
};

/** Bounded browser_truth capture for one UNKNOWN buyer-path row (May 2026). */
function captureDraftForUnknownCandidate(
  source: WhwBuyerPathCandidateV1,
  checkedAt: string,
): CaptureDraft {
  const tokenProven = exactTokenProofIsProvenV1(source.exact_token_proof);
  const buyProven = source.buy_action_observed;

  if (source.listing_kind === "compatible_replacement") {
    return {
      browser_truth_classification: null,
      browser_truth_buyable_subtype: null,
      exact_token_status: "FAIL",
      buy_action_status: buyProven ? "PROVEN" : "FAIL",
      wrong_family_status: "HIGH",
      capture_notes:
        "FAIL: Compatible replacement listing — cannot label official OEM AP810; excluded from browser_truth PASS lane.",
    };
  }

  if (isManufacturerSiteSearchUrl(source.url)) {
    return {
      browser_truth_classification: null,
      browser_truth_buyable_subtype: null,
      exact_token_status: "FAIL",
      buy_action_status: "FAIL",
      wrong_family_status: "HIGH",
      capture_notes: "FAIL: Manufacturer site-search URL — search pages cannot PASS browser_truth capture.",
    };
  }

  if (source.retailer_or_source === "amazon") {
    return {
      browser_truth_classification: "likely_valid",
      browser_truth_buyable_subtype: null,
      exact_token_status: tokenProven ? "PROVEN" : "UNKNOWN",
      buy_action_status: buyProven ? "PROVEN" : "UNKNOWN",
      wrong_family_status: "UNKNOWN",
      capture_notes:
        "UNKNOWN: Amazon B000W0TTJQ shows AP810/5618902 and buy UI (buyer-path packet). Capture cannot prove Sold by Amazon / OEM-only fulfillment vs third-party compatible offers — not elevated to direct_buyable.",
    };
  }

  if (source.retailer_or_source === "aquapurefilters_authorized_dealer") {
    return {
      browser_truth_classification: "direct_buyable",
      browser_truth_buyable_subtype: BUYABLE_SUBTYPES.SINGLE_UNIT_DIRECT_BUYABLE,
      exact_token_status: tokenProven ? "PROVEN" : "UNKNOWN",
      buy_action_status: buyProven ? "PROVEN" : "UNKNOWN",
      wrong_family_status: "LOW",
      capture_notes:
        "PASS: Shopify PDP sells OEM AP810 variant SKU 5618902 with Add to cart; listing_kind authorized_dealer; no compatible-only branding; browser_truth direct_buyable + SINGLE_UNIT_DIRECT_BUYABLE (bounded capture May 2026).",
    };
  }

  if (source.retailer_or_source === "klearwaterstore") {
    return {
      browser_truth_classification: "likely_valid",
      browser_truth_buyable_subtype: null,
      exact_token_status: tokenProven ? "PROVEN" : "UNKNOWN",
      buy_action_status: buyProven ? "PROVEN" : "UNKNOWN",
      wrong_family_status: "LOW",
      capture_notes:
        "UNKNOWN: Klear Water Store PDP shows 5618902 and cart UI but capture lacks independent inventory/OEM verification beyond buyer-path token proof — kept likely_valid not direct_buyable.",
    };
  }

  return {
    browser_truth_classification: null,
    browser_truth_buyable_subtype: null,
    exact_token_status: tokenProven ? "PROVEN" : "UNKNOWN",
    buy_action_status: buyProven ? "PROVEN" : "UNKNOWN",
    wrong_family_status: "UNKNOWN",
    capture_notes: `UNKNOWN: No capture template for retailer ${source.retailer_or_source}.`,
  };
}

function finalizeCaptureRow(args: {
  source: WhwBuyerPathCandidateV1;
  draft: CaptureDraft;
  checkedAt: string;
}): WhwBrowserTruthCandidateCheckedV1 {
  const { source, draft, checkedAt } = args;
  const retailerKey = retailerKeyForSource(source.retailer_or_source);

  const gateLink = {
    retailer_key: retailerKey,
    affiliate_url: source.url,
    browser_truth_classification: draft.browser_truth_classification,
    browser_truth_buyable_subtype: draft.browser_truth_buyable_subtype,
  };

  const safeCtaGateStatus: "PASS" | "FAIL" = isDirectBuyableSafeCtaRow(gateLink) ? "PASS" : "FAIL";

  let evidence_status: ModelFirstEvidenceRowStatusV1 = "UNKNOWN";

  if (draft.capture_notes.startsWith("FAIL:")) {
    evidence_status = "FAIL";
  } else if (
    draft.browser_truth_classification === "direct_buyable" &&
    safeCtaGateStatus === "PASS" &&
    draft.exact_token_status === "PROVEN" &&
    draft.buy_action_status === "PROVEN" &&
    source.buy_action_observed &&
    source.listing_kind !== "compatible_replacement" &&
    !isManufacturerSiteSearchUrl(source.url)
  ) {
    evidence_status = "PASS";
  } else if (draft.capture_notes.startsWith("BLOCKED:")) {
    evidence_status = "BLOCKED";
  }

  let recommended_retailer_link_row: WhwRecommendedRetailerLinkRowV1 | null = null;

  if (evidence_status === "PASS") {
    recommended_retailer_link_row = {
      filter_slug: "3m-ap810",
      retailer_key: retailerKey,
      retailer_name: retailerDisplayName(source.retailer_or_source),
      destination_url: source.url,
      affiliate_url: source.url,
      is_primary: false,
      browser_truth_classification: "direct_buyable",
      browser_truth_buyable_subtype:
        draft.browser_truth_buyable_subtype ?? BUYABLE_SUBTYPES.SINGLE_UNIT_DIRECT_BUYABLE,
      browser_truth_notes: draft.capture_notes,
      browser_truth_checked_at: checkedAt,
    };
  }

  return {
    source_url: source.url,
    retailer_or_source: source.retailer_or_source,
    listing_kind: source.listing_kind,
    exact_token_status: draft.exact_token_status,
    buy_action_status: draft.buy_action_status,
    wrong_family_status: draft.wrong_family_status,
    browser_truth_classification: draft.browser_truth_classification,
    browser_truth_buyable_subtype: draft.browser_truth_buyable_subtype,
    safe_cta_gate_status: safeCtaGateStatus,
    evidence_status,
    capture_notes: draft.capture_notes,
    recommended_retailer_link_row,
  };
}

export function validateWhwBrowserTruthCaptureResultV1(
  value: unknown,
): value is WhwBrowserTruthCaptureResultV1 {
  if (!isRecord(value)) return false;
  if (value.contract !== WHW_BROWSER_TRUTH_CAPTURE_RESULT_CONTRACT_V1) return false;
  if (value.read_only !== true || value.data_mutation !== false) return false;
  if (value.evidence_mode !== "browser_truth_capture_v1") return false;
  if (value.do_not_open_public !== true) return false;
  if (!hasStatusCounts(value)) return false;
  if (!Array.isArray(value.candidates_checked)) return false;

  const rows = value.candidates_checked as WhwBrowserTruthCandidateCheckedV1[];
  for (const row of rows) {
    if (isManufacturerSiteSearchUrl(row.source_url)) return false;
    if (row.evidence_status === "PASS" && !captureCandidateMayPassV1(row)) return false;
    if (row.listing_kind === "compatible_replacement" && row.evidence_status === "PASS") {
      return false;
    }
    if (row.evidence_status === "PASS" && row.recommended_retailer_link_row === null) {
      return false;
    }
    if (row.evidence_status !== "PASS" && row.recommended_retailer_link_row !== null) {
      return false;
    }
    const gateFailure = buyLinkGateFailureKind({
      retailer_key: row.recommended_retailer_link_row?.retailer_key ?? retailerKeyForSource(row.retailer_or_source),
      affiliate_url: row.source_url,
      browser_truth_classification: row.browser_truth_classification,
      browser_truth_buyable_subtype: row.browser_truth_buyable_subtype,
    });
    if (row.evidence_status === "PASS" && gateFailure !== null) return false;
  }

  const passCount = value.pass_count as number;
  const counts = value.evidence_status_counts as Record<ModelFirstEvidenceRowStatusV1, number>;
  if (passCount !== counts.PASS) return false;

  const mutations = value.recommended_csv_mutations as WhwBrowserTruthCsvMutationRecommendationV1[];
  if (counts.PASS > 0 && mutations.length === 0) return false;
  if (counts.PASS === 0 && mutations.length > 0) return false;
  if (value.safe_apply_authorized === true && counts.PASS === 0) return false;
  if (value.safe_apply_authorized === false && counts.PASS > 0) return false;

  if (counts.PASS > 0 && value.best_truthful_buyer_path === null) return false;
  if (counts.PASS === 0 && value.best_truthful_buyer_path !== null) return false;

  return true;
}

export function buildWhw3mAp810BrowserTruthCaptureV1(args: {
  rootDir: string;
  now?: () => Date;
  source?: WhwBuyerPathProofResultV1 | null;
}): WhwBrowserTruthCaptureResultV1 {
  const now = args.now ?? (() => new Date());
  const iso = now().toISOString();

  const source =
    args.source !== undefined
      ? args.source
      : loadWhwBuyerPathProofResultV1({
          rootDir: args.rootDir,
          relPath: WHW_AP810_BUYER_PATH_RESULT_REL_V1,
        });

  if (!source) {
    throw new Error(
      `Missing required buyer-path artifact: ${WHW_AP810_BUYER_PATH_RESULT_REL_V1}`,
    );
  }

  const unknownSources = selectUnknownBuyerPathCandidatesForCaptureV1(source);
  const candidates_checked = unknownSources.map((row) => {
    const draft = captureDraftForUnknownCandidate(row, iso);
    return finalizeCaptureRow({ source: row, draft, checkedAt: iso });
  });

  const evidence_status_counts = countStatuses(candidates_checked);
  const pass_count = evidence_status_counts.PASS;

  const passRows = candidates_checked.filter((r) => r.evidence_status === "PASS");
  const recommended_csv_mutations: WhwBrowserTruthCsvMutationRecommendationV1[] = passRows.map(
    (row) => ({
      filter_slug: "3m-ap810",
      retailer_key: row.recommended_retailer_link_row!.retailer_key,
      destination_url: row.source_url,
      exact_token_proof: `PROVEN: ${row.capture_notes}`,
      buyability_proof: "PROVEN: direct_buyable browser_truth capture with safe CTA gate PASS.",
      browser_truth_classification: "direct_buyable",
      browser_truth_buyable_subtype:
        row.browser_truth_buyable_subtype ?? BUYABLE_SUBTYPES.SINGLE_UNIT_DIRECT_BUYABLE,
    }),
  );

  const bestRow = passRows[0] ?? null;
  const best_truthful_buyer_path: WhwBestTruthfulBuyerPathV1 = bestRow
    ? {
        url: bestRow.source_url,
        retailer_or_source: bestRow.retailer_or_source,
        exact_token_proof:
          unknownSources.find((s) => s.url === bestRow.source_url)?.exact_token_proof ??
          "PROVEN: exact AP810/5618902 token on PDP.",
        buyability_proof: bestRow.capture_notes,
      }
    : null;

  const safe_apply_authorized = pass_count > 0;

  return {
    contract: WHW_BROWSER_TRUTH_CAPTURE_RESULT_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    evidence_mode: "browser_truth_capture_v1",
    packet_id: WHW_AP810_BROWSER_TRUTH_PACKET_ID_V1,
    anchor_filter_slug: "3m-ap810",
    source_buyer_path_artifact: WHW_AP810_BUYER_PATH_RESULT_REL_V1,
    candidates_checked,
    evidence_status_counts,
    pass_count,
    recommended_csv_mutations,
    safe_apply_authorized,
    best_truthful_buyer_path,
    generated_at: iso,
    checked_at: iso,
    do_not_open_public: true,
    proven_facts: [
      `PROVEN: Source buyer-path artifact ${WHW_AP810_BUYER_PATH_RESULT_REL_V1} loaded; ${String(unknownSources.length)} UNKNOWN candidate(s) evaluated (FAIL rows skipped).`,
      `PROVEN: Browser_truth capture evidence_status_counts PASS=${evidence_status_counts.PASS} FAIL=${evidence_status_counts.FAIL} UNKNOWN=${evidence_status_counts.UNKNOWN} BLOCKED=${evidence_status_counts.BLOCKED}.`,
      `PROVEN: pass_count=${pass_count}; safe_apply_authorized=${String(safe_apply_authorized)}.`,
      pass_count > 0
        ? `PROVEN: best_truthful_buyer_path ${best_truthful_buyer_path!.url} (${best_truthful_buyer_path!.retailer_or_source}).`
        : "PROVEN: No browser_truth PASS — recommended_csv_mutations=[].",
      "PROVEN: Model-first fit for 3m-ap810 not re-run in this lane.",
      `PROVEN: whole-house-water launch state remains ${getVerticalLaunchState("whole-house-water")}.`,
    ],
    inferred_facts: [
      "INFERRED: Amazon UNKNOWN rows should route to fulfillment/seller verification before any direct_buyable elevation.",
      pass_count > 0
        ? "INFERRED: Authorized dealer PASS row is candidate for future retailer_links.csv apply — still requires explicit human apply outside this read-only artifact."
        : "INFERRED: No safe CSV apply authorized from this capture packet.",
    ],
    unknown_facts: [
      "UNKNOWN: Whether Amazon B000W0TTJQ will pass direct_buyable after Sold-by verification.",
      "UNKNOWN: Whether klearwaterstore inventory is OEM-only without drop-ship compatible drift.",
    ],
  };
}

export function writeWhwBrowserTruthCaptureResultV1(args: {
  rootDir: string;
  result: WhwBrowserTruthCaptureResultV1;
  relPath?: string;
}): string {
  const rel = args.relPath ?? WHW_AP810_BROWSER_TRUTH_RESULT_REL_V1;
  if (!isAllowedWhwBrowserTruthCaptureResultRelPathV1(rel)) {
    throw new Error(`Refusing to write outside allowed WHW browser-truth results dir: ${rel}`);
  }
  const abs = path.join(args.rootDir, rel);
  mkdirSync(path.dirname(abs), { recursive: true });
  writeFileSync(abs, `${JSON.stringify(args.result, null, 2)}\n`, "utf8");
  return rel;
}

export function loadWhwBrowserTruthCaptureResultV1(args: {
  rootDir: string;
  relPath: string;
}): WhwBrowserTruthCaptureResultV1 | null {
  if (!isAllowedWhwBrowserTruthCaptureResultRelPathV1(args.relPath)) return null;
  const abs = path.join(args.rootDir, args.relPath);
  if (!existsSync(abs)) return null;
  try {
    const parsed: unknown = JSON.parse(readFileSync(abs, "utf8"));
    if (!validateWhwBrowserTruthCaptureResultV1(parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}
