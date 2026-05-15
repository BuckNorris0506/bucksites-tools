import assert from "node:assert/strict";
import test from "node:test";

import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import {
  buildFounderDigestMarkdownV1,
  sliceCommandCenterForFounderDigest,
} from "./lib/buckparts-founder-digest-v1";
import {
  buildFounderExecutionPacketsV1,
  formatFounderExecutionPacketsForDigest,
} from "../src/lib/owner-dashboard/founder-execution-packet-v1";
import {
  buildFounderDecisionPacketsV1,
  formatFounderDecisionPacketsForDigestTopNV1,
} from "../src/lib/owner-dashboard/founder-decision-packet-v1";
import {
  buildFounderDecisionRegistryReadModelV1,
  formatFounderDecisionRegistryReadModelDigestMarkdownV1,
} from "../src/lib/owner-dashboard/founder-decision-registry-read-model-v1";
import {
  buildFailurePatternRegistryReadModelFromSeededV1,
  formatFailurePatternRegistryDigestMarkdownV1,
} from "../src/lib/owner-dashboard/failure-pattern-registry-v1";
import {
  buildRunnerStepVisibilityModeledV1,
  formatRunnerStepDigestSectionMarkdownV1,
} from "./lib/buckparts-runner-step-summary-v1";
import { buildRunnerStepDigestMarkdownForFounderRunV1 } from "./buckparts-founder-digest";

test("buildRunnerStepDigestMarkdownForFounderRunV1 embeds live JSON when env path is valid", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "founder-digest-runner-"));
  const jsonPath = path.join(dir, "runner.json");
  const out = {
    contract: "buckparts_runner_step_v1",
    generated_at: "t",
    read_only: true,
    data_mutation: false,
    layer_truth: {
      layer_3_repo_owned_execution: "PROVEN",
      layer_3_external_agent_execution: "UNKNOWN",
      layer_4_output_capture: "PROVEN_FOR_REPO_COMMANDS_ONLY",
      layer_5_validation_interpretation: "PARTIAL",
      layer_6_founder_only_approval: "NOT_PROVEN",
    },
    selected_packet: null,
    commands: [],
    overall_status: "NO_PACKET" as const,
    next_human_action: "h",
    next_runner_action: "r",
    prohibited_actions_confirmed: [],
    runner_notes: [],
  };
  writeFileSync(jsonPath, JSON.stringify(out), "utf8");
  process.env.FOUNDER_DIGEST_RUNNER_STEP_JSON_PATH = jsonPath;
  try {
    const md = buildRunnerStepDigestMarkdownForFounderRunV1({
      rootDir: dir,
      command_center_ok: true,
      nextPacket: null,
    });
    assert.match(md, /## Runner Step \(read-only v1 · live JSON\)/);
    assert.match(md, /`overall_status`=`NO_PACKET`/);
    assert.doesNotMatch(md, /did \*\*not\*\* execute `npm run buckparts:runner-step`/);
  } finally {
    delete process.env.FOUNDER_DIGEST_RUNNER_STEP_JSON_PATH;
  }
});

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
    founder_decision_packets_digest_markdown: formatFounderDecisionPacketsForDigestTopNV1(
      buildFounderDecisionPacketsV1(
        [
          {
            id: "q1",
            title: "Example queue row",
            status: "needs_owner",
            owner_burden: "high",
            recommended_actor: "founder",
            mutation_authority: "read_only",
            evidence_basis: "fixture",
            next_action: "Owner decides",
          },
        ],
        { source: "digest_test", runner: { overall_status: "NO_PACKET" } },
      ),
      3,
    ),
    founder_decision_registry_read_model_digest_markdown: formatFounderDecisionRegistryReadModelDigestMarkdownV1(
      buildFounderDecisionRegistryReadModelV1([], {
        generated_at: "2026-05-14T12:00:00.000Z",
        reference_time_iso: "2026-05-14T12:00:00.000Z",
      }),
    ),
    founder_execution_packets_digest_markdown: formatFounderExecutionPacketsForDigest(
      buildFounderExecutionPacketsV1([
        {
          id: "q1",
          title: "Example queue row",
          status: "needs_owner",
          owner_burden: "high",
          recommended_actor: "founder",
          mutation_authority: "read_only",
          evidence_basis: "fixture",
          next_action: "Owner decides",
        },
      ]),
    ),
    runner_step_digest_markdown: formatRunnerStepDigestSectionMarkdownV1(
      buildRunnerStepVisibilityModeledV1({
        surface: "founder_digest",
        command_center_ok: true,
        nextPacket: null,
      }),
    ),
    failure_pattern_registry_digest_markdown: formatFailurePatternRegistryDigestMarkdownV1(
      buildFailurePatternRegistryReadModelFromSeededV1("2026-05-14T12:00:00.000Z"),
    ),
  });
  assert.match(md, /^# BuckParts Founder Digest/m);
  assert.match(md, /## Is the repo \/ build healthy\?/);
  assert.match(md, /## Is live smoke OK\?/);
  assert.match(md, /## Command Center next action/);
  assert.match(md, /Do the next safe thing/);
  assert.match(md, /## Founder Action Queue \(read-only v1\)/);
  assert.match(md, /\| 1 \| Example \|/);
  assert.match(md, /## Founder Decision Packets \(owner-only v1\)/);
  assert.match(md, /Founder Decision Registry v1/);
  assert.match(md, /## Founder Decision Registry \(read model v1\)/);
  assert.match(md, /founder_decision_registry_read_model_v1/);
  assert.match(md, /not consumed by automation/i);
  assert.match(md, /founder_decision_packet_v1/);
  assert.match(md, /## Founder Execution Packets \(read-only v1\)/);
  assert.match(md, /No agent-safe execution packets/);
  assert.match(md, /## Runner Step \(read-only v1\)/);
  assert.match(md, /## Failure Pattern Registry \(read-only v1\)/);
  assert.match(md, /failure_pattern_registry_read_model_v1/);
  assert.match(md, /Failure Pattern Registry: \d+ guarded, \d+ unguarded; informational only\./);
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
