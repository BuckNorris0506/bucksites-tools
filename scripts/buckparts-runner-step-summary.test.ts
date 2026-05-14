/**
 * Runner Step visibility / digest summary tests.
 */

import assert from "node:assert/strict";
import test from "node:test";

import { buildFounderDigestMarkdownV1 } from "./lib/buckparts-founder-digest-v1";
import {
  buildRunnerStepVisibilityModeledV1,
  formatRunnerStepCliResultMarkdownV1,
  formatRunnerStepDigestSectionMarkdownV1,
} from "./lib/buckparts-runner-step-summary-v1";
import type { FounderExecutionPacketV1 } from "../src/lib/owner-dashboard/founder-execution-packet-v1";
import type { BuckpartsRunnerStepOutputV1 } from "./lib/buckparts-runner-step-v1";

const mockPacket: FounderExecutionPacketV1 = {
  id: "execution_packet_v1:q-test",
  source_queue_row_id: "q-test",
  title: "Read-only fixture",
  recommended_actor: "agent",
  mutation_authority: "read_only",
  status: "agent_safe",
  packet_kind: "agent_read_only_delegate_v1",
  copy_paste_prompt: "(fixture)",
  validation_command: "npm run lint",
  acceptance_criteria: [],
  prohibited_actions: ["Do not mutate DB."],
  evidence_basis: "test",
};

test("digest markdown includes Runner Step section when runner_step_digest_markdown provided", () => {
  const runnerMd = formatRunnerStepDigestSectionMarkdownV1(
    buildRunnerStepVisibilityModeledV1({
      surface: "founder_digest",
      command_center_ok: true,
      nextPacket: mockPacket,
    }),
  );
  const md = buildFounderDigestMarkdownV1({
    generated_at: "t",
    build: { ran: true, ok: true },
    command_center: {
      report_name: "r",
      generated_at: "t",
      system_health_status: "OK",
      next_best_action: "x",
      next_owner_action: "y",
      next_move_mode: "READ_ONLY",
      mutating_blocked: false,
      mutating_block_reasons: [],
      deploy_lane_status: "OK",
      live_site_runtime_status: "OK",
      route_health_one_liner: "1/1 OK",
      amazon_rescue_next_agent_action: "",
      known_unknowns_sample: [],
    },
    compare_note: "n",
    founder_action_queue_digest_markdown: "|x|\n",
    founder_execution_packets_digest_markdown: "_packets_\n",
    runner_step_digest_markdown: runnerMd,
  });
  assert.match(md, /## Runner Step \(read-only v1\)/);
  assert.match(md, /did \*\*not\*\* execute `npm run buckparts:runner-step`/);
  assert.match(md, /Cursor \/ Codex \/ OpenAI/);
  assert.match(md, /\*\*UNKNOWN:\*\*/);
});

test("modeled digest section does not claim closed-loop autonomy", () => {
  const md = formatRunnerStepDigestSectionMarkdownV1(
    buildRunnerStepVisibilityModeledV1({
      surface: "founder_digest",
      command_center_ok: true,
      nextPacket: null,
    }),
  );
  assert.doesNotMatch(md, /closed[- ]loop/i);
  assert.doesNotMatch(md, /fully autonomous/i);
});

test("dashboard model: live JSON UNKNOWN and external agent UNKNOWN", () => {
  const m = buildRunnerStepVisibilityModeledV1({
    surface: "owner_dashboard",
    command_center_ok: true,
    nextPacket: mockPacket,
  });
  assert.equal(m.live_runner_step_json, "UNKNOWN");
  assert.equal(m.external_agent_execution, "UNKNOWN");
  assert.equal(m.modeled_next_packet_id, mockPacket.id);
  assert.ok(m.planned_validation_commands.includes("npm run lint"));
});

test("CLI result markdown preserves PROVEN/UNKNOWN boundaries", () => {
  const out: BuckpartsRunnerStepOutputV1 = {
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
    selected_packet: { id: "p1", title: "T", source_queue_row_id: "r1" },
    commands: [
      { command: "npm run lint", exit_code: 0, status: "PASS", stdout_tail: "", stderr_tail: "" },
    ],
    overall_status: "PASS",
    next_human_action: "h",
    next_runner_action: "r",
    prohibited_actions_confirmed: ["a"],
    runner_notes: [],
  };
  const md = formatRunnerStepCliResultMarkdownV1(out);
  assert.match(md, /\*\*UNKNOWN:\*\* External IDE\/agent/);
  assert.match(md, /\*\*PROVEN:\*\*.*overall_status/);
});
