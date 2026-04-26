import fs from "node:fs";

import {
  hasStrictTokenEvidence,
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

export type EnrichmentDiagnosticClassification =
  | "fetch_interstitial"
  | "candidate_token_mismatch"
  | "no_candidate"
  | "token_pass";

export type EnrichmentDiagnosticResult = {
  filter_slug: string;
  classification: EnrichmentDiagnosticClassification;
  required_tokens: string[];
  candidate_url: string | null;
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

const WHOLE_HOUSE_WATER_FILTERS_CSV = "data/whole-house-water/filters.csv";
const WHOLE_HOUSE_WATER_ALIASES_CSV = "data/whole-house-water/filter_aliases.csv";

function parseCsvLine(line: string): string[] {
  return line.split(",");
}

function interstitialLikeBodyText(bodyText: string): boolean {
  return (
    /captcha|robot|automated access|verify you are human|sorry, we just need to make sure/i.test(bodyText) ||
    /click the button below to continue shopping/i.test(bodyText)
  );
}

function loadWholeHouseWaterCatalogTokensBySlug(): Map<string, string[]> {
  const out = new Map<string, string[]>();

  const filtersCsv = fs.readFileSync(WHOLE_HOUSE_WATER_FILTERS_CSV, "utf8").trim().split(/\r?\n/);
  for (let i = 1; i < filtersCsv.length; i += 1) {
    const cols = parseCsvLine(filtersCsv[i] ?? "");
    const slug = (cols[1] ?? "").trim();
    const oem = (cols[2] ?? "").trim();
    if (!slug || !oem) continue;
    out.set(slug, [oem]);
  }

  const aliasesCsv = fs.readFileSync(WHOLE_HOUSE_WATER_ALIASES_CSV, "utf8").trim().split(/\r?\n/);
  for (let i = 1; i < aliasesCsv.length; i += 1) {
    const cols = parseCsvLine(aliasesCsv[i] ?? "");
    const slug = (cols[0] ?? "").trim();
    const alias = (cols[1] ?? "").trim();
    if (!slug || !alias) continue;
    const existing = out.get(slug) ?? [];
    if (!existing.includes(alias)) existing.push(alias);
    out.set(slug, existing);
  }

  return out;
}

function requiredTokensForFilter(args: {
  filterSlug: string;
  wedge?: "whole_house_water" | "refrigerator_water";
  catalogTokensBySlug?: Map<string, string[]>;
}): string[] {
  const catalogTokens = args.catalogTokensBySlug?.get(args.filterSlug) ?? [];
  if (catalogTokens.length > 0) return catalogTokens;
  return strictEvidenceTokensFromFilterSlug(args.filterSlug);
}

export async function generateHqiiAmazonCandidatesFromSearchHits(args: {
  filterSlug: string;
  searchHits: SearchHit[];
  fetchBodyText: (url: string) => Promise<string>;
  wedge?: "whole_house_water" | "refrigerator_water";
  catalogTokensBySlug?: Map<string, string[]>;
}): Promise<HqiiDiscoveryCandidateRow[]> {
  const requiredTokens = requiredTokensForFilter({
    filterSlug: args.filterSlug,
    wedge: args.wedge,
    catalogTokensBySlug: args.catalogTokensBySlug,
  });
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

export async function diagnoseHqiiAmazonEnrichment(args: {
  filterSlug: string;
  searchHits: SearchHit[];
  fetchBodyText: (url: string) => Promise<string>;
  wedge?: "whole_house_water" | "refrigerator_water";
  catalogTokensBySlug?: Map<string, string[]>;
}): Promise<EnrichmentDiagnosticResult> {
  const requiredTokens = requiredTokensForFilter({
    filterSlug: args.filterSlug,
    wedge: args.wedge,
    catalogTokensBySlug: args.catalogTokensBySlug,
  });
  if (requiredTokens.length === 0) {
    return {
      filter_slug: args.filterSlug,
      classification: "candidate_token_mismatch",
      required_tokens: [],
      candidate_url: null,
      notes: "No strict required tokens were available.",
    };
  }

  const extracted = extractAmazonProductCandidates(args.searchHits);
  if (extracted.length === 0) {
    return {
      filter_slug: args.filterSlug,
      classification: "no_candidate",
      required_tokens: requiredTokens,
      candidate_url: null,
      notes: "No canonical Amazon PDP candidate URL was found.",
    };
  }

  const candidate = extracted[0];
  const body = await args.fetchBodyText(candidate.canonical_url);
  if (interstitialLikeBodyText(body)) {
    return {
      filter_slug: args.filterSlug,
      classification: "fetch_interstitial",
      required_tokens: requiredTokens,
      candidate_url: candidate.canonical_url,
      notes: "Fetched body appears to be interstitial/challenge content, not PDP body text.",
    };
  }

  if (!hasStrictTokenEvidence(body, requiredTokens)) {
    return {
      filter_slug: args.filterSlug,
      classification: "candidate_token_mismatch",
      required_tokens: requiredTokens,
      candidate_url: candidate.canonical_url,
      notes: "Candidate PDP body was fetched but required tokens were not present.",
    };
  }

  return {
    filter_slug: args.filterSlug,
    classification: "token_pass",
    required_tokens: requiredTokens,
    candidate_url: candidate.canonical_url,
    notes: "Candidate PDP body passed strict token evidence.",
  };
}

export function loadCatalogTokensBySlugForWholeHouseWater(): Map<string, string[]> {
  return loadWholeHouseWaterCatalogTokensBySlug();
}
