/**
 * Universal Coverage Factory — core assessment disposition v1.
 */

import {
  coverageEvidenceHasUnknownOnPromotionDimensionsV1,
  coverageEvidenceMeetsCoveredRequirementsV1,
  coverageEvidenceMeetsPromotionRequirementsV1,
  DEFAULT_COVERAGE_EVIDENCE_REQUIREMENTS_V1,
  type CoverageEvidenceRequirementsV1,
} from "./coverage-evidence-requirements-v1";
import { validateCoverageEvidenceV1, type CoverageEvidenceV1 } from "./coverage-evidence-v1";
import { validateCoverageSubjectIdV1 } from "./coverage-subject-id-v1";

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
  if (!validateCoverageSubjectIdV1(row.subject_id)) return false;
  if (!isDisposition(row.core_disposition)) return false;
  if (row.adapter_state !== null && typeof row.adapter_state !== "string") return false;
  if (typeof row.policy_apply_allowed !== "boolean") return false;
  if (!Array.isArray(row.blockers) || !row.blockers.every((b) => typeof b === "string")) {
    return false;
  }
  if (
    row.core_disposition === "suppressed" &&
    !row.blockers.some((blocker) => typeof blocker === "string" && blocker.trim().length > 0)
  ) {
    return false;
  }
  if (row.read_only !== true || row.data_mutation !== false) return false;
  if (row.mutation_authorized !== false) return false;
  if (row.production_mutation_authorized !== false) return false;
  return true;
}

function coverageAssessmentPlanningEvidenceSatisfiedV1(args: {
  evidence: CoverageEvidenceV1;
  requirements?: CoverageEvidenceRequirementsV1;
}): boolean {
  const requirements = args.requirements ?? DEFAULT_COVERAGE_EVIDENCE_REQUIREMENTS_V1;
  if (coverageEvidenceHasUnknownOnPromotionDimensionsV1({ evidence: args.evidence, requirements })) {
    return false;
  }
  return coverageEvidenceMeetsPromotionRequirementsV1({ evidence: args.evidence, requirements });
}

function coverageAssessmentDispositionConsistentWithEvidenceV1(args: {
  assessment: CoverageAssessmentV1;
  evidence: CoverageEvidenceV1;
  requirements?: CoverageEvidenceRequirementsV1;
}): boolean {
  const { assessment, evidence } = args;
  const requirements = args.requirements ?? DEFAULT_COVERAGE_EVIDENCE_REQUIREMENTS_V1;

  if (assessment.core_disposition === "covered") {
    if (!coverageEvidenceMeetsCoveredRequirementsV1(evidence)) return false;
  }

  if (assessment.core_disposition === "ready_for_change_planning") {
    return coverageAssessmentPlanningEvidenceSatisfiedV1({ evidence, requirements });
  }

  if (assessment.core_disposition === "candidate_apply") {
    if (!assessment.policy_apply_allowed) return false;
    return coverageAssessmentPlanningEvidenceSatisfiedV1({ evidence, requirements });
  }

  return true;
}

/** Planning-only readiness: evidence gates apply; policy_apply_allowed may remain false. */
export function coverageAssessmentPlanningAllowedV1(args: {
  assessment: CoverageAssessmentV1;
  evidence: CoverageEvidenceV1;
  requirements?: CoverageEvidenceRequirementsV1;
}): boolean {
  if (args.assessment.core_disposition !== "ready_for_change_planning") {
    return true;
  }
  return coverageAssessmentDispositionConsistentWithEvidenceV1(args);
}

/** Apply candidacy is stricter than planning-only: requires policy_apply_allowed and full promotion evidence. */
export function coverageAssessmentApplyAllowedV1(args: {
  assessment: CoverageAssessmentV1;
  evidence: CoverageEvidenceV1;
  requirements?: CoverageEvidenceRequirementsV1;
}): boolean {
  if (args.assessment.core_disposition !== "candidate_apply") {
    return true;
  }
  return coverageAssessmentDispositionConsistentWithEvidenceV1(args);
}

/**
 * Unknown evidence must never promote to candidate_apply or ready_for_change_planning.
 * Uses evidence requirements contract (default identity + fit + buyer_path).
 */
export function coverageAssessmentPromotionAllowedV1(args: {
  assessment: CoverageAssessmentV1;
  evidence: CoverageEvidenceV1;
  requirements?: CoverageEvidenceRequirementsV1;
}): boolean {
  const { assessment } = args;
  if (assessment.core_disposition === "ready_for_change_planning") {
    return coverageAssessmentPlanningAllowedV1(args);
  }
  if (assessment.core_disposition === "candidate_apply") {
    return coverageAssessmentApplyAllowedV1(args);
  }
  return true;
}

export function validateCoverageAssessmentWithEvidenceV1(args: {
  assessment: CoverageAssessmentV1;
  evidence: CoverageEvidenceV1;
  requirements?: CoverageEvidenceRequirementsV1;
}): boolean {
  if (!validateCoverageAssessmentV1(args.assessment)) return false;
  if (!validateCoverageEvidenceV1(args.evidence)) return false;
  if (args.assessment.subject_id !== args.evidence.subject_id) return false;
  return coverageAssessmentDispositionConsistentWithEvidenceV1(args);
}
