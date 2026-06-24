/**
 * Universal Coverage Factory — core assessment disposition v1.
 */

import {
  coverageEvidenceHasUnknownOnRequiredDimensionsV1,
  coverageEvidenceSupportsPromotionV1,
  validateCoverageEvidenceV1,
  type CoverageEvidenceV1,
} from "./coverage-evidence-v1";

export const COVERAGE_ASSESSMENT_CONTRACT_V1 = "coverage_assessment_v1" as const;

export const COVERAGE_ASSESSMENT_DISPOSITIONS_V1 = [
  "covered",
  "research_identity",
  "research_fit",
  "research_buyer_path",
  "mapping_review",
  "owner_review",
  "ready_for_change_planning",
  "candidate_apply",
  "suppressed",
] as const;

export type CoverageAssessmentDispositionV1 =
  (typeof COVERAGE_ASSESSMENT_DISPOSITIONS_V1)[number];

/** Dispositions that imply planning or apply readiness — gated by evidence proof. */
export const COVERAGE_ASSESSMENT_PROMOTION_DISPOSITIONS_V1 = [
  "ready_for_change_planning",
  "candidate_apply",
] as const;

export type CoverageAssessmentPromotionDispositionV1 =
  (typeof COVERAGE_ASSESSMENT_PROMOTION_DISPOSITIONS_V1)[number];

export type CoverageAssessmentV1 = {
  contract: typeof COVERAGE_ASSESSMENT_CONTRACT_V1;
  subject_id: string;
  core_disposition: CoverageAssessmentDispositionV1;
  /** Wedge-specific legacy detail preserved without polluting the core enum. */
  adapter_state: string | null;
  policy_apply_allowed: boolean;
  blockers: string[];
  read_only: true;
  data_mutation: false;
  mutation_authorized: false;
  production_mutation_authorized: false;
};

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isDisposition(value: unknown): value is CoverageAssessmentDispositionV1 {
  return (
    typeof value === "string" &&
    (COVERAGE_ASSESSMENT_DISPOSITIONS_V1 as readonly string[]).includes(value)
  );
}

export function isCoverageAssessmentPromotionDispositionV1(
  disposition: CoverageAssessmentDispositionV1,
): disposition is CoverageAssessmentPromotionDispositionV1 {
  return (COVERAGE_ASSESSMENT_PROMOTION_DISPOSITIONS_V1 as readonly string[]).includes(
    disposition,
  );
}

export function validateCoverageAssessmentV1(value: unknown): value is CoverageAssessmentV1 {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const row = value as Record<string, unknown>;
  if (row.contract !== COVERAGE_ASSESSMENT_CONTRACT_V1) return false;
  if (!isNonEmptyString(row.subject_id)) return false;
  if (!isDisposition(row.core_disposition)) return false;
  if (row.adapter_state !== null && typeof row.adapter_state !== "string") return false;
  if (typeof row.policy_apply_allowed !== "boolean") return false;
  if (!Array.isArray(row.blockers) || !row.blockers.every((b) => typeof b === "string")) {
    return false;
  }
  if (row.read_only !== true || row.data_mutation !== false) return false;
  if (row.mutation_authorized !== false) return false;
  if (row.production_mutation_authorized !== false) return false;
  return true;
}

/**
 * Unknown evidence must never promote to candidate_apply or ready_for_change_planning.
 * Also blocks promotion when policy_apply_allowed is false or required dimensions are not proven.
 */
export function coverageAssessmentPromotionAllowedV1(args: {
  assessment: CoverageAssessmentV1;
  evidence: CoverageEvidenceV1;
}): boolean {
  const { assessment, evidence } = args;
  if (!isCoverageAssessmentPromotionDispositionV1(assessment.core_disposition)) {
    return true;
  }
  if (!assessment.policy_apply_allowed) return false;
  if (coverageEvidenceHasUnknownOnRequiredDimensionsV1(evidence)) return false;
  if (!coverageEvidenceSupportsPromotionV1(evidence)) return false;
  return true;
}

export function validateCoverageAssessmentWithEvidenceV1(args: {
  assessment: CoverageAssessmentV1;
  evidence: CoverageEvidenceV1;
}): boolean {
  if (!validateCoverageAssessmentV1(args.assessment)) return false;
  if (!validateCoverageEvidenceV1(args.evidence)) return false;
  if (args.assessment.subject_id !== args.evidence.subject_id) return false;
  return coverageAssessmentPromotionAllowedV1(args);
}
