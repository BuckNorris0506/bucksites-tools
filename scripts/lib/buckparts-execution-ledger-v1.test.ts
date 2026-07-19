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
  computeExecutionLedgerFreshnessV1,
  EXECUTION_LEDGER_STALE_AFTER_MS_V1,
  loadBuckpartsExecutionLedgerReportV1,
  refreshBuckpartsExecutionLedgerV1,
  resolveExecutionLedgerFreshnessV1,
} from "./buckparts-execution-ledger-v1";
import {
  capabilityLookupV1,
  capabilityTimelineV1,
  executionHistoryV1,
  executionLedgerStatusV1,
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
  assert.ok(report.freshness);
  assert.equal(report.freshness.source_artifact_count, report.source_paths_read.length);

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
  const loaded = loadBuckpartsExecutionLedgerReportV1({ rootDir: REPO_ROOT });
  assert.ok(loaded);
  const generatedMs = Date.parse(loaded!.generated_at);
  assert.ok(Number.isFinite(generatedMs));
  // now just after generated_at → FRESH; future timestamps score UNKNOWN, not FRESH.
  const lane = buildBuckpartsExecutionLedgerCommandCenterLaneV1({
    rootDir: REPO_ROOT,
    now: () => new Date(generatedMs + 60_000),
  });

  assert.equal(lane.recommended_jq_path, BUCKPARTS_EXECUTION_LEDGER_CC_JQ_PATH_V1);
  assert.equal(lane.read_only, true);
  assert.equal(lane.data_mutation, false);
  assert.equal(lane.mutation_authorized, false);
  assert.equal(lane.coverage_unlocked, false);
  assert.ok(lane.entry_count > 0);
  assert.ok(lane.capability_timeline.length > 0);
  assert.ok(lane.last_completed_capability);
  assert.equal(lane.freshness.freshness_status, "FRESH");
  assert.ok(lane.freshness.source_artifact_count > 0);
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

test("freshness marks ledger FRESH inside stale window and STALE after", () => {
  const generatedAt = "2026-06-10T12:00:00.000Z";
  const fresh = computeExecutionLedgerFreshnessV1({
    generated_at: generatedAt,
    source_artifact_count: 3,
    now: () => new Date("2026-06-10T18:00:00.000Z"),
    last_refresh_trigger_source: "test",
  });
  assert.equal(fresh.freshness_status, "FRESH");
  assert.equal(fresh.source_artifact_count, 3);

  const stale = computeExecutionLedgerFreshnessV1({
    generated_at: generatedAt,
    source_artifact_count: 3,
    now: () => new Date(Date.parse(generatedAt) + EXECUTION_LEDGER_STALE_AFTER_MS_V1 + 1),
    last_refresh_trigger_source: "test",
  });
  assert.equal(stale.freshness_status, "STALE");

  const future = computeExecutionLedgerFreshnessV1({
    generated_at: "2099-01-01T00:00:00.000Z",
    source_artifact_count: 1,
    now: () => new Date("2026-07-15T00:00:00.000Z"),
    last_refresh_trigger_source: "test",
  });
  assert.equal(future.freshness_status, "UNKNOWN");
});

test("refresh writes ledger artifact with trigger source provenance", () => {
  const { report, jsonRelPath } = refreshBuckpartsExecutionLedgerV1({
    rootDir: REPO_ROOT,
    trigger_source: "unit-test-refresh",
    now: () => new Date("2026-06-10T12:00:00.000Z"),
  });
  assert.equal(jsonRelPath, "data/command-center/execution-ledger-v1.json");
  assert.equal(report.freshness.last_refresh_trigger_source, "unit-test-refresh");
  assert.equal(
    resolveExecutionLedgerFreshnessV1(report, () => new Date("2026-06-10T12:00:00.000Z"))
      .freshness_status,
    "FRESH",
  );
});

test("MCP execution_ledger_status returns freshness without refreshing", () => {
  refreshBuckpartsExecutionLedgerV1({
    rootDir: REPO_ROOT,
    trigger_source: "unit-test-status",
    now: () => new Date("2026-06-10T12:00:00.000Z"),
  });
  const status = executionLedgerStatusV1({ rootDir: REPO_ROOT });
  assert.equal(status.read_only, true);
  assert.equal(status.truth_status, "PROVEN");
  assert.equal(status.freshness.last_refresh_trigger_source, "unit-test-status");
  assert.ok(status.provenance.entry_count > 0);
});
