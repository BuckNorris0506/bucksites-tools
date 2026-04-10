/**
 * Public product name for metadata, header, and copy.
 * Set `NEXT_PUBLIC_SITE_NAME` to override (e.g. staging).
 */
export const SITE_DISPLAY_NAME =
  process.env.NEXT_PUBLIC_SITE_NAME?.trim() || "BuckParts";

export const SITE_DEFAULT_DESCRIPTION = `${SITE_DISPLAY_NAME} is a free homeowner lookup for replacement filters: refrigerator water filters, room air purifier cartridges, and whole-house water cartridges. Search by model or OEM number, confirm fit against our reference, then open store links when you’re ready.`;
