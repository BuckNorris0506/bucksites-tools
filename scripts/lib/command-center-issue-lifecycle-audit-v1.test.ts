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

test("seeded issues on origin/main evidence-prove DEPLOYED not VALIDATED", () => {
  const loaded = loadCommandCenterIssuesV1({ rootDir: ROOT });
  const audit = buildCommandCenterIssueLifecycleAuditV1({
    issues: loaded.issues,
    rootDir: ROOT,
  });
  assert.equal(audit.lifecycle_distribution.aligned_count, 4);
  assert.equal(audit.lifecycle_distribution.overstated_count, 0);
  assert.equal(audit.lifecycle_distribution.understated_count, 0);
  for (const id of SEEDED_IDS) {
    const row = audit.rows.find((r) => r.issue_id === id);
    assert.ok(row, `missing audit row for ${id}`);
    assert.equal(row!.evidence_proven_max_status, "DEPLOYED");
    assert.equal(row!.recommended_status, "DEPLOYED");
    assert.equal(row!.status_alignment, "ALIGNED");
    assert.equal(row!.lifecycle_evidence.repair_commit_proven, true);
    assert.equal(row!.lifecycle_evidence.pushed_to_origin_proven, true);
    assert.equal(row!.lifecycle_evidence.deployed_proven, true);
    assert.equal(row!.lifecycle_evidence.re_audit_proven, false);
    assert.equal(row!.lifecycle_evidence.closure_proven, false);
  }
});

test("lifecycle distribution surfaces declared DEPLOYED counts", () => {
  const lane = buildCommandCenterIssueRegistryCommandCenterLaneV1({ rootDir: ROOT });
  assert.deepEqual(lane.lifecycle_distribution.declared_by_status.DEPLOYED, 4);
  assert.deepEqual(lane.lifecycle_distribution.evidence_proven_max_by_status.DEPLOYED, 4);
  assert.equal(lane.lifecycle_distribution.aligned_count, 4);
});

test("DEPLOYED TIER_0 issues do not steer next_best_action", () => {
  const lane = buildCommandCenterIssueRegistryCommandCenterLaneV1({ rootDir: ROOT });
  assert.equal(lane.steering_override_active, false);
  assert.equal(lane.highest_priority_steering_eligible_issue, null);
  assert.equal(resolveCommandCenterIssueRegistrySteeringOverrideV1(lane), null);
});

