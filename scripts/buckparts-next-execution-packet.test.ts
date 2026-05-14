import assert from "node:assert/strict";
import test from "node:test";

import { buildFounderActionQueueV1, founderActionQueueInputFromCommandCenterJson } from "../src/lib/owner-dashboard/founder-action-queue-v1";
import { buildFounderExecutionPacketsV1 } from "../src/lib/owner-dashboard/founder-execution-packet-v1";
import {
  buildNextExecutionPacketSnapshotV1,
  formatNextExecutionPacketListText,
  formatNextExecutionPacketNoPacketText,
  pickFirstNeedsOwnerTitle,
  type NextExecutionPacketSnapshotV1,
} from "./lib/buckparts-next-execution-packet";
import { runCliFromSnapshot } from "./buckparts-next-execution-packet";

function snapshotFromQueueJson(cc: unknown): NextExecutionPacketSnapshotV1 {
  const queueInput = founderActionQueueInputFromCommandCenterJson(cc);
  const queue = buildFounderActionQueueV1(queueInput);
  const generated_at = "2026-01-01T00:00:00.000Z";
  const execution = buildFounderExecutionPacketsV1(queue.rows, {
    generated_at,
    source: "buckparts-next-execution-packet",
  });
  return {
    command_center_ok: true,
    generated_at,
    source: "buckparts-next-execution-packet",
    queue,
    execution,
    next_packet: execution.packets[0] ?? null,
    first_needs_owner_title: pickFirstNeedsOwnerTitle(queue.rows),
  };
}

test("pickFirstNeedsOwnerTitle returns first needs_owner title in queue order", () => {
  const rows = [
    { id: "1", title: "Waiting row", status: "waiting" as const, owner_burden: "low" as const, recommended_actor: "founder" as const, mutation_authority: "read_only" as const, evidence_basis: "e", next_action: "n" },
    { id: "2", title: "Owner decides X", status: "needs_owner" as const, owner_burden: "high" as const, recommended_actor: "founder" as const, mutation_authority: "read_only" as const, evidence_basis: "e", next_action: "n" },
    { id: "3", title: "Owner decides Y", status: "needs_owner" as const, owner_burden: "low" as const, recommended_actor: "founder" as const, mutation_authority: "read_only" as const, evidence_basis: "e", next_action: "n" },
  ];
  assert.equal(pickFirstNeedsOwnerTitle(rows), "Owner decides X");
});

test("default CLI output is only copy_paste_prompt when next_packet exists", () => {
  const cc = {
    next_best_action: "NBA",
    execution_guidance: { next_move_mode: "READ_ONLY", mutating_blocked: false, mutating_block_reasons: [] },
    command_center_v2: {
      next_owner_action: "Owner from v2",
      amazon_rescue: {
        next_agent_action: "Run read-only audit of queue.",
        next_owner_action: "",
        human_browser_required_tokens: [],
        status: "OK",
      },
      affiliate_readiness: { status: "OK", next_owner_action: "", next_agent_action: "" },
      deploy_live_site_status: { status: "OK", live_site_monitor: null },
      unknown_or_human_review: { status: "OK", next_owner_action: "", blocker: null },
    },
  };
  const snapshot = snapshotFromQueueJson(cc);
  assert.ok(snapshot.next_packet, "fixture should yield at least one agent_safe packet");
  const { exitCode, stdout } = runCliFromSnapshot(snapshot, []);
  assert.equal(exitCode, 0);
  assert.match(stdout, /^## OBJECTIVE/m);
  assert.doesNotMatch(stdout, /PROVEN: No agent-safe/);
});

test("default CLI when no packet prints PROVEN line and top needs_owner title", () => {
  const cc = {
    next_best_action: "Owner-led next best action text long enough for queue row.",
    execution_guidance: {
      next_move_mode: "READ_ONLY",
      mutating_blocked: true,
      mutating_block_reasons: ["mutating gate reason one", "mutating gate reason two"],
    },
    command_center_v2: {
      next_owner_action: "Jared must sign off on ledger before any agent expands scope.",
      amazon_rescue: {
        next_agent_action: "",
        next_owner_action: "",
        human_browser_required_tokens: ["TOKEN1"],
        status: "ATTENTION",
      },
      affiliate_readiness: { status: "BLOCKED", next_owner_action: "Fix affiliate programs.", next_agent_action: "" },
      deploy_live_site_status: {
        status: "OK",
        live_site_monitor: { runtime_status: "ATTENTION", routes: [{ ok: false }, { ok: true }] },
      },
      unknown_or_human_review: {
        status: "BLOCKED",
        next_owner_action: "Review unknown cohort before agents proceed.",
        blocker: "human review backlog",
      },
    },
  };
  const snapshot = snapshotFromQueueJson(cc);
  assert.equal(
    snapshot.execution.packets.length,
    0,
    "fixture must yield zero execution packets (no agent_safe+agent+read_only rows); padding must not add agent_safe when queue already has 3+ rows",
  );
  assert.ok(snapshot.first_needs_owner_title);
  const { exitCode, stdout } = runCliFromSnapshot(snapshot, []);
  assert.equal(exitCode, 0);
  assert.match(stdout, /PROVEN: No agent-safe read-only Founder Execution Packet exists/);
  assert.match(stdout, /Top owner-needed queue row/);
});

test("--list prints counts and packet titles", () => {
  const cc = {
    next_best_action: "NBA",
    execution_guidance: { next_move_mode: "READ_ONLY", mutating_blocked: false, mutating_block_reasons: [] },
    command_center_v2: {
      next_owner_action: "Owner",
      amazon_rescue: {
        next_agent_action: "read-only verify tokens",
        next_owner_action: "",
        human_browser_required_tokens: [],
        status: "OK",
      },
      affiliate_readiness: { status: "OK", next_owner_action: "", next_agent_action: "" },
      deploy_live_site_status: { status: "OK", live_site_monitor: null },
      unknown_or_human_review: { status: "OK", next_owner_action: "", blocker: null },
    },
  };
  const snapshot = snapshotFromQueueJson(cc);
  const { stdout } = runCliFromSnapshot(snapshot, ["--list"]);
  assert.match(stdout, /Packets: \d+/);
  assert.match(stdout, /Skipped queue rows:/);
});

test("--json includes next_packet and execution contract", () => {
  const cc = {
    next_best_action: "NBA",
    execution_guidance: { next_move_mode: "READ_ONLY", mutating_blocked: false, mutating_block_reasons: [] },
    command_center_v2: {
      next_owner_action: "Owner",
      amazon_rescue: {
        next_agent_action: "read-only audit queue",
        next_owner_action: "",
        human_browser_required_tokens: [],
        status: "OK",
      },
      affiliate_readiness: { status: "OK", next_owner_action: "", next_agent_action: "" },
      deploy_live_site_status: { status: "OK", live_site_monitor: null },
      unknown_or_human_review: { status: "OK", next_owner_action: "", blocker: null },
    },
  };
  const snapshot = snapshotFromQueueJson(cc);
  const { stdout } = runCliFromSnapshot(snapshot, ["--json"]);
  const j = JSON.parse(stdout) as { founder_action_queue_contract?: string; execution?: { contract?: string } };
  assert.equal(j.founder_action_queue_contract, "founder_action_queue_v1");
  assert.equal(j.execution?.contract, "founder_execution_packet_v1");
});

test("command_center_ok false yields exit 1", () => {
  const snapshot: NextExecutionPacketSnapshotV1 = {
    command_center_ok: false,
    generated_at: "t",
    source: "buckparts-next-execution-packet",
    queue: buildFounderActionQueueV1(founderActionQueueInputFromCommandCenterJson({})),
    execution: buildFounderExecutionPacketsV1([], {}),
    next_packet: null,
    first_needs_owner_title: null,
  };
  const { exitCode } = runCliFromSnapshot(snapshot, []);
  assert.equal(exitCode, 1);
});

test("buildNextExecutionPacketSnapshotV1 runs without throwing (integration smoke)", async () => {
  const s = await buildNextExecutionPacketSnapshotV1(process.cwd());
  assert.ok(typeof s.command_center_ok === "boolean");
  assert.ok(s.queue.rows.length >= 1);
  assert.equal(s.source, "buckparts-next-execution-packet");
});
