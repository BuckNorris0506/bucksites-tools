/**
 * Reusable public copy for a filter whose manufacturer compatibility list is
 * already backed by repo mappings and a first-party product page.
 * Does not create URLs. Unknown clusters keep the generic vertical copy.
 */

import { SITE_DISPLAY_NAME } from "@/lib/site-brand";

export type ManufacturerSupportedClusterModelV1 = {
  slug: string;
  /** Short model token used in titles, for example HP300. */
  modelToken: string;
};

export type ManufacturerSupportedFilterClusterV1 = {
  filterSlug: string;
  brandName: string;
  oemPartNumber: string;
  models: readonly ManufacturerSupportedClusterModelV1[];
  /**
   * Internal only. SharkNinja HE3FKPET PDP, checked 2026-10-12:
   * https://www.sharkninja.com/shark-neverchangeanti-allergen-true-hepa-filter/HE3FKPET.html
   * Product details: "Compatible with: HP300, HP301, HP302, HP305" and "Model: HE3FKPET".
   * Same statement on the sharkclean.com PDP that redirects there.
   * Catalog rows: data/air-purifier/compatibility_mappings.csv,
   * data/air-purifier/filters.csv, data/air-purifier/models.csv,
   * data/air-purifier/retailer_links.csv.
   */
  internalEvidenceDoc: string;
};

const CLUSTERS_V1: readonly ManufacturerSupportedFilterClusterV1[] = [
  {
    filterSlug: "shark-hepa-he3fkp",
    brandName: "Shark",
    oemPartNumber: "HE3FKPET",
    models: [
      { slug: "shark-hp300", modelToken: "HP300" },
      { slug: "shark-hp301", modelToken: "HP301" },
      { slug: "shark-hp302", modelToken: "HP302" },
      { slug: "shark-hp305", modelToken: "HP305" },
    ],
    internalEvidenceDoc: "data/air-purifier/compatibility_mappings.csv",
  },
];

const CONFIRM_BEFORE_PURCHASE =
  "Confirm the model label and listing number before purchase.";

export type ManufacturerSupportedFilterPageCopyV1 = {
  documentTitle: string;
  h1: string;
  nearH1: string;
  modelsSectionTitle: string;
};

export type ManufacturerSupportedModelPageCopyV1 = {
  documentTitle: string;
  h1: string;
  fitSentence: string;
  detailAnchor: string;
  filterSlug: string;
};

function normalizeSlug(slug: string): string {
  return slug.trim().toLowerCase();
}

function clusterByFilterSlug(
  filterSlug: string,
): ManufacturerSupportedFilterClusterV1 | null {
  const slug = normalizeSlug(filterSlug);
  return CLUSTERS_V1.find((cluster) => cluster.filterSlug === slug) ?? null;
}

function clusterByModelSlug(
  modelSlug: string,
): {
  cluster: ManufacturerSupportedFilterClusterV1;
  model: ManufacturerSupportedClusterModelV1;
} | null {
  const slug = normalizeSlug(modelSlug);
  for (const cluster of CLUSTERS_V1) {
    const model = cluster.models.find((entry) => entry.slug === slug);
    if (model) return { cluster, model };
  }
  return null;
}

function joinSentenceList(tokens: readonly string[]): string {
  if (tokens.length <= 1) return tokens[0] ?? "";
  if (tokens.length === 2) return `${tokens[0]} and ${tokens[1]}`;
  return `${tokens.slice(0, -1).join(", ")}, and ${tokens[tokens.length - 1]}`;
}

function joinTitleList(tokens: readonly string[]): string {
  if (tokens.length <= 1) return tokens[0] ?? "";
  if (tokens.length === 2) return `${tokens[0]} & ${tokens[1]}`;
  return `${tokens.slice(0, -1).join(", ")} & ${tokens[tokens.length - 1]}`;
}

/**
 * Filter-page copy when every displayed model is on the manufacturer list.
 * The sentence and title name only those displayed models, in list order.
 */
export function manufacturerSupportedFilterPageCopyV1(
  filterSlug: string,
  displayedModelSlugs: readonly string[],
): ManufacturerSupportedFilterPageCopyV1 | null {
  const cluster = clusterByFilterSlug(filterSlug);
  if (!cluster) return null;

  const displayed = new Set(displayedModelSlugs.map(normalizeSlug));
  if (displayed.size === 0) return null;

  const known = new Set(cluster.models.map((model) => model.slug));
  for (const slug of displayed) {
    if (!known.has(slug)) return null;
  }

  const listed = cluster.models.filter((model) => displayed.has(model.slug));
  if (listed.length === 0) return null;

  const tokens = listed.map((model) => model.modelToken);
  const h1 = `${cluster.brandName} ${cluster.oemPartNumber} Replacement Filter`;
  return {
    documentTitle: `${h1} – ${joinTitleList(tokens)} | ${SITE_DISPLAY_NAME}`,
    h1,
    nearH1: `${cluster.brandName} lists ${cluster.oemPartNumber} as compatible with ${joinSentenceList(tokens)}.`,
    modelsSectionTitle: `${cluster.brandName} models that use ${cluster.oemPartNumber}`,
  };
}

/**
 * Model-page copy when the displayed primary filter is the manufacturer-listed part.
 */
export function manufacturerSupportedModelPageCopyV1(args: {
  modelSlug: string;
  primaryFilterSlug: string | null;
}): ManufacturerSupportedModelPageCopyV1 | null {
  const match = clusterByModelSlug(args.modelSlug);
  if (!match) return null;
  if (normalizeSlug(args.primaryFilterSlug ?? "") !== match.cluster.filterSlug) return null;

  const h1 = `${match.cluster.brandName} ${match.model.modelToken} Replacement Filter`;
  return {
    documentTitle: `${h1} – ${match.cluster.oemPartNumber} | ${SITE_DISPLAY_NAME}`,
    h1,
    fitSentence: `${match.cluster.brandName} lists ${match.cluster.oemPartNumber} as compatible with the ${match.model.modelToken}. ${CONFIRM_BEFORE_PURCHASE}`,
    detailAnchor: `${match.cluster.oemPartNumber} replacement filter details`,
    filterSlug: match.cluster.filterSlug,
  };
}
