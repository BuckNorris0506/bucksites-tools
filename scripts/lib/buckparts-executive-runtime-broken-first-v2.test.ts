import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  EXECUTIVE_RUNTIME_BROKEN_FIRST_CONTRACT_V2,
  EXECUTIVE_RUNTIME_BROKEN_FIRST_SLICE_V2,
  brokenFirstSucceededV2,
  buildExecutiveRuntimeBrokenFirstV2,
} from "./buckparts-executive-runtime-broken-first-v2";

const LIB_ABS = fileURLToPath(import.meta.url).replace(/\.test\.ts$/, ".ts");
const CLI_ABS = path.resolve(path.dirname(LIB_ABS), "../run-buckparts-executive-runtime-broken-first-v2.ts");
const NOW = "2026-08-14T03:40:00.000Z";

function cc(overrides?: { root?: Record<string, unknown>; v2?: Record<string, unknown> }): Record<string, unknown> {
  return {
    report_name: "buckparts_command_center_v1",
    system_health_summary: {
      status: "OK",
      reasons: [],
      recommended_next_step: "do-not-echo",
    },
    command_center_v2: {
      canonical_final_operating_decision_v1: {
        steering_override_source: "batch_dispatch",
        dispatch_status: "READY",
        command_executable: true,
        owner_review_required: false,
        next_best_action: "DO NOT ECHO NBA",
        exact_command: "npx tsx scripts/report-buckparts-command-center.ts",
      },
      owner_decision_queue_v1: { pending_count: 0 },
      command_center_issue_registry_v1: {
        steering_override_active: false,
        highest_priority_steering_eligible_issue: null,
        total_open: 0,
      },
      phase4_outcome_capture_v1: {
        steering_authority: false,
        nba_authority: false,
        handoff_from_confident_buy_count: 4,
        runtime_status: "OK",
      },
      ...(overrides?.v2 ?? {}),
    },
    ...(overrides?.root ?? {}),
  };
}

function run(commandCenter: unknown) {
  return buildExecutiveRuntimeBrokenFirstV2({
    commandCenter,
    generated_at: NOW,
    observe: { cycle_status: "OBSERVED_STOP", blocked_reasons: [] },
    understand: { cycle_status: "UNDERSTOOD_STOP", blocked_reasons: [] },
  });
}

test("a real HARD_BREAK outranks READY work and stops constraint analysis", () => {
  const snapshot = run(
    cc({
      v2: {
        command_center_issue_registry_v1: {
          steering_override_active: true,
          highest_priority_steering_eligible_issue: {
            issue_id: "ISSUE-T0-1",
            severity: "TIER_0",
            status: "DISCOVERED",
            title: "stop the line",
          },
          total_open: 1,
        },
      },
    }),
  );
  assert.equal(snapshot.broken_state.classification, "HARD_BREAK");
  assert.match(snapshot.broken_state.statement ?? "", /ISSUE-T0-1/);
  assert.match(snapshot.broken_state.statement ?? "", /outranks ordinary READY work/);
  assert.equal(snapshot.adjudication.canonical_dispatch_status, "READY");
  assert.equal(snapshot.adjudication.canonical_command_executable, true);
  assert.equal(snapshot.binding_constraint.statement, null);
  assert.equal(snapshot.binding_constraint.honesty, "UNKNOWN");
  assert.ok(
    snapshot.binding_constraint.unknown_reasons.some((row) => row.includes("HARD_BREAK")),
  );
  assert.equal(snapshot.selected_work, null);
  assert.equal(snapshot.recommended_action, null);
});

test("CRITICAL without a qualifying underlying break does not override READY", () => {
  const snapshot = run(
    cc({
      root: {
        system_health_summary: {
          status: "CRITICAL",
          reasons: ["learning_outcomes_metrics.runtime_status is UNKNOWN"],
          recommended_next_step: "do-not-echo",
        },
      },
    }),
  );
  assert.equal(snapshot.cycle_status, "ADJUDICATED_STOP");
  assert.notEqual(snapshot.broken_state.classification, "HARD_BREAK");
  assert.equal(snapshot.broken_state.classification, "DEGRADED");
  assert.equal(snapshot.adjudication.canonical_dispatch_status, "READY");
  assert.equal(snapshot.adjudication.system_health_status, "CRITICAL");
  assert.equal(snapshot.adjudication.neither_side_assumed, true);
  assert.equal(snapshot.binding_constraint.honesty, "PROVEN");
  assert.match(snapshot.binding_constraint.statement ?? "", /dispatch_status=READY/);
  assert.match(snapshot.binding_constraint.statement ?? "", /does not qualify as HARD_BREAK/);
  assert.equal((snapshot.binding_constraint.statement ?? "").includes("DO NOT ECHO NBA"), false);
});

test("broken required sensor is classified SENSOR_BREAK separately from HARD_BREAK", () => {
  const snapshot = run(
    cc({
      root: {
        system_health_summary: {
          status: "CRITICAL",
          reasons: ["cta_coverage_metrics.runtime_status is UNKNOWN"],
        },
      },
      v2: {
        phase4_outcome_capture_v1: {
          steering_authority: false,
          nba_authority: false,
          handoff_from_confident_buy_count: 1,
          runtime_status: "OK",
        },
      },
    }),
  );
  assert.equal(snapshot.broken_state.classification, "SENSOR_BREAK");
  assert.ok(
    snapshot.broken_state.critical_reason_classifications.some(
      (row) =>
        row.reason === "cta_coverage_metrics.runtime_status is UNKNOWN" &&
        row.classification === "SENSOR_BREAK",
    ),
  );
  assert.equal(snapshot.binding_constraint.honesty, "PROVEN");
  assert.equal(snapshot.binding_constraint.statement !== null, true);
});

test("Outcome Join UNKNOWN is SENSOR_BREAK and remains non-steering", () => {
  const snapshot = run(
    cc({
      v2: {
        phase4_outcome_capture_v1: {
          steering_authority: false,
          nba_authority: false,
          handoff_from_confident_buy_count: "UNKNOWN",
          runtime_status: "ATTENTION",
        },
      },
    }),
  );
  assert.equal(snapshot.broken_state.classification, "SENSOR_BREAK");
  assert.match(snapshot.broken_state.statement ?? "", /non-steering/);
  assert.equal(snapshot.nba_authority, false);
  assert.equal(snapshot.steering_authority, false);
  assert.equal(snapshot.binding_constraint.honesty, "PROVEN");
});

test("conflicting unrecognized CRITICAL reason emits UNKNOWN rather than arbitrary ranking", () => {
  const snapshot = run(
    cc({
      root: {
        system_health_summary: {
          status: "CRITICAL",
          reasons: ["mystery_unrecognized_signal is on fire"],
        },
      },
    }),
  );
  assert.equal(snapshot.broken_state.classification, "UNKNOWN");
  assert.equal(snapshot.broken_state.statement, null);
  assert.ok(snapshot.broken_state.conflicts.some((row) => row.includes("CONFLICT")));
  assert.equal(snapshot.binding_constraint.statement, null);
  assert.equal(snapshot.binding_constraint.honesty, "UNKNOWN");
  assert.notEqual(snapshot.broken_state.classification, "HARD_BREAK");
});

test("no dispatch / mutation / NBA is introduced", () => {
  const snapshot = run(cc());
  assert.equal(snapshot.read_only, true);
  assert.equal(snapshot.data_mutation, false);
  assert.equal(snapshot.mutation_authorized, false);
  assert.equal(snapshot.nba_authority, false);
  assert.equal(snapshot.dispatch_authority, false);
  assert.equal(snapshot.dispatch_invoked, false);
  assert.equal(snapshot.selected_work, null);
  assert.equal(snapshot.recommended_action, null);
  assert.equal(snapshot.persistent_world_model_written, false);
  assert.equal("command_center_v2" in snapshot, false);

  const lib = readFileSync(LIB_ABS, "utf8");
  const cli = readFileSync(CLI_ABS, "utf8");
  for (const src of [lib, cli]) {
    assert.equal(src.includes("writeFileSync"), false);
    assert.equal(src.includes("run-buckparts-command-center-dispatch"), false);
    assert.equal(src.includes("upsertOwnerDecisionRequest"), false);
    assert.equal(src.includes("nba_authority: true"), false);
    assert.equal(src.includes("steering_authority: true"), false);
  }
});

test("healthy state permits constraint analysis", () => {
  const snapshot = run(cc());
  assert.equal(brokenFirstSucceededV2(snapshot), true);
  assert.equal(snapshot.broken_state.classification, "NOT_BROKEN");
  assert.equal(snapshot.binding_constraint.honesty, "PROVEN");
  assert.match(snapshot.binding_constraint.statement ?? "", /dispatch_status=READY/);
  assert.equal(snapshot.contract, EXECUTIVE_RUNTIME_BROKEN_FIRST_CONTRACT_V2);
  assert.equal(snapshot.runtime_slice, EXECUTIVE_RUNTIME_BROKEN_FIRST_SLICE_V2);
});

test("missing evidence fails closed honestly", () => {
  const snapshot = run(null);
  assert.equal(snapshot.cycle_status, "FAIL_CLOSED");
  assert.equal(brokenFirstSucceededV2(snapshot), false);
  assert.equal(snapshot.broken_state.classification, "UNKNOWN");
  assert.equal(snapshot.broken_state.statement, null);
  assert.equal(snapshot.binding_constraint.honesty, "UNKNOWN");
  assert.ok(snapshot.blocked_reasons.some((row) => row.includes("command_center")));
});

test("missing canonical fails closed", () => {
  const input = cc();
  const v2 = input.command_center_v2 as Record<string, unknown>;
  delete v2.canonical_final_operating_decision_v1;
  const snapshot = run(input);
  assert.equal(snapshot.cycle_status, "FAIL_CLOSED");
  assert.ok(snapshot.blocked_reasons.some((row) => row.includes("canonical_final_operating_decision_v1")));
});

test("affiliate ACTION_REQUIRED CRITICAL is DEGRADED, not HARD_BREAK", () => {
  const snapshot = run(
    cc({
      root: {
        system_health_summary: {
          status: "CRITICAL",
          reasons: ["affiliate_tracker.health.status is ACTION_REQUIRED"],
        },
      },
    }),
  );
  assert.equal(snapshot.broken_state.classification, "DEGRADED");
  assert.equal(snapshot.binding_constraint.honesty, "PROVEN");
});
