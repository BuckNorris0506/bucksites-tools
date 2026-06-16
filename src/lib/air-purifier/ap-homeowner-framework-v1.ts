import type { BuyLinkRow } from "@/components/BuyLinks";
import { formatCore400sAlsoFitsDisplay } from "@/lib/air-purifier/core-400s-flagship-v1";
import type { PartTrustSummary } from "@/lib/trust/part-trust";

export const AP_HOMEOWNER_FILTER_PILOT_SLUGS = [
  "medify-ma50-rf",
  "levoit-rf-rar040",
  "coway-max2-hepa",
] as const;

export type ApHomeownerFilterPilotSlug = (typeof AP_HOMEOWNER_FILTER_PILOT_SLUGS)[number];

export type ApHomeownerFitState = "exact_match" | "no_verified_link";

export type ApHomeownerCompatModel = {
  id: string;
  slug: string;
  model_number: string;
  brand: { name: string };
};

export function isApHomeownerFilterPilotSlug(slug: string): boolean {
  const normalized = slug.trim().toLowerCase();
  return AP_HOMEOWNER_FILTER_PILOT_SLUGS.some((pilotSlug) => pilotSlug === normalized);
}

export function getApHomeownerPrimaryVerifiedLink(args: {
  trust?: Pick<PartTrustSummary, "preferred_winner_link"> | null;
  retailerLinks?: BuyLinkRow[];
}): BuyLinkRow | null {
  return args.trust?.preferred_winner_link ?? args.retailerLinks?.[0] ?? null;
}

export function deriveApHomeownerFitState(args: {
  trust?: Pick<PartTrustSummary, "buyer_path_state"> | null;
  primaryVerifiedLink?: Pick<BuyLinkRow, "browser_truth_classification"> | null;
}): ApHomeownerFitState {
  if (
    args.trust?.buyer_path_state === "show_confident_buy" &&
    args.primaryVerifiedLink?.browser_truth_classification?.trim() === "direct_buyable"
  ) {
    return "exact_match";
  }
  return "no_verified_link";
}

export function apHomeownerFitStateLabel(fitState: ApHomeownerFitState): string {
  if (fitState === "exact_match") return "Exact match - Original part";
  return "No verified link right now";
}

export function formatApHomeownerCompatModelDisplay(model: ApHomeownerCompatModel): {
  primary: string;
  secondary?: string;
} {
  return formatCore400sAlsoFitsDisplay({
    id: model.id,
    slug: model.slug,
    model_number: model.model_number,
    brand: model.brand,
  });
}

export function formatApHomeownerListingCheckDate(
  isoDateTime: string | null | undefined,
): string | null {
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

export function apHomeownerShowsOfficialListingTrustBullet(
  trust: Pick<PartTrustSummary, "buyer_path_state" | "preferred_winner_link" | "approved_retailer_links">,
): boolean {
  if (trust.buyer_path_state === "suppress_buy" || trust.approved_retailer_links === 0) {
    return false;
  }
  const winner = trust.preferred_winner_link;
  if (!winner) return false;
  return (
    winner.browser_truth_classification?.trim() === "direct_buyable" &&
    winner.retailer_key?.trim() === "oem-catalog"
  );
}

export function prepareApHomeownerDisplayRetailerLinks(
  links: BuyLinkRow[],
  homeownerCtaLabel: string,
): BuyLinkRow[] {
  return links.map((link) => ({
    ...link,
    retailer_name: homeownerCtaLabel,
    browser_truth_checked_at: null,
  }));
}
