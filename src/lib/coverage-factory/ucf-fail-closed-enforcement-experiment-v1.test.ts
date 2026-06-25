import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { HOMEKEEP_WEDGE_CATALOG } from "@/lib/catalog/identity";

import { resetFridgeAdapterAuditCacheV1 } from "./adapters/fridge-coverage-factory-adapter-v1";
import {
  buildUcfFailClosedEnforcementExperimentReportV1,
  classifyUcfFailClosedEnforcementVerdictV1,
  isSuppressedSubjectSystemBlockedV1,
  selectUcfFailClosedExperimentSuppressedSubjectsV1,
  simulateSuppressedSubjectMutationAttemptsV1,
  ucfFailClosedEnforcementExperimentGrantsMutationAuthorityV1,
  UCF_FAIL_CLOSED_ENFORCEMENT_EXPERIMENT_CONTRACT_V1,
} from "./ucf-fail-closed-enforcement-experiment-v1";
import { buildUniversalCoverageFactoryV1 } from "./universal-coverage-factory-v1";
import { buildUniversalCoverageFactoryDecisionLayerV1 } from "./universal-coverage-factory-decision-layer-v1";
import { buildUniversalCoverageFactoryWorkGeneratorV1 } from "./universal-coverage-factory-work-generator-v1";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const FIXED_NOW = () => new Date("2026-06-10T22:00:00.000Z");

test.before(() => {
  resetFridgeAdapterAuditCacheV1();
});

test("fail-closed experiment report is read-only and non-mutating", () => {
  const report = buildUcfFailClosedEnforcementExperimentReportV1({
    rootDir: ROOT,
    now: FIXED_NOW,
  });

  assert.equal(report.contract, UCF_FAIL_CLOSED_ENFORCEMENT_EXPERIMENT_CONTRACT_V1);
  assert.equal(report.read_only, true);
  assert.equal(report.data_mutation, false);
  assert.equal(report.mutation_authorized, false);
  assert.equal(ucfFailClosedEnforcementExperimentGrantsMutationAuthorityV1(), false);
});

test("suppressed subject selection is deterministic with one subject per wedge", () => {
  const factory = buildUniversalCoverageFactoryV1({ rootDir: ROOT, now: FIXED_NOW });
  const first = selectUcfFailClosedExperimentSuppressedSubjectsV1(factory);
  const second = selectUcfFailClosedExperimentSuppressedSubjectsV1(factory);

  assert.deepEqual(
    first.map((row) => row.subject_id),
    second.map((row) => row.subject_id),
  );
  assert.equal(first.length, 3);
  assert.equal(
    first.find((row) => row.wedge === HOMEKEEP_WEDGE_CATALOG.air_purifier)?.subject_id,
    "air_purifier:filter:blueair-f2-211",
  );
  assert.equal(
    first.find((row) => row.wedge === HOMEKEEP_WEDGE_CATALOG.whole_house_water)?.subject_id,
    "whole_house_water:filter:ge-fxhtc",
  );
  assert.equal(
    first.find((row) => row.wedge === HOMEKEEP_WEDGE_CATALOG.refrigerator_water)?.subject_id,
    "refrigerator_water:filter:4396842",
  );
});

test("suppressed subjects cannot produce apply or planning work items", () => {
  const report = buildUcfFailClosedEnforcementExperimentReportV1({
    rootDir: ROOT,
    now: FIXED_NOW,
  });

  for (const row of report.subject_results) {
    assert.equal(row.baseline.disposition, "suppressed");
    assert.equal(row.baseline.policy_apply_allowed, false);
    assert.equal(row.baseline.has_candidate_work_item, false);
    assert.equal(row.baseline.has_generated_work_item, false);
    assert.equal(row.baseline.work_item_class, null);

    const planAttempt = row.mutation_attempts.find(
      (attempt) => attempt.attempt_kind === "request_plan_change_work_item",
    );
    assert.ok(planAttempt);
    assert.equal(planAttempt.system_response, "omitted");
    assert.equal(planAttempt.enforced_without_manual_review, true);
  }
});

test("invalid mutation attempts fail closed without manual review", () => {
  const factory = buildUniversalCoverageFactoryV1({ rootDir: ROOT, now: FIXED_NOW });
  const decision = buildUniversalCoverageFactoryDecisionLayerV1(factory);
  const workGenerator = buildUniversalCoverageFactoryWorkGeneratorV1(decision);
  const suppressed = selectUcfFailClosedExperimentSuppressedSubjectsV1(factory)[0]!;

  const attempts = simulateSuppressedSubjectMutationAttemptsV1({
    subject_id: suppressed.subject_id,
    row: suppressed,
    factory,
    decision,
    workGenerator,
  });

  assert.ok(isSuppressedSubjectSystemBlockedV1(attempts));
  for (const attempt of attempts) {
    assert.notEqual(attempt.system_response, "leaked");
    assert.equal(attempt.enforced_without_manual_review, true);
  }

  const injectAttempt = attempts.find(
    (attempt) => attempt.attempt_kind === "inject_decision_layer_candidate_work_item",
  );
  assert.ok(injectAttempt);
  assert.equal(injectAttempt.system_response, "rejected");
});

test("full fail-closed experiment enforces architecture across committed wedges", () => {
  const report = buildUcfFailClosedEnforcementExperimentReportV1({
    rootDir: ROOT,
    now: FIXED_NOW,
  });

  assert.equal(report.subject_results.length, 3);
  assert.equal(report.system_blocked_count, 3);
  assert.equal(report.system_leaked_count, 0);
  assert.equal(report.verdict, "FAIL_CLOSED_ENFORCED");
  assert.equal(
    classifyUcfFailClosedEnforcementVerdictV1(report.subject_results),
    "FAIL_CLOSED_ENFORCED",
  );

  for (const row of report.subject_results) {
    assert.equal(row.system_blocked, true);
    assert.ok(row.baseline.decision_truth_blocker_codes.includes("SUPPRESSED_ADAPTER_STATE"));
    assert.ok(row.baseline.decision_truth_blocker_codes.includes("DECISION_LAYER_NO_APPLY_AUTHORITY"));
  }
});

test("fail-closed experiment is deterministic for fixed clock", () => {
  const first = buildUcfFailClosedEnforcementExperimentReportV1({
    rootDir: ROOT,
    now: FIXED_NOW,
  });
  const second = buildUcfFailClosedEnforcementExperimentReportV1({
    rootDir: ROOT,
    now: FIXED_NOW,
  });

  assert.deepEqual(first.selected_subject_ids, second.selected_subject_ids);
  assert.equal(first.verdict, second.verdict);
  assert.deepEqual(first.system_blocked_count, second.system_blocked_count);
});
