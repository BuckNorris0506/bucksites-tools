/** Shared replacement-interval labels for vertical detail pages. */

export function intervalLabel(months: number | null | undefined): string | null {
  if (months == null || months <= 0) return null;
  if (months === 1) return "Replace about every month";
  return `Replace about every ${months} months`;
}

export function sharedFilterIntervalLabel(
  filters: { replacement_interval_months: number | null }[],
): string | null {
  const months = filters
    .map((f) => f.replacement_interval_months)
    .filter((m): m is number => m != null && m > 0);
  if (months.length === 0) return null;
  const unique = Array.from(new Set(months));
  if (unique.length !== 1) return null;
  return intervalLabel(unique[0]);
}
