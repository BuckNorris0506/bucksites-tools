import assert from "node:assert/strict";
import test from "node:test";

import { HOMEKEEP_WEDGE_CATALOG } from "@/lib/catalog/identity";

import {
  COVERAGE_ASSESSMENT_CONTRACT_V1,
  COVERAGE_EVIDENCE_CONTRACT_V1,
  COVERAGE_EVIDENCE_DIMENSIONS_V1,
  COVERAGE_EVIDENCE_REQUIREMENTS_CONTRACT_V1,
  COVERAGE_FACTORY_ADAPTER_CONTRACT_V1,
  COVERAGE_FACTORY_SCHEMA_VERSION_V1,
  COVERAGE_LEGACY_MAP_CONTRACT_V1,
  COVERAGE_RUN_MANIFEST_CONTRACT_V1,
  COVERAGE_SUBJECT_CONTRACT_V1,
  COVERAGE_SUBJECT_LINK_CONTRACT_V1,
  COVERAGE_WORK_ITEM_CONTRACT_V1,
  DEFAULT_COVERAGE_EVIDENCE_REQUIREMENTS_V1,
  assertCanonicalWedgeCatalogValuesV1,
  buildCoverageSubjectIdV1,
  coverageAssessmentApplyAllowedV1,
  coverageAssessmentPlanningAllowedV1,
  coverageAssessmentPromotionAllowedV1,
  coverageEvidenceMeetsPromotionRequirementsV1,
  coverageEvidenceSupportsPromotionV1,
  coverageFactoryAdapterDescribesCapabilityOnlyV1,
  coverageFactoryAdapterGrantsMutationAuthorityV1,
  coverageFactoryContractsGrantProductionMutationAuthorityV1,
  coverageLegacyMapGrantsMutationAuthorityV1,
  coverageRunManifestHasInputHashesV1,
  coverageRunManifestIsImmutableShapedV1,
  coverageSubjectHasCanonicalWedgeIdentityV1,
  coverageSubjectIdIsRawSlugOnlyV1,
  coverageWorkItemGrantsMutationAuthorityV1,
  validateCoverageAssessmentV1,
  validateCoverageAssessmentWithEvidenceV1,
  validateCoverageEvidenceRequirementsV1,
  validateCoverageEvidenceV1,
  validateCoverageFactoryAdapterDescriptorV1,
  validateCoverageLegacyMapV1,
  validateCoverageProvenanceRefV1,
  validateCoverageRunManifestV1,
  validateCoverageSubjectIdV1,
  validateCoverageSubjectLinkV1,
  validateCoverageSubjectV1,
  validateCoverageWorkItemV1,
  type CoverageAssessmentV1,
  type CoverageEvidenceRequirementsV1,
  type CoverageEvidenceV1,
  type CoverageProvenanceRefV1,
  type CoverageSubjectV1,
} from "./index";

const SUBJECT_ID_AP = "air_purifier:filter:alen-b75-mp";
const SUBJECT_ID_FRIDGE = "refrigerator_water:model:rf28hmedbsg";

function packetRef(packetId: string): CoverageProvenanceRefV1 {
  return { kind: "packet_id", packet_id: packetId };
}

function buildProvenEvidence(
  subjectId: string,
  requirements?: CoverageEvidenceRequirementsV1,
): CoverageEvidenceV1 {
  const promotionDimensions =
    requirements?.promotion_dimensions ??
    DEFAULT_COVERAGE_EVIDENCE_REQUIREMENTS_V1.promotion_dimensions;

  const claims = Object.fromEntries(
    COVERAGE_EVIDENCE_DIMENSIONS_V1.map((dimension) => {
      const isPromotionDimension = promotionDimensions.includes(dimension);
      const status = isPromotionDimension
        ? "proven"
        : dimension === "demand" || dimension === "publication"
          ? "not_applicable"
          : "proven";
      return [
        dimension,
        {
          dimension,
          status,
          provenance_refs:
            status === "proven" ? [packetRef(`prov-${dimension}`)] : ([] as CoverageProvenanceRefV1[]),
          summary: null,
        },
      ];
    }),
  ) as CoverageEvidenceV1["claims"];

  return {
    contract: COVERAGE_EVIDENCE_CONTRACT_V1,
    subject_id: subjectId,
    claims,
    read_only: true,
    data_mutation: false,
  };
}

function buildUnknownBuyerPathEvidence(subjectId: string): CoverageEvidenceV1 {
  const evidence = buildProvenEvidence(subjectId);
  evidence.claims.buyer_path = {
    dimension: "buyer_path",
    status: "unknown",
    provenance_refs: [],
    summary: "buyer path not proven",
  };
  return evidence;
}

function buildAssessment(
  disposition: CoverageAssessmentV1["core_disposition"],
  subjectId: string,
  blockers: string[] = [],
): CoverageAssessmentV1 {
  return {
    contract: COVERAGE_ASSESSMENT_CONTRACT_V1,
    subject_id: subjectId,
    core_disposition: disposition,
    adapter_state: null,
    policy_apply_allowed: true,
    blockers,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    production_mutation_authorized: false,
  };
}

const sampleSubject: CoverageSubjectV1 = {
  contract: COVERAGE_SUBJECT_CONTRACT_V1,
  subject_id: SUBJECT_ID_AP,
  wedge: HOMEKEEP_WEDGE_CATALOG.air_purifier,
  kind: "replacement_part",
  internal_slug_labels: ["alen-b75-mp"],
  official_model_token: "BreatheSmart 75i",
  official_replacement_token: "F20011",
  official_replacement_name: "Essential (Pure)",
  read_only: true,
  data_mutation: false,
};

test("raw slug IDs fail and namespaced subject IDs pass", () => {
  assert.equal(coverageSubjectIdIsRawSlugOnlyV1("alen-b75-mp"), true);
  assert.equal(validateCoverageSubjectIdV1("alen-b75-mp"), false);
  assert.equal(validateCoverageSubjectIdV1("ap:filter:slug"), false);
  assert.equal(validateCoverageSubjectIdV1(SUBJECT_ID_AP), true);
  assert.equal(validateCoverageSubjectIdV1(SUBJECT_ID_FRIDGE), true);

  const built = buildCoverageSubjectIdV1({
    wedge: HOMEKEEP_WEDGE_CATALOG.air_purifier,
    kind_segment: "filter",
    local_key: "alen-b75-mp",
  });
  assert.equal(built, SUBJECT_ID_AP);
  assert.ok(validateCoverageSubjectV1(sampleSubject));

  const wedgeMismatch = { ...sampleSubject, wedge: HOMEKEEP_WEDGE_CATALOG.vacuum };
  assert.equal(validateCoverageSubjectV1(wedgeMismatch), false);

  const kindMismatch = { ...sampleSubject, kind: "model" as const };
  assert.equal(validateCoverageSubjectV1(kindMismatch), false);
});

test("every subject has canonical wedge identity", () => {
  assert.ok(coverageSubjectHasCanonicalWedgeIdentityV1(sampleSubject));

  for (const wedge of assertCanonicalWedgeCatalogValuesV1()) {
    const subject: CoverageSubjectV1 = {
      ...sampleSubject,
      wedge,
      subject_id: buildCoverageSubjectIdV1({
        wedge,
        kind_segment: "filter",
        local_key: "canonical-wedge-test",
      }),
    };
    assert.ok(validateCoverageSubjectV1(subject));
    assert.ok(coverageSubjectHasCanonicalWedgeIdentityV1(subject));
  }

  const legacyAlias = { ...sampleSubject, wedge: "refrigerator" };
  assert.equal(validateCoverageSubjectV1(legacyAlias), false);
});

test("provenance refs are typed and reject empty opaque strings", () => {
  assert.ok(
    validateCoverageProvenanceRefV1({
      kind: "artifact_path_hash",
      label: "model_first_batch",
      hash: "sha256:abc",
    }),
  );
  assert.ok(validateCoverageProvenanceRefV1({ kind: "packet_id", packet_id: "ap-model-first-v1" }));
  assert.ok(
    validateCoverageProvenanceRefV1({
      kind: "contract_row",
      contract: "air_purifier_model_first_evidence_result_v1",
      row_key: "alen-b75-mp",
    }),
  );

  assert.equal(validateCoverageProvenanceRefV1({ kind: "packet_id", packet_id: "" }), false);
  assert.equal(
    validateCoverageProvenanceRefV1({ kind: "artifact_path_hash", label: "", hash: "sha256:x" }),
    false,
  );

  const provenWithoutRefs = buildProvenEvidence(SUBJECT_ID_AP);
  provenWithoutRefs.claims.identity.provenance_refs = [];
  assert.equal(validateCoverageEvidenceV1(provenWithoutRefs), false);
});

test("subject links validate", () => {
  const modelId = "air_purifier:model:alen-breathesmart-75i";
  const link = {
    contract: COVERAGE_SUBJECT_LINK_CONTRACT_V1,
    from_subject_id: modelId,
    to_subject_id: SUBJECT_ID_AP,
    link_kind: "primary_for",
    read_only: true,
    data_mutation: false,
  };
  assert.ok(validateCoverageSubjectLinkV1(link));

  assert.equal(
    validateCoverageSubjectLinkV1({ ...link, from_subject_id: "alen-b75-mp" }),
    false,
  );
  assert.equal(
    validateCoverageSubjectLinkV1({ ...link, from_subject_id: modelId, to_subject_id: modelId }),
    false,
  );
});

test("legacy mapping schema validates without granting mutation", () => {
  const legacyMap = {
    contract: COVERAGE_LEGACY_MAP_CONTRACT_V1,
    schema_version: COVERAGE_FACTORY_SCHEMA_VERSION_V1,
    entries: [
      {
        legacy_label: "browser_truth_ready",
        core_disposition: "ready_for_change_planning",
        adapter_state: "direct_buyable",
        evidence_dimension_hints: { buyer_path: "proven" },
      },
    ],
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    production_mutation_authorized: false,
  };

  assert.ok(validateCoverageLegacyMapV1(legacyMap));
  assert.equal(coverageLegacyMapGrantsMutationAuthorityV1(legacyMap), false);

  const withMutation = { ...legacyMap, mutation_authorized: true };
  assert.equal(validateCoverageLegacyMapV1(withMutation), false);
});

test("custom evidence requirements can require publication or omit buyer_path", () => {
  const publicationRequired: CoverageEvidenceRequirementsV1 = {
    contract: COVERAGE_EVIDENCE_REQUIREMENTS_CONTRACT_V1,
    promotion_dimensions: ["identity", "publication"],
    covered_requires_identity_proven: true,
  };
  assert.ok(validateCoverageEvidenceRequirementsV1(publicationRequired));

  const evidence = buildProvenEvidence(SUBJECT_ID_AP, publicationRequired);
  evidence.claims.publication = {
    dimension: "publication",
    status: "unknown",
    provenance_refs: [],
    summary: null,
  };
  assert.equal(
    coverageEvidenceMeetsPromotionRequirementsV1({
      evidence,
      requirements: publicationRequired,
    }),
    false,
  );

  const referenceOnly: CoverageEvidenceRequirementsV1 = {
    contract: COVERAGE_EVIDENCE_REQUIREMENTS_CONTRACT_V1,
    promotion_dimensions: ["identity", "fit"],
    covered_requires_identity_proven: true,
  };
  const referenceEvidence = buildProvenEvidence(SUBJECT_ID_AP, referenceOnly);
  referenceEvidence.claims.buyer_path = {
    dimension: "buyer_path",
    status: "unknown",
    provenance_refs: [],
    summary: "reference-only wedge",
  };
  assert.equal(coverageEvidenceSupportsPromotionV1(referenceEvidence), false);
  assert.equal(
    coverageEvidenceMeetsPromotionRequirementsV1({
      evidence: referenceEvidence,
      requirements: referenceOnly,
    }),
    true,
  );
});

test("unknown evidence cannot become candidate_apply or ready_for_change_planning", () => {
  const unknownEvidence = buildUnknownBuyerPathEvidence(SUBJECT_ID_AP);
  assert.ok(validateCoverageEvidenceV1(unknownEvidence));
  assert.equal(coverageEvidenceSupportsPromotionV1(unknownEvidence), false);

  for (const disposition of ["candidate_apply", "ready_for_change_planning"] as const) {
    const assessment = buildAssessment(disposition, SUBJECT_ID_AP);
    assert.ok(validateCoverageAssessmentV1(assessment));
    assert.equal(
      coverageAssessmentPromotionAllowedV1({ assessment, evidence: unknownEvidence }),
      false,
    );
    assert.equal(
      validateCoverageAssessmentWithEvidenceV1({ assessment, evidence: unknownEvidence }),
      false,
    );
  }

  const provenEvidence = buildProvenEvidence(SUBJECT_ID_AP);
  const planningAssessment = buildAssessment("ready_for_change_planning", SUBJECT_ID_AP);
  assert.equal(
    validateCoverageAssessmentWithEvidenceV1({
      assessment: planningAssessment,
      evidence: provenEvidence,
    }),
    true,
  );
});

test("planning-only is valid without policy_apply; candidate_apply remains stricter", () => {
  const provenEvidence = buildProvenEvidence(SUBJECT_ID_AP);

  const planningNoApply = buildAssessment("ready_for_change_planning", SUBJECT_ID_AP);
  planningNoApply.policy_apply_allowed = false;
  assert.ok(validateCoverageAssessmentV1(planningNoApply));
  assert.equal(
    coverageAssessmentPlanningAllowedV1({ assessment: planningNoApply, evidence: provenEvidence }),
    true,
  );
  assert.equal(
    validateCoverageAssessmentWithEvidenceV1({
      assessment: planningNoApply,
      evidence: provenEvidence,
    }),
    true,
  );

  const candidateNoApply = buildAssessment("candidate_apply", SUBJECT_ID_AP);
  candidateNoApply.policy_apply_allowed = false;
  assert.equal(
    coverageAssessmentApplyAllowedV1({ assessment: candidateNoApply, evidence: provenEvidence }),
    false,
  );
  assert.equal(
    validateCoverageAssessmentWithEvidenceV1({
      assessment: candidateNoApply,
      evidence: provenEvidence,
    }),
    false,
  );

  const candidateWithApply = buildAssessment("candidate_apply", SUBJECT_ID_AP);
  candidateWithApply.policy_apply_allowed = true;
  assert.equal(
    coverageAssessmentApplyAllowedV1({
      assessment: candidateWithApply,
      evidence: provenEvidence,
    }),
    true,
  );
  assert.equal(
    validateCoverageAssessmentWithEvidenceV1({
      assessment: candidateWithApply,
      evidence: provenEvidence,
    }),
    true,
  );
});

test("covered without identity proof fails and suppressed without blocker fails", () => {
  const identityUnknown = buildProvenEvidence(SUBJECT_ID_AP);
  identityUnknown.claims.identity = {
    dimension: "identity",
    status: "unknown",
    provenance_refs: [],
    summary: null,
  };

  const coveredAssessment = buildAssessment("covered", SUBJECT_ID_AP);
  assert.equal(
    validateCoverageAssessmentWithEvidenceV1({
      assessment: coveredAssessment,
      evidence: identityUnknown,
    }),
    false,
  );

  const suppressedNoBlocker = buildAssessment("suppressed", SUBJECT_ID_AP, []);
  assert.equal(validateCoverageAssessmentV1(suppressedNoBlocker), false);

  const suppressedWithBlocker = buildAssessment("suppressed", SUBJECT_ID_AP, [
    "owner_policy_hold",
  ]);
  assert.ok(validateCoverageAssessmentV1(suppressedWithBlocker));
});

test("assessment/evidence subject mismatch fails", () => {
  const evidence = buildProvenEvidence(SUBJECT_ID_AP);
  const assessment = buildAssessment("owner_review", SUBJECT_ID_FRIDGE);
  assert.equal(
    validateCoverageAssessmentWithEvidenceV1({ assessment, evidence }),
    false,
  );
});

test("run manifest is immutable-shaped and includes hardened fields", () => {
  const manifest = {
    contract: COVERAGE_RUN_MANIFEST_CONTRACT_V1,
    schema_version: COVERAGE_FACTORY_SCHEMA_VERSION_V1,
    run_id: "ucf-run-2026-06-10-001",
    adapter_id: "descriptor-only",
    adapter_version: "1.0.0",
    wedge: HOMEKEEP_WEDGE_CATALOG.air_purifier,
    generated_at: "2026-06-10T18:00:00.000Z",
    input_artifact_hashes: {
      demand_lane_snapshot: "sha256:abc123",
      wedge_matrix_snapshot: "sha256:def456",
    },
    assessment_counts: {
      owner_review: 2,
      research_buyer_path: 5,
    },
    subject_count: 42,
    provenance_index_hash: "sha256:prov-index",
    prior_run_id: null,
    immutable: true,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    production_mutation_authorized: false,
  };

  assert.ok(validateCoverageRunManifestV1(manifest));
  assert.ok(coverageRunManifestHasInputHashesV1(manifest));
  assert.ok(coverageRunManifestIsImmutableShapedV1(manifest));

  const missingHashes = { ...manifest, input_artifact_hashes: {} };
  assert.ok(validateCoverageRunManifestV1(missingHashes));
  assert.equal(coverageRunManifestHasInputHashesV1(missingHashes), false);
});

test("adapters describe capability without granting mutation", () => {
  const adapter = {
    contract: COVERAGE_FACTORY_ADAPTER_CONTRACT_V1,
    schema_version: COVERAGE_FACTORY_SCHEMA_VERSION_V1,
    adapter_id: "wedge-adapter-descriptor",
    adapter_version: "1.0.0",
    wedge: HOMEKEEP_WEDGE_CATALOG.whole_house_water,
    subject_id_namespace: HOMEKEEP_WEDGE_CATALOG.whole_house_water,
    capabilities: ["discover_subjects", "collect_signals"],
    source_contracts: ["whole_house_water_model_first_evidence_result_v1"],
    input_artifact_labels: ["model_first_batch"],
    evidence_requirements: DEFAULT_COVERAGE_EVIDENCE_REQUIREMENTS_V1,
    legacy_state_labels: ["browser_truth_ready"],
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    production_mutation_authorized: false,
    artifact_write_authorized: false,
  };

  assert.ok(validateCoverageFactoryAdapterDescriptorV1(adapter));
  assert.ok(coverageFactoryAdapterDescribesCapabilityOnlyV1(adapter));
  assert.equal(coverageFactoryAdapterGrantsMutationAuthorityV1(adapter), false);

  const namespaceMismatch = {
    ...adapter,
    subject_id_namespace: HOMEKEEP_WEDGE_CATALOG.air_purifier,
  };
  assert.equal(validateCoverageFactoryAdapterDescriptorV1(namespaceMismatch), false);
});

test("factory contracts grant no production mutation authority", () => {
  assert.equal(coverageFactoryContractsGrantProductionMutationAuthorityV1(), false);

  const workItem = {
    contract: COVERAGE_WORK_ITEM_CONTRACT_V1,
    work_item_id: "wi-001",
    subject_ids: [SUBJECT_ID_AP],
    required_evidence_checks: ["identity", "fit", "buyer_path"],
    permitted_action_class: "READ_ONLY_RESEARCH",
    requires_owner_review: true,
    priority_score: 10,
    blockers: [],
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    production_mutation_authorized: false,
    artifact_write_authorized: false,
  };

  assert.ok(validateCoverageWorkItemV1(workItem));
  assert.equal(coverageWorkItemGrantsMutationAuthorityV1(workItem), false);

  const assessment = buildAssessment("owner_review", SUBJECT_ID_AP);
  assert.equal(assessment.mutation_authorized, false);
  assert.equal(assessment.production_mutation_authorized, false);
});
