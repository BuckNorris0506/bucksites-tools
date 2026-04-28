export const WRONG_PURCHASE_RISKS = {
  NO_COMPATIBILITY_MAPPING: "NO_COMPATIBILITY_MAPPING",
  AMBIGUOUS_MULTI_PART_MATCH: "AMBIGUOUS_MULTI_PART_MATCH",
  NO_VERIFIED_BUY_LINK: "NO_VERIFIED_BUY_LINK",
  SEARCH_PLACEHOLDER_LINK: "SEARCH_PLACEHOLDER_LINK",
  INDIRECT_DISCOVERY_LINK: "INDIRECT_DISCOVERY_LINK",
  BROKEN_DESTINATION_LINK: "BROKEN_DESTINATION_LINK",
  MISSING_BROWSER_TRUTH: "MISSING_BROWSER_TRUTH",
  UNSAFE_BROWSER_TRUTH: "UNSAFE_BROWSER_TRUTH",
  DISCONTINUED_OR_SUBSTITUTION: "DISCONTINUED_OR_SUBSTITUTION",
  TOKEN_OR_SUFFIX_MISMATCH: "TOKEN_OR_SUFFIX_MISMATCH",
  NO_BUYABILITY_EVIDENCE: "NO_BUYABILITY_EVIDENCE",
  UNKNOWN: "UNKNOWN",
} as const;

export type WrongPurchaseRisk =
  (typeof WRONG_PURCHASE_RISKS)[keyof typeof WRONG_PURCHASE_RISKS];

export type WrongPurchaseRiskInput = {
  matchBasis?: string | null;
  buyerPathState?: string | null;
  approvedRetailerLinkCount?: number | null;
  gateFailureKind?: string | null;
  browserTruthClassification?: string | null;
  operatorReason?: string | null;
  hasExactTokenOrAliasProof?: boolean | null;
  hasBuyabilityEvidence?: boolean | null;
  hasSubstitutionOrDiscontinuedWarning?: boolean | null;
};

export function mapSignalsToWrongPurchaseRisk(
  input: WrongPurchaseRiskInput,
): WrongPurchaseRisk {
  if (input.matchBasis === "no_repo_compatibility_mapping") {
    return WRONG_PURCHASE_RISKS.NO_COMPATIBILITY_MAPPING;
  }

  if (input.matchBasis === "multiple_mapped_parts_no_recommended") {
    return WRONG_PURCHASE_RISKS.AMBIGUOUS_MULTI_PART_MATCH;
  }

  if (input.gateFailureKind === "search_placeholder") {
    return WRONG_PURCHASE_RISKS.SEARCH_PLACEHOLDER_LINK;
  }

  if (input.gateFailureKind === "indirect_discovery") {
    return WRONG_PURCHASE_RISKS.INDIRECT_DISCOVERY_LINK;
  }

  if (
    input.gateFailureKind === "broken_destination" ||
    input.operatorReason === "404" ||
    input.operatorReason === "404/not_found"
  ) {
    return WRONG_PURCHASE_RISKS.BROKEN_DESTINATION_LINK;
  }

  if (input.gateFailureKind === "missing_browser_truth") {
    return WRONG_PURCHASE_RISKS.MISSING_BROWSER_TRUTH;
  }

  if (input.gateFailureKind === "unsafe_browser_truth") {
    return WRONG_PURCHASE_RISKS.UNSAFE_BROWSER_TRUTH;
  }

  if (
    input.operatorReason === "discontinued/substitution" ||
    input.hasSubstitutionOrDiscontinuedWarning === true
  ) {
    return WRONG_PURCHASE_RISKS.DISCONTINUED_OR_SUBSTITUTION;
  }

  if (
    input.operatorReason === "suffix drift" ||
    input.operatorReason === "no exact token" ||
    input.hasExactTokenOrAliasProof === false
  ) {
    return WRONG_PURCHASE_RISKS.TOKEN_OR_SUFFIX_MISMATCH;
  }

  if (
    input.operatorReason === "no buyability" ||
    input.hasBuyabilityEvidence === false
  ) {
    return WRONG_PURCHASE_RISKS.NO_BUYABILITY_EVIDENCE;
  }

  if (
    input.buyerPathState === "suppress_buy" ||
    input.approvedRetailerLinkCount === 0
  ) {
    return WRONG_PURCHASE_RISKS.NO_VERIFIED_BUY_LINK;
  }

  if (
    typeof input.browserTruthClassification === "string" &&
    input.browserTruthClassification.trim().length > 0 &&
    input.browserTruthClassification !== "direct_buyable"
  ) {
    return WRONG_PURCHASE_RISKS.UNSAFE_BROWSER_TRUTH;
  }

  return WRONG_PURCHASE_RISKS.UNKNOWN;
}
