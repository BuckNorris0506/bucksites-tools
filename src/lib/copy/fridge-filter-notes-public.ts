/**
 * Maps operator or CSV-backed filter notes to homeowner-safe text on public PDPs.
 * Read-only at render time — does not change stored values.
 */

const FORBIDDEN_NOTE_PATTERNS =
  /OEM-style|manufacturer search|discovery URL|buy-link|retailer target|checkout deep|on-file retailer/i;

/**
 * When notes match known internal templates or contain operator jargon, return plain guidance
 * instead of echoing raw catalog text.
 */
export function publicFacingRefrigeratorFilterNotes(
  notes: string | null | undefined,
): string | null {
  if (!notes?.trim()) return null;
  const t = notes.trim();

  if (/Published OEM-style part number/i.test(t)) {
    return (
      "Compare the number printed on your cartridge or housing to the number on this page. " +
      "Year and refrigerator details can still matter—check your owner’s manual if you are unsure."
    );
  }

  if (FORBIDDEN_NOTE_PATTERNS.test(t)) {
    return (
      "Compare the number on your old filter to the number on this page. " +
      "If anything looks off, check your owner’s manual or your refrigerator model page below."
    );
  }

  return t;
}
