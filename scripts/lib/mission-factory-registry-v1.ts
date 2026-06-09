/**
 * MISSION_FACTORY_REGISTRY_V1 — mission lifecycle registry (V1.0 slice).
 * Tracks HyperAgent discovery mission state; does not dispatch, queue-generate, or mutate product data.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

export const MISSION_FACTORY_REGISTRY_CONTRACT_V1 = "mission_factory_registry_v1" as const;

export const MISSION_FACTORY_REGISTRY_JSON_REL_V1 =
  "data/mission-factory/mission-registry-v1.json" as const;

export const MISSION_FACTORY_REGISTRY_REPORT_CONTRACT_V1 =
  "mission_factory_registry_report_v1" as const;

export const MISSION_FACTORY_REGISTRY_SOURCE_COMMAND_V1 =
  "npm run buckparts:mission-factory-registry" as const;

export const MISSION_FACTORY_REGISTRY_CC_JQ_PATH_V1 =
  ".command_center_v2.mission_factory_registry_v1" as const;

export const MISSION_FACTORY_MISSION_TYPES_V1 = [
  "EVIDENCE_SCALING",
  "WRONG_PART_RESEARCH",
  "FAMILY_RECONCILIATION",
  "SAFE_LINK_COVERAGE",
  "NEW_WEDGE_EXPANSION",
] as const;

export type MissionFactoryMissionTypeV1 = (typeof MISSION_FACTORY_MISSION_TYPES_V1)[number];

export const MISSION_FACTORY_WEDGES_V1 = [
  "refrigerator",
  "air_purifier",
  "whole_house_water",
  "vacuum",
] as const;

export type MissionFactoryWedgeV1 = (typeof MISSION_FACTORY_WEDGES_V1)[number];

export const MISSION_FACTORY_MISSION_STATES_V1 = [
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
] as const;

export type MissionFactoryMissionStateV1 = (typeof MISSION_FACTORY_MISSION_STATES_V1)[number];

export const MISSION_FACTORY_ACTIVE_MISSION_STATES_V1 = [
  "QUEUED",
  "DISPATCH_READY",
  "DISPATCHED",
  "DISCOVERY_COMPLETE",
  "INGEST_COMMITTED",
  "CURSOR_VALIDATED",
  "OWNER_REVIEWED",
  "PROMOTED",
] as const satisfies readonly MissionFactoryMissionStateV1[];

export const MISSION_FACTORY_TERMINAL_MISSION_STATES_V1 = [
  "CLOSED",
  "DISCOVERY_BLOCKED",
  "VALIDATION_FAILED",
  "OWNER_REJECTED",
  "EXPIRED",
] as const satisfies readonly MissionFactoryMissionStateV1[];

export const MISSION_FACTORY_TTL_HOURS_V1: Partial<Record<MissionFactoryMissionStateV1, number>> = {
  QUEUED: 72,
  DISPATCH_READY: 24,
  DISPATCHED: 48,
  DISCOVERY_COMPLETE: 24,
  INGEST_COMMITTED: 24,
};

export type MissionFactoryStateTransitionV1 = {
  from_state: MissionFactoryMissionStateV1;
  to_state: MissionFactoryMissionStateV1;
  actor: string;
  timestamp: string;
  reason: string;
  metadata: Record<string, unknown>;
};

export type MissionFactoryMissionResultV1 = {
  validation_result: "PASS" | "PARTIAL" | "FAIL";
  models_researched: number;
  evidence_entries_created: number;
  conflicts_found: string[];
  guard_candidates_created: string[];
  owner_review_result: "APPROVED" | "REJECTED" | "DEFERRED" | "SKIPPED" | null;
};

export type MissionFactoryRegistryEntryV1 = {
  mission_id: string;
  mission_type: MissionFactoryMissionTypeV1;
  wedge: MissionFactoryWedgeV1;
  state: MissionFactoryMissionStateV1;
  priority: number;
  target_family: string;
  target_slugs: string[];
  source_reference: string;
  created_at: string;
  state_history: MissionFactoryStateTransitionV1[];
  current_actor: string;
  ttl_expires_at: string | null;
  audit_phase_at_creation: number;
  result: MissionFactoryMissionResultV1 | null;
};

export type MissionFactoryRegistryDocumentV1 = {
  contract: typeof MISSION_FACTORY_REGISTRY_CONTRACT_V1;
  schema_version: "1.0";
  read_only: false;
  data_mutation: true;
  mutation_authorized: false;
  created_at: string;
  missions: MissionFactoryRegistryEntryV1[];
};

export type MissionFactoryRegistryReportV1 = {
  contract: typeof MISSION_FACTORY_REGISTRY_REPORT_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  mutation_authorized: false;
  generated_at: string;
  source_command: typeof MISSION_FACTORY_REGISTRY_SOURCE_COMMAND_V1;
  registry_rel_path: typeof MISSION_FACTORY_REGISTRY_JSON_REL_V1;
  total_missions: number;
  missions_by_state: Record<MissionFactoryMissionStateV1, number>;
  missions_by_type: Record<MissionFactoryMissionTypeV1, number>;
  missions_by_wedge: Record<MissionFactoryWedgeV1, number>;
  active_mission_count: number;
  terminal_mission_count: number;
  oldest_active_mission: {
    mission_id: string;
    state: MissionFactoryMissionStateV1;
    age_hours: number;
    current_actor: string;
  } | null;
  throughput_closed_per_day: number;
  active_missions: Array<{
    mission_id: string;
    mission_type: MissionFactoryMissionTypeV1;
    wedge: MissionFactoryWedgeV1;
    state: MissionFactoryMissionStateV1;
    priority: number;
    target_family: string;
    current_actor: string;
    age_hours: number;
    ttl_expires_at: string | null;
    ttl_expired: boolean;
  }>;
  expired_blocked_rejected_summary: Array<{
    mission_id: string;
    state: MissionFactoryMissionStateV1;
    reason: string;
  }>;
  completed_missions_summary: Array<{
    mission_id: string;
    mission_type: MissionFactoryMissionTypeV1;
    wedge: MissionFactoryWedgeV1;
    duration_hours: number | null;
    validation_result: MissionFactoryMissionResultV1["validation_result"] | null;
    guard_candidates_created: number;
  }>;
  proven_facts: string[];
  unknown_facts: string[];
};

const MISSION_TYPES = new Set<string>(MISSION_FACTORY_MISSION_TYPES_V1);
const WEDGES = new Set<string>(MISSION_FACTORY_WEDGES_V1);
const STATES = new Set<string>(MISSION_FACTORY_MISSION_STATES_V1);
const ACTIVE_STATES = new Set<string>(MISSION_FACTORY_ACTIVE_MISSION_STATES_V1);

const VALID_TRANSITIONS: Record<MissionFactoryMissionStateV1, MissionFactoryMissionStateV1[]> = {
  QUEUED: ["DISPATCH_READY", "EXPIRED"],
  DISPATCH_READY: ["DISPATCHED", "QUEUED"],
  DISPATCHED: ["DISCOVERY_COMPLETE", "DISCOVERY_BLOCKED"],
  DISCOVERY_COMPLETE: ["INGEST_COMMITTED"],
  INGEST_COMMITTED: ["CURSOR_VALIDATED"],
  CURSOR_VALIDATED: ["OWNER_REVIEWED", "PROMOTED", "VALIDATION_FAILED"],
  OWNER_REVIEWED: ["PROMOTED", "OWNER_REJECTED"],
  PROMOTED: ["GUARD_CAPTURED", "CLOSED"],
  GUARD_CAPTURED: ["CLOSED"],
  CLOSED: [],
  DISCOVERY_BLOCKED: ["QUEUED", "CLOSED"],
  VALIDATION_FAILED: ["QUEUED", "CLOSED"],
  OWNER_REJECTED: ["QUEUED", "CLOSED"],
  EXPIRED: ["QUEUED", "CLOSED"],
};

const CURRENT_ACTOR_BY_STATE: Record<MissionFactoryMissionStateV1, string> = {
  QUEUED: "queue_generator",
  DISPATCH_READY: "orchestrator",
  DISPATCHED: "hyperagent",
  DISCOVERY_COMPLETE: "hyperagent",
  INGEST_COMMITTED: "ops_agent",
  CURSOR_VALIDATED: "cursor",
  OWNER_REVIEWED: "owner",
  PROMOTED: "promotion",
  GUARD_CAPTURED: "learning_loop",
  CLOSED: "system",
  DISCOVERY_BLOCKED: "hyperagent",
  VALIDATION_FAILED: "cursor",
  OWNER_REJECTED: "owner",
  EXPIRED: "system",
};

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function parseIso(value: string): number {
  return Date.parse(value);
}

function hoursBetween(startIso: string, endIso: string): number {
  return (parseIso(endIso) - parseIso(startIso)) / (1000 * 60 * 60);
}

function addHours(iso: string, hours: number): string {
  return new Date(parseIso(iso) + hours * 60 * 60 * 1000).toISOString();
}

function emptyCounts<T extends string>(keys: readonly T[]): Record<T, number> {
  return Object.fromEntries(keys.map((key) => [key, 0])) as Record<T, number>;
}

export function missionFactoryDedupKeyV1(args: {
  mission_type: MissionFactoryMissionTypeV1;
  target_family: string;
  wedge: MissionFactoryWedgeV1;
}): string {
  return `${args.mission_type}:${args.wedge}:${args.target_family.trim().toLowerCase()}`;
}

export function isMissionFactoryActiveStateV1(state: MissionFactoryMissionStateV1): boolean {
  return ACTIVE_STATES.has(state);
}

export function isMissionFactoryTransitionAllowedV1(
  from: MissionFactoryMissionStateV1,
  to: MissionFactoryMissionStateV1,
): boolean {
  return VALID_TRANSITIONS[from].includes(to);
}

export function missionFactoryTtlExpiresAtForStateV1(
  state: MissionFactoryMissionStateV1,
  referenceIso: string,
): string | null {
  const hours = MISSION_FACTORY_TTL_HOURS_V1[state];
  if (hours == null) return null;
  return addHours(referenceIso, hours);
}

export function validateMissionFactoryRegistryEntryV1(
  entry: unknown,
): { ok: true; entry: MissionFactoryRegistryEntryV1 } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  if (entry === null || typeof entry !== "object" || Array.isArray(entry)) {
    return { ok: false, errors: ["mission entry must be a non-null object"] };
  }
  const o = entry as Record<string, unknown>;
  if (!isNonEmptyString(o.mission_id)) errors.push("mission_id must be a non-empty string");
  if (!MISSION_TYPES.has(String(o.mission_type))) errors.push("mission_type invalid");
  if (!WEDGES.has(String(o.wedge))) errors.push("wedge invalid");
  if (!STATES.has(String(o.state))) errors.push("state invalid");
  if (typeof o.priority !== "number" || o.priority < 1 || o.priority > 5) {
    errors.push("priority must be 1-5");
  }
  if (!isNonEmptyString(o.target_family)) errors.push("target_family required");
  if (!Array.isArray(o.target_slugs)) errors.push("target_slugs must be an array");
  if (!isNonEmptyString(o.source_reference)) errors.push("source_reference required");
  if (!isNonEmptyString(o.created_at) || Number.isNaN(parseIso(o.created_at))) {
    errors.push("created_at must be parseable ISO timestamp");
  }
  if (!Array.isArray(o.state_history)) errors.push("state_history must be an array");
  if (!isNonEmptyString(o.current_actor)) errors.push("current_actor required");
  if (o.ttl_expires_at != null && (typeof o.ttl_expires_at !== "string" || Number.isNaN(parseIso(o.ttl_expires_at)))) {
    errors.push("ttl_expires_at must be null or parseable ISO timestamp");
  }
  if (typeof o.audit_phase_at_creation !== "number") {
    errors.push("audit_phase_at_creation must be a number");
  }
  if (o.result != null && typeof o.result !== "object") errors.push("result must be object or null");
  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, entry: o as unknown as MissionFactoryRegistryEntryV1 };
}

export function validateMissionFactoryRegistryDocumentV1(
  doc: unknown,
): { ok: true; doc: MissionFactoryRegistryDocumentV1 } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  if (doc === null || typeof doc !== "object" || Array.isArray(doc)) {
    return { ok: false, errors: ["document must be a non-null object"] };
  }
  const o = doc as Record<string, unknown>;
  if (o.contract !== MISSION_FACTORY_REGISTRY_CONTRACT_V1) {
    errors.push(`contract must be ${MISSION_FACTORY_REGISTRY_CONTRACT_V1}`);
  }
  if (o.schema_version !== "1.0") errors.push('schema_version must be "1.0"');
  if (o.read_only !== false) errors.push("read_only must be false on registry document");
  if (o.data_mutation !== true) errors.push("data_mutation must be true on registry document");
  if (o.mutation_authorized !== false) errors.push("mutation_authorized must be false");
  if (!isNonEmptyString(o.created_at) || Number.isNaN(parseIso(o.created_at))) {
    errors.push("created_at must be parseable ISO timestamp");
  }
  if (!Array.isArray(o.missions)) errors.push("missions must be an array");
  if (errors.length > 0) return { ok: false, errors };

  const missions: MissionFactoryRegistryEntryV1[] = [];
  for (const [index, raw] of (o.missions as unknown[]).entries()) {
    const validated = validateMissionFactoryRegistryEntryV1(raw);
    if (!validated.ok) {
      errors.push(`missions[${String(index)}]: ${validated.errors.join("; ")}`);
      continue;
    }
    missions.push(validated.entry);
  }
  if (errors.length > 0) return { ok: false, errors };

  const ids = new Set<string>();
  for (const mission of missions) {
    if (ids.has(mission.mission_id)) {
      errors.push(`duplicate mission_id ${mission.mission_id}`);
    }
    ids.add(mission.mission_id);
  }
  if (errors.length > 0) return { ok: false, errors };

  return { ok: true, doc: { ...(o as MissionFactoryRegistryDocumentV1), missions } };
}

export function loadMissionFactoryRegistryV1(rootDir: string): MissionFactoryRegistryDocumentV1 {
  const abs = path.join(rootDir, MISSION_FACTORY_REGISTRY_JSON_REL_V1);
  if (!existsSync(abs)) {
    return {
      contract: MISSION_FACTORY_REGISTRY_CONTRACT_V1,
      schema_version: "1.0",
      read_only: false,
      data_mutation: true,
      mutation_authorized: false,
      created_at: new Date(0).toISOString(),
      missions: [],
    };
  }
  const parsed = JSON.parse(readFileSync(abs, "utf8")) as unknown;
  const validated = validateMissionFactoryRegistryDocumentV1(parsed);
  if (!validated.ok) {
    throw new Error(`mission registry invalid: ${validated.errors.join("; ")}`);
  }
  return validated.doc;
}

export function saveMissionFactoryRegistryV1(
  rootDir: string,
  doc: MissionFactoryRegistryDocumentV1,
): void {
  const validated = validateMissionFactoryRegistryDocumentV1(doc);
  if (!validated.ok) {
    throw new Error(`cannot save invalid mission registry: ${validated.errors.join("; ")}`);
  }
  const abs = path.join(rootDir, MISSION_FACTORY_REGISTRY_JSON_REL_V1);
  mkdirSync(path.dirname(abs), { recursive: true });
  writeFileSync(abs, `${JSON.stringify(validated.doc, null, 2)}\n`, "utf8");
}

export function findActiveMissionByDedupKeyV1(
  doc: MissionFactoryRegistryDocumentV1,
  dedupKey: string,
): MissionFactoryRegistryEntryV1 | null {
  for (const mission of doc.missions) {
    if (!isMissionFactoryActiveStateV1(mission.state)) continue;
    if (missionFactoryDedupKeyV1(mission) === dedupKey) return mission;
  }
  return null;
}

export function allocateMissionFactoryMissionIdV1(
  doc: MissionFactoryRegistryDocumentV1,
  now?: () => Date,
): string {
  const year = (now ?? (() => new Date()))().getUTCFullYear();
  const prefix = `MF-${String(year)}-`;
  let maxSeq = 0;
  for (const mission of doc.missions) {
    if (!mission.mission_id.startsWith(prefix)) continue;
    const seq = Number.parseInt(mission.mission_id.slice(prefix.length), 10);
    if (Number.isFinite(seq) && seq > maxSeq) maxSeq = seq;
  }
  return `${prefix}${String(maxSeq + 1).padStart(4, "0")}`;
}

export type CreateMissionFactoryRegistryEntryInputV1 = {
  mission_type: MissionFactoryMissionTypeV1;
  wedge: MissionFactoryWedgeV1;
  priority: number;
  target_family: string;
  target_slugs: string[];
  source_reference: string;
  audit_phase_at_creation?: number;
  actor?: string;
  reason?: string;
};

export function createMissionFactoryRegistryEntryV1(args: {
  doc: MissionFactoryRegistryDocumentV1;
  input: CreateMissionFactoryRegistryEntryInputV1;
  now?: () => Date;
}):
  | { ok: true; entry: MissionFactoryRegistryEntryV1; doc: MissionFactoryRegistryDocumentV1 }
  | { ok: false; error: string } {
  const now = args.now ?? (() => new Date());
  const createdAt = now().toISOString();
  const dedupKey = missionFactoryDedupKeyV1(args.input);
  if (findActiveMissionByDedupKeyV1(args.doc, dedupKey)) {
    return {
      ok: false,
      error: `deduplication blocked active mission for ${dedupKey}`,
    };
  }

  const missionId = allocateMissionFactoryMissionIdV1(args.doc, args.now);
  const actor = args.input.actor ?? "queue_generator";
  const entry: MissionFactoryRegistryEntryV1 = {
    mission_id: missionId,
    mission_type: args.input.mission_type,
    wedge: args.input.wedge,
    state: "QUEUED",
    priority: args.input.priority,
    target_family: args.input.target_family,
    target_slugs: [...args.input.target_slugs],
    source_reference: args.input.source_reference,
    created_at: createdAt,
    state_history: [
      {
        from_state: "QUEUED",
        to_state: "QUEUED",
        actor,
        timestamp: createdAt,
        reason: args.input.reason ?? "mission_created",
        metadata: { dedup_key: dedupKey },
      },
    ],
    current_actor: CURRENT_ACTOR_BY_STATE.QUEUED,
    ttl_expires_at: missionFactoryTtlExpiresAtForStateV1("QUEUED", createdAt),
    audit_phase_at_creation: args.input.audit_phase_at_creation ?? 0,
    result: null,
  };

  const validated = validateMissionFactoryRegistryEntryV1(entry);
  if (!validated.ok) {
    return { ok: false, error: validated.errors.join("; ") };
  }

  return {
    ok: true,
    entry: validated.entry,
    doc: { ...args.doc, missions: [...args.doc.missions, validated.entry] },
  };
}

export function getMissionFactoryRegistryEntryV1(
  doc: MissionFactoryRegistryDocumentV1,
  missionId: string,
): MissionFactoryRegistryEntryV1 | null {
  return doc.missions.find((mission) => mission.mission_id === missionId) ?? null;
}

export function queryMissionFactoryRegistryEntriesV1(
  doc: MissionFactoryRegistryDocumentV1,
  filter?: {
    state?: MissionFactoryMissionStateV1 | MissionFactoryMissionStateV1[];
    mission_type?: MissionFactoryMissionTypeV1;
    wedge?: MissionFactoryWedgeV1;
    active_only?: boolean;
  },
): MissionFactoryRegistryEntryV1[] {
  const states =
    filter?.state == null
      ? null
      : Array.isArray(filter.state)
        ? new Set(filter.state)
        : new Set([filter.state]);

  return doc.missions.filter((mission) => {
    if (filter?.active_only && !isMissionFactoryActiveStateV1(mission.state)) return false;
    if (states && !states.has(mission.state)) return false;
    if (filter?.mission_type && mission.mission_type !== filter.mission_type) return false;
    if (filter?.wedge && mission.wedge !== filter.wedge) return false;
    return true;
  });
}

export function transitionMissionFactoryRegistryEntryV1(args: {
  doc: MissionFactoryRegistryDocumentV1;
  mission_id: string;
  to_state: MissionFactoryMissionStateV1;
  actor: string;
  reason: string;
  metadata?: Record<string, unknown>;
  result?: MissionFactoryMissionResultV1 | null;
  now?: () => Date;
}):
  | { ok: true; entry: MissionFactoryRegistryEntryV1; doc: MissionFactoryRegistryDocumentV1 }
  | { ok: false; error: string } {
  const mission = getMissionFactoryRegistryEntryV1(args.doc, args.mission_id);
  if (!mission) return { ok: false, error: `mission not found: ${args.mission_id}` };

  const fromState = mission.state;
  if (!isMissionFactoryTransitionAllowedV1(fromState, args.to_state)) {
    return {
      ok: false,
      error: `invalid transition ${fromState} -> ${args.to_state}`,
    };
  }

  const now = args.now ?? (() => new Date());
  const timestamp = now().toISOString();
  const transition: MissionFactoryStateTransitionV1 = {
    from_state: fromState,
    to_state: args.to_state,
    actor: args.actor,
    timestamp,
    reason: args.reason,
    metadata: args.metadata ?? {},
  };

  const updated: MissionFactoryRegistryEntryV1 = {
    ...mission,
    state: args.to_state,
    current_actor: CURRENT_ACTOR_BY_STATE[args.to_state],
    ttl_expires_at: missionFactoryTtlExpiresAtForStateV1(args.to_state, timestamp),
    state_history: [...mission.state_history, transition],
    result: args.result === undefined ? mission.result : args.result,
  };

  const validated = validateMissionFactoryRegistryEntryV1(updated);
  if (!validated.ok) {
    return { ok: false, error: validated.errors.join("; ") };
  }

  const missions = args.doc.missions.map((row) =>
    row.mission_id === args.mission_id ? validated.entry : row,
  );

  return { ok: true, entry: validated.entry, doc: { ...args.doc, missions } };
}

export type MissionFactoryTtlEnforcementResultV1 = {
  doc: MissionFactoryRegistryDocumentV1;
  transitions: Array<{
    mission_id: string;
    from_state: MissionFactoryMissionStateV1;
    to_state: MissionFactoryMissionStateV1;
    reason: string;
  }>;
};

export function enforceMissionFactoryRegistryTtlV1(args: {
  doc: MissionFactoryRegistryDocumentV1;
  now?: () => Date;
}): MissionFactoryTtlEnforcementResultV1 {
  const now = args.now ?? (() => new Date());
  const referenceIso = now().toISOString();
  let doc = args.doc;
  const transitions: MissionFactoryTtlEnforcementResultV1["transitions"] = [];

  for (const mission of [...doc.missions]) {
    if (!mission.ttl_expires_at) continue;
    if (parseIso(referenceIso) <= parseIso(mission.ttl_expires_at)) continue;

    let toState: MissionFactoryMissionStateV1 | null = null;
    let reason = "ttl_expired";

    if (mission.state === "QUEUED") {
      toState = "EXPIRED";
      reason = "queued_ttl_72h_exceeded";
    } else if (mission.state === "DISPATCH_READY") {
      toState = "QUEUED";
      reason = "dispatch_ready_ttl_24h_requeue";
    } else if (mission.state === "DISPATCHED") {
      toState = "DISCOVERY_BLOCKED";
      reason = "dispatched_ttl_48h_exceeded";
    } else if (mission.state === "DISCOVERY_COMPLETE") {
      toState = "DISCOVERY_BLOCKED";
      reason = "discovery_complete_ttl_24h_exceeded";
    } else if (mission.state === "INGEST_COMMITTED") {
      toState = "DISCOVERY_BLOCKED";
      reason = "ingest_committed_ttl_24h_exceeded";
    }

    if (!toState) continue;

    const result = transitionMissionFactoryRegistryEntryV1({
      doc,
      mission_id: mission.mission_id,
      to_state: toState,
      actor: "system",
      reason,
      metadata: {
        expired_from_state: mission.state,
        ttl_expires_at: mission.ttl_expires_at,
        ttl_hours: MISSION_FACTORY_TTL_HOURS_V1[mission.state] ?? null,
      },
      now,
    });
    if (!result.ok) continue;
    doc = result.doc;
    transitions.push({
      mission_id: mission.mission_id,
      from_state: mission.state,
      to_state: toState,
      reason,
    });
  }

  return { doc, transitions };
}

export function buildMissionFactoryRegistryReportV1(args: {
  rootDir: string;
  now?: () => Date;
}): MissionFactoryRegistryReportV1 {
  const now = args.now ?? (() => new Date());
  const generatedAt = now().toISOString();
  const doc = loadMissionFactoryRegistryV1(args.rootDir);

  const missions_by_state = emptyCounts(MISSION_FACTORY_MISSION_STATES_V1);
  const missions_by_type = emptyCounts(MISSION_FACTORY_MISSION_TYPES_V1);
  const missions_by_wedge = emptyCounts(MISSION_FACTORY_WEDGES_V1);

  for (const mission of doc.missions) {
    missions_by_state[mission.state] += 1;
    missions_by_type[mission.mission_type] += 1;
    missions_by_wedge[mission.wedge] += 1;
  }

  const activeMissions = queryMissionFactoryRegistryEntriesV1(doc, { active_only: true }).sort(
    (a, b) => parseIso(a.created_at) - parseIso(b.created_at),
  );

  const oldestActive = activeMissions[0] ?? null;
  const closedLastDay = doc.missions.filter((mission) => {
    if (mission.state !== "CLOSED") return false;
    const closedTransition = [...mission.state_history]
      .reverse()
      .find((row) => row.to_state === "CLOSED");
    if (!closedTransition) return false;
    return hoursBetween(closedTransition.timestamp, generatedAt) <= 24;
  });

  const active_missions = activeMissions.map((mission) => ({
    mission_id: mission.mission_id,
    mission_type: mission.mission_type,
    wedge: mission.wedge,
    state: mission.state,
    priority: mission.priority,
    target_family: mission.target_family,
    current_actor: mission.current_actor,
    age_hours: hoursBetween(mission.created_at, generatedAt),
    ttl_expires_at: mission.ttl_expires_at,
    ttl_expired:
      mission.ttl_expires_at != null && parseIso(generatedAt) > parseIso(mission.ttl_expires_at),
  }));

  const expired_blocked_rejected_summary = doc.missions
    .filter((mission) =>
      (
        [
          "EXPIRED",
          "DISCOVERY_BLOCKED",
          "VALIDATION_FAILED",
          "OWNER_REJECTED",
        ] as MissionFactoryMissionStateV1[]
      ).includes(mission.state),
    )
    .map((mission) => {
      const last = mission.state_history[mission.state_history.length - 1];
      return {
        mission_id: mission.mission_id,
        state: mission.state,
        reason: last?.reason ?? "unknown",
      };
    });

  const completed_missions_summary = doc.missions
    .filter((mission) => mission.state === "CLOSED" || mission.state === "PROMOTED")
    .map((mission) => {
      const closedAt =
        mission.state_history.find((row) => row.to_state === "CLOSED")?.timestamp ?? null;
      return {
        mission_id: mission.mission_id,
        mission_type: mission.mission_type,
        wedge: mission.wedge,
        duration_hours: closedAt ? hoursBetween(mission.created_at, closedAt) : null,
        validation_result: mission.result?.validation_result ?? null,
        guard_candidates_created: mission.result?.guard_candidates_created.length ?? 0,
      };
    });

  return {
    contract: MISSION_FACTORY_REGISTRY_REPORT_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    generated_at: generatedAt,
    source_command: MISSION_FACTORY_REGISTRY_SOURCE_COMMAND_V1,
    registry_rel_path: MISSION_FACTORY_REGISTRY_JSON_REL_V1,
    total_missions: doc.missions.length,
    missions_by_state,
    missions_by_type,
    missions_by_wedge,
    active_mission_count: activeMissions.length,
    terminal_mission_count: doc.missions.length - activeMissions.length,
    oldest_active_mission: oldestActive
      ? {
          mission_id: oldestActive.mission_id,
          state: oldestActive.state,
          age_hours: hoursBetween(oldestActive.created_at, generatedAt),
          current_actor: oldestActive.current_actor,
        }
      : null,
    throughput_closed_per_day: closedLastDay.length,
    active_missions,
    expired_blocked_rejected_summary,
    completed_missions_summary,
    proven_facts: [
      `PROVEN: mission registry contract=${MISSION_FACTORY_REGISTRY_CONTRACT_V1} at ${MISSION_FACTORY_REGISTRY_JSON_REL_V1}.`,
      `PROVEN: total_missions=${String(doc.missions.length)} active_mission_count=${String(activeMissions.length)}.`,
      `PROVEN: throughput_closed_per_day=${String(closedLastDay.length)} (missions reaching CLOSED in last 24h).`,
      "PROVEN: Registry tracks discovery lifecycle only — mutation_authorized=false; no product data writes.",
    ],
    unknown_facts: [
      "UNKNOWN: Live HyperAgent in-flight missions without registry entries.",
      "UNKNOWN: Whether committed ingest packets exist for registry DISPATCHED missions without state updates.",
    ],
  };
}
