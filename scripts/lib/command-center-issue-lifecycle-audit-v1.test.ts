import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { buildCommandCenterIssueRegistryCommandCenterLaneV1 } from "./command-center-issue-registry-command-center-v1";
import {
  buildCommandCenterIssueLifecycleAuditV1,
  runSeededIssueValidationTestsV1,
} from "./command-center-issue-lifecycle-audit-v1";
import { loadCommandCenterIssuesV1 } from "./command-center-issue-registry-v1";
import { resolveCommandCenterIssueRegistrySteeringOverrideV1 } from "./command-center-issue-registry-steering-v1";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

const SEEDED_IDS = ["BP-000001", "BP-000002", "BP-000003", "BP-000004"] as const;

test("seeded validation tests pass in this checkout", () => {
  assert.equal(runSeededIssueValidationTestsV1(ROOT), true);
});

test("seeded issues evidence-prove lifecycle through CLOSED_PROVEN for BP-000001", () => {
  const loaded = loadCommandCenterIssuesV1({ rootDir: ROOT });
  const audit = buildCommandCenterIssueLifecycleAuditV1({
    issues: loaded.issues,
    rootDir: ROOT,
  });
  assert.equal(audit.lifecycle_distribution.aligned_count, 4);
  assert.equal(audit.lifecycle_distribution.overstated_count, 0);
  assert.equal(audit.lifecycle_distribution.understated_count, 0);

  const bp1 = audit.rows.find((r) => r.issue_id === "BP-000001");
  assert.ok(bp1);
  assert.equal(bp1!.evidence_proven_max_status, "CLOSED_PROVEN");
  assert.equal(bp1!.lifecycle_evidence.re_audit_outcome_recorded, true);
  assert.equal(bp1!.lifecycle_evidence.re_audit_pass_proven, true);
  assert.equal(bp1!.lifecycle_evidence.closure_proven, true);
  assert.equal(bp1!.closed_proven_eligibility_v1.eligible, true);

  for (const id of ["BP-000002", "BP-000003", "BP-000004"] as const) {
    const row = audit.rows.find((r) => r.issue_id === id);
    assert.ok(row, `missing audit row for ${id}`);
    assert.equal(row!.evidence_proven_max_status, "DEPLOYED");
    assert.equal(row!.lifecycle_evidence.re_audit_outcome_recorded, false);
    assert.equal(row!.lifecycle_evidence.re_audit_pass_proven, false);
    assert.equal(row!.lifecycle_evidence.closure_proven, false);
    assert.equal(row!.closed_proven_eligibility_v1.eligible, false);
  }
});

test("lifecycle distribution surfaces CLOSED_PROVEN and DEPLOYED counts", () => {
  const lane = buildCommandCenterIssueRegistryCommandCenterLaneV1({ rootDir: ROOT });
  assert.deepEqual(lane.lifecycle_distribution.declared_by_status.CLOSED_PROVEN, 1);
  assert.deepEqual(lane.lifecycle_distribution.declared_by_status.DEPLOYED, 3);
  assert.deepEqual(lane.lifecycle_distribution.evidence_proven_max_by_status.CLOSED_PROVEN, 1);
  assert.deepEqual(lane.lifecycle_distribution.evidence_proven_max_by_status.DEPLOYED, 3);
  assert.equal(lane.lifecycle_distribution.aligned_count, 4);
});

test("DEPLOYED TIER_0 issues do not steer next_best_action", () => {
  const lane = buildCommandCenterIssueRegistryCommandCenterLaneV1({ rootDir: ROOT });
  assert.equal(lane.steering_override_active, false);
  assert.equal(lane.highest_priority_steering_eligible_issue, null);
  assert.equal(resolveCommandCenterIssueRegistrySteeringOverrideV1(lane), null);
});

