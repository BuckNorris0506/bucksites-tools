/**
 * Dedupe alias rows and omit tokens that only repeat the OEM shown in the H1.
 */
export function uniqueFilterAliasesForPdp(
  aliases: string[],
  oemPartNumber: string,
): string[] {
  const oemNorm = oemPartNumber.trim().toLowerCase();
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of aliases) {
    const a = raw.trim();
    if (!a) continue;
    if (a.toLowerCase() === oemNorm) continue;
    const key = a.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(a);
  }
  out.sort((x, y) => x.localeCompare(y, undefined, { sensitivity: "base" }));
  return out;
}
