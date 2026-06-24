import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  COVERAGE_EVIDENCE_DIMENSIONS_V1,
  validateCoverageAssessmentV1,
  validateCoverageEvidenceV1,
  validateCoverageLegacyMapV1,
  validateCoverageRunManifestV1,
  validateCoverageSubjectLinkV1,
  validateCoverageSubjectV1,
  validateCoverageWorkItemV1,
} from "../index";

import {
  VACUUM_COVERAGE_LEGACY_MAP_V1,
  assessVacuumContractFitV1,
  buildVacuumCoverageFactoryReferenceProjectionV1,
  buildVacuumProjectionReportV1,
  mapVacuumDispositionToUcfV1,
  resolveVacuumDispositionV1,
  vacuumCoverageDispositionMeaningPreservedV1,
  loadVacuumArtifactsForSubjectSlugV1,
} from "./vacuum-coverage-factory-adapter-v1";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");

const REFERENCE_SLUGS = ["vac-vf200", "vac-v700"] as const;

test("vacuum reference projection validates all UCF contract rows", () => {
  const projection = buildVacuumCoverageFactoryReferenceProjectionV1({
    rootDir: ROOT,
    subjectSlugs: [...REFERENCE_SLUGS],
    now: () => new Date("2026-06-10T22:00:00.000Z"),
  });

  assert.equal(projection.read_only, true);
  assert.equal(projection.data_mutation, false);
  assert.ok(validateCoverageLegacyMapV1(VACUUM_COVERAGE_LEGACY_MAP_V1));
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
    assert.equal(assessment.policy_apply_allowed, false);
  }
  for (const workItem of projection.work_items) {
    assert.ok(validateCoverageWorkItemV1(workItem));
  }
  for (const link of projection.subject_links) {
    assert.ok(validateCoverageSubjectLinkV1(link));
  }
});

test("vacuum disposition meaning preserved for sample reference slugs", () => {
  const projection = buildVacuumCoverageFactoryReferenceProjectionV1({
    rootDir: ROOT,
    subjectSlugs: [...REFERENCE_SLUGS],
  });

  const bySlug = new Map(
    projection.subjects.map((subject, index) => [
      subject.internal_slug_labels[0],
      { assessment: projection.assessments[index], subject },
    ]),
  );

  const filter = bySlug.get("vac-vf200");
  const model = bySlug.get("vac-v700");
  assert.ok(filter && model);

  const filterLoaded = loadVacuumArtifactsForSubjectSlugV1(ROOT, "vac-vf200");
  const filterDisposition = resolveVacuumDispositionV1(filterLoaded);
  assert.ok(
    vacuumCoverageDispositionMeaningPreservedV1({
      vacuumDisposition: filterDisposition,
      assessment: filter.assessment!,
    }),
  );
  assert.equal(filter.assessment?.core_disposition, "research_buyer_path");

  const modelLoaded = loadVacuumArtifactsForSubjectSlugV1(ROOT, "vac-v700");
  const modelDisposition = resolveVacuumDispositionV1(modelLoaded);
  assert.equal(modelDisposition, "SAMPLE_MODEL_DEMO_INVENTORY");
  assert.equal(model.assessment?.core_disposition, "research_fit");
});

test("vacuum projection report and contract fit assessment", () => {
  const projection = buildVacuumCoverageFactoryReferenceProjectionV1({
    rootDir: ROOT,
    subjectSlugs: [...REFERENCE_SLUGS],
  });
  const report = buildVacuumProjectionReportV1(projection, ROOT);
  const gaps = assessVacuumContractFitV1();

  assert.equal(report.length, 2);
  assert.equal(gaps.filter((gap) => gap.kind === "PROVEN_CONTRACT_GAP").length, 0);
  assert.ok(gaps.some((gap) => gap.topic === "sample_csv_only_inventory"));
  assert.ok(gaps.some((gap) => gap.topic === "wedge_posture_snapshot"));

  for (const row of report) {
    const mapped = mapVacuumDispositionToUcfV1(row.vacuum_disposition);
    assert.equal(row.ucf_core_disposition, mapped.core_disposition);
    assert.equal(row.policy_apply_allowed, false);
  }
});
