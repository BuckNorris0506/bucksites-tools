/**
 * Command Center v2 projection for BuckParts Runner v1 (read-only).
 */

import {
  BUCKPARTS_RUNNER_CC_JQ_PATH_V1,
  BUCKPARTS_RUNNER_SOURCE_COMMAND_V1,
  findLatestRunnerArtifactV1,
  type BuckpartsRunnerReportV1,
} from "./buckparts-runner-v1";

export const BUCKPARTS_RUNNER_CC_LANE_CONTRACT_V1 = "buckparts_runner_v1" as const;

export type BuckpartsRunnerCommandCenterLaneV1 = {
  contract: typeof BUCKPARTS_RUNNER_CC_LANE_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  mutation_authorized: false;
  recommended_jq_path: typeof BUCKPARTS_RUNNER_CC_JQ_PATH_V1;
  source_command: typeof BUCKPARTS_RUNNER_SOURCE_COMMAND_V1;
  generated_at: string;
  latest_run: BuckpartsRunnerReportV1 | null;
  latest_run_artifact_path: string | null;
  overall_status: BuckpartsRunnerReportV1["overall_status"] | "NO_RUNS";
  mission_id: BuckpartsRunnerReportV1["mission_id"] | null;
  halt_reason: BuckpartsRunnerReportV1["halt_reason"];
  recommended_next_action: string;
  proven_facts: string[];
  unknown_facts: string[];
};

export function buildBuckpartsRunnerCommandCenterLaneV1(args: {
  rootDir: string;
  now?: () => Date;
}): BuckpartsRunnerCommandCenterLaneV1 {
  const now = args.now ?? (() => new Date());
  const latest = findLatestRunnerArtifactV1(args.rootDir);

  if (!latest) {
    return {
      contract: BUCKPARTS_RUNNER_CC_LANE_CONTRACT_V1,
      read_only: true,
      data_mutation: false,
      mutation_authorized: false,
      recommended_jq_path: BUCKPARTS_RUNNER_CC_JQ_PATH_V1,
      source_command: BUCKPARTS_RUNNER_SOURCE_COMMAND_V1,
      generated_at: now().toISOString(),
      latest_run: null,
      latest_run_artifact_path: null,
      overall_status: "NO_RUNS",
      mission_id: null,
      halt_reason: null,
      recommended_next_action:
        "PROVEN: No runner artifacts yet — start with `node --import tsx scripts/report-buckparts-runner-v1.ts --mission coverage_sprint_v1`.",
      proven_facts: [
        "PROVEN: buckparts_runner_v1 lane reads latest artifact from data/command-center/runner-runs/ only.",
      ],
      unknown_facts: ["UNKNOWN: No consolidated runner execution report on disk."],
    };
  }

  return {
    contract: BUCKPARTS_RUNNER_CC_LANE_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    recommended_jq_path: BUCKPARTS_RUNNER_CC_JQ_PATH_V1,
    source_command: BUCKPARTS_RUNNER_SOURCE_COMMAND_V1,
    generated_at: now().toISOString(),
    latest_run: latest,
    latest_run_artifact_path: latest.artifact_rel_path,
    overall_status: latest.overall_status,
    mission_id: latest.mission_id,
    halt_reason: latest.halt_reason,
    recommended_next_action: latest.recommended_next_action,
    proven_facts: latest.proven_facts.slice(0, 6),
    unknown_facts: latest.unknown_facts,
  };
}

export function buildBuckpartsRunnerCommandCenterLaneUnknownV1(args: {
  generated_at: string;
  reason: string;
}): BuckpartsRunnerCommandCenterLaneV1 {
  return {
    contract: BUCKPARTS_RUNNER_CC_LANE_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    recommended_jq_path: BUCKPARTS_RUNNER_CC_JQ_PATH_V1,
    source_command: BUCKPARTS_RUNNER_SOURCE_COMMAND_V1,
    generated_at: args.generated_at,
    latest_run: null,
    latest_run_artifact_path: null,
    overall_status: "NO_RUNS",
    mission_id: null,
    halt_reason: null,
    recommended_next_action: `UNKNOWN: Runner lane failed to load — ${args.reason}`,
    proven_facts: [],
    unknown_facts: [args.reason],
  };
}
