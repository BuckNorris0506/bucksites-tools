/**
 * Order filters on a model detail page: recommended compatibility row first,
 * then OEM part number (existing fallback when none are recommended).
 */
export function sortModelFiltersByCompatRecommendation<
  T extends { id: string; oem_part_number: string },
>(filters: T[], recommendedByFilterId: Map<string, boolean>): T[] {
  return [...filters].sort((a, b) => {
    const ar = recommendedByFilterId.get(a.id) ? 1 : 0;
    const br = recommendedByFilterId.get(b.id) ? 1 : 0;
    if (br !== ar) return br - ar;
    return (a.oem_part_number ?? "").localeCompare(b.oem_part_number ?? "");
  });
}
