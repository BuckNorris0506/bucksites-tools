/**
 * Fridge model metadata descriptions. Does not change index/noindex policy.
 * Quarantined/under-review pages must not promise compatibility in the snippet.
 * Callers must pass true only when buy options are actually withheld (quarantine).
 */

export function fridgeModelMetadataDescriptionV1(args: {
  brandName: string;
  modelNumber: string;
  underReview: boolean;
}): string {
  if (args.underReview) {
    return `BuckParts is reviewing water filter compatibility for ${args.brandName} model ${args.modelNumber}. Buying options stay off until that review is complete.`;
  }
  return `Compatible water filters and replacement schedule for ${args.brandName} model ${args.modelNumber}.`;
}
