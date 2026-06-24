/**
 * Universal Coverage Factory — evidence promotion requirements v1.
 * Default: identity + fit + buyer_path proven. Wedge/policy may override without mutating core logic.
 */

import {
  COVERAGE_EVIDENCE_DIMENSIONS_V1,
  type CoverageEvidenceDimensionV1,
  type CoverageEvidenceV1,
} from "./coverage-evidence-v1";

export const COVERAGE_EVIDENCE_REQUIREMENTS_CONTRACT_V1 =
  "coverage_evidence_requirements_v1" as const;

export type CoverageEvidenceRequirementsV1 = {
  contract: typeof COVERAGE_EVIDENCE_REQUIREMENTS_CONTRACT_V1;
  /** Dimensions that must be `proven` for promotion dispositions. */
  promotion_dimensions: CoverageEvidenceDimensionV1[];
  /** `covered` disposition always requires identity proven when paired with evidence. */
  covered_requires_identity_proven: true;
};

export const DEFAULT_COVERAGE_EVIDENCE_PROMOTION_DIMENSIONS_V1: readonly CoverageEvidenceDimensionV1[] =
  ["identity", "fit", "buyer_path"];

export const DEFAULT_COVERAGE_EVIDENCE_REQUIREMENTS_V1: CoverageEvidenceRequirementsV1 = {
  contract: COVERAGE_EVIDENCE_REQUIREMENTS_CONTRACT_V1,
  promotion_dimensions: [...DEFAULT_COVERAGE_EVIDENCE_PROMOTION_DIMENSIONS_V1],
  covered_requires_identity_proven: true,
};

function isDimension(value: unknown): value is CoverageEvidenceDimensionV1 {
  return (
    typeof value === "string" &&
    (COVERAGE_EVIDENCE_DIMENSIONS_V1 as readonly string[]).includes(value)
  );
}

export function validateCoverageEvidenceRequirementsV1(
  value: unknown,
): value is CoverageEvidenceRequirementsV1 {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const row = value as Record<string, unknown>;
  if (row.contract !== COVERAGE_EVIDENCE_REQUIREMENTS_CONTRACT_V1) return false;
  if (!Array.isArray(row.promotion_dimensions) || row.promotion_dimensions.length === 0) {
    return false;
  }
  if (!row.promotion_dimensions.every((dim) => isDimension(dim))) return false;
  const unique = new Set(row.promotion_dimensions);
  if (unique.size !== row.promotion_dimensions.length) return false;
  if (row.covered_requires_identity_proven !== true) return false;
  return true;
}

export function coverageEvidenceMeetsPromotionRequirementsV1(args: {
  evidence: CoverageEvidenceV1;
  requirements?: CoverageEvidenceRequirementsV1;
}): boolean {
  const requirements = args.requirements ?? DEFAULT_COVERAGE_EVIDENCE_REQUIREMENTS_V1;
  for (const dimension of requirements.promotion_dimensions) {
    if (args.evidence.claims[dimension].status !== "proven") return false;
  }
  return true;
}

export function coverageEvidenceHasUnknownOnPromotionDimensionsV1(args: {
  evidence: CoverageEvidenceV1;
  requirements?: CoverageEvidenceRequirementsV1;
}): boolean {
  const requirements = args.requirements ?? DEFAULT_COVERAGE_EVIDENCE_REQUIREMENTS_V1;
  return requirements.promotion_dimensions.some(
    (dimension) => args.evidence.claims[dimension].status === "unknown",
  );
}

export function coverageEvidenceMeetsCoveredRequirementsV1(evidence: CoverageEvidenceV1): boolean {
  return evidence.claims.identity.status === "proven";
}
