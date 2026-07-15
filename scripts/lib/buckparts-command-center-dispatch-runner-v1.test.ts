import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
  COMMAND_CENTER_DISPATCH_RUNS_DIR_REL_V1,
  runBuckpartsCommandCenterDispatchRunnerV1,
} from "./buckparts-command-center-dispatch-runner-v1";

const REPO_ROOT = process.cwd();

function tempDispatchRunsDir(): string {
  const root = mkdtempSync(path.join(tmpdir(), "cc-dispatch-runs-"));
  const dir = path.join(root, COMMAND_CENTER_DISPATCH_RUNS_DIR_REL_V1);
  return dir;
}

function fakeReportWithDispatch(overrides: Record<string, unknown>): any {
  return {
    report_name: "buckparts_command_center_v1",
    generated_at: "2026-05-25T00:00:00.000Z",
    read_only: true,
    data_mutation: false,
    next_best_action: "x",
    why_this_action: "x",
    execution_guidance: {
      next_move_mode: "READ_ONLY",
      next_move_command: "x",
      mutating_blocked: true,
      mutating_block_reasons: [],
      staleness_or_dirty_risk: [],
    },
    system_health_summary: { status: "OK", reasons: [], recommended_next_step: "x" },
    affiliate_readiness_summary: {
      approved_count: 1,
      pending_count: 0,
      pending_network_or_programs: [],
      repairclinic_status: "DRAFTING",
      affiliate_approval_pending: false,
    },
    top_money_queue: { runtime_status: "OK", next_best_action: "x", blocked_reasons: [] },
    recent_learning_outcomes: {
      frigidaire_dead_oem_outcome: { all_resolved: true, unresolved_count: 0, recommended_next_action: "x" },
      evidence_files: [],
    },
    blocked_link_summary: {
      total_blocked_links: 0,
      top_blocked_state: "UNKNOWN",
      top_blocked_retailer_key: "UNKNOWN",
      recommended_first_action: "x",
    },
    search_and_click_intelligence_summary: { runtime_status: "OK" },
    money_funnel_summary: { runtime_status: "OK" },
    rescue_velocity_summary: { runtime_status: "OK" },
    rescue_delta_trend_summary: { runtime_status: "OK" },
    amazon_first_blocked_queue_summary: {
      runtime_status: "OK",
      source_report: "x",
      top_candidate_count: 0,
      needs_amazon_search_count: 0,
      unknown_evidence_deferred_count: 0,
      deferred_unknown_top_tokens: [],
      top_5_tokens: [],
      recommended_next_action: "x",
    },
    operator_can_be_away_status: "PROCEED_WITH_KNOWN_LIMITS",
    known_unknowns: [],
    owner_command_center_neurons: { contract: "owner_command_center_neurons_v1", read_only: true, data_mutation: false },
    command_center_v2: {
      schema_version: "1",
      generated_at: "2026-05-25T00:00:00.000Z",
      read_only: true,
      data_mutation: false,
      batch_production_operating_dispatch_v1: {
        contract: "batch_production_operating_dispatch_v1",
        read_only: true,
        data_mutation: false,
        runtime_status: "ATTENTION",
        dispatch_status: "READY",
        current_stage_id: "supabase_parity_applied",
        next_stage_id: "production_runtime_smoke_complete",
        selected_subsystem: "supabase_parity_apply_proof",
        exact_command:
          "npx tsx scripts/apply-air-purifier-supabase-parity-v1.ts --plan data/air-purifier/batch-production/apply-plans-batch-v2/ap-apply-plan-batch-v2.json",
        command_surface: "terminal",
        allowed_mutations: ["parity_dry_run_read_only"],
        forbidden_mutations: ["product_csv_write"],
        owner_approval_required: false,
        mutation_allowed: false,
        proof_required_before_execution: "x",
        expected_artifact_paths: [],
        success_transition: "x",
        failure_transition: "x",
        why_this_is_next: "x",
        blocked_reasons: [],
        expansion_blocked: true,
        derived_from_checklist_contract: "batch_production_operating_checklist_v1",
        ...overrides,
      },
    },
  };
}

test("runner refuses OWNER_REVIEW_REQUIRED dispatch and writes artifact", async () => {
  const dispatchRunsDir = tempDispatchRunsDir();
  const fixedNow = new Date("2026-05-25T00:00:00.000Z");
  try {
    const res = await runBuckpartsCommandCenterDispatchRunnerV1({
      rootDir: REPO_ROOT,
      dispatchRunsDirRel: dispatchRunsDir,
      now: () => fixedNow,
      reportBuilder: async () => fakeReportWithDispatch({ dispatch_status: "OWNER_REVIEW_REQUIRED" }),
      exec: async () => {
        throw new Error("exec should not run when refused");
      },
    });
    assert.ok(res.artifact_abs_path.startsWith(dispatchRunsDir));
    assert.equal(res.artifact.read_only, true);
    assert.equal(res.artifact.data_mutation, false);
    assert.equal(res.artifact.execution_status, "REFUSED");
    assert.equal(res.artifact.execution_allowed, false);
    assert.ok(res.artifact.blocked_reasons.some((r) => r.includes("dispatch_status must be READY")));
  } finally {
    rmSync(path.dirname(path.dirname(path.dirname(dispatchRunsDir))), { recursive: true, force: true });
  }
});

test("runner refuses --apply, git push/commit, and mutation patterns", async () => {
  const dispatchRunsDir = tempDispatchRunsDir();
  const fixedNow = new Date("2026-05-25T00:00:01.000Z");
  try {
    const res = await runBuckpartsCommandCenterDispatchRunnerV1({
      rootDir: REPO_ROOT,
      dispatchRunsDirRel: dispatchRunsDir,
      now: () => fixedNow,
      reportBuilder: async () =>
        fakeReportWithDispatch({
          exact_command: "npx tsx scripts/apply-air-purifier-supabase-parity-v1.ts --apply --plan x",
        }),
      exec: async () => ({ stdout: "", stderr: "", exitCode: 0 }),
    });
    const reasons = res.artifact.blocked_reasons.join(" ");
    assert.match(reasons, /forbidden patterns/i);
  } finally {
    rmSync(path.dirname(path.dirname(path.dirname(dispatchRunsDir))), { recursive: true, force: true });
  }
});

test("runner refuses git push/commit commands", async () => {
  const dispatchRunsDir = tempDispatchRunsDir();
  const fixedNow = new Date("2026-05-25T00:00:01.500Z");
  try {
    const res = await runBuckpartsCommandCenterDispatchRunnerV1({
      rootDir: REPO_ROOT,
      dispatchRunsDirRel: dispatchRunsDir,
      now: () => fixedNow,
      reportBuilder: async () => fakeReportWithDispatch({ exact_command: "git push origin main" }),
      exec: async () => ({ stdout: "", stderr: "", exitCode: 0 }),
    });
    const reasons = res.artifact.blocked_reasons.join(" ");
    assert.match(reasons, /git push/i);
  } finally {
    rmSync(path.dirname(path.dirname(path.dirname(dispatchRunsDir))), { recursive: true, force: true });
  }
});

test("runner executes allowlisted command when dispatch is READY (mocked)", async () => {
  const dispatchRunsDir = tempDispatchRunsDir();
  const fixedNow = new Date("2026-05-25T00:00:02.000Z");
  let executed: string | null = null;
  const allowlisted =
    "npx tsx scripts/apply-air-purifier-supabase-parity-v1.ts --plan data/air-purifier/batch-production/apply-plans-batch-v2/ap-apply-plan-batch-v2.json";
  try {
    const res = await runBuckpartsCommandCenterDispatchRunnerV1({
      rootDir: REPO_ROOT,
      dispatchRunsDirRel: dispatchRunsDir,
      now: () => fixedNow,
      reportBuilder: async () => fakeReportWithDispatch({ exact_command: allowlisted }),
      exec: async (cmd) => {
        executed = cmd;
        return { stdout: "{\"ok\":true}", stderr: "", exitCode: 0 };
      },
    });
    assert.equal(executed, allowlisted);
    assert.equal(res.artifact.execution_status, "EXECUTED");
    assert.equal(res.artifact.execution_allowed, true);
    assert.deepEqual(res.artifact.parsed_json_summary, { ok: true });
  } finally {
    rmSync(path.dirname(path.dirname(path.dirname(dispatchRunsDir))), { recursive: true, force: true });
  }
});

test("runner prefers GE MWFP/XWFE spine READY exact_command over batch dispatch", async () => {
  const dispatchRunsDir = tempDispatchRunsDir();
  const fixedNow = new Date("2026-05-25T00:00:04.000Z");
  const geCmd =
    "npm run buckparts:fridge-model-pdp-ge-mwfp-xwfe-retailer-links-supabase-sync-owner-review -- --write-artifacts";
  let executed: string | null = null;
  try {
    const base = fakeReportWithDispatch({});
    base.command_center_v2.fridge_truth_spine_v1 = {
      contract: "fridge_truth_spine_v1",
      ge_mwfp_xwfe_retailer_links_supabase_sync: {
        dispatch_status: "READY",
        exact_command: geCmd,
        command_surface: "terminal",
        mutation_allowed: false,
        supabase_write_authorized: false,
        selected_subsystem: "ge_mwfp_xwfe_retailer_links_supabase_sync_owner_review",
        success_transition: "owner-review drafts written",
        failure_transition: "remain drifted",
      },
    };
    const res = await runBuckpartsCommandCenterDispatchRunnerV1({
      rootDir: REPO_ROOT,
      dispatchRunsDirRel: dispatchRunsDir,
      now: () => fixedNow,
      reportBuilder: async () => base,
      exec: async (cmd) => {
        executed = cmd;
        return { stdout: "{\"ok\":true,\"contract\":\"ge_sync_owner_review\"}", stderr: "", exitCode: 0 };
      },
    });
    assert.equal(executed, geCmd);
    assert.equal(res.artifact.execution_status, "EXECUTED");
    assert.equal(res.artifact.exact_command, geCmd);
    assert.equal(
      res.artifact.selected_subsystem,
      "ge_mwfp_xwfe_retailer_links_supabase_sync_owner_review",
    );
  } finally {
    rmSync(path.dirname(path.dirname(path.dirname(dispatchRunsDir))), { recursive: true, force: true });
  }
});

test("runner does not mutate product CSV", async () => {
  const dispatchRunsDir = tempDispatchRunsDir();
  const before = readFileSync(`${REPO_ROOT}/data/air-purifier/retailer_links.csv`, "utf8");
  try {
    await runBuckpartsCommandCenterDispatchRunnerV1({
      rootDir: REPO_ROOT,
      dispatchRunsDirRel: dispatchRunsDir,
      now: () => new Date("2026-05-25T00:00:03.000Z"),
      reportBuilder: async () =>
        fakeReportWithDispatch({
          exact_command:
            "npx tsx scripts/apply-air-purifier-supabase-parity-v1.ts --plan data/air-purifier/batch-production/apply-plans-batch-v2/ap-apply-plan-batch-v2.json",
        }),
      exec: async () => ({ stdout: "", stderr: "", exitCode: 0 }),
    });
    const after = readFileSync(`${REPO_ROOT}/data/air-purifier/retailer_links.csv`, "utf8");
    assert.equal(before, after);
  } finally {
    rmSync(path.dirname(path.dirname(path.dirname(dispatchRunsDir))), { recursive: true, force: true });
  }
});

test("runner executes allowlisted demand_to_coverage_next_lane when command_surface=terminal", async () => {
  const dispatchRunsDir = tempDispatchRunsDir();
  const fixedNow = new Date("2026-07-15T04:00:00.000Z");
  const demandCmd = "npx tsx scripts/report-buckparts-demand-to-coverage-next-lane.ts";
  let executed: string | null = null;
  try {
    const res = await runBuckpartsCommandCenterDispatchRunnerV1({
      rootDir: REPO_ROOT,
      dispatchRunsDirRel: dispatchRunsDir,
      now: () => fixedNow,
      reportBuilder: async () =>
        fakeReportWithDispatch({
          selected_subsystem: "demand_to_coverage_next_lane",
          exact_command: demandCmd,
          command_surface: "terminal",
          dispatch_status: "READY",
          mutation_allowed: false,
        }),
      exec: async (cmd) => {
        executed = cmd;
        return {
          stdout: '{"contract":"demand_to_coverage_next_lane_v1","ok":true}',
          stderr: "",
          exitCode: 0,
        };
      },
    });
    assert.equal(executed, demandCmd);
    assert.equal(res.artifact.execution_status, "EXECUTED");
    assert.equal(res.artifact.execution_allowed, true);
    assert.equal(res.artifact.selected_subsystem, "demand_to_coverage_next_lane");
    assert.equal(res.artifact.exact_command, demandCmd);
    assert.equal(res.artifact.read_only, true);
    assert.equal(res.artifact.data_mutation, false);
  } finally {
    rmSync(path.dirname(path.dirname(path.dirname(dispatchRunsDir))), { recursive: true, force: true });
  }
});

test("runner refuses missing command_surface", async () => {
  const dispatchRunsDir = tempDispatchRunsDir();
  try {
    const res = await runBuckpartsCommandCenterDispatchRunnerV1({
      rootDir: REPO_ROOT,
      dispatchRunsDirRel: dispatchRunsDir,
      now: () => new Date("2026-07-15T04:00:01.000Z"),
      reportBuilder: async () =>
        fakeReportWithDispatch({
          selected_subsystem: "demand_to_coverage_next_lane",
          exact_command: "npx tsx scripts/report-buckparts-demand-to-coverage-next-lane.ts",
          command_surface: undefined,
        }),
      exec: async () => {
        throw new Error("exec should not run when surface missing");
      },
    });
    assert.equal(res.artifact.execution_status, "REFUSED");
    assert.ok(res.artifact.blocked_reasons.some((r) => r.includes("command_surface must be terminal|none")));
  } finally {
    rmSync(path.dirname(path.dirname(path.dirname(dispatchRunsDir))), { recursive: true, force: true });
  }
});

test("runner refuses non-terminal unsafe command_surface", async () => {
  const dispatchRunsDir = tempDispatchRunsDir();
  try {
    const res = await runBuckpartsCommandCenterDispatchRunnerV1({
      rootDir: REPO_ROOT,
      dispatchRunsDirRel: dispatchRunsDir,
      now: () => new Date("2026-07-15T04:00:02.000Z"),
      reportBuilder: async () =>
        fakeReportWithDispatch({
          selected_subsystem: "demand_to_coverage_next_lane",
          exact_command: "npx tsx scripts/report-buckparts-demand-to-coverage-next-lane.ts",
          command_surface: "cursor_agent",
        }),
      exec: async () => {
        throw new Error("exec should not run for cursor_agent");
      },
    });
    assert.equal(res.artifact.execution_status, "REFUSED");
    assert.ok(res.artifact.blocked_reasons.some((r) => r.includes("command_surface must be terminal|none")));
  } finally {
    rmSync(path.dirname(path.dirname(path.dirname(dispatchRunsDir))), { recursive: true, force: true });
  }
});

test("runner refuses non-allowlisted command", async () => {
  const dispatchRunsDir = tempDispatchRunsDir();
  try {
    const res = await runBuckpartsCommandCenterDispatchRunnerV1({
      rootDir: REPO_ROOT,
      dispatchRunsDirRel: dispatchRunsDir,
      now: () => new Date("2026-07-15T04:00:03.000Z"),
      reportBuilder: async () =>
        fakeReportWithDispatch({
          exact_command: "npx tsx scripts/not-allowlisted-dangerous.ts",
          command_surface: "terminal",
        }),
      exec: async () => {
        throw new Error("exec should not run for non-allowlisted");
      },
    });
    assert.equal(res.artifact.execution_status, "REFUSED");
    assert.ok(res.artifact.blocked_reasons.some((r) => r.includes("not allowlisted")));
  } finally {
    rmSync(path.dirname(path.dirname(path.dirname(dispatchRunsDir))), { recursive: true, force: true });
  }
});

test("runner refuses mutation_allowed=true even when allowlisted terminal", async () => {
  const dispatchRunsDir = tempDispatchRunsDir();
  try {
    const res = await runBuckpartsCommandCenterDispatchRunnerV1({
      rootDir: REPO_ROOT,
      dispatchRunsDirRel: dispatchRunsDir,
      now: () => new Date("2026-07-15T04:00:04.000Z"),
      reportBuilder: async () =>
        fakeReportWithDispatch({
          selected_subsystem: "demand_to_coverage_next_lane",
          exact_command: "npx tsx scripts/report-buckparts-demand-to-coverage-next-lane.ts",
          command_surface: "terminal",
          mutation_allowed: true,
        }),
      exec: async () => {
        throw new Error("exec should not run when mutation_allowed");
      },
    });
    assert.equal(res.artifact.execution_status, "REFUSED");
    assert.ok(res.artifact.blocked_reasons.some((r) => r.includes("mutation_allowed must be false")));
  } finally {
    rmSync(path.dirname(path.dirname(path.dirname(dispatchRunsDir))), { recursive: true, force: true });
  }
});

test("runner executes allowlisted AP demand-selected owner-review when command_surface=terminal", async () => {
  const dispatchRunsDir = tempDispatchRunsDir();
  const fixedNow = new Date("2026-07-15T05:00:00.000Z");
  const ownerReviewCmd =
    "npx tsx scripts/report-air-purifier-demand-selected-batch-owner-review-v1.ts";
  let executed: string | null = null;
  try {
    const res = await runBuckpartsCommandCenterDispatchRunnerV1({
      rootDir: REPO_ROOT,
      dispatchRunsDirRel: dispatchRunsDir,
      now: () => fixedNow,
      reportBuilder: async () =>
        fakeReportWithDispatch({
          selected_subsystem: "air_purifier_demand_selected_batch_owner_review",
          exact_command: ownerReviewCmd,
          command_surface: "terminal",
          dispatch_status: "READY",
          mutation_allowed: false,
        }),
      exec: async (cmd) => {
        executed = cmd;
        return {
          stdout:
            '{"contract":"air_purifier_demand_selected_batch_owner_review_v1","open_batch_proof_v1":{"open_batch_existence":"PROVEN","batch_closeout":"NOT_PROVEN","apply_readiness":"NOT_PROVEN"}}',
          stderr: "",
          exitCode: 0,
        };
      },
    });
    assert.equal(executed, ownerReviewCmd);
    assert.equal(res.artifact.execution_status, "EXECUTED");
    assert.equal(res.artifact.execution_allowed, true);
    assert.equal(res.artifact.selected_subsystem, "air_purifier_demand_selected_batch_owner_review");
    assert.equal(res.artifact.read_only, true);
    assert.equal(res.artifact.data_mutation, false);
  } finally {
    rmSync(path.dirname(path.dirname(path.dirname(dispatchRunsDir))), { recursive: true, force: true });
  }
});

test("runner does not prefer GE sync when NOT_NEEDED; demand_to_coverage terminal executes", async () => {
  const dispatchRunsDir = tempDispatchRunsDir();
  const demandCmd = "npx tsx scripts/report-buckparts-demand-to-coverage-next-lane.ts";
  let executed: string | null = null;
  try {
    const base = fakeReportWithDispatch({
      selected_subsystem: "demand_to_coverage_next_lane",
      exact_command: demandCmd,
      command_surface: "terminal",
      dispatch_status: "READY",
      mutation_allowed: false,
    });
    base.command_center_v2.fridge_truth_spine_v1 = {
      contract: "fridge_truth_spine_v1",
      ge_mwfp_xwfe_retailer_links_supabase_sync: {
        dispatch_status: "NOT_NEEDED",
        exact_command: "",
        command_surface: "none",
        mutation_allowed: false,
        supabase_write_authorized: false,
        selected_subsystem: "none",
      },
    };
    const res = await runBuckpartsCommandCenterDispatchRunnerV1({
      rootDir: REPO_ROOT,
      dispatchRunsDirRel: dispatchRunsDir,
      now: () => new Date("2026-07-15T04:00:05.000Z"),
      reportBuilder: async () => base,
      exec: async (cmd) => {
        executed = cmd;
        return { stdout: '{"ok":true}', stderr: "", exitCode: 0 };
      },
    });
    assert.equal(executed, demandCmd);
    assert.equal(res.artifact.execution_status, "EXECUTED");
    assert.equal(res.artifact.selected_subsystem, "demand_to_coverage_next_lane");
    assert.notEqual(
      res.artifact.selected_subsystem,
      "ge_mwfp_xwfe_retailer_links_supabase_sync_owner_review",
    );
  } finally {
    rmSync(path.dirname(path.dirname(path.dirname(dispatchRunsDir))), { recursive: true, force: true });
  }
});

test("runner does not prefer GE sync when NOT_NEEDED; AP owner-review terminal executes", async () => {
  const dispatchRunsDir = tempDispatchRunsDir();
  const ownerReviewCmd =
    "npx tsx scripts/report-air-purifier-demand-selected-batch-owner-review-v1.ts";
  let executed: string | null = null;
  try {
    const base = fakeReportWithDispatch({
      selected_subsystem: "air_purifier_demand_selected_batch_owner_review",
      exact_command: ownerReviewCmd,
      command_surface: "terminal",
      dispatch_status: "READY",
      mutation_allowed: false,
    });
    base.command_center_v2.fridge_truth_spine_v1 = {
      contract: "fridge_truth_spine_v1",
      ge_mwfp_xwfe_retailer_links_supabase_sync: {
        dispatch_status: "NOT_NEEDED",
        exact_command: "",
        command_surface: "none",
        mutation_allowed: false,
        supabase_write_authorized: false,
        selected_subsystem: "none",
      },
    };
    const res = await runBuckpartsCommandCenterDispatchRunnerV1({
      rootDir: REPO_ROOT,
      dispatchRunsDirRel: dispatchRunsDir,
      now: () => new Date("2026-07-15T05:00:01.000Z"),
      reportBuilder: async () => base,
      exec: async (cmd) => {
        executed = cmd;
        return { stdout: '{"ok":true}', stderr: "", exitCode: 0 };
      },
    });
    assert.equal(executed, ownerReviewCmd);
    assert.equal(res.artifact.execution_status, "EXECUTED");
    assert.equal(res.artifact.selected_subsystem, "air_purifier_demand_selected_batch_owner_review");
  } finally {
    rmSync(path.dirname(path.dirname(path.dirname(dispatchRunsDir))), { recursive: true, force: true });
  }
});
