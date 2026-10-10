/**
 * Copy for /filter/4396395 Filter 4 successor (Phase 20B).
 * Read-only supersession evidence JSON is founder-approved at local commit
 * e8bf3d5d2386817a08006c30184c5f52c04fd58e; ship-guard blocks `data/evidence/*`
 * on ordinary deploy lanes — documentary path only; artifact does not ship here.
 */

/** Documentary provenance path (artifact may exist off deploy branch). */
export const WHIRLPOOL_4396395_SUCCESSOR_EVIDENCE_REL_PATH =
  "data/evidence/whirlpool-4396395-filter4-successor-readonly.2026-10-09.json" as const;

export const WHIRLPOOL_4396395_SUCCESSOR_EVIDENCE_SOURCE_COMMIT =
  "e8bf3d5d2386817a08006c30184c5f52c04fd58e" as const;

export const WHIRLPOOL_4396395_SUCCESSOR_SLUG = "4396395" as const;

export const WHIRLPOOL_FILTER4_SUCCESSOR_SLUG = "edr4rxd1" as const;

export const WHIRLPOOL_4396395_SUCCESSOR_HEADING =
  "About this part number and today’s Filter 4 cartridge" as const;

export const WHIRLPOOL_4396395_SUCCESSOR_BODY_PARAGRAPHS = [
  "4396395 is a legacy Whirlpool order number from the everydrop Filter 4 family (Puriclean II lineage). Whirlpool parts listings document EDR4RXD1 as the current everydrop Filter 4 replacement when ordering against that legacy number.",
  "Supersession of the part number does not prove that every refrigerator listed below was independently checked for EDR4RXD1. Match the number on your old filter and your owner’s manual before you order.",
] as const;

export const WHIRLPOOL_4396395_SUCCESSOR_LINK_LABEL =
  "View the current everydrop Filter 4 page (EDR4RXD1)" as const;

/** Hero model-list cue (replaces generic “right place” copy). */
export const WHIRLPOOL_4396395_HERO_MODEL_LIST_CUE =
  "The refrigerator models below are records linked to legacy part number 4396395. This list does not independently confirm EDR4RXD1 fit." as const;

export function whirlpool4396395CompatibleModelsHeading(displayModelCount: number): string {
  return `Refrigerator models linked to 4396395 (${displayModelCount})`;
}

export const WHIRLPOOL_4396395_COMPAT_MODELS_INTRO =
  "These links open model records associated with 4396395. They are not independent confirmation that EDR4RXD1 fits each refrigerator." as const;

export const WHIRLPOOL_4396395_UNCERTAINTY_COPY =
  "Whirlpool documents EDR4RXD1 as the replacement when ordering against legacy 4396395. That supersession does not independently verify every refrigerator listed here. Check your old filter number and the manual for your full appliance model before ordering." as const;

export const WHIRLPOOL_4396395_AVOID_VERIFIED_LINK_COPY =
  "A retailer listing may use the documented successor number EDR4RXD1 rather than legacy 4396395. The number change alone does not verify your appliance’s fit or approve a retailer listing. Check the documentation for your exact appliance before ordering." as const;

export function isWhirlpool4396395SuccessorPage(filterSlug: string): boolean {
  return filterSlug === WHIRLPOOL_4396395_SUCCESSOR_SLUG;
}
