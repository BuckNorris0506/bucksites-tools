import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { HOMEKEEP_WEDGE_CATALOG } from "@/lib/catalog/identity";

import {
  coverageFactoryContractsGrantProductionMutationAuthorityV1,
  UCF_SUBJECT_TRUTH_BLOCKER_PLANNING_READY_FIT_BLOCKED_V1,
  UCF_SUBJECT_TRUTH_BLOCKER_RESCUE_BUYER_PATH_MAPPING_BLOCKED_V1,
  validateCoverageWorkItemV1,
} from "./index";

import { buildUniversalCoverageFactoryV1 } from "./universal-coverage-factory-v1";
import {
  buildUniversalCoverageFactoryDecisionLayerV1,
  universalCoverageFactoryDecisionLayerGrantsMutationAuthorityV1,
  validateUniversalCoverageFactoryDecisionLayerV1,
} from "./universal-coverage-factory-decision-layer-v1";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const FIXED_NOW = () => new Date("2026-06-10T22:00:00.000Z");

const DECISION_DISPOSITION_PRIORITY_V1 = {
  mapping_review: 1,
  owner_review: 2,
  research_buyer_path: 3,
  research_identity: 3,
  research_fit: 3,
  ready_for_change_planning: 4,
  suppressed: 5,
  candidate_apply: 6,
  covered: 7,
} as const;

function expectedHighestPrioritySubjectId(
  rows: ReturnType<typeof buildUniversalCoverageFactoryV1>["subject_rows"],
): string {
  const ordered = [...rows].sort((left, right) => {
    const priorityCompare =
      DECISION_DISPOSITION_PRIORITY_V1[left.disposition] -
      DECISION_DISPOSITION_PRIORITY_V1[right.disposition];
    if (priorityCompare !== 0) return priorityCompare;
    const wedgeCompare = left.wedge.localeCompare(right.wedge);
    if (wedgeCompare !== 0) return wedgeCompare;
    return left.subject_id.localeCompare(right.subject_id);
  });
  return ordered[0]!.subject_id;
}

function buildFixturePair() {
  const factory = buildUniversalCoverageFactoryV1({ rootDir: ROOT, now: FIXED_NOW });
  const decision = buildUniversalCoverageFactoryDecisionLayerV1(factory);
  return { factory, decision };
}

test("decision layer validates and aggregates AP + WHW + Fridge factory output", () => {
  const { factory, decision } = buildFixturePair();
  const activeSubjectCount =
    factory.subject_rows.length - factory.factory_totals.total_suppressed;

  assert.ok(validateUniversalCoverageFactoryDecisionLayerV1(decision));
  assert.equal(decision.contract, "universal_coverage_factory_decision_layer_v1");
  assert.equal(decision.subject_rows.length, factory.subject_rows.length);
  assert.equal(decision.candidate_work_items.length, activeSubjectCount);
  assert.equal(decision.suppressed_subjects.length, factory.factory_totals.total_suppressed);
  assert.equal(
    decision.ready_for_change_planning_subjects.length,
    factory.factory_totals.total_ready_for_change_planning,
  );
  assert.equal(decision.source_provenance_index_hash, factory.run_manifest.provenance_index_hash);
});

test("highest priority follows mapping_review > owner_review > research > planning > suppressed", () => {
  const { factory, decision } = buildFixturePair();
  const expectedHighest = expectedHighestPrioritySubjectId(factory.subject_rows);

  assert.equal(decision.highest_priority_wedge, HOMEKEEP_WEDGE_CATALOG.refrigerator_water);
  assert.equal(decision.highest_priority_subject, expectedHighest);

  const highestRow = factory.subject_rows.find((row) => row.subject_id === expectedHighest);
  assert.ok(highestRow);
  assert.equal(highestRow.disposition, "mapping_review");
});

test("subject cohort lists reconcile and are deterministic", () => {
  const first = buildFixturePair().decision;
  const second = buildFixturePair().decision;

  assert.deepEqual(first.suppressed_subjects, second.suppressed_subjects);
  assert.deepEqual(first.research_required_subjects, second.research_required_subjects);
  assert.deepEqual(first.research_buyer_path_subjects, second.research_buyer_path_subjects);
  assert.deepEqual(first.ready_for_change_planning_subjects, second.ready_for_change_planning_subjects);
  assert.deepEqual(first.highest_priority_subject, second.highest_priority_subject);

  for (const list of [
    first.suppressed_subjects,
    first.research_required_subjects,
    first.research_identity_subjects,
    first.research_fit_subjects,
    first.research_buyer_path_subjects,
    first.ready_for_change_planning_subjects,
  ]) {
    assert.deepEqual(list, [...list].sort((a, b) => a.localeCompare(b)));
  }

  assert.equal(
    first.research_required_subjects.length,
    first.research_identity_subjects.length +
      first.research_fit_subjects.length +
      first.research_buyer_path_subjects.length,
  );
});

test("no production mutation authority and never recommends apply", () => {
  const { decision } = buildFixturePair();

  assert.equal(decision.mutation_authorized, false);
  assert.equal(decision.production_mutation_authorized, false);
  assert.equal(universalCoverageFactoryDecisionLayerGrantsMutationAuthorityV1(), false);
  assert.equal(coverageFactoryContractsGrantProductionMutationAuthorityV1(), false);

  for (const workItem of decision.candidate_work_items) {
    assert.ok(validateCoverageWorkItemV1(workItem));
    assert.equal(workItem.artifact_write_authorized, false);
    assert.equal(workItem.mutation_authorized, false);
    assert.ok(
      workItem.blockers.some((blocker) => blocker.includes("DECISION_LAYER_NO_APPLY_AUTHORITY")),
    );
  }

  assert.ok(
    decision.truth_blockers.some((blocker) => blocker.code === "DECISION_LAYER_NO_APPLY_AUTHORITY"),
  );

  assert.ok(
    !decision.candidate_work_items.some((item) =>
      String(item.permitted_action_class).includes("APPLY"),
    ),
  );
});

test("suppressed subjects do not generate candidate work items", () => {
  const { decision } = buildFixturePair();

  for (const subjectId of decision.suppressed_subjects) {
    assert.ok(
      !decision.candidate_work_items.some((item) => item.subject_ids.includes(subjectId)),
    );
  }
});

test("evidence and blockers survive factory into decision layer", () => {
  const { factory, decision } = buildFixturePair();

  assert.deepEqual(
    decision.subject_rows.map((row) => row.subject_id),
    factory.subject_rows.map((row) => row.subject_id),
  );

  const rpwfe = decision.subject_rows.find((row) => row.subject_id.includes("rpwfe"));
  assert.ok(rpwfe);
  assert.equal(rpwfe.disposition, "mapping_review");
  assert.equal(rpwfe.evidence_summary.fit, "blocked");
  assert.ok(
    decision.truth_blockers.some(
      (blocker) =>
        blocker.subject_id === rpwfe.subject_id &&
        blocker.code === UCF_SUBJECT_TRUTH_BLOCKER_RESCUE_BUYER_PATH_MAPPING_BLOCKED_V1,
    ),
  );

  const rpwfeCandidate = decision.candidate_work_items.find((item) =>
    item.subject_ids[0]?.includes("rpwfe"),
  );
  assert.ok(rpwfeCandidate);
  assert.equal(rpwfeCandidate.permitted_action_class, "MAPPING_REVIEW");
  assert.equal(rpwfeCandidate.requires_owner_review, true);
  assert.ok(
    rpwfeCandidate.blockers.some((blocker) =>
      blocker.includes(UCF_SUBJECT_TRUTH_BLOCKER_RESCUE_BUYER_PATH_MAPPING_BLOCKED_V1),
    ),
  );
});

test("safe_coverage_gain_estimate counts planning-only ready subjects without fit contradiction", () => {
  const { factory, decision } = buildFixturePair();

  const expected = decision.ready_for_change_planning_subjects.filter((subjectId) => {
    const row = factory.subject_rows.find((entry) => entry.subject_id === subjectId);
    return (
      row?.policy_apply_allowed === false &&
      !row.truth_blockers.some(
        (blocker) => blocker.code === UCF_SUBJECT_TRUTH_BLOCKER_PLANNING_READY_FIT_BLOCKED_V1,
      )
    );
  }).length;

  assert.equal(decision.safe_coverage_gain_estimate, expected);
});

test("fail closed on invalid factory input", () => {
  assert.throws(
    () => buildUniversalCoverageFactoryDecisionLayerV1({} as never),
    /fail closed/,
  );

  const factory = buildUniversalCoverageFactoryV1({ rootDir: ROOT, now: FIXED_NOW });
  const tampered = {
    ...factory,
    mutation_authorized: true as const,
  };
  assert.throws(
    () => buildUniversalCoverageFactoryDecisionLayerV1(tampered),
    /fail closed/,
  );
});
