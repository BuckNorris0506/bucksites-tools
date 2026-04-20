import type { BuyLinkRow } from "@/components/BuyLinks";

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
};

type ModelPageTrustArgs = {
  totalFits: number;
  hasRecommendedFit: boolean;
  primaryIsRecommended: boolean;
  retailerLinks: BuyLinkRow[];
  oemPartNumber: string;
  modelNumber: string;
};

function preferredWinnerLink(links: BuyLinkRow[]): BuyLinkRow | null {
  if (links.length === 0) return null;
  const primary = links.find((link) => link.is_primary);
  return primary ?? links[0] ?? null;
}

export function buildPartPageTrust(args: PartPageTrustArgs): PartTrustSummary {
  const approved_retailer_links = args.retailerLinks.length;
  const preferred_winner_link = preferredWinnerLink(args.retailerLinks);
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

  const match_confidence: MatchConfidence = args.modelsCount > 0 ? "high" : "unknown";
  const match_basis: MatchBasis =
    args.modelsCount > 0 ? "compatibility_mapping" : "no_repo_compatibility_mapping";
  const requires_manual_verification =
    args.modelsCount === 0 || approved_retailer_links === 0;
  const buyer_path_state: BuyerPathTrustState =
    args.modelsCount === 0 || approved_retailer_links === 0
      ? "suppress_buy"
      : "show_confident_buy";

  return {
    match_confidence,
    match_basis,
    oem_or_compatible: "oem",
    compatible_risk_level: "low",
    evidence_notes,
    requires_manual_verification,
    approved_retailer_links,
    preferred_winner_link,
    replacement_reasoning_summary:
      args.modelsCount > 0
        ? `${args.oemPartNumber} is backed by repo compatibility mappings; BuckParts can show a buy CTA only when an approved live link is also present.`
        : `${args.oemPartNumber} is not proven by repo compatibility mappings yet, so BuckParts should not treat it as buy-ready.`,
    buyer_path_state,
  };
}

export function buildModelPageTrust(args: ModelPageTrustArgs): PartTrustSummary {
  const approved_retailer_links = args.retailerLinks.length;
  const preferred_winner_link = preferredWinnerLink(args.retailerLinks);
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
    match_confidence = "high";
    match_basis = "single_mapped_part";
    requires_manual_verification = approved_retailer_links === 0;
    buyer_path_state =
      approved_retailer_links > 0 ? "show_confident_buy" : "suppress_buy";
    evidence_notes.push("Only one mapped part is present for this model");
  } else {
    match_confidence = "medium";
    match_basis = "multiple_mapped_parts_no_recommended";
    requires_manual_verification = true;
    buyer_path_state = "suppress_buy";
    evidence_notes.push("Multiple mapped parts exist and none is marked recommended, so BuckParts should not pick a buy-ready winner yet");
  }

  return {
    match_confidence,
    match_basis,
    oem_or_compatible: "oem",
    compatible_risk_level: "low",
    evidence_notes,
    requires_manual_verification,
    approved_retailer_links,
    preferred_winner_link,
    replacement_reasoning_summary:
      buyer_path_state === "show_confident_buy"
        ? `${args.oemPartNumber} is the current buy-ready winner for model ${args.modelNumber} under BuckParts trust rules.`
        : `${args.oemPartNumber} may fit model ${args.modelNumber}, but BuckParts does not have enough proof to make this a buy-ready winner yet.`,
    buyer_path_state,
  };
}
