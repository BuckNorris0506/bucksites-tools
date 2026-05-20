/**
 * Repo-proven Waterdrop exact-proof slices only (committed evidence + manual insert).
 * Not a broad Waterdrop rollout — extend only when a new slice has matching evidence on disk.
 *
 * @see WATERDROP_DA29_00020B_EVIDENCE_REL_PATH in customer-language-doctrine
 */

/** Filter slugs with committed exact part-number Waterdrop proof (evidence LIVE + insert executed). */
export const WATERDROP_EXACT_PROOF_SLICE_SLUGS_V1 = ["da29-00020b"] as const;

export type WaterdropExactProofSliceSlugV1 =
  (typeof WATERDROP_EXACT_PROOF_SLICE_SLUGS_V1)[number];

const COMPATIBLE_REPLACEMENT_DIRECT_BUYABLE = "COMPATIBLE_REPLACEMENT_DIRECT_BUYABLE";

export function isWaterdropExactProofSliceSlug(slug: string): boolean {
  const normalized = slug.trim().toLowerCase();
  return (WATERDROP_EXACT_PROOF_SLICE_SLUGS_V1 as readonly string[]).includes(normalized);
}

export function isWaterdropRetailerKey(retailerKey: string | null | undefined): boolean {
  return retailerKey?.trim().toLowerCase() === "waterdrop";
}

/**
 * Verified Waterdrop compatible-replacement row eligible for primary ranking boost
 * (after buy-path gates; ranking only). Mirrors direct_buyable + subtype rules in launch-buy-links.
 */
export function isVerifiedWaterdropCompatibleDirectBuyable(link: {
  retailer_key?: string | null;
  browser_truth_classification?: string | null;
  browser_truth_buyable_subtype?: string | null;
}): boolean {
  if (!isWaterdropRetailerKey(link.retailer_key)) return false;
  if (link.browser_truth_classification?.trim() !== "direct_buyable") return false;
  const subtype = link.browser_truth_buyable_subtype?.trim();
  if (subtype === "BLOCKED_UNSAFE") return false;
  return subtype === COMPATIBLE_REPLACEMENT_DIRECT_BUYABLE;
}
