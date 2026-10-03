import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  EXECUTIVE_RUNTIME_UNDERSTAND_CONTRACT_V1,
  EXECUTIVE_RUNTIME_UNDERSTAND_SLICE_V1,
  EXECUTIVE_RUNTIME_UNDERSTAND_STAGE_V1,
  buildExecutiveRuntimeUnderstandV1,
  understandSucceededV1,
} from "./buckparts-executive-runtime-understand-v1";

const LIB_ABS = fileURLToPath(import.meta.url).replace(/\.test\.ts$/, ".ts");
const CLI_ABS = path.resolve(path.dirname(LIB_ABS), "../run-buckparts-executive-runtime-understand-v1.ts");
const NOW = "2026-08-14T03:00:00.000Z";

function commandCenterFixture(overrides?: {
  root?: Record<string, unknown>;
  v2?: Record<string, unknown>;
}): Record<string, unknown> {
  return {
    report_name: "buckparts_command_center_v1",
    generated_at: "2026-08-14T01:00:00.000Z",
    system_health_summary: { status: "OK", reasons: [], recommended_next_step: "do-not-echo" },
    command_center_v2: {
      canonical_final_operating_decision_v1: {
        steering_override_source: "demand_to_coverage",
        dispatch_status: "OWNER_REVIEW_REQUIRED",
        command_executable: false,
        owner_review_required: true,
        blockers: ["owner_review_required"],
        operator_can_be_away_status: "NOT_READY",
        next_best_action: "DO NOT ECHO THIS NBA",
        exact_command: "npx tsx scripts/report-buckparts-command-center.ts",
      },
      owner_decision_queue_v1: {
        pending_count: 1,
      },
      command_center_issue_registry_v1: {
        total_open: 0,
        highest_priority_issue: null,
      },
      phase4_outcome_capture_v1: {
        steering_authority: false,
        nba_authority: false,
        handoff_from_confident_buy_count: "UNKNOWN",
        runtime_status: "ATTENTION",
      },
      phase4_decision_capture_v1: {
        confident_buy_count: 3,
      },
      ...(overrides?.v2 ?? {}),
    },
    ...(overrides?.root ?? {}),
  };
}

function understand(cc: unknown, observe?: { cycle_status: "OBSERVED_STOP" | "FAIL_CLOSED"; blocked_reasons: string[] }) {
  return buildExecutiveRuntimeUnderstandV1({
    commandCenter: cc,
    generated_at: NOW,
    observe: observe ?? { cycle_status: "OBSERVED_STOP", blocked_reasons: [] },
  });
}

test("happy path: three conclusions, no dispatch, no second world model", () => {
  const snapshot = understand(commandCenterFixture());
  assert.equal(understandSucceededV1(snapshot), true);
  assert.equal(snapshot.cycle_status, "UNDERSTOOD_STOP");
  assert.equal(snapshot.contract, EXECUTIVE_RUNTIME_UNDERSTAND_CONTRACT_V1);
  assert.equal(snapshot.runtime_slice, EXECUTIVE_RUNTIME_UNDERSTAND_SLICE_V1);
  assert.equal(snapshot.source_stage, EXECUTIVE_RUNTIME_UNDERSTAND_STAGE_V1);
  assert.equal(snapshot.nba_authority, false);
  assert.equal(snapshot.steering_authority, false);
  assert.equal(snapshot.dispatch_invoked, false);
  assert.equal(snapshot.selected_work, null);
  assert.equal(snapshot.recommended_action, null);
  assert.equal(snapshot.persistent_world_model_written, false);
  assert.equal(snapshot.world_model, "existing_command_center_v2");
  assert.equal("command_center_v2" in snapshot, false);

  assert.equal(snapshot.conclusions.current_constraint.honesty, "PROVEN");
  assert.match(
    snapshot.conclusions.current_constraint.statement ?? "",
    /dispatch_status=OWNER_REVIEW_REQUIRED/,
  );
  assert.equal(
    (snapshot.conclusions.current_constraint.statement ?? "").includes("DO NOT ECHO THIS NBA"),
    false,
  );

  assert.equal(snapshot.conclusions.current_highest_risk.honesty, "PROVEN");
  assert.match(
    snapshot.conclusions.current_highest_risk.statement ?? "",
    /handoff_from_confident_buy_count=UNKNOWN/,
  );

  assert.equal(snapshot.conclusions.current_highest_leverage_opportunity.honesty, "INFERRED");
  assert.match(
    snapshot.conclusions.current_highest_leverage_opportunity.statement ?? "",
    /confident_buy_count=3/,
  );
});

test("every conclusion cites Command Center jq paths", () => {
  const snapshot = understand(commandCenterFixture());
  for (const row of Object.values(snapshot.conclusions)) {
    assert.ok(row.cited_fields.length > 0);
    assert.ok(row.cited_fields.every((field) => field.jq_path.startsWith(".")));
    assert.ok(
      row.cited_fields.some((field) => field.honesty === "PROVEN"),
      `${row.id} should cite at least one present field`,
    );
  }
});

test("missing Command Center fails closed with three UNKNOWN conclusions", () => {
  const snapshot = understand(null);
  assert.equal(snapshot.cycle_status, "FAIL_CLOSED");
  assert.equal(understandSucceededV1(snapshot), false);
  assert.ok(snapshot.blocked_reasons.some((row) => row.includes("command_center")));
  assert.equal(snapshot.conclusions.current_constraint.honesty, "UNKNOWN");
  assert.equal(snapshot.conclusions.current_highest_risk.honesty, "UNKNOWN");
  assert.equal(snapshot.conclusions.current_highest_leverage_opportunity.honesty, "UNKNOWN");
  assert.equal(snapshot.conclusions.current_constraint.statement, null);
});

test("missing canonical decision fails closed", () => {
  const cc = commandCenterFixture({
    v2: {
      canonical_final_operating_decision_v1: undefined,
    },
  });
  const v2 = cc.command_center_v2 as Record<string, unknown>;
  delete v2.canonical_final_operating_decision_v1;
  const snapshot = understand(cc);
  assert.equal(snapshot.cycle_status, "FAIL_CLOSED");
  assert.ok(snapshot.blocked_reasons.some((row) => row.includes("canonical_final_operating_decision_v1")));
  assert.equal(snapshot.conclusions.current_constraint.honesty, "UNKNOWN");
  assert.equal(snapshot.conclusions.current_constraint.statement, null);
});

test("missing dispatch_status fails closed and treats dispatch as refused", () => {
  const cc = commandCenterFixture();
  const v2 = cc.command_center_v2 as Record<string, unknown>;
  const canonical = v2.canonical_final_operating_decision_v1 as Record<string, unknown>;
  delete canonical.dispatch_status;
  const snapshot = understand(cc);
  assert.equal(snapshot.cycle_status, "FAIL_CLOSED");
  assert.ok(snapshot.blocked_reasons.some((row) => row.includes("canonical_dispatch_refused")));
  assert.equal(snapshot.dispatch_invoked, false);
  assert.equal(snapshot.conclusions.current_constraint.honesty, "UNKNOWN");
});

test("canonical READY vs command_executable=false is reported as conflict", () => {
  const cc = commandCenterFixture({
    v2: {
      canonical_final_operating_decision_v1: {
        steering_override_source: "root_resolve",
        dispatch_status: "READY",
        command_executable: false,
        owner_review_required: false,
        blockers: [],
        operator_can_be_away_status: "NOT_READY",
      },
    },
  });
  const snapshot = understand(cc);
  assert.equal(snapshot.conclusions.current_constraint.honesty, "UNKNOWN");
  assert.ok(snapshot.conclusions.current_constraint.conflicts.some((row) => row.includes("CONFLICT")));
  assert.equal(snapshot.conclusions.current_constraint.statement, null);
});

test("open TIER_0 issue plus Outcome Join UNKNOWN is a risk conflict, not a ranking", () => {
  const cc = commandCenterFixture({
    v2: {
      command_center_issue_registry_v1: {
        total_open: 1,
        highest_priority_issue: {
          issue_id: "ISSUE-T0-1",
          severity: "TIER_0",
          status: "DISCOVERED",
          title: "stop the line",
        },
      },
    },
  });
  const snapshot = understand(cc);
  assert.equal(snapshot.conclusions.current_highest_risk.honesty, "UNKNOWN");
  assert.equal(snapshot.conclusions.current_highest_risk.statement, null);
  assert.ok(snapshot.conclusions.current_highest_risk.conflicts.length >= 2);
  assert.ok(
    snapshot.conclusions.current_highest_risk.unknown_reasons.some((row) =>
      row.includes("§4.3"),
    ),
  );
});

test("only TIER_0 issue (join numeric) restates issue registry highest_priority as risk", () => {
  const cc = commandCenterFixture({
    v2: {
      phase4_outcome_capture_v1: {
        steering_authority: false,
        nba_authority: false,
        handoff_from_confident_buy_count: 2,
        runtime_status: "OK",
      },
      command_center_issue_registry_v1: {
        total_open: 1,
        highest_priority_issue: {
          issue_id: "ISSUE-T0-1",
          severity: "TIER_0",
          status: "DISCOVERED",
          title: "stop the line",
        },
      },
    },
  });
  const snapshot = understand(cc);
  assert.equal(snapshot.conclusions.current_highest_risk.honesty, "PROVEN");
  assert.match(snapshot.conclusions.current_highest_risk.statement ?? "", /ISSUE-T0-1/);
  assert.equal(snapshot.conclusions.current_highest_leverage_opportunity.honesty, "UNKNOWN");
});

test("observe FAIL_CLOSED fails the understand slice closed", () => {
  const snapshot = understand(commandCenterFixture(), {
    cycle_status: "FAIL_CLOSED",
    blocked_reasons: ["missing_required_source:hq_handoff"],
  });
  assert.equal(snapshot.cycle_status, "FAIL_CLOSED");
  assert.ok(snapshot.blocked_reasons.includes("observe_fail_closed"));
  assert.ok(snapshot.blocked_reasons.some((row) => row.includes("hq_handoff")));
});

test("does not echo Command Center recommended_next_step or NBA as an action", () => {
  const snapshot = understand(commandCenterFixture());
  const blob = JSON.stringify(snapshot.conclusions);
  assert.equal(blob.includes("do-not-echo"), false);
  assert.equal(blob.includes("DO NOT ECHO THIS NBA"), false);
  assert.equal(snapshot.recommended_action, null);
});

test("source files do not dispatch, mutate, persist a world model, or claim NBA", () => {
  const lib = readFileSync(LIB_ABS, "utf8");
  const cli = readFileSync(CLI_ABS, "utf8");
  for (const src of [lib, cli]) {
    assert.equal(src.includes("writeFileSync"), false);
    assert.equal(src.includes("run-buckparts-command-center-dispatch"), false);
    assert.equal(src.includes("upsertOwnerDecisionRequest"), false);
    assert.equal(src.includes("nba_authority: true"), false);
    assert.equal(src.includes("steering_authority: true"), false);
    assert.equal(src.includes("buildBottleneck"), false);
    assert.equal(src.includes("run-dispatch"), false);
  }
  assert.ok(lib.includes("§4.3, not implemented"));
});
