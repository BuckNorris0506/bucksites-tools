import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { resetFridgeAdapterAuditCacheV1 } from "./adapters/fridge-coverage-factory-adapter-v1";
import {
  buildUcfDecisionAuthoritySnapshotV1,
  resolveUcfCoverageDispositionForRegisteredSlugV1,
} from "./ucf-decision-authority-cutover-v1";
import {
  assertUcfReplacementSimulationPassedV1,
  buildUcfReplacementProofReportV1,
  runUcfReplacementSimulationV1,
  UCF_LEGACY_COVERAGE_DECISION_SOURCES_V1,
  UCF_REPLACEMENT_PROOF_CONTRACT_V1,
} from "./ucf-replacement-proof-v1";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const FIXED_NOW = () => new Date("2026-06-10T22:00:00.000Z");

test.before(() => {
  resetFridgeAdapterAuditCacheV1();
});

test("legacy coverage-decision source inventory is complete", () => {
  const ids = UCF_LEGACY_COVERAGE_DECISION_SOURCES_V1.map((source) => source.source_id);
  assert.ok(ids.includes("large_batch_coverage_factory_state_classifier_v1"));
  assert.ok(ids.includes("ap_adapter_disposition_resolution_v1"));
  assert.ok(ids.includes("ucf_parity_audit_adapter_shadow_v1"));
  assert.equal(new Set(ids).size, ids.length);
});

test("replacement simulation proves identical disposition for all registered subjects", () => {
  const simulation = runUcfReplacementSimulationV1({ rootDir: ROOT, now: FIXED_NOW });
  assert.equal(simulation.registered_subject_count, 60);
  assert.equal(simulation.subjects_compared, 60);
  assertUcfReplacementSimulationPassedV1(simulation);

  const dispositionDeltas = simulation.behavior_deltas.filter(
    (delta) => delta.dimension === "core_disposition",
  );
  assert.equal(dispositionDeltas.length, 0);
});

test("replacement simulation proves identical work generation and suppression", () => {
  const simulation = runUcfReplacementSimulationV1({ rootDir: ROOT, now: FIXED_NOW });

  const suppressionDeltas = simulation.behavior_deltas.filter(
    (delta) => delta.dimension === "suppression_work_item",
  );
  assert.equal(suppressionDeltas.length, 0);

  const workDeltas = simulation.behavior_deltas.filter(
    (delta) => delta.dimension === "adapter_work_item_action_class",
  );
  assert.equal(workDeltas.length, 0);

  const snapshot = buildUcfDecisionAuthoritySnapshotV1({ rootDir: ROOT, now: FIXED_NOW });
  for (const subjectId of snapshot.decision_layer.suppressed_subjects) {
    const hasWork = snapshot.work_generator.work_items.some((item) =>
      item.subject_ids.includes(subjectId),
    );
    assert.equal(hasWork, false, `suppressed subject ${subjectId} must not generate work`);
  }
});

test("replacement simulation proves identical planning and suppressed cohort membership", () => {
  const simulation = runUcfReplacementSimulationV1({ rootDir: ROOT, now: FIXED_NOW });

  const planningDeltas = simulation.behavior_deltas.filter(
    (delta) =>
      delta.dimension === "planning_cohort_membership" ||
      delta.dimension === "suppressed_cohort_membership",
  );
  assert.equal(planningDeltas.length, 0);

  const snapshot = buildUcfDecisionAuthoritySnapshotV1({ rootDir: ROOT, now: FIXED_NOW });
  for (const row of snapshot.factory.subject_rows) {
    const inPlanning = snapshot.decision_layer.ready_for_change_planning_subjects.includes(
      row.subject_id,
    );
    assert.equal(inPlanning, row.disposition === "ready_for_change_planning");
    const inSuppressed = snapshot.decision_layer.suppressed_subjects.includes(row.subject_id);
    assert.equal(inSuppressed, row.disposition === "suppressed");
  }
});

test("replacement simulation proves identical evidence summary and provenance stability", () => {
  const first = buildUcfDecisionAuthoritySnapshotV1({ rootDir: ROOT, now: FIXED_NOW });
  const second = buildUcfDecisionAuthoritySnapshotV1({ rootDir: ROOT, now: FIXED_NOW });
  assert.equal(
    first.factory.run_manifest.provenance_index_hash,
    second.factory.run_manifest.provenance_index_hash,
  );

  const simulation = runUcfReplacementSimulationV1({ rootDir: ROOT, now: FIXED_NOW });
  const evidenceDeltas = simulation.behavior_deltas.filter(
    (delta) => delta.dimension === "evidence_summary",
  );
  assert.equal(evidenceDeltas.length, 0);
});

test("fail-closed: replacement simulation rejects missing registered factory rows", () => {
  const snapshot = buildUcfDecisionAuthoritySnapshotV1({ rootDir: ROOT, now: FIXED_NOW });
  const row = resolveUcfCoverageDispositionForRegisteredSlugV1({
    snapshot,
    filterSlug: "rpwfe",
    wedge: "refrigerator_water",
  });
  assert.ok(row);

  const tampered = {
    ...snapshot,
    factory: {
      ...snapshot.factory,
      subject_rows: snapshot.factory.subject_rows.filter((r) => r.subject_id !== row!.subject_id),
    },
  };
  const simulation = runUcfReplacementSimulationV1({
    rootDir: ROOT,
    now: FIXED_NOW,
    snapshot: tampered,
  });
  assert.equal(simulation.simulation_passed, false);
  assert.ok(simulation.critical_delta_count > 0);
  assert.throws(() => assertUcfReplacementSimulationPassedV1(simulation), /fail closed/i);
});

test("replacement proof report lists matrix, blockers, and deletion posture", () => {
  const report = buildUcfReplacementProofReportV1({ rootDir: ROOT, now: FIXED_NOW });

  assert.equal(report.contract, UCF_REPLACEMENT_PROOF_CONTRACT_V1);
  assert.equal(report.read_only, true);
  assert.equal(report.mutation_authorized, false);
  assert.equal(report.simulation.simulation_passed, true);
  assert.equal(report.simulation.subjects_compared, 60);
  assert.ok(report.replacement_ready_components.length >= 5);
  assert.ok(
    report.replacement_matrix.some(
      (row) => row.legacy_component === "large_batch_coverage_factory_state_classifier_v1" && !row.can_replace_today,
    ),
  );
  assert.equal(report.can_delete_legacy_today, false);
  assert.ok(report.delete_blockers.length >= 3);
  assert.ok(report.goat_c1_dependencies.includes("large_batch_coverage_factory_v1"));
  assert.equal(report.can_replace_existing_decision_logic_today, true);
  assert.equal(report.safe_to_commit_verdict, "SAFE_TO_COMMIT");
});
