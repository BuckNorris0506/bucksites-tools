import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { HOMEKEEP_WEDGE_CATALOG } from "@/lib/catalog/identity";

import {
  coverageFactoryContractsGrantProductionMutationAuthorityV1,
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

function buildFixturePair() {
  const factory = buildUniversalCoverageFactoryV1({ rootDir: ROOT, now: FIXED_NOW });
  const decision = buildUniversalCoverageFactoryDecisionLayerV1(factory);
  return { factory, decision };
}

test("decision layer validates and aggregates AP + WHW + Fridge factory output", () => {
  const { factory, decision } = buildFixturePair();

  assert.ok(validateUniversalCoverageFactoryDecisionLayerV1(decision));
  assert.equal(decision.contract, "universal_coverage_factory_decision_layer_v1");
  assert.equal(decision.candidate_work_items.length, 11);
  assert.equal(decision.suppressed_subjects.length, factory.factory_totals.total_suppressed);
  assert.equal(
    decision.ready_for_change_planning_subjects.length,
    factory.factory_totals.total_ready_for_change_planning,
  );
  assert.equal(decision.source_provenance_index_hash, factory.run_manifest.provenance_index_hash);
});

test("highest priority follows mapping_review > owner_review > research > planning > suppressed", () => {
  const { factory, decision } = buildFixturePair();

  assert.equal(decision.highest_priority_wedge, HOMEKEEP_WEDGE_CATALOG.refrigerator_water);
  assert.equal(decision.highest_priority_subject, "refrigerator_water:filter:gswf");

  const gswf = factory.batch_heads.find((row) => row.subject_id.includes("gswf"));
  assert.ok(gswf);
  assert.equal(gswf.disposition, "mapping_review");
});

test("subject cohort lists reconcile and are deterministic", () => {
  const first = buildFixturePair().decision;
  const second = buildFixturePair().decision;

  assert.deepEqual(first.suppressed_subjects, second.suppressed_subjects);
  assert.deepEqual(first.research_required_subjects, second.research_required_subjects);
  assert.deepEqual(first.ready_for_change_planning_subjects, second.ready_for_change_planning_subjects);
  assert.deepEqual(first.highest_priority_subject, second.highest_priority_subject);

  for (const list of [
    first.suppressed_subjects,
    first.research_required_subjects,
    first.ready_for_change_planning_subjects,
  ]) {
    assert.deepEqual(list, [...list].sort((a, b) => a.localeCompare(b)));
  }
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

test("safe_coverage_gain_estimate counts planning-only ready subjects", () => {
  const { factory, decision } = buildFixturePair();

  const expected = decision.ready_for_change_planning_subjects.filter((subjectId) => {
    const head = factory.batch_heads.find((row) => row.subject_id === subjectId);
    return head?.policy_apply_allowed === false;
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
