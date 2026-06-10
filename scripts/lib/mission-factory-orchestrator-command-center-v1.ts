/**
 * Command Center v1 projection for MISSION_FACTORY_ORCHESTRATOR (read-only dry-run lane).
 */

import {
  MISSION_FACTORY_ORCHESTRATOR_CC_JQ_PATH_V1,
  MISSION_FACTORY_ORCHESTRATOR_DEFAULT_MAX_PARALLEL_DISPATCHES_V1,
  MISSION_FACTORY_ORCHESTRATOR_REPORT_CONTRACT_V1,
  MISSION_FACTORY_ORCHESTRATOR_SOURCE_COMMAND_V1,
  runMissionFactoryOrchestratorV1,
  type MissionFactoryOrchestratorReportV1,
} from "./mission-factory-orchestrator-v1";

export const MISSION_FACTORY_ORCHESTRATOR_COMMAND_CENTER_CONTRACT_V1 =
  "mission_factory_orchestrator_command_center_lane_v1" as const;

export type MissionFactoryOrchestratorCommandCenterLaneV1 = Omit<
  MissionFactoryOrchestratorReportV1,
  "contract"
> & {
  contract: typeof MISSION_FACTORY_ORCHESTRATOR_COMMAND_CENTER_CONTRACT_V1;
  recommended_jq_path: typeof MISSION_FACTORY_ORCHESTRATOR_CC_JQ_PATH_V1;
  lane_status: "OK" | "ATTENTION" | "UNKNOWN";
  recommended_next_action: string;
};

export function buildMissionFactoryOrchestratorCommandCenterLaneV1(args: {
  rootDir: string;
  maxParallelDispatches?: number;
  now?: () => Date;
}): MissionFactoryOrchestratorCommandCenterLaneV1 {
  const { report } = runMissionFactoryOrchestratorV1({
    rootDir: args.rootDir,
    now: args.now,
    confirmOrchestrate: false,
    maxParallelDispatches:
      args.maxParallelDispatches ?? MISSION_FACTORY_ORCHESTRATOR_DEFAULT_MAX_PARALLEL_DISPATCHES_V1,
  });

  let lane_status: MissionFactoryOrchestratorCommandCenterLaneV1["lane_status"] = "OK";
  if (report.missions_by_lane.dispatched > report.current_parallel_limit) {
    lane_status = "ATTENTION";
  } else if (
    report.missions_by_lane.dispatch_ready > 0 &&
    report.available_dispatch_slots === 0
  ) {
    lane_status = "ATTENTION";
  }

  const recommended_next_action =
    report.missions_by_lane.dispatch_ready > 0 && report.available_dispatch_slots > 0
      ? `Run ${MISSION_FACTORY_ORCHESTRATOR_SOURCE_COMMAND_V1} -- --confirm-orchestrate to dispatch up to ${String(report.available_dispatch_slots)} mission(s).`
      : report.ingest_closeouts_detected > 0
        ? `Run ${MISSION_FACTORY_ORCHESTRATOR_SOURCE_COMMAND_V1} -- --confirm-orchestrate to apply ${String(report.ingest_closeouts_detected)} ingest closeout transition(s).`
        : report.missions_by_lane.queued > 0
          ? `Run ${MISSION_FACTORY_ORCHESTRATOR_SOURCE_COMMAND_V1} -- --confirm-orchestrate to promote ${String(report.missions_by_lane.queued)} QUEUED mission(s) and dispatch when slots allow.`
          : "Orchestrator idle — no QUEUED/DISPATCH_READY work or ingest closeouts pending in dry-run preview.";

  return {
    ...report,
    contract: MISSION_FACTORY_ORCHESTRATOR_COMMAND_CENTER_CONTRACT_V1,
    recommended_jq_path: MISSION_FACTORY_ORCHESTRATOR_CC_JQ_PATH_V1,
    lane_status,
    recommended_next_action,
    proven_facts: [
      ...report.proven_facts,
      `PROVEN: Command Center lane ${MISSION_FACTORY_ORCHESTRATOR_CC_JQ_PATH_V1} is dry-run preview via ${MISSION_FACTORY_ORCHESTRATOR_SOURCE_COMMAND_V1}.`,
    ],
  };
}

export function buildMissionFactoryOrchestratorCommandCenterLaneUnknownV1(args: {
  generated_at: string;
  reason: string;
}): MissionFactoryOrchestratorCommandCenterLaneV1 {
  const emptyLane = {
    queued: 0,
    dispatch_ready: 0,
    dispatched: 0,
    ingest_received: 0,
    blocked: 0,
    expired: 0,
  };
  return {
    contract: MISSION_FACTORY_ORCHESTRATOR_COMMAND_CENTER_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    registry_write_performed: false,
    generated_at: args.generated_at,
    source_command: MISSION_FACTORY_ORCHESTRATOR_SOURCE_COMMAND_V1,
    confirm_orchestrate: false,
    max_parallel_dispatches: MISSION_FACTORY_ORCHESTRATOR_DEFAULT_MAX_PARALLEL_DISPATCHES_V1,
    current_parallel_limit: MISSION_FACTORY_ORCHESTRATOR_DEFAULT_MAX_PARALLEL_DISPATCHES_V1,
    active_dispatch_count: 0,
    available_dispatch_slots: MISSION_FACTORY_ORCHESTRATOR_DEFAULT_MAX_PARALLEL_DISPATCHES_V1,
    ttl_transitions_applied: 0,
    dispatch_ready_promotions: 0,
    ingest_closeouts_detected: 0,
    dispatches_attempted: 0,
    dispatches_recorded: 0,
    dispatches_blocked: 0,
    missions_by_lane: emptyLane,
    transitions_applied: [],
    dispatch_records: [],
    blocked_dispatch_reasons: [],
    recommended_jq_path: MISSION_FACTORY_ORCHESTRATOR_CC_JQ_PATH_V1,
    lane_status: "UNKNOWN",
    recommended_next_action:
      "Mission factory orchestrator lane failed — inspect mission-registry-v1.json or run npm run buckparts:mission-factory-orchestrator.",
    proven_facts: [
      "PROVEN: Command Center caught mission_factory_orchestrator_v1 build failure without throwing.",
    ],
    unknown_facts: [`UNKNOWN: mission_factory_orchestrator_v1 failed: ${args.reason}`],
  };
}

export { MISSION_FACTORY_ORCHESTRATOR_REPORT_CONTRACT_V1 };
