export const RECENT_SEARCHES_KEY = "buckparts.recentSearches.v1";
export const RECENT_SEARCHES_MAX = 6;
export const RECENT_SEARCHES_MAX_LENGTH = 80;
export const RECENT_SEARCHES_UPDATED_EVENT = "buckparts:recent-searches-updated";

/** Same minimum as SearchForm submit. */
export const RECENT_SEARCH_MIN_LENGTH = 2;

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

/** Plain trimmed query safe for localStorage; null if invalid. */
export function sanitizeRecentSearchQuery(raw: string): string | null {
  const trimmed = raw.trim();
  if (trimmed.length < RECENT_SEARCH_MIN_LENGTH) return null;
  if (trimmed.length > RECENT_SEARCHES_MAX_LENGTH) return null;
  if (/[\n\r\t\u0000-\u001f]/.test(trimmed)) return null;
  return trimmed;
}

export function loadRecentSearches(): string[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(RECENT_SEARCHES_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const out: string[] = [];
    for (const item of parsed) {
      if (typeof item !== "string") continue;
      const safe = sanitizeRecentSearchQuery(item);
      if (safe) out.push(safe);
    }
    return out.slice(0, RECENT_SEARCHES_MAX);
  } catch {
    return [];
  }
}

export function addRecentSearch(query: string): void {
  if (!isBrowser()) return;
  const safe = sanitizeRecentSearchQuery(query);
  if (!safe) return;

  const lower = safe.toLowerCase();
  const existing = loadRecentSearches().filter((q) => q.toLowerCase() !== lower);
  const next = [safe, ...existing].slice(0, RECENT_SEARCHES_MAX);

  try {
    window.localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event(RECENT_SEARCHES_UPDATED_EVENT));
  } catch {
    // Quota or private mode — ignore.
  }
}

export function clearRecentSearches(): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(RECENT_SEARCHES_KEY);
    window.dispatchEvent(new Event(RECENT_SEARCHES_UPDATED_EVENT));
  } catch {
    // ignore
  }
}
