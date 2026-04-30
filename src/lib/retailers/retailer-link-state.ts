export const RETAILER_LINK_STATES = {
  LIVE_DIRECT_BUYABLE: "LIVE_DIRECT_BUYABLE",
  LIVE_LIKELY_VALID_NON_BUYABLE: "LIVE_LIKELY_VALID_NON_BUYABLE",
  CANDIDATE_PENDING_REVIEW: "CANDIDATE_PENDING_REVIEW",
  CANDIDATE_TOKEN_VERIFIED: "CANDIDATE_TOKEN_VERIFIED",
  CANDIDATE_BROWSER_CHECKED: "CANDIDATE_BROWSER_CHECKED",
  BLOCKED_SEARCH_OR_DISCOVERY: "BLOCKED_SEARCH_OR_DISCOVERY",
  BLOCKED_DESTINATION_UNAVAILABLE: "BLOCKED_DESTINATION_UNAVAILABLE",
  BLOCKED_BROWSER_TRUTH_MISSING: "BLOCKED_BROWSER_TRUTH_MISSING",
  BLOCKED_BROWSER_TRUTH_UNSAFE: "BLOCKED_BROWSER_TRUTH_UNSAFE",
  BLOCKED_TOKEN_OR_MATCH_RISK: "BLOCKED_TOKEN_OR_MATCH_RISK",
  BLOCKED_NO_BUYABILITY_EVIDENCE: "BLOCKED_NO_BUYABILITY_EVIDENCE",
  REJECTED: "REJECTED",
} as const;

export type RetailerLinkState =
  (typeof RETAILER_LINK_STATES)[keyof typeof RETAILER_LINK_STATES];

export type RetailerLinkStateInput = {
  gateFailureKind?: string | null;
  browserTruthClassification?: string | null;
  browserTruthBuyableSubtype?: string | null;
  candidateState?: string | null;
  reviewStatus?: string | null;
  operatorReason?: string | null;
  verifierClass?: string | null;
};

export function mapSignalsToRetailerLinkState(
  input: RetailerLinkStateInput,
): RetailerLinkState {
  if (input.reviewStatus === "rejected" || input.candidateState === "rejected") {
    return RETAILER_LINK_STATES.REJECTED;
  }

  if (
    input.gateFailureKind === "search_placeholder" ||
    input.gateFailureKind === "indirect_discovery"
  ) {
    return RETAILER_LINK_STATES.BLOCKED_SEARCH_OR_DISCOVERY;
  }

  if (input.gateFailureKind === "broken_destination") {
    return RETAILER_LINK_STATES.BLOCKED_DESTINATION_UNAVAILABLE;
  }

  if (input.gateFailureKind === "missing_browser_truth") {
    return RETAILER_LINK_STATES.BLOCKED_BROWSER_TRUTH_MISSING;
  }

  if (input.gateFailureKind === "unsafe_browser_truth") {
    return RETAILER_LINK_STATES.BLOCKED_BROWSER_TRUTH_UNSAFE;
  }

  if (input.browserTruthBuyableSubtype?.trim() === "BLOCKED_UNSAFE") {
    return RETAILER_LINK_STATES.BLOCKED_BROWSER_TRUTH_UNSAFE;
  }

  if (
    input.operatorReason === "404" ||
    input.operatorReason === "404/not_found" ||
    input.operatorReason === "discontinued/substitution"
  ) {
    return RETAILER_LINK_STATES.BLOCKED_DESTINATION_UNAVAILABLE;
  }

  if (
    input.operatorReason === "suffix drift" ||
    input.operatorReason === "no exact token"
  ) {
    return RETAILER_LINK_STATES.BLOCKED_TOKEN_OR_MATCH_RISK;
  }

  if (input.operatorReason === "no buyability") {
    return RETAILER_LINK_STATES.BLOCKED_NO_BUYABILITY_EVIDENCE;
  }

  if (
    input.verifierClass === "direct_buyable" ||
    input.browserTruthClassification === "direct_buyable" ||
    input.candidateState === "direct_buyable"
  ) {
    return RETAILER_LINK_STATES.LIVE_DIRECT_BUYABLE;
  }

  if (
    input.verifierClass === "likely_valid" ||
    input.browserTruthClassification === "likely_valid" ||
    input.candidateState === "likely_valid"
  ) {
    return RETAILER_LINK_STATES.LIVE_LIKELY_VALID_NON_BUYABLE;
  }

  if (input.verifierClass === "likely_search_results") {
    return RETAILER_LINK_STATES.BLOCKED_SEARCH_OR_DISCOVERY;
  }

  if (input.verifierClass === "likely_not_found") {
    return RETAILER_LINK_STATES.BLOCKED_DESTINATION_UNAVAILABLE;
  }

  if (
    input.verifierClass === "likely_blocked" ||
    input.verifierClass === "timeout" ||
    input.verifierClass === "browser_error"
  ) {
    return RETAILER_LINK_STATES.BLOCKED_BROWSER_TRUTH_UNSAFE;
  }

  if (input.candidateState === "browser_truth_checked") {
    return RETAILER_LINK_STATES.CANDIDATE_BROWSER_CHECKED;
  }

  if (input.candidateState === "token_verified") {
    return RETAILER_LINK_STATES.CANDIDATE_TOKEN_VERIFIED;
  }

  if (input.candidateState === "candidate_found") {
    return RETAILER_LINK_STATES.CANDIDATE_PENDING_REVIEW;
  }

  if (input.operatorReason === "no candidate") {
    return RETAILER_LINK_STATES.CANDIDATE_PENDING_REVIEW;
  }

  return RETAILER_LINK_STATES.CANDIDATE_PENDING_REVIEW;
}
