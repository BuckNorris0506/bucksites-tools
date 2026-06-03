/**
 * Customer-facing BuckParts Verified Link terminology for gated purchase UI.
 * Copy only — does not affect filterRealBuyRetailerLinks or other buy-path gates.
 */

export const BUCKPARTS_VERIFIED_LINK_SINGULAR = "BuckParts Verified Link" as const;

export const BUCKPARTS_VERIFIED_LINK_PLURAL = "BuckParts Verified Links" as const;

/** Homeowner definition shown near verified-link sections. */
export const BUCKPARTS_VERIFIED_LINK_DEFINITION =
  "A place to buy that BuckParts has checked against the part, listing, and evidence we trust." as const;

/** Qualifier: we do not show a verified link on every filter page. */
export const BUCKPARTS_VERIFIED_LINK_NOT_EVERY_FILTER_NOTE =
  "Not every filter page has one—we only show a link when our checks clear for this part number." as const;

export const BUCKPARTS_VERIFIED_LINKS_SECTION_LABEL = BUCKPARTS_VERIFIED_LINK_PLURAL;

/** When at least one gated link renders (hero / summary strip). */
export const BUCKPARTS_VERIFIED_LINK_WHEN_SHOWN_NOTE =
  "When a BuckParts Verified Link appears below, we checked that retailer product page against this part number. Compare it with your old filter before ordering." as const;

/** No gated buy path for this part number (not a failure; not checkout). */
export const BUCKPARTS_VERIFIED_LINK_NONE_YET =
  "No BuckParts Verified Link yet for this filter number. We haven’t found a retailer product page we’re comfortable showing." as const;

/** Screen-reader prefix on primary retailer CTA (store name follows in visible label). */
export const BUCKPARTS_VERIFIED_LINK_PRIMARY_CTA_SR_PREFIX = "BuckParts Verified Link at" as const;

export const BUCKPARTS_VERIFIED_LINK_ALTERNATES_LABEL = "Other BuckParts Verified Links";

export function buckpartsVerifiedLinksHiddenCountNote(hiddenCount: number): string {
  return `+${hiddenCount} more BuckParts Verified Link${hiddenCount === 1 ? "" : "s"} not shown.`;
}

/** Vertical / fridge suppress when trust gates buy (inventory may exist but is hidden). */
export const BUCKPARTS_VERIFIED_LINK_SUPPRESS_DEFAULT =
  "No BuckParts Verified Link yet for this filter number. Compare the part and model numbers to your old part or manual, then try search again if you still need a match." as const;
