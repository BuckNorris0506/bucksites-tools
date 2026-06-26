import assert from "node:assert/strict";
import test from "node:test";

import {
  BUCKPARTS_MCP_MANUFACTURER_RESCUE_RUNNER_CONTRACT_V1,
  manufacturerRescueBlockersV1,
  manufacturerRescueNextActionV1,
  manufacturerRescueRunnerBoardV1,
  manufacturerRescueSlugStateV1,
  projectManufacturerRescueBlockersV1,
  projectManufacturerRescueNextActionV1,
} from "./buckparts-mcp-manufacturer-rescue-runner-v1";
import {
  loadManufacturerRescueRunnerReportV1,
  MANUFACTURER_SAFE_LINK_RESCUE_RUNNER_CONTRACT_V1,
  MANUFACTURER_SAFE_LINK_RESCUE_RUNNER_JSON_REL_V1,
  type ManufacturerRescueRunnerReportV1,
  type ManufacturerRescueRunnerSlugStateV1,
} from "./manufacturer-safe-link-rescue-runner-v1";

const REPO_ROOT = process.cwd();
const deps = { rootDir: REPO_ROOT };

function assertReadOnlyEnvelope(result: {
  read_only: boolean;
  data_mutation: boolean;
  mutation_authorized: boolean;
  contract: string;
  coverage_unlocked: false;
}) {
  assert.equal(result.contract, BUCKPARTS_MCP_MANUFACTURER_RESCUE_RUNNER_CONTRACT_V1);
  assert.equal(result.read_only, true);
  assert.equal(result.data_mutation, false);
  assert.equal(result.mutation_authorized, false);
  assert.equal(result.coverage_unlocked, false);
}

function minimalSlugState(
  overrides: Partial<ManufacturerRescueRunnerSlugStateV1>,
): ManufacturerRescueRunnerSlugStateV1 {
  return {
    filter_slug: "wf3cb",
    manufacturer_key: "frigidaire",
    oem_part_token: "WF3CB",
    stage: "OWNER_REVIEW",
    execution_rank: 1,
    next_executable_action: "owner review",
    executable_now: true,
    blocked_reasons: [],
    trust_risk: "MEDIUM",
    director_value_score: 1000,
    boardy_safety_rules: ["browser_proof_freshness"],
    orchestrator_recommended_next_action: "owner review",
    coverage_unlocked: false,
    ...overrides,
  };
}

function minimalRunnerReport(
  overrides: Partial<ManufacturerRescueRunnerReportV1> = {},
): ManufacturerRescueRunnerReportV1 {
  return {
    contract: MANUFACTURER_SAFE_LINK_RESCUE_RUNNER_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    csv_apply_authorized: false,
    supabase_mutation_authorized: false,
    browser_automation_authorized: false,
    coverage_unlocked: false,
    generated_at: "2026-06-10T12:00:00.000Z",
    source_command: "npm run buckparts:manufacturer-safe-link-rescue-runner",
    director_cc_lane_contract: "manufacturer_safe_link_rescue_director_v1",
    director_source_path:
      "data/fridge/batch-production/drafts/manufacturer-safe-link-rescue-director-v1.json",
    orchestrator_source_path:
      "data/fridge/batch-production/drafts/manufacturer-safe-link-rescue-orchestrator-v1.json",
    director_generated_at: "2026-06-10T12:00:00.000Z",
    orchestrator_generated_at: "2026-06-10T12:00:00.000Z",
    ready_for_apply_slug: null,
    ready_for_apply_enforced: true,
    slug_states: [minimalSlugState({})],
    execution_order: ["wf3cb"],
    manufacturer_workloads: [],
    bottlenecks: [],
    blocker_summary: [],
    boardy_safety_contract: {
      browser_proof_freshness_required: true,
      wrong_family_validation_required: true,
      one_at_a_time_apply_enforced: true,
      reaudit_after_apply_required: true,
    },
    post_apply_validation_checklist: [],
    inspect_summary: {
      recommended_jq_paths: {
        standalone_report: ".inspect_summary",
        command_center: ".command_center_v2.manufacturer_safe_link_rescue_runner_v1",
        ready_for_apply_slug: ".ready_for_apply_slug",
        execution_order: ".execution_order",
      },
      next_executable_slug: "wf3cb",
      ready_for_apply_slug: null,
      remaining_opportunity: 1,
      recommended_next_action: "owner review wf3cb",
    },
    proven_facts: [],
    unknown_facts: [],
    ...overrides,
  };
}

test("loadManufacturerRescueRunnerReportV1 loads committed artifact when present", () => {
  const loaded = loadManufacturerRescueRunnerReportV1({ rootDir: REPO_ROOT });
  if (!loaded) {
    assert.fail("expected committed runner artifact in repo");
  }
  assert.equal(loaded.report.contract, MANUFACTURER_SAFE_LINK_RESCUE_RUNNER_CONTRACT_V1);
  assert.equal(loaded.runner_source_path, MANUFACTURER_SAFE_LINK_RESCUE_RUNNER_JSON_REL_V1);
  assert.ok(loaded.report.slug_states.length > 0);
});

test("projectManufacturerRescueNextActionV1 prefers READY_FOR_APPLY slot", () => {
  const report = minimalRunnerReport({
    ready_for_apply_slug: "ultrawf",
    slug_states: [
      minimalSlugState({
        filter_slug: "ultrawf",
        stage: "READY_FOR_APPLY",
        boardy_safety_rules: ["one_at_a_time_apply", "reaudit_after_apply"],
      }),
      minimalSlugState({ filter_slug: "wf3cb", stage: "OWNER_REVIEW", execution_rank: 2 }),
    ],
  });
  const next = projectManufacturerRescueNextActionV1(report);
  assert.equal(next.action_mode, "READY_FOR_APPLY");
  assert.equal(next.filter_slug, "ultrawf");
  assert.equal(next.stage, "READY_FOR_APPLY");
});

test("projectManufacturerRescueBlockersV1 groups BLOCKED slugs by reason", () => {
  const report = minimalRunnerReport({
    slug_states: [
      minimalSlugState({
        filter_slug: "mwf",
        stage: "BLOCKED",
        blocked_reasons: ["known_broken_destination"],
        executable_now: false,
      }),
      minimalSlugState({
        filter_slug: "xwf",
        stage: "BLOCKED",
        blocked_reasons: ["supersession_review_required"],
        executable_now: false,
      }),
    ],
  });
  const blockers = projectManufacturerRescueBlockersV1(report);
  assert.equal(blockers.blocked_slug_count, 2);
  assert.equal(blockers.by_blocker_reason.length, 2);
});

test("manufacturer_rescue_next_action returns PROVEN from committed artifact", () => {
  const result = manufacturerRescueNextActionV1(deps);
  assertReadOnlyEnvelope(result);
  assert.equal(result.tool, "manufacturer_rescue_next_action");
  assert.equal(result.truth_status, "PROVEN");
  assert.equal(result.ready_for_apply_enforced, true);
  assert.ok(result.repo_paths_read.includes(MANUFACTURER_SAFE_LINK_RESCUE_RUNNER_JSON_REL_V1));
  if (result.ready_for_apply_slug) {
    assert.equal(result.action_mode, "READY_FOR_APPLY");
    assert.equal(result.filter_slug, result.ready_for_apply_slug);
  }
});

test("manufacturer_rescue_runner_board returns stage counts and workloads", () => {
  const result = manufacturerRescueRunnerBoardV1(deps);
  assertReadOnlyEnvelope(result);
  assert.equal(result.tool, "manufacturer_rescue_runner_board");
  assert.equal(result.truth_status, "PROVEN");
  assert.ok(result.execution_order.length > 0);
  assert.ok(typeof result.remaining_opportunity === "number");
  assert.ok(result.boardy_safety_contract?.one_at_a_time_apply_enforced);
});

test("manufacturer_rescue_slug_state returns slug row or UNKNOWN", () => {
  const loaded = loadManufacturerRescueRunnerReportV1({ rootDir: REPO_ROOT });
  assert.ok(loaded);
  const sampleSlug = loaded.report.slug_states[0]?.filter_slug;
  assert.ok(sampleSlug);

  const proven = manufacturerRescueSlugStateV1(deps, sampleSlug);
  assertReadOnlyEnvelope(proven);
  assert.equal(proven.truth_status, "PROVEN");
  assert.equal(proven.slug_state?.filter_slug, sampleSlug);

  const unknown = manufacturerRescueSlugStateV1(deps, "not-a-real-buckparts-slug-xyz");
  assertReadOnlyEnvelope(unknown);
  assert.equal(unknown.truth_status, "UNKNOWN");
  assert.equal(unknown.slug_state, null);
});

test("manufacturer_rescue_blockers returns BLOCKED grouping", () => {
  const result = manufacturerRescueBlockersV1(deps);
  assertReadOnlyEnvelope(result);
  assert.equal(result.tool, "manufacturer_rescue_blockers");
  assert.equal(result.truth_status, "PROVEN");
  assert.ok(Array.isArray(result.by_blocker_reason));
  assert.ok(Array.isArray(result.runner_blocker_summary));
});

test("manufacturer_rescue tools fail closed when artifact missing", () => {
  const missingDeps = { rootDir: "/tmp/buckparts-mcp-runner-missing-artifact-xyz" };
  const next = manufacturerRescueNextActionV1(missingDeps);
  assert.equal(next.truth_status, "UNKNOWN");
  assert.equal(next.action_mode, "UNKNOWN");
  const board = manufacturerRescueRunnerBoardV1(missingDeps);
  assert.equal(board.truth_status, "UNKNOWN");
  assert.equal(board.execution_order.length, 0);
});
