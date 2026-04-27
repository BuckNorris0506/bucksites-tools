type RetailerDomainConfig = {
  retailer: string;
  retailer_key: string;
  domains: string[];
};

type SearchResult = {
  url: string;
  snippet?: string;
  title?: string;
};

export type SearchDiscoveredCandidate = {
  retailer: string;
  retailer_key: string;
  url: string;
  source: "search_discovered";
  query: string;
  snippet: string;
};

type SearchImpl = (query: string, numResults: number) => Promise<SearchResult[]>;

const DEFAULT_RETAILER_CONFIGS: RetailerDomainConfig[] = [
  {
    retailer: "AppliancePartsPros",
    retailer_key: "appliancepartspros",
    domains: ["appliancepartspros.com", "www.appliancepartspros.com"],
  },
  { retailer: "RepairClinic", retailer_key: "repairclinic", domains: ["repairclinic.com", "www.repairclinic.com"] },
  { retailer: "PartSelect", retailer_key: "partselect", domains: ["partselect.com", "www.partselect.com"] },
  {
    retailer: "Sears PartsDirect",
    retailer_key: "searspartsdirect",
    domains: ["searspartsdirect.com", "www.searspartsdirect.com"],
  },
  { retailer: "AllFilters", retailer_key: "allfilters", domains: ["allfilters.com", "www.allfilters.com"] },
];

function normalizeUrl(url: string): string {
  try {
    const u = new URL(url.trim());
    const host = u.hostname.toLowerCase();
    const path = u.pathname.replace(/\/+$/, "");
    return `${u.protocol}//${host}${path}${u.search}`;
  } catch {
    return url.trim().toLowerCase();
  }
}

function isAmazonUrl(url: string): boolean {
  try {
    return new URL(url).hostname.toLowerCase().includes("amazon.");
  } catch {
    return true;
  }
}

function isSearchOrCategoryLike(url: string): boolean {
  const lower = url.toLowerCase();
  const blocked = ["/search", "search?", "/category/", "/catalogsearch/", "/result?", "query="];
  return blocked.some((term) => lower.includes(term));
}

function buildDomainScopedQueries(slug: string, domains: string[]): string[] {
  return domains.map((domain) => `${slug} refrigerator water filter product page site:${domain}`);
}

function scoreResult(slug: string, url: string, snippet: string): number {
  const token = slug.toLowerCase();
  let score = 0;
  const haystack = `${url} ${snippet}`.toLowerCase();
  if (haystack.includes(token)) score += 10;
  if (!isSearchOrCategoryLike(url)) score += 4;
  if (/\.(html|aspx)$/.test(url.toLowerCase())) score += 2;
  return score;
}

function retailerConfigForUrl(url: string, configs: RetailerDomainConfig[]): RetailerDomainConfig | null {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return configs.find((cfg) => cfg.domains.some((d) => d.toLowerCase() === host)) ?? null;
  } catch {
    return null;
  }
}

export function shouldAcceptSearchUrl(url: string): boolean {
  if (!url.startsWith("http://") && !url.startsWith("https://")) return false;
  if (isAmazonUrl(url)) return false;
  if (isSearchOrCategoryLike(url)) return false;
  return true;
}

export function dedupeByNormalizedUrl<T extends { url: string }>(rows: T[]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const row of rows) {
    const key = normalizeUrl(row.url);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(row);
  }
  return out;
}

async function exaSearch(query: string, numResults: number): Promise<SearchResult[]> {
  const apiKey = process.env.EXA_API_KEY;
  if (!apiKey) return [];
  const res = await fetch("https://api.exa.ai/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
    },
    body: JSON.stringify({
      query,
      numResults,
      type: "auto",
      text: true,
    }),
  });
  if (!res.ok) return [];
  const data = (await res.json()) as {
    results?: Array<{ url?: string; text?: string; title?: string; snippet?: string }>;
  };
  return (data.results ?? [])
    .map((r) => ({
      url: (r.url ?? "").trim(),
      snippet: (r.snippet ?? r.text ?? "").slice(0, 500),
      title: r.title ?? "",
    }))
    .filter((r) => Boolean(r.url));
}

export async function discoverFridgeNonAmazonCandidates(args: {
  slug: string;
  retailerAllowlist?: string[];
  maxCandidates?: number;
  searchImpl?: SearchImpl;
}): Promise<SearchDiscoveredCandidate[]> {
  const slug = args.slug.trim().toLowerCase();
  if (!slug) return [];
  const maxCandidates = Math.max(1, Math.min(args.maxCandidates ?? 5, 25));
  const search = args.searchImpl ?? exaSearch;

  const allowSet = new Set((args.retailerAllowlist ?? []).map((k) => k.trim().toLowerCase()));
  const configs = DEFAULT_RETAILER_CONFIGS.filter((cfg) =>
    allowSet.size === 0 ? true : allowSet.has(cfg.retailer_key.toLowerCase()),
  );

  const discovered: Array<SearchDiscoveredCandidate & { _score: number }> = [];
  for (const cfg of configs) {
    const queries = buildDomainScopedQueries(slug, cfg.domains.slice(0, 1));
    for (const query of queries) {
      const results = await search(query, 5);
      for (const result of results) {
        if (!shouldAcceptSearchUrl(result.url)) continue;
        const retailer = retailerConfigForUrl(result.url, configs);
        if (!retailer) continue;
        const snippet = result.snippet ?? "";
        discovered.push({
          retailer: retailer.retailer,
          retailer_key: retailer.retailer_key,
          url: result.url,
          source: "search_discovered",
          query,
          snippet,
          _score: scoreResult(slug, result.url, snippet),
        });
      }
    }
  }

  return dedupeByNormalizedUrl(discovered)
    .sort((a, b) => b._score - a._score)
    .slice(0, maxCandidates)
    .map(({ _score: _ignored, ...candidate }) => candidate);
}
