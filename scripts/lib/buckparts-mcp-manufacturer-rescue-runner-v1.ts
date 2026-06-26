/**
 * BuckParts Truth MCP v2 — manufacturer safe-link rescue runner intelligence (read-only).
 * Projects committed runner + Command Center jq paths only; no live runner rebuild.
 */

import type { BuckPartsMcpDepsV1 } from "./buckparts-mcp-truth-context-v1";
import {
  loadManufacturerRescueRunnerReportV1,
  MANUFACTURER_SAFE_LINK_RESCUE_RUNNER_BOARD_MD_REL_V1,
  MANUFACTURER_SAFE_LINK_RESCUE_RUNNER_CONTRACT_V1,
  MANUFACTURER_SAFE_LINK_RESCUE_RUNNER_JSON_REL_V1,
  MANUFACTURER_SAFE_LINK_RESCUE_RUNNER_SOURCE_COMMAND_V1,
  MANUFACTURER_SAFE_LINK_RESCUE_RUNNER_STAGES_V1,
  type ManufacturerRescueRunnerReportV1,
  type ManufacturerRescueRunnerSlugStateV1,
  type ManufacturerRescueRunnerStageV1,
} from "./manufacturer-safe-link-rescue-runner-v1";

type McpReadOnlyEnvelopeV1 = {
  read_only: true;
  data_mutation: false;
  mutation_authorized: false;
};

export const BUCKPARTS_MCP_MANUFACTURER_RESCUE_RUNNER_CONTRACT_V1 =
  "buckparts_mcp_manufacturer_rescue_runner_v1" as const;

export const MANUFACTURER_RESCUE_RUNNER_CC_JQ_PATH_V1 =
  ".command_center_v2.manufacturer_safe_link_rescue_runner_v1" as const;

export const MANUFACTURER_RESCUE_DIRECTOR_CC_JQ_PATH_V1 =
  ".command_center_v2.manufacturer_safe_link_rescue_director_v1" as const;

type RunnerArtifactLoadV1 =
  | {
      ok: true;
      report: ManufacturerRescueRunnerReportV1;
      runner_source_path: string;
      runner_board_source_path: string;
    }
  | {
      ok: false;
      truth_status: "UNKNOWN";
      repo_paths_read: string[];
      truth_note: string;
    };

function envelope(): McpReadOnlyEnvelopeV1 & {
  contract: typeof BUCKPARTS_MCP_MANUFACTURER_RESCUE_RUNNER_CONTRACT_V1;
} {
  return {
    contract: BUCKPARTS_MCP_MANUFACTURER_RESCUE_RUNNER_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
  };
}

function loadRunnerArtifact(deps: BuckPartsMcpDepsV1): RunnerArtifactLoadV1 {
  const loaded = loadManufacturerRescueRunnerReportV1({ rootDir: deps.rootDir });
  if (!loaded) {
    return {
      ok: false,
      truth_status: "UNKNOWN",
      repo_paths_read: [MANUFACTURER_SAFE_LINK_RESCUE_RUNNER_JSON_REL_V1],
      truth_note: `Committed runner artifact missing or invalid. Run ${MANUFACTURER_SAFE_LINK_RESCUE_RUNNER_SOURCE_COMMAND_V1} locally; MCP does not rebuild runner or Command Center.`,
    };
  }
  return {
    ok: true,
    report: loaded.report,
    runner_source_path: loaded.runner_source_path,
    runner_board_source_path: loaded.runner_board_source_path,
  };
}

function normalizeSlug(slug: string): string {
  return slug.trim().toLowerCase();
}

function findSlugState(
  report: ManufacturerRescueRunnerReportV1,
  slug: string,
): ManufacturerRescueRunnerSlugStateV1 | null {
  return report.slug_states.find((s) => normalizeSlug(s.filter_slug) === normalizeSlug(slug)) ?? null;
}

function stageCountsFromReport(
  report: ManufacturerRescueRunnerReportV1,
): Record<ManufacturerRescueRunnerStageV1, number> {
  const counts = Object.fromEntries(
    MANUFACTURER_SAFE_LINK_RESCUE_RUNNER_STAGES_V1.map((s) => [s, 0]),
  ) as Record<ManufacturerRescueRunnerStageV1, number>;
  for (const state of report.slug_states) {
    counts[state.stage] += 1;
  }
  return counts;
}

export function projectManufacturerRescueNextActionV1(
  report: ManufacturerRescueRunnerReportV1,
): {
  action_mode: "READY_FOR_APPLY" | "NEXT_EXECUTABLE" | "NO_EXECUTABLE";
  filter_slug: string | "UNKNOWN";
  stage: ManufacturerRescueRunnerStageV1 | "UNKNOWN";
  next_executable_action: string;
  ready_for_apply_slug: string | null;
  ready_for_apply_enforced: true;
  boardy_safety_rules: ManufacturerRescueRunnerSlugStateV1["boardy_safety_rules"];
} {
  if (report.ready_for_apply_slug) {
    const state = findSlugState(report, report.ready_for_apply_slug);
    return {
      action_mode: "READY_FOR_APPLY",
      filter_slug: report.ready_for_apply_slug,
      stage: "READY_FOR_APPLY",
      next_executable_action:
        state?.next_executable_action ??
        "Single guarded apply slot — owner-approved CSV apply executor may run for this slug only; re-audit required immediately after apply.",
      ready_for_apply_slug: report.ready_for_apply_slug,
      ready_for_apply_enforced: true,
      boardy_safety_rules: state?.boardy_safety_rules ?? ["one_at_a_time_apply", "reaudit_after_apply"],
    };
  }

  const nextState =
    report.slug_states.find((s) => s.executable_now && s.stage !== "COMPLETE") ??
    (report.inspect_summary.next_executable_slug !== "UNKNOWN"
      ? findSlugState(report, report.inspect_summary.next_executable_slug)
      : null);

  if (!nextState) {
    return {
      action_mode: "NO_EXECUTABLE",
      filter_slug: "UNKNOWN",
      stage: "UNKNOWN",
      next_executable_action: report.inspect_summary.recommended_next_action,
      ready_for_apply_slug: null,
      ready_for_apply_enforced: true,
      boardy_safety_rules: [],
    };
  }

  return {
    action_mode: "NEXT_EXECUTABLE",
    filter_slug: nextState.filter_slug,
    stage: nextState.stage,
    next_executable_action: nextState.next_executable_action,
    ready_for_apply_slug: null,
    ready_for_apply_enforced: true,
    boardy_safety_rules: nextState.boardy_safety_rules,
  };
}

export function projectManufacturerRescueBlockersV1(report: ManufacturerRescueRunnerReportV1): {
  blocked_slug_count: number;
  by_blocker_reason: Array<{
    reason: string;
    slug_count: number;
    filter_slugs: string[];
  }>;
} {
  const blockedStates = report.slug_states.filter((s) => s.stage === "BLOCKED");
  const byReason = new Map<string, string[]>();
  for (const state of blockedStates) {
    const reasons =
      state.blocked_reasons.length > 0 ? state.blocked_reasons : ["UNKNOWN_BLOCKER"];
    for (const reason of reasons) {
      const list = byReason.get(reason) ?? [];
      list.push(state.filter_slug);
      byReason.set(reason, list);
    }
  }
  const by_blocker_reason = Array.from(byReason.entries())
    .map(([reason, slugs]) => ({
      reason,
      slug_count: slugs.length,
      filter_slugs: Array.from(new Set(slugs)).sort(),
    }))
    .sort((a, b) => b.slug_count - a.slug_count || a.reason.localeCompare(b.reason));

  return {
    blocked_slug_count: blockedStates.length,
    by_blocker_reason,
  };
}

export type ManufacturerRescueNextActionResultV1 = McpReadOnlyEnvelopeV1 & {
  contract: typeof BUCKPARTS_MCP_MANUFACTURER_RESCUE_RUNNER_CONTRACT_V1;
  tool: "manufacturer_rescue_next_action";
  truth_status: "PROVEN" | "UNKNOWN";
  runner_contract: typeof MANUFACTURER_SAFE_LINK_RESCUE_RUNNER_CONTRACT_V1 | "UNKNOWN";
  command_center_jq_path: typeof MANUFACTURER_RESCUE_RUNNER_CC_JQ_PATH_V1;
  director_command_center_jq_path: typeof MANUFACTURER_RESCUE_DIRECTOR_CC_JQ_PATH_V1;
  runner_generated_at: string | "UNKNOWN";
  director_generated_at: string | "UNKNOWN";
  orchestrator_generated_at: string | "UNKNOWN";
  action_mode: "READY_FOR_APPLY" | "NEXT_EXECUTABLE" | "NO_EXECUTABLE" | "UNKNOWN";
  filter_slug: string | "UNKNOWN";
  stage: ManufacturerRescueRunnerStageV1 | "UNKNOWN";
  next_executable_action: string;
  ready_for_apply_slug: string | null;
  ready_for_apply_enforced: true;
  boardy_safety_rules: ManufacturerRescueRunnerSlugStateV1["boardy_safety_rules"];
  coverage_unlocked: false;
  repo_paths_read: string[];
  truth_note: string;
};

export type ManufacturerRescueRunnerBoardResultV1 = McpReadOnlyEnvelopeV1 & {
  contract: typeof BUCKPARTS_MCP_MANUFACTURER_RESCUE_RUNNER_CONTRACT_V1;
  tool: "manufacturer_rescue_runner_board";
  truth_status: "PROVEN" | "UNKNOWN";
  runner_contract: typeof MANUFACTURER_SAFE_LINK_RESCUE_RUNNER_CONTRACT_V1 | "UNKNOWN";
  command_center_jq_path: typeof MANUFACTURER_RESCUE_RUNNER_CC_JQ_PATH_V1;
  runner_generated_at: string | "UNKNOWN";
  director_generated_at: string | "UNKNOWN";
  orchestrator_generated_at: string | "UNKNOWN";
  ready_for_apply_slug: string | null;
  ready_for_apply_enforced: true;
  remaining_opportunity: number | "UNKNOWN";
  stage_counts: Record<ManufacturerRescueRunnerStageV1, number> | Record<string, never>;
  execution_order: string[];
  manufacturer_workloads: ManufacturerRescueRunnerReportV1["manufacturer_workloads"];
  bottlenecks: ManufacturerRescueRunnerReportV1["bottlenecks"];
  boardy_safety_contract: ManufacturerRescueRunnerReportV1["boardy_safety_contract"] | null;
  recommended_next_action: string;
  coverage_unlocked: false;
  repo_paths_read: string[];
  truth_note: string;
};

export type ManufacturerRescueSlugStateResultV1 = McpReadOnlyEnvelopeV1 & {
  contract: typeof BUCKPARTS_MCP_MANUFACTURER_RESCUE_RUNNER_CONTRACT_V1;
  tool: "manufacturer_rescue_slug_state";
  filter_slug: string;
  truth_status: "PROVEN" | "UNKNOWN";
  runner_contract: typeof MANUFACTURER_SAFE_LINK_RESCUE_RUNNER_CONTRACT_V1 | "UNKNOWN";
  command_center_jq_path: typeof MANUFACTURER_RESCUE_RUNNER_CC_JQ_PATH_V1;
  slug_state: ManufacturerRescueRunnerSlugStateV1 | null;
  coverage_unlocked: false;
  repo_paths_read: string[];
  truth_note: string;
};

export type ManufacturerRescueBlockersResultV1 = McpReadOnlyEnvelopeV1 & {
  contract: typeof BUCKPARTS_MCP_MANUFACTURER_RESCUE_RUNNER_CONTRACT_V1;
  tool: "manufacturer_rescue_blockers";
  truth_status: "PROVEN" | "UNKNOWN";
  runner_contract: typeof MANUFACTURER_SAFE_LINK_RESCUE_RUNNER_CONTRACT_V1 | "UNKNOWN";
  command_center_jq_path: typeof MANUFACTURER_RESCUE_RUNNER_CC_JQ_PATH_V1;
  blocked_slug_count: number;
  by_blocker_reason: Array<{
    reason: string;
    slug_count: number;
    filter_slugs: string[];
  }>;
  runner_blocker_summary: ManufacturerRescueRunnerReportV1["blocker_summary"];
  coverage_unlocked: false;
  repo_paths_read: string[];
  truth_note: string;
};

export function manufacturerRescueNextActionV1(
  deps: BuckPartsMcpDepsV1,
): ManufacturerRescueNextActionResultV1 {
  const loaded = loadRunnerArtifact(deps);
  if (!loaded.ok) {
    return {
      ...envelope(),
      tool: "manufacturer_rescue_next_action",
      truth_status: "UNKNOWN",
      runner_contract: "UNKNOWN",
      command_center_jq_path: MANUFACTURER_RESCUE_RUNNER_CC_JQ_PATH_V1,
      director_command_center_jq_path: MANUFACTURER_RESCUE_DIRECTOR_CC_JQ_PATH_V1,
      runner_generated_at: "UNKNOWN",
      director_generated_at: "UNKNOWN",
      orchestrator_generated_at: "UNKNOWN",
      action_mode: "UNKNOWN",
      filter_slug: "UNKNOWN",
      stage: "UNKNOWN",
      next_executable_action: loaded.truth_note,
      ready_for_apply_slug: null,
      ready_for_apply_enforced: true,
      boardy_safety_rules: [],
      coverage_unlocked: false,
      repo_paths_read: loaded.repo_paths_read,
      truth_note: loaded.truth_note,
    };
  }

  const { report, runner_source_path, runner_board_source_path } = loaded;
  const next = projectManufacturerRescueNextActionV1(report);

  return {
    ...envelope(),
    tool: "manufacturer_rescue_next_action",
    truth_status: "PROVEN",
    runner_contract: MANUFACTURER_SAFE_LINK_RESCUE_RUNNER_CONTRACT_V1,
    command_center_jq_path: MANUFACTURER_RESCUE_RUNNER_CC_JQ_PATH_V1,
    director_command_center_jq_path: MANUFACTURER_RESCUE_DIRECTOR_CC_JQ_PATH_V1,
    runner_generated_at: report.generated_at,
    director_generated_at: report.director_generated_at,
    orchestrator_generated_at: report.orchestrator_generated_at,
    action_mode: next.action_mode,
    filter_slug: next.filter_slug,
    stage: next.stage,
    next_executable_action: next.next_executable_action,
    ready_for_apply_slug: next.ready_for_apply_slug,
    ready_for_apply_enforced: true,
    boardy_safety_rules: next.boardy_safety_rules,
    coverage_unlocked: false,
    repo_paths_read: [
      runner_source_path,
      runner_board_source_path,
      report.director_source_path,
      report.orchestrator_source_path,
    ],
    truth_note:
      "Projects committed manufacturer-safe-link-rescue-runner-v1.json only. Command Center lane is referenced by jq path; MCP does not rebuild CC or authorize apply.",
  };
}

export function manufacturerRescueRunnerBoardV1(
  deps: BuckPartsMcpDepsV1,
): ManufacturerRescueRunnerBoardResultV1 {
  const loaded = loadRunnerArtifact(deps);
  if (!loaded.ok) {
    return {
      ...envelope(),
      tool: "manufacturer_rescue_runner_board",
      truth_status: "UNKNOWN",
      runner_contract: "UNKNOWN",
      command_center_jq_path: MANUFACTURER_RESCUE_RUNNER_CC_JQ_PATH_V1,
      runner_generated_at: "UNKNOWN",
      director_generated_at: "UNKNOWN",
      orchestrator_generated_at: "UNKNOWN",
      ready_for_apply_slug: null,
      ready_for_apply_enforced: true,
      remaining_opportunity: "UNKNOWN",
      stage_counts: {},
      execution_order: [],
      manufacturer_workloads: [],
      bottlenecks: [],
      boardy_safety_contract: null,
      recommended_next_action: loaded.truth_note,
      coverage_unlocked: false,
      repo_paths_read: loaded.repo_paths_read,
      truth_note: loaded.truth_note,
    };
  }

  const { report, runner_source_path, runner_board_source_path } = loaded;

  return {
    ...envelope(),
    tool: "manufacturer_rescue_runner_board",
    truth_status: "PROVEN",
    runner_contract: MANUFACTURER_SAFE_LINK_RESCUE_RUNNER_CONTRACT_V1,
    command_center_jq_path: MANUFACTURER_RESCUE_RUNNER_CC_JQ_PATH_V1,
    runner_generated_at: report.generated_at,
    director_generated_at: report.director_generated_at,
    orchestrator_generated_at: report.orchestrator_generated_at,
    ready_for_apply_slug: report.ready_for_apply_slug,
    ready_for_apply_enforced: true,
    remaining_opportunity: report.inspect_summary.remaining_opportunity,
    stage_counts: stageCountsFromReport(report),
    execution_order: report.execution_order,
    manufacturer_workloads: report.manufacturer_workloads,
    bottlenecks: report.bottlenecks,
    boardy_safety_contract: report.boardy_safety_contract,
    recommended_next_action: report.inspect_summary.recommended_next_action,
    coverage_unlocked: false,
    repo_paths_read: [
      runner_source_path,
      runner_board_source_path,
      report.director_source_path,
      report.orchestrator_source_path,
    ],
    truth_note:
      "Runner board projected from committed JSON + board markdown path. Remaining work and stage counts are planning-only; coverage_unlocked stays false.",
  };
}

export function manufacturerRescueSlugStateV1(
  deps: BuckPartsMcpDepsV1,
  slug: string,
): ManufacturerRescueSlugStateResultV1 {
  const loaded = loadRunnerArtifact(deps);
  const normalized = normalizeSlug(slug);
  if (!loaded.ok) {
    return {
      ...envelope(),
      tool: "manufacturer_rescue_slug_state",
      filter_slug: normalized,
      truth_status: "UNKNOWN",
      runner_contract: "UNKNOWN",
      command_center_jq_path: MANUFACTURER_RESCUE_RUNNER_CC_JQ_PATH_V1,
      slug_state: null,
      coverage_unlocked: false,
      repo_paths_read: loaded.repo_paths_read,
      truth_note: loaded.truth_note,
    };
  }

  const { report, runner_source_path, runner_board_source_path } = loaded;
  const slug_state = findSlugState(report, normalized);

  return {
    ...envelope(),
    tool: "manufacturer_rescue_slug_state",
    filter_slug: normalized,
    truth_status: slug_state ? "PROVEN" : "UNKNOWN",
    runner_contract: MANUFACTURER_SAFE_LINK_RESCUE_RUNNER_CONTRACT_V1,
    command_center_jq_path: MANUFACTURER_RESCUE_RUNNER_CC_JQ_PATH_V1,
    slug_state,
    coverage_unlocked: false,
    repo_paths_read: [
      runner_source_path,
      runner_board_source_path,
      report.director_source_path,
      report.orchestrator_source_path,
    ],
    truth_note: slug_state
      ? `Slug state machine row from committed runner artifact at ${runner_source_path}.`
      : `Slug not present in committed runner queue. UNKNOWN — not inventing rescue state.`,
  };
}

export function manufacturerRescueBlockersV1(
  deps: BuckPartsMcpDepsV1,
): ManufacturerRescueBlockersResultV1 {
  const loaded = loadRunnerArtifact(deps);
  if (!loaded.ok) {
    return {
      ...envelope(),
      tool: "manufacturer_rescue_blockers",
      truth_status: "UNKNOWN",
      runner_contract: "UNKNOWN",
      command_center_jq_path: MANUFACTURER_RESCUE_RUNNER_CC_JQ_PATH_V1,
      blocked_slug_count: 0,
      by_blocker_reason: [],
      runner_blocker_summary: [],
      coverage_unlocked: false,
      repo_paths_read: loaded.repo_paths_read,
      truth_note: loaded.truth_note,
    };
  }

  const { report, runner_source_path, runner_board_source_path } = loaded;
  const blockers = projectManufacturerRescueBlockersV1(report);

  return {
    ...envelope(),
    tool: "manufacturer_rescue_blockers",
    truth_status: "PROVEN",
    runner_contract: MANUFACTURER_SAFE_LINK_RESCUE_RUNNER_CONTRACT_V1,
    command_center_jq_path: MANUFACTURER_RESCUE_RUNNER_CC_JQ_PATH_V1,
    blocked_slug_count: blockers.blocked_slug_count,
    by_blocker_reason: blockers.by_blocker_reason,
    runner_blocker_summary: report.blocker_summary,
    coverage_unlocked: false,
    repo_paths_read: [
      runner_source_path,
      runner_board_source_path,
      report.director_source_path,
      report.orchestrator_source_path,
    ],
    truth_note:
      "BLOCKED-stage slugs grouped by blocker reason from committed runner artifact. Does not mutate CSV or weaken trust gates.",
  };
}

export const BUCKPARTS_MCP_MANUFACTURER_RESCUE_RUNNER_TOOLS_CONTRACT_NOTE_V1 =
  "MCP runner tools use buckparts_mcp_tools_v2 read-only envelope fields and buckparts_mcp_manufacturer_rescue_runner_v1 payload contract." as const;
