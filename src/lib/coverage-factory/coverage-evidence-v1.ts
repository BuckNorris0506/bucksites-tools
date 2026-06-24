/**
 * Universal Coverage Factory — normalized evidence claim bundle v1.
 */

import {
  coverageProvenanceRefsSatisfyProvenClaimV1,
  validateCoverageProvenanceRefListV1,
  type CoverageProvenanceRefV1,
} from "./coverage-provenance-ref-v1";
import { validateCoverageSubjectIdV1 } from "./coverage-subject-id-v1";

export const COVERAGE_EVIDENCE_CONTRACT_V1 = "coverage_evidence_v1" as const;

export const COVERAGE_EVIDENCE_CLAIM_STATUSES_V1 = [
  "proven",
  "blocked",
  "unknown",
  "not_applicable",
] as const;

export type CoverageEvidenceClaimStatusV1 =
  (typeof COVERAGE_EVIDENCE_CLAIM_STATUSES_V1)[number];

export const COVERAGE_EVIDENCE_DIMENSIONS_V1 = [
  "identity",
  "fit",
  "buyer_path",
  "demand",
  "publication",
] as const;

export type CoverageEvidenceDimensionV1 = (typeof COVERAGE_EVIDENCE_DIMENSIONS_V1)[number];

export type CoverageEvidenceClaimV1 = {
  dimension: CoverageEvidenceDimensionV1;
  status: CoverageEvidenceClaimStatusV1;
  provenance_refs: CoverageProvenanceRefV1[];
  summary: string | null;
};

export type CoverageEvidenceV1 = {
  contract: typeof COVERAGE_EVIDENCE_CONTRACT_V1;
  subject_id: string;
  claims: Record<CoverageEvidenceDimensionV1, CoverageEvidenceClaimV1>;
  read_only: true;
  data_mutation: false;
};

function isClaimStatus(value: unknown): value is CoverageEvidenceClaimStatusV1 {
  return (
    typeof value === "string" &&
    (COVERAGE_EVIDENCE_CLAIM_STATUSES_V1 as readonly string[]).includes(value)
  );
}

function isDimension(value: unknown): value is CoverageEvidenceDimensionV1 {
  return (
    typeof value === "string" &&
    (COVERAGE_EVIDENCE_DIMENSIONS_V1 as readonly string[]).includes(value)
  );
}

function validateClaim(value: unknown): value is CoverageEvidenceClaimV1 {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const row = value as Record<string, unknown>;
  if (!isDimension(row.dimension)) return false;
  if (!isClaimStatus(row.status)) return false;
  if (!validateCoverageProvenanceRefListV1(row.provenance_refs)) return false;
  if (row.status === "proven" && !coverageProvenanceRefsSatisfyProvenClaimV1(row.provenance_refs)) {
    return false;
  }
  if (row.summary !== null && typeof row.summary !== "string") return false;
  return true;
}

export function validateCoverageEvidenceV1(value: unknown): value is CoverageEvidenceV1 {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const row = value as Record<string, unknown>;
  if (row.contract !== COVERAGE_EVIDENCE_CONTRACT_V1) return false;
  if (!validateCoverageSubjectIdV1(row.subject_id)) return false;
  if (typeof row.claims !== "object" || row.claims === null || Array.isArray(row.claims)) {
    return false;
  }
  const claims = row.claims as Record<string, unknown>;
  for (const dimension of COVERAGE_EVIDENCE_DIMENSIONS_V1) {
    if (!validateClaim(claims[dimension])) return false;
    const claim = claims[dimension] as CoverageEvidenceClaimV1;
    if (claim.dimension !== dimension) return false;
  }
  if (row.read_only !== true || row.data_mutation !== false) return false;
  return true;
}

export function coverageEvidenceDimensionIsUnknownV1(
  evidence: CoverageEvidenceV1,
  dimension: CoverageEvidenceDimensionV1,
): boolean {
  return evidence.claims[dimension].status === "unknown";
}

/** Prefer coverageEvidenceHasUnknownOnPromotionDimensionsV1 from evidence-requirements. */
export function coverageEvidenceHasUnknownOnRequiredDimensionsV1(
  evidence: CoverageEvidenceV1,
): boolean {
  return (["identity", "fit", "buyer_path"] as const).some((dimension) =>
    coverageEvidenceDimensionIsUnknownV1(evidence, dimension),
  );
}

/** Prefer coverageEvidenceMeetsPromotionRequirementsV1 from evidence-requirements. */
export function coverageEvidenceSupportsPromotionV1(evidence: CoverageEvidenceV1): boolean {
  return (["identity", "fit", "buyer_path"] as const).every(
    (dimension) => evidence.claims[dimension].status === "proven",
  );
}
