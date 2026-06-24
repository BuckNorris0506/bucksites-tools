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
  validateCoverageSubjectV1,
  validateCoverageWorkItemV1,
} from "../index";

import {
  APPLIANCE_AIR_COVERAGE_LEGACY_MAP_V1,
  assessApplianceAirContractFitV1,
  buildApplianceAirCoverageFactoryReferenceProjectionV1,
  buildApplianceAirProjectionReportV1,
  loadApplianceAirArtifactsForSubjectSlugV1,
  resolveApplianceAirDispositionV1,
} from "./appliance-air-coverage-factory-adapter-v1";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");

const REFERENCE_SLUGS = ["range-gf10", "range-rmv1"] as const;

test("appliance_air reference projection validates all UCF contract rows", () => {
  const projection = buildApplianceAirCoverageFactoryReferenceProjectionV1({
    rootDir: ROOT,
    subjectSlugs: [...REFERENCE_SLUGS],
    now: () => new Date("2026-06-10T22:00:00.000Z"),
  });

  assert.equal(projection.subjects.length, 2);
  assert.ok(validateCoverageLegacyMapV1(APPLIANCE_AIR_COVERAGE_LEGACY_MAP_V1));
  assert.ok(validateCoverageRunManifestV1(projection.run_manifest));

  for (const subject of projection.subjects) {
    assert.ok(validateCoverageSubjectV1(subject));
    assert.equal(subject.wedge, "appliance_air");
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
});

test("appliance_air projection report shows zero proven contract gaps", () => {
  const projection = buildApplianceAirCoverageFactoryReferenceProjectionV1({
    rootDir: ROOT,
    subjectSlugs: [...REFERENCE_SLUGS],
  });
  const report = buildApplianceAirProjectionReportV1(projection, ROOT);
  const gaps = assessApplianceAirContractFitV1();

  assert.equal(report.length, 2);
  assert.equal(gaps.filter((gap) => gap.kind === "PROVEN_CONTRACT_GAP").length, 0);

  const modelLoaded = loadApplianceAirArtifactsForSubjectSlugV1(ROOT, "range-rmv1");
  assert.equal(resolveApplianceAirDispositionV1(modelLoaded), "SAMPLE_MODEL_DEMO_INVENTORY");
});
