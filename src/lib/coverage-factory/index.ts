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
  coverageAssessmentApplyAllowedV1,
  coverageAssessmentPlanningAllowedV1,
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
  buildEvidenceSummaryFromCoverageEvidenceV1,
  buildProvenanceSummaryFromCoverageEvidenceV1,
  deriveFactorySubjectTruthBlockersV1,
  COMMITTED_UCF_ADAPTER_IDS_V1,
  COMMITTED_UCF_ADAPTER_REFERENCE_FILTER_SLUGS_V1,
  isCommittedUcfAdapterIdV1,
  UCF_SUBJECT_TRUTH_BLOCKER_PLANNING_READY_FIT_BLOCKED_V1,
  UCF_SUBJECT_TRUTH_BLOCKER_RESCUE_BUYER_PATH_MAPPING_BLOCKED_V1,
  UNIVERSAL_COVERAGE_FACTORY_CONTRACT_V1,
  universalCoverageFactoryGrantsMutationAuthorityV1,
  universalCoverageFactoryInternalConsistencyErrorsV1,
  validateUniversalCoverageFactoryV1,
  type CommittedUcfAdapterIdV1,
  type UniversalCoverageFactoryBatchHeadV1,
  type UniversalCoverageFactoryEvidenceSummaryV1,
  type UniversalCoverageFactoryProvenanceSummaryV1,
  type UniversalCoverageFactoryRunManifestV1,
  type UniversalCoverageFactorySubjectLinkRefV1,
  type UniversalCoverageFactorySubjectRowV1,
  type UniversalCoverageFactorySubjectTruthBlockerV1,
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
  buildUniversalCoverageFactoryWorkGeneratorV1,
  dispositionForCoverageAssessmentV1,
  expectedActionClassForWorkGeneratorDisposition,
  stableUcfWorkItemIdV1,
  UNIVERSAL_COVERAGE_FACTORY_WORK_GENERATOR_CONTRACT_V1,
  universalCoverageFactoryWorkGeneratorGrantsMutationAuthorityV1,
  validateUniversalCoverageFactoryWorkGeneratorV1,
  type UniversalCoverageFactoryWorkGeneratorDispositionV1,
  type UniversalCoverageFactoryWorkGeneratorV1,
} from "./universal-coverage-factory-work-generator-v1";

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

export {
  VACUUM_COVERAGE_DISPOSITION_MAPPING_TABLE_V1,
  VACUUM_COVERAGE_FACTORY_ADAPTER_ID_V1,
  VACUUM_COVERAGE_LEGACY_MAP_V1,
  VACUUM_WEDGE_POSTURE_SNAPSHOT_V1,
  assessVacuumContractFitV1,
  buildVacuumCoverageFactoryReferenceProjectionV1,
  buildVacuumProjectionReportV1,
  loadVacuumArtifactsForSubjectSlugV1,
  mapVacuumDispositionToUcfV1,
  resolveVacuumDispositionV1,
  vacuumCoverageDispositionMeaningPreservedV1,
  type VacuumContractFitGapV1,
  type VacuumCoverageDispositionV1,
  type VacuumCoverageFactoryProjectionV1,
  type VacuumProjectionReportRowV1,
} from "./adapters/vacuum-coverage-factory-adapter-v1";

export {
  HUMIDIFIER_COVERAGE_DISPOSITION_MAPPING_TABLE_V1,
  HUMIDIFIER_COVERAGE_FACTORY_ADAPTER_ID_V1,
  HUMIDIFIER_COVERAGE_LEGACY_MAP_V1,
  HUMIDIFIER_WEDGE_POSTURE_SNAPSHOT_V1,
  assessHumidifierContractFitV1,
  buildHumidifierCoverageFactoryReferenceProjectionV1,
  buildHumidifierProjectionReportV1,
  loadHumidifierArtifactsForSubjectSlugV1,
  mapHumidifierDispositionToUcfV1,
  resolveHumidifierDispositionV1,
  humidifierCoverageDispositionMeaningPreservedV1,
  type HumidifierContractFitGapV1,
  type HumidifierCoverageDispositionV1,
  type HumidifierCoverageFactoryProjectionV1,
  type HumidifierProjectionReportRowV1,
} from "./adapters/humidifier-coverage-factory-adapter-v1";

export {
  APPLIANCE_AIR_COVERAGE_DISPOSITION_MAPPING_TABLE_V1,
  APPLIANCE_AIR_COVERAGE_FACTORY_ADAPTER_ID_V1,
  APPLIANCE_AIR_COVERAGE_LEGACY_MAP_V1,
  APPLIANCE_AIR_WEDGE_POSTURE_SNAPSHOT_V1,
  assessApplianceAirContractFitV1,
  buildApplianceAirCoverageFactoryReferenceProjectionV1,
  buildApplianceAirProjectionReportV1,
  loadApplianceAirArtifactsForSubjectSlugV1,
  mapApplianceAirDispositionToUcfV1,
  resolveApplianceAirDispositionV1,
  applianceAirCoverageDispositionMeaningPreservedV1,
  type ApplianceAirContractFitGapV1,
  type ApplianceAirCoverageDispositionV1,
  type ApplianceAirCoverageFactoryProjectionV1,
  type ApplianceAirProjectionReportRowV1,
} from "./adapters/appliance-air-coverage-factory-adapter-v1";

export {
  assessUcfCanonicalReadinessV1,
  classifyUcfParityFindingV1,
  UCF_ACCEPTED_INTERPRETATION_SUBJECT_IDS_V1,
  UCF_CANONICAL_READINESS_GOVERNANCE_CLASSES_V1,
  UCF_CANONICAL_READINESS_POLICY_CONTRACT_V1,
  UCF_CANONICAL_READINESS_VERDICTS_V1,
  UCF_PARITY_FINDING_SEVERITIES_V1,
  UCF_PARITY_FINDING_TYPES_V1,
  type ClassifiedUcfParityFindingV1,
  type UcfCanonicalReadinessAssessmentV1,
  type UcfCanonicalReadinessGovernanceClassV1,
  type UcfCanonicalReadinessVerdictV1,
  type UcfParityFindingSeverityV1,
  type UcfParityFindingTypeV1,
  type UcfParityFindingV1,
} from "./ucf-canonical-readiness-policy-v1";

export {
  buildRegisteredUcfFilterSlugSetV1,
  buildRegisteredUcfSubjectIdSetV1,
  buildUcfCoverageDispositionProvenanceFactsV1,
  buildUcfDecisionAuthorityCutoverReportV1,
  buildUcfDecisionAuthoritySnapshotV1,
  committedUcfRegisteredSubjectCountV1,
  lookupUcfSubjectRowByFilterSlugV1,
  UCF_DECISION_AUTHORITY_CONSUMER_INVENTORY_V1,
  UCF_DECISION_AUTHORITY_CUTOVER_CONTRACT_V1,
  UCF_DECISION_AUTHORITY_CUTOVER_REPORT_NAME_V1,
  type BuildUcfDecisionAuthoritySnapshotArgsV1,
  type UcfDecisionAuthorityConsumerClassificationV1,
  type UcfDecisionAuthorityConsumerCutoverRowV1,
  type UcfDecisionAuthorityConsumerInventoryEntryV1,
  type UcfDecisionAuthorityConsumerMigrationStatusV1,
  type UcfDecisionAuthorityCutoverReportV1,
  resolveUcfCoverageDispositionForRegisteredSlugV1,
  type UcfDecisionAuthoritySnapshotV1,
} from "./ucf-decision-authority-cutover-v1";

export {
  buildUcfDecisionAuthorityCutoverPhase2ReportV1,
  UCF_DECISION_AUTHORITY_CUTOVER_PHASE2_CONTRACT_V1,
  UCF_DECISION_AUTHORITY_CUTOVER_PHASE2_REPORT_NAME_V1,
  UCF_DECISION_AUTHORITY_PHASE2_CONSUMER_AUDIT_V1,
  UCF_GOAT_C1_CONSUMERS_V1,
  type UcfDecisionAuthorityCutoverPhase2ReportV1,
  type UcfDecisionAuthorityPhase2AuditClassificationV1,
  type UcfDecisionAuthorityPhase2AuditEntryV1,
} from "./ucf-decision-authority-cutover-phase2-v1";

export {
  assertUcfReplacementSimulationPassedV1,
  buildUcfReplacementProofReportV1,
  runUcfReplacementSimulationV1,
  UCF_LEGACY_COVERAGE_DECISION_SOURCES_V1,
  UCF_REPLACEMENT_PROOF_CONTRACT_V1,
  UCF_REPLACEMENT_PROOF_REPORT_NAME_V1,
  type UcfLegacyCoverageDecisionSourceV1,
  type UcfReplacementBehaviorIdenticalVerdictV1,
  type UcfReplacementMatrixRowV1,
  type UcfReplacementProofReportV1,
  type UcfReplacementSimulationDeltaV1,
  type UcfReplacementSimulationDimensionV1,
  type UcfReplacementSimulationResultV1,
} from "./ucf-replacement-proof-v1";

export {
  assertGoatC1LbcfUcfTaxonomyBridgeSafetyInvariantsV1,
  buildGoatC1LbcfUcfTaxonomyBridgeReportV1,
  compareLbcfUcfOverlappingFridgeSubjectsV1,
  GOAT_C1_LBCF_UCF_TAXONOMY_BRIDGE_CONTRACT_V1,
  GOAT_C1_LBCF_UCF_TAXONOMY_BRIDGE_REPORT_NAME_V1,
  GOAT_C1_READINESS_VERDICTS_V1,
  LBCF_UCF_TAXONOMY_BRIDGE_MATRIX_V1,
  lookupLbcfUcfTaxonomyBridgeRowV1,
  type GoatC1LbcfUcfTaxonomyBridgeReportV1,
  type GoatC1ReadinessVerdictV1,
  type LbcfUcfOverlapComparisonRowV1,
  type LbcfUcfTaxonomyBridgeComparisonV1,
  type LbcfUcfTaxonomyBridgeMatrixRowV1,
} from "./goat-c1-lbcf-ucf-taxonomy-bridge-v1";

export {
  assertGoatC1DualAuthorityResolvesBridgeV1,
  buildGoatC1TaxonomyResolutionPlanReportV1,
  GOAT_C1_INTERPRETATION_OPTIONS_V1,
  GOAT_C1_INTERPRETATION_RECOMMENDATION_V1,
  GOAT_C1_SMALLEST_NEXT_BUILD_SLICE_V1,
  GOAT_C1_TAXONOMY_RESOLUTION_PLAN_CONTRACT_V1,
  GOAT_C1_TAXONOMY_RESOLUTION_PLAN_REPORT_NAME_V1,
  GOAT_C1_TAXONOMY_RESOLUTION_RISKS_V1,
  GOAT_C1_TAXONOMY_RESOLUTION_STRATEGIES_V1,
  GOAT_C1_TAXONOMY_RESOLUTION_TABLE_SEED_V1,
  lookupGoatC1TaxonomyResolutionRowV1,
  type GoatC1InterpretationOptionV1,
  type GoatC1InterpretationRecommendationV1,
  type GoatC1NextBuildSliceV1,
  type GoatC1PostResolutionReadinessV1,
  type GoatC1TaxonomyResolutionPlanReportV1,
  type GoatC1TaxonomyResolutionRiskV1,
  type GoatC1TaxonomyResolutionStrategyV1,
  type GoatC1TaxonomyResolutionTableRowV1,
} from "./goat-c1-taxonomy-resolution-plan-v1";

export {
  buildUcfProvenanceLoadBearingExperimentReportV1,
  classifyStrippedProvenanceOutcomeV1,
  classifyUcfProvenanceExperimentVerdictV1,
  deriveStrippedDispositionV1,
  runUcfProvenanceSubjectExperimentV1,
  selectUcfProvenanceExperimentSubjectsV1,
  stripProvenanceFromCoverageEvidenceV1,
  ucfProvenanceExperimentGrantsMutationAuthorityV1,
  UCF_PROVENANCE_FALSIFICATION_CLAIM_V1,
  UCF_PROVENANCE_LOAD_BEARING_EXPERIMENT_CONTRACT_V1,
  UCF_PROVENANCE_LOAD_BEARING_EXPERIMENT_REPORT_NAME_V1,
  workItemClassForDispositionV1,
  type UcfProvenanceExperimentOutcomeV1,
  type UcfProvenanceExperimentSubjectResultV1,
  type UcfProvenanceExperimentVerdictV1,
  type UcfProvenanceLoadBearingExperimentReportV1,
  type UcfProvenanceSubjectProjectionV1,
} from "./ucf-provenance-load-bearing-experiment-v1";

export {
  buildUcfFailClosedEnforcementExperimentReportV1,
  classifyUcfFailClosedEnforcementVerdictV1,
  isSuppressedSubjectSystemBlockedV1,
  runUcfFailClosedSubjectEnforcementExperimentV1,
  selectUcfFailClosedExperimentSuppressedSubjectsV1,
  simulateSuppressedSubjectMutationAttemptsV1,
  ucfFailClosedEnforcementExperimentGrantsMutationAuthorityV1,
  UCF_FAIL_CLOSED_ENFORCEMENT_EXPERIMENT_CONTRACT_V1,
  UCF_FAIL_CLOSED_ENFORCEMENT_EXPERIMENT_REPORT_NAME_V1,
  UCF_FAIL_CLOSED_FALSIFICATION_CLAIM_V1,
  type UcfFailClosedEnforcementExperimentReportV1,
  type UcfFailClosedEnforcementVerdictV1,
  type UcfFailClosedMutationAttemptKindV1,
  type UcfFailClosedMutationAttemptV1,
  type UcfFailClosedMutationSystemResponseV1,
  type UcfFailClosedSubjectBaselineV1,
  type UcfFailClosedSubjectEnforcementResultV1,
} from "./ucf-fail-closed-enforcement-experiment-v1";
