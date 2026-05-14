import assert from "node:assert/strict";
import test from "node:test";

import {
  buildFounderDigestMarkdownV1,
  sliceCommandCenterForFounderDigest,
} from "./lib/buckparts-founder-digest-v1";

test("buildFounderDigestMarkdownV1 includes required sections", () => {
  const md = buildFounderDigestMarkdownV1({
    generated_at: "2026-05-14T12:00:00.000Z",
    build: { ran: true, ok: true },
    command_center: {
      report_name: "buckparts_command_center_v1",
      generated_at: "2026-05-14T11:00:00.000Z",
      system_health_status: "WARNING",
      next_best_action: "Do the next safe thing.",
      next_owner_action: "Jared: approve ledger.",
      next_move_mode: "READ_ONLY",
      mutating_blocked: true,
      mutating_block_reasons: ["no mutate"],
      deploy_lane_status: "OK",
      live_site_runtime_status: "OK",
      route_health_one_liner: "3/3 OK",
      amazon_rescue_next_agent_action: "Agent may run dry-run X.",
      known_unknowns_sample: ["deploy commit UNKNOWN"],
    },
    compare_note: "**UNKNOWN** — no prior digest.",
    founder_action_queue_digest_markdown: "| Priority | Title | Status | Actor | Next step |\n| --- | --- | --- | --- | --- |\n| 1 | Example | needs_owner | founder | Review |\n",
  });
  assert.match(md, /^# BuckParts Founder Digest/m);
  assert.match(md, /## Is the repo \/ build healthy\?/);
  assert.match(md, /## Is live smoke OK\?/);
  assert.match(md, /## Command Center next action/);
  assert.match(md, /Do the next safe thing/);
  assert.match(md, /## Founder Action Queue \(read-only v1\)/);
  assert.match(md, /\| 1 \| Example \|/);
  assert.match(md, /## Notification/);
  assert.match(md, /\*\*UNKNOWN:\*\* This repo contains no Slack/);
});

test("delegated CI build note", () => {
  const md = buildFounderDigestMarkdownV1({
    generated_at: "t",
    build: { ran: false, ok: "UNKNOWN", delegated_to_prior_ci_step: true },
    command_center: {
      report_name: "x",
      generated_at: "t",
      system_health_status: "OK",
      next_best_action: "a",
      next_owner_action: "o",
      next_move_mode: "READ_ONLY",
      mutating_blocked: false,
      mutating_block_reasons: [],
      deploy_lane_status: "UNKNOWN",
      live_site_runtime_status: "UNKNOWN",
      route_health_one_liner: "UNKNOWN",
      amazon_rescue_next_agent_action: "",
      known_unknowns_sample: [],
    },
    compare_note: "UNKNOWN",
  });
  assert.match(md, /preceding CI job step/);
});

test("sliceCommandCenterForFounderDigest maps deploy monitor", () => {
  const slice = sliceCommandCenterForFounderDigest({
    report_name: "buckparts_command_center_v1",
    generated_at: "t0",
    system_health_summary: { status: "OK" },
    next_best_action: "NBA",
    known_unknowns: ["u1"],
    execution_guidance: { next_move_mode: "READ_ONLY", mutating_blocked: false, mutating_block_reasons: [] },
    command_center_v2: {
      next_owner_action: "Owner act",
      deploy_live_site_status: {
        status: "OK",
        live_site_monitor: { runtime_status: "OK", routes: [{ ok: true }, { ok: false }] },
      },
      amazon_rescue: { next_agent_action: "Agent act" },
    },
  } as Parameters<typeof sliceCommandCenterForFounderDigest>[0]);
  assert.equal(slice.next_best_action, "NBA");
  assert.equal(slice.deploy_lane_status, "OK");
  assert.equal(slice.live_site_runtime_status, "OK");
  assert.equal(slice.route_health_one_liner, "1/2 OK");
  assert.equal(slice.amazon_rescue_next_agent_action, "Agent act");
});
