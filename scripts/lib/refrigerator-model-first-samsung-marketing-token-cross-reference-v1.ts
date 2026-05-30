/**
 * Evidence-backed Samsung refrigerator marketing-token ↔ part-number-family cross-reference v1.
 * Limited to Samsung HAF-QIN / HAF-CIN vs DA97-17376* / DA29-00020* families only.
 */

export const REFRIGERATOR_MODEL_FIRST_SAMSUNG_MARKETING_TOKEN_CROSS_REFERENCE_CONTRACT_V1 =
  "refrigerator_model_first_samsung_marketing_token_cross_reference_v1" as const;

export type SamsungRefrigeratorMarketingTokenFamilyV1 = {
  marketing_token: "HAF-QIN" | "HAF-CIN";
  marketing_token_normalized: "HAFQIN" | "HAFCIN";
  allowed_filter_slugs: readonly string[];
  canonical_filter_slug: string;
  oem_part_number_family_label: string;
  evidence_sources: readonly string[];
};

/** Committed repo evidence — not broad substring matching. */
export const SAMSUNG_REFRIGERATOR_MARKETING_TOKEN_FAMILIES_V1: Readonly<
  Record<SamsungRefrigeratorMarketingTokenFamilyV1["marketing_token_normalized"], SamsungRefrigeratorMarketingTokenFamilyV1>
> = {
  HAFQIN: {
    marketing_token: "HAF-QIN",
    marketing_token_normalized: "HAFQIN",
    allowed_filter_slugs: ["da97-17376a", "da97-17376b"],
    canonical_filter_slug: "da97-17376b",
    oem_part_number_family_label: "DA97-17376B",
    evidence_sources: [
      "data/filters.csv: da97-17376b OEM DA97-17376B — Samsung DA97-17376B / HAF-QIN family",
      "data/filters.csv: da97-17376a OEM DA97-17376A — HAF-QIN variant",
      "data/manual-evidence/refrigerator/samsung-rf28r7351sg.json: Water Filter HAF-QIN / DA97-17376B",
      "data/manual-evidence/refrigerator/samsung-rf28r7201sr.json: HAF-QIN / DA97-17376B",
    ],
  },
  HAFCIN: {
    marketing_token: "HAF-CIN",
    marketing_token_normalized: "HAFCIN",
    allowed_filter_slugs: ["da29-00020b"],
    canonical_filter_slug: "da29-00020b",
    oem_part_number_family_label: "DA29-00020B",
    evidence_sources: [
      "data/filters.csv: da29-00020b OEM DA29-00020B — Samsung DA29-00020B / HAF-CIN family",
      "data/manual-evidence/refrigerator/samsung-rf263beaesr.json: Water Filter HAF-CIN / DA29-00020B",
      "data/manual-evidence/refrigerator/samsung-rf28nhedbsr.json: HAF-CIN / DA29-00020B",
    ],
  },
} as const;

export function normalizeRefrigeratorFilterTokenV1(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function isSamsungRefrigeratorMarketingTokenV1(officialToken: string): boolean {
  const norm = normalizeRefrigeratorFilterTokenV1(officialToken);
  return norm in SAMSUNG_REFRIGERATOR_MARKETING_TOKEN_FAMILIES_V1;
}

export function samsungRefrigeratorLegacySlugMatchesMarketingTokenV1(args: {
  officialToken: string;
  filterSlug: string;
}): boolean {
  const officialNorm = normalizeRefrigeratorFilterTokenV1(args.officialToken);
  const family =
    SAMSUNG_REFRIGERATOR_MARKETING_TOKEN_FAMILIES_V1[
      officialNorm as SamsungRefrigeratorMarketingTokenFamilyV1["marketing_token_normalized"]
    ];
  if (!family) return false;
  return family.allowed_filter_slugs.includes(args.filterSlug.trim().toLowerCase());
}

function nonSamsungLegacySlugMatchesOfficialTokenV1(args: {
  officialToken: string;
  filterSlug: string;
  filterOemBySlug: Map<string, string>;
}): boolean {
  const officialNorm = normalizeRefrigeratorFilterTokenV1(args.officialToken);
  const oem = args.filterOemBySlug.get(args.filterSlug) ?? args.filterSlug;
  const oemNorm = normalizeRefrigeratorFilterTokenV1(oem);
  return (
    oemNorm === officialNorm ||
    oemNorm.startsWith(officialNorm) ||
    officialNorm.startsWith(oemNorm)
  );
}

/**
 * Returns true only when every legacy slug matches the official token under brand-appropriate rules.
 * Samsung HAF-QIN/HAF-CIN use explicit allowed slug families; all other brands keep exact-token gates.
 */
export function legacyFilterSlugsMatchOfficialTokenV1(args: {
  brandSlug: string;
  officialToken: string;
  legacyFilterSlugs: string[];
  filterOemBySlug: Map<string, string>;
}): boolean {
  if (args.legacyFilterSlugs.length === 0) return false;

  const brand = args.brandSlug.trim().toLowerCase();
  const useSamsungCrossRef =
    brand === "samsung" && isSamsungRefrigeratorMarketingTokenV1(args.officialToken);

  return args.legacyFilterSlugs.every((filterSlug) => {
    if (useSamsungCrossRef) {
      return samsungRefrigeratorLegacySlugMatchesMarketingTokenV1({
        officialToken: args.officialToken,
        filterSlug,
      });
    }
    return nonSamsungLegacySlugMatchesOfficialTokenV1({
      officialToken: args.officialToken,
      filterSlug,
      filterOemBySlug: args.filterOemBySlug,
    });
  });
}

export function canonicalSamsungRefrigeratorFilterSlugV1(args: {
  officialToken: string;
  filterOemBySlug: Map<string, string>;
}): string | null {
  const officialNorm = normalizeRefrigeratorFilterTokenV1(args.officialToken);
  const family =
    SAMSUNG_REFRIGERATOR_MARKETING_TOKEN_FAMILIES_V1[
      officialNorm as SamsungRefrigeratorMarketingTokenFamilyV1["marketing_token_normalized"]
    ];
  if (!family) return null;
  if (args.filterOemBySlug.has(family.canonical_filter_slug)) return family.canonical_filter_slug;
  return family.allowed_filter_slugs.find((slug) => args.filterOemBySlug.has(slug)) ?? null;
}
