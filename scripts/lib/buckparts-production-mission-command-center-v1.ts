/**
 * Command Center v2 projection for Production Mission v1 (read-only).
 */

import {
  BUCKPARTS_PRODUCTION_MISSION_CC_JQ_PATH_V1,
  BUCKPARTS_PRODUCTION_MISSION_CONTRACT_V1,
  BUCKPARTS_PRODUCTION_MISSION_SOURCE_COMMAND_V1,
  findLatestProductionMissionLifecycleV1,
  listProductionMissionRunnerArtifactsV1,
  type ProductionMissionLifecycleArtifactV1,
} from "./buckparts-production-mission-v1";

export const PRODUCTION_MISSION_CC_LANE_CONTRACT_V1 = "production_mission_v1" as const;

export type ProductionMissionCommandCenterLaneV1 = {
  contract: typeof PRODUCTION_MISSION_CC_LANE_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  mutation_authorized: false;
  recommended_jq_path: typeof BUCKPARTS_PRODUCTION_MISSION_CC_JQ_PATH_V1;
  source_command: "npm run buckparts:runner -- --mission production_mission_v1";
  generated_at: string;
  latest_lifecycle: ProductionMissionLifecycleArtifactV1 | null;
  latest_lifecycle_artifact_path: string | null;
  latest_runner_run_id: string | null;
  production_mission_run_count: number;
  recommended_next_action: string;
  proven_facts: string[];
  unknown_facts: string[];
};

export function buildProductionMissionCommandCenterLaneV1(args: {
  rootDir: string;
  now?: () => Date;
}): ProductionMissionCommandCenterLaneV1 {
  const now = args.now ?? (() => new Date());
  const latestLifecycle = findLatestProductionMissionLifecycleV1(args.rootDir);
  const runs = listProductionMissionRunnerArtifactsV1(args.rootDir);

  let recommended = "PROVEN: No production mission runs yet — start reference mission: npm run buckparts:runner -- --mission production_mission_v1";
  if (latestLifecycle?.lifecycle_complete) {
    recommended = `PROVEN: Latest lifecycle complete (${latestLifecycle.run_id}) — review ${latestLifecycle.runner_artifact_rel_path} and guarded apply write for slug ${latestLifecycle.target.primary_apply_slug}.`;
  } else if (latestLifecycle) {
    recommended = `PROVEN: Production mission in progress or halted — resume with runner --mission production_mission_v1 --resume ${latestLifecycle.run_id}`;
  }

  return {
    contract: PRODUCTION_MISSION_CC_LANE_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    recommended_jq_path: BUCKPARTS_PRODUCTION_MISSION_CC_JQ_PATH_V1,
    source_command: "npm run buckparts:runner -- --mission production_mission_v1",
    generated_at: now().toISOString(),
    latest_lifecycle: latestLifecycle,
    latest_lifecycle_artifact_path: latestLifecycle
      ? `data/command-center/production-missions/buckparts-production-mission-${latestLifecycle.run_id.replace(/[^a-zA-Z0-9-]/g, "")}.json`
      : null,
    latest_runner_run_id: runs[0]?.run_id ?? null,
    production_mission_run_count: runs.length,
    recommended_next_action: recommended,
    proven_facts: [
      "PROVEN: production_mission_v1 is the reference end-to-end Foundation v2 mission — no new orchestration framework.",
      `PROVEN: ${String(runs.length)} production mission runner artifact(s) on disk.`,
    ],
    unknown_facts:
      runs.length === 0
        ? ["UNKNOWN: No production mission lifecycle demonstrated yet."]
        : [],
  };
}

export function buildProductionMissionCommandCenterLaneUnknownV1(args: {
  generated_at: string;
  reason: string;
}): ProductionMissionCommandCenterLaneV1 {
  return {
    contract: PRODUCTION_MISSION_CC_LANE_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    recommended_jq_path: BUCKPARTS_PRODUCTION_MISSION_CC_JQ_PATH_V1,
    source_command: "npm run buckparts:runner -- --mission production_mission_v1",
    generated_at: args.generated_at,
    latest_lifecycle: null,
    latest_lifecycle_artifact_path: null,
    latest_runner_run_id: null,
    production_mission_run_count: 0,
    recommended_next_action: `UNKNOWN: Production mission lane failed — ${args.reason}`,
    proven_facts: [],
    unknown_facts: [args.reason],
  };
}

export {
  BUCKPARTS_PRODUCTION_MISSION_CC_JQ_PATH_V1,
  BUCKPARTS_PRODUCTION_MISSION_CONTRACT_V1,
};
