import type { CandidateEvidence } from "./non-amazon-review-packets";
import type { CandidateUrl } from "./fridge-non-amazon-candidate-generator";

export type CollectedEvidence = CandidateEvidence & {
  fetch_status: "ok" | "fetch_failed" | "invalid_candidate_url";
  fetch_error: string | null;
  snippet_only_evidence: boolean;
  evidence_source: "fetched_page" | "manual_capture";
  captured_at: string | null;
  raw_excerpt: string | null;
};

export type ManualFallbackCapture = {
  url: string;
  captured_at: string;
  raw_excerpt: string;
};

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function compactSnippet(haystack: string, token: string): string {
  const idx = haystack.toLowerCase().indexOf(token.toLowerCase());
  if (idx < 0) return "";
  const start = Math.max(0, idx - 80);
  const end = Math.min(haystack.length, idx + token.length + 120);
  return haystack.slice(start, end).trim();
}

export function isAllowedNonAmazonProductCandidateUrl(url: string): boolean {
  if (!url.startsWith("http://") && !url.startsWith("https://")) return false;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  const host = parsed.hostname.toLowerCase();
  if (!host || host.includes("amazon.")) return false;
  const lower = url.toLowerCase();
  const blocked = ["/search", "search?", "/category/", "/catalogsearch/", "/result?"];
  return !blocked.some((fragment) => lower.includes(fragment));
}

export function extractEvidenceFromPageText(args: {
  slug: string;
  retailer: string;
  retailer_key: string;
  url: string;
  pageText: string;
}): CollectedEvidence {
  const token = args.slug.toUpperCase();
  const lower = args.pageText.toLowerCase();

  const hasExactToken = lower.includes(token.toLowerCase());
  const tokenSnippet = compactSnippet(args.pageText, token);

  const buyabilityRegex = /(add to cart|in stock|ships|buy now|\$[0-9]+)/i;
  const buyabilityMatch = args.pageText.match(buyabilityRegex)?.[0] ?? "";
  const hasBuyability = Boolean(buyabilityMatch);

  const warningRegex = /(discontinued|no longer available|replaced by|substitute|comparable)/i;
  const warningMatch = args.pageText.match(warningRegex)?.[0] ?? "";
  const hasWarning = Boolean(warningMatch);

  const oemRegex = /(genuine|oem)/i;
  const replacementRegex = /(replacement|compatible)/i;
  const partLabel: "OEM" | "Replacement" | "Compatible" | "Unknown" = oemRegex.test(args.pageText)
    ? "OEM"
    : /replacement/i.test(args.pageText)
      ? "Replacement"
      : /compatible/i.test(args.pageText)
        ? "Compatible"
        : "Unknown";

  return {
    retailer: args.retailer,
    retailer_key: args.retailer_key,
    pdp_url: args.url,
    exact_token_or_alias_proof: hasExactToken
      ? tokenSnippet || `Exact token ${token} found on fetched page.`
      : `Exact token ${token} not found on fetched page.`,
    has_exact_token_or_alias_proof: hasExactToken,
    buyability_evidence: hasBuyability
      ? `Buyability signal found: ${buyabilityMatch}`
      : "No buyability signal found on fetched page.",
    has_buyability_evidence: hasBuyability,
    substitution_or_discontinued_warning_present: hasWarning ? "yes" : "no",
    part_label: partLabel,
    family_gap_source: "money_scoreboard_v1:refrigerator_water:unknown",
    fetch_status: "ok",
    fetch_error: null,
    snippet_only_evidence: false,
    evidence_source: "fetched_page",
    captured_at: null,
    raw_excerpt: args.pageText.slice(0, 600),
  };
}

export function parseManualFallbackCaptures(jsonText: string): Map<string, ManualFallbackCapture> {
  const parsed = JSON.parse(jsonText) as unknown;
  if (!Array.isArray(parsed)) throw new Error("Fallback capture file must be an array.");
  const out = new Map<string, ManualFallbackCapture>();
  for (const row of parsed) {
    const candidate = row as Partial<ManualFallbackCapture>;
    if (!candidate.url || !candidate.captured_at || !candidate.raw_excerpt) {
      throw new Error("Fallback capture row must include url, captured_at, raw_excerpt.");
    }
    out.set(candidate.url, {
      url: candidate.url,
      captured_at: candidate.captured_at,
      raw_excerpt: candidate.raw_excerpt,
    });
  }
  return out;
}

function applyManualFallback(args: {
  slug: string;
  candidate: CandidateUrl;
  fallback: ManualFallbackCapture;
}): CollectedEvidence {
  const base = extractEvidenceFromPageText({
    slug: args.slug,
    retailer: args.candidate.retailer,
    retailer_key: args.candidate.retailer_key,
    url: args.candidate.url,
    pageText: args.fallback.raw_excerpt,
  });
  return {
    ...base,
    fetch_status: "ok",
    fetch_error: null,
    snippet_only_evidence: false,
    evidence_source: "manual_capture",
    captured_at: args.fallback.captured_at,
    raw_excerpt: args.fallback.raw_excerpt,
  };
}

export async function collectEvidenceForCandidate(args: {
  slug: string;
  candidate: CandidateUrl;
  fetchImpl?: typeof fetch;
  fallbackByUrl?: Map<string, ManualFallbackCapture>;
}): Promise<CollectedEvidence> {
  const fetchFn = args.fetchImpl ?? fetch;
  const token = args.slug.toUpperCase();

  if (!isAllowedNonAmazonProductCandidateUrl(args.candidate.url)) {
    return {
      retailer: args.candidate.retailer,
      retailer_key: args.candidate.retailer_key,
      pdp_url: args.candidate.url,
      exact_token_or_alias_proof: `Candidate URL rejected by non-Amazon PDP URL gate for ${token}.`,
      has_exact_token_or_alias_proof: false,
      buyability_evidence: "Candidate URL rejected before fetch.",
      has_buyability_evidence: false,
      substitution_or_discontinued_warning_present: "unknown",
      part_label: "Unknown",
      family_gap_source: "money_scoreboard_v1:refrigerator_water:unknown",
      fetch_status: "invalid_candidate_url",
      fetch_error: null,
      snippet_only_evidence: true,
      evidence_source: "fetched_page",
      captured_at: null,
      raw_excerpt: null,
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const res = await fetchFn(args.candidate.url, { signal: controller.signal });
    if (!res.ok) {
      const isHardReject404 = res.status === 404;
      const allowFallback = res.status === 403;
      const fallback = allowFallback ? args.fallbackByUrl?.get(args.candidate.url) : undefined;
      if (fallback) {
        return applyManualFallback({
          slug: args.slug,
          candidate: args.candidate,
          fallback,
        });
      }
      return {
        retailer: args.candidate.retailer,
        retailer_key: args.candidate.retailer_key,
        pdp_url: args.candidate.url,
        exact_token_or_alias_proof: isHardReject404
          ? `Fetch status 404; candidate URL rejected as non-existent for ${token}.`
          : `Fetch status ${res.status}; exact token ${token} not proven.`,
        has_exact_token_or_alias_proof: false,
        buyability_evidence: isHardReject404
          ? "Candidate URL returned 404; no buyability can be verified."
          : `Fetch status ${res.status}; buyability not proven.`,
        has_buyability_evidence: false,
        substitution_or_discontinued_warning_present: isHardReject404 ? "yes" : "unknown",
        part_label: "Unknown",
        family_gap_source: "money_scoreboard_v1:refrigerator_water:unknown",
        fetch_status: "fetch_failed",
        fetch_error: `HTTP ${res.status}`,
        snippet_only_evidence: true,
        evidence_source: "fetched_page",
        captured_at: null,
        raw_excerpt: null,
      };
    }
    const html = await res.text();
    const text = stripHtml(html);
    return extractEvidenceFromPageText({
      slug: args.slug,
      retailer: args.candidate.retailer,
      retailer_key: args.candidate.retailer_key,
      url: args.candidate.url,
      pageText: text,
    });
  } catch (err) {
    const fallback = args.fallbackByUrl?.get(args.candidate.url);
    if (fallback) {
      return applyManualFallback({
        slug: args.slug,
        candidate: args.candidate,
        fallback,
      });
    }
    return {
      retailer: args.candidate.retailer,
      retailer_key: args.candidate.retailer_key,
      pdp_url: args.candidate.url,
      exact_token_or_alias_proof: `Fetch failed; exact token ${token} not proven.`,
      has_exact_token_or_alias_proof: false,
      buyability_evidence: "Fetch failed; buyability not proven.",
      has_buyability_evidence: false,
      substitution_or_discontinued_warning_present: "unknown",
      part_label: "Unknown",
      family_gap_source: "money_scoreboard_v1:refrigerator_water:unknown",
      fetch_status: "fetch_failed",
      fetch_error: err instanceof Error ? err.message : String(err),
      snippet_only_evidence: true,
      evidence_source: "fetched_page",
      captured_at: null,
      raw_excerpt: null,
    };
  } finally {
    clearTimeout(timeout);
  }
}
