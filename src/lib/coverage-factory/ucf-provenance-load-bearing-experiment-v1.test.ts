import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { HOMEKEEP_WEDGE_CATALOG } from "@/lib/catalog/identity";

import { resetFridgeAdapterAuditCacheV1 } from "./adapters/fridge-coverage-factory-adapter-v1";
import {
  buildUcfProvenanceLoadBearingExperimentReportV1,
  classifyUcfProvenanceExperimentVerdictV1,
  selectUcfProvenanceExperimentSubjectsV1,
  ucfProvenanceExperimentGrantsMutationAuthorityV1,
  UCF_PROVENANCE_LOAD_BEARING_EXPERIMENT_CONTRACT_V1,
} from "./ucf-provenance-load-bearing-experiment-v1";
import { buildUniversalCoverageFactoryV1 } from "./universal-coverage-factory-v1";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const FIXED_NOW = () => new Date("2026-06-10T22:00:00.000Z");

test.before(() => {
  resetFridgeAdapterAuditCacheV1();
});

test("provenance experiment report is read-only and non-mutating", () => {
  const report = buildUcfProvenanceLoadBearingExperimentReportV1({
    rootDir: ROOT,
    now: FIXED_NOW,
  });

  assert.equal(report.contract, UCF_PROVENANCE_LOAD_BEARING_EXPERIMENT_CONTRACT_V1);
  assert.equal(report.read_only, true);
  assert.equal(report.data_mutation, false);
  assert.equal(report.mutation_authorized, false);
  assert.equal(ucfProvenanceExperimentGrantsMutationAuthorityV1(), false);
});

test("subject selection is deterministic and picks one strong subject per wedge", () => {
  const factory = buildUniversalCoverageFactoryV1({ rootDir: ROOT, now: FIXED_NOW });
  const first = selectUcfProvenanceExperimentSubjectsV1(factory);
  const second = selectUcfProvenanceExperimentSubjectsV1(factory);

  assert.deepEqual(
    first.map((row) => row.subject_id),
    second.map((row) => row.subject_id),
  );
  assert.equal(first.length, 3);
  assert.deepEqual(
    first.map((row) => row.wedge).sort(),
    [
      HOMEKEEP_WEDGE_CATALOG.air_purifier,
      HOMEKEEP_WEDGE_CATALOG.refrigerator_water,
      HOMEKEEP_WEDGE_CATALOG.whole_house_water,
    ].sort(),
  );

  assert.equal(first.find((row) => row.wedge === HOMEKEEP_WEDGE_CATALOG.air_purifier)?.subject_id,
    "air_purifier:filter:alen-b75-mp",
  );
  assert.equal(first.find((row) => row.wedge === HOMEKEEP_WEDGE_CATALOG.whole_house_water)?.subject_id,
    "whole_house_water:filter:3m-ap810",
  );
  assert.equal(first.find((row) => row.wedge === HOMEKEEP_WEDGE_CATALOG.refrigerator_water)?.subject_id,
    "refrigerator_water:filter:edr4rxd1",
  );
});

test("strip provenance helper is in-memory only and does not mutate source evidence", () => {
  const report = buildUcfProvenanceLoadBearingExperimentReportV1({
    rootDir: ROOT,
    now: FIXED_NOW,
  });
  const fridge = report.subject_results.find(
    (row) => row.wedge === HOMEKEEP_WEDGE_CATALOG.refrigerator_water,
  );
  assert.ok(fridge);

  const factory = buildUniversalCoverageFactoryV1({ rootDir: ROOT, now: FIXED_NOW });
  const factoryRow = factory.subject_rows.find((row) => row.subject_id === fridge.subject_id);
  assert.ok(factoryRow);
  const baselineRefCount = factoryRow.provenance_summary.provenance_ref_count;
  assert.ok(baselineRefCount > 0);

  const reportAgain = buildUcfProvenanceLoadBearingExperimentReportV1({
    rootDir: ROOT,
    now: FIXED_NOW,
  });
  const factoryAgain = buildUniversalCoverageFactoryV1({ rootDir: ROOT, now: FIXED_NOW });
  const factoryRowAgain = factoryAgain.subject_rows.find((row) => row.subject_id === fridge.subject_id);
  assert.ok(factoryRowAgain);
  assert.equal(factoryRowAgain.provenance_summary.provenance_ref_count, baselineRefCount);
  assert.deepEqual(reportAgain.selected_subject_ids, report.selected_subject_ids);
});

test("strong committed subjects reject stripped provenance at evidence validation", () => {
  const report = buildUcfProvenanceLoadBearingExperimentReportV1({
    rootDir: ROOT,
    now: FIXED_NOW,
  });

  assert.equal(report.subject_results.length, 3);
  for (const row of report.subject_results) {
    assert.equal(row.baseline.provenance_summary.provenance_ref_count > 0, true);
    assert.equal(row.stripped.provenance_summary.provenance_ref_count, 0);
    assert.equal(row.stripped_evidence_valid, false);
    assert.equal(row.stripped_assessment_evidence_consistent, false);
    assert.equal(row.stripped_promotion_allowed, false);
    assert.equal(row.outcome, "rejects");
    assert.notEqual(row.stripped.disposition, row.baseline.disposition);
  }

  assert.equal(report.verdict, "PROVENANCE_LOAD_BEARING");
  assert.equal(
    classifyUcfProvenanceExperimentVerdictV1(report.subject_results),
    "PROVENANCE_LOAD_BEARING",
  );
});

test("full experiment report is deterministic for fixed clock", () => {
  const first = buildUcfProvenanceLoadBearingExperimentReportV1({
    rootDir: ROOT,
    now: FIXED_NOW,
  });
  const second = buildUcfProvenanceLoadBearingExperimentReportV1({
    rootDir: ROOT,
    now: FIXED_NOW,
  });

  assert.deepEqual(first.selected_subject_ids, second.selected_subject_ids);
  assert.deepEqual(first.outcome_counts, second.outcome_counts);
  assert.equal(first.verdict, second.verdict);
  for (let index = 0; index < first.subject_results.length; index += 1) {
    const left = first.subject_results[index]!;
    const right = second.subject_results[index]!;
    assert.equal(left.outcome, right.outcome);
    assert.equal(left.baseline.disposition, right.baseline.disposition);
    assert.equal(left.stripped.disposition, right.stripped.disposition);
  }
});

test("strip provenance leaves evidence invalid when proven claims lose refs", () => {
  const report = buildUcfProvenanceLoadBearingExperimentReportV1({
    rootDir: ROOT,
    now: FIXED_NOW,
  });
  const ap = report.subject_results.find(
    (row) => row.wedge === HOMEKEEP_WEDGE_CATALOG.air_purifier,
  );
  assert.ok(ap);
  assert.equal(ap.baseline.disposition, "ready_for_change_planning");
  assert.equal(ap.stripped.disposition, "research_identity");
  assert.equal(ap.stripped.work_item_class, "READ_ONLY_RESEARCH");
  assert.equal(ap.stripped.policy_apply_allowed, false);
});
