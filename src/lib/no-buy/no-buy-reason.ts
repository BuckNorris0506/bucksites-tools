export const NO_BUY_REASONS = {
  NO_COMPATIBILITY_PROOF: "NO_COMPATIBILITY_PROOF",
  AMBIGUOUS_COMPATIBILITY: "AMBIGUOUS_COMPATIBILITY",
  NO_VERIFIED_CHECKOUT_LINK: "NO_VERIFIED_CHECKOUT_LINK",
  LINK_UNDER_REVIEW: "LINK_UNDER_REVIEW",
  LINK_FAILED_SAFETY_CHECK: "LINK_FAILED_SAFETY_CHECK",
  LINK_IS_SEARCH_OR_DISCOVERY: "LINK_IS_SEARCH_OR_DISCOVERY",
  DESTINATION_UNAVAILABLE: "DESTINATION_UNAVAILABLE",
  PART_TOKEN_MISMATCH_RISK: "PART_TOKEN_MISMATCH_RISK",
  SUBSTITUTION_UNVERIFIED: "SUBSTITUTION_UNVERIFIED",
  BUYABILITY_NOT_CONFIRMED: "BUYABILITY_NOT_CONFIRMED",
  REPLACEMENT_NOT_SAFE_YET: "REPLACEMENT_NOT_SAFE_YET",
  UNKNOWN: "UNKNOWN",
} as const;

export type NoBuyReason = (typeof NO_BUY_REASONS)[keyof typeof NO_BUY_REASONS];

export type NoBuyReasonInput = {
  wrongPurchaseRisk?: string | null;
  gateFailureKind?: string | null;
  replacementSafeToBuy?: boolean | null;
  replacementRelationshipType?: string | null;
  buyerPathState?: string | null;
  hasCandidateLinksUnderReview?: boolean | null;
};

export function mapSignalsToNoBuyReason(input: NoBuyReasonInput): NoBuyReason {
  if (input.wrongPurchaseRisk === "NO_COMPATIBILITY_MAPPING") {
    return NO_BUY_REASONS.NO_COMPATIBILITY_PROOF;
  }
  if (input.wrongPurchaseRisk === "AMBIGUOUS_MULTI_PART_MATCH") {
    return NO_BUY_REASONS.AMBIGUOUS_COMPATIBILITY;
  }
  if (input.wrongPurchaseRisk === "SEARCH_PLACEHOLDER_LINK") {
    return NO_BUY_REASONS.LINK_IS_SEARCH_OR_DISCOVERY;
  }
  if (input.wrongPurchaseRisk === "INDIRECT_DISCOVERY_LINK") {
    return NO_BUY_REASONS.LINK_IS_SEARCH_OR_DISCOVERY;
  }
  if (input.wrongPurchaseRisk === "BROKEN_DESTINATION_LINK") {
    return NO_BUY_REASONS.DESTINATION_UNAVAILABLE;
  }
  if (input.wrongPurchaseRisk === "MISSING_BROWSER_TRUTH") {
    return NO_BUY_REASONS.LINK_UNDER_REVIEW;
  }
  if (input.wrongPurchaseRisk === "UNSAFE_BROWSER_TRUTH") {
    return NO_BUY_REASONS.LINK_FAILED_SAFETY_CHECK;
  }
  if (input.wrongPurchaseRisk === "DISCONTINUED_OR_SUBSTITUTION") {
    return NO_BUY_REASONS.SUBSTITUTION_UNVERIFIED;
  }
  if (input.wrongPurchaseRisk === "TOKEN_OR_SUFFIX_MISMATCH") {
    return NO_BUY_REASONS.PART_TOKEN_MISMATCH_RISK;
  }
  if (input.wrongPurchaseRisk === "NO_BUYABILITY_EVIDENCE") {
    return NO_BUY_REASONS.BUYABILITY_NOT_CONFIRMED;
  }
  if (input.replacementSafeToBuy === false) {
    return NO_BUY_REASONS.REPLACEMENT_NOT_SAFE_YET;
  }
  if (input.hasCandidateLinksUnderReview === true) {
    return NO_BUY_REASONS.LINK_UNDER_REVIEW;
  }
  if (input.buyerPathState === "suppress_buy") {
    return NO_BUY_REASONS.NO_VERIFIED_CHECKOUT_LINK;
  }
  if (input.gateFailureKind === "search_placeholder") {
    return NO_BUY_REASONS.LINK_IS_SEARCH_OR_DISCOVERY;
  }
  if (input.gateFailureKind === "indirect_discovery") {
    return NO_BUY_REASONS.LINK_IS_SEARCH_OR_DISCOVERY;
  }
  if (input.gateFailureKind === "broken_destination") {
    return NO_BUY_REASONS.DESTINATION_UNAVAILABLE;
  }
  if (input.gateFailureKind === "missing_browser_truth") {
    return NO_BUY_REASONS.LINK_UNDER_REVIEW;
  }
  if (input.gateFailureKind === "unsafe_browser_truth") {
    return NO_BUY_REASONS.LINK_FAILED_SAFETY_CHECK;
  }
  return NO_BUY_REASONS.UNKNOWN;
}

const NO_BUY_REASON_MESSAGES: Record<NoBuyReason, string> = {
  [NO_BUY_REASONS.NO_COMPATIBILITY_PROOF]:
    "We don’t have enough fit evidence for this part-model match yet. Please verify the OEM part number from your old part or manual.",
  [NO_BUY_REASONS.AMBIGUOUS_COMPATIBILITY]:
    "More than one part may fit this model. Compare your current part number before buying.",
  [NO_BUY_REASONS.NO_VERIFIED_CHECKOUT_LINK]:
    "We don’t have a verified checkout link for this part yet. Use the OEM number to search a trusted retailer.",
  [NO_BUY_REASONS.LINK_UNDER_REVIEW]:
    "Store links are being reviewed for this part. Check back soon, or verify directly with the OEM part number.",
  [NO_BUY_REASONS.LINK_FAILED_SAFETY_CHECK]:
    "We hid current store links because they did not meet our safety checks.",
  [NO_BUY_REASONS.LINK_IS_SEARCH_OR_DISCOVERY]:
    "Available links are search/discovery pages, not direct checkout pages, so we don’t show them as buy buttons.",
  [NO_BUY_REASONS.DESTINATION_UNAVAILABLE]:
    "Known destination links are currently unavailable. Please try another trusted retailer using the exact part number.",
  [NO_BUY_REASONS.PART_TOKEN_MISMATCH_RISK]:
    "We could not confirm an exact part-number match on candidate pages. Verify your part code before purchasing.",
  [NO_BUY_REASONS.SUBSTITUTION_UNVERIFIED]:
    "A substitute may exist, but we have not verified it as a safe replacement yet.",
  [NO_BUY_REASONS.BUYABILITY_NOT_CONFIRMED]:
    "We could not confirm checkout-ready availability for this listing.",
  [NO_BUY_REASONS.REPLACEMENT_NOT_SAFE_YET]:
    "A possible replacement is identified, but it is not buy-safe yet. Verify with your manual or OEM support.",
  [NO_BUY_REASONS.UNKNOWN]:
    "We don’t have enough evidence to show a buy option for this page yet.",
};

export function getNoBuyUserMessage(reason: NoBuyReason): string {
  return NO_BUY_REASON_MESSAGES[reason];
}
