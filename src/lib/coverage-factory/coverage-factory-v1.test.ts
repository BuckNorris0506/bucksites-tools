import assert from "node:assert/strict";
import test from "node:test";

import { HOMEKEEP_WEDGE_CATALOG } from "@/lib/catalog/identity";

import {
  COVERAGE_ASSESSMENT_CONTRACT_V1,
  COVERAGE_EVIDENCE_CONTRACT_V1,
  COVERAGE_EVIDENCE_DIMENSIONS_V1,
  COVERAGE_FACTORY_ADAPTER_CONTRACT_V1,
  COVERAGE_RUN_MANIFEST_CONTRACT_V1,
  COVERAGE_SUBJECT_CONTRACT_V1,
  COVERAGE_WORK_ITEM_CONTRACT_V1,
  assertCanonicalWedgeCatalogValuesV1,
  coverageAssessmentPromotionAllowedV1,
  coverageEvidenceSupportsPromotionV1,
  coverageFactoryAdapterDescribesCapabilityOnlyV1,
  coverageFactoryAdapterGrantsMutationAuthorityV1,
  coverageFactoryContractsGrantProductionMutationAuthorityV1,
  coverageRunManifestHasInputHashesV1,
  coverageRunManifestIsImmutableShapedV1,
  coverageSubjectHasCanonicalWedgeIdentityV1,
  coverageWorkItemGrantsMutationAuthorityV1,
  validateCoverageAssessmentV1,
  validateCoverageAssessmentWithEvidenceV1,
  validateCoverageEvidenceV1,
  validateCoverageFactoryAdapterDescriptorV1,
  validateCoverageRunManifestV1,
  validateCoverageSubjectV1,
  validateCoverageWorkItemV1,
  type CoverageAssessmentV1,
  type CoverageEvidenceV1,
  type CoverageSubjectV1,
} from "./index";

function buildProvenEvidence(subjectId: string): CoverageEvidenceV1 {
  const claims = Object.fromEntries(
    COVERAGE_EVIDENCE_DIMENSIONS_V1.map((dimension) => [
      dimension,
      {
        dimension,
        status: dimension === "demand" || dimension === "publication" ? "not_applicable" : "proven",
        provenance_ref_ids: [`prov-${dimension}`],
        summary: null,
      },
    ]),
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
    provenance_ref_ids: [],
    summary: "buyer path not proven",
  };
  return evidence;
}

function buildAssessment(
  disposition: CoverageAssessmentV1["core_disposition"],
  subjectId: string,
): CoverageAssessmentV1 {
  return {
    contract: COVERAGE_ASSESSMENT_CONTRACT_V1,
    subject_id: subjectId,
    core_disposition: disposition,
    adapter_state: null,
    policy_apply_allowed: true,
    blockers: [],
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    production_mutation_authorized: false,
  };
}

const sampleSubject: CoverageSubjectV1 = {
  contract: COVERAGE_SUBJECT_CONTRACT_V1,
  subject_id: "ap:alen-breathesmart-75i:alen-b75-mp",
  wedge: HOMEKEEP_WEDGE_CATALOG.air_purifier,
  kind: "model_replacement_pair",
  internal_slug_labels: ["alen-b75-mp"],
  official_model_token: "BreatheSmart 75i",
  official_replacement_token: "F20011",
  official_replacement_name: "Essential (Pure)",
  read_only: true,
  data_mutation: false,
};

test("every subject has canonical wedge identity", () => {
  assert.ok(validateCoverageSubjectV1(sampleSubject));
  assert.ok(coverageSubjectHasCanonicalWedgeIdentityV1(sampleSubject));

  for (const wedge of assertCanonicalWedgeCatalogValuesV1()) {
    const subject: CoverageSubjectV1 = { ...sampleSubject, wedge };
    assert.ok(coverageSubjectHasCanonicalWedgeIdentityV1(subject));
  }

  const legacyAlias = { ...sampleSubject, wedge: "refrigerator" };
  assert.equal(validateCoverageSubjectV1(legacyAlias), false);
});

test("unknown evidence cannot become candidate_apply or ready_for_change_planning", () => {
  const subjectId = "ap:test-filter";
  const unknownEvidence = buildUnknownBuyerPathEvidence(subjectId);
  assert.ok(validateCoverageEvidenceV1(unknownEvidence));
  assert.equal(coverageEvidenceSupportsPromotionV1(unknownEvidence), false);

  for (const disposition of ["candidate_apply", "ready_for_change_planning"] as const) {
    const assessment = buildAssessment(disposition, subjectId);
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

  const provenEvidence = buildProvenEvidence(subjectId);
  const planningAssessment = buildAssessment("ready_for_change_planning", subjectId);
  assert.equal(
    coverageAssessmentPromotionAllowedV1({
      assessment: planningAssessment,
      evidence: provenEvidence,
    }),
    true,
  );
  assert.equal(
    validateCoverageAssessmentWithEvidenceV1({
      assessment: planningAssessment,
      evidence: provenEvidence,
    }),
    true,
  );
});

test("run manifest is immutable-shaped and includes input hashes", () => {
  const manifest = {
    contract: COVERAGE_RUN_MANIFEST_CONTRACT_V1,
    run_id: "ucf-run-2026-06-10-001",
    adapter_id: "descriptor-only",
    adapter_version: "1.0.0",
    generated_at: "2026-06-10T18:00:00.000Z",
    input_artifact_hashes: {
      demand_lane_snapshot: "sha256:abc123",
      wedge_matrix_snapshot: "sha256:def456",
    },
    assessment_counts: {
      owner_review: 2,
      research_buyer_path: 5,
    },
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
    adapter_id: "wedge-adapter-descriptor",
    adapter_version: "1.0.0",
    wedge: HOMEKEEP_WEDGE_CATALOG.whole_house_water,
    capabilities: ["discover_subjects", "collect_signals"],
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

  const withMutationFlag = { ...adapter, mutation_authorized: true };
  assert.equal(validateCoverageFactoryAdapterDescriptorV1(withMutationFlag), false);
});

test("factory contracts grant no production mutation authority", () => {
  assert.equal(coverageFactoryContractsGrantProductionMutationAuthorityV1(), false);

  const workItem = {
    contract: COVERAGE_WORK_ITEM_CONTRACT_V1,
    work_item_id: "wi-001",
    subject_ids: ["ap:slug-a"],
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

  const assessment = buildAssessment("owner_review", "ap:slug-a");
  assert.equal(assessment.mutation_authorized, false);
  assert.equal(assessment.production_mutation_authorized, false);
});
