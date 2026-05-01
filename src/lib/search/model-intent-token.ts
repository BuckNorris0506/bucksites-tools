const GENERIC_NON_MODEL_TOKENS = new Set([
  "filter",
  "filters",
  "replacement",
  "replacements",
  "cartridge",
  "cartridges",
]);

function tokenizeQuery(rawQuery: string): string[] {
  return rawQuery
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .map((token) => token.replace(/[^a-z0-9-]/g, ""))
    .filter((token) => token.length > 0);
}

export function extractModelIntentToken(rawQuery: string): string | null {
  const tokens = tokenizeQuery(rawQuery);
  if (tokens.length < 2) return null;

  const candidates = tokens.filter((token) => !GENERIC_NON_MODEL_TOKENS.has(token));
  if (candidates.length === 0) return null;

  // Prefer model-ish tokens that include digits or delimiters (ex: lap-v102s-aasr).
  for (let i = candidates.length - 1; i >= 0; i -= 1) {
    const token = candidates[i]!;
    if (/[0-9]/.test(token) || token.includes("-")) {
      return token;
    }
  }

  // Fallback to short alpha prefixes (ex: "lap"), but avoid likely brand-only tokens.
  for (let i = candidates.length - 1; i >= 0; i -= 1) {
    const token = candidates[i]!;
    if (/^[a-z]{3,5}$/.test(token)) {
      return token;
    }
  }

  return null;
}
