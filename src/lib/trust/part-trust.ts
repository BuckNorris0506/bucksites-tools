import type { BuyLinkRow } from "@/components/BuyLinks";
import type { BuyPathSortContext } from "@/lib/retailers/launch-buy-links";
import {
  BUYABLE_SUBTYPES,
  normalizeBuyableSubtype,
  selectBestVerifiedBuyLink,
} from "@/lib/retailers/launch-buy-links";

export type MatchConfidence = "high" | "medium" | "unknown";
export type MatchBasis =
  | "recommended_compatibility_mapping"
  | "compatibility_mapping"
  | "single_mapped_part"
  | "multiple_mapped_parts_no_recommended"
  | "no_repo_compatibility_mapping";
export type OemOrCompatible = "oem" | "compatible" | "unknown";
export type CompatibleRiskLevel = "low" | "medium" | "high" | "unknown";
export type BuyerPathTrustState = "show_confident_buy" | "show_caution_buy" | "suppress_buy";

export type PartTrustSummary = {
  match_confidence: MatchConfidence;
  match_basis: MatchBasis;
  oem_or_compatible: OemOrCompatible;
  compatible_risk_level: CompatibleRiskLevel;
  evidence_notes: string[];
  requires_manual_verification: boolean;
  approved_retailer_links: number;
  preferred_winner_link: BuyLinkRow | null;
  replacement_reasoning_summary: string;
  buyer_path_state: BuyerPathTrustState;
};

type PartPageTrustArgs = {
  modelsCount: number;
  retailerLinks: BuyLinkRow[];
  oemPartNumber: string;
  alsoKnownAs?: string[];
  notes?: string | null;
  /** Aligns preferred winner with `TieredBuyLinks` primary CTA ordering. */
  buyPathSortContext?: BuyPathSortContext;
};

type ModelPageTrustArgs = {
  totalFits: number;
  hasRecommendedFit: boolean;
  primaryIsRecommended: boolean;
  retailerLinks: BuyLinkRow[];
  oemPartNumber: string;
  modelNumber: string;
  buyPathSortContext?: BuyPathSortContext;
};

function preferredWinnerLink(
  links: BuyLinkRow[],
  sortContext?: BuyPathSortContext,
): BuyLinkRow | null {
  return selectBestVerifiedBuyLink(links, sortContext);
}

/** Official original labeling requires an explicit gated direct-buy subtype, not mapping counts. */
export function isSourceBackedOfficialBuyLink(link: BuyLinkRow | null): boolean {
  if (!link) return false;
  const subtype = normalizeBuyableSubtype(link.browser_truth_buyable_subtype);
  if (subtype === BUYABLE_SUBTYPES.SINGLE_UNIT_DIRECT_BUYABLE) {
    return true;
  }
  if (subtype === BUYABLE_SUBTYPES.MULTIPACK_DIRECT_BUYABLE) {
    const notes = (link.browser_truth_notes ?? "").toLowerCase();
    return !(
      notes.includes("compatible") ||
      notes.includes("aftermarket") ||
      notes.includes("not oem")
    );
  }
  return false;
}

function partPageMatchConfidence(args: {
  modelsCount: number;
  approvedRetailerLinks: number;
  preferredWinnerLink: BuyLinkRow | null;
  oemOrCompatible: OemOrCompatible;
}): MatchConfidence {
  if (args.modelsCount === 0) {
    return "unknown";
  }
  if (
    args.approvedRetailerLinks > 0 &&
    args.oemOrCompatible === "oem" &&
    isSourceBackedOfficialBuyLink(args.preferredWinnerLink)
  ) {
    return "high";
  }
  return "medium";
}

function partPageRequiresManualVerification(args: {
  modelsCount: number;
  approvedRetailerLinks: number;
  matchConfidence: MatchConfidence;
  oemOrCompatible: OemOrCompatible;
}): boolean {
  if (args.modelsCount === 0 || args.approvedRetailerLinks === 0) {
    return true;
  }
  if (args.oemOrCompatible === "compatible" || args.oemOrCompatible === "unknown") {
    return true;
  }
  return args.matchConfidence !== "high";
}

/**
 * Customer-facing original vs compatible follows the surviving gated buy-path row,
 * not the catalog part-number identity alone.
 */
export function oemOrCompatibleFromPreferredGatedBuyLink(args: {
  preferredWinnerLink: BuyLinkRow | null;
  approvedRetailerLinks: number;
}): OemOrCompatible {
  if (args.approvedRetailerLinks === 0 || !args.preferredWinnerLink) {
    return "unknown";
  }
  const subtype = normalizeBuyableSubtype(args.preferredWinnerLink.browser_truth_buyable_subtype);
  if (subtype === BUYABLE_SUBTYPES.COMPATIBLE_REPLACEMENT_DIRECT_BUYABLE) {
    return "compatible";
  }
  if (subtype === BUYABLE_SUBTYPES.MULTIPACK_DIRECT_BUYABLE) {
    const notes = (args.preferredWinnerLink.browser_truth_notes ?? "").toLowerCase();
    if (
      notes.includes("compatible") ||
      notes.includes("aftermarket") ||
      notes.includes("not oem")
    ) {
      return "compatible";
    }
    return "oem";
  }
  if (subtype === BUYABLE_SUBTYPES.SINGLE_UNIT_DIRECT_BUYABLE) {
    return "oem";
  }
  return "unknown";
}

export function buildPartPageTrust(args: PartPageTrustArgs): PartTrustSummary {
  const approved_retailer_links = args.retailerLinks.length;
  const preferred_winner_link = preferredWinnerLink(
    args.retailerLinks,
    args.buyPathSortContext,
  );
  const evidence_notes = [
    args.modelsCount > 0
      ? `${args.modelsCount} mapped compatible model${args.modelsCount === 1 ? "" : "s"} in the repo`
      : "No repo compatibility mappings for this part yet",
  ];

  if ((args.alsoKnownAs ?? []).length > 0) {
    evidence_notes.push(
      `${args.alsoKnownAs!.length} alias token${args.alsoKnownAs!.length === 1 ? "" : "s"} captured for lookup rescue`,
    );
  }
  if ((args.notes ?? "").trim()) {
    evidence_notes.push("Page notes are present for extra fit context");
  }
  if (approved_retailer_links > 0) {
    evidence_notes.push(
      `${approved_retailer_links} approved retailer link${approved_retailer_links === 1 ? "" : "s"} survived live-link gating`,
    );
  } else {
    evidence_notes.push("No approved retailer links survived live-link gating");
  }

  const match_basis: MatchBasis =
    args.modelsCount > 0 ? "compatibility_mapping" : "no_repo_compatibility_mapping";

  const oem_or_compatible = oemOrCompatibleFromPreferredGatedBuyLink({
    preferredWinnerLink: preferred_winner_link,
    approvedRetailerLinks: approved_retailer_links,
  });

  const match_confidence = partPageMatchConfidence({
    modelsCount: args.modelsCount,
    approvedRetailerLinks: approved_retailer_links,
    preferredWinnerLink: preferred_winner_link,
    oemOrCompatible: oem_or_compatible,
  });
  const requires_manual_verification = partPageRequiresManualVerification({
    modelsCount: args.modelsCount,
    approvedRetailerLinks: approved_retailer_links,
    matchConfidence: match_confidence,
    oemOrCompatible: oem_or_compatible,
  });
  const buyer_path_state: BuyerPathTrustState =
    args.modelsCount === 0 || approved_retailer_links === 0
      ? "suppress_buy"
      : oem_or_compatible === "compatible"
        ? "show_caution_buy"
        : "show_confident_buy";

  return {
    match_confidence,
    match_basis,
    oem_or_compatible,
    compatible_risk_level: oem_or_compatible === "compatible" ? "medium" : "low",
    evidence_notes,
    requires_manual_verification,
    approved_retailer_links,
    preferred_winner_link,
    replacement_reasoning_summary:
      args.modelsCount > 0
        ? `${args.oemPartNumber} matches models linked on this page. A BuckParts Verified Link appears only when our checks clear for this part number—not every filter has one.`
        : `${args.oemPartNumber} does not have model links on this page yet. Compare the part number in your manual or on your current filter before you buy.`,
    buyer_path_state,
  };
}

export function buildModelPageTrust(args: ModelPageTrustArgs): PartTrustSummary {
  const approved_retailer_links = args.retailerLinks.length;
  const preferred_winner_link = preferredWinnerLink(
    args.retailerLinks,
    args.buyPathSortContext,
  );
  const evidence_notes = [
    args.totalFits === 0
      ? "No compatible parts are mapped for this model in the repo"
      : `${args.totalFits} mapped part option${args.totalFits === 1 ? "" : "s"} found for this model`,
  ];

  if (approved_retailer_links > 0) {
    evidence_notes.push(
      `${approved_retailer_links} approved retailer link${approved_retailer_links === 1 ? "" : "s"} survived live-link gating for the current winner`,
    );
  } else {
    evidence_notes.push("No approved retailer links survived live-link gating for the current winner");
  }

  let match_confidence: MatchConfidence = "unknown";
  let match_basis: MatchBasis = "no_repo_compatibility_mapping";
  let requires_manual_verification = true;
  let buyer_path_state: BuyerPathTrustState = "suppress_buy";

  if (args.totalFits === 0) {
    match_confidence = "unknown";
    match_basis = "no_repo_compatibility_mapping";
  } else if (args.hasRecommendedFit && args.primaryIsRecommended) {
    match_confidence = "high";
    match_basis = "recommended_compatibility_mapping";
    requires_manual_verification = approved_retailer_links === 0;
    buyer_path_state =
      approved_retailer_links > 0 ? "show_confident_buy" : "suppress_buy";
    evidence_notes.push("Primary part is explicitly marked recommended in repo compatibility mappings");
  } else if (args.totalFits === 1) {
    match_confidence = "medium";
    match_basis = "single_mapped_part";
    requires_manual_verification = true;
    buyer_path_state =
      approved_retailer_links > 0 ? "show_caution_buy" : "suppress_buy";
    evidence_notes.push("Only one mapped part is present for this model");
  } else {
    match_confidence = "medium";
    match_basis = "multiple_mapped_parts_no_recommended";
    requires_manual_verification = true;
    buyer_path_state = "suppress_buy";
    evidence_notes.push("Multiple mapped parts exist and none is marked recommended, so BuckParts should not pick a buy-ready winner yet");
  }

  const oem_or_compatible = oemOrCompatibleFromPreferredGatedBuyLink({
    preferredWinnerLink: preferred_winner_link,
    approvedRetailerLinks: approved_retailer_links,
  });

  return {
    match_confidence,
    match_basis,
    oem_or_compatible,
    compatible_risk_level: oem_or_compatible === "compatible" ? "medium" : "low",
    evidence_notes,
    requires_manual_verification,
    approved_retailer_links,
    preferred_winner_link,
    replacement_reasoning_summary:
      buyer_path_state === "show_confident_buy"
        ? `${args.oemPartNumber} is the part shown first for model ${args.modelNumber}; match that part number before checkout.`
        : `${args.oemPartNumber} may fit model ${args.modelNumber}, but compare the part number carefully before you buy.`,
    buyer_path_state,
  };
}
