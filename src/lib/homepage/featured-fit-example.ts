/**
 * Homepage real lookup example — bound to existing repo evidence.
 * Do not invent fit, source, date, condition, image clearance, or verification state.
 */

export const FEATURED_FIT_FRIDGE_SLUG = "whirlpool-wrx735sdhz";
export const FEATURED_FIT_FILTER_SLUG = "edr4rxd1";
export const FEATURED_FIT_MODEL_NUMBER = "WRX735SDHZ";
export const FEATURED_FIT_PART_NUMBER = "EDR4RXD1";
export const FEATURED_FIT_PART_NAME = "EveryDrop Filter 4";
export const FEATURED_FIT_BRAND = "Whirlpool";
export const FEATURED_FIT_ANSWER_KICKER = "Listed by Whirlpool";
export const FEATURED_FIT_HREF = `/fridge/${FEATURED_FIT_FRIDGE_SLUG}`;
export const FEATURED_FIT_SEARCH_HREF = `/search?q=${encodeURIComponent(FEATURED_FIT_MODEL_NUMBER)}`;

export const FEATURED_FIT_ILLUSTRATION_PATH =
  "/homepage/refrigerator-water-filter-cartridge-v1.svg";
export const FEATURED_FIT_ILLUSTRATION_ALT =
  "Stylized illustration of a refrigerator water filter cartridge—not a photo of a specific product";

/** Original in-repo vector; see public/homepage/PROVENANCE.md */
export const FEATURED_FIT_ILLUSTRATION_PROVENANCE =
  "Original BuckParts SVG illustration; replaces uncleared review product photo.";

export const FEATURED_FIT_WHY_TITLE = "Why Filter 4?";
export const FEATURED_FIT_WHY_BODY =
  "BuckParts lists EDR4RXD1 as the typical replacement for Whirlpool WRX735SDHZ. Whirlpool’s indexed model specifications list EDR4RXD1 as the water-filter part number.";
export const FEATURED_FIT_WHY_LIMIT_TITLE = "The important limit";
export const FEATURED_FIT_WHY_LIMIT_BODY =
  "This is a base-model example, not a check for your appliance. Confirm the full model on the rating plate—do not rely on the model row alone for fit.";

export const FEATURED_FIT_SOURCE_TITLE =
  "Whirlpool WRX735SDHZ product page (Water Filter EDR4RXD1)";
export const FEATURED_FIT_SOURCE_URL =
  "https://www.whirlpool.com/kitchen/refrigeration/refrigerators/p.WRX735SDHZ.html";
export const FEATURED_FIT_FILTER_SOURCE_TITLE =
  "everydrop Refrigerator Water Filter 4 — EDR4RXD1";
export const FEATURED_FIT_FILTER_SOURCE_URL =
  "https://www.whirlpool.com/accessories/kitchen-accessories/refrigerator/p.ice-and-water-refrigerator-filter-4.edr4rxd1.html";

export const FEATURED_FIT_EVIDENCE_DATE = "2026-05-28";
export const FEATURED_FIT_EVIDENCE_PATH =
  "data/manual-evidence/refrigerator/whirlpool-wrx735sdhz.json";
export const FEATURED_FIT_COMPAT_ROW = `${FEATURED_FIT_FRIDGE_SLUG},${FEATURED_FIT_FILTER_SLUG}`;

export const FEATURED_FIT_FIT_STATE = "established_positive" as const;
