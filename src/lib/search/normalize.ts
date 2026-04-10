/** Matches SQL `public.norm_compact(t)` in the search migration. */

const MAX_SEARCH_LEN = 80;

export function trimSearchInput(raw: string): string {
  return raw.trim().slice(0, MAX_SEARCH_LEN);
}

/**
 * Lowercase, alphanumeric-only “compact” form for forgiving match against
 * manufacturer strings that use spaces, hyphens, slashes, etc.
 */
export function normalizeSearchCompact(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}
