import type { CandidateEvidence } from "./non-amazon-review-packets";
import type { CandidateUrl } from "./fridge-non-amazon-candidate-generator";

export type CollectedEvidence = CandidateEvidence & {
  fetch_status: "ok" | "fetch_failed" | "invalid_candidate_url";
  fetch_error: string | null;
  snippet_only_evidence: boolean;
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
  };
}

export async function collectEvidenceForCandidate(args: {
  slug: string;
  candidate: CandidateUrl;
  fetchImpl?: typeof fetch;
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
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const res = await fetchFn(args.candidate.url, { signal: controller.signal });
    if (!res.ok) {
      return {
        retailer: args.candidate.retailer,
        retailer_key: args.candidate.retailer_key,
        pdp_url: args.candidate.url,
        exact_token_or_alias_proof: `Fetch status ${res.status}; exact token ${token} not proven.`,
        has_exact_token_or_alias_proof: false,
        buyability_evidence: `Fetch status ${res.status}; buyability not proven.`,
        has_buyability_evidence: false,
        substitution_or_discontinued_warning_present: "unknown",
        part_label: "Unknown",
        family_gap_source: "money_scoreboard_v1:refrigerator_water:unknown",
        fetch_status: "fetch_failed",
        fetch_error: `HTTP ${res.status}`,
        snippet_only_evidence: true,
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
    };
  } finally {
    clearTimeout(timeout);
  }
}
