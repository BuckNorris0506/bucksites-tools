/**
 * Universal Coverage Factory v1 — contract foundation exports.
 */

export const COVERAGE_FACTORY_SCHEMA_VERSION_V1 = "1.0.0" as const;

export {
  COVERAGE_SUBJECT_ID_CONTRACT_V1,
  COVERAGE_SUBJECT_ID_KIND_SEGMENTS_V1,
  buildCoverageSubjectIdV1,
  coverageSubjectIdIsRawSlugOnlyV1,
  coverageSubjectIdMatchesWedgeV1,
  parseCoverageSubjectIdV1,
  validateCoverageSubjectIdV1,
  type CoverageSubjectIdKindSegmentV1,
  type CoverageSubjectIdResolvedKindV1,
  type ParsedCoverageSubjectIdV1,
} from "./coverage-subject-id-v1";

export {
  COVERAGE_PROVENANCE_REF_CONTRACT_V1,
  COVERAGE_PROVENANCE_REF_KINDS_V1,
  coverageProvenanceRefsSatisfyProvenClaimV1,
  validateCoverageProvenanceRefListV1,
  validateCoverageProvenanceRefV1,
  type CoverageProvenanceRefArtifactPathHashV1,
  type CoverageProvenanceRefContractRowV1,
  type CoverageProvenanceRefKindV1,
  type CoverageProvenanceRefPacketIdV1,
  type CoverageProvenanceRefV1,
} from "./coverage-provenance-ref-v1";

export {
  COVERAGE_SUBJECT_LINK_CONTRACT_V1,
  COVERAGE_SUBJECT_LINK_KINDS_V1,
  validateCoverageSubjectLinkV1,
  type CoverageSubjectLinkKindV1,
  type CoverageSubjectLinkV1,
} from "./coverage-subject-link-v1";

export {
  COVERAGE_LEGACY_MAP_CONTRACT_V1,
  coverageLegacyMapGrantsMutationAuthorityV1,
  validateCoverageLegacyMapV1,
  type CoverageLegacyMapEntryV1,
  type CoverageLegacyMapEvidenceDimensionHintsV1,
  type CoverageLegacyMapV1,
} from "./coverage-legacy-map-v1";

export {
  COVERAGE_EVIDENCE_REQUIREMENTS_CONTRACT_V1,
  DEFAULT_COVERAGE_EVIDENCE_PROMOTION_DIMENSIONS_V1,
  DEFAULT_COVERAGE_EVIDENCE_REQUIREMENTS_V1,
  coverageEvidenceHasUnknownOnPromotionDimensionsV1,
  coverageEvidenceMeetsCoveredRequirementsV1,
  coverageEvidenceMeetsPromotionRequirementsV1,
  validateCoverageEvidenceRequirementsV1,
  type CoverageEvidenceRequirementsV1,
} from "./coverage-evidence-requirements-v1";

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
  coverageFactoryAdapterSubjectNamespaceMatchesWedgeV1,
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

export {
  buildUniversalCoverageFactoryV1,
  COMMITTED_UCF_ADAPTER_IDS_V1,
  COMMITTED_UCF_ADAPTER_REFERENCE_FILTER_SLUGS_V1,
  isCommittedUcfAdapterIdV1,
  UNIVERSAL_COVERAGE_FACTORY_CONTRACT_V1,
  universalCoverageFactoryGrantsMutationAuthorityV1,
  validateUniversalCoverageFactoryV1,
  type CommittedUcfAdapterIdV1,
  type UniversalCoverageFactoryBatchHeadV1,
  type UniversalCoverageFactoryRunManifestV1,
  type UniversalCoverageFactoryTotalsV1,
  type UniversalCoverageFactoryV1,
  type UniversalCoverageFactoryWedgeSummaryV1,
} from "./universal-coverage-factory-v1";

export {
  buildUniversalCoverageFactoryDecisionLayerV1,
  UNIVERSAL_COVERAGE_FACTORY_DECISION_LAYER_CONTRACT_V1,
  universalCoverageFactoryDecisionLayerGrantsMutationAuthorityV1,
  validateUniversalCoverageFactoryDecisionLayerV1,
  type UniversalCoverageFactoryDecisionLayerV1,
  type UniversalCoverageFactoryTruthBlockerV1,
} from "./universal-coverage-factory-decision-layer-v1";

export {
  AP_COVERAGE_DISPOSITION_MAPPING_TABLE_V1,
  AP_COVERAGE_FACTORY_ADAPTER_ID_V1,
  AP_COVERAGE_LEGACY_MAP_V1,
  AP_VORNADO_MD1_0022_REPO_SNAPSHOT_V1,
  apCoverageDispositionMeaningPreservedV1,
  buildApCoverageFactoryReferenceProjectionV1,
  loadApModelFirstArtifactV1,
  mapApDispositionToUcfV1,
  normalizeApDispositionV1,
  projectApModelFirstArtifactV1,
  projectApRepoCatalogSnapshotV1,
  type ApCoverageDispositionV1,
  type ApCoverageFactoryProjectionV1,
  type ApModelFirstArtifactV1,
} from "./adapters/ap-coverage-factory-adapter-v1";

export {
  WHW_COVERAGE_DISPOSITION_MAPPING_TABLE_V1,
  WHW_COVERAGE_FACTORY_ADAPTER_ID_V1,
  WHW_COVERAGE_LEGACY_MAP_V1,
  assessWhwContractFitV1,
  buildWhwCoverageFactoryReferenceProjectionV1,
  buildWhwProjectionReportV1,
  loadWhwArtifactsForFilterSlugV1,
  mapWhwDispositionToUcfV1,
  resolveWhwDispositionV1,
  whwCoverageDispositionMeaningPreservedV1,
  type WhwContractFitGapV1,
  type WhwCoverageDispositionV1,
  type WhwCoverageFactoryProjectionV1,
  type WhwProjectionReportRowV1,
} from "./adapters/whw-coverage-factory-adapter-v1";

export {
  FRIDGE_COVERAGE_DISPOSITION_MAPPING_TABLE_V1,
  FRIDGE_COVERAGE_FACTORY_ADAPTER_ID_V1,
  FRIDGE_COVERAGE_LEGACY_MAP_V1,
  assessFridgeContractFitV1,
  buildFridgeCoverageFactoryReferenceProjectionV1,
  buildFridgeProjectionReportV1,
  fridgeCoverageDispositionMeaningPreservedV1,
  loadFridgeArtifactsForFilterSlugV1,
  mapFridgeDispositionToUcfV1,
  resetFridgeAdapterAuditCacheV1,
  resolveFridgeDispositionV1,
  type FridgeContractFitGapV1,
  type FridgeCoverageDispositionV1,
  type FridgeCoverageFactoryProjectionV1,
  type FridgeProjectionReportRowV1,
} from "./adapters/fridge-coverage-factory-adapter-v1";
