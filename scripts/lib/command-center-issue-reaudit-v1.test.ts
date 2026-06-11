import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { buildCommandCenterIssueRegistryCommandCenterLaneV1 } from "./command-center-issue-registry-command-center-v1";
import {
  buildCommandCenterIssueReauditLaneV1,
  buildReauditCandidateV1,
  isIssueAwaitingReauditV1,
  selectTopReauditCandidateV1,
} from "./command-center-issue-reaudit-v1";
import { resolveCommandCenterIssueReauditSteeringOverrideV1 } from "./command-center-issue-reaudit-steering-v1";
import { resolveCommandCenterIssueRegistrySteeringOverrideV1 } from "./command-center-issue-registry-steering-v1";
import {
  loadCommandCenterIssuesV1,
  sortCommandCenterIssuesByPriorityV1,
  type CommandCenterIssueRecordV1,
} from "./command-center-issue-registry-v1";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function registryLane() {
  return buildCommandCenterIssueRegistryCommandCenterLaneV1({ rootDir: ROOT });
}

function fixtureIssue(
  partial: Partial<CommandCenterIssueRecordV1> & Pick<CommandCenterIssueRecordV1, "issue_id" | "severity" | "detected_at" | "status">,
): CommandCenterIssueRecordV1 {
  return {
    title: partial.title ?? partial.issue_id,
    issue_type: partial.issue_type ?? "test_issue",
    source_system: partial.source_system ?? "test",
    assigned_to: partial.assigned_to ?? "test",
    affected_routes: partial.affected_routes ?? [],
    evidence_files: partial.evidence_files ?? [],
    repair_commit: partial.repair_commit ?? null,
    deploy_commit: partial.deploy_commit ?? null,
    closed_at: partial.closed_at ?? null,
    re_audit_outcome: partial.re_audit_outcome ?? null,
    proven_facts: partial.proven_facts ?? [],
    inferred_facts: partial.inferred_facts ?? [],
    unknown_facts: partial.unknown_facts ?? [],
    ...partial,
  };
}

test("deployed issue without re_audit_outcome becomes re-audit candidate", () => {
  const lane = buildCommandCenterIssueReauditLaneV1({
    rootDir: ROOT,
    issue_registry: registryLane(),
  });
  assert.equal(lane.total_deployed_awaiting_reaudit, 1);
  assert.equal(lane.candidates.length, 1);
  assert.ok(lane.candidates.every((c) => c.close_allowed === false));
  assert.ok(lane.candidates.every((c) => c.status === "DEPLOYED"));
  assert.ok(lane.candidates.every((c) => c.suggested_hyperagent_prompt.includes("BuckParts Issue Re-Audit v1")));
});

test("CLOSED_PROVEN issue excluded from re-audit candidates", () => {
  const issue = fixtureIssue({
    issue_id: "BP-CLOSED",
    severity: "TIER_0",
    detected_at: "2026-06-09T00:00:00.000Z",
    status: "CLOSED_PROVEN",
    closed_at: "2026-06-10T12:00:00.000Z",
    re_audit_outcome: "PASS",
  });
  assert.equal(
    isIssueAwaitingReauditV1({ issue, effectiveStatus: "CLOSED_PROVEN" }),
    false,
  );
});

test("oldest deployed issue selected as top_reaudit_candidate", () => {
  const lane = buildCommandCenterIssueReauditLaneV1({
    rootDir: ROOT,
    issue_registry: registryLane(),
  });
  assert.equal(lane.top_reaudit_candidate?.issue_id, "BP-000004");
  assert.equal(lane.top_reaudit_candidate?.severity, "TIER_1");

  const issues = loadCommandCenterIssuesV1({ rootDir: ROOT }).issues;
  const candidates = lane.candidates;
  const top = selectTopReauditCandidateV1(candidates, issues);
  assert.equal(top?.issue_id, "BP-000004");

  const deployedOpen = issues.filter(
    (i) => i.status === "DEPLOYED" && i.re_audit_outcome !== "PASS",
  );
  const sorted = sortCommandCenterIssuesByPriorityV1(deployedOpen);
  assert.equal(sorted[0]?.issue_id, "BP-000004");
});

test("live proof unavailable prevents close_allowed and flags requires_live_probe", () => {
  const issue = loadCommandCenterIssuesV1({ rootDir: ROOT }).issues.find(
    (row) => row.issue_id === "BP-000004",
  )!;
  const candidate = buildReauditCandidateV1({
    issue,
    effectiveStatus: "DEPLOYED",
    live_site_monitor_present: false,
    live_route_probe_available: false,
  });
  assert.equal(candidate.close_allowed, false);
  assert.equal(candidate.requires_live_probe, true);
  assert.match(candidate.reason_close_not_allowed, /read-only/i);
  assert.equal(candidate.reaudit_type, "REPO_GUARD_PROBE");
});

test("DEPLOYED issues do not steer repair NBA but re-audit steering activates", () => {
  const registry = registryLane();
  const reaudit = buildCommandCenterIssueReauditLaneV1({
    rootDir: ROOT,
    issue_registry: registry,
  });
  assert.equal(registry.steering_override_active, false);
  assert.equal(resolveCommandCenterIssueRegistrySteeringOverrideV1(registry), null);
  assert.equal(reaudit.total_deployed_awaiting_reaudit, 1);

  const steering = resolveCommandCenterIssueReauditSteeringOverrideV1(reaudit);
  assert.ok(steering);
  assert.match(steering!.next_best_action, /ISSUE RE-AUDIT: BP-000004/);
  assert.match(steering!.next_best_action, /re-audit/i);
  assert.match(steering!.why_this_action, /No steering-eligible repair issue/);
  assert.ok(reaudit.top_reaudit_candidate!.suggested_hyperagent_prompt.length > 200);
  assert.match(
    reaudit.top_reaudit_candidate!.suggested_hyperagent_prompt,
    /Do not mark CLOSED_PROVEN/,
  );
});
