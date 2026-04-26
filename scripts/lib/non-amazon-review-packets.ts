import { buyLinkGateFailureKind } from "@/lib/retailers/launch-buy-links";

export type PacketDecision = "PASS" | "FAIL" | "UNKNOWN";
export type WarningPresence = "yes" | "no" | "unknown";
export type PartLabel = "OEM" | "Replacement" | "Compatible" | "Unknown";
export type RiskLabel = "low" | "medium" | "high";

export type CandidateEvidence = {
  retailer: string;
  retailer_key: string;
  pdp_url: string;
  exact_token_or_alias_proof: string;
  has_exact_token_or_alias_proof: boolean;
  buyability_evidence: string;
  has_buyability_evidence: boolean;
  substitution_or_discontinued_warning_present: WarningPresence;
  part_label: PartLabel;
  family_gap_source: string;
};

export type ReviewPacket = {
  filter_slug: string;
  family_gap_source: string;
  current_cta_status: string;
  retailer: string;
  pdp_url: string;
  exact_token_or_alias_proof: string;
  buyability_evidence: string;
  substitution_or_discontinued_warning_present: WarningPresence;
  part_label: PartLabel;
  risk_label: RiskLabel;
  decision: PacketDecision;
  recommended_next_action: string;
};

type Evaluation = {
  decision: PacketDecision;
  risk_label: RiskLabel;
  recommended_next_action: string;
};

function parseHost(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return "";
  }
}

function isSearchOrCategoryLikeUrl(url: string): boolean {
  const lower = url.toLowerCase();
  const blockedFragments = [
    "/search",
    "search?",
    "searchterm=",
    "/catalogsearch/",
    "/result/?",
    "/result?",
    "/category/",
  ];
  return blockedFragments.some((fragment) => lower.includes(fragment));
}

export function isNonAmazonPdpUrl(url: string): boolean {
  if (!url.startsWith("http://") && !url.startsWith("https://")) return false;
  const host = parseHost(url);
  if (!host || host.includes("amazon.")) return false;
  return !isSearchOrCategoryLikeUrl(url);
}

export function evaluateCandidateEvidence(evidence: CandidateEvidence): Evaluation {
  const urlGatePass = isNonAmazonPdpUrl(evidence.pdp_url);
  if (!urlGatePass) {
    return {
      decision: "FAIL",
      risk_label: "high",
      recommended_next_action: "Reject URL and continue manual discovery for a product-level non-Amazon PDP.",
    };
  }

  if (evidence.substitution_or_discontinued_warning_present === "yes") {
    return {
      decision: "FAIL",
      risk_label: "high",
      recommended_next_action:
        "Reject candidate due to substitution/discontinued warning and continue manual discovery.",
    };
  }

  const hasSafeDirectSignals =
    evidence.has_exact_token_or_alias_proof &&
    evidence.has_buyability_evidence &&
    evidence.substitution_or_discontinued_warning_present === "no";

  if (hasSafeDirectSignals) {
    return {
      decision: "PASS",
      risk_label: evidence.part_label === "OEM" ? "low" : "medium",
      recommended_next_action: "Package as single-row write-lane candidate for human approval.",
    };
  }

  if (evidence.has_exact_token_or_alias_proof || evidence.has_buyability_evidence) {
    return {
      decision: "UNKNOWN",
      risk_label: "medium",
      recommended_next_action:
        "Hold candidate; require direct on-page exact-token and buyability proof before packaging.",
    };
  }

  return {
    decision: "UNKNOWN",
    risk_label: "high",
    recommended_next_action: "No safe proof established; continue manual discovery on strong retailers.",
  };
}

export function ctaStatusFromRetailerRows(
  rows: Array<{ retailer_key: string; affiliate_url: string; browser_truth_classification: string | null }>,
): string {
  const validCount = rows.filter((row) => {
    const gate = buyLinkGateFailureKind({
      retailer_key: row.retailer_key,
      affiliate_url: row.affiliate_url,
      browser_truth_classification: row.browser_truth_classification,
    });
    return gate === null;
  }).length;
  if (validCount > 0) return `has_valid_cta (${validCount})`;
  return "no_valid_cta";
}

export function buildReviewPacket(args: {
  filter_slug: string;
  current_cta_status: string;
  evidence: CandidateEvidence;
}): ReviewPacket {
  const evaluation = evaluateCandidateEvidence(args.evidence);
  return {
    filter_slug: args.filter_slug,
    family_gap_source: args.evidence.family_gap_source,
    current_cta_status: args.current_cta_status,
    retailer: args.evidence.retailer,
    pdp_url: args.evidence.pdp_url,
    exact_token_or_alias_proof: args.evidence.exact_token_or_alias_proof,
    buyability_evidence: args.evidence.buyability_evidence,
    substitution_or_discontinued_warning_present: args.evidence.substitution_or_discontinued_warning_present,
    part_label: args.evidence.part_label,
    risk_label: evaluation.risk_label,
    decision: evaluation.decision,
    recommended_next_action: evaluation.recommended_next_action,
  };
}

export const DEFAULT_REFRIGERATOR_REVIEW_CANDIDATES: Record<string, CandidateEvidence> = {
  "da97-08006b": {
    retailer: "AppliancePartsPros",
    retailer_key: "appliancepartspros",
    pdp_url: "https://www.appliancepartspros.com/samsung-assy-case-filter-da97-08006b-ap4578378.html",
    exact_token_or_alias_proof:
      "Exact token DA97-08006B present on PDP. Cross-reference explicit: AP4578378 / 2024586 / PS4175593.",
    has_exact_token_or_alias_proof: true,
    buyability_evidence: "Add-to-cart buyability visible on PDP.",
    has_buyability_evidence: true,
    substitution_or_discontinued_warning_present: "no",
    part_label: "Replacement",
    family_gap_source: "money_scoreboard_v1:refrigerator_water:samsung:da97",
  },
  "da97-15217d": {
    retailer: "AppliancePartsPros",
    retailer_key: "appliancepartspros",
    pdp_url: "https://www.appliancepartspros.com/samsung-assy-ice-maker-da97-15217d-ap6261445.html",
    exact_token_or_alias_proof:
      "Exact token DA97-15217D present on page and Manufacturer's Part Number: DA97-15217D.",
    has_exact_token_or_alias_proof: true,
    buyability_evidence: "Price $123.60, IN STOCK - SHIPS TOMORROW, IN STOCK less than 100 left.",
    has_buyability_evidence: true,
    substitution_or_discontinued_warning_present: "no",
    part_label: "OEM",
    family_gap_source: "money_scoreboard_v1:refrigerator_water:samsung:da97",
  },
  "da29-00012b": {
    retailer: "AllFilters",
    retailer_key: "allfilters",
    pdp_url: "https://www.allfilters.com/refrigeratorfilters/samsung/da29-00012a-hafcn",
    exact_token_or_alias_proof: "Snippet-only evidence was observed; direct on-page proof not captured.",
    has_exact_token_or_alias_proof: false,
    buyability_evidence: "Snippet-only price evidence; direct on-page add-to-cart/stock not proven.",
    has_buyability_evidence: false,
    substitution_or_discontinued_warning_present: "unknown",
    part_label: "Unknown",
    family_gap_source: "money_scoreboard_v1:refrigerator_water:samsung:da29",
  },
};
