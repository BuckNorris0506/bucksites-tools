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
  validateCoverageAssessmentV1,
  validateCoverageAssessmentWithEvidenceV1,
  validateCoverageEvidenceV1,
  validateCoverageLegacyMapV1,
  validateCoverageRunManifestV1,
  validateCoverageSubjectLinkV1,
  validateCoverageSubjectV1,
  validateCoverageWorkItemV1,
  WHW_COVERAGE_FACTORY_ADAPTER_ID_V1,
} from "../index";

import {
  WHW_COVERAGE_DISPOSITION_MAPPING_TABLE_V1,
  WHW_COVERAGE_DISPOSITIONS_V1,
  WHW_COVERAGE_LEGACY_MAP_V1,
  assessWhwContractFitV1,
  buildWhwCoverageFactoryReferenceProjectionV1,
  buildWhwProjectionReportV1,
  mapWhwDispositionToUcfV1,
  resolveWhwDispositionV1,
  whwCoverageDispositionMeaningPreservedV1,
  loadWhwArtifactsForFilterSlugV1,
} from "./whw-coverage-factory-adapter-v1";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");

const REFERENCE_SLUGS =
  COMMITTED_UCF_ADAPTER_REFERENCE_FILTER_SLUGS_V1[WHW_COVERAGE_FACTORY_ADAPTER_ID_V1];

test("WHW reference projection validates all UCF contract rows", () => {
  const projection = buildWhwCoverageFactoryReferenceProjectionV1({
    rootDir: ROOT,
    filterSlugs: [...REFERENCE_SLUGS],
    now: () => new Date("2026-06-10T18:00:00.000Z"),
  });

  assert.equal(projection.read_only, true);
  assert.equal(projection.data_mutation, false);
  assert.ok(validateCoverageLegacyMapV1(WHW_COVERAGE_LEGACY_MAP_V1));
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

test("no subject ID collisions across WHW reference projection", () => {
  const projection = buildWhwCoverageFactoryReferenceProjectionV1({
    rootDir: ROOT,
    filterSlugs: [...REFERENCE_SLUGS],
  });

  const subjectIds = projection.subjects.map((subject) => subject.subject_id);
  assert.equal(subjectIds.length, new Set(subjectIds).size);
});

test("WHW disposition meaning preserved for committed reference slugs", () => {
  const projection = buildWhwCoverageFactoryReferenceProjectionV1({
    rootDir: ROOT,
    filterSlugs: [...REFERENCE_SLUGS],
  });

  const bySlug = new Map(
    projection.subjects.map((subject, index) => [
      subject.internal_slug_labels[0],
      {
        assessment: projection.assessments[index],
        loaded: loadWhwArtifactsForFilterSlugV1(ROOT, subject.internal_slug_labels[0]),
      },
    ]),
  );

  const ap810 = bySlug.get("3m-ap810");
  const ap811 = bySlug.get("3m-ap811");
  const fxhtc = bySlug.get("ge-fxhtc");
  assert.ok(ap810 && ap811 && fxhtc);

  const ap810Disposition = resolveWhwDispositionV1(ap810.loaded);
  const ap811Disposition = resolveWhwDispositionV1(ap811.loaded);
  const fxhtcDisposition = resolveWhwDispositionV1(fxhtc.loaded);

  assert.equal(ap810Disposition, "APPLY_READY_FOUNDER_APPROVAL_REQUIRED");
  assert.equal(ap811Disposition, "APPLY_READY_FOUNDER_APPROVAL_REQUIRED");
  assert.equal(fxhtcDisposition, "BLOCKED");

  assert.ok(
    whwCoverageDispositionMeaningPreservedV1({
      whwDisposition: ap810Disposition,
      assessment: ap810.assessment,
    }),
  );
  assert.ok(
    whwCoverageDispositionMeaningPreservedV1({
      whwDisposition: ap811Disposition,
      assessment: ap811.assessment,
    }),
  );
  assert.ok(
    whwCoverageDispositionMeaningPreservedV1({
      whwDisposition: fxhtcDisposition,
      assessment: fxhtc.assessment,
    }),
  );
});

test("promotion gates respected when buyer_path is not proven", () => {
  const projection = buildWhwCoverageFactoryReferenceProjectionV1({
    rootDir: ROOT,
    filterSlugs: [...REFERENCE_SLUGS],
  });

  for (const assessment of projection.assessments) {
    const evidence = projection.evidence.find((row) => row.subject_id === assessment.subject_id);
    assert.ok(evidence);

    if (evidence.claims.buyer_path.status !== "proven") {
      assert.equal(coverageEvidenceMeetsPromotionRequirementsV1({ evidence }), false);
      if (assessment.core_disposition === "ready_for_change_planning") {
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

  const fxhtcEvidence = projection.evidence.find((row) =>
    row.subject_id.includes("ge-fxhtc"),
  );
  assert.ok(fxhtcEvidence);
  assert.equal(fxhtcEvidence.claims.buyer_path.status, "unknown");
  assert.equal(fxhtcEvidence.claims.fit.status, "blocked");
});

test("WHW projection report and contract fit assessment", () => {
  const projection = buildWhwCoverageFactoryReferenceProjectionV1({
    rootDir: ROOT,
    filterSlugs: [...REFERENCE_SLUGS],
  });
  const report = buildWhwProjectionReportV1(projection, ROOT);
  assert.equal(report.length, REFERENCE_SLUGS.length);

  const ap810 = report.find((row) => row.filter_slug === "3m-ap810");
  assert.ok(ap810);
  assert.equal(ap810.whw_disposition, "APPLY_READY_FOUNDER_APPROVAL_REQUIRED");
  assert.equal(ap810.ucf_core_disposition, "ready_for_change_planning");
  assert.equal(ap810.evidence_dimensions.buyer_path, "proven");

  const fxhtc = report.find((row) => row.filter_slug === "ge-fxhtc");
  assert.ok(fxhtc);
  assert.equal(fxhtc.whw_disposition, "BLOCKED");
  assert.equal(fxhtc.ucf_core_disposition, "suppressed");

  const gaps = assessWhwContractFitV1();
  assert.equal(
    gaps.some((gap) => gap.kind === "PROVEN_CONTRACT_GAP"),
    false,
  );
  assert.equal(coverageFactoryContractsGrantProductionMutationAuthorityV1(), false);
});

test("WHW legacy disposition map validates and maps all lane labels", () => {
  assert.ok(validateCoverageLegacyMapV1(WHW_COVERAGE_LEGACY_MAP_V1));
  for (const label of WHW_COVERAGE_DISPOSITIONS_V1) {
    const mapped = mapWhwDispositionToUcfV1(label);
    const row = WHW_COVERAGE_DISPOSITION_MAPPING_TABLE_V1.find(
      (entry) => entry.whw_disposition === label,
    );
    assert.ok(row);
    assert.equal(mapped.core_disposition, row.core_disposition);
    assert.equal(mapped.adapter_state, row.adapter_state);
  }
});
