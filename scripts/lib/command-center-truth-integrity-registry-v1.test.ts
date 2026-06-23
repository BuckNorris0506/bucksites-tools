import assert from "node:assert/strict";
import test from "node:test";

import { buildTruthIntegrityRegistryCommandCenterLaneV1 } from "./command-center-truth-integrity-registry-v1";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.join(path.dirname(fileURLToPath(import.meta.url)), "..", ".."));

test("truth_integrity_registry_v1 lane loads committed registry counts", () => {
  const lane = buildTruthIntegrityRegistryCommandCenterLaneV1({ rootDir: ROOT });
  assert.equal(lane.contract, "truth_integrity_registry_v1");
  assert.equal(lane.read_only, true);
  assert.equal(lane.data_mutation, false);
  assert.equal(lane.mutation_authorized, false);
  assert.equal(lane.steering_override_active, false);
  assert.equal(lane.registry_exists, true);
  assert.equal(lane.parse_errors.length, 0);
  assert.equal(lane.total_findings, 2);
  assert.equal(lane.truth_integrity_open_count, 0);
  assert.equal(lane.truth_integrity_shadowed_count, 1);
  assert.equal(lane.truth_integrity_measured_count, 1);
  assert.equal(lane.truth_integrity_fixed_count, 0);
  assert.equal(lane.high_severity_unfixed_count, 2);
  assert.ok(lane.top_truth_integrity_risk);
  assert.equal(lane.top_truth_integrity_risk?.finding_id, "TIR-2026-0002");
  assert.ok(lane.recommended_truth_integrity_next_action.length > 0);
});

test("truth_integrity_registry_v1 lane is unknown when registry file missing", () => {
  const lane = buildTruthIntegrityRegistryCommandCenterLaneV1({
    rootDir: ROOT,
    fileExists: () => false,
  });
  assert.equal(lane.total_findings, 0);
  assert.equal(lane.high_severity_unfixed_count, 0);
  assert.equal(lane.top_truth_integrity_risk, null);
  assert.ok(lane.unknown_facts.some((fact) => fact.includes("registry missing")));
});
