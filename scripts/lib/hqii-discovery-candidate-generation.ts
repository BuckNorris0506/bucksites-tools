import {
  enrichCandidatesWithBodyEvidence,
  extractAmazonProductCandidates,
  type SearchHit,
} from "./discovery-candidate-enrichment";

export type HqiiDiscoveryCandidateRow = {
  filter_slug: string;
  retailer_name: "Amazon";
  url: string;
  notes: string;
};

function strictEvidenceTokensFromFilterSlug(filterSlug: string): string[] {
  const parts = filterSlug
    .trim()
    .split("-")
    .filter((p) => p.length > 0);
  if (parts.length <= 1) return [];
  // Repo-truth strictness: keep the exact family token shape (hyphenated, uppercase).
  const token = parts.slice(1).join("-").toUpperCase();
  return [token];
}

export async function generateHqiiAmazonCandidatesFromSearchHits(args: {
  filterSlug: string;
  searchHits: SearchHit[];
  fetchBodyText: (url: string) => Promise<string>;
}): Promise<HqiiDiscoveryCandidateRow[]> {
  const requiredTokens = strictEvidenceTokensFromFilterSlug(args.filterSlug);
  if (requiredTokens.length === 0) return [];

  const extracted = extractAmazonProductCandidates(args.searchHits);
  if (extracted.length === 0) return [];

  const enriched = await enrichCandidatesWithBodyEvidence({
    candidates: extracted,
    requiredTokens,
    fetchBodyText: args.fetchBodyText,
  });

  return enriched.map((candidate) => ({
    filter_slug: args.filterSlug,
    retailer_name: "Amazon",
    url: candidate.canonical_url,
    notes: `ASIN ${candidate.asin} passed strict evidence token gate (${requiredTokens.join(", ")}) from fetched PDP body.`,
  }));
}
