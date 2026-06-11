/**
 * Read-only display overrides for known-wrong compat rows still in Supabase/CSV.
 * Hides misleading model↔filter links on customer pages without mutating catalog data.
 */

export type AirPurifierCompatDisplayExclusionV1 = {
  filter_slug: string;
  excluded_model_slug: string;
  evidence_basis: "PROVEN";
  internal_evidence_doc: string;
  public_filter_page_note: string;
};

const EXCLUSIONS_V1: AirPurifierCompatDisplayExclusionV1[] = [
  {
    filter_slug: "blueair-particle-411",
    excluded_model_slug: "blueair-411a-max",
    evidence_basis: "PROVEN",
    internal_evidence_doc:
      "data/air-purifier/batch-production/agent-packets/ap-blueair-catalog-identity-v1.json",
    public_filter_page_note:
      "Blue Pure 411a Max uses a different cartridge (F4MAX) than this PART411 filter. Do not buy this filter for a 411a Max until BuckParts verifies compatibility.",
  },
];

export function filterPageCompatExclusionNoteV1(filterSlug: string): string | null {
  const slug = filterSlug.trim().toLowerCase();
  const row = EXCLUSIONS_V1.find((entry) => entry.filter_slug === slug);
  return row?.public_filter_page_note ?? null;
}

export function filterCompatModelsForCustomerDisplayV1<T extends { slug: string }>(
  filterSlug: string,
  models: T[],
): T[] {
  const slug = filterSlug.trim().toLowerCase();
  const excluded = new Set(
    EXCLUSIONS_V1.filter((entry) => entry.filter_slug === slug).map(
      (entry) => entry.excluded_model_slug,
    ),
  );
  if (excluded.size === 0) return models;
  return models.filter((model) => !excluded.has(model.slug.trim().toLowerCase()));
}
