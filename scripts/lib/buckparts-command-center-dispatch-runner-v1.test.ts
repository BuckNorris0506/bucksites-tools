import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
  COMMAND_CENTER_DISPATCH_RUNS_DIR_REL_V1,
  runBuckpartsCommandCenterDispatchRunnerV1,
} from "./buckparts-command-center-dispatch-runner-v1";
import { lookupDispatchAllowlistEntryV1 } from "./buckparts-command-center-dispatch-allowlist-v1";

const REPO_ROOT = process.cwd();

const BOUND_PROVENANCE = {
  provenance_status: "BOUND_TO_SOURCE_COMMIT" as const,
  base_commit: "abc1234",
  source_commit: "abc1234",
  worktree_clean: true,
};

const AP_PARITY_CMD =
  "npx tsx scripts/apply-air-purifier-supabase-parity-v1.ts --plan data/air-purifier/batch-production/apply-plans-batch-v2/ap-apply-plan-batch-v2.json";

function tempDispatchRunsDir(): string {
  const root = mkdtempSync(path.join(tmpdir(), "cc-dispatch-runs-"));
  const dir = path.join(root, COMMAND_CENTER_DISPATCH_RUNS_DIR_REL_V1);
  return dir;
}

function matchingMetaFields(exact_command: string): Record<string, unknown> {
  const meta = lookupDispatchAllowlistEntryV1(exact_command);
  if (!meta) return {};
  return {
    selected_subsystem: meta.selected_subsystem,
    owner_review_required: meta.owner_review_required,
    command_kind: meta.command_kind,
    artifact_write_behavior: meta.artifact_write_behavior,
    no_artifact_allowed: meta.no_artifact_allowed,
    mutation_allowed: meta.mutation_posture.mutation_allowed,
  };
}

function fakeReportWithDispatch(overrides: Record<string, unknown>): any {
  const exact =
    typeof overrides.exact_command === "string" ? overrides.exact_command : AP_PARITY_CMD;
  const metaFields = matchingMetaFields(exact);
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
        exact_command: AP_PARITY_CMD,
        command_surface: "terminal",
        allowed_mutations: ["parity_dry_run_read_only"],
        forbidden_mutations: ["product_csv_write"],
        owner_approval_required: false,
        proof_required_before_execution: "x",
        expected_artifact_paths: [],
        success_transition: "x",
        failure_transition: "x",
        why_this_is_next: "x",
        blocked_reasons: [],
        expansion_blocked: true,
        derived_from_checklist_contract: "batch_production_operating_checklist_v1",
        ...metaFields,
        ...overrides,
        // Keep subsystem aligned with allowlist unless the test intentionally mismatches it.
        selected_subsystem:
          typeof overrides.selected_subsystem === "string"
            ? overrides.selected_subsystem
            : (metaFields.selected_subsystem as string) ?? "parity:ap_supabase_plan",
      },
    },
  };
}

function matchingCanonical(exact_command: string, overrides: Record<string, unknown> = {}) {
  const meta = lookupDispatchAllowlistEntryV1(exact_command)!;
  return {
    command_executable: !meta.owner_review_required,
    exact_command,
    selected_subsystem: meta.selected_subsystem,
    dispatch_status: meta.owner_review_required ? "OWNER_REVIEW_REQUIRED" : "READY",
    steering_override_source: "batch_dispatch",
    owner_review_required: meta.owner_review_required,
    command_kind: meta.command_kind,
    artifact_write_behavior: meta.artifact_write_behavior,
    no_artifact_allowed: meta.no_artifact_allowed,
    mutation_posture: { ...meta.mutation_posture },
    blockers: meta.owner_review_required ? ["owner_review_required"] : [],
    ...overrides,
  };
}

test("runner refuses OWNER_REVIEW_REQUIRED dispatch and writes artifact", async () => {
  const dispatchRunsDir = tempDispatchRunsDir();
  const fixedNow = new Date("2026-05-25T00:00:00.000Z");
  try {
    const res = await runBuckpartsCommandCenterDispatchRunnerV1({
      rootDir: REPO_ROOT,
      provenanceResolver: () => BOUND_PROVENANCE,
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
      provenanceResolver: () => BOUND_PROVENANCE,
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
      provenanceResolver: () => BOUND_PROVENANCE,
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
      provenanceResolver: () => BOUND_PROVENANCE,
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
    // Terminal EXECUTED: further execution not allowed (idempotent complete).
    assert.equal(res.artifact.execution_allowed, false);
    assert.deepEqual(res.artifact.parsed_json_summary, { ok: true });
  } finally {
    rmSync(path.dirname(path.dirname(path.dirname(dispatchRunsDir))), { recursive: true, force: true });
  }
});

test("runner does not substitute GE spine when canonical decision selects batch command", async () => {
  const dispatchRunsDir = tempDispatchRunsDir();
  const fixedNow = new Date("2026-05-25T00:00:04.000Z");
  const geCmd =
    "npm run buckparts:fridge-model-pdp-ge-mwfp-xwfe-retailer-links-supabase-sync-owner-review -- --write-artifacts";
  const batchCmd =
    "npx tsx scripts/apply-air-purifier-supabase-parity-v1.ts --plan data/air-purifier/batch-production/apply-plans-batch-v2/ap-apply-plan-batch-v2.json";
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
    base.command_center_v2.canonical_final_operating_decision_v1 = matchingCanonical(batchCmd, {
      steering_override_source: "batch_dispatch",
    });
    const res = await runBuckpartsCommandCenterDispatchRunnerV1({
      rootDir: REPO_ROOT,
      provenanceResolver: () => BOUND_PROVENANCE,
      dispatchRunsDirRel: dispatchRunsDir,
      now: () => fixedNow,
      reportBuilder: async () => base,
      exec: async (cmd) => {
        executed = cmd;
        return { stdout: "{\"ok\":true}", stderr: "", exitCode: 0 };
      },
    });
    assert.equal(executed, batchCmd);
    assert.notEqual(executed, geCmd);
    assert.equal(res.artifact.exact_command, batchCmd);
  } finally {
    rmSync(path.dirname(path.dirname(path.dirname(dispatchRunsDir))), { recursive: true, force: true });
  }
});

test("runner refuses GE owner-review even if mis-shaped canonical claims READY", async () => {
  const dispatchRunsDir = tempDispatchRunsDir();
  const fixedNow = new Date("2026-05-25T00:00:05.000Z");
  const geCmd =
    "npm run buckparts:fridge-model-pdp-ge-mwfp-xwfe-retailer-links-supabase-sync-owner-review -- --write-artifacts";
  let execCount = 0;
  try {
    const base = fakeReportWithDispatch({});
    base.command_center_v2.canonical_final_operating_decision_v1 = matchingCanonical(geCmd, {
      // Adversarial mis-shape: claim READY/executable despite owner-review allowlist.
      command_executable: true,
      dispatch_status: "READY",
      steering_override_source: "root_resolve",
    });
    const res = await runBuckpartsCommandCenterDispatchRunnerV1({
      rootDir: REPO_ROOT,
      provenanceResolver: () => BOUND_PROVENANCE,
      dispatchRunsDirRel: dispatchRunsDir,
      now: () => fixedNow,
      reportBuilder: async () => base,
      exec: async () => {
        execCount += 1;
        throw new Error("must not exec owner-review");
      },
    });
    assert.equal(execCount, 0);
    assert.equal(res.artifact.execution_status, "REFUSED");
    assert.ok(
      res.artifact.blocked_reasons.some((b) => b.includes("owner_review_required")),
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
      provenanceResolver: () => BOUND_PROVENANCE,
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
      provenanceResolver: () => BOUND_PROVENANCE,
      dispatchRunsDirRel: dispatchRunsDir,
      now: () => fixedNow,
      reportBuilder: async () =>
        fakeReportWithDispatch({
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
    assert.equal(res.artifact.execution_allowed, false);
    assert.equal(res.artifact.selected_subsystem, "steering:demand_to_coverage");
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
      provenanceResolver: () => BOUND_PROVENANCE,
      dispatchRunsDirRel: dispatchRunsDir,
      now: () => new Date("2026-07-15T04:00:01.000Z"),
      reportBuilder: async () =>
        fakeReportWithDispatch({
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
      provenanceResolver: () => BOUND_PROVENANCE,
      dispatchRunsDirRel: dispatchRunsDir,
      now: () => new Date("2026-07-15T04:00:02.000Z"),
      reportBuilder: async () =>
        fakeReportWithDispatch({
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
      provenanceResolver: () => BOUND_PROVENANCE,
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
      provenanceResolver: () => BOUND_PROVENANCE,
      dispatchRunsDirRel: dispatchRunsDir,
      now: () => new Date("2026-07-15T04:00:04.000Z"),
      reportBuilder: async () =>
        fakeReportWithDispatch({
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

test("runner refuses AP demand-selected owner-review (subprocess_calls=0)", async () => {
  const dispatchRunsDir = tempDispatchRunsDir();
  const fixedNow = new Date("2026-07-15T05:00:00.000Z");
  const ownerReviewCmd =
    "npx tsx scripts/report-air-purifier-demand-selected-batch-owner-review-v1.ts";
  let execCount = 0;
  try {
    const base = fakeReportWithDispatch({});
    base.command_center_v2.canonical_final_operating_decision_v1 = matchingCanonical(
      ownerReviewCmd,
      { steering_override_source: "demand_to_coverage" },
    );
    const res = await runBuckpartsCommandCenterDispatchRunnerV1({
      rootDir: REPO_ROOT,
      provenanceResolver: () => BOUND_PROVENANCE,
      dispatchRunsDirRel: dispatchRunsDir,
      now: () => fixedNow,
      reportBuilder: async () => base,
      exec: async () => {
        execCount += 1;
        throw new Error("must not exec owner-review");
      },
    });
    assert.equal(execCount, 0);
    assert.equal(res.artifact.execution_status, "REFUSED");
    assert.equal(res.artifact.dispatch_status_before, "OWNER_REVIEW_REQUIRED");
    assert.ok(res.artifact.blocked_reasons.some((b) => /owner_review|OWNER_REVIEW/i.test(b)));
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
      provenanceResolver: () => BOUND_PROVENANCE,
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
    assert.equal(res.artifact.selected_subsystem, "steering:demand_to_coverage");
    assert.notEqual(
      res.artifact.selected_subsystem,
      "owner_review:ge_mwfp_xwfe_supabase_sync",
    );
  } finally {
    rmSync(path.dirname(path.dirname(path.dirname(dispatchRunsDir))), { recursive: true, force: true });
  }
});

test("runner executes allowlisted AP closeout/readiness proof when command_surface=terminal", async () => {
  const dispatchRunsDir = tempDispatchRunsDir();
  const cmd =
    "npx tsx scripts/report-air-purifier-demand-selected-batch-closeout-readiness-proof-v1.ts";
  let executed: string | null = null;
  try {
    const base = fakeReportWithDispatch({
      exact_command: cmd,
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
      provenanceResolver: () => BOUND_PROVENANCE,
      dispatchRunsDirRel: dispatchRunsDir,
      now: () => new Date("2026-07-15T05:30:00.000Z"),
      reportBuilder: async () => base,
      exec: async (c) => {
        executed = c;
        return {
          stdout:
            '{"contract":"ap_demand_selected_batch_closeout_readiness_proof_v1","batch_closeout":"NOT_PROVEN","apply_readiness":"NOT_PROVEN","hard_stop":true}',
          stderr: "",
          exitCode: 0,
        };
      },
    });
    assert.equal(executed, cmd);
    assert.equal(res.artifact.execution_status, "EXECUTED");
    assert.equal(res.artifact.selected_subsystem, "proof:ap_closeout_readiness");
  } finally {
    rmSync(path.dirname(path.dirname(path.dirname(dispatchRunsDir))), { recursive: true, force: true });
  }
});
