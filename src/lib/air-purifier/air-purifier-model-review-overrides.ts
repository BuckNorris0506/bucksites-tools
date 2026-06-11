export type AirPurifierModelReviewReason = "FILTER_MAPPING_CONFLICT";

export type AirPurifierModelPublicStatus = "owner_review_required";

export type AirPurifierModelReviewOverride = {
  air_purifier_model_slug: string;
  reason: AirPurifierModelReviewReason;
  public_status: AirPurifierModelPublicStatus;
  public_message: string;
  internal_evidence_doc: string;
};

const REVIEW_OVERRIDES: Record<string, AirPurifierModelReviewOverride> = {
  "blueair-411a-max": {
    air_purifier_model_slug: "blueair-411a-max",
    reason: "FILTER_MAPPING_CONFLICT",
    public_status: "owner_review_required",
    public_message:
      "We're reviewing the replacement filter for this Blueair 411a Max model. Blue Pure 411a Max uses a different cartridge (F4MAX) than Blue Pure 411 / 411+ / 411 Auto (PART411). BuckParts will not recommend a buy path until catalog compatibility is verified.",
    internal_evidence_doc:
      "data/air-purifier/batch-production/agent-packets/ap-blueair-catalog-identity-v1.json",
  },
};

export function getAirPurifierModelReviewOverride(
  modelSlug: string,
): AirPurifierModelReviewOverride | null {
  return REVIEW_OVERRIDES[modelSlug.trim().toLowerCase()] ?? null;
}

export function isAirPurifierModelUnderOwnerReview(modelSlug: string): boolean {
  return getAirPurifierModelReviewOverride(modelSlug) !== null;
}
