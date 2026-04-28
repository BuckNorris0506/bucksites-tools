export const REPLACEMENT_RELATIONSHIP_TYPES = {
  official_supersession: "official_supersession",
  direct_compatible_replacement: "direct_compatible_replacement",
  recommended_model_specific_replacement: "recommended_model_specific_replacement",
  alias_or_same_part_token: "alias_or_same_part_token",
  possible_substitution_unverified: "possible_substitution_unverified",
  discontinued_no_verified_replacement: "discontinued_no_verified_replacement",
} as const;

export type ReplacementRelationshipType =
  (typeof REPLACEMENT_RELATIONSHIP_TYPES)[keyof typeof REPLACEMENT_RELATIONSHIP_TYPES];

export type ReplacementChainRecord = {
  chainId: string;
  originalPartNumber: string;
  replacementPartNumber: string;
  relationshipType: ReplacementRelationshipType;
  confidence: "exact" | "likely" | "uncertain" | "unknown";
  safeToBuyReplacement: boolean;
  checkedAt: string;
  provenance: {
    sourceType:
      | "repo_mapping"
      | "retailer_browser_truth"
      | "learning_outcome"
      | "manual_review"
      | "system_rule";
    sourceUrl: string | null;
    evidenceExcerpt: string;
    evidenceRef: Record<string, string | number | boolean | null>;
  };
};

export type EvaluateReplacementChainSafetyInput = {
  relationshipType: ReplacementRelationshipType;
  confidence: "exact" | "likely" | "uncertain" | "unknown";
  hasCtaGateFailure?: boolean | null;
  buyerPathState?: string | null;
  wrongPurchaseRisk?: string | null;
  hasExactTokenOrAliasProof?: boolean | null;
  hasBuyabilityEvidence?: boolean | null;
};

const SAFE_RELATIONSHIP_TYPES = new Set<ReplacementRelationshipType>([
  REPLACEMENT_RELATIONSHIP_TYPES.official_supersession,
  REPLACEMENT_RELATIONSHIP_TYPES.direct_compatible_replacement,
  REPLACEMENT_RELATIONSHIP_TYPES.recommended_model_specific_replacement,
]);

const SAFE_CONFIDENCE_LEVELS = new Set<ReplacementChainRecord["confidence"]>([
  "exact",
  "likely",
]);

const BLOCKING_WRONG_PURCHASE_RISKS = new Set<string>([
  "SEARCH_PLACEHOLDER_LINK",
  "INDIRECT_DISCOVERY_LINK",
  "BROKEN_DESTINATION_LINK",
  "MISSING_BROWSER_TRUTH",
  "UNSAFE_BROWSER_TRUTH",
  "DISCONTINUED_OR_SUBSTITUTION",
  "TOKEN_OR_SUFFIX_MISMATCH",
  "NO_BUYABILITY_EVIDENCE",
  "NO_COMPATIBILITY_MAPPING",
  "AMBIGUOUS_MULTI_PART_MATCH",
  "UNKNOWN",
]);

export function evaluateReplacementChainSafety(
  input: EvaluateReplacementChainSafetyInput,
): boolean {
  if (!SAFE_RELATIONSHIP_TYPES.has(input.relationshipType)) return false;
  if (!SAFE_CONFIDENCE_LEVELS.has(input.confidence)) return false;
  if (input.hasCtaGateFailure === true) return false;
  if (input.buyerPathState === "suppress_buy") return false;
  if (
    typeof input.wrongPurchaseRisk === "string" &&
    BLOCKING_WRONG_PURCHASE_RISKS.has(input.wrongPurchaseRisk)
  ) {
    return false;
  }
  if (input.hasExactTokenOrAliasProof === false) return false;
  if (input.hasBuyabilityEvidence === false) return false;
  return true;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isValidDateString(value: unknown): value is string {
  if (typeof value !== "string") return false;
  return !Number.isNaN(Date.parse(value));
}

function isRelationshipType(value: unknown): value is ReplacementRelationshipType {
  return (
    typeof value === "string" &&
    Object.values(REPLACEMENT_RELATIONSHIP_TYPES).includes(value as ReplacementRelationshipType)
  );
}

function isConfidence(value: unknown): value is ReplacementChainRecord["confidence"] {
  return (
    value === "exact" ||
    value === "likely" ||
    value === "uncertain" ||
    value === "unknown"
  );
}

function isProvenanceSourceType(
  value: unknown,
): value is ReplacementChainRecord["provenance"]["sourceType"] {
  return (
    value === "repo_mapping" ||
    value === "retailer_browser_truth" ||
    value === "learning_outcome" ||
    value === "manual_review" ||
    value === "system_rule"
  );
}

function isEvidenceRef(
  value: unknown,
): value is Record<string, string | number | boolean | null> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  for (const key of Object.keys(value)) {
    const item = (value as Record<string, unknown>)[key];
    const t = typeof item;
    if (item !== null && t !== "string" && t !== "number" && t !== "boolean") {
      return false;
    }
  }
  return true;
}

export function isValidReplacementChainRecord(
  input: unknown,
): input is ReplacementChainRecord {
  if (typeof input !== "object" || input === null || Array.isArray(input)) return false;
  const value = input as Record<string, unknown>;

  if (!isNonEmptyString(value.chainId)) return false;
  if (!isNonEmptyString(value.originalPartNumber)) return false;
  if (!isNonEmptyString(value.replacementPartNumber)) return false;
  if (!isRelationshipType(value.relationshipType)) return false;
  if (!isConfidence(value.confidence)) return false;
  if (typeof value.safeToBuyReplacement !== "boolean") return false;
  if (!isValidDateString(value.checkedAt)) return false;

  const provenance = value.provenance;
  if (typeof provenance !== "object" || provenance === null || Array.isArray(provenance)) {
    return false;
  }
  const p = provenance as Record<string, unknown>;
  if (!isProvenanceSourceType(p.sourceType)) return false;
  if (!(p.sourceUrl === null || typeof p.sourceUrl === "string")) return false;
  if (!isNonEmptyString(p.evidenceExcerpt)) return false;
  if (!isEvidenceRef(p.evidenceRef)) return false;

  return true;
}
