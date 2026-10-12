/**
 * /filter/4396710 identity copy.
 * Compatible-model rows for this part were removed with the catalog-completeness
 * sweep class. This module does not filter compatibility at read time.
 */

export const WHIRLPOOL_4396710_SLUG = "4396710" as const;

export const WHIRLPOOL_4396710_TITLE =
  "4396710 Whirlpool Refrigerator Water Filter | Filter 3 / EDR3RXD1" as const;

export const WHIRLPOOL_4396710_H1 = "Whirlpool 4396710 Refrigerator Water Filter" as const;

export const WHIRLPOOL_4396710_META_DESCRIPTION =
  "Historical Whirlpool refrigerator water-filter number 4396710. Current Filter 3 names are EDR3RXD1 and WHR3RXD1. Compare the number on your old filter before you buy." as const;

export const WHIRLPOOL_4396710_OPENING_PARAGRAPHS = [
  "4396710 is a historical Whirlpool refrigerator water-filter part number. Whirlpool historical documentation identifies it as T1RFWB2 / part 4396710.",
  "Current Whirlpool Filter 3 products use the names EDR3RXD1 and WHR3RXD1. Parts listings BuckParts has checked support EDR3RXD1 as a substitute or cross-reference for 4396710. That listing evidence is not Whirlpool’s own proof that the two numbers are the same part, and it does not prove which refrigerator the cartridge fits.",
  "4396710P shows up in replacement references for this family. BuckParts has not proven the P suffix from Whirlpool’s own documentation. 4396701 is a separate part number. Whether 4396710 was sold as a PUR filter is unknown — BuckParts does not have Whirlpool documentation of a PUR name.",
  "BuckParts is not listing refrigerator models for 4396710 until durable fit evidence supports a row. Compare the number on your old filter and your refrigerator manual before you buy.",
] as const;

export const WHIRLPOOL_4396710_FAQS = [
  {
    question: "Is 4396710 the same as EDR3RXD1?",
    answer:
      "BuckParts has not proven that 4396710 and EDR3RXD1 are the identical part. Whirlpool documentation establishes 4396710 as an older refrigerator water-filter part number, while current parts references cross-reference EDR3RXD1 as a substitute. Confirm your refrigerator model before buying.",
  },
  {
    question: "What is 4396710P?",
    answer:
      "4396710P appears in replacement references alongside 4396710. BuckParts has not proven the P suffix from Whirlpool’s own documentation. Use it only as a reference to compare with the number printed on your old filter.",
  },
  {
    question: "Is 4396710 the same as 4396701?",
    answer:
      "No. 4396701 is a different part number. Do not substitute it for 4396710 because the numbers look similar.",
  },
  {
    question: "Was 4396710 a PUR filter?",
    answer:
      "Unknown. BuckParts does not have Whirlpool documentation that 4396710 was branded PUR. Do not assume a PUR name from other sellers’ titles.",
  },
] as const;

export const WHIRLPOOL_4396710_EMPTY_MODELS_COPY =
  "No refrigerator models are listed for 4396710. BuckParts adds a model only when durable fit evidence supports that row. Compare the number on your old filter and your refrigerator manual before you buy." as const;

export function isWhirlpool4396710Page(filterSlug: string | null | undefined): boolean {
  return (filterSlug ?? "").trim().toLowerCase() === WHIRLPOOL_4396710_SLUG;
}

export function refrigeratorFilterPageTitle(args: {
  slug: string;
  oemPartNumber: string;
}): string {
  if (isWhirlpool4396710Page(args.slug)) return WHIRLPOOL_4396710_TITLE;
  return `${args.oemPartNumber} refrigerator filter`;
}

export function refrigeratorFilterPageDescription(args: {
  slug: string;
  oemPartNumber: string;
  genericDescription: string;
}): string {
  if (isWhirlpool4396710Page(args.slug)) return WHIRLPOOL_4396710_META_DESCRIPTION;
  return args.genericDescription;
}
