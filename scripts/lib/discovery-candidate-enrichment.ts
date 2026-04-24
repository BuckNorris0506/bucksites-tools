export type SearchHit = {
  url: string;
  snippet: string;
};

export type DiscoveryCandidate = {
  asin: string;
  raw_url: string;
  canonical_url: string;
  snippet: string;
};

export type EnrichedDiscoveryCandidate = DiscoveryCandidate & {
  evidence_tokens: string[];
};

function normalizeHost(host: string): string {
  return host.toLowerCase();
}

function compactToken(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function canonicalAmazonDpUrl(inputUrl: string): string | null {
  let u: URL;
  try {
    u = new URL(inputUrl);
  } catch {
    return null;
  }

  const host = normalizeHost(u.hostname);
  if (!host.endsWith("amazon.com")) return null;

  const dpMatch = u.pathname.match(/\/dp\/([a-z0-9]{10})(?:[/?]|$)/i);
  if (!dpMatch) return null;

  const asin = dpMatch[1].toUpperCase();
  return `https://www.amazon.com/dp/${asin}`;
}

export function extractAmazonProductCandidates(hits: SearchHit[]): DiscoveryCandidate[] {
  const out: DiscoveryCandidate[] = [];
  const seen = new Set<string>();

  for (const hit of hits) {
    const canonical = canonicalAmazonDpUrl(hit.url);
    if (!canonical) continue;
    if (seen.has(canonical)) continue;
    seen.add(canonical);
    out.push({
      asin: canonical.slice(-10),
      raw_url: hit.url,
      canonical_url: canonical,
      snippet: hit.snippet,
    });
  }

  return out;
}

export function hasStrictTokenEvidence(bodyText: string, requiredTokens: string[]): boolean {
  const bodyCompact = compactToken(bodyText);
  const tokens = requiredTokens
    .map((t) => t.trim())
    .filter((t) => t.length >= 4)
    .map(compactToken)
    .filter((t) => t.length >= 4);

  if (tokens.length === 0) return false;
  return tokens.every((token) => bodyCompact.includes(token));
}

export async function enrichCandidatesWithBodyEvidence(args: {
  candidates: DiscoveryCandidate[];
  requiredTokens: string[];
  fetchBodyText: (url: string) => Promise<string>;
}): Promise<EnrichedDiscoveryCandidate[]> {
  const out: EnrichedDiscoveryCandidate[] = [];
  for (const candidate of args.candidates) {
    const body = await args.fetchBodyText(candidate.canonical_url);
    if (!hasStrictTokenEvidence(body, args.requiredTokens)) continue;
    out.push({ ...candidate, evidence_tokens: [...args.requiredTokens] });
  }
  return out;
}
