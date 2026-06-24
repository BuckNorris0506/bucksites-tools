import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  COMMITTED_UCF_ADAPTER_REFERENCE_FILTER_SLUGS_V1,
  COVERAGE_EVIDENCE_DIMENSIONS_V1,
  coverageAssessmentPromotionAllowedV1,
  coverageEvidenceMeetsPromotionRequirementsV1,
  coverageFactoryContractsGrantProductionMutationAuthorityV1,
  FRIDGE_COVERAGE_FACTORY_ADAPTER_ID_V1,
  validateCoverageAssessmentV1,
  validateCoverageAssessmentWithEvidenceV1,
  validateCoverageEvidenceV1,
  validateCoverageLegacyMapV1,
  validateCoverageRunManifestV1,
  validateCoverageSubjectLinkV1,
  validateCoverageSubjectV1,
  validateCoverageWorkItemV1,
} from "../index";

import {
  FRIDGE_COVERAGE_DISPOSITION_MAPPING_TABLE_V1,
  FRIDGE_COVERAGE_DISPOSITIONS_V1,
  FRIDGE_COVERAGE_LEGACY_MAP_V1,
  assessFridgeContractFitV1,
  buildFridgeCoverageFactoryReferenceProjectionV1,
  buildFridgeProjectionReportV1,
  fridgeCoverageDispositionMeaningPreservedV1,
  loadFridgeArtifactsForFilterSlugV1,
  mapFridgeDispositionToUcfV1,
  resetFridgeAdapterAuditCacheV1,
  resolveFridgeDispositionV1,
} from "./fridge-coverage-factory-adapter-v1";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");

const REFERENCE_SLUGS =
  COMMITTED_UCF_ADAPTER_REFERENCE_FILTER_SLUGS_V1[FRIDGE_COVERAGE_FACTORY_ADAPTER_ID_V1];

test.before(() => {
  resetFridgeAdapterAuditCacheV1();
});

test("refrigerator reference projection validates all UCF contract rows", () => {
  const projection = buildFridgeCoverageFactoryReferenceProjectionV1({
    rootDir: ROOT,
    filterSlugs: [...REFERENCE_SLUGS],
    now: () => new Date("2026-06-10T20:00:00.000Z"),
  });

  assert.equal(projection.read_only, true);
  assert.equal(projection.data_mutation, false);
  assert.ok(validateCoverageLegacyMapV1(FRIDGE_COVERAGE_LEGACY_MAP_V1));
  assert.ok(validateCoverageRunManifestV1(projection.run_manifest));

  for (const subject of projection.subjects) {
    assert.ok(validateCoverageSubjectV1(subject));
    assert.match(subject.subject_id, /^refrigerator_water:filter:/);
  }
  for (const row of projection.evidence) {
    assert.ok(validateCoverageEvidenceV1(row));
    assert.deepEqual(Object.keys(row.claims).sort(), [...COVERAGE_EVIDENCE_DIMENSIONS_V1].sort());
  }
  for (const assessment of projection.assessments) {
    assert.ok(validateCoverageAssessmentV1(assessment));
    assert.equal(assessment.mutation_authorized, false);
    assert.equal(assessment.production_mutation_authorized, false);
  }
  for (const workItem of projection.work_items) {
    assert.ok(validateCoverageWorkItemV1(workItem));
    assert.equal(workItem.artifact_write_authorized, false);
  }
  for (const link of projection.subject_links) {
    assert.ok(validateCoverageSubjectLinkV1(link));
  }
});

test("no subject ID collisions across refrigerator reference projection", () => {
  const projection = buildFridgeCoverageFactoryReferenceProjectionV1({
    rootDir: ROOT,
    filterSlugs: [...REFERENCE_SLUGS],
  });

  const subjectIds = projection.subjects.map((subject) => subject.subject_id);
  assert.equal(subjectIds.length, new Set(subjectIds).size);
});

test("refrigerator disposition meaning preserved for committed reference slugs", () => {
  const projection = buildFridgeCoverageFactoryReferenceProjectionV1({
    rootDir: ROOT,
    filterSlugs: [...REFERENCE_SLUGS],
  });

  const bySlug = new Map(
    projection.subjects.map((subject, index) => [
      subject.internal_slug_labels[0],
      {
        assessment: projection.assessments[index],
        loaded: loadFridgeArtifactsForFilterSlugV1(ROOT, subject.internal_slug_labels[0]),
      },
    ]),
  );

  const expected: Record<string, string> = {
    edr4rxd1: "APPLY_READY_AFTER_OWNER_BROWSER_PROOF",
    gswf: "CONFLICT_REQUIRES_RECONCILIATION",
    rpwfe: "RESCUE_BROWSER_PROOF_READY_MAPPING_BLOCKED",
    adq36006101: "AUDIT_WRONG_PART_RISK",
    edr2rxd1: "BUYER_PATH_SEARCH_PLACEHOLDER_PENDING",
  };

  for (const slug of REFERENCE_SLUGS) {
    const row = bySlug.get(slug);
    assert.ok(row, `missing projection for ${slug}`);
    const disposition = resolveFridgeDispositionV1(row.loaded);
    assert.equal(disposition, expected[slug], slug);
    assert.ok(
      fridgeCoverageDispositionMeaningPreservedV1({
        fridgeDisposition: disposition,
        assessment: row.assessment,
      }),
    );
  }
});

test("rpwfe scope split: rescue buyer-path proven with mapping fit blocked", () => {
  const loaded = loadFridgeArtifactsForFilterSlugV1(ROOT, "rpwfe");
  const disposition = resolveFridgeDispositionV1(loaded);
  assert.equal(disposition, "RESCUE_BROWSER_PROOF_READY_MAPPING_BLOCKED");

  const mapping = mapFridgeDispositionToUcfV1(disposition);
  assert.equal(mapping.core_disposition, "mapping_review");
  assert.equal(mapping.adapter_state, "RESCUE_BROWSER_PROOF_READY_MAPPING_BLOCKED");

  const projection = buildFridgeCoverageFactoryReferenceProjectionV1({
    rootDir: ROOT,
    filterSlugs: ["rpwfe"],
  });
  const assessment = projection.assessments[0]!;
  const evidence = projection.evidence[0]!;
  const work = projection.work_items[0]!;

  assert.equal(assessment.core_disposition, "mapping_review");
  assert.equal(assessment.adapter_state, "RESCUE_BROWSER_PROOF_READY_MAPPING_BLOCKED");
  assert.equal(evidence.claims.identity.status, "proven");
  assert.equal(evidence.claims.buyer_path.status, "proven");
  assert.equal(evidence.claims.fit.status, "blocked");
  assert.equal(work.permitted_action_class, "MAPPING_REVIEW");
  assert.notEqual(work.permitted_action_class, "PLAN_CHANGE");
});

test("promotion gates respected when buyer_path is not proven", () => {
  const projection = buildFridgeCoverageFactoryReferenceProjectionV1({
    rootDir: ROOT,
    filterSlugs: [...REFERENCE_SLUGS],
  });

  for (const assessment of projection.assessments) {
    const evidence = projection.evidence.find((row) => row.subject_id === assessment.subject_id);
    assert.ok(evidence);

    if (evidence.claims.buyer_path.status !== "proven") {
      assert.equal(coverageEvidenceMeetsPromotionRequirementsV1({ evidence }), false);
      if (assessment.core_disposition === "ready_for_change_planning") {
        assert.equal(coverageAssessmentPromotionAllowedV1({ assessment, evidence }), false);
        assert.equal(validateCoverageAssessmentWithEvidenceV1({ assessment, evidence }), false);
      }
    }
  }

  const adq = projection.evidence.find((row) => row.subject_id.includes("adq36006101"));
  assert.ok(adq);
  assert.equal(adq.claims.fit.status, "blocked");
});

test("refrigerator projection report and contract fit assessment", () => {
  const projection = buildFridgeCoverageFactoryReferenceProjectionV1({
    rootDir: ROOT,
    filterSlugs: [...REFERENCE_SLUGS],
  });
  const report = buildFridgeProjectionReportV1(projection, ROOT);
  assert.equal(report.length, REFERENCE_SLUGS.length);

  const edr4 = report.find((row) => row.filter_slug === "edr4rxd1");
  assert.ok(edr4);
  assert.equal(edr4.fridge_disposition, "APPLY_READY_AFTER_OWNER_BROWSER_PROOF");
  assert.equal(edr4.ucf_core_disposition, "ready_for_change_planning");
  assert.equal(edr4.evidence_dimensions.buyer_path, "proven");
  assert.equal(edr4.policy_apply_allowed, false);

  const adq = report.find((row) => row.filter_slug === "adq36006101");
  assert.ok(adq);
  assert.equal(adq.fridge_disposition, "AUDIT_WRONG_PART_RISK");
  assert.equal(adq.ucf_core_disposition, "suppressed");

  const gaps = assessFridgeContractFitV1();
  assert.equal(gaps.some((gap) => gap.kind === "PROVEN_CONTRACT_GAP"), false);
  assert.equal(coverageFactoryContractsGrantProductionMutationAuthorityV1(), false);
});

test("refrigerator legacy disposition map validates and maps all lane labels", () => {
  assert.ok(validateCoverageLegacyMapV1(FRIDGE_COVERAGE_LEGACY_MAP_V1));
  for (const label of FRIDGE_COVERAGE_DISPOSITIONS_V1) {
    const mapped = mapFridgeDispositionToUcfV1(label);
    const row = FRIDGE_COVERAGE_DISPOSITION_MAPPING_TABLE_V1.find(
      (entry) => entry.fridge_disposition === label,
    );
    assert.ok(row);
    assert.equal(mapped.core_disposition, row.core_disposition);
    assert.equal(mapped.adapter_state, row.adapter_state);
  }
});
