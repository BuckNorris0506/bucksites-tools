import assert from "node:assert/strict";
import test from "node:test";

import {
  buildBuckpartsExecutionLedgerCommandCenterLaneUnknownV1,
  buildBuckpartsExecutionLedgerCommandCenterLaneV1,
  BUCKPARTS_EXECUTION_LEDGER_CC_JQ_PATH_V1,
} from "./buckparts-execution-ledger-command-center-v1";
import {
  BUCKPARTS_EXECUTION_LEDGER_CONTRACT_V1,
  buildBuckpartsExecutionLedgerReportV1,
} from "./buckparts-execution-ledger-v1";
import {
  capabilityLookupV1,
  capabilityTimelineV1,
  executionHistoryV1,
  lastCompletedCapabilityV1,
} from "./buckparts-mcp-execution-ledger-v1";

const REPO_ROOT = process.cwd();

test("execution ledger indexes committed dispatch runs and batch closeouts", () => {
  const report = buildBuckpartsExecutionLedgerReportV1({
    rootDir: REPO_ROOT,
    now: () => new Date("2026-06-10T12:00:00.000Z"),
  });

  assert.equal(report.contract, BUCKPARTS_EXECUTION_LEDGER_CONTRACT_V1);
  assert.equal(report.read_only, true);
  assert.equal(report.data_mutation, false);
  assert.ok(report.entry_count > 0);
  assert.ok(report.entries.length > 0);
  assert.ok(report.source_paths_read.length > 0);

  const dispatchEntry = report.entries.find((entry) =>
    entry.operational_lane.startsWith("command_center_dispatch:"),
  );
  assert.ok(dispatchEntry);
  assert.notEqual(dispatchEntry!.commit_sha, "UNKNOWN");

  const fridgeCloseout = report.entries.find((entry) =>
    entry.operational_lane.includes("batch_closeout_learning"),
  );
  assert.ok(fridgeCloseout);
  assert.equal(fridgeCloseout!.pushed_to_origin, true);
});

test("execution ledger marks older lane entries superseded_by newer", () => {
  const report = buildBuckpartsExecutionLedgerReportV1({ rootDir: REPO_ROOT });
  const laneGroups = new Map<string, typeof report.entries>();
  for (const entry of report.entries) {
    const list = laneGroups.get(entry.operational_lane) ?? [];
    list.push(entry);
    laneGroups.set(entry.operational_lane, list);
  }

  for (const [, entries] of laneGroups) {
    if (entries.length < 2) continue;
    const sorted = [...entries].sort((a, b) =>
      b.completion_timestamp.localeCompare(a.completion_timestamp),
    );
    const newest = sorted[0]!;
    const older = sorted[1]!;
    assert.equal(newest.superseded_by, null);
    assert.equal(older.superseded_by, newest.entry_id);
  }
});

test("command center lane projects execution ledger read-only", () => {
  const lane = buildBuckpartsExecutionLedgerCommandCenterLaneV1({
    rootDir: REPO_ROOT,
    now: () => new Date("2026-06-10T12:00:00.000Z"),
  });

  assert.equal(lane.recommended_jq_path, BUCKPARTS_EXECUTION_LEDGER_CC_JQ_PATH_V1);
  assert.equal(lane.read_only, true);
  assert.equal(lane.data_mutation, false);
  assert.equal(lane.mutation_authorized, false);
  assert.equal(lane.coverage_unlocked, false);
  assert.ok(lane.entry_count > 0);
  assert.ok(lane.capability_timeline.length > 0);
  assert.ok(lane.last_completed_capability);
});

test("command center unknown lane preserves read-only contract", () => {
  const lane = buildBuckpartsExecutionLedgerCommandCenterLaneUnknownV1({
    generated_at: "2026-06-10T12:00:00.000Z",
    reason: "fixture failure",
  });

  assert.equal(lane.entry_count, 0);
  assert.equal(lane.last_completed_capability, null);
  assert.match(lane.recommended_next_action, /UNKNOWN/);
});

test("MCP execution ledger tools project history and lookup", () => {
  const deps = { rootDir: REPO_ROOT };

  const history = executionHistoryV1(deps, 3);
  assert.equal(history.read_only, true);
  assert.equal(history.truth_status, "PROVEN");
  assert.ok(history.entries.length <= 3);

  const last = lastCompletedCapabilityV1(deps);
  assert.equal(last.truth_status, "PROVEN");
  assert.ok(last.last_completed_capability);

  const timeline = capabilityTimelineV1(deps);
  assert.equal(timeline.truth_status, "PROVEN");
  assert.ok(timeline.capability_timeline.length > 0);

  const fridgeLookup = capabilityLookupV1(deps, "refrigerator_water");
  assert.equal(fridgeLookup.truth_status, "PROVEN");
  assert.ok(fridgeLookup.match_count > 0);

  const missing = capabilityLookupV1(deps, "definitely-not-a-real-capability-token");
  assert.equal(missing.truth_status, "UNKNOWN");
  assert.equal(missing.match_count, 0);
});
