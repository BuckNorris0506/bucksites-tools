export const PROVENANCE_CLAIM_TYPES = {
  fit_compatibility: "fit_compatibility",
  replacement_recommendation: "replacement_recommendation",
  retailer_buyability: "retailer_buyability",
  cta_safety: "cta_safety",
  no_buy_reason: "no_buy_reason",
  index_publishability: "index_publishability",
} as const;

export const PROVENANCE_SOURCE_TYPES = {
  repo_mapping: "repo_mapping",
  retailer_browser_truth: "retailer_browser_truth",
  learning_outcome: "learning_outcome",
  manual_review: "manual_review",
  system_rule: "system_rule",
} as const;

export const PROVENANCE_CONFIDENCE_LEVELS = {
  exact: "exact",
  likely: "likely",
  uncertain: "uncertain",
  unknown: "unknown",
} as const;

export const PROVENANCE_ACTORS = {
  system: "system",
  reviewer: "reviewer",
} as const;

export type ProvenanceClaimType =
  (typeof PROVENANCE_CLAIM_TYPES)[keyof typeof PROVENANCE_CLAIM_TYPES];
export type ProvenanceSourceType =
  (typeof PROVENANCE_SOURCE_TYPES)[keyof typeof PROVENANCE_SOURCE_TYPES];
export type ProvenanceConfidence =
  (typeof PROVENANCE_CONFIDENCE_LEVELS)[keyof typeof PROVENANCE_CONFIDENCE_LEVELS];
export type ProvenanceActor =
  (typeof PROVENANCE_ACTORS)[keyof typeof PROVENANCE_ACTORS];

export type ProvenanceRecord = {
  claimId: string;
  claimType: ProvenanceClaimType;
  claimSubject: string;
  claimValue: string;
  sourceType: ProvenanceSourceType;
  sourceUrl: string | null;
  capturedAt: string;
  confidence: ProvenanceConfidence;
  actor: ProvenanceActor;
  actorId: string | null;
  evidenceExcerpt: string;
  evidenceRef: Record<string, string | number | boolean | null>;
};

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isEnumValue<T extends Record<string, string>>(
  value: unknown,
  enumMap: T,
): value is T[keyof T] {
  return typeof value === "string" && Object.values(enumMap).includes(value);
}

function isValidDateString(value: unknown): value is string {
  if (typeof value !== "string") return false;
  return !Number.isNaN(Date.parse(value));
}

function isValidEvidenceRef(
  value: unknown,
): value is Record<string, string | number | boolean | null> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  for (const key of Object.keys(value)) {
    const item = (value as Record<string, unknown>)[key];
    const t = typeof item;
    if (item !== null && t !== "string" && t !== "number" && t !== "boolean") {
      return false;
    }
  }

  return true;
}

export function isValidProvenanceRecord(
  input: unknown,
): input is ProvenanceRecord {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return false;
  }

  const value = input as Record<string, unknown>;

  if (!isNonEmptyString(value.claimId)) return false;
  if (!isEnumValue(value.claimType, PROVENANCE_CLAIM_TYPES)) return false;
  if (!isNonEmptyString(value.claimSubject)) return false;
  if (!isNonEmptyString(value.claimValue)) return false;
  if (!isEnumValue(value.sourceType, PROVENANCE_SOURCE_TYPES)) return false;

  if (!(value.sourceUrl === null || typeof value.sourceUrl === "string")) return false;
  if (!isValidDateString(value.capturedAt)) return false;
  if (!isEnumValue(value.confidence, PROVENANCE_CONFIDENCE_LEVELS)) return false;
  if (!isEnumValue(value.actor, PROVENANCE_ACTORS)) return false;
  if (!(value.actorId === null || typeof value.actorId === "string")) return false;

  if (!isNonEmptyString(value.evidenceExcerpt)) return false;
  if (!isValidEvidenceRef(value.evidenceRef)) return false;

  return true;
}
