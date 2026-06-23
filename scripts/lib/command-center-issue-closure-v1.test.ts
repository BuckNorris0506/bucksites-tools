import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { evaluateIssueClosedProvenEligibilityV1 } from "./command-center-issue-closure-v1";
import { auditCommandCenterIssueLifecycleV1 } from "./command-center-issue-lifecycle-audit-v1";
import { loadCommandCenterIssuesV1 } from "./command-center-issue-registry-v1";
import { buildCommandCenterIssueRegistryCommandCenterLaneV1 } from "./command-center-issue-registry-command-center-v1";
import { resolveCommandCenterIssueRegistrySteeringOverrideV1 } from "./command-center-issue-registry-steering-v1";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

test("BP-000001 is CLOSED_PROVEN eligible with full closure chain", () => {
  const issue = loadCommandCenterIssuesV1({ rootDir: ROOT }).issues.find(
    (row) => row.issue_id === "BP-000001",
  )!;
  const audit = auditCommandCenterIssueLifecycleV1({ issue, rootDir: ROOT });
  assert.equal(audit.evidence_proven_max_status, "CLOSED_PROVEN");
  assert.equal(audit.lifecycle_evidence.closure_proven, true);
  assert.equal(audit.closed_proven_eligibility_v1.eligible, true);
  assert.equal(audit.closed_proven_eligibility_v1.evidence_proven_closed, true);
  assert.equal(audit.closed_proven_eligibility_v1.missing_requirements.length, 0);
});

test("DEPLOYED issue without closure metadata is not CLOSED_PROVEN eligible", () => {
  const issue = {
    issue_id: "BP-FIXTURE-DEPLOYED",
    title: "Fixture deployed issue",
    issue_type: "test_issue",
    severity: "TIER_1" as const,
    source_system: "test",
    detected_at: "2026-06-10T00:00:00.000Z",
    status: "DEPLOYED" as const,
    assigned_to: "test",
    affected_routes: ["/fridge/[slug]"],
    evidence_files: ["src/lib/fridge/fridge-model-pdp-customer-safety-v1.ts"],
    repair_commit: "0b07da1",
    deploy_commit: null,
    closed_at: null,
    re_audit_outcome: null,
    closure_reason: null,
    closure_evidence: [],
    closure_approved: false,
    proven_facts: [],
    inferred_facts: [],
    unknown_facts: [],
  };
  const audit = auditCommandCenterIssueLifecycleV1({ issue, rootDir: ROOT });
  assert.equal(audit.evidence_proven_max_status, "DEPLOYED");
  assert.equal(audit.closed_proven_eligibility_v1.eligible, false);
  assert.ok(audit.closed_proven_eligibility_v1.missing_requirements.length > 0);
});

test("CLOSED_PROVEN issues excluded from steering; TIER_1 catalog issues remain open", () => {
  const lane = buildCommandCenterIssueRegistryCommandCenterLaneV1({ rootDir: ROOT });
  assert.equal(lane.total_open, 2);
  assert.equal(lane.total_closed, 4);
  assert.ok(lane.issues.some((row) => row.issue_id === "BP-000001"));
  assert.ok(lane.issues.some((row) => row.issue_id === "BP-000005"));
  assert.equal(resolveCommandCenterIssueRegistrySteeringOverrideV1(lane), null);
});
