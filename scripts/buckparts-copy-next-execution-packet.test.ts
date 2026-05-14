import assert from "node:assert/strict";
import test from "node:test";

import { buildFounderActionQueueV1, founderActionQueueInputFromCommandCenterJson } from "../src/lib/owner-dashboard/founder-action-queue-v1";
import { buildFounderExecutionPacketsV1 } from "../src/lib/owner-dashboard/founder-execution-packet-v1";
import { formatNextExecutionPacketNoPacketText, type NextExecutionPacketSnapshotV1 } from "./lib/buckparts-next-execution-packet";
import { copyTextViaPbcopy, runCopyNextExecutionPacketMain } from "./buckparts-copy-next-execution-packet";

function snapshotWithPacket(): NextExecutionPacketSnapshotV1 {
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
  const queue = buildFounderActionQueueV1(founderActionQueueInputFromCommandCenterJson(cc));
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
    first_needs_owner_title: null,
  };
}

function snapshotNoPacket(): NextExecutionPacketSnapshotV1 {
  const cc = {
    next_best_action: "Owner-led next best action text long enough for queue row.",
    execution_guidance: {
      next_move_mode: "READ_ONLY",
      mutating_blocked: true,
      mutating_block_reasons: ["r1", "r2"],
    },
    command_center_v2: {
      next_owner_action: "Jared must sign off before agents expand scope.",
      amazon_rescue: {
        next_agent_action: "",
        next_owner_action: "",
        human_browser_required_tokens: ["T1"],
        status: "ATTENTION",
      },
      affiliate_readiness: { status: "BLOCKED", next_owner_action: "Fix affiliate.", next_agent_action: "" },
      deploy_live_site_status: {
        status: "OK",
        live_site_monitor: { runtime_status: "ATTENTION", routes: [{ ok: false }, { ok: true }] },
      },
      unknown_or_human_review: {
        status: "BLOCKED",
        next_owner_action: "Review cohort.",
        blocker: "backlog",
      },
    },
  };
  const queue = buildFounderActionQueueV1(founderActionQueueInputFromCommandCenterJson(cc));
  const generated_at = "2026-01-01T00:00:00.000Z";
  const execution = buildFounderExecutionPacketsV1(queue.rows, {
    generated_at,
    source: "buckparts-next-execution-packet",
  });
  assert.equal(execution.packets.length, 0);
  return {
    command_center_ok: true,
    generated_at,
    source: "buckparts-next-execution-packet",
    queue,
    execution,
    next_packet: null,
    first_needs_owner_title: queue.rows.find((r) => r.status === "needs_owner")?.title ?? null,
  };
}

test("runCopyNextExecutionPacketMain copies prompt and prints confirmation", async () => {
  let copied = "";
  const { exitCode, stdout } = await runCopyNextExecutionPacketMain({
    loadSnapshot: async () => snapshotWithPacket(),
    copyToClipboard: (t) => {
      copied = t;
      return { ok: true };
    },
  });
  assert.equal(exitCode, 0);
  assert.equal(stdout, "PROVEN: Next execution packet copied to clipboard.\n");
  assert.match(copied, /^## OBJECTIVE/m);
});

test("runCopyNextExecutionPacketMain does not copy when no packet; stdout matches no-packet helper", async () => {
  let copied = "";
  const snap = snapshotNoPacket();
  const { exitCode, stdout } = await runCopyNextExecutionPacketMain({
    loadSnapshot: async () => snap,
    copyToClipboard: () => {
      copied = "should-not-run";
      return { ok: true };
    },
  });
  assert.equal(exitCode, 1);
  assert.equal(copied, "");
  assert.equal(stdout, formatNextExecutionPacketNoPacketText(snap));
});

test("runCopyNextExecutionPacketMain does not copy when Command Center failed", async () => {
  let copied = "";
  const snap = snapshotWithPacket();
  const { exitCode, stdout } = await runCopyNextExecutionPacketMain({
    loadSnapshot: async () => ({ ...snap, command_center_ok: false }),
    copyToClipboard: (t) => {
      copied = t;
      return { ok: true };
    },
  });
  assert.equal(exitCode, 1);
  assert.equal(copied, "");
  assert.match(stdout, /Command Center report build failed/);
});

test("runCopyNextExecutionPacketMain surfaces clipboard failure", async () => {
  const { exitCode, stdout } = await runCopyNextExecutionPacketMain({
    loadSnapshot: async () => snapshotWithPacket(),
    copyToClipboard: () => ({ ok: false, error: "PROVEN: injectable failure." }),
  });
  assert.equal(exitCode, 1);
  assert.match(stdout, /injectable failure/);
});

test("copyTextViaPbcopy on non-darwin returns structured failure (skip on macOS)", (t) => {
  if (process.platform === "darwin") {
    t.skip();
    return;
  }
  const r = copyTextViaPbcopy("hello");
  assert.equal(r.ok, false);
  assert.ok(r.error?.includes("macOS"));
});
