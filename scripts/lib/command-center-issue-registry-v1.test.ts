import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  buildCommandCenterIssueRegistryCommandCenterLaneV1,
} from "./command-center-issue-registry-command-center-v1";
import {
  compareCommandCenterIssueStatusOrderV1,
  compareCommandCenterIssuesByPriorityV1,
  isCommandCenterIssueClosedV1,
  isIssueRegistrySteeringEligibleV1,
  loadCommandCenterIssuesV1,
  selectHighestPriorityOpenIssueV1,
  selectHighestPrioritySteeringEligibleTier0IssueV1,
  sortCommandCenterIssuesByPriorityV1,
  type CommandCenterIssueRecordV1,
} from "./command-center-issue-registry-v1";
import {
  buildEffectiveIssueStatusMapV1,
  buildIssueRegistryNextBestActionV1,
  resolveCommandCenterIssueRegistrySteeringOverrideV1,
} from "./command-center-issue-registry-steering-v1";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

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
    closure_reason: partial.closure_reason ?? null,
    closure_evidence: partial.closure_evidence ?? [],
    closure_approved: partial.closure_approved ?? false,
    proven_facts: partial.proven_facts ?? [],
    inferred_facts: partial.inferred_facts ?? [],
    unknown_facts: partial.unknown_facts ?? [],
    ...partial,
  };
}

test("status lifecycle ordering is monotonic", () => {
  assert.ok(compareCommandCenterIssueStatusOrderV1("DISCOVERED", "PACKET_READY") < 0);
  assert.ok(compareCommandCenterIssueStatusOrderV1("DEPLOYED", "RE_AUDITED") < 0);
  assert.ok(compareCommandCenterIssueStatusOrderV1("RE_AUDITED", "CLOSED_PROVEN") < 0);
  assert.equal(compareCommandCenterIssueStatusOrderV1("CLOSED_PROVEN", "CLOSED_PROVEN"), 0);
});

test("severity ordering prefers TIER_0 before TIER_1", () => {
  const tier0 = fixtureIssue({
    issue_id: "BP-T0",
    severity: "TIER_0",
    detected_at: "2026-06-11T00:00:00.000Z",
    status: "DEPLOYED",
  });
  const tier1 = fixtureIssue({
    issue_id: "BP-T1",
    severity: "TIER_1",
    detected_at: "2026-06-10T00:00:00.000Z",
    status: "DEPLOYED",
  });
  const sorted = sortCommandCenterIssuesByPriorityV1([tier1, tier0]);
  assert.equal(sorted[0]!.issue_id, "BP-T0");
});

test("within severity oldest detected_at ranks first", () => {
  const older = fixtureIssue({
    issue_id: "BP-OLD",
    severity: "TIER_0",
    detected_at: "2026-06-10T10:00:00.000Z",
    status: "DISCOVERED",
  });
  const newer = fixtureIssue({
    issue_id: "BP-NEW",
    severity: "TIER_0",
    detected_at: "2026-06-10T20:00:00.000Z",
    status: "DISCOVERED",
  });
  assert.ok(compareCommandCenterIssuesByPriorityV1(older, newer) < 0);
});

test("closed issues are excluded from highest priority open selection", () => {
  const closed = fixtureIssue({
    issue_id: "BP-CLOSED",
    severity: "TIER_0",
    detected_at: "2026-06-09T00:00:00.000Z",
    status: "CLOSED_PROVEN",
    closed_at: "2026-06-10T12:00:00.000Z",
  });
  const open = fixtureIssue({
    issue_id: "BP-OPEN",
    severity: "TIER_1",
    detected_at: "2026-06-10T21:00:00.000Z",
    status: "DEPLOYED",
  });
  assert.equal(isCommandCenterIssueClosedV1(closed.status), true);
  assert.equal(selectHighestPriorityOpenIssueV1([closed, open])?.issue_id, "BP-OPEN");
});

test("DEPLOYED TIER_0 is not steering eligible; RE_AUDITED STILL_OPEN is", () => {
  assert.equal(
    isIssueRegistrySteeringEligibleV1({ status: "DEPLOYED", re_audit_outcome: null }),
    false,
  );
  assert.equal(
    isIssueRegistrySteeringEligibleV1({ status: "VALIDATED", re_audit_outcome: null }),
    true,
  );
  assert.equal(
    isIssueRegistrySteeringEligibleV1({
      status: "RE_AUDITED",
      re_audit_outcome: "STILL_OPEN",
    }),
    true,
  );
  assert.equal(
    isIssueRegistrySteeringEligibleV1({
      status: "RE_AUDITED",
      re_audit_outcome: "PASS",
    }),
    false,
  );
});

test("seeded registry loads two CLOSED_PROVEN and two DEPLOYED", () => {
  const loaded = loadCommandCenterIssuesV1({ rootDir: ROOT });
  assert.equal(loaded.issues_dir_exists, true);
  assert.equal(loaded.issues.length, 4);
  const bp1 = loaded.issues.find((issue) => issue.issue_id === "BP-000001");
  assert.equal(bp1?.status, "CLOSED_PROVEN");
  assert.equal(bp1?.closure_approved, true);
  const bp2 = loaded.issues.find((issue) => issue.issue_id === "BP-000002");
  assert.equal(bp2?.status, "CLOSED_PROVEN");
  assert.equal(
    loaded.issues.filter((issue) => issue.status === "DEPLOYED").length,
    2,
  );
});

test("VALIDATED effective status TIER_0 still steers next_best_action", () => {
  const issue = fixtureIssue({
    issue_id: "BP-PRE-DEPLOY",
    severity: "TIER_0",
    detected_at: "2026-06-10T00:00:00.000Z",
    status: "VALIDATED",
    title: "Pre-deploy repair",
  });
  const baseLane = buildCommandCenterIssueRegistryCommandCenterLaneV1({ rootDir: ROOT });
  const steeringLane = {
    ...baseLane,
    issues: [issue],
    lifecycle_audit_v1: {
      ...baseLane.lifecycle_audit_v1,
      rows: [
        {
          issue_id: issue.issue_id,
          declared_status: "VALIDATED",
          evidence_proven_max_status: "VALIDATED" as const,
          status_alignment: "ALIGNED" as const,
          lifecycle_evidence: {
            repair_commit_proven: true,
            validation_proven: false,
            pushed_to_origin_proven: false,
            deployed_proven: false,
            re_audit_outcome_recorded: false,
            re_audit_pass_proven: false,
            owner_closure_approved_proven: false,
            closure_metadata_proven: false,
            closure_proven: false,
          },
          gate_details: [],
          recommended_status: "VALIDATED" as const,
          validation_test_files: [],
          closed_proven_eligibility_v1: {
            contract: "command_center_issue_closure_v1",
            issue_id: issue.issue_id,
            eligible: false,
            declared_closed_proven: false,
            evidence_proven_closed: false,
            missing_requirements: ["re_audit_outcome PASS not recorded"],
            closure_reason: null,
            closure_evidence: [],
            closed_at: null,
            closure_approved: false,
          },
        },
      ],
    },
  };
  const steering = resolveCommandCenterIssueRegistrySteeringOverrideV1(steeringLane);
  assert.ok(steering);
  assert.equal(steering!.issue.issue_id, "BP-PRE-DEPLOY");
  assert.match(steering!.next_best_action, /VALIDATED/);
});

test("command center lane does not steer when seeded issues are DEPLOYED on origin", () => {
  const lane = buildCommandCenterIssueRegistryCommandCenterLaneV1({ rootDir: ROOT });
  assert.equal(lane.contract, "command_center_issue_registry_v1");
  assert.equal(lane.read_only, true);
  assert.equal(lane.data_mutation, false);
  assert.equal(lane.total_open, 2);
  assert.equal(lane.total_closed, 2);
  assert.deepEqual(lane.closed_proven_issue_ids, ["BP-000001", "BP-000002"]);
  assert.equal(lane.steering_override_active, false);
  assert.equal(lane.highest_priority_steering_eligible_issue, null);
  assert.equal(lane.highest_priority_issue?.issue_id, "BP-000003");
  assert.equal(lane.lifecycle_distribution.aligned_count, 4);
  assert.equal(lane.lifecycle_distribution.evidence_proven_max_by_status.CLOSED_PROVEN, 2);
  assert.equal(lane.lifecycle_distribution.evidence_proven_max_by_status.DEPLOYED, 2);
  assert.equal(resolveCommandCenterIssueRegistrySteeringOverrideV1(lane), null);

  const effective = buildEffectiveIssueStatusMapV1(lane.lifecycle_audit_v1.rows);
  assert.equal(
    selectHighestPrioritySteeringEligibleTier0IssueV1(lane.issues, effective),
    null,
  );
  assert.match(
    buildIssueRegistryNextBestActionV1(lane.highest_priority_issue!, "DEPLOYED"),
    /DEPLOYED/,
  );
});
