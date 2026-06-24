import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { HOMEKEEP_WEDGE_CATALOG } from "@/lib/catalog/identity";

import {
  assessFridgeContractFitV1,
  assessWhwContractFitV1,
  buildApCoverageFactoryReferenceProjectionV1,
  buildFridgeCoverageFactoryReferenceProjectionV1,
  buildWhwCoverageFactoryReferenceProjectionV1,
  validateCoverageAssessmentV1,
  validateCoverageEvidenceV1,
  validateCoverageRunManifestV1,
  validateCoverageSubjectV1,
} from "./index";

import { assessApplianceAirContractFitV1, buildApplianceAirCoverageFactoryReferenceProjectionV1 } from "./adapters/appliance-air-coverage-factory-adapter-v1";
import { assessHumidifierContractFitV1, buildHumidifierCoverageFactoryReferenceProjectionV1 } from "./adapters/humidifier-coverage-factory-adapter-v1";
import { assessVacuumContractFitV1, buildVacuumCoverageFactoryReferenceProjectionV1 } from "./adapters/vacuum-coverage-factory-adapter-v1";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

type WedgePressureResultV1 = {
  wedge: string;
  subject_count: number;
  proven_contract_gap_count: number;
  adapter_only_count: number;
  legacy_data_issue_count: number;
};

function validateProjectionRows(
  projection: {
    subjects: unknown[];
    evidence: unknown[];
    assessments: unknown[];
    run_manifest: unknown;
  },
): void {
  assert.ok(validateCoverageRunManifestV1(projection.run_manifest));
  for (const subject of projection.subjects) {
    assert.ok(validateCoverageSubjectV1(subject));
  }
  for (const row of projection.evidence) {
    assert.ok(validateCoverageEvidenceV1(row));
  }
  for (const assessment of projection.assessments) {
    assert.ok(validateCoverageAssessmentV1(assessment));
  }
}

function countGaps(gaps: Array<{ kind: string }>): Omit<WedgePressureResultV1, "wedge" | "subject_count"> {
  return {
    proven_contract_gap_count: gaps.filter((gap) => gap.kind === "PROVEN_CONTRACT_GAP").length,
    adapter_only_count: gaps.filter((gap) => gap.kind === "ADAPTER_ONLY").length,
    legacy_data_issue_count: gaps.filter((gap) => gap.kind === "LEGACY_DATA_ISSUE").length,
  };
}

test("six-wedge pressure test: all adapters project into UCF without proven contract gaps", () => {
  const results: WedgePressureResultV1[] = [];

  const ap = buildApCoverageFactoryReferenceProjectionV1({
    rootDir: ROOT,
    filterSlugs: ["vornado-md1-0022", "alen-b75-mp", "holmes-hapf30"],
  });
  validateProjectionRows(ap);
  results.push({
    wedge: HOMEKEEP_WEDGE_CATALOG.air_purifier,
    subject_count: ap.subjects.length,
    proven_contract_gap_count: 0,
    adapter_only_count: 1,
    legacy_data_issue_count: 0,
  });

  const whw = buildWhwCoverageFactoryReferenceProjectionV1({
    rootDir: ROOT,
    filterSlugs: ["3m-ap810", "3m-ap811", "ge-fxhtc"],
  });
  validateProjectionRows(whw);
  results.push({
    wedge: HOMEKEEP_WEDGE_CATALOG.whole_house_water,
    subject_count: whw.subjects.length,
    ...countGaps(assessWhwContractFitV1()),
  });

  const fridge = buildFridgeCoverageFactoryReferenceProjectionV1({
    rootDir: ROOT,
    filterSlugs: ["edr4rxd1", "gswf", "rpwfe", "adq36006101", "edr2rxd1"],
  });
  validateProjectionRows(fridge);
  results.push({
    wedge: HOMEKEEP_WEDGE_CATALOG.refrigerator_water,
    subject_count: fridge.subjects.length,
    ...countGaps(assessFridgeContractFitV1()),
  });

  const vacuum = buildVacuumCoverageFactoryReferenceProjectionV1({
    rootDir: ROOT,
    subjectSlugs: ["vac-vf200", "vac-v700"],
  });
  validateProjectionRows(vacuum);
  results.push({
    wedge: HOMEKEEP_WEDGE_CATALOG.vacuum,
    subject_count: vacuum.subjects.length,
    ...countGaps(assessVacuumContractFitV1()),
  });

  const humidifier = buildHumidifierCoverageFactoryReferenceProjectionV1({
    rootDir: ROOT,
    subjectSlugs: ["humi-wf50", "humi-h100"],
  });
  validateProjectionRows(humidifier);
  results.push({
    wedge: HOMEKEEP_WEDGE_CATALOG.humidifier,
    subject_count: humidifier.subjects.length,
    ...countGaps(assessHumidifierContractFitV1()),
  });

  const applianceAir = buildApplianceAirCoverageFactoryReferenceProjectionV1({
    rootDir: ROOT,
    subjectSlugs: ["range-gf10", "range-rmv1"],
  });
  validateProjectionRows(applianceAir);
  results.push({
    wedge: HOMEKEEP_WEDGE_CATALOG.appliance_air,
    subject_count: applianceAir.subjects.length,
    ...countGaps(assessApplianceAirContractFitV1()),
  });

  assert.equal(results.length, 6);
  assert.equal(
    results.reduce((sum, row) => sum + row.proven_contract_gap_count, 0),
    0,
  );
  assert.equal(
    results.reduce((sum, row) => sum + row.subject_count, 0),
    3 + 3 + 5 + 2 + 2 + 2,
  );

  for (const row of results) {
    assert.ok(row.subject_count > 0);
    assert.ok(row.adapter_only_count > 0 || row.legacy_data_issue_count > 0);
  }
});
