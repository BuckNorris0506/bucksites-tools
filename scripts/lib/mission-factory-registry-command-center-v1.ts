/**
 * Command Center v1 projection for MISSION_FACTORY_REGISTRY (read-only report lane).
 */

import {
  buildMissionFactoryRegistryReportV1,
  MISSION_FACTORY_REGISTRY_CC_JQ_PATH_V1,
  MISSION_FACTORY_REGISTRY_REPORT_CONTRACT_V1,
  MISSION_FACTORY_REGISTRY_SOURCE_COMMAND_V1,
  type MissionFactoryRegistryReportV1,
} from "./mission-factory-registry-v1";
import {
  MISSION_FACTORY_QUEUE_GENERATOR_SOURCE_COMMAND_V1,
  runMissionFactoryQueueGeneratorV1,
  type MissionFactoryQueueGenerationModeV1,
} from "./mission-factory-queue-generator-v1";

export const MISSION_FACTORY_REGISTRY_COMMAND_CENTER_CONTRACT_V1 =
  "mission_factory_registry_command_center_lane_v1" as const;

export type MissionFactoryRegistryQueueGeneratorSummaryV1 = {
  source_command: typeof MISSION_FACTORY_QUEUE_GENERATOR_SOURCE_COMMAND_V1;
  queue_depth_before: number;
  queue_depth_after_preview: number;
  queue_depth_target_min: number;
  queue_depth_target_max: number;
  generation_mode: MissionFactoryQueueGenerationModeV1;
  candidates_generated: number;
  missions_added_preview: number;
};

export type MissionFactoryRegistryCommandCenterLaneV1 = Omit<
  MissionFactoryRegistryReportV1,
  "contract"
> & {
  contract: typeof MISSION_FACTORY_REGISTRY_COMMAND_CENTER_CONTRACT_V1;
  recommended_jq_path: typeof MISSION_FACTORY_REGISTRY_CC_JQ_PATH_V1;
  lane_status: "OK" | "ATTENTION" | "UNKNOWN";
  recommended_next_action: string;
  queue_generator_v1: MissionFactoryRegistryQueueGeneratorSummaryV1;
};

export function buildMissionFactoryRegistryCommandCenterLaneV1(args: {
  rootDir: string;
  now?: () => Date;
}): MissionFactoryRegistryCommandCenterLaneV1 {
  const report = buildMissionFactoryRegistryReportV1(args);
  const queuePreview = runMissionFactoryQueueGeneratorV1({
    rootDir: args.rootDir,
    now: args.now,
    writeRegistry: false,
  });
  const queue_generator_v1: MissionFactoryRegistryQueueGeneratorSummaryV1 = {
    source_command: MISSION_FACTORY_QUEUE_GENERATOR_SOURCE_COMMAND_V1,
    queue_depth_before: queuePreview.report.queue_depth_before,
    queue_depth_after_preview: queuePreview.report.queue_depth_after,
    queue_depth_target_min: queuePreview.report.queue_depth_target_min,
    queue_depth_target_max: queuePreview.report.queue_depth_target_max,
    generation_mode: queuePreview.report.generation_mode,
    candidates_generated: queuePreview.report.candidates_generated,
    missions_added_preview: queuePreview.report.missions_added,
  };

  const ttlExpiredActive = report.active_missions.filter((mission) => mission.ttl_expired);

  let lane_status: MissionFactoryRegistryCommandCenterLaneV1["lane_status"] = "OK";
  if (
    report.active_mission_count === 0 &&
    queue_generator_v1.queue_depth_after_preview === 0
  ) {
    lane_status = "UNKNOWN";
  } else if (
    ttlExpiredActive.length > 0 ||
    queue_generator_v1.queue_depth_after_preview < queue_generator_v1.queue_depth_target_min
  ) {
    lane_status = "ATTENTION";
  }

  const recommended_next_action =
    queue_generator_v1.queue_depth_after_preview < queue_generator_v1.queue_depth_target_min
      ? `Queue depth ${String(queue_generator_v1.queue_depth_after_preview)} below target min ${String(queue_generator_v1.queue_depth_target_min)} — run ${MISSION_FACTORY_QUEUE_GENERATOR_SOURCE_COMMAND_V1} -- --write-registry after review.`
      : ttlExpiredActive.length > 0
        ? `Run npm run buckparts:mission-factory-registry -- --enforce-ttl for ${String(ttlExpiredActive.length)} overdue mission(s).`
        : "Mission factory queue within target band — run npm run buckparts:mission-factory-orchestrator for dispatch preview.";

  return {
    ...report,
    contract: MISSION_FACTORY_REGISTRY_COMMAND_CENTER_CONTRACT_V1,
    recommended_jq_path: MISSION_FACTORY_REGISTRY_CC_JQ_PATH_V1,
    lane_status,
    recommended_next_action,
    queue_generator_v1,
    proven_facts: [
      ...report.proven_facts,
      `PROVEN: Command Center lane ${MISSION_FACTORY_REGISTRY_CC_JQ_PATH_V1} is read-only projection via ${MISSION_FACTORY_REGISTRY_SOURCE_COMMAND_V1}.`,
      `PROVEN: queue_generator_v1 preview depth=${String(queue_generator_v1.queue_depth_after_preview)} mode=${queue_generator_v1.generation_mode}.`,
    ],
  };
}

export function buildMissionFactoryRegistryCommandCenterLaneUnknownV1(args: {
  generated_at: string;
  reason: string;
}): MissionFactoryRegistryCommandCenterLaneV1 {
  const emptyState = Object.fromEntries(
    [
      "QUEUED",
      "DISPATCH_READY",
      "DISPATCHED",
      "DISCOVERY_COMPLETE",
      "INGEST_COMMITTED",
      "CURSOR_VALIDATED",
      "OWNER_REVIEWED",
      "PROMOTED",
      "GUARD_CAPTURED",
      "CLOSED",
      "DISCOVERY_BLOCKED",
      "VALIDATION_FAILED",
      "OWNER_REJECTED",
      "EXPIRED",
    ].map((state) => [state, 0]),
  ) as MissionFactoryRegistryReportV1["missions_by_state"];

  return {
    contract: MISSION_FACTORY_REGISTRY_COMMAND_CENTER_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    generated_at: args.generated_at,
    source_command: MISSION_FACTORY_REGISTRY_SOURCE_COMMAND_V1,
    registry_rel_path: "data/mission-factory/mission-registry-v1.json",
    total_missions: 0,
    missions_by_state: emptyState,
    missions_by_type: {
      EVIDENCE_SCALING: 0,
      WRONG_PART_RESEARCH: 0,
      FAMILY_RECONCILIATION: 0,
      SAFE_LINK_COVERAGE: 0,
      NEW_WEDGE_EXPANSION: 0,
    },
    missions_by_wedge: {
      refrigerator: 0,
      air_purifier: 0,
      whole_house_water: 0,
      vacuum: 0,
    },
    active_mission_count: 0,
    terminal_mission_count: 0,
    oldest_active_mission: null,
    throughput_closed_per_day: 0,
    active_missions: [],
    expired_blocked_rejected_summary: [],
    completed_missions_summary: [],
    recommended_jq_path: MISSION_FACTORY_REGISTRY_CC_JQ_PATH_V1,
    lane_status: "UNKNOWN",
    recommended_next_action:
      "Mission factory registry lane failed to build — inspect mission-registry-v1.json or run npm run buckparts:mission-factory-registry.",
    queue_generator_v1: {
      source_command: MISSION_FACTORY_QUEUE_GENERATOR_SOURCE_COMMAND_V1,
      queue_depth_before: 0,
      queue_depth_after_preview: 0,
      queue_depth_target_min: 15,
      queue_depth_target_max: 25,
      generation_mode: "no_candidates",
      candidates_generated: 0,
      missions_added_preview: 0,
    },
    proven_facts: [
      "PROVEN: Command Center caught mission_factory_registry_v1 build failure without throwing.",
    ],
    unknown_facts: [`UNKNOWN: mission_factory_registry_v1 failed: ${args.reason}`],
  };
}

export { MISSION_FACTORY_REGISTRY_REPORT_CONTRACT_V1 };
