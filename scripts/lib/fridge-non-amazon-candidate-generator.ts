export type CandidateUrl = {
  retailer: string;
  retailer_key: string;
  url: string;
  source: "seeded" | "heuristic";
};

const SEEDED_BY_SLUG: Record<string, CandidateUrl[]> = {
  "da97-08006b": [
    {
      retailer: "AppliancePartsPros",
      retailer_key: "appliancepartspros",
      url: "https://www.appliancepartspros.com/samsung-assy-case-filter-da97-08006b-ap4578378.html",
      source: "seeded",
    },
  ],
  "da97-15217d": [
    {
      retailer: "AppliancePartsPros",
      retailer_key: "appliancepartspros",
      url: "https://www.appliancepartspros.com/samsung-assy-ice-maker-da97-15217d-ap6261445.html",
      source: "seeded",
    },
  ],
  "da29-00012b": [
    {
      retailer: "AllFilters",
      retailer_key: "allfilters",
      url: "https://www.allfilters.com/refrigeratorfilters/samsung/da29-00012a-hafcn",
      source: "seeded",
    },
  ],
};

function normalizedToken(slug: string): string {
  return slug.trim().toLowerCase();
}

export function buildFridgeNonAmazonCandidates(slug: string): CandidateUrl[] {
  const key = normalizedToken(slug);
  const seeded = SEEDED_BY_SLUG[key] ?? [];
  if (seeded.length > 0) return seeded;

  // Heuristic fallback for manual review queueing only; truth is verified in fetched evidence stage.
  return [
    {
      retailer: "AppliancePartsPros",
      retailer_key: "appliancepartspros",
      url: `https://www.appliancepartspros.com/samsung-${key}.html`,
      source: "heuristic",
    },
  ];
}
