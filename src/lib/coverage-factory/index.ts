/**
 * Universal Coverage Factory v1 — contract foundation exports.
 */

export {
  COVERAGE_SUBJECT_CONTRACT_V1,
  COVERAGE_SUBJECT_KINDS_V1,
  assertCanonicalWedgeCatalogValuesV1,
  coverageSubjectHasCanonicalWedgeIdentityV1,
  validateCoverageSubjectV1,
  type CoverageSubjectKindV1,
  type CoverageSubjectV1,
} from "./coverage-subject-v1";

export {
  COVERAGE_EVIDENCE_CLAIM_STATUSES_V1,
  COVERAGE_EVIDENCE_CONTRACT_V1,
  COVERAGE_EVIDENCE_DIMENSIONS_V1,
  coverageEvidenceDimensionIsUnknownV1,
  coverageEvidenceHasUnknownOnRequiredDimensionsV1,
  coverageEvidenceSupportsPromotionV1,
  validateCoverageEvidenceV1,
  type CoverageEvidenceClaimStatusV1,
  type CoverageEvidenceClaimV1,
  type CoverageEvidenceDimensionV1,
  type CoverageEvidenceV1,
} from "./coverage-evidence-v1";

export {
  COVERAGE_ASSESSMENT_CONTRACT_V1,
  COVERAGE_ASSESSMENT_DISPOSITIONS_V1,
  COVERAGE_ASSESSMENT_PROMOTION_DISPOSITIONS_V1,
  coverageAssessmentPromotionAllowedV1,
  isCoverageAssessmentPromotionDispositionV1,
  validateCoverageAssessmentV1,
  validateCoverageAssessmentWithEvidenceV1,
  type CoverageAssessmentDispositionV1,
  type CoverageAssessmentPromotionDispositionV1,
  type CoverageAssessmentV1,
} from "./coverage-assessment-v1";

export {
  COVERAGE_WORK_ITEM_ACTION_CLASSES_V1,
  COVERAGE_WORK_ITEM_CONTRACT_V1,
  coverageWorkItemGrantsMutationAuthorityV1,
  validateCoverageWorkItemV1,
  type CoverageWorkItemActionClassV1,
  type CoverageWorkItemV1,
} from "./coverage-work-item-v1";

export {
  COVERAGE_RUN_MANIFEST_CONTRACT_V1,
  coverageRunManifestHasInputHashesV1,
  coverageRunManifestIsImmutableShapedV1,
  validateCoverageRunManifestV1,
  type CoverageRunManifestAssessmentCountsV1,
  type CoverageRunManifestInputHashesV1,
  type CoverageRunManifestV1,
} from "./coverage-run-manifest-v1";

export {
  COVERAGE_FACTORY_ADAPTER_CAPABILITIES_V1,
  COVERAGE_FACTORY_ADAPTER_CONTRACT_V1,
  coverageFactoryAdapterDescribesCapabilityOnlyV1,
  coverageFactoryAdapterGrantsMutationAuthorityV1,
  validateCoverageFactoryAdapterDescriptorV1,
  type CoverageFactoryAdapterCapabilityV1,
  type CoverageFactoryAdapterDescriptorV1,
} from "./coverage-factory-adapter-v1";

export const COVERAGE_FACTORY_FOUNDATION_READ_ONLY_DEFAULTS_V1 = {
  read_only: true,
  data_mutation: false,
  mutation_authorized: false,
  production_mutation_authorized: false,
} as const;

export function coverageFactoryContractsGrantProductionMutationAuthorityV1(): false {
  return false;
}
