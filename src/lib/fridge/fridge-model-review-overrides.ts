export type FridgeModelReviewReason = "FILTER_MAPPING_CONFLICT";
export type FridgeModelPublicStatus = "owner_review_required";

export type FridgeModelReviewOverride = {
  fridge_model_slug: string;
  reason: FridgeModelReviewReason;
  public_status: FridgeModelPublicStatus;
  public_message: string;
  internal_evidence_doc: string;
};

const REVIEW_OVERRIDES: Record<string, FridgeModelReviewOverride> = {
  "lg-lrfxs3106s": {
    fridge_model_slug: "lg-lrfxs3106s",
    reason: "FILTER_MAPPING_CONFLICT",
    public_status: "owner_review_required",
    public_message:
      "We're reviewing this model before recommending a replacement filter. Filter information for this model conflicts across sources, so we're not showing store buttons yet.",
    internal_evidence_doc: "docs/fridge-model-filter-mapping-discrepancies.md",
  },
};

export function listFridgeModelReviewOverrides(): FridgeModelReviewOverride[] {
  return Object.values(REVIEW_OVERRIDES);
}

export function getFridgeModelReviewOverride(
  fridgeModelSlug: string,
): FridgeModelReviewOverride | null {
  return REVIEW_OVERRIDES[fridgeModelSlug] ?? null;
}

export function isFridgeModelUnderOwnerReview(fridgeModelSlug: string): boolean {
  return getFridgeModelReviewOverride(fridgeModelSlug) !== null;
}
