import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
  BUCKPARTS_MCP_CONTROL_PLANE_CONTRACT_V1,
  BUCKPARTS_COMMAND_CENTER_SNAPSHOT_JSON_REL_V1,
  MCP_SUPABASE_EXTRACTION_BLOCKED_LIVE_BUILD_V1,
  businessSnapshotV1,
  commandCenterSummaryV1,
  laneStatusV1,
  loadCommandCenterForMcpV1,
  nextBestActionV1,
  normalizeCommandCenterLaneNameV1,
  projectLaneStatusFromCommandCenterV1,
  projectNextBestActionFromCommandCenterV1,
  projectWorkQueueFromCommandCenterV1,
  workQueueV1,
} from "./buckparts-mcp-control-plane-v1";

function minimalCommandCenterReport(): Record<string, unknown> {
  return {
    report_name: "buckparts_command_center_v1",
    generated_at: "2026-06-10T12:00:00.000Z",
    read_only: true,
    data_mutation: false,
    system_health_summary: {
      status: "OK",
      reasons: [],
      recommended_next_step: "Continue read-only lane work.",
    },
    top_money_queue: [
      {
        lane: "amazon_rescue",
        exhausted: false,
        candidate_count: 3,
        source_report: "test",
        recommended_action: "Review amazon rescue queue",
      },
    ],
    blocked_link_summary: {
      recommended_first_action: "Fix OEM catalog search placeholders",
    },
    execution_guidance: {
      next_move_mode: "READ_ONLY",
      next_move_command: "npm run buckparts:command-center",
      mutating_blocked: true,
      mutating_block_reasons: ["Owner approval required for CSV apply"],
      staleness_or_dirty_risk: [],
    },
    next_best_action: "RESCUE [OWNER_REVIEW]: ultrawf guarded apply planning",
    why_this_action: "Manufacturer rescue runner holds READY_FOR_APPLY slot.",
    operator_can_be_away_status: "READY_FOR_ASYNC_REVIEW",
    rescue_velocity_summary: { runtime_status: "OK" },
    command_center_v2: {
      schema_version: "1",
      generated_at: "2026-06-10T12:00:00.000Z",
      read_only: true,
      data_mutation: false,
      operator_digest_v1: {
        contract: "operator_digest_v1",
        read_only: true,
        data_mutation: false,
        next_best_action: "RESCUE [OWNER_REVIEW]: ultrawf guarded apply planning",
        why_this_action: "Manufacturer rescue runner holds READY_FOR_APPLY slot.",
        execution_guidance: {
          next_move_mode: "READ_ONLY",
          next_move_command: "npm run buckparts:command-center",
          mutating_blocked: true,
          mutating_block_reasons: ["Owner approval required for CSV apply"],
          staleness_or_dirty_risk: [],
        },
        source: "buckparts_command_center_v1_root_digest",
      },
      demand_work_queue_summary_v1: {
        contract: "demand_work_queue_summary_v1",
        read_only: true,
        data_mutation: false,
        top_items: [
          {
            id: "demand-1",
            type: "START_NEW_DEMAND_SELECTED_BATCH",
            priority_rank: 1,
            authority_level: "OWNER",
            owner_or_agent: "owner",
            recommended_action: "Review AP demand-selected batch",
            scope: "air_purifier",
          },
        ],
      },
      agent_control_plane_v1: {
        eligible_jobs: [
          {
            job_id: "job-readonly-audit",
            agent_lane: "read_only_audit",
            exact_command: "npm run buckparts:audit",
          },
        ],
      },
      manufacturer_safe_link_rescue_runner_v1: {
        contract: "manufacturer_safe_link_rescue_runner_v1",
        ready_for_apply_slug: "ultrawf",
        execution_order: ["ultrawf", "wf3cb"],
        inspect_summary: { remaining_opportunity: 20 },
      },
      next_execution_packet_summary_v1: {
        next_packet_id: "packet-1",
        next_packet_title: "Founder packet — rescue review",
      },
      brain_integrity_gate_v1: {
        contract: "brain_integrity_gate_v1",
        runtime_status: "OK",
        lane_work_allowed: true,
        stop_the_line_entries: [],
      },
      amazon_rescue: {
        status: "ATTENTION",
        next_agent_action: "read-only audit",
        next_owner_action: "review",
        human_browser_required_tokens: [],
      },
      affiliate_readiness: {
        status: "OK",
        next_owner_action: "none",
        next_agent_action: "none",
      },
      deploy_live_site_status: {
        status: "OK",
        live_site_monitor: { runtime_status: "OK", routes: [{ ok: true }] },
      },
      unknown_or_human_review: {
        status: "OK",
        next_owner_action: "none",
        blocker: null,
      },
      next_owner_action: "Review rescue",
    },
  };
}

function assertReadOnlyEnvelope(result: {
  read_only: boolean;
  data_mutation: boolean;
  mutation_authorized: boolean;
  contract: string;
}) {
  assert.equal(result.contract, BUCKPARTS_MCP_CONTROL_PLANE_CONTRACT_V1);
  assert.equal(result.read_only, true);
  assert.equal(result.data_mutation, false);
  assert.equal(result.mutation_authorized, false);
}

test("normalizeCommandCenterLaneNameV1 resolves aliases and jq prefixes", () => {
  assert.equal(normalizeCommandCenterLaneNameV1("runner"), "manufacturer_safe_link_rescue_runner_v1");
  assert.equal(
    normalizeCommandCenterLaneNameV1(".command_center_v2.operator_digest_v1"),
    "operator_digest_v1",
  );
});

test("projectNextBestActionFromCommandCenterV1 surfaces root steering fields", () => {
  const projected = projectNextBestActionFromCommandCenterV1(minimalCommandCenterReport());
  assert.match(projected.action, /ultrawf/);
  assert.equal(projected.source_artifact, ".command_center_v2.operator_digest_v1");
  assert.ok(projected.blocking_prerequisites.length > 0);
  assert.match(projected.lane, /rescue|demand/i);
});

test("projectWorkQueueFromCommandCenterV1 ranks operational queues", () => {
  const items = projectWorkQueueFromCommandCenterV1(minimalCommandCenterReport());
  assert.ok(items.length >= 4);
  assert.equal(items[0].queue_id, "root_next_best_action");
  assert.ok(items.some((i) => i.lane === "demand_work_queue_summary_v1"));
  assert.ok(items.some((i) => i.lane === "manufacturer_safe_link_rescue_runner_v1"));
});

test("projectLaneStatusFromCommandCenterV1 returns lane payload", () => {
  const status = projectLaneStatusFromCommandCenterV1(
    minimalCommandCenterReport(),
    "manufacturer_safe_link_rescue_runner_v1",
  );
  assert.equal(status.found, true);
  assert.equal(status.lane_key, "manufacturer_safe_link_rescue_runner_v1");
  assert.equal(status.metrics.ready_for_apply_slug, "ultrawf");
});

test("command_center_summary uses injected report", async () => {
  const result = await commandCenterSummaryV1({
    rootDir: process.cwd(),
    loadReport: async () => minimalCommandCenterReport(),
  });
  assertReadOnlyEnvelope(result);
  assert.equal(result.tool, "command_center_summary");
  assert.equal(result.truth_status, "PROVEN");
  assert.match(result.next_best_action, /ultrawf/);
  assert.ok(result.operator_digest);
});

test("next_best_action MCP tool is read-only projection", async () => {
  const result = await nextBestActionV1({
    rootDir: process.cwd(),
    loadReport: async () => minimalCommandCenterReport(),
  });
  assertReadOnlyEnvelope(result);
  assert.equal(result.tool, "next_best_action");
  assert.equal(result.truth_status, "PROVEN");
  assert.ok(result.blocking_prerequisites.length > 0);
  assert.equal(result.source_artifact, ".command_center_v2.operator_digest_v1");
});

test("work_queue MCP tool includes demand and rescue lanes", async () => {
  const result = await workQueueV1({
    rootDir: process.cwd(),
    loadReport: async () => minimalCommandCenterReport(),
  });
  assertReadOnlyEnvelope(result);
  assert.equal(result.tool, "work_queue");
  assert.ok(result.queue_items.length >= 4);
  assert.equal(typeof result.founder_action_queue_row_count, "number");
});

test("lane_status MCP tool returns UNKNOWN for missing lane", async () => {
  const result = await laneStatusV1({
    rootDir: process.cwd(),
    lane_name: "not_a_real_lane_xyz",
    loadReport: async () => minimalCommandCenterReport(),
  });
  assertReadOnlyEnvelope(result);
  assert.equal(result.found, false);
  assert.equal(result.truth_status, "UNKNOWN");
});

test("business_snapshot combines coverage metrics and CC steering", async () => {
  const result = await businessSnapshotV1({
    rootDir: process.cwd(),
    loadReport: async () => minimalCommandCenterReport(),
  });
  assertReadOnlyEnvelope(result);
  assert.equal(result.tool, "business_snapshot");
  assert.ok(result.truth_status === "PARTIAL" || result.truth_status === "PROVEN");
  assert.ok(Array.isArray(result.coverage.wedge_coverage));
  assert.ok(result.highest_risks.length >= 1);
  assert.notEqual(result.next_milestone, "UNKNOWN");
  assert.ok(result.repo_paths_read.length > 0);
});

test("control plane tools fail closed without Command Center", async () => {
  const result = await commandCenterSummaryV1({
    rootDir: "/tmp/buckparts-mcp-cc-missing-xyz",
    loadReport: async () => {
      throw new Error("missing");
    },
  });
  assert.equal(result.truth_status, "UNKNOWN");
  assert.equal(result.next_best_action, "UNKNOWN");
});

test("business_snapshot uses committed runner artifact when CC missing", async () => {
  const result = await businessSnapshotV1({
    rootDir: process.cwd(),
    loadReport: async () => {
      throw new Error("missing cc");
    },
  });
  assertReadOnlyEnvelope(result);
  assert.equal(result.truth_status, "UNKNOWN");
  assert.ok(Array.isArray(result.coverage.wedge_coverage));
  assert.ok(result.repo_paths_read.some((p) => p.includes("census") || p.includes("data/")));
});

test("MCP control plane contract is stable", () => {
  assert.equal(BUCKPARTS_MCP_CONTROL_PLANE_CONTRACT_V1, "buckparts_mcp_control_plane_v1");
});

test("loadCommandCenterForMcpV1 blocks live build without snapshot by default", async () => {
  const root = mkdtempSync(path.join(tmpdir(), "mcp-cc-blocked-"));
  const previous = process.env.BUCKPARTS_MCP_ALLOW_LIVE_CC_BUILD;
  delete process.env.BUCKPARTS_MCP_ALLOW_LIVE_CC_BUILD;
  try {
    const loaded = await loadCommandCenterForMcpV1({ rootDir: root });
    assert.equal(loaded.ok, false);
    if (!loaded.ok) {
      assert.ok(loaded.blockers.includes(MCP_SUPABASE_EXTRACTION_BLOCKED_LIVE_BUILD_V1));
      assert.ok(loaded.truth_note.includes(BUCKPARTS_COMMAND_CENTER_SNAPSHOT_JSON_REL_V1));
    }
  } finally {
    if (previous === undefined) delete process.env.BUCKPARTS_MCP_ALLOW_LIVE_CC_BUILD;
    else process.env.BUCKPARTS_MCP_ALLOW_LIVE_CC_BUILD = previous;
    rmSync(root, { recursive: true, force: true });
  }
});

test("loadCommandCenterForMcpV1 reads committed snapshot when present", async () => {
  const root = mkdtempSync(path.join(tmpdir(), "mcp-cc-snapshot-"));
  try {
    const snapshotAbs = path.join(root, BUCKPARTS_COMMAND_CENTER_SNAPSHOT_JSON_REL_V1);
    mkdirSync(path.dirname(snapshotAbs), { recursive: true });
    writeFileSync(
      snapshotAbs,
      `${JSON.stringify(minimalCommandCenterReport(), null, 2)}\n`,
      "utf8",
    );
    const loaded = await loadCommandCenterForMcpV1({ rootDir: root });
    assert.equal(loaded.ok, true);
    if (loaded.ok) {
      assert.equal(loaded.source, "committed_snapshot");
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
