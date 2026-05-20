/**
 * Read-only ranking for next Waterdrop exact-proof slices (no insert authority).
 */

import { WATERDROP_EXACT_PROOF_SLICE_SLUGS_V1 } from "@/lib/retailers/waterdrop-exact-proof-slice-v1";
import {
  matchInferredTokensToBuckpartsSlug,
  type BuckpartsFridgeFilterIndexV1,
  type TokenMatchConfidenceV1,
} from "@/lib/retailers/buckparts-fridge-filter-index-v1";
import type { ParsedWaterdropAnchorV1 } from "@/lib/retailers/waterdrop-linksynergy-parse-v1";

export type WaterdropPdpSpecificityV1 = "PRODUCT_PDP" | "VARIANT_PDP" | "SEARCH_OR_UNKNOWN" | "NON_PDP";

export type ProductionLinkSnapshotV1 = {
  gated_buyable_count: number;
  has_amazon_direct_buyable: boolean;
  has_waterdrop_row: boolean;
  has_repairclinic_search_only: boolean;
};

export type WaterdropProofSliceCandidateV1 = {
  entry_id: string;
  affiliate_url: string;
  destination_pdp_url: string | null;
  visible_title: string | null;
  image_url: string | null;
  inferred_token_candidates: string[];
  matched_slug: string | null;
  matched_oem_part_number: string | null;
  match_confidence: TokenMatchConfidenceV1;
  pdp_specificity: WaterdropPdpSpecificityV1;
  production_snapshot: ProductionLinkSnapshotV1 | "UNKNOWN";
  ranking_score: number;
  ranking_reasons: string[];
  excluded_from_recommendation: boolean;
  exclusion_reason: string | null;
  recommended_for_owner_browser_proof: boolean;
};

export function classifyWaterdropPdpSpecificity(destinationUrl: string | null): WaterdropPdpSpecificityV1 {
  if (!destinationUrl) return "NON_PDP";
  try {
    const u = new URL(destinationUrl);
    if (!u.hostname.toLowerCase().includes("waterdropfilter.com")) return "NON_PDP";
    const path = u.pathname.toLowerCase();
    if (path.includes("/search")) return "SEARCH_OR_UNKNOWN";
    if (path.includes("/products/")) {
      return u.searchParams.has("variant") ? "VARIANT_PDP" : "PRODUCT_PDP";
    }
    return "SEARCH_OR_UNKNOWN";
  } catch {
    return "NON_PDP";
  }
}

function scoreMatchConfidence(confidence: TokenMatchConfidenceV1): number {
  if (confidence === "EXACT_OEM_PART_NUMBER") return 50;
  if (confidence === "ALIAS_TOKEN") return 40;
  if (confidence === "URL_OR_TITLE_INFERRED") return 25;
  return 0;
}

function scorePdpSpecificity(spec: WaterdropPdpSpecificityV1): number {
  if (spec === "VARIANT_PDP") return 20;
  if (spec === "PRODUCT_PDP") return 15;
  if (spec === "SEARCH_OR_UNKNOWN") return -15;
  return -25;
}

function scoreProductionSnapshot(snapshot: ProductionLinkSnapshotV1 | "UNKNOWN"): number {
  if (snapshot === "UNKNOWN") return 0;
  let s = 0;
  if (snapshot.gated_buyable_count === 0) s += 25;
  if (snapshot.has_amazon_direct_buyable) s += 15;
  if (snapshot.has_repairclinic_search_only) s += 5;
  if (snapshot.has_waterdrop_row) s -= 500;
  return s;
}

export function buildWaterdropProofSliceCandidate(args: {
  entry_id: string;
  parsed: ParsedWaterdropAnchorV1;
  index: BuckpartsFridgeFilterIndexV1;
  production_snapshot?: ProductionLinkSnapshotV1 | "UNKNOWN";
}): WaterdropProofSliceCandidateV1 {
  const match = matchInferredTokensToBuckpartsSlug(args.index, args.parsed.inferred_token_candidates);
  const pdp_specificity = classifyWaterdropPdpSpecificity(args.parsed.destination_pdp_url);
  const ranking_reasons: string[] = [];
  let ranking_score = 0;

  ranking_score += scoreMatchConfidence(match.match_confidence);
  ranking_score += scorePdpSpecificity(pdp_specificity);
  ranking_score += scoreProductionSnapshot(args.production_snapshot ?? "UNKNOWN");

  if (match.matched_slug) ranking_reasons.push(`buckparts_slug=${match.matched_slug}`);
  ranking_reasons.push(`match_confidence=${match.match_confidence}`);
  ranking_reasons.push(`pdp_specificity=${pdp_specificity}`);
  if (args.production_snapshot !== "UNKNOWN" && args.production_snapshot) {
    ranking_reasons.push(
      `gated_buyable=${args.production_snapshot.gated_buyable_count} amazon=${args.production_snapshot.has_amazon_direct_buyable} waterdrop=${args.production_snapshot.has_waterdrop_row}`,
    );
  }

  let excluded_from_recommendation = false;
  let exclusion_reason: string | null = null;

  if (!match.matched_slug) {
    excluded_from_recommendation = true;
    exclusion_reason = "no_buckparts_slug_match";
  } else if (
    (WATERDROP_EXACT_PROOF_SLICE_SLUGS_V1 as readonly string[]).includes(match.matched_slug)
  ) {
    excluded_from_recommendation = true;
    exclusion_reason = "already_live_proof_slice";
  } else if (args.production_snapshot !== "UNKNOWN" && args.production_snapshot?.has_waterdrop_row) {
    excluded_from_recommendation = true;
    exclusion_reason = "production_already_has_waterdrop_row";
  } else if (pdp_specificity === "SEARCH_OR_UNKNOWN" || pdp_specificity === "NON_PDP") {
    excluded_from_recommendation = true;
    exclusion_reason = "waterdrop_destination_not_product_pdp";
  } else if (!args.parsed.affiliate_url.includes("linksynergy.com")) {
    excluded_from_recommendation = true;
    exclusion_reason = "missing_linksynergy_affiliate_url";
  } else if (match.match_confidence === "NO_MATCH") {
    excluded_from_recommendation = true;
    exclusion_reason = "token_match_failed";
  }

  const recommended_for_owner_browser_proof =
    !excluded_from_recommendation && match.match_confidence !== "NO_MATCH";

  return {
    entry_id: args.entry_id,
    affiliate_url: args.parsed.affiliate_url,
    destination_pdp_url: args.parsed.destination_pdp_url,
    visible_title: args.parsed.visible_title,
    image_url: args.parsed.image_url,
    inferred_token_candidates: args.parsed.inferred_token_candidates,
    matched_slug: match.matched_slug,
    matched_oem_part_number: match.matched_oem_part_number,
    match_confidence: match.match_confidence,
    pdp_specificity,
    production_snapshot: args.production_snapshot ?? "UNKNOWN",
    ranking_score,
    ranking_reasons,
    excluded_from_recommendation,
    exclusion_reason,
    recommended_for_owner_browser_proof,
  };
}

export function sortWaterdropProofSliceCandidates(
  rows: WaterdropProofSliceCandidateV1[],
): WaterdropProofSliceCandidateV1[] {
  return [...rows].sort((a, b) => {
    if (a.excluded_from_recommendation !== b.excluded_from_recommendation) {
      return a.excluded_from_recommendation ? 1 : -1;
    }
    if (a.recommended_for_owner_browser_proof !== b.recommended_for_owner_browser_proof) {
      return a.recommended_for_owner_browser_proof ? -1 : 1;
    }
    return b.ranking_score - a.ranking_score;
  });
}
