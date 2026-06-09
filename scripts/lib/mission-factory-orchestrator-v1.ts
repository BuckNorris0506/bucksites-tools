/**
 * MISSION_FACTORY_ORCHESTRATOR_V1 — automated HyperAgent dispatch from mission registry (V1.2).
 * Mutates only: mission-registry-v1.json, hyperagent outbox packets, hyperagent dispatch events.
 * Does not mutate product data, Supabase, CSV, pages, or evidence promotion paths.
 */

import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";

import { HYPERAGENT_INGEST_PACKET_CONTRACT_V1 } from "./buckparts-ops-agent-workflow-v1";
import {
  appendDispatchEventV0,
  buildHyperAgentMissionPacketV0,
  HYPERAGENT_ORCHESTRATOR_OUTBOX_REL_V0,
  loadOperatorDispatchEventsV0,
  writeMissionOutboxV0,
  type HyperAgentOrchestratorPathOverridesV0,
} from "./hyperagent-orchestrator-v0";
import {
  buildHyperAgentDispatchRegistryV1,
  hyperAgentDedupKeyV1,
  hyperAgentQueueItemIdV1,
  hyperAgentSlugBatchFingerprintV1,
  HYPERAGENT_DISPATCH_EVENTS_REL_V1,
  isHyperAgentRedispatchBlockedV1,
  type HyperAgentDispatchEventV1,
} from "./hyperagent-dispatch-registry-v1";
import {
  type HyperAgentWorkQueueItemV1,
  type HyperAgentWorkQueueMissionTypeV1,
} from "./hyperagent-work-queue-v1";
import {
  enforceMissionFactoryRegistryTtlV1,
  loadMissionFactoryRegistryV1,
  queryMissionFactoryRegistryEntriesV1,
  saveMissionFactoryRegistryV1,
  transitionMissionFactoryRegistryEntryV1,
  type MissionFactoryMissionStateV1,
  type MissionFactoryMissionTypeV1,
  type MissionFactoryRegistryDocumentV1,
  type MissionFactoryRegistryEntryV1,
  type MissionFactoryStateTransitionV1,
} from "./mission-factory-registry-v1";

export const MISSION_FACTORY_ORCHESTRATOR_CONTRACT_V1 =
  "mission_factory_orchestrator_v1" as const;

export const MISSION_FACTORY_ORCHESTRATOR_REPORT_CONTRACT_V1 =
  "mission_factory_orchestrator_report_v1" as const;

export const MISSION_FACTORY_ORCHESTRATOR_SOURCE_COMMAND_V1 =
  "npm run buckparts:mission-factory-orchestrator" as const;

export const MISSION_FACTORY_ORCHESTRATOR_CC_JQ_PATH_V1 =
  ".command_center_v2.mission_factory_orchestrator_v1" as const;

export const MISSION_FACTORY_ORCHESTRATOR_ACTOR_V1 =
  "mission_factory_orchestrator_v1" as const;

export const MISSION_FACTORY_ORCHESTRATOR_DEFAULT_MAX_PARALLEL_DISPATCHES_V1 = 1 as const;

export const MISSION_FACTORY_ORCHESTRATOR_DRAFTS_REL_V1 =
  "data/fridge/batch-production/drafts" as const;

export type MissionFactoryOrchestratorTransitionRecordV1 = MissionFactoryStateTransitionV1 & {
  mission_id: string;
};

export type MissionFactoryOrchestratorDispatchRecordV1 = {
  mission_id: string;
  hyperagent_mission_id: string;
  dedup_key: string;
  mission_packet_json_rel_path: string;
  mission_packet_md_rel_path: string;
  dispatch_event_id: string;
};

export type MissionFactoryOrchestratorReportV1 = {
  contract: typeof MISSION_FACTORY_ORCHESTRATOR_REPORT_CONTRACT_V1;
  read_only: boolean;
  data_mutation: boolean;
  mutation_authorized: boolean;
  registry_write_performed: boolean;
  generated_at: string;
  source_command: typeof MISSION_FACTORY_ORCHESTRATOR_SOURCE_COMMAND_V1;
  confirm_orchestrate: boolean;
  max_parallel_dispatches: number;
  current_parallel_limit: number;
  active_dispatch_count: number;
  available_dispatch_slots: number;
  ttl_transitions_applied: number;
  dispatch_ready_promotions: number;
  ingest_closeouts_detected: number;
  dispatches_attempted: number;
  dispatches_recorded: number;
  dispatches_blocked: number;
  missions_by_lane: {
    queued: number;
    dispatch_ready: number;
    dispatched: number;
    ingest_received: number;
    blocked: number;
    expired: number;
  };
  transitions_applied: MissionFactoryOrchestratorTransitionRecordV1[];
  dispatch_records: MissionFactoryOrchestratorDispatchRecordV1[];
  blocked_dispatch_reasons: Array<{ mission_id: string; reasons: string[] }>;
  proven_facts: string[];
  unknown_facts: string[];
};

export type MissionFactoryOrchestratorPathOverridesV1 = HyperAgentOrchestratorPathOverridesV0 & {
  registryRootDir?: string;
  draftsAbsPath?: string;
};

function parseIso(iso: string): number {
  return Date.parse(iso);
}

function resolveRegistryRoot(args: {
  rootDir: string;
  registryRootDir?: string;
  pathOverrides?: MissionFactoryOrchestratorPathOverridesV1;
}): string {
  return args.registryRootDir ?? args.pathOverrides?.registryRootDir ?? args.rootDir;
}

function resolveDispatchEventsAbsPath(
  rootDir: string,
  overrides?: MissionFactoryOrchestratorPathOverridesV1,
): string {
  return (
    overrides?.dispatchEventsAbsPath ??
    path.join(rootDir, HYPERAGENT_DISPATCH_EVENTS_REL_V1)
  );
}

function resolveOutboxAbsPath(
  rootDir: string,
  overrides?: MissionFactoryOrchestratorPathOverridesV1,
): string {
  return (
    overrides?.outboxAbsPath ?? path.join(rootDir, HYPERAGENT_ORCHESTRATOR_OUTBOX_REL_V0)
  );
}

function resolveDraftsAbsPath(
  rootDir: string,
  overrides?: MissionFactoryOrchestratorPathOverridesV1,
): string {
  return overrides?.draftsAbsPath ?? path.join(rootDir, MISSION_FACTORY_ORCHESTRATOR_DRAFTS_REL_V1);
}

export function mapMissionFactoryTypeToHyperAgentMissionTypeV1(
  missionType: MissionFactoryMissionTypeV1,
): HyperAgentWorkQueueMissionTypeV1 {
  switch (missionType) {
    case "EVIDENCE_SCALING":
      return "BOUNDED_EVIDENCE_SLICE";
    case "FAMILY_RECONCILIATION":
    case "WRONG_PART_RESEARCH":
      return "BAD_MAPPING_RESEARCH";
    case "SAFE_LINK_COVERAGE":
    case "NEW_WEDGE_EXPANSION":
      return "EVIDENCE_CAPTURE";
    default: {
      const _exhaustive: never = missionType;
      return _exhaustive;
    }
  }
}

export function hyperAgentScopeKeyForMissionFactoryEntryV1(
  mission: MissionFactoryRegistryEntryV1,
): string {
  const hyperType = mapMissionFactoryTypeToHyperAgentMissionTypeV1(mission.mission_type);
  if (hyperType === "BAD_MAPPING_RESEARCH") {
    const slugPreview = mission.target_slugs.slice(0, 3).join(",");
    return `bad_mapping:${slugPreview || mission.target_family}`;
  }
  return mission.target_family;
}

export function hyperAgentFamilyKeyForMissionFactoryEntryV1(
  mission: MissionFactoryRegistryEntryV1,
): string | null {
  if (mission.target_family.startsWith("filter::")) return mission.target_family;
  return mission.target_family.includes("::") ? mission.target_family : null;
}

export function buildHyperAgentWorkQueueItemFromMissionFactoryEntryV1(
  mission: MissionFactoryRegistryEntryV1,
): HyperAgentWorkQueueItemV1 {
  const mission_type = mapMissionFactoryTypeToHyperAgentMissionTypeV1(mission.mission_type);
  const scope_key = hyperAgentScopeKeyForMissionFactoryEntryV1(mission);
  const family_key = hyperAgentFamilyKeyForMissionFactoryEntryV1(mission);
  return {
    queue_item_id: hyperAgentQueueItemIdV1(mission_type, scope_key),
    rank: mission.priority,
    mission_type,
    title: `${mission.mission_type} — ${mission.target_family}`,
    scope_key,
    family_key,
    slug_batch: [...mission.target_slugs],
    leverage_score: 0,
    safety_tier:
      mission.mission_type === "FAMILY_RECONCILIATION" ||
      mission.mission_type === "WRONG_PART_RESEARCH"
        ? "DANGEROUS_REMEDIATION"
        : mission.mission_type === "EVIDENCE_SCALING"
          ? "BOUNDED_EVIDENCE_RESEARCH"
          : "SAFE_EVIDENCE",
    recommended_action_scope:
      mission.mission_type === "FAMILY_RECONCILIATION" ||
      mission.mission_type === "WRONG_PART_RESEARCH"
        ? "DANGEROUS_REMEDIATION_ONLY"
        : "BOUNDED_RESEARCH_ONLY",
    hyperagent_dispatch_authorized: true,
    eligible_now: true,
    blocked_reasons: [],
    exact_hyperagent_prompt: null,
    owner_review_packet_rel_path: null,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    why: `mission_factory_registry mission_id=${mission.mission_id} source=${mission.source_reference}`,
  };
}

export function buildIngestPacketRelPathHintV1(hyperagentMissionId: string): string {
  return path.posix.join(
    MISSION_FACTORY_ORCHESTRATOR_DRAFTS_REL_V1,
    `${hyperagentMissionId}-hyperagent-ingest-packet-v1.json`,
  );
}

export function getMissionFactoryDispatchMetadataV1(
  mission: MissionFactoryRegistryEntryV1,
): Record<string, unknown> | null {
  for (const row of [...mission.state_history].reverse()) {
    if (row.to_state !== "DISPATCHED") continue;
    const meta = row.metadata ?? {};
    if (typeof meta.hyperagent_mission_id === "string") return meta;
  }
  return null;
}

export function readHyperAgentIngestDiscoveryStatusV1(absPath: string): string | null {
  if (!existsSync(absPath)) return null;
  try {
    const parsed = JSON.parse(readFileSync(absPath, "utf8")) as Record<string, unknown>;
    if (parsed.packet_type !== HYPERAGENT_INGEST_PACKET_CONTRACT_V1) return null;
    return typeof parsed.discovery_status === "string" ? parsed.discovery_status : null;
  } catch {
    return null;
  }
}

export function findIngestPacketForDispatchedMissionV1(args: {
  rootDir: string;
  mission: MissionFactoryRegistryEntryV1;
  pathOverrides?: MissionFactoryOrchestratorPathOverridesV1;
}): { rel_path: string; discovery_status: string } | null {
  const draftsAbs = resolveDraftsAbsPath(args.rootDir, args.pathOverrides);
  const dispatchMeta = getMissionFactoryDispatchMetadataV1(args.mission);
  const hintedId =
    typeof dispatchMeta?.hyperagent_mission_id === "string"
      ? dispatchMeta.hyperagent_mission_id
      : null;

  const candidateRelPaths: string[] = [];
  if (hintedId) candidateRelPaths.push(buildIngestPacketRelPathHintV1(hintedId));
  if (typeof dispatchMeta?.ingest_packet_rel_path_hint === "string") {
    candidateRelPaths.push(dispatchMeta.ingest_packet_rel_path_hint);
  }

  for (const rel of candidateRelPaths) {
    const abs = path.join(args.rootDir, rel);
    const status = readHyperAgentIngestDiscoveryStatusV1(abs);
    if (status === "DISCOVERY_COMPLETE") return { rel_path: rel, discovery_status: status };
  }

  if (!existsSync(draftsAbs)) return null;
  const familyKey = hyperAgentFamilyKeyForMissionFactoryEntryV1(args.mission);
  for (const name of readdirSync(draftsAbs)) {
    if (!name.endsWith("-hyperagent-ingest-packet-v1.json")) continue;
    const abs = path.join(draftsAbs, name);
    const status = readHyperAgentIngestDiscoveryStatusV1(abs);
    if (status !== "DISCOVERY_COMPLETE") continue;
    try {
      const parsed = JSON.parse(readFileSync(abs, "utf8")) as Record<string, unknown>;
      if (familyKey && parsed.family_key === familyKey) {
        return {
          rel_path: path.posix.join(MISSION_FACTORY_ORCHESTRATOR_DRAFTS_REL_V1, name),
          discovery_status: status,
        };
      }
      if (
        typeof parsed.mission_id === "string" &&
        hintedId &&
        parsed.mission_id === hintedId
      ) {
        return {
          rel_path: path.posix.join(MISSION_FACTORY_ORCHESTRATOR_DRAFTS_REL_V1, name),
          discovery_status: status,
        };
      }
    } catch {
      continue;
    }
  }
  return null;
}

function compareDispatchPriority(
  a: MissionFactoryRegistryEntryV1,
  b: MissionFactoryRegistryEntryV1,
): number {
  if (a.priority !== b.priority) return a.priority - b.priority;
  return parseIso(a.created_at) - parseIso(b.created_at);
}

export function countMissionFactoryOrchestratorLaneStatesV1(
  doc: MissionFactoryRegistryDocumentV1,
): MissionFactoryOrchestratorReportV1["missions_by_lane"] {
  const blockedStates: MissionFactoryMissionStateV1[] = [
    "DISCOVERY_BLOCKED",
    "VALIDATION_FAILED",
    "OWNER_REJECTED",
  ];
  let queued = 0;
  let dispatch_ready = 0;
  let dispatched = 0;
  let ingest_received = 0;
  let blocked = 0;
  let expired = 0;
  for (const mission of doc.missions) {
    switch (mission.state) {
      case "QUEUED":
        queued += 1;
        break;
      case "DISPATCH_READY":
        dispatch_ready += 1;
        break;
      case "DISPATCHED":
        dispatched += 1;
        break;
      case "DISCOVERY_COMPLETE":
      case "INGEST_COMMITTED":
        ingest_received += 1;
        break;
      case "EXPIRED":
        expired += 1;
        break;
      default:
        if (blockedStates.includes(mission.state)) blocked += 1;
        break;
    }
  }
  return { queued, dispatch_ready, dispatched, ingest_received, blocked, expired };
}

function recordTransition(
  transitions: MissionFactoryOrchestratorTransitionRecordV1[],
  missionId: string,
  row: MissionFactoryStateTransitionV1,
): void {
  transitions.push({ mission_id: missionId, ...row });
}

export function runMissionFactoryOrchestratorV1(args: {
  rootDir: string;
  registryRootDir?: string;
  confirmOrchestrate?: boolean;
  maxParallelDispatches?: number;
  now?: () => Date;
  pathOverrides?: MissionFactoryOrchestratorPathOverridesV1;
  operatorEvents?: HyperAgentDispatchEventV1[] | null;
}): { report: MissionFactoryOrchestratorReportV1; doc: MissionFactoryRegistryDocumentV1 } {
  const now = args.now ?? (() => new Date());
  const generatedAt = now().toISOString();
  const confirmOrchestrate = args.confirmOrchestrate === true;
  const maxParallelDispatches =
    args.maxParallelDispatches ?? MISSION_FACTORY_ORCHESTRATOR_DEFAULT_MAX_PARALLEL_DISPATCHES_V1;
  const registryRoot = resolveRegistryRoot(args);
  const dispatchAbsPath = resolveDispatchEventsAbsPath(args.rootDir, args.pathOverrides);
  const outboxAbsPath = resolveOutboxAbsPath(args.rootDir, args.pathOverrides);

  let doc = loadMissionFactoryRegistryV1(registryRoot);
  const transitions_applied: MissionFactoryOrchestratorTransitionRecordV1[] = [];
  const dispatch_records: MissionFactoryOrchestratorDispatchRecordV1[] = [];
  const blocked_dispatch_reasons: MissionFactoryOrchestratorReportV1["blocked_dispatch_reasons"] =
    [];

  const ttl = enforceMissionFactoryRegistryTtlV1({ doc, now: args.now });
  doc = ttl.doc;
  for (const row of ttl.transitions) {
    const mission = doc.missions.find((m) => m.mission_id === row.mission_id);
    const last = mission?.state_history[mission.state_history.length - 1];
    if (last) recordTransition(transitions_applied, row.mission_id, last);
  }

  let dispatch_ready_promotions = 0;
  const queuedMissions = queryMissionFactoryRegistryEntriesV1(doc, { state: "QUEUED" }).sort(
    compareDispatchPriority,
  );
  for (const mission of queuedMissions) {
    if (!confirmOrchestrate) {
      dispatch_ready_promotions += 1;
      continue;
    }
    const result = transitionMissionFactoryRegistryEntryV1({
      doc,
      mission_id: mission.mission_id,
      to_state: "DISPATCH_READY",
      actor: MISSION_FACTORY_ORCHESTRATOR_ACTOR_V1,
      reason: "orchestrator_promote_queued_to_dispatch_ready",
      metadata: { orchestrator_version: "v1.2" },
      now: args.now,
    });
    if (!result.ok) continue;
    doc = result.doc;
    dispatch_ready_promotions += 1;
    const last = result.entry.state_history[result.entry.state_history.length - 1];
    recordTransition(transitions_applied, mission.mission_id, last);
  }

  let ingest_closeouts_detected = 0;
  const dispatchedMissions = queryMissionFactoryRegistryEntriesV1(doc, { state: "DISPATCHED" });
  for (const mission of dispatchedMissions) {
    const ingest = findIngestPacketForDispatchedMissionV1({
      rootDir: args.rootDir,
      mission,
      pathOverrides: args.pathOverrides,
    });
    if (!ingest) continue;
    ingest_closeouts_detected += 1;
    if (!confirmOrchestrate) continue;
    const result = transitionMissionFactoryRegistryEntryV1({
      doc,
      mission_id: mission.mission_id,
      to_state: "DISCOVERY_COMPLETE",
      actor: MISSION_FACTORY_ORCHESTRATOR_ACTOR_V1,
      reason: "ingest_packet_discovery_complete_detected",
      metadata: {
        ingest_packet_rel_path: ingest.rel_path,
        discovery_status: ingest.discovery_status,
        ingest_received: true,
      },
      now: args.now,
    });
    if (!result.ok) continue;
    doc = result.doc;
    const last = result.entry.state_history[result.entry.state_history.length - 1];
    recordTransition(transitions_applied, mission.mission_id, last);
  }

  const active_dispatch_count_before = queryMissionFactoryRegistryEntriesV1(doc, {
    state: "DISPATCHED",
  }).length;
  const available_dispatch_slots = Math.max(
    0,
    maxParallelDispatches - active_dispatch_count_before,
  );

  const operatorEvents =
    args.operatorEvents ?? loadOperatorDispatchEventsV0(dispatchAbsPath);
  const registry = buildHyperAgentDispatchRegistryV1({
    rootDir: args.rootDir,
    now: args.now,
    operatorEvents,
  });

  let dispatches_attempted = 0;
  let dispatches_recorded = 0;
  let dispatches_blocked = 0;

  const readyMissions = (
    confirmOrchestrate
      ? queryMissionFactoryRegistryEntriesV1(doc, { state: "DISPATCH_READY" })
      : [
          ...queryMissionFactoryRegistryEntriesV1(doc, { state: "DISPATCH_READY" }),
          ...queryMissionFactoryRegistryEntriesV1(doc, { state: "QUEUED" }),
        ]
  ).sort(compareDispatchPriority);

  for (const mission of readyMissions) {
    if (dispatches_recorded >= available_dispatch_slots) break;
    dispatches_attempted += 1;

    const item = buildHyperAgentWorkQueueItemFromMissionFactoryEntryV1(mission);
    const dedupKey = hyperAgentDedupKeyV1(item.mission_type, item.scope_key);
    const fingerprint = hyperAgentSlugBatchFingerprintV1(item.slug_batch);
    const registryBlock = isHyperAgentRedispatchBlockedV1({
      registry,
      dedup_key: dedupKey,
      slug_batch_fingerprint: fingerprint,
      family_key: item.family_key,
      mission_type: item.mission_type,
    });

    const persistedDedup = operatorEvents.some((row) => row.dedup_key === dedupKey);
    const reasons: string[] = [];
    if (registryBlock.blocked) reasons.push(...registryBlock.reasons);
    if (persistedDedup) reasons.push(`already_dispatched_dedup_key:${dedupKey}`);

    if (reasons.length > 0) {
      dispatches_blocked += 1;
      blocked_dispatch_reasons.push({ mission_id: mission.mission_id, reasons });
      continue;
    }

    if (!confirmOrchestrate) {
      dispatches_recorded += 1;
      continue;
    }

    const packet = buildHyperAgentMissionPacketV0({
      item,
      generatedAt,
      halt_condition: "DISPATCH_RECORDED",
    });
    const outbox = writeMissionOutboxV0({ outboxAbsPath, packet });
    const dispatchEvent: HyperAgentDispatchEventV1 = {
      event_id: packet.mission_id,
      dedup_key: packet.dedup_key,
      queue_item_id: packet.queue_item_id,
      mission_type: packet.mission_type,
      scope_key: packet.scope_key,
      slug_batch_fingerprint: packet.slug_batch_fingerprint,
      dispatched_at: generatedAt,
      task_id: null,
      operator_note: `mission_factory:${mission.mission_id} orchestrator_v1.2 discovery only`,
    };
    appendDispatchEventV0({ absPath: dispatchAbsPath, event: dispatchEvent });
    operatorEvents.push(dispatchEvent);

    const dispatchResult = transitionMissionFactoryRegistryEntryV1({
      doc,
      mission_id: mission.mission_id,
      to_state: "DISPATCHED",
      actor: MISSION_FACTORY_ORCHESTRATOR_ACTOR_V1,
      reason: "hyperagent_dispatch_recorded",
      metadata: {
        hyperagent_mission_id: packet.mission_id,
        dedup_key: packet.dedup_key,
        queue_item_id: packet.queue_item_id,
        mission_packet_json_rel_path: outbox.jsonRelPath,
        mission_packet_md_rel_path: outbox.mdRelPath,
        ingest_packet_rel_path_hint: buildIngestPacketRelPathHintV1(packet.mission_id),
        dispatch_event_id: dispatchEvent.event_id,
      },
      now: args.now,
    });
    if (!dispatchResult.ok) {
      dispatches_blocked += 1;
      blocked_dispatch_reasons.push({
        mission_id: mission.mission_id,
        reasons: [dispatchResult.error],
      });
      continue;
    }

    doc = dispatchResult.doc;
    dispatches_recorded += 1;
    dispatch_records.push({
      mission_id: mission.mission_id,
      hyperagent_mission_id: packet.mission_id,
      dedup_key: packet.dedup_key,
      mission_packet_json_rel_path: outbox.jsonRelPath,
      mission_packet_md_rel_path: outbox.mdRelPath,
      dispatch_event_id: dispatchEvent.event_id,
    });
    const last = dispatchResult.entry.state_history[dispatchResult.entry.state_history.length - 1];
    recordTransition(transitions_applied, mission.mission_id, last);
  }

  const active_dispatch_count = queryMissionFactoryRegistryEntriesV1(doc, {
    state: "DISPATCHED",
  }).length;
  const available_dispatch_slots_after = Math.max(
    0,
    maxParallelDispatches - active_dispatch_count,
  );

  const registry_write_performed = confirmOrchestrate && transitions_applied.length > 0;
  if (registry_write_performed) {
    saveMissionFactoryRegistryV1(registryRoot, doc);
  }

  const missions_by_lane = countMissionFactoryOrchestratorLaneStatesV1(doc);

  const report: MissionFactoryOrchestratorReportV1 = {
    contract: MISSION_FACTORY_ORCHESTRATOR_REPORT_CONTRACT_V1,
    read_only: !confirmOrchestrate,
    data_mutation: confirmOrchestrate,
    mutation_authorized: false,
    registry_write_performed,
    generated_at: generatedAt,
    source_command: MISSION_FACTORY_ORCHESTRATOR_SOURCE_COMMAND_V1,
    confirm_orchestrate: confirmOrchestrate,
    max_parallel_dispatches: maxParallelDispatches,
    current_parallel_limit: maxParallelDispatches,
    active_dispatch_count,
    available_dispatch_slots: available_dispatch_slots_after,
    ttl_transitions_applied: ttl.transitions.length,
    dispatch_ready_promotions,
    ingest_closeouts_detected,
    dispatches_attempted,
    dispatches_recorded,
    dispatches_blocked,
    missions_by_lane,
    transitions_applied,
    dispatch_records,
    blocked_dispatch_reasons,
    proven_facts: [
      `PROVEN: active_dispatch_count=${String(active_dispatch_count)} available_dispatch_slots=${String(available_dispatch_slots_after)} max_parallel=${String(maxParallelDispatches)}.`,
      `PROVEN: missions_by_lane queued=${String(missions_by_lane.queued)} dispatch_ready=${String(missions_by_lane.dispatch_ready)} dispatched=${String(missions_by_lane.dispatched)} ingest_received=${String(missions_by_lane.ingest_received)} blocked=${String(missions_by_lane.blocked)} expired=${String(missions_by_lane.expired)}.`,
      `PROVEN: registry_write_performed=${String(registry_write_performed)} confirm_orchestrate=${String(confirmOrchestrate)}.`,
      "PROVEN: Orchestrator mutates only mission registry, hyperagent outbox, and dispatch events — no product data paths.",
    ],
    unknown_facts: [
      "UNKNOWN: HyperAgent runtime task completion until operator or ingest closeout updates registry.",
    ],
  };

  return { report, doc };
}
