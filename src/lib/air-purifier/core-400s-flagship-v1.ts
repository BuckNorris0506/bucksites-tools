import type { BuyLinkRow } from "@/components/BuyLinks";
import type { PartTrustSummary } from "@/lib/trust/part-trust";

export const CORE_400S_FLAGSHIP_SLUG = "levoit-core-400s" as const;
export const CORE_400S_STANDARD_FILTER_SLUG = "levoit-rf-rar040" as const;
export const CORE_400S_STANDARD_PART_NUMBER = "LEVOIT-RF-RAR040" as const;
export const CORE_400S_FAMILY_SERIES = "Core 400" as const;
export const CORE_400S_CONFUSABLE_SERIES = ["Core 200", "Core 300", "Core 600"] as const;

export type Core400sFitState = "exact_match" | "no_verified_link";

export type Core400sModelSummary = {
  id: string;
  slug: string;
  model_number: string;
  title?: string | null;
  series?: string | null;
  brand?: { slug?: string | null; name: string };
};

export type Core400sConfusableCandidate = Core400sModelSummary & {
  filters: {
    slug: string;
    oem_part_number: string;
    name?: string | null;
  }[];
};

export type Core400sConfusableFamily = {
  series: (typeof CORE_400S_CONFUSABLE_SERIES)[number];
  filterPartNumbers: string[];
};

export function isCore400sFlagshipSlug(slug: string): boolean {
  return slug.trim().toLowerCase() === CORE_400S_FLAGSHIP_SLUG;
}

export function getCore400sPrimaryVerifiedLink(args: {
  trust?: Pick<PartTrustSummary, "preferred_winner_link"> | null;
  retailerLinks?: BuyLinkRow[];
}): BuyLinkRow | null {
  return args.trust?.preferred_winner_link ?? args.retailerLinks?.[0] ?? null;
}

export function deriveCore400sFitState(args: {
  trust?: Pick<PartTrustSummary, "buyer_path_state"> | null;
  primaryVerifiedLink?: Pick<BuyLinkRow, "browser_truth_classification"> | null;
}): Core400sFitState {
  if (
    args.trust?.buyer_path_state === "show_confident_buy" &&
    args.primaryVerifiedLink?.browser_truth_classification?.trim() === "direct_buyable"
  ) {
    return "exact_match";
  }
  return "no_verified_link";
}

export function core400sFitStateLabel(fitState: Core400sFitState): string {
  if (fitState === "exact_match") return "Exact match - Original part";
  return "No verified link right now";
}

export function formatCore400sVerifiedDate(isoDateTime: string | null | undefined): string | null {
  if (!isoDateTime) return null;
  const ms = Date.parse(isoDateTime);
  if (Number.isNaN(ms)) return null;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(ms));
}

export function sortCore400sModels<T extends Core400sModelSummary>(models: T[]): T[] {
  return [...models].sort((a, b) => {
    const aCurrent = a.slug === CORE_400S_FLAGSHIP_SLUG ? 0 : 1;
    const bCurrent = b.slug === CORE_400S_FLAGSHIP_SLUG ? 0 : 1;
    if (aCurrent !== bCurrent) return aCurrent - bCurrent;
    return a.model_number.localeCompare(b.model_number);
  });
}

export function deriveCore400sConfusableFamilies(
  candidates: Core400sConfusableCandidate[],
): Core400sConfusableFamily[] {
  const families = new Map<string, Set<string>>();
  const unsafeSeries = new Set<string>();

  for (const model of candidates) {
    const series = model.series?.trim();
    if (!isCore400sConfusableSeries(series)) continue;

    if (model.filters.some((filter) => filter.slug === CORE_400S_STANDARD_FILTER_SLUG)) {
      unsafeSeries.add(series);
      families.delete(series);
      continue;
    }

    const differentFilterParts = model.filters
      .filter((filter) => filter.slug !== CORE_400S_STANDARD_FILTER_SLUG)
      .map((filter) => filter.oem_part_number.trim())
      .filter(Boolean);

    if (differentFilterParts.length === 0) {
      families.delete(series);
      continue;
    }

    const set = families.get(series) ?? new Set<string>();
    differentFilterParts.forEach((part) => set.add(part));
    families.set(series, set);
  }

  return CORE_400S_CONFUSABLE_SERIES.flatMap((series) => {
    if (unsafeSeries.has(series)) return [];
    const parts = families.get(series);
    if (!parts || parts.size === 0) return [];
    return [{ series, filterPartNumbers: Array.from(parts).sort() }];
  });
}

function isCore400sConfusableSeries(
  value: string | null | undefined,
): value is (typeof CORE_400S_CONFUSABLE_SERIES)[number] {
  return CORE_400S_CONFUSABLE_SERIES.some((series) => series === value);
}
