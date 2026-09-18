/**
 * Homepage featured fit example — bound to existing repo evidence.
 * Do not invent fit, source, date, condition, image, or verification state.
 */

export const FEATURED_FIT_FRIDGE_SLUG = "samsung-rf263beaesr";
export const FEATURED_FIT_FILTER_SLUG = "da29-00020b";
export const FEATURED_FIT_MODEL_NUMBER = "RF263BEAESR";
export const FEATURED_FIT_PART_NUMBER = "DA29-00020B";
export const FEATURED_FIT_PART_NAME = "Samsung DA29-00020B / HAF-CIN family";
export const FEATURED_FIT_HREF = `/fridge/${FEATURED_FIT_FRIDGE_SLUG}`;
export const FEATURED_FIT_TITLE = "A real fit check";
export const FEATURED_FIT_QUALIFIER = "Example only—your appliance needs its own check.";
export const FEATURED_FIT_VIEW_LINK = "View this fit check";

/** Existing product state language: established positive. */
export const FEATURED_FIT_VERDICT = `Fits ${FEATURED_FIT_MODEL_NUMBER}.`;

export const FEATURED_FIT_REASON =
  "Samsung’s RF263BEAESR spec sheet lists Water Filter HAF-CIN as an accessory; the HAF-CIN accessory cartridge is DA29-00020B.";

export const FEATURED_FIT_SOURCE_TITLE =
  "Samsung RF263BEAESR spec sheet (Water Filter HAF-CIN / DA29-00020B)";
export const FEATURED_FIT_SOURCE_PUBLISHER = "Samsung";
export const FEATURED_FIT_SOURCE_HOST = "image-us.samsung.com";
export const FEATURED_FIT_SOURCE_URL =
  "https://image-us.samsung.com/SamsungUS/samsungbusiness/samsung-builder/products/spec-sheets/spec_sheets_rf263beaesr.pdf";

export const FEATURED_FIT_CONDITION =
  "Samsung support recommends genuine Samsung water filters only and replacing approximately every six months or when the filter indicator prompts. Confirm the full model on the appliance rating plate.";

/** `evidence_date` on data/manual-evidence/refrigerator/samsung-rf263beaesr.json */
export const FEATURED_FIT_EVIDENCE_DATE = "2026-05-28";
export const FEATURED_FIT_DATE_LABEL = `Evidence recorded ${FEATURED_FIT_EVIDENCE_DATE}`;
export const FEATURED_FIT_DATE_MEANING =
  "This is the date this manufacturer spec-sheet evidence was recorded in BuckParts records. It is not a retailer last-checked date and not a claimed publication date.";

export const FEATURED_FIT_EVIDENCE_PATH =
  "data/manual-evidence/refrigerator/samsung-rf263beaesr.json";
export const FEATURED_FIT_COMPAT_ROW = `${FEATURED_FIT_FRIDGE_SLUG},${FEATURED_FIT_FILTER_SLUG}`;

export const FEATURED_FIT_FIT_STATE = "established_positive" as const;
