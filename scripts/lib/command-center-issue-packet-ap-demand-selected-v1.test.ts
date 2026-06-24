import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { buildCommandCenterIssueRegistryCommandCenterLaneV1 } from "./command-center-issue-registry-command-center-v1";
import {
  loadCommandCenterIssuesV1,
  parseCommandCenterIssueRecordV1,
  type CommandCenterIssueStatusV1,
} from "./command-center-issue-registry-v1";
import { resolveCommandCenterIssueRegistrySteeringOverrideV1 } from "./command-center-issue-registry-steering-v1";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

test("BP-000005 and BP-000006 issue_packet_v1 parse with required planning fields", () => {
  const expectedStatus: Record<"BP-000005" | "BP-000006", CommandCenterIssueStatusV1> = {
    "BP-000005": "CLOSED_PROVEN",
    "BP-000006": "CLOSED_PROVEN",
  };
  for (const issueId of ["BP-000005", "BP-000006"] as const) {
    const abs = path.join(ROOT, "data/command-center/issues", `${issueId}.json`);
    const raw = JSON.parse(readFileSync(abs, "utf8")) as unknown;
    const parsed = parseCommandCenterIssueRecordV1(
      raw,
      `data/command-center/issues/${issueId}.json`,
    );
    assert.equal(parsed.parse_errors.length, 0, parsed.parse_errors.join("; "));
    assert.ok(parsed.issue);
    assert.equal(parsed.issue!.status, expectedStatus[issueId]);
    assert.equal(parsed.issue!.severity, "TIER_1");
    const packet = parsed.issue!.issue_packet_v1;
    assert.ok(packet);
    assert.equal(packet!.contract, "command_center_issue_packet_v1");
    assert.equal(packet!.read_only, true);
    assert.ok(packet!.measurable_blocker.length > 0);
    assert.ok(packet!.stalled_lane_contract.length > 0);
    assert.ok(packet!.closure_criteria.length >= 4);
    assert.ok(packet!.affected_artifacts.length >= 5);
    assert.ok(packet!.affected_queues.length >= 4);
    assert.ok(packet!.owner_review_implications.length >= 3);
    assert.ok(packet!.future_batch_scope_rules.length >= 4);
  }
});

test("open TIER_1 AP catalog issues do not steer issue registry NBA", () => {
  const lane = buildCommandCenterIssueRegistryCommandCenterLaneV1({ rootDir: ROOT });
  const bp5 = lane.issues.find((issue) => issue.issue_id === "BP-000005");
  const bp6 = lane.issues.find((issue) => issue.issue_id === "BP-000006");
  assert.equal(bp5?.status, "CLOSED_PROVEN");
  assert.equal(bp6?.status, "CLOSED_PROVEN");
  assert.ok(bp5?.issue_packet_v1);
  assert.ok(bp6?.issue_packet_v1);
  assert.equal(bp5?.issue_packet_v1?.filter_slug, "vornado-md1-0023");
  assert.equal(bp6?.issue_packet_v1?.filter_slug, "renpho-rp-ap003");
  assert.equal(lane.steering_override_active, false);
  assert.equal(lane.highest_priority_steering_eligible_issue, null);
  assert.equal(resolveCommandCenterIssueRegistrySteeringOverrideV1(lane), null);
});

test("registry loads six issues with all CLOSED_PROVEN", () => {
  const loaded = loadCommandCenterIssuesV1({ rootDir: ROOT });
  assert.equal(loaded.issues.length, 6);
  assert.equal(
    loaded.issues.filter((issue) => issue.status === "CLOSED_PROVEN").length,
    6,
  );
  assert.equal(
    loaded.issues.filter((issue) => issue.status === "PACKET_READY").length,
    0,
  );
});
