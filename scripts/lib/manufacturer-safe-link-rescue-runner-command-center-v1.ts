/**
 * Command Center v2 projection for manufacturer safe-link rescue runner (read-only).
 */

import type { ManufacturerSafeLinkRescueDirectorCommandCenterLaneV1 } from "./manufacturer-safe-link-rescue-director-command-center-v1";
import { buildManufacturerSafeLinkRescueDirectorCommandCenterLaneV1 } from "./manufacturer-safe-link-rescue-director-command-center-v1";
import {
  buildManufacturerSafeLinkRescueRunnerFromInputsV1,
  buildManufacturerSafeLinkRescueRunnerV1,
  MANUFACTURER_SAFE_LINK_RESCUE_RUNNER_BOARD_MD_REL_V1,
  MANUFACTURER_SAFE_LINK_RESCUE_RUNNER_CONTRACT_V1,
  MANUFACTURER_SAFE_LINK_RESCUE_RUNNER_JSON_REL_V1,
  MANUFACTURER_SAFE_LINK_RESCUE_RUNNER_SOURCE_COMMAND_V1,
  MANUFACTURER_SAFE_LINK_RESCUE_RUNNER_STAGES_V1,
  type ManufacturerRescueRunnerBottleneckV1,
  type ManufacturerRescueRunnerManufacturerWorkloadV1,
  type ManufacturerRescueRunnerReportV1,
  type ManufacturerRescueRunnerSlugStateV1,
  type ManufacturerRescueRunnerStageV1,
} from "./manufacturer-safe-link-rescue-runner-v1";
import { loadManufacturerRescueOrchestratorInputV1 } from "./manufacturer-safe-link-rescue-director-v1";
import type { ManufacturerRescueOrchestratorReportV1 } from "./manufacturer-safe-link-rescue-orchestrator-v1";

export const MANUFACTURER_SAFE_LINK_RESCUE_RUNNER_CC_LANE_CONTRACT_V1 =
  MANUFACTURER_SAFE_LINK_RESCUE_RUNNER_CONTRACT_V1;

export const MANUFACTURER_SAFE_LINK_RESCUE_RUNNER_CC_JQ_PATH_V1 =
  ".command_center_v2.manufacturer_safe_link_rescue_runner_v1" as const;

export type ManufacturerSafeLinkRescueRunnerInspectSummaryV1 = {
  recommended_jq_paths: {
    standalone_report: ".inspect_summary";
    command_center: typeof MANUFACTURER_SAFE_LINK_RESCUE_RUNNER_CC_JQ_PATH_V1;
    ready_for_apply_slug: ".ready_for_apply_slug";
    execution_order: ".execution_order";
  };
  next_executable_slug: string | "UNKNOWN";
  ready_for_apply_slug: string | null;
  remaining_opportunity: number;
  stage_counts: Record<ManufacturerRescueRunnerStageV1, number>;
  director_generated_at: string;
  orchestrator_generated_at: string;
  runner_generated_at: string;
};

export type ManufacturerSafeLinkRescueRunnerCommandCenterLaneV1 = {
  contract: typeof MANUFACTURER_SAFE_LINK_RESCUE_RUNNER_CC_LANE_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  mutation_authorized: false;
  csv_apply_authorized: false;
  supabase_mutation_authorized: false;
  browser_automation_authorized: false;
  coverage_unlocked: false;
  recommended_jq_path: typeof MANUFACTURER_SAFE_LINK_RESCUE_RUNNER_CC_JQ_PATH_V1;
  generated_at: string;
  director_generated_at: string;
  orchestrator_generated_at: string;
  runner_artifact_path: string;
  runner_board_artifact_path: string;
  director_artifact_path: string;
  orchestrator_artifact_path: string;
  source_command: typeof MANUFACTURER_SAFE_LINK_RESCUE_RUNNER_SOURCE_COMMAND_V1;
  ready_for_apply_slug: string | null;
  ready_for_apply_enforced: true;
  execution_order: string[];
  slug_states: ManufacturerRescueRunnerSlugStateV1[];
  manufacturer_workloads: ManufacturerRescueRunnerManufacturerWorkloadV1[];
  bottlenecks: ManufacturerRescueRunnerBottleneckV1[];
  blocker_summary: ManufacturerRescueRunnerReportV1["blocker_summary"];
  boardy_safety_contract: ManufacturerRescueRunnerReportV1["boardy_safety_contract"];
  post_apply_validation_checklist: string[];
  inspect_summary: ManufacturerSafeLinkRescueRunnerInspectSummaryV1;
  recommended_next_action: string;
  proven_facts: string[];
  unknown_facts: string[];
};

export type BuildManufacturerSafeLinkRescueRunnerCommandCenterLaneDepsV1 = {
  rootDir: string;
  now?: () => Date;
  fileExists?: (abs: string) => boolean;
  readTextFile?: (abs: string) => string;
  buildRunner?: typeof buildManufacturerSafeLinkRescueRunnerV1;
};

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

export function buildManufacturerSafeLinkRescueRunnerCommandCenterLaneFromReportV1(args: {
  report: ManufacturerRescueRunnerReportV1;
}): ManufacturerSafeLinkRescueRunnerCommandCenterLaneV1 {
  const report = args.report;
  const inspect_summary: ManufacturerSafeLinkRescueRunnerInspectSummaryV1 = {
    recommended_jq_paths: {
      standalone_report: ".inspect_summary",
      command_center: MANUFACTURER_SAFE_LINK_RESCUE_RUNNER_CC_JQ_PATH_V1,
      ready_for_apply_slug: ".ready_for_apply_slug",
      execution_order: ".execution_order",
    },
    next_executable_slug: report.inspect_summary.next_executable_slug,
    ready_for_apply_slug: report.ready_for_apply_slug,
    remaining_opportunity: report.inspect_summary.remaining_opportunity,
    stage_counts: stageCountsFromReport(report),
    director_generated_at: report.director_generated_at,
    orchestrator_generated_at: report.orchestrator_generated_at,
    runner_generated_at: report.generated_at,
  };

  return {
    contract: MANUFACTURER_SAFE_LINK_RESCUE_RUNNER_CC_LANE_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    csv_apply_authorized: false,
    supabase_mutation_authorized: false,
    browser_automation_authorized: false,
    coverage_unlocked: false,
    recommended_jq_path: MANUFACTURER_SAFE_LINK_RESCUE_RUNNER_CC_JQ_PATH_V1,
    generated_at: report.generated_at,
    director_generated_at: report.director_generated_at,
    orchestrator_generated_at: report.orchestrator_generated_at,
    runner_artifact_path: MANUFACTURER_SAFE_LINK_RESCUE_RUNNER_JSON_REL_V1,
    runner_board_artifact_path: MANUFACTURER_SAFE_LINK_RESCUE_RUNNER_BOARD_MD_REL_V1,
    director_artifact_path: report.director_source_path,
    orchestrator_artifact_path: report.orchestrator_source_path,
    source_command: MANUFACTURER_SAFE_LINK_RESCUE_RUNNER_SOURCE_COMMAND_V1,
    ready_for_apply_slug: report.ready_for_apply_slug,
    ready_for_apply_enforced: true,
    execution_order: report.execution_order,
    slug_states: report.slug_states,
    manufacturer_workloads: report.manufacturer_workloads,
    bottlenecks: report.bottlenecks,
    blocker_summary: report.blocker_summary,
    boardy_safety_contract: report.boardy_safety_contract,
    post_apply_validation_checklist: report.post_apply_validation_checklist,
    inspect_summary,
    recommended_next_action: report.inspect_summary.recommended_next_action,
    proven_facts: [
      ...report.proven_facts,
      `PROVEN: Command Center lane ${MANUFACTURER_SAFE_LINK_RESCUE_RUNNER_CC_JQ_PATH_V1} projects runner read-only.`,
    ],
    unknown_facts: [...report.unknown_facts],
  };
}

export function buildManufacturerSafeLinkRescueRunnerCommandCenterLaneUnknownV1(args: {
  generated_at: string;
  reason: string;
}): ManufacturerSafeLinkRescueRunnerCommandCenterLaneV1 {
  const emptyStageCounts = Object.fromEntries(
    MANUFACTURER_SAFE_LINK_RESCUE_RUNNER_STAGES_V1.map((s) => [s, 0]),
  ) as Record<ManufacturerRescueRunnerStageV1, number>;

  return {
    contract: MANUFACTURER_SAFE_LINK_RESCUE_RUNNER_CC_LANE_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    csv_apply_authorized: false,
    supabase_mutation_authorized: false,
    browser_automation_authorized: false,
    coverage_unlocked: false,
    recommended_jq_path: MANUFACTURER_SAFE_LINK_RESCUE_RUNNER_CC_JQ_PATH_V1,
    generated_at: args.generated_at,
    director_generated_at: "UNKNOWN",
    orchestrator_generated_at: "UNKNOWN",
    runner_artifact_path: MANUFACTURER_SAFE_LINK_RESCUE_RUNNER_JSON_REL_V1,
    runner_board_artifact_path: MANUFACTURER_SAFE_LINK_RESCUE_RUNNER_BOARD_MD_REL_V1,
    director_artifact_path: "data/fridge/batch-production/drafts/manufacturer-safe-link-rescue-director-v1.json",
    orchestrator_artifact_path:
      "data/fridge/batch-production/drafts/manufacturer-safe-link-rescue-orchestrator-v1.json",
    source_command: MANUFACTURER_SAFE_LINK_RESCUE_RUNNER_SOURCE_COMMAND_V1,
    ready_for_apply_slug: null,
    ready_for_apply_enforced: true,
    execution_order: [],
    slug_states: [],
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
        command_center: MANUFACTURER_SAFE_LINK_RESCUE_RUNNER_CC_JQ_PATH_V1,
        ready_for_apply_slug: ".ready_for_apply_slug",
        execution_order: ".execution_order",
      },
      next_executable_slug: "UNKNOWN",
      ready_for_apply_slug: null,
      remaining_opportunity: 0,
      stage_counts: emptyStageCounts,
      director_generated_at: "UNKNOWN",
      orchestrator_generated_at: "UNKNOWN",
      runner_generated_at: args.generated_at,
    },
    recommended_next_action:
      "Restore manufacturer rescue director/orchestrator artifacts, then run npm run buckparts:manufacturer-safe-link-rescue-runner. Lane is read-only.",
    proven_facts: [
      "PROVEN: Command Center caught manufacturer_safe_link_rescue_runner_v1 build failure without throwing.",
      "PROVEN: All mutation and apply authorization fields are false.",
    ],
    unknown_facts: [`UNKNOWN: manufacturer_safe_link_rescue_runner_v1 failed: ${args.reason}`],
  };
}

export function buildManufacturerSafeLinkRescueRunnerCommandCenterLaneV1(
  deps: BuildManufacturerSafeLinkRescueRunnerCommandCenterLaneDepsV1,
): ManufacturerSafeLinkRescueRunnerCommandCenterLaneV1 {
  const buildRunner = deps.buildRunner ?? buildManufacturerSafeLinkRescueRunnerV1;
  const report = buildRunner({
    rootDir: deps.rootDir,
    now: deps.now,
    fileExists: deps.fileExists,
    readTextFile: deps.readTextFile,
  });
  return buildManufacturerSafeLinkRescueRunnerCommandCenterLaneFromReportV1({ report });
}

export function buildManufacturerSafeLinkRescueRunnerCommandCenterLaneFromDirectorLaneV1(args: {
  directorLane: ManufacturerSafeLinkRescueDirectorCommandCenterLaneV1;
  rootDir: string;
  now?: () => Date;
  fileExists?: (abs: string) => boolean;
  readTextFile?: (abs: string) => string;
}): ManufacturerSafeLinkRescueRunnerCommandCenterLaneV1 {
  const { orchestrator } = loadManufacturerRescueOrchestratorInputV1({
    rootDir: args.rootDir,
    now: args.now,
    fileExists: args.fileExists,
    readTextFile: args.readTextFile,
  });
  const report = buildManufacturerSafeLinkRescueRunnerFromInputsV1({
    directorLane: args.directorLane,
    orchestrator,
    now: args.now,
  });
  return buildManufacturerSafeLinkRescueRunnerCommandCenterLaneFromReportV1({ report });
}
