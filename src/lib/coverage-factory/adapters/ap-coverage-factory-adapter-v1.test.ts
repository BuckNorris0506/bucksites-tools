import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  COVERAGE_EVIDENCE_DIMENSIONS_V1,
  coverageAssessmentPromotionAllowedV1,
  coverageEvidenceMeetsPromotionRequirementsV1,
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
  AP_COVERAGE_DISPOSITION_MAPPING_TABLE_V1,
  AP_COVERAGE_LEGACY_MAP_V1,
  apCoverageDispositionMeaningPreservedV1,
  buildApCoverageFactoryReferenceProjectionV1,
  mapApDispositionToUcfV1,
  normalizeApDispositionV1,
  type ApModelFirstArtifactV1,
} from "./ap-coverage-factory-adapter-v1";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");

const REFERENCE_SLUGS = ["vornado-md1-0022", "alen-b75-mp", "holmes-hapf30"] as const;

test("AP reference projection validates all UCF contract rows", () => {
  const projection = buildApCoverageFactoryReferenceProjectionV1({
    rootDir: ROOT,
    filterSlugs: [...REFERENCE_SLUGS],
    now: () => new Date("2026-06-10T18:00:00.000Z"),
  });

  assert.equal(projection.read_only, true);
  assert.equal(projection.data_mutation, false);
  assert.ok(validateCoverageLegacyMapV1(AP_COVERAGE_LEGACY_MAP_V1));
  assert.ok(validateCoverageRunManifestV1(projection.run_manifest));

  for (const subject of projection.subjects) {
    assert.ok(validateCoverageSubjectV1(subject));
  }
  for (const row of projection.evidence) {
    assert.ok(validateCoverageEvidenceV1(row));
    assert.deepEqual(Object.keys(row.claims).sort(), [...COVERAGE_EVIDENCE_DIMENSIONS_V1].sort());
  }
  for (const assessment of projection.assessments) {
    assert.ok(validateCoverageAssessmentV1(assessment));
  }
  for (const workItem of projection.work_items) {
    assert.ok(validateCoverageWorkItemV1(workItem));
  }
  for (const link of projection.subject_links) {
    assert.ok(validateCoverageSubjectLinkV1(link));
  }
});

test("no subject ID collisions across reference projection", () => {
  const projection = buildApCoverageFactoryReferenceProjectionV1({
    rootDir: ROOT,
    filterSlugs: [...REFERENCE_SLUGS],
  });

  const subjectIds = projection.subjects.map((subject) => subject.subject_id);
  assert.equal(subjectIds.length, new Set(subjectIds).size);

  const allLinkedIds = projection.subject_links.flatMap((link) => [
    link.from_subject_id,
    link.to_subject_id,
  ]);
  for (const subjectId of allLinkedIds) {
    assert.ok(
      subjectIds.includes(subjectId) ||
        projection.subject_links.some((link) => link.from_subject_id === subjectId),
      `unexpected orphan link id ${subjectId}`,
    );
  }
});

test("AP disposition meaning is preserved in UCF assessments", () => {
  const projection = buildApCoverageFactoryReferenceProjectionV1({
    rootDir: ROOT,
    filterSlugs: [...REFERENCE_SLUGS],
  });

  const bySlug = new Map(
    projection.subjects.map((subject, index) => [
      subject.internal_slug_labels[0],
      projection.assessments[index],
    ]),
  );

  const alen = bySlug.get("alen-b75-mp");
  const holmes = bySlug.get("holmes-hapf30");
  const vornado = bySlug.get("vornado-md1-0022");
  assert.ok(alen && holmes && vornado);

  assert.ok(
    apCoverageDispositionMeaningPreservedV1({
      apDisposition: "SAFE_TO_PROGRESS",
      assessment: alen,
    }),
  );
  assert.ok(
    apCoverageDispositionMeaningPreservedV1({
      apDisposition: "EXCLUDE",
      assessment: holmes,
    }),
  );
  assert.ok(
    apCoverageDispositionMeaningPreservedV1({
      apDisposition: "HOLD",
      assessment: vornado,
    }),
  );

  assert.equal(alen.core_disposition, "ready_for_change_planning");
  assert.equal(alen.adapter_state, "SAFE_TO_PROGRESS");
  assert.equal(holmes.core_disposition, "suppressed");
  assert.equal(holmes.adapter_state, "EXCLUDE");
  assert.equal(vornado.core_disposition, "research_buyer_path");
  assert.equal(vornado.adapter_state, "HOLD");
});

test("no promotion when buyer_path is not proven", () => {
  const projection = buildApCoverageFactoryReferenceProjectionV1({
    rootDir: ROOT,
    filterSlugs: [...REFERENCE_SLUGS],
  });

  for (const assessment of projection.assessments) {
    const evidence = projection.evidence.find((row) => row.subject_id === assessment.subject_id);
    assert.ok(evidence);

    if (evidence.claims.buyer_path.status !== "proven") {
      assert.equal(
        coverageEvidenceMeetsPromotionRequirementsV1({ evidence }),
        false,
      );
      if (assessment.core_disposition === "ready_for_change_planning") {
        assert.equal(assessment.policy_apply_allowed, false);
        assert.equal(
          coverageAssessmentPromotionAllowedV1({ assessment, evidence }),
          false,
        );
        assert.equal(
          validateCoverageAssessmentWithEvidenceV1({ assessment, evidence }),
          false,
        );
      }
    }
  }

  const holmesEvidence = projection.evidence.find((row) =>
    row.subject_id.includes("holmes-hapf30"),
  );
  assert.ok(holmesEvidence);
  assert.equal(holmesEvidence.claims.buyer_path.status, "blocked");
});

test("disposition mapping table covers AP lane labels without mutation authority", () => {
  assert.equal(AP_COVERAGE_DISPOSITION_MAPPING_TABLE_V1.length, 4);

  for (const row of AP_COVERAGE_DISPOSITION_MAPPING_TABLE_V1) {
    const mapped = mapApDispositionToUcfV1(row.ap_disposition);
    assert.equal(mapped.core_disposition, row.core_disposition);
    assert.equal(mapped.adapter_state, row.adapter_state);
  }

  const sample: ApModelFirstArtifactV1 = {
    contract: "air_purifier_model_first_evidence_result_v1",
    packet_id: "test",
    run_id: "test",
    anchor_filter_slug: "x",
    read_only: true,
    data_mutation: false,
    generated_at: "2026-06-10T00:00:00.000Z",
    verdict: "NO_SAFE_PATH_FOUND",
  };
  assert.equal(normalizeApDispositionV1(sample), "NO_SAFE_PATH");
  assert.equal(mapApDispositionToUcfV1("NO_SAFE_PATH").core_disposition, "suppressed");
});
