import type { BuyLinkRow } from "@/components/BuyLinks";
import type { PartTrustSummary } from "@/lib/trust/part-trust";

export const AP_HOMEOWNER_FILTER_PILOT_SLUG = "medify-ma50-rf" as const;

export type ApHomeownerFitState = "exact_match" | "no_verified_link";

export type ApHomeownerCompatModel = {
  id: string;
  slug: string;
  model_number: string;
  brand: { name: string };
};

export function isApHomeownerFilterPilotSlug(slug: string): boolean {
  return slug.trim().toLowerCase() === AP_HOMEOWNER_FILTER_PILOT_SLUG;
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

export function formatApHomeownerCompatModelDisplay(model: ApHomeownerCompatModel): string {
  const brand = model.brand.name.trim() || "Purifier";
  return `${brand} ${model.model_number}`;
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
