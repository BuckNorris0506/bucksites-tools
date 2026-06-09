/**
 * Read-only HYPERAGENT_DISPATCH_REGISTRY_V1 — dispatch blocking projection.
 * Records what must not be re-dispatched to HyperAgent. HyperAgent creates evidence, not truth.
 */

import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";

import { buildCommandCenterControlGraphRollupV1 } from "./command-center-control-graph-rollup-v1";
import {
  CURSOR_VALIDATION_PACKET_CONTRACT_V1,
} from "./buckparts-ops-agent-workflow-v1";
import {
  EDR4RXD1_CURSOR_VALIDATION_JSON_REL_V1,
  EDR4RXD1_FAMILY_KEY_V1,
  EDR4RXD1_OWNER_REVIEW_PACKET_CONTRACT_V1,
  EDR4RXD1_OWNER_REVIEW_PACKET_JSON_REL_V1,
} from "./edr4rxd1-owner-review-packet-v1";

export const HYPERAGENT_DISPATCH_MISSION_TYPES_V1 = [
  "EVIDENCE_CAPTURE",
  "BAD_MAPPING_RESEARCH",
  "BOUNDED_EVIDENCE_SLICE",
] as const;

export type HyperAgentDispatchMissionTypeV1 =
  (typeof HYPERAGENT_DISPATCH_MISSION_TYPES_V1)[number];

export const HYPERAGENT_DISPATCH_REGISTRY_CONTRACT_V1 =
  "hyperagent_dispatch_registry_v1" as const;

export const HYPERAGENT_DISPATCH_EVENTS_CONTRACT_V1 =
  "hyperagent_dispatch_events_v1" as const;

export const HYPERAGENT_DISPATCH_EVENTS_REL_V1 =
  "data/fridge/batch-production/hyperagent/hyperagent-dispatch-events-v1.json" as const;

export const HYPERAGENT_DISPATCH_REGISTRY_ENTRY_STATUSES_V1 = [
  "FROZEN",
  "OWNER_REVIEW_READY",
  "DISPATCHED",
] as const;

export type HyperAgentDispatchRegistryEntryStatusV1 =
  (typeof HYPERAGENT_DISPATCH_REGISTRY_ENTRY_STATUSES_V1)[number];

export type HyperAgentDispatchEventV1 = {
  event_id: string;
  dedup_key: string;
  queue_item_id: string | null;
  mission_type: HyperAgentDispatchMissionTypeV1;
  scope_key: string;
  slug_batch_fingerprint: string | null;
  dispatched_at: string;
  task_id?: string | null;
  operator_note?: string | null;
};

export type HyperAgentDispatchEventsFileV1 = {
  contract: typeof HYPERAGENT_DISPATCH_EVENTS_CONTRACT_V1;
  events: HyperAgentDispatchEventV1[];
};

export type HyperAgentDispatchRegistryEntryV1 = {
  registry_entry_id: string;
  dedup_key: string;
  queue_item_id: string | null;
  mission_type: HyperAgentDispatchMissionTypeV1;
  scope_key: string;
  family_key: string | null;
  slug_batch_fingerprint: string | null;
  status: HyperAgentDispatchRegistryEntryStatusV1;
  block_redispatch: boolean;
  blocked_reason: string;
  source: "generated" | "operator";
  artifact_rel_paths: string[];
  recorded_at: string | null;
};

export type HyperAgentDispatchRegistryV1 = {
  contract: typeof HYPERAGENT_DISPATCH_REGISTRY_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  mutation_authorized: false;
  generated_at: string;
  entries: HyperAgentDispatchRegistryEntryV1[];
  frozen_family_keys: string[];
  owner_review_ready_family_keys: string[];
  redispatch_blocked_dedup_keys: string[];
  redispatch_blocked_slug_batch_fingerprints: string[];
  operator_events_present: boolean;
  operator_events_rel_path: string | null;
  exact_repo_paths_read: string[];
  proven_facts: string[];
  unknown_facts: string[];
};

export type HyperAgentRedispatchBlockResultV1 = {
  blocked: boolean;
  reasons: string[];
};

export function hyperAgentDedupKeyV1(
  missionType: string,
  scopeKey: string,
): string {
  return `${missionType}:${scopeKey}`;
}

export function hyperAgentQueueItemIdV1(
  missionType: string,
  scopeKey: string,
): string {
  return createHash("sha256")
    .update(hyperAgentDedupKeyV1(missionType, scopeKey))
    .digest("hex")
    .slice(0, 16);
}

export function hyperAgentSlugBatchFingerprintV1(slugs: string[]): string | null {
  if (slugs.length === 0) return null;
  const normalized = [...slugs].map((s) => s.trim().toLowerCase()).sort();
  return createHash("sha256").update(normalized.join("|")).digest("hex").slice(0, 16);
}

function stableRegistryEntryId(dedupKey: string): string {
  return createHash("sha256").update(dedupKey).digest("hex").slice(0, 16);
}

type OwnerReviewReadySignalV1 = {
  family_key: string;
  owner_review_packet_rel_path: string;
  cursor_validation_rel_path: string;
  validation_status: string | null;
};

function scanCursorValidationFamilyKeys(rootDir: string): Map<string, string> {
  const byFamily = new Map<string, string>();
  const draftsDir = path.join(rootDir, "data/fridge/batch-production/drafts");
  if (!existsSync(draftsDir)) return byFamily;

  for (const file of readdirSync(draftsDir)) {
    if (!file.endsWith(".json") || !file.includes("cursor-validation")) continue;
    const relPath = `data/fridge/batch-production/drafts/${file}`;
    try {
      const parsed = JSON.parse(readFileSync(path.join(rootDir, relPath), "utf8")) as {
        contract?: string;
        validation_status?: string;
        validation_details?: { family_key?: string };
        validation_scope?: string;
      };
      if (parsed.contract !== CURSOR_VALIDATION_PACKET_CONTRACT_V1) continue;
      const familyKey =
        parsed.validation_details?.family_key ??
        (parsed.validation_scope?.includes("edr4rxd1")
          ? EDR4RXD1_FAMILY_KEY_V1
          : null);
      if (!familyKey) continue;
      byFamily.set(familyKey, relPath);
    } catch {
      // skip malformed
    }
  }

  return byFamily;
}

function detectOwnerReviewReadySignals(rootDir: string): OwnerReviewReadySignalV1[] {
  const cursorByFamily = scanCursorValidationFamilyKeys(rootDir);
  const ready: OwnerReviewReadySignalV1[] = [];

  const edr4OwnerAbs = path.join(rootDir, EDR4RXD1_OWNER_REVIEW_PACKET_JSON_REL_V1);
  if (existsSync(edr4OwnerAbs)) {
    try {
      const packet = JSON.parse(readFileSync(edr4OwnerAbs, "utf8")) as {
        contract?: string;
        family_key?: string;
        validation_status?: string;
      };
      if (packet.contract === EDR4RXD1_OWNER_REVIEW_PACKET_CONTRACT_V1) {
        const familyKey = packet.family_key ?? EDR4RXD1_FAMILY_KEY_V1;
        const cursorRel =
          cursorByFamily.get(familyKey) ?? EDR4RXD1_CURSOR_VALIDATION_JSON_REL_V1;
        if (existsSync(path.join(rootDir, cursorRel))) {
          ready.push({
            family_key: familyKey,
            owner_review_packet_rel_path: EDR4RXD1_OWNER_REVIEW_PACKET_JSON_REL_V1,
            cursor_validation_rel_path: cursorRel,
            validation_status: packet.validation_status ?? null,
          });
        }
      }
    } catch {
      // skip malformed
    }
  }

  const draftsDir = path.join(rootDir, "data/fridge/batch-production/drafts");
  if (existsSync(draftsDir)) {
    for (const file of readdirSync(draftsDir)) {
      if (!file.endsWith(".json") || !file.includes("owner-review-packet")) continue;
      if (file === "edr4rxd1-owner-review-packet-v1.json") continue;
      const relPath = `data/fridge/batch-production/drafts/${file}`;
      try {
        const packet = JSON.parse(readFileSync(path.join(rootDir, relPath), "utf8")) as {
          contract?: string;
          family_key?: string;
          validation_status?: string;
        };
        if (!packet.family_key) continue;
        if (ready.some((row) => row.family_key === packet.family_key)) continue;
        const cursorRel = cursorByFamily.get(packet.family_key);
        if (!cursorRel) continue;
        ready.push({
          family_key: packet.family_key,
          owner_review_packet_rel_path: relPath,
          cursor_validation_rel_path: cursorRel,
          validation_status: packet.validation_status ?? null,
        });
      } catch {
        // skip malformed
      }
    }
  }

  return ready;
}

function loadOperatorEvents(args: {
  rootDir: string;
  operatorEvents?: HyperAgentDispatchEventV1[] | null;
}): { events: HyperAgentDispatchEventV1[]; present: boolean; relPath: string | null } {
  if (args.operatorEvents != null) {
    return {
      events: args.operatorEvents,
      present: args.operatorEvents.length > 0,
      relPath: HYPERAGENT_DISPATCH_EVENTS_REL_V1,
    };
  }

  const abs = path.join(args.rootDir, HYPERAGENT_DISPATCH_EVENTS_REL_V1);
  if (!existsSync(abs)) {
    return { events: [], present: false, relPath: HYPERAGENT_DISPATCH_EVENTS_REL_V1 };
  }

  try {
    const parsed = JSON.parse(readFileSync(abs, "utf8")) as HyperAgentDispatchEventsFileV1;
    if (parsed.contract !== HYPERAGENT_DISPATCH_EVENTS_CONTRACT_V1) {
      return { events: [], present: false, relPath: HYPERAGENT_DISPATCH_EVENTS_REL_V1 };
    }
    return {
      events: parsed.events ?? [],
      present: (parsed.events ?? []).length > 0,
      relPath: HYPERAGENT_DISPATCH_EVENTS_REL_V1,
    };
  } catch {
    return { events: [], present: false, relPath: HYPERAGENT_DISPATCH_EVENTS_REL_V1 };
  }
}

export function isHyperAgentRedispatchBlockedV1(args: {
  registry: HyperAgentDispatchRegistryV1;
  dedup_key: string;
  slug_batch_fingerprint: string | null;
  family_key: string | null;
  mission_type: HyperAgentDispatchMissionTypeV1;
}): HyperAgentRedispatchBlockResultV1 {
  const reasons: string[] = [];

  if (args.family_key && args.registry.frozen_family_keys.includes(args.family_key)) {
    reasons.push(`registry_frozen:${args.family_key}`);
  }

  if (
    args.family_key &&
    args.registry.owner_review_ready_family_keys.includes(args.family_key) &&
    (args.mission_type === "EVIDENCE_CAPTURE" || args.mission_type === "BOUNDED_EVIDENCE_SLICE")
  ) {
    reasons.push(`registry_owner_review_ready:${args.family_key}`);
  }

  if (args.registry.redispatch_blocked_dedup_keys.includes(args.dedup_key)) {
    reasons.push(`registry_redispatch_blocked_dedup_key:${args.dedup_key}`);
  }

  if (
    args.slug_batch_fingerprint &&
    args.registry.redispatch_blocked_slug_batch_fingerprints.includes(args.slug_batch_fingerprint)
  ) {
    reasons.push(`registry_redispatch_blocked_slug_fingerprint:${args.slug_batch_fingerprint}`);
  }

  return { blocked: reasons.length > 0, reasons };
}

export function buildHyperAgentDispatchRegistryV1(args: {
  rootDir: string;
  now?: () => Date;
  operatorEvents?: HyperAgentDispatchEventV1[] | null;
}): HyperAgentDispatchRegistryV1 {
  const now = args.now ?? (() => new Date());
  const generatedAt = now().toISOString();

  const rollup = buildCommandCenterControlGraphRollupV1({
    rootDir: args.rootDir,
    now: args.now,
  });
  const ownerReviewSignals = detectOwnerReviewReadySignals(args.rootDir);
  const operator = loadOperatorEvents(args);

  const entries: HyperAgentDispatchRegistryEntryV1[] = [];
  const pathsRead = new Set<string>([
    HYPERAGENT_DISPATCH_EVENTS_REL_V1,
    EDR4RXD1_OWNER_REVIEW_PACKET_JSON_REL_V1,
    EDR4RXD1_CURSOR_VALIDATION_JSON_REL_V1,
    "data/fridge/batch-production/drafts/*cursor-validation*.json",
    "data/fridge/batch-production/drafts/*owner-review-packet*.json",
    ...rollup.exact_repo_paths_read,
  ]);

  for (const frozen of rollup.frozen_family_summary.frozen_families) {
    const dedupKey = `FROZEN:${frozen.family_key}`;
    entries.push({
      registry_entry_id: stableRegistryEntryId(dedupKey),
      dedup_key: dedupKey,
      queue_item_id: null,
      mission_type: "EVIDENCE_CAPTURE",
      scope_key: frozen.family_key,
      family_key: frozen.family_key,
      slug_batch_fingerprint: null,
      status: "FROZEN",
      block_redispatch: true,
      blocked_reason: `freeze_reason:${frozen.freeze_reason}`,
      source: "generated",
      artifact_rel_paths: [
        "data/fridge/batch-production/audits/anchor-integrity-audit-v1.json",
        ...rollup.exact_repo_paths_read.filter((p) => p.includes("anchor") || p.includes("evidence-leverage")),
      ].slice(0, 3),
      recorded_at: rollup.generated_at,
    });
  }

  for (const signal of ownerReviewSignals) {
    const dedupKey = `OWNER_REVIEW_READY:${signal.family_key}`;
    entries.push({
      registry_entry_id: stableRegistryEntryId(dedupKey),
      dedup_key: dedupKey,
      queue_item_id: hyperAgentQueueItemIdV1("EVIDENCE_CAPTURE", signal.family_key),
      mission_type: "EVIDENCE_CAPTURE",
      scope_key: signal.family_key,
      family_key: signal.family_key,
      slug_batch_fingerprint: null,
      status: "OWNER_REVIEW_READY",
      block_redispatch: true,
      blocked_reason: `owner_review_packet_and_cursor_validation:${signal.validation_status ?? "present"}`,
      source: "generated",
      artifact_rel_paths: [
        signal.owner_review_packet_rel_path,
        signal.cursor_validation_rel_path,
      ],
      recorded_at: generatedAt,
    });
    pathsRead.add(signal.owner_review_packet_rel_path);
    pathsRead.add(signal.cursor_validation_rel_path);
  }

  for (const event of operator.events) {
    const dedupKey = event.dedup_key;
    entries.push({
      registry_entry_id: stableRegistryEntryId(dedupKey),
      dedup_key: dedupKey,
      queue_item_id: event.queue_item_id,
      mission_type: event.mission_type,
      scope_key: event.scope_key,
      family_key: null,
      slug_batch_fingerprint: event.slug_batch_fingerprint,
      status: "DISPATCHED",
      block_redispatch: true,
      blocked_reason: `operator_dispatched:${event.event_id}`,
      source: "operator",
      artifact_rel_paths: [HYPERAGENT_DISPATCH_EVENTS_REL_V1],
      recorded_at: event.dispatched_at,
    });
  }

  const frozen_family_keys = rollup.frozen_family_summary.frozen_families.map(
    (row) => row.family_key,
  );
  const owner_review_ready_family_keys = ownerReviewSignals.map((row) => row.family_key);
  const redispatch_blocked_dedup_keys = [
    ...new Set(
      entries.filter((entry) => entry.block_redispatch).map((entry) => entry.dedup_key),
    ),
  ];
  const redispatch_blocked_slug_batch_fingerprints = [
    ...new Set(
      entries
        .filter((entry) => entry.block_redispatch && entry.slug_batch_fingerprint)
        .map((entry) => entry.slug_batch_fingerprint as string),
    ),
  ];

  return {
    contract: HYPERAGENT_DISPATCH_REGISTRY_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    generated_at: generatedAt,
    entries,
    frozen_family_keys,
    owner_review_ready_family_keys,
    redispatch_blocked_dedup_keys,
    redispatch_blocked_slug_batch_fingerprints,
    operator_events_present: operator.present,
    operator_events_rel_path: operator.relPath,
    exact_repo_paths_read: [...pathsRead].sort(),
    proven_facts: [
      `PROVEN: registry_entry_count=${String(entries.length)}.`,
      `PROVEN: frozen_family_count=${String(frozen_family_keys.length)}.`,
      `PROVEN: owner_review_ready_count=${String(owner_review_ready_family_keys.length)}.`,
      `PROVEN: operator_dispatch_event_count=${String(operator.events.length)}.`,
      `PROVEN: redispatch_blocked_dedup_key_count=${String(redispatch_blocked_dedup_keys.length)}.`,
      "PROVEN: Registry records dispatch blocking only — HyperAgent creates evidence, not repo truth.",
    ],
    unknown_facts: [
      "UNKNOWN: External HyperAgent in-flight missions not recorded unless operator overlay events are appended.",
      "UNKNOWN: DISCOVERY_COMPLETE and CURSOR_VALIDATED auto-entries deferred to Phase 2.",
    ],
  };
}
